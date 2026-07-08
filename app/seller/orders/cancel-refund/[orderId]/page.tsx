'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  Calendar,
  Truck,
  Percent,
  Ticket,
  Coins,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import BackButton from '../../../components/BackButton';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/lib/utils';
import { formatWon } from '@/lib/format';
import { COURIERS, sanitizeTrackingNumber } from '@/lib/courier';
import type { CourierCode } from '@/types/seller/shipping';
import { ORDER_STATUS_LABEL } from '@/types/seller/order';
import type { OrderWithRefunds, RefundItem } from '@/types/seller/order';
import api from '@/lib/api';
import { toast } from 'sonner';

// 상태별 색 토큰 — 카드 좌측 강조바, 뱃지에 공통으로 사용
const STATUS_STYLE: Record<
  'pending' | 'processing' | 'rejected' | 'done',
  { bar: string; badge: string; icon: React.ReactNode }
> = {
  pending: {
    bar: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock3 className="w-3.5 h-3.5" />,
  },
  processing: {
    bar: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  rejected: {
    bar: 'bg-gray-300',
    badge: 'bg-gray-50 text-gray-500 border-gray-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  done: {
    bar: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

export default function RefundDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  const [order, setOrder] = useState<OrderWithRefunds | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectingRefundId, setRejectingRefundId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingInputs, setTrackingInputs] = useState<
    Record<number, { courier: string; trackingNumber: string }>
  >({});
  const [editingTrackingIds, setEditingTrackingIds] = useState<Set<number>>(new Set());

  const [approvingRefundId, setApprovingRefundId] = useState<number | null>(null);
  const [selectedFaultType, setSelectedFaultType] = useState<'구매자귀책' | '판매자귀책' | null>(
    null
  );

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/seller/orders/refunds/order/${orderId}`);
      setOrder(res.data.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '환불 상세를 불러오지 못했습니다.';
      toast.error(msg, { id: msg });
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const run = () => {
      fetchDetail();
    };
    run();
  }, [fetchDetail]);

  const handleApprove = async (refundId: number, faultType: '구매자귀책' | '판매자귀책') => {
    try {
      const res = await api.patch(`/seller/orders/refunds/${refundId}`, {
        action: 'approve',
        faultType,
      });
      const resultStatus = res.data.data.status;
      const particle = resultStatus === '환불' ? '이' : '가';
      toast.success(`${resultStatus}${particle} 승인되었습니다.`);
      setApprovingRefundId(null);
      setSelectedFaultType(null);
      fetchDetail();
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(message ?? '승인에 실패했습니다.');
    }
  };

  const handleApproveSubmit = () => {
    if (!approvingRefundId || !selectedFaultType) return;
    handleApprove(approvingRefundId, selectedFaultType);
  };

  const handleProcess = async (refundId: number) => {
    try {
      await api.patch(`/seller/orders/refunds/${refundId}`, { action: 'process' });
      toast.success('환불 처리가 완료되었습니다.');
      fetchDetail();
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(message ?? '환불 처리에 실패했습니다.');
    }
  };

  const handleSaveTracking = async (refundId: number) => {
    const input = trackingInputs[refundId];
    if (!input?.courier || !input?.trackingNumber) return;
    try {
      await api.patch(`/seller/orders/refunds/${refundId}`, {
        action: 'saveTracking',
        courier: input.courier,
        trackingNumber: input.trackingNumber,
      });
      toast.success('반송 운송장이 저장되었습니다.');
      setEditingTrackingIds((prev) => {
        const next = new Set(prev);
        next.delete(refundId);
        return next;
      });
      fetchDetail();
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(message ?? '저장에 실패했습니다.');
    }
  };

  const handleStartEditTracking = (item: RefundItem) => {
    setTrackingInputs((prev) => ({
      ...prev,
      [item.refundId]: {
        courier: item.returnCourier ?? '',
        trackingNumber: item.returnTrackingNumber ?? '',
      },
    }));
    setEditingTrackingIds((prev) => new Set(prev).add(item.refundId));
  };

  const handleCancelEditTracking = (refundId: number) => {
    setEditingTrackingIds((prev) => {
      const next = new Set(prev);
      next.delete(refundId);
      return next;
    });
  };

  const handleRejectSubmit = async () => {
    if (!rejectingRefundId) return;
    if (!rejectReason.trim()) {
      toast.error('거부 사유를 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.patch(`/seller/orders/refunds/${rejectingRefundId}`, {
        action: 'reject',
        reason: rejectReason,
      });
      const resultStatus = res.data.data.status;
      const baseStatus = resultStatus.replace('요청', '');
      const particle = baseStatus === '환불' ? '을' : '를';
      toast.success(`${baseStatus}${particle} 거부했습니다.`);
      setRejectingRefundId(null);
      fetchDetail();
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(message ?? '거부 처리에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background p-8 max-desktop:p-6 max-tablet:p-4">
        <div className="flex items-center gap-2 mb-6">
          <BackButton />
          <h1 className="text-h2 font-bold text-dark-text max-tablet:text-h3 max-mobile:text-h4">
            환불 상세내역
          </h1>
        </div>
        <div className="text-center py-20 text-gray-400 text-sm">불러오는 중...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-background p-8 max-desktop:p-6 max-tablet:p-4">
        <div className="flex items-center gap-2 mb-6">
          <BackButton />
          <h1 className="text-h2 font-bold text-dark-text max-tablet:text-h3 max-mobile:text-h4">
            환불 상세내역
          </h1>
        </div>
        <div className="text-center py-20 text-gray-400 text-sm">환불 내역을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const totalOriginalAmount = order.refundItems.reduce(
    (sum, item) => sum + item.originalUnitPrice * item.quantity,
    0
  );
  const totalProductDiscount = order.refundItems.reduce(
    (sum, item) => sum + item.productDiscount,
    0
  );
  const totalCouponDiscount = order.refundItems.reduce((sum, item) => sum + item.couponDiscount, 0);
  const totalPointAmount = order.refundItems.reduce((sum, item) => sum + item.allocatedPoint, 0);

  const totalBuyerShippingDeduction = order.refundItems.reduce(
    (sum, item) => sum + (item.faultType === '구매자귀책' ? item.shippingFeeCharged : 0),
    0
  );
  const totalSellerShippingBurden = order.refundItems.reduce(
    (sum, item) => sum + (item.faultType === '판매자귀책' ? item.shippingFeeCharged : 0),
    0
  );

  const totalRefundAmountBeforeShipping = order.refundItems.reduce(
    (sum, item) => sum + item.refundAmount,
    0
  );
  const finalRefundAmount = totalRefundAmountBeforeShipping - totalBuyerShippingDeduction;

  return (
    <div className="bg-background p-8 max-desktop:p-6 max-tablet:p-4">
      <div className="flex items-center gap-2 mb-8">
        <BackButton />
        <h1 className="text-h2 font-bold text-dark-text max-tablet:text-h3 max-mobile:text-h4">
          환불 상세내역
        </h1>
      </div>

      {/* 주문 메타 정보 */}
      <div className="flex items-end justify-between mb-6 max-mobile:flex-col max-mobile:items-start max-mobile:gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 tracking-wide">
              {order.id}
            </span>
          </div>
          <p className="text-2xl font-bold text-dark-text tracking-tight max-mobile:text-xl">
            {formatDateTime(order.orderDate)}
          </p>
          <p className="text-sm text-gray-400 mt-1">{order.customer}님의 주문</p>
        </div>
        <Link
          href={`/seller/orders/${order.id}`}
          className="group flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors"
        >
          주문 상세보기
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 전체 환불 요약 — 그라데이션 카드 */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-white p-6 mb-10 shadow-sm max-mobile:p-4">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />

        <p className="text-xs font-semibold text-primary/70 tracking-wide uppercase mb-4">
          환불 금액 요약
        </p>

        <div className="flex flex-col gap-2.5 text-sm relative">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-gray-400" />총 상품금액 (정상가)
            </span>
            <span className="text-gray-700 font-medium">
              {formatWon(totalOriginalAmount)}
            </span>
          </div>

          {totalProductDiscount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-red-400" />
                상품할인
              </span>
              <span className="text-red-500">-{formatWon(totalProductDiscount)}</span>
            </div>
          )}

          {totalCouponDiscount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-red-400" />
                쿠폰할인
              </span>
              <span className="text-red-500">-{formatWon(totalCouponDiscount)}</span>
            </div>
          )}

          {totalBuyerShippingDeduction > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-red-400" />
                배송비 차감 (구매자귀책)
              </span>
              <span className="text-red-500">
                -{formatWon(totalBuyerShippingDeduction)}
              </span>
            </div>
          )}

          {totalPointAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-blue-400" />
                포인트 환급 (별도)
              </span>
              <span className="text-blue-500">{totalPointAmount.toLocaleString()}P</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 mt-1 border-t border-dashed border-primary/20">
            <span className="text-base font-semibold text-dark-text">최종 환불금액</span>
            <span className="text-2xl font-bold text-primary tracking-tight max-mobile:text-xl">
              {formatWon(finalRefundAmount)}
            </span>
          </div>

          {totalSellerShippingBurden > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              무료배송 기준 미달로 배송비 {formatWon(totalSellerShippingBurden)}이
              발생했지만, 판매자귀책이라 구매자에게 청구하지 않았어요.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <p className="text-sm font-semibold text-dark-text">
          환불·취소 상품 <span className="text-primary">{order.refundItems.length}</span>개
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {order.refundItems.map((item) => (
          <RefundItemRow
            key={item.refundId}
            item={item}
            isAdmin={isAdmin}
            trackingInput={trackingInputs[item.refundId]}
            isEditingTracking={editingTrackingIds.has(item.refundId)}
            onTrackingChange={(value) =>
              setTrackingInputs((prev) => ({ ...prev, [item.refundId]: value }))
            }
            onApprove={() => setApprovingRefundId(item.refundId)}
            onReject={() => setRejectingRefundId(item.refundId)}
            onProcess={() => handleProcess(item.refundId)}
            onSaveTracking={() => handleSaveTracking(item.refundId)}
            onStartEditTracking={() => handleStartEditTracking(item)}
            onCancelEditTracking={() => handleCancelEditTracking(item.refundId)}
          />
        ))}
      </div>

      <Dialog
        open={rejectingRefundId !== null}
        onOpenChange={(open) => !open && setRejectingRefundId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>환불 요청 거부</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="거부 사유를 입력해주세요"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingRefundId(null)}>
              취소
            </Button>
            <Button onClick={handleRejectSubmit} disabled={isSubmitting}>
              거부 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={approvingRefundId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApprovingRefundId(null);
            setSelectedFaultType(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>취소·환불 승인</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">
              이 건의 귀책을 선택해주세요. 배송비가 추가로 부과되는 경우, 이 선택에 따라 부담 주체가
              결정돼요.
            </p>
            <RadioGroup
              value={selectedFaultType ?? undefined}
              onValueChange={(value) => setSelectedFaultType(value as '구매자귀책' | '판매자귀책')}
              className="flex flex-col gap-2"
            >
              <label
                htmlFor="fault-buyer"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                  selectedFaultType === '구매자귀책'
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <RadioGroupItem value="구매자귀책" id="fault-buyer" />
                구매자귀책 (단순 변심 등)
              </label>
              <label
                htmlFor="fault-seller"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                  selectedFaultType === '판매자귀책'
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <RadioGroupItem value="판매자귀책" id="fault-seller" />
                판매자귀책 (불량·오배송 등)
              </label>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovingRefundId(null);
                setSelectedFaultType(null);
              }}
            >
              취소
            </Button>
            <Button onClick={handleApproveSubmit} disabled={!selectedFaultType}>
              승인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RefundItemRow({
  item,
  isAdmin,
  trackingInput,
  isEditingTracking,
  onTrackingChange,
  onApprove,
  onReject,
  onProcess,
  onSaveTracking,
  onStartEditTracking,
  onCancelEditTracking,
}: {
  item: RefundItem;
  isAdmin: boolean;
  trackingInput?: { courier: string; trackingNumber: string };
  isEditingTracking: boolean;
  onTrackingChange: (value: { courier: string; trackingNumber: string }) => void;
  onApprove: () => void;
  onReject: () => void;
  onProcess: () => void;
  onSaveTracking: () => void;
  onStartEditTracking: () => void;
  onCancelEditTracking: () => void;
}) {
  const isRejected = Boolean(item.refundRejectReason);
  const isPending =
    (item.itemStatus === '환불요청' || item.itemStatus === '취소요청') && !isRejected;
  const isProcessing = item.itemStatus === '환불진행중';
  const isDone = item.itemStatus === '환불';
  const canEditTracking = (isProcessing || isDone) && !isAdmin;
  const statusKey = isPending
    ? 'pending'
    : isProcessing
      ? 'processing'
      : isRejected
        ? 'rejected'
        : 'done';
  const style = STATUS_STYLE[statusKey];
  const statusLabel = isRejected
    ? item.itemStatus === '취소요청'
      ? '취소거부'
      : '환불거부'
    : ORDER_STATUS_LABEL[item.itemStatus];

  return (
    <div className="relative flex bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* 좌측 상태 강조바 */}
      <div className={`w-1 flex-shrink-0 ${style.bar}`} />

      <div className="flex-1 p-6 max-mobile:p-4">
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${style.badge}`}
          >
            {style.icon}
            {statusLabel}
          </span>
        </div>

        <div className="flex items-start gap-8 max-tablet:flex-col max-tablet:gap-4">
          {/* 상품 정보 */}
          <div className="flex gap-3 w-64 flex-shrink-0 max-tablet:w-full">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative ring-1 ring-gray-100">
              {item.img && (
                <Image src={item.img} alt={item.productName} fill className="object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark-text truncate">{item.productName}</p>
              <p className="text-xs text-gray-400 mt-1">{item.quantity}개</p>
            </div>
          </div>

          {/* 환불 금액 */}
          <div className="w-48 flex-shrink-0 max-tablet:w-full">
            <p className="text-2xs font-semibold text-gray-400 tracking-wide uppercase mb-2.5">
              환불 금액
            </p>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">정상가</span>
                <span className="text-gray-500">
                  {formatWon(item.originalUnitPrice * item.quantity)}
                </span>
              </div>
              {item.productDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">상품할인</span>
                  <span className="text-red-500">-{formatWon(item.productDiscount)}</span>
                </div>
              )}
              {item.couponDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">쿠폰할인</span>
                  <span className="text-red-500">-{formatWon(item.couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-gray-100">
                <span className="text-gray-700 font-medium">환급액</span>
                <span className="text-dark-text font-bold">
                  {formatWon(item.refundAmount)}
                </span>
              </div>
              {item.allocatedPoint > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    포인트
                  </span>
                  <span className="text-blue-500">{item.allocatedPoint.toLocaleString()}P</span>
                </div>
              )}
            </div>
          </div>

          {/* 신청 정보 */}
          <div className="w-48 flex-shrink-0 max-tablet:w-full">
            <p className="text-2xs font-semibold text-gray-400 tracking-wide uppercase mb-2.5">
              신청 정보
            </p>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-3.5 h-3.5 text-gray-300" />
                {formatDateTime(item.requestedAt)}
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />
                {item.processedAt ? formatDateTime(item.processedAt) : '처리 대기'}
              </div>
            </div>
          </div>

          {/* 반송 정보 */}
          <div className="flex-1 min-w-0 max-tablet:w-full">
            <p className="text-2xs font-semibold text-gray-400 tracking-wide uppercase mb-2.5">
              반송 정보
            </p>
            {item.returnCourier && item.returnTrackingNumber && !isEditingTracking ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-gray-400" />
                  {item.returnCourier} / {item.returnTrackingNumber}
                </p>
                {canEditTracking && (
                  <Button size="sm" variant="outline" onClick={onStartEditTracking}>
                    수정
                  </Button>
                )}
              </div>
            ) : canEditTracking ? (
              <div className="flex items-center gap-1.5">
                <Select
                  value={trackingInput?.courier ?? ''}
                  onValueChange={(value) =>
                    onTrackingChange({
                      courier: value,
                      trackingNumber: sanitizeTrackingNumber(
                        trackingInput?.trackingNumber ?? '',
                        value as CourierCode
                      ),
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
                  value={trackingInput?.trackingNumber ?? ''}
                  onChange={(e) =>
                    onTrackingChange({
                      courier: trackingInput?.courier ?? '',
                      trackingNumber: sanitizeTrackingNumber(
                        e.target.value,
                        (trackingInput?.courier ?? '') as CourierCode
                      ),
                    })
                  }
                  placeholder="운송장번호"
                  className="w-28"
                />
                <Button size="sm" variant="outline" onClick={onSaveTracking}>
                  저장
                </Button>
                {isEditingTracking && (
                  <Button size="sm" variant="ghost" onClick={onCancelEditTracking}>
                    취소
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-300">-</p>
            )}
          </div>

          {/* 관리 */}
          <div className="w-40 flex-shrink-0 flex justify-end gap-2 max-tablet:w-full max-tablet:justify-start">
            {!isAdmin && isPending && (
              <>
                <Button size="sm" onClick={onApprove}>
                  승인
                </Button>
                <Button size="sm" variant="outline" onClick={onReject}>
                  거부
                </Button>
              </>
            )}
            {!isAdmin && isProcessing && (
              <Button size="sm" onClick={onProcess}>
                환불처리
              </Button>
            )}
          </div>
        </div>

        {/* 사유 */}
        {(item.refundRequestReason || item.refundRejectReason) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1.5 text-sm">
            {item.refundRequestReason && (
              <div className="flex gap-2 items-start">
                <MessageSquareText className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 flex-shrink-0">요청 사유</span>
                <span className="text-gray-700">{item.refundRequestReason}</span>
              </div>
            )}
            {item.refundRequestDetail && (
              <div className="flex gap-2 pl-5.5">
                <span className="text-gray-400 flex-shrink-0">상세내용</span>
                <span className="text-gray-600">{item.refundRequestDetail}</span>
              </div>
            )}
            {item.refundRejectReason && (
              <div className="flex gap-2 items-start">
                <AlertTriangle className="w-3.5 h-3.5 text-red-300 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 flex-shrink-0">거부 사유</span>
                <span className="text-gray-700">{item.refundRejectReason}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
