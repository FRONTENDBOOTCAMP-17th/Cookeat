'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { DashboardData } from '@/types/seller/dashboard';
import DashboardOrderTrendChart from '@/app/seller/components/Dashboard/DashboardOrderTrendChart';
import DashboardSettlementCard from '@/app/seller/components/Dashboard/DashboardSettlementCard';
import DashboardReviewSummaryCard from '@/app/seller/components/Dashboard/DashboardReviewSummaryCard';
import DashboardStatCards from './components/Dashboard/DashboardStatCards';

export default function SellerPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/seller/dashboard');
        setDashboard(res.data.data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '대시보드 정보를 불러오지 못했습니다.';
        toast.error(msg, { id: msg });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-background p-8 max-tablet:p-5 max-mobile:p-4">
        <div className="mb-8">
          <h1 className="text-h2 font-bold text-dark-text max-mobile:text-h3">판매 현황</h1>
          <p className="text-sm text-light-gray mt-1">
            오늘의 판매 데이터와 주요 지표를 확인하세요
          </p>
        </div>
        <p className="text-sm text-light-gray">불러오는 중...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="bg-background p-8 max-tablet:p-5 max-mobile:p-4">
        <div className="mb-8">
          <h1 className="text-h2 font-bold text-dark-text max-mobile:text-h3">판매 현황</h1>
          <p className="text-sm text-light-gray mt-1">
            오늘의 판매 데이터와 주요 지표를 확인하세요
          </p>
        </div>
        <p className="text-sm text-red-500">
          대시보드 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background p-8 max-tablet:p-5 max-mobile:p-4">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-h2 font-bold text-dark-text max-mobile:text-h3">판매 현황</h1>
        <p className="text-sm text-light-gray mt-1">오늘의 판매 데이터와 주요 지표를 확인하세요</p>
      </div>

      {/* 통계 카드 6개 */}
      <div className="mb-6">
        <DashboardStatCards stats={dashboard.stats} />
      </div>

      <div className="grid grid-cols-3 gap-4 max-desktop:grid-cols-1">
        {/* 주문 현황 차트 */}
        <div className="col-span-2">
          <DashboardOrderTrendChart data={dashboard.orderTrend} />
        </div>

        {/* 정산 정보 + 리뷰 현황 */}
        <div className="space-y-4">
          <DashboardSettlementCard settlement={dashboard.settlement} />
          <DashboardReviewSummaryCard review={dashboard.review} />
        </div>
      </div>
    </div>
  );
}
