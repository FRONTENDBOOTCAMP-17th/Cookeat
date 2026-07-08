'use client';

import type { OrderSortBy, OrderTableProps } from '@/types/seller/order';
import StatusBadge from '@/app/seller/components/StatusBadge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/ui/Pagination';
import EmptyRows from '@/components/ui/EmptyRows';
import { formatDateTime, getPageNumbers } from '@/lib/utils';
import { formatWon } from '@/lib/format';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function OrderTable({
  orders,
  sortBy,
  sortOrder,
  onSortChange,
  selectedIds,
  isAllSelectedMode,
  onSelect,
  onSelectAll,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: OrderTableProps) {
  const renderSortIcon = (column: OrderSortBy) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-0.5 text-gray-300" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="inline w-3.5 h-3.5 ml-0.5" />
    ) : (
      <ChevronDown className="inline w-3.5 h-3.5 ml-0.5" />
    );
  };

  const isAllChecked =
    isAllSelectedMode || (selectedIds.length === orders.length && orders.length > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden py-3">
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
            <TableHead
              className="text-center cursor-pointer select-none"
              onClick={() => onSortChange('orderId')}
            >
              주문번호{renderSortIcon('orderId')}
            </TableHead>
            <TableHead
              className="text-center cursor-pointer select-none"
              onClick={() => onSortChange('orderDate')}
            >
              주문일시{renderSortIcon('orderDate')}
            </TableHead>
            <TableHead className="text-center">주문자</TableHead>
            <TableHead className="text-center">상품명</TableHead>
            <TableHead className="text-center">수량</TableHead>
            <TableHead className="text-center">금액</TableHead>
            <TableHead className="text-center">상태</TableHead>
            <TableHead className="text-center">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                목록을 불러오는 중...
              </TableCell>
            </TableRow>
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                주문내역이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {orders.map((order) => (
                <TableRow key={order.itemId}>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelectedMode || selectedIds.includes(order.itemId)}
                      onChange={(e) => onSelect(order.itemId, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="text-center text-sm font-mono text-gray-500">
                    {order.orderId}
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-500">
                    {formatDateTime(order.orderDate)}
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-800">
                    {order.customer}
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-700">
                    <span
                      className="block max-w-[160px] truncate mx-auto"
                      title={order.productName}
                    >
                      {order.productName}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-600">
                    {order.quantity}
                  </TableCell>
                  <TableCell className="text-center text-sm font-medium text-gray-800">
                    {formatWon(order.itemTotalPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={order.status} />
                      {order.hasActiveClaim && (
                        <span
                          className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"
                          title="취소·환불 요청이 있습니다"
                        >
                          클레임
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Link href={`/seller/orders/${order.orderId}`}>
                      <Button size="sm">상세</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              <EmptyRows count={10 - orders.length} colSpan={9} />
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
