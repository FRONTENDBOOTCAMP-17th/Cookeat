'use client';

import Image from 'next/image';
import StatusBadge from '@/app/seller/components/StatusBadge';
import { SquarePen, Eye, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Star } from 'lucide-react';
import Link from 'next/link';
import EmptyRows from '@/components/ui/EmptyRows';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { formatWon } from '@/lib/format';
import type { ProductSortBy, ProductStatus, ProductTableProps } from '@/types/seller/product';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ALL_STATUSES: ProductStatus[] = ['판매중', '품절', '판매종료', '숨김'];

export default function ProductTable({
  products,
  isLoading = false,
  pageSize = 10,
  currentPage = 1,
  sortBy,
  sortOrder,
  onSortChange,
  selectedIds,
  isAllSelectedMode,
  onSelect,
  onSelectAll,
  onStatusChanged,
}: ProductTableProps & { currentPage?: number }) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  const [changingId, setChangingId] = useState<number | null>(null);

  const handleStatusChange = async (productId: number, newStatus: ProductStatus) => {
    setChangingId(productId);
    try {
      await api.patch(`/seller/products/${productId}/status`, { status: newStatus });
      toast.success(`상태가 '${newStatus}'로 변경되었습니다.`);
      onStatusChanged?.(); // 부모(page.tsx)에서 목록/카운트 재조회
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상태 변경에 실패했습니다.';
      toast.error(msg, { id: msg });
    } finally {
      setChangingId(null);
    }
  };

  const renderSortIcon = (column: ProductSortBy) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-0.5 text-gray-300" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="inline w-3.5 h-3.5 ml-0.5" />
    ) : (
      <ChevronDown className="inline w-3.5 h-3.5 ml-0.5" />
    );
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`[${name}] \n\n해당 상품을 정말 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/seller/products/${id}`);
      toast.success('상품이 삭제되었습니다.');
      window.location.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상품 삭제에 실패했습니다.';
      toast.error(msg, { id: msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden py-3">
      <div className="overflow-x-auto whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100">
              <TableHead className="text-center w-10">
                <input
                  type="checkbox"
                  checked={
                    isAllSelectedMode ||
                    (selectedIds.length === products.length && products.length > 0)
                  }
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead className="text-center text-sm font-semibold text-gray-600">
                상품
              </TableHead>
              <TableHead className="text-center text-sm font-semibold text-gray-600">
                카테고리
              </TableHead>
              <TableHead
                className="text-center text-sm font-semibold text-gray-600 cursor-pointer select-none"
                onClick={() => onSortChange?.('price')}
              >
                가격{renderSortIcon('price')}
              </TableHead>
              <TableHead
                className="text-center text-sm font-semibold text-gray-600 cursor-pointer select-none"
                onClick={() => onSortChange?.('stock')}
              >
                재고{renderSortIcon('stock')}
              </TableHead>
              <TableHead className="text-center text-sm font-semibold text-gray-600">
                레시피 연동
              </TableHead>
              <TableHead className="text-center text-sm font-semibold text-gray-600">
                리뷰
              </TableHead>
              <TableHead className="text-center text-sm font-semibold text-gray-600">
                상태
              </TableHead>
              <TableHead className="text-center text-sm font-semibold text-gray-600">
                관리
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i} className="border-b border-gray-50">
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
                    </div>
                  </TableCell>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j} className="text-center">
                      <div className="h-4 w-16 rounded bg-gray-100 animate-pulse mx-auto" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                  등록된 상품이 존재하지 않습니다.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {products.map((product) => (
                  <TableRow
                    key={product.productId}
                    className="border-b border-gray-50 last:border-b-0"
                  >
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelectedMode || selectedIds.includes(product.productId)}
                        onChange={(e) => onSelect(product.productId, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 text-center">
                      {product.categories?.name ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-800 text-center">
                      {formatWon(product.price)}
                    </TableCell>
                    <TableCell className="text-sm text-center">
                      <span
                        className={
                          (product.stock ?? 0) === 0 ? 'text-red-500 font-medium' : 'text-gray-800'
                        }
                      >
                        {product.stock ?? 0}개
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 text-center">
                      {product.linkedRecipeCount}개
                    </TableCell>
                    <TableCell className="text-sm text-center">
                      {product.reviewCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {product.rating.toFixed(1)}
                          <span className="text-gray-400">({product.reviewCount})</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          disabled={isAdmin || changingId === product.productId}
                        >
                          <button className="cursor-pointer disabled:cursor-default">
                            <StatusBadge status={product.status ?? '판매중'} />
                          </button>
                        </DropdownMenuTrigger>
                        {!isAdmin && (
                          <DropdownMenuContent align="center">
                            {ALL_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={s === product.status}
                                onClick={() => handleStatusChange(product.productId, s)}
                              >
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        )}
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2 text-gray-400">
                        {!isAdmin && (
                          <Link
                            href={`/seller/products/${product.productId}/edit?page=${currentPage}`}
                          >
                            <SquarePen className="text-dark-text/70" />
                          </Link>
                        )}
                        <button onClick={() => setPreviewId(product.productId)}>
                          <Eye />
                        </button>
                        {!isAdmin && (
                          <button
                            onClick={() => handleDelete(product.productId, product.name)}
                            disabled={deletingId === product.productId}
                          >
                            <Trash2
                              className={
                                deletingId === product.productId ? 'text-gray-300' : 'text-red-400'
                              }
                            />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <EmptyRows count={Math.max(0, pageSize - products.length)} colSpan={9} />
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={previewId !== null} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="max-w-6xl sm:max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden max-mobile:w-full max-mobile:max-w-[calc(100%-2rem)] max-mobile:h-[85vh]">
          {previewId !== null && (
            <iframe
              src={`/seller-preview/${previewId}`}
              className="w-full h-full border-0"
              title="상품 상세 미리보기"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
