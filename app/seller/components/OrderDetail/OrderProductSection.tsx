'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderProductSectionProps } from '@/types/seller/order';
import { ShoppingBag, RotateCcw } from 'lucide-react';
import { formatWon } from '@/lib/format';
import StatusBadge from '../StatusBadge';

const CLAIM_STATUSES = ['환불요청', '환불진행중', '환불', '취소요청', '취소'];

export default function OrderProductSection({ products, refundTotal }: OrderProductSectionProps) {
  const refundingProducts = products.filter(
    (p) => p.itemStatus !== null && CLAIM_STATUSES.includes(p.itemStatus)
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4 text-gray-400" />
          상품 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <div className="overflow-x-auto whitespace-nowrap">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-200">
              <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-56">
                상품명
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-24">
                수량
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-32">
                상품금액
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-28">
                상품할인
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-28">
                쿠폰할인
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-32">
                결제금액
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-28">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isRefunding = p.itemStatus !== null && CLAIM_STATUSES.includes(p.itemStatus);

              return (
                <tr
                  key={p.id}
                  className={`border-b border-gray-100 last:border-b-0 ${
                    isRefunding ? 'bg-amber-50' : ''
                  }`}
                >
                  <td className="px-5 py-4 max-w-0 w-56">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                        <Image src={p.img} alt={p.itemName} fill className="object-cover" />
                      </div>
                      <span
                        className={`text-sm font-medium truncate ${
                          isRefunding ? 'text-gray-400 line-through' : 'text-gray-800'
                        }`}
                      >
                        {p.itemName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-gray-600">{p.quantity}개</td>
                  <td className="px-5 py-4 text-center text-sm text-gray-600">
                    {formatWon(p.originalUnitPrice * p.quantity)}
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-gray-600">
                    {p.productDiscount > 0 ? (
                      <span className="text-red-500">- {formatWon(p.productDiscount)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-gray-600">
                    {p.couponDiscount > 0 ? (
                      <span className="text-red-500">- {formatWon(p.couponDiscount)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center text-sm font-bold text-gray-900">
                    {formatWon(p.itemTotalPrice)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {p.itemStatus ? (
                      <StatusBadge status={p.itemStatus} />
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {refundingProducts.length > 0 && (
          <div className="m-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 mb-3">
              <RotateCcw className="w-4 h-4" />
              환불 정보
            </div>
            <div className="flex flex-col gap-2">
              {refundingProducts.map((p) => (
                <div key={p.id} className="text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>{p.itemName}</span>
                    <span>{formatWon(p.itemTotalPrice)}</span>
                  </div>
                  {p.refundRequestReason && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      요청 사유: {p.refundRequestReason}
                    </p>
                  )}
                  {p.refundRejectReason && (
                    <p className="text-xs text-red-500 mt-0.5">거부 사유: {p.refundRejectReason}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-amber-200 mt-3 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-amber-800">환불 대상 금액</span>
              <span className="text-base font-bold text-amber-800">
                {formatWon(refundTotal)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
