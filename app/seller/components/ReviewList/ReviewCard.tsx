'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import StatusBadge from '@/app/seller/components/StatusBadge';
import type { ReviewCardProps } from '@/types/seller/review';

export default function ReviewCard({
  review,
  onReplyClick,
  onReportClick,
  onImageClick,
}: ReviewCardProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 max-mobile:flex-wrap">
              <span className="text-sm font-semibold text-dark-text">{review.userName}</span>
              <span className="text-yellow text-sm tracking-tight">
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </span>
              <span className="text-xs text-light-gray">{review.createdAt}</span>
            </div>
            <span className="text-xs text-light-gray">{review.productName}</span>
          </div>

          {review.status === '정상' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReportClick(review)}
              className="text-red border-red hover:bg-red/10 hover:text-red text-xs"
            >
              신고
            </Button>
          ) : (
            <StatusBadge status={review.status} />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 max-mobile:gap-3">
        <p className="text-sm text-gray-text leading-relaxed">{review.content}</p>

        {review.images && review.images.length > 0 && (
          <div className="flex gap-2 max-mobile:flex-wrap">
            {review.images.map((url, index) => (
              <button
                key={`${url}-${index}`}
                onClick={() => onImageClick(url)}
                className="relative w-20 h-20 max-mobile:w-16 max-mobile:h-16 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
              >
                <Image src={url} alt="리뷰 이미지" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {review.reply ? (
          <div className="bg-beige rounded-lg p-4 max-mobile:p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">↩ 판매자 답변</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReplyClick(review)}
                className="text-xs text-gray-text hover:text-dark-text h-auto py-0.5 px-2"
              >
                수정
              </Button>
            </div>
            <p className="text-sm text-gray-text">{review.reply.content}</p>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReplyClick(review)}
              className="text-sm"
            >
              답글 작성
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
