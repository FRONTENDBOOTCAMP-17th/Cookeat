import ProductDescription from './ProductDescription';
import RelatedRecipes from './RelatedRecipes';
import ReviewSectionClient from '@/components/common/ReviewSectionClient';
import type { RelatedRecipe } from '@/types/ingredient';

interface Props {
  productId: number;
  productName: string;
  title: string;
  description: string;
  features: { title: string; desc: string }[];
  relatedRecipes: RelatedRecipe[];
  onViewAllReviews: () => void;
}

export function ProductInfoTab({
  productId,
  productName,
  title,
  description,
  features,
  relatedRecipes,
  onViewAllReviews,
}: Props) {
  return (
    <>
      <ProductDescription title={title} description={description} features={features} />
      <RelatedRecipes recipes={relatedRecipes} />
      <div className="mt-10">
        <ReviewSectionClient
          type="product"
          targetId={productId}
          targetName={productName}
          compact
          onViewAll={onViewAllReviews}
        />
      </div>
    </>
  );
}
