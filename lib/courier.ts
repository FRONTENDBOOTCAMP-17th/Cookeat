import type { CourierCode } from '@/types/seller/shipping';

export const COURIERS: CourierCode[] = [
  'CJ대한통운',
  '로젠택배',
  '한진택배',
  '롯데택배',
  '우체국택배',
  'CU 편의점택배',
  'GS25 편의점택배',
  'ETC',
];

/** 택배사별 운송장번호 자리수. ETC는 자릿수가 정해져 있지 않아 제한하지 않는다. */
export const COURIER_TRACKING_NUMBER_LENGTH: Record<CourierCode, number | null> = {
  CJ대한통운: 12,
  로젠택배: 11,
  한진택배: 12,
  롯데택배: 12,
  우체국택배: 13,
  'CU 편의점택배': 10,
  'GS25 편의점택배': 10,
  ETC: null,
};

/** 숫자만 남기고, 선택된 택배사의 자리수를 넘지 않도록 자른다 */
export function sanitizeTrackingNumber(value: string, courier: CourierCode | ''): string {
  const digitsOnly = value.replace(/\D/g, '');
  const maxLength = courier ? COURIER_TRACKING_NUMBER_LENGTH[courier] : null;
  return maxLength ? digitsOnly.slice(0, maxLength) : digitsOnly;
}
