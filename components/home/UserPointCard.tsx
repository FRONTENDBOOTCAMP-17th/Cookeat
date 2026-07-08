'use client';

import Image from 'next/image';
import { useUserInfo } from '@/hooks/user/useUserInfo';
import { useAuthStore } from '@/store/authStore';

export default function UserPointCard() {
  const { accessToken } = useAuthStore();
  const { nickname, point, profileImage } = useUserInfo();
  const displayName = accessToken && nickname ? nickname : '쿠킷';

  return (
    <div className="bg-white rounded-2xl p-4 border border-border">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-semibold text-dark-text">안녕하세요, {displayName}님!</h3>
          <p className="text-xs text-gray-text mt-0.5">오늘도 맛있는 하루 되세요 :)</p>
        </div>
        <div className="relative w-9 h-9 rounded-full bg-card-bg flex items-center justify-center shrink-0 overflow-hidden">
          {profileImage ? (
            <Image src={profileImage} alt="내 프로필" fill className="object-cover" />
          ) : (
            <span className="text-lg">👤</span>
          )}
        </div>
      </div>

      <div className="bg-primary rounded-xl mt-3 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/85">쿠킷 포인트</p>
          <p className="text-2xl font-bold text-white mt-0.5">{point.toLocaleString()}P</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
        </div>
      </div>
    </div>
  );
}
