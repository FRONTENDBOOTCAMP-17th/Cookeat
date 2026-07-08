'use client';

import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ReviewImageModalProps } from '@/types/seller/review';

export default function ReviewImageModal({ open, imageUrl, onClose }: ReviewImageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-xl p-2 bg-black border-0">
        {imageUrl && (
          <div className="relative w-full h-[70vh]">
            <Image src={imageUrl} alt="리뷰 이미지 원본" fill className="object-contain rounded-lg" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
