import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logOrderItemStatusHistory } from '@/lib/orderItemStatusHistory';

const SHIPPING_STATUS_TRANSITIONS: Record<string, string[]> = {
  결제완료: ['배송준비'],
  배송준비: ['배송중'],
  배송중: ['배송완료'],
  배송완료: [],
  취소: [],
  환불: [],
};
const STAGE_ORDER = ['결제완료', '배송준비', '배송중', '배송완료'];

function computeOrderStatus(itemStatuses: string[]): string {
  for (const stage of STAGE_ORDER) {
    if (itemStatuses.includes(stage)) {
      return stage;
    }
  }
  return itemStatuses[0] ?? '결제완료';
}

export async function getSellerShippingOrders(
  sellerId: number,
  options: {
    page: number;
    limit: number;
    keyword?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const { page, limit, keyword, status, startDate, endDate } = options;
  const rangeFrom = (page - 1) * limit;
  const rangeTo = rangeFrom + limit - 1;

  // Keyword spans multiple tables — pre-fetch matching order IDs
  let keywordOrderIds: string[] | null = null;
  if (keyword) {
    const { data: orderRows } = await supabaseAdmin
      .from('orders')
      .select('order_id')
      .or(`order_id.ilike.%${keyword}%,recipient.ilike.%${keyword}%,phone.ilike.%${keyword}%`);

    keywordOrderIds = (orderRows ?? []).map((o) => o.order_id);
    if (keywordOrderIds.length === 0) {
      return { orders: [], total: 0 };
    }
  }

  let query = supabaseAdmin
    .from('order_items')
    .select(
      `item_id, order_id, quantity, unit_price, shipping_status,
       products(name),
       orders!inner(created_at, recipient, phone, address, address_detail, shipping_request, final_amount, users(nickname))`,
      { count: 'exact' }
    )
    .eq('seller_id', sellerId);

  if (status && status !== '전체') {
    query = query.eq('shipping_status', status);
  } else {
    query = query.in('shipping_status', ['결제완료', '배송준비', '배송중', '배송완료']);
  }

  if (startDate) query = query.gte('orders.created_at', `${startDate}T00:00:00`);
  if (endDate) query = query.lte('orders.created_at', `${endDate}T23:59:59`);
  if (keywordOrderIds !== null) query = query.in('order_id', keywordOrderIds);

  query = query.order('created_at', { referencedTable: 'orders', ascending: false });
  query = query.range(rangeFrom, rangeTo);

  const { data, count, error } = await query;
  if (error) throw error;

  // Fetch shippings only for this page's items
  const itemIds = (data ?? []).map((row) => row.item_id);
  const shippingByItemId = new Map<
    number,
    {
      carrier: string;
      tracking_number: string;
      shipped_at: string | null;
      delivered_at: string | null;
    }
  >();

  if (itemIds.length > 0) {
    const { data: shippings, error: shippingsError } = await supabaseAdmin
      .from('shippings')
      .select('item_id, carrier, tracking_number, shipped_at, delivered_at')
      .eq('seller_id', sellerId)
      .in('item_id', itemIds);

    if (shippingsError) throw shippingsError;

    for (const s of shippings ?? []) {
      shippingByItemId.set(s.item_id, s);
    }
  }

  const orders = (data ?? []).map((item) => {
    const order = item.orders as unknown as {
      created_at: string;
      recipient: string;
      phone: string;
      address: string;
      address_detail: string;
      shipping_request: string;
      final_amount: number;
      users: { nickname: string } | null;
    };
    const product = item.products as unknown as { name: string } | null;
    const shipping = shippingByItemId.get(item.item_id);

    return {
      orderId: item.order_id,
      orderDate: order.created_at,
      customer: order.users?.nickname ?? '알 수 없음',
      recipient: order.recipient,
      phone: order.phone,
      address: order.address,
      addressDetail: order.address_detail,
      shippingRequest: order.shipping_request,
      itemId: item.item_id,
      productName: product?.name ?? '알 수 없음',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      finalAmount: order.final_amount,
      status: item.shipping_status,
      courier: shipping?.carrier ?? '',
      trackingNumber: shipping?.tracking_number ?? '',
      shippedAt: shipping?.shipped_at ?? null,
      deliveredAt: shipping?.delivered_at ?? null,
    };
  });

  return { orders, total: count ?? 0 };
}

export async function getSellerShippingOrderCounts(
  sellerId: number,
  options?: { startDate?: string; endDate?: string }
) {
  const { startDate, endDate } = options ?? {};

  const { data: sellerItems, error: sellerItemsError } = await supabaseAdmin
    .from('order_items')
    .select('item_id, order_id, shipping_status')
    .eq('seller_id', sellerId)
    .in('shipping_status', ['결제완료', '배송준비', '배송중', '배송완료']);

  if (sellerItemsError) throw sellerItemsError;

  const emptyCounts = { 결제완료: 0, 배송준비: 0, 배송중: 0, 배송완료: 0 };

  if (!sellerItems || sellerItems.length === 0) {
    return emptyCounts;
  }

  const orderIds = [...new Set(sellerItems.map((i) => i.order_id))];

  let orderQuery = supabaseAdmin.from('orders').select('order_id').in('order_id', orderIds);

  if (startDate) orderQuery = orderQuery.gte('created_at', `${startDate}T00:00:00`);
  if (endDate) orderQuery = orderQuery.lte('created_at', `${endDate}T23:59:59`);

  const { data: orders, error: ordersError } = await orderQuery;
  if (ordersError) throw ordersError;

  const inScopeOrderIds = new Set((orders ?? []).map((o) => o.order_id));

  const statusesByOrder = new Map<string, Set<string>>();
  for (const item of sellerItems) {
    if (!inScopeOrderIds.has(item.order_id)) continue;
    if (!statusesByOrder.has(item.order_id)) {
      statusesByOrder.set(item.order_id, new Set());
    }
    statusesByOrder.get(item.order_id)!.add(item.shipping_status);
  }

  const counts = { ...emptyCounts };
  for (const statuses of statusesByOrder.values()) {
    for (const status of statuses) {
      if (status in counts) {
        counts[status as keyof typeof counts] += 1;
      }
    }
  }

  return counts;
}

async function syncOrderStatus(orderId: string) {
  const { data: items, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('shipping_status')
    .eq('order_id', orderId)
    .not('shipping_status', 'is', null);

  if (itemsError) throw itemsError;

  const statuses = (items ?? []).map((i) => i.shipping_status);
  if (statuses.length === 0) return;

  const computedStatus = computeOrderStatus(statuses);

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: computedStatus })
    .eq('order_id', orderId);

  if (updateError) throw updateError;
}

