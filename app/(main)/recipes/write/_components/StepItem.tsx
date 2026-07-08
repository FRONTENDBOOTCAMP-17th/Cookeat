'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { StepFormItem } from './types';

const MAX_SIZE_MB = 5;

interface StepItemProps {
  step: StepFormItem;
  order: number;
  canRemove: boolean;
  onChange: (id: string, field: 'title' | 'description' | 'tip', value: string) => void;
  onRemove: (id: string) => void;
  onImageChange: (id: string, file: File | null, preview: string | null) => void;
}

export default function StepItem({
  step,
  order,
  canRemove,
  onChange,
  onRemove,
  onImageChange,
}: StepItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`이미지는 ${MAX_SIZE_MB}MB를 초과할 수 없어요.`);
      return;
    }
    if (step.imagePreview?.startsWith('blob:')) URL.revokeObjectURL(step.imagePreview);
    onImageChange(step.id, file, URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (step.imagePreview?.startsWith('blob:')) URL.revokeObjectURL(step.imagePreview);
    onImageChange(step.id, null, null);
  };

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-primary">STEP {order}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(step.id)}>
            <Trash2 className="w-4 h-4 text-gray-text" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Input
          value={step.title}
          onChange={(e) => onChange(step.id, 'title', e.target.value)}
          placeholder="단계 제목 (예: 물 끓이고 면 삶기)"
        />
        <Textarea
          value={step.description}
          onChange={(e) => onChange(step.id, 'description', e.target.value)}
          placeholder="상세 설명"
          rows={3}
        />
        <Textarea
          value={step.tip}
          onChange={(e) => onChange(step.id, 'tip', e.target.value)}
          placeholder="팁 (선택사항)"
          rows={2}
        />

        {step.imagePreview ? (
          <div className="relative w-full max-w-xs aspect-video">
            <Image
              src={step.imagePreview}
              alt={`STEP ${order} 사진`}
              fill
              unoptimized={step.imagePreview.startsWith('blob:')}
              className="object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 border-2 border-dashed border-border rounded-lg px-4 py-3 cursor-pointer hover:border-primary transition-colors w-fit"
          >
            <ImageIcon className="w-4 h-4 text-gray-text" />
            <span className="text-xs text-gray-text">사진 추가</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
