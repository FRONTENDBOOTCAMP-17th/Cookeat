import Link from 'next/link';
import RecipeCard from '@/components/home/RecipeCard';
import type { RelatedRecipe } from '@/types/ingredient';

interface RelatedRecipesProps {
  recipes: RelatedRecipe[];
}

export default function RelatedRecipes({ recipes }: RelatedRecipesProps) {
  if (recipes.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-dark-text">이 재료가 들어가는 레시피</h2>
        <Link
          href="/recipes"
          className="text-xs text-gray-text hover:text-primary transition-colors flex items-center gap-0.5"
        >
          더보기 &rsaquo;
        </Link>
      </div>
      <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.recipeId}
            recipeId={recipe.recipeId}
            title={recipe.title}
            image={recipe.image}
            author={recipe.author}
            rating={recipe.rating}
            reviewCount={recipe.reviewCount}
          />
        ))}
      </div>
    </div>
  );
}
