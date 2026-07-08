import type { OrderProductItem } from './order';

export type ShippingStatus = '결제완료' | '배송준비' | '배송중' | '배송완료' | '취소' | '환불';
export type ShippingFeeType = '무료' | '유료' | '조건부 무료';
export type AddressType = '출고지' | '반품지';
export type AddressBadgeType = '기본출고지' | '기본반품지';
export type FormType = '등록' | '수정';
export type CourierCode =
  | 'CJ대한통운'
  | '로젠택배'
  | '한진택배'
  | '롯데택배'
  | '우체국택배'
  | 'CU 편의점택배'
  | 'GS25 편의점택배'
  | 'ETC';

export type NonReturnReason =
  | '신선식품 단순변심 반품불가'
  | '포장 개봉/사용 후'
  | '소비기한 경과'
  | '보관방법 미준수로 인한 손상/변질'
  | '주문제작(정육손질/소분 등)';

export interface ShippingData {
  shippingFeeType: ShippingFeeType;
  shippingFee: string;
  freeThreshold: string;
  returnFee: string;
  originAddress: string;
  returnAddress: string;
}
export interface ShippingSectionProps {
  templates: ShippingTemplateOption[];
  value: number | null;
  onChange: (templateId: number | null) => void;
  onTemplateCreated: () => void | Promise<void>;
}

export interface ShippingOrder {
  id: string;
  customer: string; // 주문자
  recipient: string; // 수령인
  phone: string;
  address: string;
  addressDetail: string;
  products: OrderProductItem[];
  orderDate: string;
  status: ShippingStatus;
  courier: CourierCode | '';
  trackingNumber: string;
  shippingRequest: string; // 배송메모
  finalAmount: number; // 결제금액
  shippedAt: string | null; // 발송일
  deliveredAt: string | null; // 배송완료일
}

/** 배송 템플릿  */
export interface ShippingTemplateOption {
  templateId: number;
  name: string;
  feeType: ShippingFeeType;
  fee: number;
  freeThreshold: number | null;
  returnFee: number;
  originAddress: string;
  returnAddress: string;
  isDefault: boolean;
}

export interface ShippingTemplate {
  templateId: number;
  name: string;
  feeType: ShippingFeeType;
  fee: number;
  freeThreshold: number;
  returnFee: number;
  originAddress: string;
  returnAddress: string;
  isDefault: boolean;
}

export interface ShippingTemplateFormProps {
  mode: FormType;
  template?: ShippingTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: Omit<ShippingTemplate, 'templateId'>) => void;
}
export interface ShippingTemplateTableProps {
  shippings: ShippingTemplate[];
  onEdit: (shipping: ShippingTemplate) => void;
  onDelete: (templateId: number) => void;
  onSetDefault: (templateId: number) => void;
}

export interface AddressItem {
  id: number;
  name: string;
  zipCode: string;
  baseAddress: string;
  detailAddress: string;
  type: '출고지' | '반품지';
  isDefault: boolean;
}

export type CreateAddressInput = Omit<AddressItem, 'id'>;

export interface AddressCardProps {
  address: AddressItem;
  onEdit: () => void;
  onDelete: () => void;
}

export interface AddressFormProps {
  mode: FormType;
  address?: AddressItem;
  defaultType?: '출고지' | '반품지';
  isLastDefaultAddress?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: Omit<AddressItem, 'id'>) => void;
}

/* 반품 템플릿 */
export interface ReturnPolicyTemplateOption {
  templateId: number;
  name: string;
  returnPeriod: number;
  refundPeriod: number;
  nonReturnReasons: NonReturnReason[];
  isDefault: boolean;
}

export interface ReturnPolicyContent {
  returnPeriod: number; // 반품 가능 기간 (일)
  defectShippingPayer: '판매자'; // 판매자 귀책 배송비 부담 (항상 판매자)
  nonReturnReasons: NonReturnReason[]; // 반품 불가 사유
  refundPeriod: number; // 환불 처리 기간 (일)
}

