'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getTotalPages } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SettlementTable from '../components/Settlement/SettlementTable';
import StatusCards from '@/components/ui/StatusCards';
import type {
  SettlementRow,
  SettlementSummary,
  SettlementDbStatus,
} from '@/types/seller/settlement';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const LIMIT = 10;

const SETTLEMENT_COLOR_MAP = {
  정산대기: 'text-amber-500',
  정산예정: 'text-blue-500',
  정산완료: 'text-emerald-500',
};

const STATUS_OPTIONS: { label: string; value: SettlementDbStatus | '전체' }[] = [
  { label: '전체', value: '전체' },
  { label: '정산대기', value: '대기' },
  { label: '정산예정', value: '예정' },
  { label: '정산완료', value: '완료' },
];

export default function SettlementsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [status, setStatus] = useState<SettlementDbStatus | '전체'>('전체');
  const [search, setSearch] = useState('');
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SettlementSummary>({
    completedTotal: 0,
    scheduledTotal: 0,
    pendingTotal: 0,
    upcomingTotal: 0,
    nextSettlementDate: null,
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isAllSelectedMode, setIsAllSelectedMode] = useState(false);
  const selectionFilterKey = `${page}-${status}-${search}`;
  const [prevSelectionFilterKey, setPrevSelectionFilterKey] = useState(selectionFilterKey);
  const [prevStatus, setPrevStatus] = useState(status);

  const handleSelect = (settlementId: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, settlementId] : prev.filter((id) => id !== settlementId)
    );
    setIsAllSelectedMode(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setIsAllSelectedMode(true);
      setSelectedIds(settlements.map((s) => s.settlementId));
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

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelDownload = async () => {
    if (!isAllSelectedMode && selectedIds.length === 0) {
      toast.error('다운로드할 정산 내역을 선택해주세요.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await api.get('/seller/settlements/export', {
        params: isAllSelectedMode
          ? { status, keyword: search || undefined }
          : { settlementIds: selectedIds.join(',') },
      });
      const rows = res.data.data;

      if (rows.length === 0) {
        toast.error('다운로드할 정산 내역이 없습니다.');
        return;
      }

      const sheetData = rows.map(
        (
          r: {
            periodLabel: string;
            periodStart: string;
            periodEnd: string;
            orderId: string;
            productName: string;
            quantity: number;
            unitPrice: number;
            itemAmount: number;
            itemFee: number;
            itemSettlementAmount: number;
            itemStatus: string;
            status: string;
            settledAt: string | null;
          },
          index: number
        ) => ({
          'No.': index + 1,
          정산기간: r.periodLabel,
          기간상세: `${r.periodStart} ~ ${r.periodEnd}`,
          주문번호: r.orderId,
          상품명: r.productName,
          수량: r.quantity,
          단가: r.unitPrice,
          판매금액: r.itemAmount,
          구분: r.itemStatus,
          수수료: r.itemFee,
          정산금액: r.itemSettlementAmount,
          정산상태: r.status,
          정산일: r.settledAt ? r.settledAt.split('T')[0] : '',
        })
      );

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '정산내역');

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `정산내역_${today}.xlsx`);
    } catch {
      toast.error('다운로드에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/seller/settlements/summary');
      setSummary(res.data.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '정산 요약을 불러오지 못했습니다.';
      toast.error(msg, { id: msg });
    }
  };

  useEffect(() => {
    api
      .post('/seller/settlements/ensure')
      .catch(() => {})
      .finally(fetchSummary);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSettlements = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/seller/settlements', {
          params: { page, limit: LIMIT, status, keyword: search || undefined },
        });
        if (!cancelled) {
          setSettlements(res.data.data.settlements);
          setTotal(res.data.data.pagination.total);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '정산 내역을 불러오지 못했습니다.';
          toast.error(msg, { id: msg });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSettlements();

    return () => {
      cancelled = true;
    };
  }, [page, status, search]);

  const statusCardData = [
    { label: '정산대기', count: summary.pendingTotal, filterValue: '대기' },
    { label: '정산예정', count: summary.scheduledTotal, filterValue: '예정' },
    { label: '정산완료', count: summary.completedTotal, filterValue: '완료' },
  ];

  const totalPages = getTotalPages(total, LIMIT);

  if (status !== prevStatus) {
    setPrevStatus(status);
    setSearch('');
    setPage(1);
  }

  return (
    <div className="bg-background p-8 max-tablet:p-5 max-mobile:p-4">
      <div className="mb-8 flex items-center justify-between max-tablet:flex-col max-tablet:items-start max-tablet:gap-3">
        <h1 className="text-h2 font-bold text-dark-text">정산 관리</h1>
        <div className="flex items-center gap-4 max-mobile:w-full max-mobile:flex-col max-mobile:items-stretch">
          {summary.nextSettlementDate && (
            <p className="text-sm text-gray-500">
              다음 정산일{' '}
              <span className="font-semibold text-gray-800">{summary.nextSettlementDate}</span>
            </p>
          )}
          {!isAdmin && (
            <Button
              onClick={handleExcelDownload}
              disabled={isExporting}
              className="max-mobile:w-full"
            >
              <Download />
              {isExporting ? '다운로드 중...' : '엑셀 다운로드'}
            </Button>
          )}
        </div>
      </div>

      <StatusCards
        cards={statusCardData}
        status={status}
        onStatusChange={(v) => {
          setStatus(v as SettlementDbStatus | '전체');
          setPage(1);
        }}
        colorMap={SETTLEMENT_COLOR_MAP}
        cols={3}
        unit="원"
      />

      <div className="flex items-center gap-2 mb-5 max-tablet:flex-col max-tablet:items-stretch">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="정산 기간으로 검색 (예: 2026-06)"
          className="flex-1 py-5 bg-card max-tablet:w-full"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as SettlementDbStatus | '전체');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32 max-tablet:w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SettlementTable
        settlements={settlements}
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
