import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { SellerOrderRpcRow } from '@/types/seller/order';

export async function getSellerOrders(
  sellerId: number,
  options: {
    page: number;
    limit: number;
    keyword?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) {
  const { page, limit, keyword, status, startDate, endDate, sortBy, sortOrder = 'desc' } = options;
  const offset = (page - 1) * limit;

  let keywordOrderIds: string[] | null = null;
  if (keyword) {
    const { data: userRows } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .ilike('nickname', `%${keyword}%`);
    const matchedUserIds = (userRows ?? []).map((u) => u.user_id);

    const orParts = [
      `order_id.ilike.%${keyword}%`,
      `recipient.ilike.%${keyword}%`,
      `phone.ilike.%${keyword}%`,
    ];
    if (matchedUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchedUserIds.join(',')})`);
    }

    const { data: orderRows } = await supabaseAdmin
      .from('orders')
      .select('order_id')
      .or(orParts.join(','));

    keywordOrderIds = (orderRows ?? []).map((o) => o.order_id);
    if (keywordOrderIds.length === 0) {
      return { orders: [], total: 0 };
    }
  }

  const { data, error } = await supabaseAdmin.rpc('get_seller_orders', {
    p_seller_id: sellerId,
    p_status: status && status !== '전체' ? status : null,
    p_start_date: startDate ? `${startDate}T00:00:00` : null,
    p_end_date: endDate ? `${endDate}T23:59:59` : null,
    p_order_ids: keywordOrderIds,
    p_sort_by: sortBy ?? 'orderDate',
    p_sort_order: sortOrder,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as SellerOrderRpcRow[];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  const itemIds = rows.map((row) => row.item_id);

  const latestRefundByItem = new Map<number, { status: string; rejectReason: string | null }>();

  if (itemIds.length > 0) {
    const { data: refunds, error: refundsError } = await supabaseAdmin
      .from('refund_requests')
      .select('item_id, status, reject_reason')
      .in('item_id', itemIds)
      .order('requested_at', { ascending: false });

    if (refundsError) throw refundsError;

    for (const r of refunds ?? []) {
      if (!latestRefundByItem.has(r.item_id)) {
        latestRefundByItem.set(r.item_id, { status: r.status, rejectReason: r.reject_reason });
      }
    }
  }

  const orders = rows.map((row) => {
    const refund = latestRefundByItem.get(row.item_id);
    const hasActiveClaim = Boolean(refund && !refund.rejectReason);

    return {
      orderId: row.order_id,
      orderDate: row.order_date,
      customer: row.nickname ?? '알 수 없음',
      recipient: row.recipient,
      phone: row.phone,
      itemId: row.item_id,
      productName: row.product_name ?? '알 수 없음',
      quantity: row.quantity,
      unitPrice: row.unit_price,
      itemTotalPrice: row.quantity * row.unit_price,
      status: row.status,
      hasActiveClaim,
    };
  });

  return { orders, total };
}

export async function getSellerOrderCounts(
  sellerId: number,
  options?: { startDate?: string; endDate?: string }
) {
  const { startDate, endDate } = options ?? {};

  const emptyCounts = {
    전체: 0,
    결제완료: 0,
    배송준비: 0,
    배송중: 0,
    배송완료: 0,
    구매확정: 0,
  };

  // 주문 전체가 아니라 "내 상품"의 상태를 기준으로 집계한다 (멀티셀러 주문에서 다른 셀러 상품 상태에 영향받지 않도록)
  let itemQuery = supabaseAdmin
    .from('order_items')
    .select('shipping_status, orders!inner(status, created_at)')
    .eq('seller_id', sellerId)
    .not('shipping_status', 'is', null)
    .neq('orders.status', '결제전');

  if (startDate) itemQuery = itemQuery.gte('orders.created_at', `${startDate}T00:00:00`);
  if (endDate) itemQuery = itemQuery.lte('orders.created_at', `${endDate}T23:59:59`);

  const { data: items, error: itemsError } = await itemQuery;
  if (itemsError) throw itemsError;

  const counts = { ...emptyCounts };
  counts.전체 = (items ?? []).length;

  for (const item of items ?? []) {
    const status = item.shipping_status as keyof typeof counts;
    if (status in counts) {
      counts[status] += 1;
    }
  }

  return counts;
}
