import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logOrderItemStatusHistory } from '@/lib/orderItemStatusHistory';
import { cancelPayment } from '@/lib/pgCancel';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/lib/shipping';

export async function getOrdersWithRefundRequests(
  sellerId: number,
  options: {
    page: number;
    limit: number;
    tab?: '전체' | '취소요청' | '환불요청' | '환불진행중' | '처리완료';
    keyword?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const { page, limit, tab, keyword, startDate, endDate } = options;

  let refundQuery = supabaseAdmin
    .from('refund_requests')
    .select(
      'refund_id, item_id, status, request_reason, reject_reason, requested_at, processed_at, return_courier, return_tracking_number, order_items!inner(order_id, product_id, quantity, unit_price, seller_id, products(name))'
    )
    .eq('order_items.seller_id', sellerId);

  if (startDate) refundQuery = refundQuery.gte('requested_at', `${startDate}T00:00:00`);
  if (endDate) refundQuery = refundQuery.lte('requested_at', `${endDate}T23:59:59`);

  const { data: refunds, error: refundsError } = await refundQuery.order('requested_at', {
    ascending: false,
  });

  if (refundsError) throw refundsError;

  if (!refunds || refunds.length === 0) {
    return { orders: [], total: 0 };
  }

  const latestByItem = new Map<number, (typeof refunds)[number]>();
  for (const r of refunds) {
    if (!latestByItem.has(r.item_id)) {
      latestByItem.set(r.item_id, r);
    }
  }
  let claims = [...latestByItem.values()];

  if (tab === '취소요청') {
    claims = claims.filter((r) => r.status === '취소요청' && !r.reject_reason);
  } else if (tab === '환불요청') {
    claims = claims.filter((r) => r.status === '환불요청' && !r.reject_reason);
  } else if (tab === '환불진행중') {
    claims = claims.filter((r) => r.status === '환불진행중');
  } else if (tab === '처리완료') {
    claims = claims.filter((r) => r.status === '취소' || r.status === '환불' || r.reject_reason);
  }

  if (keyword) {
    const allOrderIds = [
      ...new Set(claims.map((r) => (r.order_items as unknown as { order_id: string }).order_id)),
    ];

    const { data: orderMeta, error: orderMetaError } = await supabaseAdmin
      .from('orders')
      .select('order_id, user_id, users(nickname)')
      .in('order_id', allOrderIds);

    if (orderMetaError) throw orderMetaError;

    const customerByOrderId = new Map(
      (orderMeta ?? []).map((o) => [
        o.order_id,
        (o.users as unknown as { nickname: string } | null)?.nickname ?? '',
      ])
    );

    claims = claims.filter((r) => {
      const orderItem = r.order_items as unknown as {
        order_id: string;
        products: { name: string } | null;
      };
      const product = orderItem.products?.name ?? '';
      const customer = customerByOrderId.get(orderItem.order_id) ?? '';
      const lowerKeyword = keyword.toLowerCase();
      return (
        orderItem.order_id.toLowerCase().includes(lowerKeyword) ||
        product.toLowerCase().includes(lowerKeyword) ||
        customer.toLowerCase().includes(lowerKeyword)
      );
    });
  }

  const total = claims.length;
  const from = (page - 1) * limit;
  const pagedClaims = claims.slice(from, from + limit);

  if (pagedClaims.length === 0) {
    return { orders: [], total };
  }

  const pagedOrderIds = [
    ...new Set(pagedClaims.map((r) => (r.order_items as unknown as { order_id: string }).order_id)),
  ];

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('order_id, created_at, status, recipient, phone, users(nickname)')
    .in('order_id', pagedOrderIds);

  if (ordersError) throw ordersError;

  const result = (orders ?? []).map((o) => {
    const orderRefunds = pagedClaims.filter(
      (r) => (r.order_items as unknown as { order_id: string }).order_id === o.order_id
    );
    const user = o.users as unknown as { nickname: string } | null;

    return {
      id: o.order_id,
      orderDate: o.created_at,
      orderStatus: o.status,
      customer: user?.nickname ?? '알 수 없음',
      recipient: o.recipient ?? '',
      phone: o.phone ?? '',
      refundItems: orderRefunds.map((r) => {
        const orderItem = r.order_items as unknown as {
          quantity: number;
          unit_price: number;
          products: { name: string } | null;
        };
        return {
          itemId: r.item_id,
          refundId: r.refund_id,
          productName: orderItem.products?.name ?? '알 수 없음',
          quantity: orderItem.quantity,
          unitPrice: orderItem.unit_price,
          itemStatus: r.status,
          refundRequestReason: r.request_reason,
          refundRejectReason: r.reject_reason,
          requestedAt: r.requested_at,
          processedAt: r.processed_at,
          returnCourier: r.return_courier,
          returnTrackingNumber: r.return_tracking_number,
        };
      }),
    };
  });

  return { orders: result, total };
}

export async function getRefundCounts(sellerId: number) {
  const { data: sellerItemRows, error: sellerItemsError } = await supabaseAdmin
    .from('order_items')
    .select('item_id')
    .eq('seller_id', sellerId);

  if (sellerItemsError) throw sellerItemsError;

  const sellerItemIds = (sellerItemRows ?? []).map((r) => r.item_id);

  const emptyCounts = { 전체: 0, 취소요청: 0, 환불요청: 0, 환불진행중: 0, 처리완료: 0 };

  if (sellerItemIds.length === 0) {
    return emptyCounts;
  }

  const { data: refunds, error: refundsError } = await supabaseAdmin
    .from('refund_requests')
    .select('item_id, status, reject_reason')
    .in('item_id', sellerItemIds)
    .order('requested_at', { ascending: false });

  if (refundsError) throw refundsError;

  const latestByItem = new Map<number, { status: string; rejectReason: string | null }>();
  for (const r of refunds ?? []) {
    if (!latestByItem.has(r.item_id)) {
      latestByItem.set(r.item_id, { status: r.status, rejectReason: r.reject_reason });
    }
  }

  const counts = { ...emptyCounts };
  for (const { status, rejectReason } of latestByItem.values()) {
    counts.전체 += 1;
    if (rejectReason || status === '취소' || status === '환불') {
      counts.처리완료 += 1;
    } else if (status === '취소요청') {
      counts.취소요청 += 1;
    } else if (status === '환불요청') {
      counts.환불요청 += 1;
    } else if (status === '환불진행중') {
      counts.환불진행중 += 1;
    }
  }

  return counts;
}

export async function approveRefund(
  sellerId: number,
  refundId: number,
  faultType: '구매자귀책' | '판매자귀책'
) {
  const { data: refund, error: refundError } = await supabaseAdmin
    .from('refund_requests')
    .select(
      'status, item_id, order_items!inner(seller_id, order_id, unit_price, quantity, allocated_coupon_discount, orders!inner(payment_method, payment_key))'
    )
    .eq('refund_id', refundId)
    .maybeSingle();

  if (refundError) throw refundError;
  if (!refund) {
    throw new Error('환불 요청을 찾을 수 없습니다.');
  }

  const orderItem = refund.order_items as unknown as {
    seller_id: number;
    order_id: string;
    unit_price: number;
    quantity: number;
    allocated_coupon_discount: number | null;
    orders: { payment_method: string; payment_key: string | null };
  };
  if (orderItem.seller_id !== sellerId) {
    throw new Error('환불 요청을 찾을 수 없습니다.');
  }
  if (refund.status !== '환불요청' && refund.status !== '취소요청') {
    throw new Error('처리 대기 중인 요청이 아닙니다.');
  }

  const { data: confirmed, error: confirmedError } = await supabaseAdmin
    .from('order_item_status_history')
    .select('order_item_id')
    .eq('order_item_id', refund.item_id)
    .eq('status', '구매확정')
    .limit(1);

  if (confirmedError) throw confirmedError;
  if (confirmed && confirmed.length > 0) {
    throw new Error('구매확정된 항목은 환불 처리할 수 없습니다.');
  }

  const { data: currentItem, error: currentItemError } = await supabaseAdmin
    .from('order_items')
    .select('shipping_status')
    .eq('item_id', refund.item_id)
    .single();

  if (currentItemError) throw currentItemError;
  const originalShippingStatus = currentItem.shipping_status;

  // refund_requests.status 체크만으로는 동일 아이템에 대해 새로 생성된 요청 row와
  // 과거에 이미 종결된 shipping_status 간의 불일치를 막지 못한다 (이중 환불 방지)
  if (originalShippingStatus === '취소' || originalShippingStatus === '환불') {
    throw new Error('이미 취소/환불 처리된 주문 상품입니다.');
  }

  const isCancel = refund.status === '취소요청';
  const approvedStatus = isCancel ? '취소' : '환불진행중';
  const originalStatus = refund.status;
  const processedAt = new Date().toISOString();

  const shippingFeeCharged = await recalcShippingFeeForOrder(
    orderItem.order_id,
    sellerId,
    refund.item_id
  );

  let pgCancelExecuted = false;
  if (isCancel) {
    const { payment_method, payment_key } = orderItem.orders;
    if (payment_key) {
      let cancelAmount =
        orderItem.unit_price * orderItem.quantity - (orderItem.allocated_coupon_discount ?? 0);
      if (shippingFeeCharged > 0 && faultType === '구매자귀책') {
        cancelAmount = Math.max(0, cancelAmount - shippingFeeCharged);
      }
      await cancelPayment(payment_method, payment_key, Math.max(0, cancelAmount));
      pgCancelExecuted = true;
    }
  }

  try {
    const { error: updateError } = await supabaseAdmin
      .from('refund_requests')
      .update({
        status: approvedStatus,
        processed_at: isCancel ? processedAt : null,
        fault_type: faultType,
        shipping_fee_charged: shippingFeeCharged,
      })
      .eq('refund_id', refundId);

    if (updateError) throw updateError;

    const { error: shippingStatusError } = await supabaseAdmin
      .from('order_items')
      .update({ shipping_status: approvedStatus })
      .eq('item_id', refund.item_id);

    if (shippingStatusError) throw shippingStatusError;

    await logOrderItemStatusHistory(refund.item_id, approvedStatus);
    if (isCancel) {
      await restoreOrderBenefitsForItem(orderItem.order_id);
    }
  } catch (err) {
    if (pgCancelExecuted) {
      // PG 결제 취소는 이미 성공했으므로 되돌릴 수 없다 — 상태를 롤백하면
      // 재승인 클릭 시 동일 payment_key로 취소가 재요청되어 이중 환불 위험이 생긴다.
      // 따라서 상태는 그대로 두고 수동 확인이 필요함을 알린다.
      console.error(
        `[approveRefund] PG 결제 취소는 성공했지만 후속 DB 반영에 실패했습니다. refundId=${refundId}, itemId=${refund.item_id}. 수동 확인이 필요합니다.`,
        err
      );
      throw new Error(
        '결제 취소는 완료되었으나 후속 처리 중 오류가 발생했습니다. 다시 승인하지 말고 관리자에게 문의해 주세요.'
      );
    }

    await supabaseAdmin
      .from('refund_requests')
      .update({ status: originalStatus, processed_at: null })
      .eq('refund_id', refundId);

    await supabaseAdmin
      .from('order_items')
      .update({ shipping_status: originalShippingStatus })
      .eq('item_id', refund.item_id);

    throw err;
  }

  return { status: approvedStatus };
}

export async function updateReturnTracking(
  sellerId: number,
  refundId: number,
  input: { courier: string; trackingNumber: string }
) {
  const { data: refund, error: refundError } = await supabaseAdmin
    .from('refund_requests')
    .select('status, order_items(seller_id)')
    .eq('refund_id', refundId)
    .maybeSingle();

  if (refundError) throw refundError;
  if (!refund) {
    throw new Error('환불 요청을 찾을 수 없습니다.');
  }

  const orderItem = refund.order_items as unknown as { seller_id: number };
  if (orderItem.seller_id !== sellerId) {
    throw new Error('환불 요청을 찾을 수 없습니다.');
  }
  if (refund.status !== '환불진행중' && refund.status !== '환불') {
    throw new Error('환불진행중 또는 환불완료 상태에서만 반송 운송장을 입력할 수 있습니다.');
  }

  const { error: updateError } = await supabaseAdmin
    .from('refund_requests')
    .update({
      return_courier: input.courier,
      return_tracking_number: input.trackingNumber,
    })
    .eq('refund_id', refundId);

  if (updateError) throw updateError;

  return { returnCourier: input.courier, returnTrackingNumber: input.trackingNumber };
}

async function syncOrderStatusIfFullyClosed(orderId: string): Promise<boolean> {
  const { data: items, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('shipping_status')
    .eq('order_id', orderId);

  if (itemsError) throw itemsError;
  if (!items || items.length === 0) return false;

  const allCancelled = items.every((i) => i.shipping_status === '취소');
  const allClosed = items.every(
    (i) => i.shipping_status === '취소' || i.shipping_status === '환불'
  );

  if (allCancelled) {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status: '취소' })
      .eq('order_id', orderId);
    if (error) throw error;
  } else if (allClosed) {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status: '환불' })
      .eq('order_id', orderId);
    if (error) throw error;
  }

  return allClosed;
}

