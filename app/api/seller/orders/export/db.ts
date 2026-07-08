import { supabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_EXPORT_BATCH_SIZE = 1000;

export async function getSellerOrdersForExport(
  sellerId: number,
  options: {
    offset: number;
    limit: number;
    itemIds?: string[];
    status?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }
) {
  const { offset, status, startDate, endDate, keyword } = options;
  const limit = Math.min(options.limit, MAX_EXPORT_BATCH_SIZE);

  const { data: sellerItemRows, error: sellerItemsError } = await supabaseAdmin
    .from('order_items')
    .select('item_id, order_id')
    .eq('seller_id', sellerId);

  if (sellerItemsError) throw sellerItemsError;

  const sellerItemIdSet = new Set((sellerItemRows ?? []).map((r) => r.item_id));
  const sellerOrderIds = [...new Set((sellerItemRows ?? []).map((r) => r.order_id))];

  if (sellerOrderIds.length === 0) {
    return { orders: [], total: 0 };
  }

  let userMatchedIds: number[] = [];
  if (keyword) {
    const { data: userRows, error: userError } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .ilike('nickname', `%${keyword}%`);
    if (userError) throw userError;
    userMatchedIds = (userRows ?? []).map((u) => u.user_id);
  }

  let orderQuery = supabaseAdmin
    .from('orders')
    .select('order_id')
    .in('order_id', sellerOrderIds)
    .neq('status', '결제전');

  if (keyword) {
    const orConditions = [
      `order_id.ilike.%${keyword}%`,
      `recipient.ilike.%${keyword}%`,
      `phone.ilike.%${keyword}%`,
    ];
    if (userMatchedIds.length > 0) {
      orConditions.push(`user_id.in.(${userMatchedIds.join(',')})`);
    }
    orderQuery = orderQuery.or(orConditions.join(','));
  }

  if (startDate) orderQuery = orderQuery.gte('created_at', `${startDate}T00:00:00`);
  if (endDate) orderQuery = orderQuery.lte('created_at', `${endDate}T23:59:59`);

  const { data: matchedOrderRows, error: matchedOrderError } = await orderQuery;
  if (matchedOrderError) throw matchedOrderError;

  const matchedOrderIds = (matchedOrderRows ?? []).map((o) => o.order_id);
  if (matchedOrderIds.length === 0) {
    return { orders: [], total: 0 };
  }

  let itemQuery = supabaseAdmin
    .from('order_items')
    .select('item_id, order_id, quantity, unit_price, shipping_status, products(name)', {
      count: 'exact',
    })
    .eq('seller_id', sellerId)
    .in('order_id', matchedOrderIds);

  if (status && status !== '전체') {
    itemQuery =
      status === '취소환불'
        ? itemQuery.in('shipping_status', ['취소', '환불'])
        : itemQuery.eq('shipping_status', status);
  }

  if (options.itemIds) {
    const targetItemIds = options.itemIds.map(Number).filter((id) => sellerItemIdSet.has(id));
    if (targetItemIds.length === 0) {
      return { orders: [], total: 0 };
    }
    itemQuery = itemQuery.in('item_id', targetItemIds);
  }

  const {
    data: items,
    count,
    error: itemsError,
  } = await itemQuery.order('order_id', { ascending: true }).range(offset, offset + limit - 1);

  if (itemsError) throw itemsError;

  const batchOrderIds = [...new Set((items ?? []).map((i) => i.order_id))];

  const { data: orderDetails, error: orderDetailsError } = await supabaseAdmin
    .from('orders')
    .select(
      'order_id, created_at, status, recipient, phone, address, address_detail, shipping_request, total_amount, shipping_fee, coupon_discount, used_point, final_amount, payment_method, users(nickname)'
    )
    .in('order_id', batchOrderIds);

  if (orderDetailsError) throw orderDetailsError;

  const rows = (items ?? []).map((item) => {
    const order = (orderDetails ?? []).find((o) => o.order_id === item.order_id);
    const product = item.products as unknown as { name: string } | null;
    const user = order?.users as unknown as { nickname: string } | null;

    return {
      id: item.order_id,
      orderDate: order?.created_at ?? '',
      customer: user?.nickname ?? '알 수 없음',
      recipient: order?.recipient ?? '',
      phone: order?.phone ?? '',
      address: order?.address ?? '',
      addressDetail: order?.address_detail ?? '',
      shippingRequest: order?.shipping_request ?? '',
      productName: product?.name ?? '알 수 없음',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: order?.total_amount ?? 0,
      shippingFee: order?.shipping_fee ?? 0,
      couponDiscount: order?.coupon_discount ?? 0,
      pointAmount: order?.used_point ?? 0,
      finalAmount: order?.final_amount ?? 0,
      paymentMethod: order?.payment_method,
      status: item.shipping_status,
    };
  });

  return { orders: rows, total: count ?? 0 };
}
