'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  ImageUploadFieldProps,
  ProductImageItem,
  SortableImageProps,
} from '@/types/seller/product';

function SortableImage({ image, index, onRemove, onMoveFirst }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled: index === 0,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group aspect-square">
      <Image
        src={image.preview}
        alt={`상품 이미지 ${index + 1}`}
        fill
        unoptimized={image.preview.startsWith('blob:')}
        className="object-cover rounded-md border border-gray-200"
      />

      {/* 대표 이미지 배지 */}
      {index === 0 && (
        <span className="absolute top-1 left-1 bg-green-700 text-white text-2xs px-1.5 py-0.5 rounded font-medium">
          대표
        </span>
      )}

      {/* 서브 이미지 드래그 핸들 */}
      {index !== 0 && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1 right-1 z-10 bg-black/40 rounded p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}

      {/* 호버 시 버튼 */}
      <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
        {index !== 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onMoveFirst(image.id)}
            className="text-xs text-white bg-white/20 hover:bg-white/30 hover:text-white"
          >
            대표로 설정
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => onRemove(image.id)}
          className="text-xs"
        >
          삭제
        </Button>
      </div>
    </div>
  );
}

export default function ImageUploadField({ data, onChange }: ImageUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_COUNT = 10;
  const MAX_SIZE_MB = 5;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    const validFiles = imageFiles.filter((f) => {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`${f.name} 파일이 ${MAX_SIZE_MB}MB를 초과해요.`);
        return false;
      }
      return true;
    });

    const remaining = MAX_COUNT - data.images.length;
    if (remaining <= 0) {
      alert(`이미지는 최대 ${MAX_COUNT}장까지 등록할 수 있어요.`);
      return;
    }
    const sliced = validFiles.slice(0, remaining);
    const newImages: ProductImageItem[] = sliced.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    onChange([...data.images, ...newImages]);
  };

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const handleRemove = (id: string) => {
    const target = data.images.find((img) => img.id === id);
    if (target?.preview.startsWith('blob:')) URL.revokeObjectURL(target.preview);
    onChange(data.images.filter((img) => img.id !== id));
  };

  const handleMoveFirst = (id: string) => {
    const index = data.images.findIndex((img) => img.id === id);
    if (index <= 0) return;
    const next = [...data.images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = data.images.findIndex((img) => img.id === active.id);
    const newIndex = data.images.findIndex((img) => img.id === over.id);
    if (newIndex === 0) return;
    onChange(arrayMove(data.images, oldIndex, newIndex));
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between">
          상품 이미지
          <span className="text-xs text-gray-400 font-normal">
            {data.images.length} / {MAX_COUNT}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-5">
        {/* 업로드 영역 */}
        {data.images.length < MAX_COUNT && (
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-10 cursor-pointer transition-colors ${
              isDragging
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
            }`}
          >
            <ImageIcon className="text-gray-400 w-8 h-8" />
            <p className="text-sm text-gray-500">
              이미지를 드래그하거나 <span className="text-green-700 font-medium">클릭</span>하여
              업로드하세요
            </p>
            <p className="text-xs text-gray-400">
              최대 {MAX_COUNT}장 · 장당 {MAX_SIZE_MB}MB 이하 · JPG, PNG, WEBP
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* 썸네일 목록 */}
        {data.images.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={data.images.map((img) => img.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-5 gap-3 max-tablet:grid-cols-4 max-mobile:grid-cols-3">
                {data.images.map((img, index) => (
                  <SortableImage
                    key={img.id}
                    image={img}
                    index={index}
                    onRemove={handleRemove}
                    onMoveFirst={handleMoveFirst}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
