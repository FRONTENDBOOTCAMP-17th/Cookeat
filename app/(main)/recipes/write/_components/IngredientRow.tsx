'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import type { IngredientFormItem, IngredientOption, ProductSearchResult } from './types';

interface IngredientRowProps {
  item: IngredientFormItem;
  categoryOptions: IngredientOption[];
  onChange: (id: string, patch: Partial<IngredientFormItem>) => void;
  onRemove: (id: string) => void;
}

export default function IngredientRow({
  item,
  categoryOptions,
  onChange,
  onRemove,
}: IngredientRowProps) {
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCategory = categoryOptions.find(
    (opt) => String(opt.ingredientId) === item.ingredientId
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (item.selectedProduct || !item.nameQuery.trim() || !selectedCategory) {
        setResults([]);
        return;
      }
      api
        .get('/products', {
          params: { keyword: item.nameQuery.trim(), limit: 6, category: selectedCategory.name },
        })
        .then(({ data }) => setResults(data.data.products));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [item.nameQuery, item.selectedProduct, selectedCategory]);

  const handleCategoryChange = (value: string) => {
    onChange(item.id, { ingredientId: value, selectedProduct: null });
    setResults([]);
  };

  const handleSelectProduct = (product: ProductSearchResult) => {
    onChange(item.id, { selectedProduct: product, nameQuery: product.name });
    setOpen(false);
    setResults([]);
  };

  const handleClearProduct = () => {
    onChange(item.id, { selectedProduct: null, nameQuery: '' });
  };

  return (
    <div className="border border-border rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Select value={item.ingredientId} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue placeholder="대분류 선택" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((opt) => (
              <SelectItem key={opt.ingredientId} value={String(opt.ingredientId)}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1 relative min-w-0">
          {item.selectedProduct ? (
            <div className="flex items-center justify-between gap-2 h-9 px-3 rounded-lg border border-primary bg-primary/5">
              <span className="text-sm text-dark-text truncate min-w-0">
                {item.selectedProduct.name} · {item.selectedProduct.price.toLocaleString()}원
              </span>
              <button
                type="button"
                onClick={handleClearProduct}
                className="shrink-0 text-gray-text hover:text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Input
                value={item.nameQuery}
                onChange={(e) => onChange(item.id, { nameQuery: e.target.value })}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                disabled={!selectedCategory}
                placeholder={
                  selectedCategory ? '재료명 검색 또는 직접 입력' : '대분류를 먼저 선택하세요'
                }
              />
              {open && results.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                  {results.map((product) => (
                    <button
                      key={product.productId}
                      type="button"
                      onMouseDown={() => handleSelectProduct(product)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-card-bg"
                    >
                      <span className="truncate min-w-0">{product.name}</span>
                      <span className="text-xs text-gray-text shrink-0 ml-2">
                        {product.price.toLocaleString()}원
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <Input
          type="number"
          min={0}
          step="0.1"
          value={item.amount}
          onChange={(e) => onChange(item.id, { amount: e.target.value })}
          placeholder="수량"
          className="w-20 shrink-0"
        />
        <Input
          value={item.unit}
          onChange={(e) => onChange(item.id, { unit: e.target.value })}
          placeholder="단위"
          className="w-20 shrink-0"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="w-4 h-4 text-gray-text" />
        </Button>
      </div>

      {selectedCategory && !item.selectedProduct && (
        <p className="text-xs text-gray-text pl-1">
          검색 결과에 없는 재료는 이름을 직접 입력해 등록할 수 있어요.
        </p>
      )}
    </div>
  );
}
