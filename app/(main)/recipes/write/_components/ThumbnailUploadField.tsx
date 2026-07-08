'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, X } from 'lucide-react';

const MAX_SIZE_MB = 5;

interface ThumbnailUploadFieldProps {
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
}

export default function ThumbnailUploadField({ preview, onChange }: ThumbnailUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`이미지는 ${MAX_SIZE_MB}MB를 초과할 수 없어요.`);
      return;
    }
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    onChange(file, URL.createObjectURL(file));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    onChange(null, null);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-dark-text mb-1">
        대표 이미지 <span className="text-red-500">*</span>
      </label>
      {preview ? (
        <div className="relative w-32 h-32">
          <Image
            src={preview}
            alt="대표 이미지"
            fill
            unoptimized={preview.startsWith('blob:')}
            className="object-cover rounded-lg border border-border"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`w-32 h-32 flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
          }`}
        >
          <ImageIcon className="w-6 h-6 text-gray-text" />
          <span className="text-xs text-gray-text">이미지 등록</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
