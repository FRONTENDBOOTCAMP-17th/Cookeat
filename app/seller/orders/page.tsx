'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type {
  OrderSortBy,
  SortOrder,
  OrderStatus,
  OrderStatusFilter,
  SellerOrderRow,
  OrderExportRow,
  StatusCardItem,
  PaymentMethod,
} from '@/types/seller/order';
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from '@/types/seller/order';
import type { DateRangePreset } from '@/types/seller/common';
import { getDateRange } from '@/lib/dateRange';
import { getTotalPages } from '@/lib/utils';
import OrderSearchFilter from '../components/OrderList/OrderSearchFilter';
import OrderTable from '../components/OrderList/OrderTable';
import StatusCards from '@/components/ui/StatusCards';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useExcelExport, ExportColumn } from '@/hooks/useExcelExport';
import { useAuthStore } from '@/store/authStore';

const statuses: (OrderStatus | '전체')[] = [
  '전체',
  '결제완료',
  '배송준비',
  '배송중',
  '배송완료',
  '구매확정',
];

const ORDER_COLOR_MAP = {
  신규주문: 'text-emerald-500',
  배송준비중: 'text-amber-500',
  배송중: 'text-blue-500',
  배송완료: 'text-taupe-500',
  구매확정: 'text-violet-500',
};

const LIMIT = 10;

const EXPORT_COLUMNS: ExportColumn<OrderExportRow>[] = [
  { key: 'id', label: '주문번호' },
  { key: 'orderDate', label: '주문일시', format: (v) => new Date(v as string).toLocaleString() },
  { key: 'customer', label: '주문자' },
  { key: 'recipient', label: '수령인' },
  { key: 'phone', label: '연락처' },
  { key: 'address', label: '주소' },
  { key: 'addressDetail', label: '상세주소' },
  { key: 'shippingRequest', label: '배송메모' },
  { key: 'productName', label: '상품명' },
  { key: 'quantity', label: '수량' },
  { key: 'unitPrice', label: '단가' },
  { key: 'totalPrice', label: '주문상품금액' },
  { key: 'shippingFee', label: '배송비' },
  { key: 'couponDiscount', label: '쿠폰할인' },
  { key: 'pointAmount', label: '포인트사용' },
  { key: 'finalAmount', label: '최종결제금액' },
  { key: 'paymentMethod', label: '결제수단', format: (v) => PAYMENT_LABEL[v as PaymentMethod] },
  { key: 'status', label: '주문상태' },
];