async function getOwnedItemStatus(sellerId: number, itemId: number) {
  const { data: item, error: itemError } = await supabaseAdmin
    .from('order_items')
    .select('shipping_status, order_id')
    .eq('item_id', itemId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!item) {
    throw new Error('상품을 찾을 수 없습니다.');
  }

  return item;
}

export async function updateShippingStatus(sellerId: number, itemId: number, newStatus: string) {
  const { shipping_status: currentStatus, order_id: orderId } = await getOwnedItemStatus(
    sellerId,
    itemId
  );

  const allowedNextStatuses = SHIPPING_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (!allowedNextStatuses.includes(newStatus)) {
    throw new Error(`'${currentStatus}' 상태에서는 '${newStatus}'로 변경할 수 없습니다.`);
  }

  const { error: updateError } = await supabaseAdmin
    .from('order_items')
    .update({ shipping_status: newStatus })
    .eq('item_id', itemId);

  if (updateError) throw updateError;

  try {
    await logOrderItemStatusHistory(itemId, newStatus);
  } catch (err) {
    console.error('order_item_status_history insert 실패', { itemId, newStatus, err });
  }

  if (newStatus === '배송완료') {
    const { error: deliveredAtError } = await supabaseAdmin
      .from('shippings')
      .update({ delivered_at: new Date().toISOString() })
      .eq('item_id', itemId)
      .eq('seller_id', sellerId);

    if (deliveredAtError) throw deliveredAtError;
  }

  await syncOrderStatus(orderId);

  return { status: newStatus, orderId };
}

