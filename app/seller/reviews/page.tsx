'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { getPageNumbers, getTotalPages } from '@/lib/utils';
import type { Review, ReviewSummary, ReviewTabFilter } from '@/types/seller/review';
import ReviewSummaryCards from '@/app/seller/components/ReviewList/ReviewSummaryCards';
import ReviewFilterTabs from '@/app/seller/components/ReviewList/ReviewFilterTabs';
import ReviewList from '@/app/seller/components/ReviewList/ReviewList';
import ReviewReplyModal from '@/app/seller/components/ReviewList/ReviewReplyModal';
import ReviewReportModal from '@/app/seller/components/ReviewList/ReviewReportModal';
import ReviewImageModal from '@/app/seller/components/ReviewList/ReviewImageModal';
import Pagination from '@/components/ui/Pagination';
import { toast } from 'sonner';

const EMPTY_SUMMARY: ReviewSummary = { totalCount: 0, averageRating: 0, pendingReplyCount: 0 };
const LIMIT = 10;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [filter, setFilter] = useState<ReviewTabFilter>('전체');
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);

  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [sortOrder, setSortOrder] = useState<'rating_desc' | 'rating_asc' | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const totalPages = getTotalPages(total, LIMIT);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const { data } = await api.get('/seller/reviews', {
          params: { filter, rating: ratingFilter, sort: sortOrder, page: currentPage, limit: LIMIT },
        });
        if (!cancelled) {
          setReviews(data.data.reviews);
          setTotal(data.data.pagination.total);
          setSummary(data.data.summary);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '리뷰 목록을 불러오지 못했습니다.';
          toast.error(msg, { id: msg });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filter, ratingFilter, sortOrder, currentPage, refreshKey]);

  const handleSortToggle = () => {
    setSortOrder((prev) => {
      if (prev === 'rating_desc') return 'rating_asc';
      if (prev === 'rating_asc') return undefined;
      return 'rating_desc';
    });
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setFilter('전체');
    setRatingFilter(undefined);
    setSortOrder(undefined);
    setCurrentPage(1);
  };

  const handlePendingReplyClick = () => {
    setFilter('답변 대기');
    setRatingFilter(undefined);
    setSortOrder(undefined);
    setCurrentPage(1);
  };

  const handleReplyClick = (review: Review) => {
    setSelectedReview(review);
    setReplyModalOpen(true);
  };

  const handleReportClick = (review: Review) => {
    setSelectedReview(review);
    setReportModalOpen(true);
  };

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
    setImageModalOpen(true);
  };

  const handleReplySubmit = async (reviewId: number, content: string) => {
    try {
      await api.post(`/seller/reviews/${reviewId}/reply`, { content });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '답글 등록에 실패했습니다.';
      toast.error(msg, { id: msg });
    }
  };

  const handleReportSubmit = async (reviewId: number, reason: string) => {
    try {
      await api.post(`/seller/reviews/${reviewId}/report`, { reason });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '신고 접수에 실패했습니다.';
      toast.error(msg, { id: msg });
    }
  };

  return (
    <div className="bg-background p-8 max-desktop:p-6 max-tablet:p-4">
      <h1 className="text-h2 max-tablet:text-h3 font-bold text-dark-text mb-6 max-mobile:mb-4">
        리뷰 관리
      </h1>
      <ReviewSummaryCards
        summary={summary}
        filter={filter}
        sortOrder={sortOrder}
        onResetFilter={handleResetFilter}
        onPendingReplyClick={handlePendingReplyClick}
        onSortToggle={handleSortToggle}
      />
      <ReviewFilterTabs
        filter={filter}
        onFilterChange={(v) => { setFilter(v); setCurrentPage(1); }}
        ratingFilter={ratingFilter}
        onRatingChange={(v) => { setRatingFilter(v); setCurrentPage(1); }}
      />
      {isLoading ? (
        <p className="text-sm text-light-gray py-10 text-center">불러오는 중...</p>
      ) : (
        <>
          <ReviewList
            reviews={reviews}
            onReplyClick={handleReplyClick}
            onReportClick={handleReportClick}
            onImageClick={handleImageClick}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            getPageNumbers={() => getPageNumbers(currentPage, totalPages)}
          />
        </>
      )}
      <ReviewReplyModal
        open={replyModalOpen}
        review={selectedReview}
        onClose={() => setReplyModalOpen(false)}
        onSubmit={handleReplySubmit}
      />
      <ReviewReportModal
        open={reportModalOpen}
        review={selectedReview}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
      />
      <ReviewImageModal
        open={imageModalOpen}
        imageUrl={selectedImage}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
