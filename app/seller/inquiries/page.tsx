'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { getTotalPages } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StatusCards from '@/components/ui/StatusCards';
import InquiryTable from '../components/Inquiry/InquiryTable';
import InquiryReplyModal from '../components/Inquiry/InquiryReplyModal';
import { useDebounce } from '@/hooks/useDebounce';
import type {
  SellerInquiryRow,
  SellerInquiryStats,
  SellerInquiryType,
} from '@/types/seller/inquiry';

const LIMIT = 10;

const TYPE_OPTIONS: { label: string; value: SellerInquiryType | '전체' }[] = [
  { label: '전체', value: '전체' },
  { label: '상품문의', value: '상품문의' },
  { label: '배송문의', value: '배송문의' },
  { label: '주문문의', value: '주문문의' },
];

const INQUIRY_COLOR_MAP = {
  전체: 'text-dark-text',
  미답변: 'text-amber-500',
  답변완료: 'text-emerald-500',
};

export default function SellerInquiriesPage() {
  const [type, setType] = useState<SellerInquiryType | '전체'>('전체');
  const [answered, setAnswered] = useState<'전체' | 'false' | 'true'>('전체');
  const [search, setSearch] = useState('');
  const [inquiries, setInquiries] = useState<SellerInquiryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<SellerInquiryStats>({
    totalCount: 0,
    waitingCount: 0,
    answeredCount: 0,
  });
  const [selectedInquiry, setSelectedInquiry] = useState<SellerInquiryRow | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const debouncedSearch = useDebounce(search, 400);

  const filterKey = `${type}-${answered}-${debouncedSearch}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const res = await api.get('/seller/inquiries/stats');
        if (!cancelled) setStats(res.data.data);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '문의 통계를 불러오지 못했습니다.';
          toast.error(msg, { id: msg });
        }
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  useEffect(() => {
    let cancelled = false;

    const fetchInquiries = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/seller/inquiries', {
          params: {
            type: type === '전체' ? undefined : type,
            page,
            limit: LIMIT,
            answered: answered === '전체' ? undefined : answered,
            keyword: debouncedSearch || undefined,
          },
        });
        if (!cancelled) {
          setInquiries(res.data.inquiries);
          setTotal(res.data.pagination.total);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '문의 목록을 불러오지 못했습니다.';
          toast.error(msg, { id: msg });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchInquiries();
    return () => {
      cancelled = true;
    };
  }, [type, answered, debouncedSearch, page, refreshTrigger]);

  const totalPages = getTotalPages(total, LIMIT);

  const statusCardData = [
    { label: '전체', count: stats.totalCount, filterValue: '전체' },
    { label: '미답변', count: stats.waitingCount, filterValue: 'false' },
    { label: '답변완료', count: stats.answeredCount, filterValue: 'true' },
  ];

  const handleReplySubmitted = () => {
    setSelectedInquiry(null);
    setRefreshTrigger((n) => n + 1);
  };

  return (
    <div className="bg-background p-8 max-tablet:p-5 max-mobile:p-4">
      <div className="mb-8 max-mobile:mb-6">
        <h1 className="text-h2 font-bold text-dark-text max-mobile:text-lg">문의 관리</h1>
      </div>

      <StatusCards
        cards={statusCardData}
        status={answered === '전체' ? '전체' : answered}
        onStatusChange={(v) => setAnswered(v as '전체' | 'false' | 'true')}
        colorMap={INQUIRY_COLOR_MAP}
        cols={3}
        unit="건"
      />

      <div className="flex items-center gap-2 mb-5 mt-5 max-tablet:flex-col max-tablet:items-stretch">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목으로 검색"
          className="flex-1 py-5 bg-card max-tablet:w-full"
        />
        <Select value={type} onValueChange={(v) => setType(v as SellerInquiryType | '전체')}>
          <SelectTrigger className="w-32 max-tablet:w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <InquiryTable
        inquiries={inquiries}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onReplyClick={setSelectedInquiry}
      />

      <InquiryReplyModal
        inquiry={selectedInquiry}
        onClose={() => setSelectedInquiry(null)}
        onSubmitted={handleReplySubmitted}
      />
    </div>
  );
}
