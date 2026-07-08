'use client';

import { formatDate, getPageNumbers } from '@/lib/utils';
import { formatWon } from '@/lib/format';
import Pagination from '@/components/ui/Pagination';
import EmptyRows from '@/components/ui/EmptyRows';
import StatusBadge from '../StatusBadge';
import { useRouter } from 'next/navigation';
import type { SettlementTableProps } from '@/types/seller/settlement';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SettlementTable({
  settlements,
  selectedIds,
  isAllSelectedMode,
  onSelect,
  onSelectAll,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: SettlementTableProps) {
  const router = useRouter();
  const isAllChecked =
    isAllSelectedMode || (selectedIds.length === settlements.length && settlements.length > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center w-10">
                <input
                  type="checkbox"
                  checked={isAllChecked}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead className="text-center whitespace-nowrap">정산기간</TableHead>
              <TableHead className="text-center whitespace-nowrap">전체판매금액</TableHead>
              <TableHead className="text-center whitespace-nowrap">취소·환불차감</TableHead>
              <TableHead className="text-center whitespace-nowrap">수수료</TableHead>
              <TableHead className="text-center whitespace-nowrap">정산금액</TableHead>
              <TableHead className="text-center whitespace-nowrap">상태</TableHead>
              <TableHead className="text-center whitespace-nowrap">정산일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : settlements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                  정산 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {settlements.map((s) => (
                  <TableRow
                    key={s.settlementId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/seller/settlements/${s.settlementId}`)}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isAllSelectedMode || selectedIds.includes(s.settlementId)}
                        onChange={(e) => onSelect(s.settlementId, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-700 whitespace-nowrap">
                      <span className="font-semibold">{s.periodLabel}</span> (
                      {formatDate(s.periodStart)} ~ {formatDate(s.periodEnd)})
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-700 whitespace-nowrap">
                      {formatWon(s.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-red-500 whitespace-nowrap">
                      {s.cancelledAmount > 0 ? `-${formatWon(s.cancelledAmount)}` : '-'}
                    </TableCell>
                    <TableCell className="text-center text-sm text-red-400 whitespace-nowrap">
                      -{formatWon(s.fee)}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium text-gray-800 whitespace-nowrap">
                      {formatWon(s.amount)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500 whitespace-nowrap">
                      {s.settledAt
                        ? `${formatDate(s.settledAt)}${s.status !== '정산완료' ? ' (예정)' : ''}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <EmptyRows count={10 - settlements.length} colSpan={8} />
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        getPageNumbers={() => getPageNumbers(page, totalPages)}
      />
    </div>
  );
}
