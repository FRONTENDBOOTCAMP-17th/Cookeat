'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SettlementHeroCardProps } from '@/types/seller/settlement';
import { CircleDollarSign } from 'lucide-react';
import { formatWon } from '@/lib/format';

export default function SettlementHeroCard({ nextSettlement }: SettlementHeroCardProps) {
  return (
    <Card className="bg-primary rounded-xl text-white mb-6 border-0">
      <CardContent className="px-8 py-6 max-tablet:px-5 max-tablet:py-5 max-mobile:px-4 max-mobile:py-4">
        {/* 상단: 다음 정산 예정 + 금액 */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-white/70 text-sm mb-2">
            <CircleDollarSign size={15} />
            다음 정산 예정
          </div>
          <div className="text-4xl font-bold tracking-tight max-mobile:text-3xl">
            {formatWon(nextSettlement.nextSettlementAmount)}
          </div>
        </div>

        {/* 하단: 총 판매액 / 수수료 / 물류 비용 */}
        <div className="grid grid-cols-3 gap-4 mb-5 max-tablet:grid-cols-1 max-tablet:gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-white/60">총 판매액</span>
            <span className="text-base font-semibold">
              {formatWon(nextSettlement.totalSalesAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-white/60">수수료 ({nextSettlement.commissionRate}%)</span>
            <span className="text-base font-semibold text-red-300">
              -{formatWon(nextSettlement.commission)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-white/60">물류 비용</span>
            <span className="text-base font-semibold text-red-300">
              -{formatWon(nextSettlement.shippingFee)}
            </span>
          </div>
        </div>

        <Separator className="bg-white/20 mb-4" />

        {/* 다음 정산일 */}
        <div className="text-sm text-white/60">
          다음 정산일: {nextSettlement.nextSettlementDate} 예정
        </div>
      </CardContent>
    </Card>
  );
}