export async function updateShippingTracking(
  sellerId: number,
  itemId: number,
  input: { courier: string; trackingNumber: string }
) {
  const { courier, trackingNumber } = input;

  const { shipping_status: currentStatus, order_id: orderId } = await getOwnedItemStatus(
    sellerId,
    itemId
  );

  if (currentStatus !== '배송준비' && currentStatus !== '배송중' && currentStatus !== '배송완료') {
    throw new Error(`'${currentStatus}' 상태에서는 운송장 정보를 입력할 수 없습니다.`);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('shippings')
    .select('shipping_id')
    .eq('item_id', itemId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (existingError) throw existingError;

  // 배송중/배송완료 건은 이미 등록된 운송장 정보를 정정하는 것 — 발송일/배송상태는 건드리지 않는다
  if (currentStatus !== '배송준비') {
    if (!existing) throw new Error('등록된 운송장 정보가 없습니다.');

    const { error: correctionError } = await supabaseAdmin
      .from('shippings')
      .update({ carrier: courier, tracking_number: trackingNumber })
      .eq('shipping_id', existing.shipping_id);

    if (correctionError) throw correctionError;

    return { newStatus: currentStatus };
  }

  const shippingPayload = {
    carrier: courier,
    tracking_number: trackingNumber,
    shipped_at: new Date().toISOString(),
  };

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from('shippings')
      .update(shippingPayload)
      .eq('shipping_id', existing.shipping_id);

    if (updateError) throw updateError;
  } else {
    const { data: orderItem, error: orderItemError } = await supabaseAdmin
      .from('order_items')
      .select('order_id')
      .eq('item_id', itemId)
      .single();

    if (orderItemError) throw orderItemError;

    const { error: insertError } = await supabaseAdmin.from('shippings').insert({
      order_id: orderItem.order_id,
      seller_id: sellerId,
      item_id: itemId,
      ...shippingPayload,
    });

    if (insertError) throw insertError;
  }

  const { error: statusUpdateError } = await supabaseAdmin
    .from('order_items')
    .update({ shipping_status: '배송중' })
    .eq('item_id', itemId);

  if (statusUpdateError) throw statusUpdateError;

  try {
    await logOrderItemStatusHistory(itemId, '배송중');
  } catch (err) {
    console.error('order_item_status_history insert 실패', { itemId, newStatus: '배송중', err });
  }

  await syncOrderStatus(orderId);

  return { newStatus: '배송중' };
}

export async function bulkUpdateShippingStatus(
  sellerId: number,
  itemIds: number[],
  newStatus: string
) {
  const results: { itemId: number; success: boolean; error?: string }[] = [];
  const affectedOrderIds = new Set<string>();

  for (const itemId of itemIds) {
    try {
      const { orderId } = await updateShippingStatus(sellerId, itemId, newStatus);
      affectedOrderIds.add(orderId);
      results.push({ itemId, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '상태 변경에 실패했습니다.';
      results.push({ itemId, success: false, error: message });
    }
  }

  for (const orderId of affectedOrderIds) {
    await syncOrderStatus(orderId);
  }

  return results;
}

export async function bulkUpdateShippingTracking(
  sellerId: number,
  updates: { orderId: string; courier: string; trackingNumber: string }[]
) {
  const dedupedUpdates = Array.from(new Map(updates.map((u) => [u.orderId, u])).values());

  const trackingNumbers = dedupedUpdates.map((u) => u.trackingNumber);

  const { data: existingShippings, error: existingError } = await supabaseAdmin
    .from('shippings')
    .select('order_id, tracking_number')
    .eq('seller_id', sellerId)
    .in('tracking_number', trackingNumbers);

  if (existingError) throw existingError;

  const results: { orderId: string; success: boolean; error?: string }[] = [];
  const validUpdates: typeof dedupedUpdates = [];

  for (const update of dedupedUpdates) {
    const conflict = (existingShippings ?? []).find(
      (s) => s.tracking_number === update.trackingNumber && s.order_id !== update.orderId
    );

    if (conflict) {
      results.push({
        orderId: update.orderId,
        success: false,
        error: `운송장번호가 이미 다른 주문(${conflict.order_id})에 등록되어 있습니다.`,
      });
    } else {
      validUpdates.push(update);
    }
  }

  for (const { orderId, courier, trackingNumber } of validUpdates) {
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('item_id, shipping_status')
      .eq('order_id', orderId)
      .eq('seller_id', sellerId);

    if (itemsError || !items || items.length === 0) {
      results.push({ orderId, success: false, error: '주문을 찾을 수 없거나 권한이 없습니다.' });
      continue;
    }

    const notPreparing = items.some((i) => i.shipping_status !== '배송준비');
    if (notPreparing) {
      results.push({ orderId, success: false, error: '배송준비 상태가 아닌 상품이 있습니다.' });
      continue;
    }

    const shippedAt = new Date().toISOString();

    for (const item of items) {
      const { data: existing } = await supabaseAdmin
        .from('shippings')
        .select('shipping_id')
        .eq('item_id', item.item_id)
        .eq('seller_id', sellerId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from('shippings')
          .update({ carrier: courier, tracking_number: trackingNumber, shipped_at: shippedAt })
          .eq('shipping_id', existing.shipping_id);
      } else {
        await supabaseAdmin.from('shippings').insert({
          order_id: orderId,
          seller_id: sellerId,
          item_id: item.item_id,
          carrier: courier,
          tracking_number: trackingNumber,
          shipped_at: shippedAt,
        });
      }

      await supabaseAdmin
        .from('order_items')
        .update({ shipping_status: '배송중' })
        .eq('item_id', item.item_id);

      try {
        await logOrderItemStatusHistory(item.item_id, '배송중');
      } catch (err) {
        console.error('order_item_status_history insert 실패', {
          itemId: item.item_id,
          newStatus: '배송중',
          err,
        });
      }
    }

    await syncOrderStatus(orderId);

    results.push({ orderId, success: true });
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;
  const failures = results.filter((r) => !r.success);

  return { results, successCount, failCount, failures };
}
