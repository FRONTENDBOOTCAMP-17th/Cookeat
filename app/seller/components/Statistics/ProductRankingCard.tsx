import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatWon } from '@/lib/format';
import type { ProductRankingCardProps } from '@/types/seller/statistics';

export default function ProductRankingCard({ items }: ProductRankingCardProps) {
  return (
    <Card className="border-border shadow-sm h-full">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-h5 font-semibold text-dark-text">상품별 매출 TOP 10</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <p className="text-sm text-light-gray text-center py-10">판매 데이터가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, idx) => (
              <div key={item.productId} className="flex items-center gap-3 max-mobile:gap-2">
                <span className="w-5 text-sm font-semibold text-light-gray flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-text truncate">{item.name}</p>
                  <p className="text-xs text-light-gray">{item.quantity}개 판매</p>
                </div>
                <span className="text-sm font-semibold text-dark-text flex-shrink-0">
                  {formatWon(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
