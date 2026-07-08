import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function getCategories() {
  const { data: ingredientRows, error: ingredientError } = await supabaseAdmin
    .from('ingredients')
    .select('ingredient_id, category')
    .order('ingredient_id');
  if (ingredientError) throw ingredientError;

  const { data: categoryRows, error: categoryError } = await supabaseAdmin
    .from('categories')
    .select('category_id, name, parent_id')
    .order('sort_order');
  if (categoryError) throw categoryError;

  const childrenMap = new Map<number, { category_id: number; name: string }[]>();
  for (const c of categoryRows ?? []) {
    if (c.parent_id === null) continue;
    if (!childrenMap.has(c.parent_id)) childrenMap.set(c.parent_id, []);
    childrenMap.get(c.parent_id)!.push(c);
  }

  return (ingredientRows ?? []).map((ing) => ({
    categoryId: ing.ingredient_id,
    name: ing.category,
    children: (childrenMap.get(ing.ingredient_id) ?? []).map((c) => ({
      categoryId: c.category_id,
      name: c.name,
    })),
  }));
}
