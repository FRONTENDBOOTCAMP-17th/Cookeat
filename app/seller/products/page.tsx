'use client';

import * as XLSX from 'xlsx';
import { useRef } from 'react';
import { useExcelExport } from '@/hooks/useExcelExport';
import type { ProductExportRow } from '@/types/seller/product';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, Filter, Plus } from 'lucide-react';
import ProductTable from '@/app/seller/components/ProductTable';
import FilterTabs from '@/app/seller/components/FilterTabs';
import Pagination from '@/components/ui/Pagination';
import StatusCards from '@/components/ui/StatusCards';
import { useSearchParams } from 'next/navigation';
import { getPageNumbers, getTotalPages } from '@/lib/utils';
import type {
  ProductStatus,
  Product,
  CategoryNode,
  ProductSortBy,
  SortOrder,
  ProductCounts,
} from '@/types/seller/product';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

const statuses: (ProductStatus | '전체')[] = ['전체', '판매중', '품절', '판매종료', '숨김'];
const LIMIT = 10;
const EXPORT_COLUMNS = [
  { key: 'name' as const, label: '상품명' },
  { key: 'parentCategoryName' as const, label: '대카테고리' },
  { key: 'categoryName' as const, label: '소카테고리' },
  { key: 'brand' as const, label: '브랜드' },
  { key: 'origin' as const, label: '원산지' },
  { key: 'price' as const, label: '가격' },
  { key: 'stock' as const, label: '재고' },
  { key: 'discountType' as const, label: '할인유형' },
  { key: 'discountValue' as const, label: '할인값' },
  { key: 'status' as const, label: '상태' },
  { key: 'shippingTemplateName' as const, label: '배송템플릿' },
  { key: 'returnPolicyTemplateName' as const, label: '반품정책' },
  { key: 'linkedRecipeCount' as const, label: '연동레시피수' },
  { key: 'rating' as const, label: '평점' },
  { key: 'reviewCount' as const, label: '리뷰수' },
  { key: 'description' as const, label: '상품설명' },
  { key: 'image' as const, label: '대표이미지URL' },
  {
    key: 'createdAt' as const,
    label: '등록일',
    format: (v: ProductExportRow[keyof ProductExportRow]) =>
      new Date(v as string).toLocaleDateString(),
  },
];

const PRODUCT_COLOR_MAP: Record<string, string> = {
  전체: 'text-gray-800',
  판매중: 'text-emerald-500',
  품절: 'text-red-500',
  판매종료: 'text-gray-500',
  숨김: 'text-gray-400',
};

