import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calcRating } from '@/lib/utils';
import type { CategoryName } from '@/types/ingredient';

const PAGE_SIZE_DEFAULT = 12;
const PAGE_SIZE_MAX = 50;

function escapeLike(s: string): string {
  return s.replace(/[%_,()\\]/g, '\\$&');
}

function emptyResult(page: number, limit: number, sellers: string[]) {
  return NextResponse.json({
    success: true,
    data: {
      products: [],
      sellers,
      pagination: { page, limit, total: 0, hasNext: false },
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const keyword = searchParams.get('keyword') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const limit = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(searchParams.get('limit') ?? String(PAGE_SIZE_DEFAULT)) || PAGE_SIZE_DEFAULT)
  );
  const category = searchParams.get('category') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const sellersParam = searchParams.get('sellers') ?? '';
  const sort = searchParams.get('sort') ?? '추천순';

  const sellerNames = sellersParam ? sellersParam.split(',').filter(Boolean) : [];

  // 카테고리 → category_id 조회, 판매자 → seller_id 조회, 전체 판매자 목록을 병렬 실행
  const [parentCategoryResult, sellerFilterResult, allSellers] = await Promise.all([
    category && category !== '전체'
      ? supabaseAdmin.from('ingredients').select('ingredient_id').eq('category', category)
      : Promise.resolve({ data: null }),
    sellerNames.length > 0
      ? supabaseAdmin.from('sellers').select('seller_id').in('store_name', sellerNames)
      : Promise.resolve({ data: null }),
    fetchAllSellers(),
  ]);

  // 대카테고리 ingredient_id → 소카테고리 category_id 목록으로 변환
  let filterCategoryIds: number[] | null = null;
  if (parentCategoryResult.data !== null) {
    const parentIds = parentCategoryResult.data.map((i: { ingredient_id: number }) => i.ingredient_id);
    if (parentIds.length === 0) return emptyResult(page, limit, allSellers);
    const { data: catRows } = await supabaseAdmin
      .from('categories')
      .select('category_id')
      .in('parent_id', parentIds);
    filterCategoryIds = (catRows ?? []).map((c: { category_id: number }) => c.category_id);
    if (filterCategoryIds.length === 0) return emptyResult(page, limit, allSellers);
  }

  let filterSellerIds: number[] | null = null;
  if (sellerFilterResult.data !== null) {
    filterSellerIds = sellerFilterResult.data.map((s: { seller_id: number }) => s.seller_id);
    if (filterSellerIds.length === 0) return emptyResult(page, limit, allSellers);
  }

  // 별점순은 RPC로 DB에서 집계·정렬·페이지네이션을 한 번에 처리
  if (sort === '별점순') {
    return handleRatingSortQuery({
      keyword: escapeLike(keyword),
      filterCategoryIds,
      filterSellerIds,
      minPrice: minPrice && Number.isFinite(Number(minPrice)) ? Number(minPrice) : null,
      maxPrice: maxPrice && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : null,
      page,
      limit,
      allSellers,
    });
  }

  // 나머지 정렬: DB 정렬 + 페이지네이션
  // 첫 페이지에서만 정확한 total, 이후 페이지는 estimated로 풀스캔 횟수 절감
  let query = supabaseAdmin
    .from('products')
    .select(
      `product_id, name, brand, price, stock, image, sales_count, category_id, created_at,
       sellers!inner ( store_name )`,
      { count: page === 1 ? 'exact' : 'estimated' }
    )
    .eq('status', '판매중');

  const escaped = escapeLike(keyword);
  if (escaped) query = query.ilike('name', `%${escaped}%`);
  if (filterCategoryIds !== null) query = query.in('category_id', filterCategoryIds);
  if (filterSellerIds !== null) query = query.in('seller_id', filterSellerIds);
  const minPriceNum = Number(minPrice);
  const maxPriceNum = Number(maxPrice);
  if (minPrice && Number.isFinite(minPriceNum) && minPriceNum >= 0)
    query = query.gte('price', minPriceNum);
  if (maxPrice && Number.isFinite(maxPriceNum) && maxPriceNum >= 0)
    query = query.lte('price', maxPriceNum);

  switch (sort) {
    case '신상품순':
      query = query.order('created_at', { ascending: false });
      break;
    case '낮은가격순':
      query = query.order('price', { ascending: true });
      break;
    case '높은가격순':
      query = query.order('price', { ascending: false });
      break;
    default:
      query = query.order('sales_count', { ascending: false });
  }
  // 정렬 기준 값이 동일한 행이 많으면(예: sales_count=0) DB가 페이지마다
  // 다른 순서로 반환할 수 있어 경계 상품이 중복/누락될 수 있음 → product_id로 타이브레이크
  query = query.order('product_id', { ascending: true }).range((page - 1) * limit, page * limit - 1);

  const { data: products, error, count } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const productIds = (products ?? []).map((p: { product_id: number }) => p.product_id);
  const categoryIds = [
    ...new Set(
      (products ?? [])
        .map((p: { category_id: number | null }) => p.category_id)
        .filter((id): id is number => id !== null)
    ),
  ];

  // 리뷰 평점 집계 + 카테고리 조회를 병렬 실행
  const [{ data: reviews }, { data: categoryRows }] = await Promise.all([
    productIds.length > 0
      ? supabaseAdmin.from('reviews').select('product_id, rating').in('product_id', productIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length > 0
      ? supabaseAdmin
          .from('categories')
          .select('category_id, ingredients ( category )')
          .in('category_id', categoryIds)
      : Promise.resolve({ data: [] }),
  ]);

  type CategoryJoinRow = { category_id: number; ingredients: { category: string } | null };
  const ingredientCategoryMap = new Map<number, string>(
    (categoryRows as unknown as CategoryJoinRow[]).map((r) => [
      r.category_id,
      r.ingredients?.category ?? '',
    ])
  );

  const ratingMap = new Map<number, { sum: number; count: number }>();
  for (const r of reviews ?? []) {
    if (!ratingMap.has(r.product_id)) ratingMap.set(r.product_id, { sum: 0, count: 0 });
    const stat = ratingMap.get(r.product_id)!;
    stat.sum += r.rating;
    stat.count++;
  }

  type RawProduct = {
    product_id: number;
    name: string;
    brand: string | null;
    price: number;
    stock: number;
    image: string;
    category_id: number | null;
    created_at: string;
    sellers: { store_name: string }[] | { store_name: string } | null;
  };

  const sellerName = (s: RawProduct['sellers']): string => {
    if (!s) return '';
    return Array.isArray(s) ? (s[0]?.store_name ?? '') : s.store_name;
  };

  const toFormatted = (p: RawProduct) => {
    const stat = ratingMap.get(p.product_id);
    return {
      productId: p.product_id,
      name: p.name,
      brand: p.brand ?? '',
      price: p.price,
      image: p.image,
      category: (p.category_id !== null
        ? (ingredientCategoryMap.get(p.category_id) ?? '')
        : '') as CategoryName,
      seller: sellerName(p.sellers),
      rating: calcRating(stat?.sum ?? 0, stat?.count ?? 0),
      reviewCount: stat?.count ?? 0,
      stock: p.stock,
      createdAt: p.created_at,
    };
  };

  const formatted = (products as unknown as RawProduct[]).map(toFormatted);

  return NextResponse.json({
    success: true,
    data: {
      products: formatted,
      sellers: allSellers,
      pagination: { page, limit, total: count ?? 0, hasNext: page * limit < (count ?? 0) },
    },
  });
}

type RatingSortParams = {
  keyword: string;
  filterCategoryIds: number[] | null;
  filterSellerIds: number[] | null;
  minPrice: number | null;
  maxPrice: number | null;
  page: number;
  limit: number;
  allSellers: string[];
};

async function handleRatingSortQuery({
  keyword,
  filterCategoryIds,
  filterSellerIds,
  minPrice,
  maxPrice,
  page,
  limit,
  allSellers,
}: RatingSortParams): Promise<NextResponse> {
  type RpcRow = {
    product_id: number;
    name: string;
    brand: string | null;
    price: number;
    stock: number;
    image: string;
    category_id: number | null;
    created_at: string;
    store_name: string;
    ingredient_category: string | null;
    avg_rating: string | number;
    review_count: string | number;
    total_count: string | number;
  };

  const { data, error } = await supabaseAdmin.rpc('get_products_by_rating', {
    p_keyword: keyword,
    p_category_ids: filterCategoryIds,
    p_seller_ids: filterSellerIds,
    p_min_price: minPrice,
    p_max_price: maxPrice,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as RpcRow[];
  const total = Number(rows[0]?.total_count ?? 0);

  const products = rows.map((r) => ({
    productId: r.product_id,
    name: r.name,
    brand: r.brand ?? '',
    price: r.price,
    image: r.image,
    category: (r.ingredient_category ?? '') as CategoryName,
    seller: r.store_name,
    rating: Math.round(Number(r.avg_rating) * 10) / 10,
    reviewCount: Number(r.review_count),
    stock: r.stock,
    createdAt: r.created_at,
  }));

  return NextResponse.json({
    success: true,
    data: {
      products,
      sellers: allSellers,
      pagination: { page, limit, total, hasNext: page * limit < total },
    },
  });
}

async function fetchAllSellers(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('sellers')
    .select('store_name')
    .eq('approve_status', 'approved');
  return data?.map((s: { store_name: string }) => s.store_name).sort() ?? [];
}
