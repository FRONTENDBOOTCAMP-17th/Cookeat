'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { StatisticsData } from '@/types/seller/statistics';
import StatisticsSummaryCards from '@/app/seller/components/Statistics/StatisticsSummaryCards';
import ProductRankingCard from '@/app/seller/components/Statistics/ProductRankingCard';
import CategoryBreakdownChart from '@/app/seller/components/Statistics/CategoryBreakdownChart';
import RevenueTrendChart from '@/app/seller/components/Statistics/RevenueTrendChart';
import ClaimRateCard from '@/app/seller/components/Statistics/ClaimRateCard';
import CustomerCard from '@/app/seller/components/Statistics/CustomerCard';

const PERIOD_OPTIONS = [
  { value: 7, label: '7일' },
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
];

export default function StatisticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/seller/statistics', { params: { days } });
        setData(res.data.data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '통계를 불러오지 못했습니다.';
        toast.error(msg, { id: msg });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [days]);

  return (
    <div className="bg-background p-8 max-tablet:p-5 max-mobile:p-4">
      <div className="mb-8 flex items-center justify-between max-tablet:flex-col max-tablet:items-start max-tablet:gap-3">
        <div>
          <h1 className="text-h2 font-bold text-dark-text max-mobile:text-h3">판매 통계</h1>
          <p className="text-sm text-light-gray mt-1">상품·카테고리별 판매 데이터를 확인하세요</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-beige/50 p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDays(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                days === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-light-gray hover:text-gray-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-light-gray">불러오는 중...</p>
      ) : !data ? (
        <p className="text-sm text-red-500">통계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
      ) : (
        <div className="flex flex-col gap-6 max-mobile:gap-4">
          <StatisticsSummaryCards summary={data.summary} />
          <RevenueTrendChart data={data.revenueTrend} />
          <div className="grid grid-cols-3 gap-4 max-desktop:grid-cols-1">
            <div className="col-span-2">
              <ProductRankingCard items={data.productRanking} />
            </div>
            <CategoryBreakdownChart items={data.categoryBreakdown} />
          </div>
          <div className="grid grid-cols-2 gap-4 max-tablet:grid-cols-1">
            <ClaimRateCard claimRate={data.claimRate} />
            <CustomerCard customer={data.customer} />
          </div>
        </div>
      )}
    </div>
  );
}