export default function ProductsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const searchParams = useSearchParams();
  const urlPage = Number(searchParams.get('page') ?? '1');
  const [status, setStatus] = useState<ProductStatus | '전체'>('전체');
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(urlPage);
  const [isLoading, setIsLoading] = useState(true);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isAllSelectedMode, setIsAllSelectedMode] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const selectionFilterKey = `${page}-${status}-${search}-${selectedParentId}-${selectedCategoryId}`;
  const [prevSelectionFilterKey, setPrevSelectionFilterKey] = useState(selectionFilterKey);

  const [sortBy, setSortBy] = useState<ProductSortBy | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [counts, setCounts] = useState<ProductCounts>({
    전체: 0,
    판매중: 0,
    품절: 0,
    판매종료: 0,
    숨김: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [prevUrlPage, setPrevUrlPage] = useState(urlPage);
  if (urlPage !== prevUrlPage) {
    setPrevUrlPage(urlPage);
    setPage(urlPage);
  }

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/seller/products?page=${page}&limit=10`);
        if (cancelled) return;
        setProducts(data.data.products || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [page]);

  const handleTemplateDownload = () => {
    const sheetData = [
      {
        상품명: '',
        대카테고리: '',
        소카테고리: '',
        브랜드: '',
        원산지: '',
        가격: '',
        재고: '',
        할인유형: 'none',
        할인값: '',
        상태: '판매중',
        배송템플릿: '',
        반품정책: '',
        상품설명: '',
        대표이미지URL: '',
      },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheetData), '상품등록양식');

    // 참고용 카테고리 목록 시트
    const categorySheet = categories.flatMap((c) =>
      c.children.map((child) => ({ 대카테고리: c.name, 소카테고리: child.name }))
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categorySheet), '카테고리참고');

    XLSX.writeFile(workbook, `상품등록양식_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      const rows = rawRows.map((r) => ({
        name: String(r['상품명'] ?? '').trim(),
        parentCategoryName: String(r['대카테고리'] ?? '').trim(),
        categoryName: String(r['소카테고리'] ?? '').trim(),
        brand: String(r['브랜드'] ?? '').trim(),
        origin: String(r['원산지'] ?? '').trim(),
        price: Number(r['가격']),
        stock: Number(r['재고']),
        discountType: String(r['할인유형'] ?? 'none').trim(),
        discountValue: r['할인값'] ? Number(r['할인값']) : null,
        status: String(r['상태'] ?? '판매중').trim(),
        shippingTemplateName: String(r['배송템플릿'] ?? '').trim(),
        returnPolicyTemplateName: String(r['반품정책'] ?? '').trim(),
        description: String(r['상품설명'] ?? '').trim(),
        image: String(r['대표이미지URL'] ?? '').trim(),
      }));

      const { data } = await api.post('/seller/products/bulk-import', { rows });
      const { successCount, failures } = data.data;

      if (failures.length > 0) {
        toast.error(
          `${successCount}건 등록 완료, ${failures.length}건 실패: ${failures
            .map((f: { row: number; reason: string }) => `${f.row}행(${f.reason})`)
            .join(', ')}`
        );
      } else {
        toast.success(`${successCount}건이 등록되었습니다.`);
      }

      loadProducts();
      fetchCounts();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '파일 처리 중 오류가 발생했습니다.';
      toast.error(msg, { id: msg });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { exportToExcel, isExporting, progress } = useExcelExport<ProductExportRow>({
    endpoint: '/seller/products/export',
    columns: EXPORT_COLUMNS,
    sheetName: '상품목록',
    fileNamePrefix: '상품목록',
    countBy: 'productId',
  });

  const handleExcelDownload = () => {
    if (selectedIds.length > 0) {
      exportToExcel({ productIds: selectedIds.join(',') });
      return;
    }
    exportToExcel({
      keyword: search || undefined,
      status: status !== '전체' ? status : undefined,
      categoryId: selectedCategoryId ? String(selectedCategoryId) : undefined,
      parentId: selectedParentId ? String(selectedParentId) : undefined,
    });
  };

  const fetchCounts = async () => {
    try {
      const { data } = await api.get('/seller/products/counts');
      setCounts(data.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상태별 건수를 불러오지 못했습니다.';
      toast.error(msg, { id: msg });
    }
  };

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (search) params.keyword = search;
      if (status !== '전체') params.status = status;
      if (selectedCategoryId) params.categoryId = selectedCategoryId;
      else if (selectedParentId) params.parentId = selectedParentId;
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }

      const { data } = await api.get('/seller/products', { params });
      if (data) {
        setProducts(data.data.products);
        setTotal(data.data.pagination.total);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상품 목록을 불러오지 못했습니다.';
      toast.error(msg, { id: msg });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status, selectedParentId, selectedCategoryId, sortBy, sortOrder]);

  const handleSelect = (productId: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, productId] : prev.filter((id) => id !== productId)
    );
    setIsAllSelectedMode(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setIsAllSelectedMode(true);
      setSelectedIds(products.map((p) => p.productId));
    } else {
      setIsAllSelectedMode(false);
      setSelectedIds([]);
    }
  };

  if (selectionFilterKey !== prevSelectionFilterKey) {
    setPrevSelectionFilterKey(selectionFilterKey);
    setSelectedIds([]);
    setIsAllSelectedMode(false);
  }

  const handleBulkStatusChange = async (newStatus: '판매중' | '품절' | '판매종료' | '숨김') => {
    if (selectedIds.length === 0) {
      toast.error('상품을 선택해주세요.');
      return;
    }
    setIsBulkProcessing(true);
    try {
      const { data } = await api.patch('/seller/products/bulk-status', {
        productIds: selectedIds,
        status: newStatus,
      });
      const { successCount, failCount } = data.data;
      if (failCount > 0) {
        toast.error(`${successCount}건 처리 완료, ${failCount}건 실패했습니다.`);
      } else {
        toast.success(`${successCount}건이 '${newStatus}'로 변경되었습니다.`);
      }
      setSelectedIds([]);
      setIsAllSelectedMode(false);
      loadProducts();
      fetchCounts();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '일괄 처리에 실패했습니다.';
      toast.error(msg, { id: msg });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('상품을 선택해주세요.');
      return;
    }
    if (!confirm(`선택한 ${selectedIds.length}개 상품을 정말 삭제하시겠습니까?`)) return;

    setIsBulkProcessing(true);
    try {
      const { data } = await api.delete('/seller/products/bulk-delete', {
        data: { productIds: selectedIds },
      });
      const { successCount, failures } = data.data;
      if (failures.length > 0) {
        toast.error(
          `${successCount}건 삭제 완료, ${failures.length}건 실패했습니다. (진행 중인 주문 있는 상품은 판매종료로 변경하세요)`
        );
      } else {
        toast.success(`${successCount}건이 삭제되었습니다.`);
      }
      setSelectedIds([]);
      setIsAllSelectedMode(false);
      loadProducts();
      fetchCounts();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '일괄 삭제에 실패했습니다.';
      toast.error(msg, { id: msg });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleSortChange = (newSortBy: ProductSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setPage(1);
  };

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data } = await api.get('/categories');
        setCategories(data.data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '실시간 재고 알림 갱신에 실패했습니다.';
        toast.error(msg, { id: msg });
      }
    }
    loadCategories();
    fetchCounts();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalPages = getTotalPages(total, LIMIT);

  const handleSelectParent = (parentId: number | null) => {
    setSelectedParentId(parentId);
    setSelectedCategoryId(null);
    setPage(1);
  };

  const handleSelectChild = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
  };

  const selectedParent = categories.find((c) => c.categoryId === selectedParentId);

  const statusCardData = [
    { label: '전체', count: counts.전체, filterValue: '전체' },
    { label: '판매중', count: counts.판매중, filterValue: '판매중' },
    { label: '품절', count: counts.품절, filterValue: '품절' },
    { label: '판매종료', count: counts.판매종료, filterValue: '판매종료' },
    { label: '숨김', count: counts.숨김, filterValue: '숨김' },
  ];

  return (
    <div className="bg-background p-8 max-tablet:p-4">
      <div className="mb-8 pr-5 flex items-center justify-between max-tablet:flex-col max-tablet:items-start max-tablet:gap-3 max-tablet:pr-0">
        <h1 className="text-h2 font-bold text-dark-text max-mobile:text-h3">상품 관리</h1>
        {!isAdmin && (
          <div className="flex items-center gap-2 max-mobile:flex-wrap max-mobile:w-full">
            <Button variant="outline" size="lg" onClick={handleTemplateDownload}>
              양식 다운로드
            </Button>
            <Button variant="outline" size="lg" onClick={handleUploadClick} disabled={isUploading}>
              <Upload className="w-4 h-4" />
              {isUploading ? '업로드 중...' : '엑셀로 등록'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <Link href="/seller/products/new">
              <Button size="lg">
                <Plus /> 상품 등록
              </Button>
            </Link>
          </div>
        )}
      </div>
      <StatusCards
        cards={statusCardData}
        status={status}
        onStatusChange={(v) => {
          setStatus(v as ProductStatus | '전체');
          setPage(1);
        }}
        colorMap={PRODUCT_COLOR_MAP}
        cols={5}
      />

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="상품명으로 검색"
            className="py-5 bg-card"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Button
            onClick={() => setIsFilterOpen((prev) => !prev)}
            variant="outline"
            className="flex items-center gap-1.5 px-4 shrink-0 py-5 bg-card"
          >
            <Filter />
            필터
          </Button>
        </div>

        {isFilterOpen && (
          <>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => handleSelectParent(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  selectedParentId === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                전체
              </button>
              {categories.map((c) => (
                <button
                  key={c.categoryId}
                  onClick={() => handleSelectParent(c.categoryId)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    selectedParentId === c.categoryId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {selectedParent && selectedParent.children.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => handleSelectChild(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    selectedCategoryId === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  전체
                </button>
                {selectedParent.children.map((child) => (
                  <button
                    key={child.categoryId}
                    onClick={() => handleSelectChild(child.categoryId)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      selectedCategoryId === child.categoryId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            )}

            <FilterTabs
              options={statuses}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
          </>
        )}

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-beige/40 border border-border rounded-lg px-4 py-2.5 max-tablet:flex-wrap max-tablet:gap-y-2">
            <p className="text-sm text-gray-700 mr-auto">{selectedIds.length}개 선택됨</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedIds([]);
                setIsAllSelectedMode(false);
              }}
              disabled={isBulkProcessing}
            >
              선택 취소
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusChange('판매중')}
              disabled={isBulkProcessing}
            >
              판매중으로
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusChange('품절')}
              disabled={isBulkProcessing}
            >
              품절로
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusChange('판매종료')}
              disabled={isBulkProcessing}
            >
              판매종료
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusChange('숨김')}
              disabled={isBulkProcessing}
            >
              숨김
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
            >
              선택 삭제
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            전체 상품 수 <span className="font-semibold text-gray-800">{total}</span>개
          </p>
          {!isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelDownload}
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting
                ? `다운로드 중... (${progress.current}/${progress.total})`
                : '엑셀 다운로드'}
            </Button>
          )}
        </div>

        <ProductTable
          products={products}
          isLoading={isLoading}
          currentPage={page}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          selectedIds={selectedIds}
          isAllSelectedMode={isAllSelectedMode}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onStatusChanged={() => {
            loadProducts();
            fetchCounts();
          }}
        />
        {!isLoading && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            getPageNumbers={() => getPageNumbers(page, totalPages)}
          />
        )}
      </div>
    </div>
  );
}