async function restoreOrderBenefitsForItem(orderId: string) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('used_point, refunded_point, user_coupon_id, user_id')
    .eq('order_id', orderId)
    .single();

  if (orderError) throw orderError;

  const CLOSED_STATUSES = ['취소', '환불'];

  // 주문 전체(멀티셀러 포함)에서, 아직 살아있는(취소/환불 안 된) 상품들의 "쿠폰 반영 후" 금액 합
  const { data: allItems, error: allItemsError } = await supabaseAdmin
    .from('order_items')
    .select('quantity, unit_price, shipping_status, allocated_coupon_discount')
    .eq('order_id', orderId);

  if (allItemsError) throw allItemsError;

  const remainingBase = (allItems ?? [])
    .filter((i) => !CLOSED_STATUSES.includes(i.shipping_status ?? ''))
    .reduce((sum, i) => sum + i.quantity * i.unit_price - (i.allocated_coupon_discount ?? 0), 0);

  const usedPoint = order.used_point ?? 0;
  const effectivePoints = Math.min(usedPoint, Math.max(0, remainingBase));
  const targetTotalRefund = usedPoint - effectivePoints;
  const incrementalRefund = targetTotalRefund - (order.refunded_point ?? 0);

  if (incrementalRefund > 0) {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('point')
      .eq('user_id', order.user_id)
      .single();
    if (userError) throw userError;

    const { error: pointUpdateError } = await supabaseAdmin
      .from('users')
      .update({ point: (user.point ?? 0) + incrementalRefund })
      .eq('user_id', order.user_id);
    if (pointUpdateError) throw pointUpdateError;

    const { error: historyError } = await supabaseAdmin.from('point_history').insert({
      user_id: order.user_id,
      type: '적립',
      amount: incrementalRefund,
      description: `주문 ${orderId} 취소/환불에 따른 포인트 환급`,
    });
    if (historyError) throw historyError;

    const { error: orderUpdateError } = await supabaseAdmin
      .from('orders')
      .update({ refunded_point: targetTotalRefund })
      .eq('order_id', orderId);
    if (orderUpdateError) throw orderUpdateError;
  }

  const allClosed = await syncOrderStatusIfFullyClosed(orderId);

  if (allClosed && order.user_coupon_id) {
    const { error: couponRestoreError } = await supabaseAdmin
      .from('user_coupons')
      .update({ used_at: null })
      .eq('id', order.user_coupon_id);
    if (couponRestoreError) throw couponRestoreError;
  }
}

