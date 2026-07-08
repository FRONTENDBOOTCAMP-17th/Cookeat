'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/ui/Pagination';
import EmptyRows from '@/components/ui/EmptyRows';
import { formatDateTime, getPageNumbers } from '@/lib/utils';
import { formatWon } from '@/lib/format';
import { RefundTableProps } from '@/types/seller/order';
import StatusBadge from '../StatusBadge';

export default function RefundTable({
  orders,
  selectedIds,
  isAllSelectedMode,
  onSelect,
  onSelectAll,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: RefundTableProps) {
  const rows = orders.flatMap((order) => order.refundItems.map((item) => ({ order, item })));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center w-10">
                <input
                  type="checkbox"
                  checked={
                    isAllSelectedMode || (selectedIds.length === rows.length && rows.length > 0)
                  }
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead className="text-center whitespace-nowrap">주문번호</TableHead>
              <TableHead className="text-center whitespace-nowrap">주문일</TableHead>
              <TableHead className="text-center whitespace-nowrap">주문자</TableHead>
              <TableHead className="text-center">상품명</TableHead>
              <TableHead className="text-center whitespace-nowrap">수량</TableHead>
              <TableHead className="text-center whitespace-nowrap">금액</TableHead>
              <TableHead className="text-center whitespace-nowrap">배송상태</TableHead>
              <TableHead className="text-center whitespace-nowrap">신청일</TableHead>
              <TableHead className="text-center whitespace-nowrap">처리결과</TableHead>
              <TableHead className="text-center whitespace-nowrap">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16 text-gray-400 text-sm">
                  목록을 불러오는 중...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16 text-gray-400 text-sm">
                  취소·환불 요청이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rows.map(({ order, item }) => {
                  const isRejected = Boolean(item.refundRejectReason);
                  const isPending =
                    (item.itemStatus === '환불요청' || item.itemStatus === '취소요청') &&
                    !isRejected;
                  const isProcessing = item.itemStatus === '환불진행중';
                  const rejectedLabel = item.itemStatus === '취소요청' ? '취소거부' : '환불거부';

                  return (
                    <TableRow
                      key={item.refundId}
                      className={
                        isPending ? 'bg-amber-50' : isProcessing ? 'bg-blue-50' : undefined
                      }
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelectedMode || selectedIds.includes(item.refundId)}
                          onChange={(e) => onSelect(item.refundId, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Link
                          href={`/seller/orders/cancel-refund/${order.id}`}
                          className="text-sm font-mono text-primary underline underline-offset-2"
                        >
                          {order.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-500 whitespace-nowrap">
                        {formatDateTime(order.orderDate)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-800 whitespace-nowrap">
                        {order.customer}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-800 whitespace-nowrap">
                        <span
                          className="block max-w-[160px] truncate mx-auto"
                          title={item.productName}
                        >
                          {item.productName}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600 whitespace-nowrap">
                        {item.quantity}개
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-800 whitespace-nowrap">
                        {formatWon(item.quantity * item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <StatusBadge status={order.orderStatus} />
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-500 whitespace-nowrap">
                        {formatDateTime(item.requestedAt)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {isPending || isProcessing ? (
                          <StatusBadge status={item.itemStatus} />
                        ) : isRejected ? (
                          <StatusBadge status={rejectedLabel} />
                        ) : (
                          <StatusBadge status={item.itemStatus} />
                        )}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/seller/orders/cancel-refund/${order.id}`}>상세보기</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <EmptyRows count={10 - rows.length} colSpan={10} />
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
