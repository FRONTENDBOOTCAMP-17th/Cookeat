import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calcRating } from '@/lib/utils';
import type { ProductDetail, RelatedRecipe } from '@/types/ingredient';

// Supabase는 JOIN 결과 타입을 정확히 추론하지 못하므로 로컬 타입으로 명시
type SellerRow = { seller_id: number; store_name: string; cs_phone: string };
type CategoryRow = { category_id: number; name: string };
type RelatedRecipeRow = {
  recipes: { recipe_id: number; title: string; thumbnail: string; users: { nickname: string } | null } | null;
};

export async function getProductDetail(id: number): Promise<ProductDetail | null> {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(
      `product_id, name, brand, price, stock, image, description, origin,
       sellers!inner ( seller_id, store_name, cs_phone ),
       categories ( category_id, name )`
    )
    .eq('product_id', id)
    .eq('status', '판매중')
    .maybeSingle();

  if (error || !product) return null;

  const [imageResult, reviewResult] = await Promise.all([
    supabaseAdmin
      .from('product_images')
      .select('url')
      .eq('product_id', id)
      .order('sort_order', { ascending: true }),
    supabaseAdmin.from('reviews').select('rating').eq('product_id', id),
  ]);

  const extraImages = (imageResult.data ?? []) as { url: string }[];
  const reviews = (reviewResult.data ?? []) as { rating: number }[];

  const reviewCount = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const rating = calcRating(ratingSum, reviewCount);

  const seller = product.sellers as unknown as SellerRow | null;
  const category = product.categories as unknown as CategoryRow | null;

  const images = [product.image, ...extraImages.map((img) => img.url)].filter(Boolean) as string[];

  return {
    productId: product.product_id,
    name: product.name,
    brand: product.brand ?? '',
    price: product.price,
    image: product.image,
    images,
    description: product.description ?? '',
    origin: product.origin ?? '',
    stock: product.stock,
    category: category?.name ?? '',
    sellerId: seller?.seller_id ?? null,
    seller: seller?.store_name ?? '',
    sellerPhone: seller?.cs_phone ?? '',
    rating,
    reviewCount,
  };
}

/** 이 상품이 연결된(recipe_ingredients.product_id) 레시피 목록 */
export async function getRelatedRecipesByProduct(
  productId: number,
  limit = 4
): Promise<RelatedRecipe[]> {
  const { data } = await supabaseAdmin
    .from('recipe_ingredients')
    .select('recipes!inner ( recipe_id, title, thumbnail, users!inner ( nickname ) )')
    .eq('product_id', productId)
    .limit(limit * 3);

  const rows = (data as unknown as RelatedRecipeRow[] | null) ?? [];

  const seen = new Set<number>();
  const recipes: { recipeId: number; title: string; thumbnail: string; author: string }[] = [];
  for (const row of rows) {
    const recipe = row.recipes;
    if (!recipe || seen.has(recipe.recipe_id)) continue;
    seen.add(recipe.recipe_id);
    recipes.push({
      recipeId: recipe.recipe_id,
      title: recipe.title,
      thumbnail: recipe.thumbnail,
      author: recipe.users?.nickname ?? '',
    });
    if (recipes.length >= limit) break;
  }

  if (recipes.length === 0) return [];

  const recipeIds = recipes.map((recipe) => recipe.recipeId);
  const { data: reviewRows } = await supabaseAdmin
    .from('reviews')
    .select('recipe_id, rating')
    .in('recipe_id', recipeIds);

  const ratingMap = new Map<number, { sum: number; count: number }>();
  for (const review of (reviewRows ?? []) as { recipe_id: number | null; rating: number }[]) {
    if (!review.recipe_id) continue;
    const stat = ratingMap.get(review.recipe_id) ?? { sum: 0, count: 0 };
    stat.sum += review.rating;
    stat.count += 1;
    ratingMap.set(review.recipe_id, stat);
  }

  return recipes.map((recipe) => {
    const stat = ratingMap.get(recipe.recipeId);
    return {
      recipeId: recipe.recipeId,
      title: recipe.title,
      image: recipe.thumbnail,
      author: recipe.author,
      rating: calcRating(stat?.sum ?? 0, stat?.count ?? 0),
      reviewCount: stat?.count ?? 0,
    };
  });
}

/** 재고가 0이면 '판매중'을 '품절'로 강제 전환 */
export function resolveProductStatus(status: string, stock: number): string {
  if (stock <= 0 && status === '판매중') return '품절';
  return status;
}
