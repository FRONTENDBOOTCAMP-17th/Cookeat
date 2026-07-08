'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import IngredientRow from './IngredientRow';
import type { IngredientFormItem, IngredientOption } from './types';

interface IngredientsSectionProps {
  items: IngredientFormItem[];
  categoryOptions: IngredientOption[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<IngredientFormItem>) => void;
}

export default function IngredientsSection({
  items,
  categoryOptions,
  onAdd,
  onRemove,
  onChange,
}: IngredientsSectionProps) {
  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b flex items-center justify-between">
        <CardTitle>재료</CardTitle>
        <Button type="button" size="sm" onClick={onAdd} className="gap-1">
          <Plus className="w-4 h-4" /> 재료 추가
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-5">
        {items.length === 0 && <p className="text-sm text-gray-text">추가된 재료가 없습니다.</p>}
        {items.map((item) => (
          <IngredientRow
            key={item.id}
            item={item}
            categoryOptions={categoryOptions}
            onChange={onChange}
            onRemove={onRemove}
          />
        ))}
      </CardContent>
    </Card>
  );
}
