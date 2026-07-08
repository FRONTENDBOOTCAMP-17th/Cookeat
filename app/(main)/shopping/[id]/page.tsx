import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import ProductImageGallery from './_components/ProductImageGallery';
import ProductTabs from './_components/ProductTabs';
import ProductPurchasePanel from '@/components/product/ProductPurchasePanel';
import { getProductDetail, getRelatedRecipesByProduct } from '@/lib/products';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const [product, relatedRecipes] = await Promise.all([
    getProductDetail(productId),
    getRelatedRecipesByProduct(productId),
  ]);
  if (!product) notFound();

  const details = [
    { label: '카테고리', value: product.category || '-' },
    { label: '원산지', value: product.origin || '-' },
    { label: '브랜드', value: product.brand || '-' },
    { label: '판매자', value: product.seller || '-' },
  ];

  const options = [{ label: `${product.name} (기본)`, price: product.price }];

  return (
    <div className="max-w-360 mx-auto px-4 tablet:px-6 desktop:px-10 py-6">
      <nav className="flex items-center gap-1 text-xs text-light-gray mb-6">
        <Link href="/" className="hover:text-primary transition-colors">
          홈
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/shopping" className="hover:text-primary transition-colors">
          재료 쇼핑
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-text">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 desktop:grid-cols-2 desktop:gap-12 gap-6">
        <ProductImageGallery images={product.images} name={product.name} />
        <ProductPurchasePanel
          productId={product.productId}
          name={product.name}
          category={product.category}
          rating={product.rating}
          reviewCount={product.reviewCount}
          qnaCount={0}
          price={product.price}
          details={details}
          options={options}
          stock={product.stock}
        />
      </div>

      <ProductTabs
        productId={product.productId}
        descriptionTitle={`${product.seller || '판매자'}에서 직접 보내는 ${product.name}`}
        description={
          product.description ||
          `<p>신선한 ${product.name}을 산지에서 직접 보내드립니다.</p><p>최상의 신선도를 유지하며 출고합니다.</p>`
        }
        features={[
          { title: '소규모 재배', desc: '정성껏 키운 신선한 재료입니다.' },
          { title: '산지직송', desc: '중간 유통 없이 산지에서 바로 보내드립니다.' },
          { title: '친환경 배송', desc: '친환경 포장재를 사용하여 배송합니다.' },
        ]}
        relatedRecipes={relatedRecipes}
        productName={product.name}
      />
    </div>
  );
}