export interface ReturnPolicy {
  returnId: number;
  name: string;
  content: ReturnPolicyContent;
  isDefault: boolean;
}

export interface ReturnPolicyFormProps {
  mode: FormType;
  policy?: ReturnPolicy;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: Omit<ReturnPolicy, 'returnId'>) => void;
}

export interface ReturnPolicyFieldProps {
  templates: ReturnPolicyTemplateOption[];
  value: number | null;
  onChange: (templateId: number | null) => void;
  onTemplateCreated: () => void | Promise<void>;
}

export interface ReturnPolicyTableProps {
  policies: ReturnPolicy[];
  onEdit: (policy: ReturnPolicy) => void;
  onDelete: (returnId: number) => void;
  onSetDefault: (returnId: number) => void;
}

export interface CreateShippingTemplateInput {
  sellerId: number;
  name: string;
  feeType: ShippingFeeType;
  fee: number;
  freeThreshold: number | null;
  returnFee: number;
  originAddress: string;
  returnAddress: string;
  isDefault: boolean;
}

export interface UpdateShippingTemplateInput {
  sellerId: number;
  templateId: number;
  name: string;
  feeType: ShippingFeeType;
  fee: number;
  freeThreshold: number | null;
  returnFee: number;
  originAddress: string;
  returnAddress: string;
}
export interface SetDefaultShippingTemplateInput {
  sellerId: number;
  templateId: number;
}

export interface CreateReturnPolicyTemplateInput {
  sellerId: number;
  name: string;
  returnPeriod: number;
  refundPeriod: number;
  nonReturnReasons: NonReturnReason[];
  isDefault: boolean;
}

export interface UpdateReturnPolicyTemplateInput {
  sellerId: number;
  templateId: number;
  name: string;
  returnPeriod: number;
  refundPeriod: number;
  nonReturnReasons: NonReturnReason[];
}

export interface SetDefaultReturnPolicyTemplateInput {
  sellerId: number;
  templateId: number;
}

export interface UpdateAddressResult extends AddressItem {
  promotedAddressId: number | null;
}

export interface ShippingInputState {
  courier: CourierCode | '';
  trackingNumber: string;
  isEditing: boolean;
  isAutoFilledCourier?: boolean;
}

export const SHIPPING_STATUS_TRANSITIONS: Record<ShippingStatus, ShippingStatus[]> = {
  결제완료: ['배송준비', '취소'],
  배송준비: ['배송중'],
  배송중: ['배송완료', '환불'],
  배송완료: ['환불'],
  취소: [],
  환불: [],
};

export interface PaymentInfoTableProps {
  orders: ShippingRow[];
  total: number;
  onStatusChange: (orderId: string, newStatus: ShippingStatus) => void;
  onBulkSuccess: (processedIds: string[]) => void;
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface TrackingTableProps {
  orders: ShippingRow[];
  total: number;
  status: '배송준비' | '배송중' | '배송완료';
  onUpdate: (itemId: number, courier: CourierCode | '', trackingNumber: string) => void;
  onCorrect: (itemId: number, courier: CourierCode | '', trackingNumber: string) => void;
  onStatusChange: (itemId: number, newStatus: ShippingStatus) => void;
  onBulkTrackingSuccess?: () => void;
  onBulkStatusSuccess?: (processedIds: number[]) => void;
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface AllOrdersTableProps {
  orders: ShippingRow[];
  total: number;
  onUpdate: (itemId: number, courier: CourierCode | '', trackingNumber: string) => void;
  onCorrect: (itemId: number, courier: CourierCode | '', trackingNumber: string) => void;
  onStatusChange: (itemId: number, newStatus: ShippingStatus) => void;
  onConfirmOrder: (orderId: string) => void;
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface ShippingRow {
  orderId: string;
  orderDate: string;
  customer: string;
  recipient: string;
  phone: string;
  address: string;
  addressDetail: string;
  shippingRequest: string;
  itemId: number;
  productName: string;
  quantity: number;
  finalAmount: number;
  status: ShippingStatus;
  courier: CourierCode | '';
  trackingNumber: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

