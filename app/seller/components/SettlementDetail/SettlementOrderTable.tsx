'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SettlementOrderTableProps, SettlementOrderItem } from '@/types/seller/settlement';
import StatusBadge from '../StatusBadge';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/ui/Pagination';
import { formatDateTime } from '@/lib/utils';
import { formatWon } from '@/lib/format';

function OrderSection({
  title,
  orders,
  isCancelledSection,
}: {
  title: string;
  orders: SettlementOrderItem[];
  isCancelledSection: boolean;
}) {
  const { currentPage, setCurrentPage, paginated, totalPages, getPageNumbers } = usePagination(
    orders,
    10
  );

  if (orders.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-dark-text mb-2">{title} (0건)</h3>
        <p className="text-sm text-light-gray py-6 text-center border border-border rounded-lg">
          내역이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-dark-text mb-2">
        {title} ({orders.length}건)
      </h3>
      <div className="overflow-x-auto whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow className="bg-beige">
              <TableHead className="text-center text-gray-text font-medium">주문번호</TableHead>
              <TableHead className="text-center text-gray-text font-medium">상품명</TableHead>
              <TableHead className="text-center text-gray-text font-medium">주문일</TableHead>
              <TableHead className="text-center text-gray-text font-medium">판매금액</TableHead>
              <TableHead className="text-center text-gray-text font-medium">수수료</TableHead>
              <TableHead className="text-center text-gray-text font-medium">상태</TableHead>
              <TableHead className="text-center text-gray-text font-medium">정산금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((order, index) => (
              <TableRow
                key={`${order.orderId}-${index}`}
                className={`text-center h-14 transition-colors ${
                  isCancelledSection ? 'bg-gray-50 text-light-gray' : 'hover:bg-beige/50'
                }`}
              >
                <TableCell className="text-xs text-gray-text font-mono">
                  {order.orderId}
                </TableCell>
                <TableCell className="text-sm text-dark-text">{order.productName}</TableCell>
                <TableCell className="text-sm text-gray-text">
                  {formatDateTime(order.orderDate)}
                </TableCell>
                <TableCell className="text-sm text-dark-text">
                  {formatWon(order.salesAmount)}
                </TableCell>
                <TableCell className="text-sm text-red">
                  {order.commission > 0 ? `-${formatWon(order.commission)}` : '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell
                  className={`text-sm font-semibold ${
                    isCancelledSection ? 'text-light-gray' : 'text-dark-text'
                  }`}
                >
                  {formatWon(order.settlementAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="py-4 border-t border-border mt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            getPageNumbers={getPageNumbers}
          />
        </div>
      )}
    </div>
  );
}

export default function SettlementOrderTable({ orders }: SettlementOrderTableProps) {
  const confirmedOrders = orders.filter((o) => o.status !== '취소' && o.status !== '환불');
  const cancelledOrders = orders.filter((o) => o.status === '취소' || o.status === '환불');

  return (
    <Card className="border-border shadow-sm mb-4">
      <CardContent className="p-6 max-tablet:p-5 max-mobile:p-4">
        <h2 className="text-base font-semibold text-dark-text mb-4">
          주문별 정산 내역 ({orders.length}건)
        </h2>

        <OrderSection title="구매확정 내역" orders={confirmedOrders} isCancelledSection={false} />
        <OrderSection title="취소·환불 내역" orders={cancelledOrders} isCancelledSection={true} />
      </CardContent>
    </Card>
  );
}
