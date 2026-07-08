'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime, getPageNumbers } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import EmptyRows from '@/components/ui/EmptyRows';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CourierCode,
  ShippingRow,
  ShippingInputState,
  AllOrdersTableProps,
} from '@/types/seller/shipping';
import { COURIERS, sanitizeTrackingNumber } from '@/lib/courier';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import StatusBadge from '../StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AllOrdersTable({
  orders,
  total,
  onUpdate,
  onCorrect,
  onStatusChange,
  onConfirmOrder,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: AllOrdersTableProps) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [inputs, setInputs] = useState<Record<number, ShippingInputState>>({});

  const isRowEditing = (itemId: number) => inputs[itemId]?.isEditing ?? false;
  const canCorrect = (order: ShippingRow) =>
    !isAdmin && (order.status === '배송중' || order.status === '배송완료');

  const handleStartEdit = (order: ShippingRow) => {
    setInputs((prev) => ({
      ...prev,
      [order.itemId]: {
        courier: order.courier,
        trackingNumber: order.trackingNumber,
        isEditing: true,
      },
    }));
  };

  const handleCancelEdit = (itemId: number) => {
    setInputs((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleConfirm = (order: ShippingRow) => {
    const itemId = order.itemId;
    const input = inputs[itemId];

    if (!input?.courier) {
      toast.error('택배사를 선택해주세요.');
      return;
    }
    if (!input?.trackingNumber) {
      toast.error('운송장번호를 입력해주세요.');
      return;
    }

    if (canCorrect(order)) {
      onCorrect(itemId, input.courier, input.trackingNumber);
      handleCancelEdit(itemId);
    } else {
      onUpdate(itemId, input.courier, input.trackingNumber);
    }
  };

  const renderTrackingCell = (order: ShippingRow) => {
    if ((order.status === '배송준비' && !isAdmin) || isRowEditing(order.itemId)) {
      return (
        <div className="flex items-center gap-1.5 justify-center">
          <Select
            value={inputs[order.itemId]?.courier ?? ''}
            onValueChange={(value) =>
              setInputs((prev) => {
                const current = prev[order.itemId];
                return {
                  ...prev,
                  [order.itemId]: {
                    ...current,
                    courier: value as CourierCode,
                    trackingNumber: sanitizeTrackingNumber(
                      current?.trackingNumber ?? '',
                      value as CourierCode
                    ),
                  },
                };
              })
            }
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue placeholder="택배사" />
            </SelectTrigger>
            <SelectContent>
              {COURIERS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            inputMode="numeric"
            value={inputs[order.itemId]?.trackingNumber ?? ''}
            onChange={(e) =>
              setInputs((prev) => ({
                ...prev,
                [order.itemId]: {
                  ...prev[order.itemId],
                  trackingNumber: sanitizeTrackingNumber(
                    e.target.value,
                    prev[order.itemId]?.courier ?? ''
                  ),
                },
              }))
            }
            placeholder="운송장번호"
            className="w-28 whitespace-nowrap"
          />
        </div>
      );
    }

    if (order.courier && order.trackingNumber) {
      return (
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {order.courier} / {order.trackingNumber}
        </span>
      );
    }

    return <span className="text-sm text-gray-400">-</span>;
  };

  const renderActionCell = (order: ShippingRow) => {
    if (isAdmin) return <span className="text-gray-400 text-sm">-</span>;

    if (isRowEditing(order.itemId)) {
      return (
        <div className="flex items-center justify-center gap-1.5">
          <Button size="sm" onClick={() => handleConfirm(order)}>
            저장
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(order.itemId)}>
            취소
          </Button>
        </div>
      );
    }

    switch (order.status) {
      case '결제완료':
        return (
          <Button size="sm" onClick={() => onConfirmOrder(order.orderId)}>
            발주확인
          </Button>
        );
      case '배송준비':
        return (
          <Button size="sm" onClick={() => handleConfirm(order)}>
            저장
          </Button>
        );
      case '배송중':
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => handleStartEdit(order)}>
              수정
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(order.itemId, '배송완료')}
            >
              배송완료 처리
            </Button>
          </div>
        );
      case '배송완료':
        return (
          <Button size="sm" variant="outline" onClick={() => handleStartEdit(order)}>
            수정
          </Button>
        );
      default:
        return <span className="text-gray-400 text-sm">-</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center px-5 py-4 border-b border-gray-100 max-mobile:px-3 max-mobile:py-3">
        <p className="text-sm text-gray-500">
          상품 <span className="font-semibold text-gray-800">{total}</span>개
        </p>
      </div>

      <div className="overflow-x-auto whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center whitespace-nowrap">주문번호</TableHead>
              <TableHead className="text-center whitespace-nowrap">주문일시</TableHead>
              <TableHead className="text-center whitespace-nowrap">주문자</TableHead>
              <TableHead className="text-center">상품명</TableHead>
              <TableHead className="text-center whitespace-nowrap">수량</TableHead>
              <TableHead className="text-center whitespace-nowrap">상태</TableHead>
              <TableHead className="text-center whitespace-nowrap">택배사 / 운송장번호</TableHead>
              <TableHead className="text-center whitespace-nowrap">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                  목록을 불러오는 중...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                  조회된 주문건이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {orders.map((order) => (
                  <TableRow key={order.itemId}>
                    <TableCell className="text-center text-sm font-mono text-gray-500 whitespace-nowrap">
                      {order.orderId}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500 whitespace-nowrap">
                      {formatDateTime(order.orderDate)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-800 whitespace-nowrap">
                      {order.customer}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-800">
                      <span
                        className="block max-w-[160px] truncate mx-auto"
                        title={order.productName}
                      >
                        {order.productName}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-600 whitespace-nowrap">
                      {order.quantity}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {renderTrackingCell(order)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {renderActionCell(order)}
                    </TableCell>
                  </TableRow>
                ))}
                <EmptyRows count={10 - orders.length} colSpan={8} />
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