export default function OrdersPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<OrderStatusFilter>(
    (searchParams.get('status') as OrderStatusFilter) || '전체'
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<OrderSortBy>(
    (searchParams.get('sortBy') as OrderSortBy) || 'orderDate'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('sortOrder') as SortOrder) || 'desc'
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isAllSelectedMode, setIsAllSelectedMode] = useState(false);

  const [datePreset, setDatePreset] = useState<DateRangePreset>(
    (searchParams.get('datePreset') as DateRangePreset) || '전체'
  );
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') || getDateRange('전체').startDate
  );
  const [endDate, setEndDate] = useState(
    searchParams.get('endDate') || getDateRange('전체').endDate
  );
  const selectionFilterKey = `${page}-${status}-${search}-${startDate}-${endDate}`;
  const [prevSelectionFilterKey, setPrevSelectionFilterKey] = useState(selectionFilterKey);

  const [counts, setCounts] = useState({
    전체: 0,
    결제완료: 0,
    배송준비: 0,
    배송중: 0,
    배송완료: 0,
    구매확정: 0,
  });

  const { exportToExcel, isExporting, progress } = useExcelExport<OrderExportRow>({
    endpoint: '/seller/orders/export',
    columns: EXPORT_COLUMNS,
    sheetName: '주문내역',
    fileNamePrefix: '주문내역',
    countBy: 'id',
  });

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('status', status);
    if (search) params.set('search', search);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('datePreset', datePreset);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    router.replace(`/seller/orders?${params.toString()}`, { scroll: false });
  }, [page, status, search, sortBy, sortOrder, datePreset, startDate, endDate, router]);

  const handleDatePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    setPage(1);
    if (preset !== '직접입력') {
      const range = getDateRange(preset);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      try {
        const res = await api.get('/seller/orders/counts', {
          params: { startDate, endDate },
        });
        if (!cancelled) setCounts(res.data.data);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '상태별 건수를 불러오지 못했습니다.';
          toast.error(msg, { id: msg });
        }
      }
    };

    fetchCounts();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/seller/orders', {
          params: {
            page,
            limit: LIMIT,
            keyword: search || undefined,
            status,
            startDate,
            endDate,
            sortBy,
            sortOrder,
          },
        });
        if (!cancelled) {
          setOrders(res.data.data.orders);
          setTotal(res.data.data.pagination.total);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '주문 목록을 불러오지 못했습니다.';
          toast.error(msg, { id: msg });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [page, status, search, startDate, endDate, sortBy, sortOrder]);

  const statusCardData: StatusCardItem[] = [
    { label: '전체', count: counts.전체, filterValue: '전체' },
    {
      label: ORDER_STATUS_LABEL.결제완료,
      count: counts.결제완료,
      filterValue: '결제완료',
    },
    {
      label: ORDER_STATUS_LABEL.배송준비,
      count: counts.배송준비,
      filterValue: '배송준비',
    },
    {
      label: ORDER_STATUS_LABEL.배송중,
      count: counts.배송중,
      filterValue: '배송중',
    },
    {
      label: ORDER_STATUS_LABEL.배송완료,
      count: counts.배송완료,
      filterValue: '배송완료',
    },
    { label: ORDER_STATUS_LABEL.구매확정, count: counts.구매확정, filterValue: '구매확정' },
  ];

  const handleSortChange = (newSortBy: OrderSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleSelect = (itemId: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, itemId] : prev.filter((id) => id !== itemId)));
    setIsAllSelectedMode(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setIsAllSelectedMode(true);
      setSelectedIds(orders.map((o) => o.itemId));
    } else {
      setIsAllSelectedMode(false);
      setSelectedIds([]);
    }
  };

  if (selectionFilterKey !== prevSelectionFilterKey) {
    setPrevSelectionFilterKey(selectionFilterKey);
    setSelectedIds([]);
    setIsAllSelectedMode(false);
  }

  const handleExcelDownload = () => {
    if (!isAllSelectedMode && selectedIds.length === 0) {
      toast.error('다운로드할 주문을 선택해주세요.');
      return;
    }

    const params = isAllSelectedMode
      ? {
          status: status === '전체' ? undefined : status,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          keyword: search || undefined,
        }
      : { itemIds: selectedIds.join(',') };

    exportToExcel(params);
  };

  const totalPages = getTotalPages(total, LIMIT);

  return (
    <div className="bg-background p-8 max-desktop:p-6 max-tablet:p-4">
      <div className="flex flex-row justify-between items-center mb-8 max-mobile:flex-col max-mobile:items-start max-mobile:gap-3">
        <h1 className="text-h2 font-bold text-dark-text max-tablet:text-h3 max-mobile:text-h4">
          주문 관리
        </h1>
        {!isAdmin && (
          <Button onClick={handleExcelDownload} disabled={isExporting}>
            <Download />
            {isExporting
              ? `다운로드 중... (${progress.current}/${progress.total})`
              : '엑셀 다운로드'}
          </Button>
        )}
      </div>
      <StatusCards
        cards={statusCardData}
        status={status}
        onStatusChange={(v) => {
          setStatus(v as OrderStatusFilter);
          setPage(1);
        }}
        colorMap={ORDER_COLOR_MAP}
        cols={6}
      />
      <OrderSearchFilter
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        statuses={statuses}
        datePreset={datePreset}
        onDatePresetChange={handleDatePresetChange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(v) => {
          setStartDate(v);
          setDatePreset('직접입력');
          setPage(1);
        }}
        onEndDateChange={(v) => {
          setEndDate(v);
          setDatePreset('직접입력');
          setPage(1);
        }}
      />
      <div className="flex items-center justify-start mb-2 px-5">
        <p className="text-sm text-gray-500">
          상품 <span className="font-semibold text-gray-800">{total}</span>개
        </p>
      </div>

      <OrderTable
        orders={orders}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        selectedIds={selectedIds}
        isAllSelectedMode={isAllSelectedMode}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