export async function rejectRefund(sellerId: number, refundId: number, reason: string) {
  const { data: refund, error: refundError } = await supabaseAdmin
    .from('refund_requests')
    .select('status, item_id, order_items(seller_id)')
    .eq('refund_id', refundId)
    .maybeSingle();

  if (refundError) throw refundError;
  if (!refund) {
    throw new Error('환불 요청을 찾을 수 없습니다.');
  }

  const orderItem = refund.order_items as unknown as { seller_id: number };
  if (orderItem.seller_id !== sellerId) {
    throw new Error('환불 요청을 찾을 수 없습니다.');
  }
  if (refund.status !== '환불요청' && refund.status !== '취소요청') {
    throw new Error('처리 대기 중인 요청이 아닙니다.');
  }

  const rejectedStatus = refund.status === '취소요청' ? '취소거부' : '환불거부';
  const { error: updateError } = await supabaseAdmin
    .from('refund_requests')
    .update({
      status: rejectedStatus,
      reject_reason: reason,
      processed_at: new Date().toISOString(),
    })
    .eq('refund_id', refundId);

  if (updateError) throw updateError;

  await logOrderItemStatusHistory(refund.item_id, rejectedStatus, reason);

  return { status: rejectedStatus };
}

export async function processRefund(sellerId: number, refundId: number) {
  const { data: refund, error: refundError } = await supabaseAdmin
    .from('refund_requests')
    .select(
      'status, item_id, fault_type, shipping_fee_charged, order_items!inner(seller_id, order_id, unit_price, quantity, allocated_coupon_discount, orders!inner(payment_method, payment_key))'
    )
    .eq('refund_id', refundId)
    .maybeSingle();

  if (refundError) throw refundError;
  if (!refund) {
    throw new Error('환불 요청을 찾을 수 없습니다.');
  }

  const orderItem = refund.order_items as unknown as {
    seller_id: number;
    order_id: string;
    unit_price: number;
    quantity: number;
    allocated_coupon_discount: number | null;
    orders: { payment_method: string; payment_key: string | null };
  };
  if (orderItem.seller_id !== sellerId) {
    throw new Error('환불 요청을 찾을 수 없습니다.');
  }
  if (refund.status !== '환불진행중') {
    throw new Error('환불 처리 대상이 아닙니다.');
  }

  const { data: currentItem, error: currentItemError } = await supabaseAdmin
    .from('order_items')
    .select('shipping_status')
    .eq('item_id', refund.item_id)
    .single();

  if (currentItemError) throw currentItemError;
  const originalShippingStatus = currentItem.shipping_status;

  if (originalShippingStatus === '취소' || originalShippingStatus === '환불') {
    throw new Error('이미 취소/환불 처리된 주문 상품입니다.');
  }

  const processedAt = new Date().toISOString();
  const faultType = refund.fault_type as '구매자귀책' | '판매자귀책' | null;
  const shippingFeeCharged = refund.shipping_fee_charged ?? 0;

  const { payment_method, payment_key } = orderItem.orders;
  let pgCancelExecuted = false;
  if (payment_key) {
    let cancelAmount =
      orderItem.unit_price * orderItem.quantity - (orderItem.allocated_coupon_discount ?? 0);
    if (shippingFeeCharged > 0 && faultType === '구매자귀책') {
      cancelAmount = Math.max(0, cancelAmount - shippingFeeCharged);
    }
    await cancelPayment(payment_method, payment_key, Math.max(0, cancelAmount));
    pgCancelExecuted = true;
  }

  try {
    const { error: updateError } = await supabaseAdmin
      .from('refund_requests')
      .update({ status: '환불', processed_at: processedAt })
      .eq('refund_id', refundId);

    if (updateError) throw updateError;

    const { error: shippingStatusError } = await supabaseAdmin
      .from('order_items')
      .update({ shipping_status: '환불' })
      .eq('item_id', refund.item_id);

    if (shippingStatusError) throw shippingStatusError;

    await logOrderItemStatusHistory(refund.item_id, '환불');
    await restoreOrderBenefitsForItem(orderItem.order_id);
  } catch (err) {
    if (pgCancelExecuted) {
      console.error(
        `[processRefund] PG 결제 취소는 성공했지만 후속 DB 반영에 실패했습니다. refundId=${refundId}, itemId=${refund.item_id}. 수동 확인이 필요합니다.`,
        err
      );
      throw new Error(
        '결제 취소는 완료되었으나 후속 처리 중 오류가 발생했습니다. 다시 처리하지 말고 관리자에게 문의해 주세요.'
      );
    }

    await supabaseAdmin
      .from('refund_requests')
      .update({ status: '환불진행중', processed_at: null })
      .eq('refund_id', refundId);

    await supabaseAdmin
      .from('order_items')
      .update({ shipping_status: originalShippingStatus })
      .eq('item_id', refund.item_id);

    throw err;
  }

  return { status: '환불' };
}

