'use client';

import { useEffect, useState } from 'react';
import { SellerApplication } from '@/types/seller/seller';
import SellerBasicInfo from '../components/Info/SellerBasicInfo';
import SellerBankInfo from '../components/Info/SellerBankInfo';
import SellerBusinessInfo from '../components/Info/SellerBusinessInfo';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function SellerInfoPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [localData, setLocalData] = useState<SellerApplication | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedData, setSavedData] = useState<SellerApplication | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const { data } = await api.get('/seller/me');
        if (!cancelled) {
          setLocalData(data.data);
          setSavedData(data.data);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '판매자 정보를 불러오지 못했습니다.';
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
  }, []);

  const handleChange = (updated: Partial<SellerApplication>) => {
    setLocalData((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const handleSave = async () => {
    if (!localData) return;

    try {
      await api.patch('/seller/me', {
        storeName: localData.store_name,
        representativeName: localData.representative_name,
        csPhone: localData.cs_phone,
        businessAddress: localData.business_address ?? '',
        bankName: localData.bank_name,
        bankAccount: localData.bank_account,
      });
      setSavedData(localData);
      setIsEditing(false);
      toast.success('판매자 정보가 저장되었습니다.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '저장에 실패했습니다.';
      toast.error(msg, { id: msg });
    }
  };

  const handleCancel = () => {
    setLocalData(savedData);
    setIsEditing(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>;
  }

  if (!localData) {
    return <div className="p-8 text-center text-gray-400">판매자 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="bg-background p-8 flex flex-col gap-4 max-tablet:p-6 max-mobile:p-4">
      <div className="flex items-center justify-between mb-4 max-mobile:flex-col max-mobile:items-start max-mobile:gap-3">
        <h1 className="text-h2 font-bold text-dark-text">판매자 정보</h1>
        {!isAdmin && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  취소
                </Button>
                <Button onClick={handleSave}>저장</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>수정</Button>
            )}
          </div>
        )}
      </div>
      <SellerBasicInfo data={localData} isEditing={isEditing} onChange={handleChange} />
      <SellerBusinessInfo data={localData} isEditing={isEditing} onChange={handleChange} />
      <SellerBankInfo data={localData} isEditing={isEditing} onChange={handleChange} />
    </div>
  );
}
