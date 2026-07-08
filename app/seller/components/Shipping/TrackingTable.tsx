'use client';

import api from '@/lib/api';
import { useRef } from 'react';
import * as XLSX from 'xlsx';
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
  TrackingTableProps,
} from '@/types/seller/shipping';
import { COURIERS, sanitizeTrackingNumber } from '@/lib/courier';
import { useState } from 'react';
import { toast } from 'sonner';
import StatusBadge from '../StatusBadge';
import { useAuthStore } from '@/store/authStore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const EMPTY_MESSAGE: Record<'배송준비' | '배송중' | '배송완료', string> = {
  배송준비: '배송준비 중인 주문건이 없습니다.',
  배송중: '배송중인 주문건이 없습니다.',
  배송완료: '배송완료된 주문건이 없습니다.',
};

export default function TrackingTable({
  orders,
  total,
  status,
  onStatusChange,
  onBulkTrackingSuccess,
  onBulkStatusSuccess,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onUpdate,
  onCorrect,
}: TrackingTableProps) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [inputs, setInputs] = useState<Record<number, ShippingInputState>>({});
  const [defaultCourier, setDefaultCourier] = useState<CourierCode | ''>('');
  const isEditable = status === '배송준비' && !isAdmin;
  const isShipping = status === '배송중';
  const canCorrect = (status === '배송중' || status === '배송완료') && !isAdmin;
  const hasActionColumn = isEditable || isShipping || canCorrect;

  const isRowEditing = (itemId: number) => inputs[itemId]?.isEditing ?? false;

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

  const [prevAutoFillTrigger, setPrevAutoFillTrigger] = useState({ defaultCourier, isEditable, orders });
  if (
    prevAutoFillTrigger.defaultCourier !== defaultCourier ||
    prevAutoFillTrigger.isEditable !== isEditable ||
    prevAutoFillTrigger.orders !== orders
  ) {
    setPrevAutoFillTrigger({ defaultCourier, isEditable, orders });
    if (defaultCourier && isEditable) {
      setInputs((prev) => {
        const next = { ...prev };
        orders.forEach((order) => {
          const current = next[order.itemId];
          if (!current?.courier || current.isAutoFilledCourier) {
            next[order.itemId] = {
              courier: defaultCourier,
              trackingNumber: current?.trackingNumber ?? '',
              isEditing: current?.isEditing ?? false,
              isAutoFilledCourier: true,
            };
          }
        });
        return next;
      });
    }
  }

  const handleConfirm = (itemId: number) => {
    const input = inputs[itemId];

    if (!input?.courier) {
      toast.error('택배사를 선택해주세요.');
      return;
    }
    if (!input?.trackingNumber) {
      toast.error('운송장번호를 입력해주세요.');
      return;
    }

    if (canCorrect) {
      onCorrect(itemId, input.courier, input.trackingNumber);
      handleCancelEdit(itemId);
    } else {
      onUpdate(itemId, input.courier, input.trackingNumber);
    }
  };

  const renderCourierCell = (order: ShippingRow) => {
    if (isEditable || isRowEditing(order.itemId)) {
      return (
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
                  isAutoFilledCourier: false,
                },
              };
            })
          }
        >
          <SelectTrigger size="sm" className="w-32 mx-auto">
            <SelectValue placeholder="택배사 선택" />
          </SelectTrigger>
          <SelectContent>
            {COURIERS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return <span className="text-sm text-gray-600 whitespace-nowrap">{order.courier}</span>;
  };

  const renderTrackingCell = (order: ShippingRow) => {
    if (isEditable || isRowEditing(order.itemId)) {
      const courier = inputs[order.itemId]?.courier ?? '';
      return (
        <Input
          type="text"
          inputMode="numeric"
          value={inputs[order.itemId]?.trackingNumber ?? ''}
          onChange={(e) =>
            setInputs((prev) => ({
              ...prev,
              [order.itemId]: {
                ...prev[order.itemId],
                trackingNumber: sanitizeTrackingNumber(e.target.value, courier),
              },
            }))
          }
          placeholder="운송장번호 입력"
          className="w-36 mx-auto whitespace-nowrap"
        />
      );
    }

    return <span className="text-sm text-gray-600 whitespace-nowrap">{order.trackingNumber}</span>;
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/seller/shipping/orders/export-tracking');
      const rows = res.data.data;

      if (rows.length === 0) {
        toast.error('다운로드할 배송준비 건이 없습니다.');
        return;
      }

      const sheetData = rows.map(
        (
          r: { orderId: string; recipient: string; productName: string; quantity: number },
          index: number
        ) => ({
          'No.': index + 1,
          주문번호: r.orderId,
          수령인: r.recipient,
          상품명: r.productName,
          수량: r.quantity,
          택배사: '',
          운송장번호: '',
        })
      );

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '운송장양식');

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `운송장등록양식_${today}.xlsx`);
    } catch {
      toast.error('양식 다운로드에 실패했습니다.');
    }
  };

  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const isCompletable = status === '배송중' && !isAdmin;
  const [prevOrdersForSelection, setPrevOrdersForSelection] = useState(orders);

  if (orders !== prevOrdersForSelection) {
    setPrevOrdersForSelection(orders);
    setSelectedItemIds([]);
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedItemIds(checked ? orders.map((o) => o.itemId) : []);
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    setSelectedItemIds((prev) =>
      checked ? [...prev, itemId] : prev.filter((id) => id !== itemId)
    );
  };

  const handleBulkComplete = async () => {
    if (selectedItemIds.length === 0) {
      toast.error('선택된 상품이 없습니다.');
      return;
    }

    setIsBulkProcessing(true);
    try {
      const res = await api.patch('/seller/shipping/orders/bulk-status', {
        itemIds: selectedItemIds,
        status: '배송완료',
      });
      const { successCount, failCount, failures, results } = res.data.data;

      if (failCount > 0) {
        toast.error(
          `${successCount}건 처리 완료, ${failCount}건 실패: ${failures.map((f: { itemId: number; error?: string }) => `항목 ${f.itemId}(${f.error})`).join(', ')}`
        );
      } else {
        toast.success(`${successCount}건이 일괄 배송완료 처리되었습니다.`);
      }

      const succeededIds = results
        .filter((r: { itemId: number; success: boolean }) => r.success)
        .map((r: { itemId: number }) => r.itemId);

      onBulkStatusSuccess?.(succeededIds);
      setSelectedItemIds([]);
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(message ?? '일괄 처리에 실패했습니다.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      const updates = rows
        .map((row) => ({
          orderId: String(row['주문번호'] ?? '').trim(),
          courier: String(row['택배사'] ?? '').trim(),
          trackingNumber: String(row['운송장번호'] ?? '').trim(),
        }))
        .filter((r) => r.orderId && r.courier && r.trackingNumber);

      if (updates.length === 0) {
        toast.error('택배사와 운송장번호가 입력된 행이 없습니다.');
        return;
      }

      const trackingToOrders = new Map<string, Set<string>>();
      for (const u of updates) {
        if (!trackingToOrders.has(u.trackingNumber)) {
          trackingToOrders.set(u.trackingNumber, new Set());
        }
        trackingToOrders.get(u.trackingNumber)!.add(u.orderId);
      }

      const duplicatedTrackingNumbers = [...trackingToOrders.entries()]
        .filter(([, orderIds]) => orderIds.size > 1)
        .map(([trackingNumber]) => trackingNumber);

      if (duplicatedTrackingNumbers.length > 0) {
        toast.error(
          `같은 운송장번호가 다른 주문에 중복 입력되었습니다: ${duplicatedTrackingNumbers.join(', ')}`
        );
        return;
      }

      const res = await api.patch('/seller/shipping/orders/bulk-tracking', { updates });
      const { successCount, failCount, failures } = res.data.data;

      if (failCount > 0) {
        toast.error(
          `${successCount}건 등록 완료, ${failCount}건 실패: ${failures.map((f: { orderId: string; error?: string }) => `${f.orderId}(${f.error})`).join(', ')}`
        );
      } else {
        toast.success(`${successCount}건의 운송장이 등록되었습니다.`);
      }

      onBulkTrackingSuccess?.();
    } catch {
      toast.error('파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const colSpanCount = (hasActionColumn ? 11 : 10) + (isCompletable ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 max-mobile:flex-col max-mobile:items-start max-mobile:gap-3 max-mobile:px-3 max-mobile:py-3">
        <p className="text-sm text-gray-500">
          상품 <span className="font-semibold text-gray-800">{total}</span>개
        </p>

        <div className="flex items-center gap-2 max-tablet:flex-wrap">
          {isEditable && (
            <>
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                양식 다운로드
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? '업로드 중...' : '일괄 업로드'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">기본 택배사</span>
                <Select
                  value={defaultCourier}
                  onValueChange={(value) => setDefaultCourier(value as CourierCode)}
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue placeholder="택배사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURIERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {isCompletable && (
            <Button
              size="sm"
              disabled={selectedItemIds.length === 0 || isBulkProcessing}
              onClick={handleBulkComplete}
            >
              일괄 배송완료 처리 {selectedItemIds.length > 0 && `(${selectedItemIds.length})`}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow>
              {isCompletable && (
                <TableHead className="text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedItemIds.length === orders.length && orders.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
              )}
              <TableHead className="text-center whitespace-nowrap">주문번호</TableHead>
              <TableHead className="text-center whitespace-nowrap">주문일시</TableHead>
              <TableHead className="text-center whitespace-nowrap">주문자</TableHead>
              <TableHead className="text-center">상품명</TableHead>
              <TableHead className="text-center whitespace-nowrap">수량</TableHead>
              <TableHead className="text-center whitespace-nowrap">택배사</TableHead>
              <TableHead className="text-center whitespace-nowrap">운송장번호</TableHead>
              <TableHead className="text-center whitespace-nowrap">발송일</TableHead>
              <TableHead className="text-center whitespace-nowrap">배송완료일</TableHead>
              <TableHead className="text-center whitespace-nowrap">상태</TableHead>
              {hasActionColumn && (
                <TableHead className="text-center whitespace-nowrap">관리</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={colSpanCount}
                  className="text-center py-16 text-gray-400 text-sm"
                >
                  목록을 불러오는 중...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpanCount}
                  className="text-center py-16 text-gray-400 text-sm"
                >
                  {EMPTY_MESSAGE[status]}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {orders.map((order) => (
                  <TableRow key={order.itemId}>
                    {isCompletable && (
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(order.itemId)}
                          onChange={(e) => handleSelectItem(order.itemId, e.target.checked)}
                        />
                      </TableCell>
                    )}
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
                      {renderCourierCell(order)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {renderTrackingCell(order)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500 whitespace-nowrap">
                      {order.shippedAt ? formatDateTime(order.shippedAt) : '-'}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500 whitespace-nowrap">
                      {order.deliveredAt ? formatDateTime(order.deliveredAt) : '-'}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <StatusBadge status={order.status} />
                    </TableCell>
                    {hasActionColumn && (
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditable && (
                            <Button size="sm" onClick={() => handleConfirm(order.itemId)}>
                              저장
                            </Button>
                          )}
                          {canCorrect &&
                            (isRowEditing(order.itemId) ? (
                              <>
                                <Button size="sm" onClick={() => handleConfirm(order.itemId)}>
                                  저장
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelEdit(order.itemId)}
                                >
                                  취소
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEdit(order)}
                              >
                                수정
                              </Button>
                            ))}
                          {isShipping && !isRowEditing(order.itemId) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onStatusChange(order.itemId, '배송완료')}
                            >
                              배송완료 처리
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <EmptyRows count={10 - orders.length} colSpan={colSpanCount} />
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