export async function getOrderRefundDetail(sellerId: number, orderId: string) {
  const { data: refunds, error: refundsError } = await supabaseAdmin
    .from('refund_requests')
    .select(
      `refund_id, item_id, status, request_reason, request_detail, reject_reason, requested_at, processed_at,
    return_courier, return_tracking_number, fault_type, shipping_fee_charged,
    order_items!inner(order_id, quantity, unit_price, original_unit_price, allocated_coupon_discount, allocated_point, seller_id, products(name, image))`
    )
    .eq('order_items.seller_id', sellerId)
    .eq('order_items.order_id', orderId)
    .order('requested_at', { ascending: false });

  if (refundsError) throw refundsError;
  if (!refunds || refunds.length === 0) return null;

  const latestByItem = new Map<number, (typeof refunds)[number]>();
  for (const r of refunds) {
    if (!latestByItem.has(r.item_id)) {
      latestByItem.set(r.item_id, r);
    }
  }
  const claims = [...latestByItem.values()];

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('order_id, created_at, status, recipient, phone, users(nickname)')
    .eq('order_id', orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) return null;

  const user = order.users as unknown as { nickname: string } | null;

  return {
    id: order.order_id,
    orderDate: order.created_at,
    orderStatus: order.status,
    customer: user?.nickname ?? '알 수 없음',
    recipient: order.recipient ?? '',
    phone: order.phone ?? '',
    refundItems: claims.map((r) => {
      const orderItem = r.order_items as unknown as {
        quantity: number;
        unit_price: number;
        original_unit_price: number;
        allocated_coupon_discount: number | null;
        allocated_point: number | null;
        products: { name: string; image: string | null } | null;
      };

      const productDiscount =
        (orderItem.original_unit_price - orderItem.unit_price) * orderItem.quantity;
      const couponDiscount = orderItem.allocated_coupon_discount ?? 0;
      const allocatedPoint = orderItem.allocated_point ?? 0;
      const refundAmount = orderItem.quantity * orderItem.unit_price - couponDiscount;

      return {
        itemId: r.item_id,
        refundId: r.refund_id,
        productName: orderItem.products?.name ?? '알 수 없음',
        img: orderItem.products?.image ?? null,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unit_price,
        originalUnitPrice: orderItem.original_unit_price,
        productDiscount,
        couponDiscount,
        allocatedPoint,
        refundAmount,
        faultType: r.fault_type,
        shippingFeeCharged: r.shipping_fee_charged ?? 0,
        itemStatus: r.status,
        refundRequestReason: r.request_reason,
        refundRequestDetail: r.request_detail,
        refundRejectReason: r.reject_reason,
        requestedAt: r.requested_at,
        processedAt: r.processed_at,
        returnCourier: r.return_courier,
        returnTrackingNumber: r.return_tracking_number,
      };
    }),
  };
}

