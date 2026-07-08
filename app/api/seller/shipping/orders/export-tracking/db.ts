import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function getSellerShippingOrdersForTrackingExport(sellerId: number) {
  // 주문 전체 공유 상태(orders.status)가 아니라 내 상품 자체 상태(shipping_status) 기준으로 조회
  // (멀티셀러 주문에서 다른 판매자 상품이 아직 배송준비가 아니어도 내 상품은 포함되어야 함)
  const { data: items, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('item_id, order_id, quantity, products(name)')
    .eq('seller_id', sellerId)
    .eq('shipping_status', '배송준비');

  if (itemsError) throw itemsError;
  if (!items || items.length === 0) {
    return [];
  }

  const orderIds = [...new Set(items.map((i) => i.order_id))];

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('order_id, recipient')
    .in('order_id', orderIds);

  if (ordersError) throw ordersError;

  return items.map((item) => {
    const order = (orders ?? []).find((o) => o.order_id === item.order_id);
    const product = item.products as unknown as { name: string } | null;

    return {
      orderId: item.order_id,
      recipient: order?.recipient ?? '',
      productName: product?.name ?? '알 수 없음',
      quantity: item.quantity,
      courier: '',
      trackingNumber: '',
    };
  });
}
