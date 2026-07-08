'use client';

import { useState } from 'react';
import ReviewSectionClient from '@/components/common/ReviewSectionClient';
import { ProductInfoTab } from './ProductInfoTab';
import { DeliveryTab } from './DeliveryTab';
import { QnaTab } from './QnaTab';
import type { RelatedRecipe } from '@/types/ingredient';

const TABS = ['상품 정보', '리뷰', '배송·교환', '상품 문의'] as const;
type Tab = (typeof TABS)[number];

interface ProductTabsProps {
  productId: number;
  productName: string;
  descriptionTitle: string;
  description: string;
  features: { title: string; desc: string }[];
  relatedRecipes: RelatedRecipe[];
}

export default function ProductTabs({
  productId,
  productName,
  descriptionTitle,
  description,
  features,
  relatedRecipes,
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('상품 정보');

  return (
    <div className="mt-10">
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-text hover:text-dark-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="py-8">
        {activeTab === '상품 정보' && (
          <ProductInfoTab
            productId={productId}
            productName={productName}
            title={descriptionTitle}
            description={description}
            features={features}
            relatedRecipes={relatedRecipes}
            onViewAllReviews={() => setActiveTab('리뷰')}
          />
        )}
        {activeTab === '리뷰' && (
          <ReviewSectionClient
            type="product"
            targetId={productId}
            targetName={productName}
          />
        )}
        {activeTab === '배송·교환' && <DeliveryTab />}
        {activeTab === '상품 문의' && <QnaTab productId={productId} productName={productName} />}
      </div>
    </div>
  );
}