async function recalcShippingFeeForOrder(
  orderId: string,
  sellerId: number,
  excludeItemId: number
): Promise<number> {
  const { data: remainingItems, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('quantity, unit_price, shipping_status')
    .eq('order_id', orderId)
    .eq('seller_id', sellerId)
    .neq('item_id', excludeItemId);

  if (itemsError) throw itemsError;

  const remainingTotal = (remainingItems ?? [])
    .filter((i) => i.shipping_status !== '취소' && i.shipping_status !== '환불')
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const { data: shippingRows, error: shippingError } = await supabaseAdmin
    .from('shippings')
    .select('shipping_id, shipping_fee')
    .eq('order_id', orderId)
    .eq('seller_id', sellerId);

  if (shippingError) throw shippingError;
  if (!shippingRows || shippingRows.length === 0) return 0;

  const currentFee = shippingRows[0].shipping_fee ?? 0;
  const shouldChargeNow =
    currentFee === 0 && remainingTotal > 0 && remainingTotal < FREE_SHIPPING_THRESHOLD;

  if (!shouldChargeNow) return 0;

  const { error: updateError } = await supabaseAdmin
    .from('shippings')
    .update({ shipping_fee: SHIPPING_FEE })
    .eq('order_id', orderId)
    .eq('seller_id', sellerId);

  if (updateError) throw updateError;

  return SHIPPING_FEE;
}
