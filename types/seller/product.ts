export type CategoryName =
  | '채소'
  | '과일·견과·쌀'
  | '수산·해산물·건어물'
  | '정육·가공육·달걀'
  | '국·반찬'
  | '면·양념·오일'
  | '유제품'
  | '베이커리';

export type FoodType = CategoryName | '기타';

export type ProductStatus = '판매중' | '품절' | '판매종료' | '숨김';
export interface CategoryNode {
  categoryId: number;
  name: string;
  children: { categoryId: number; name: string }[];
}

export interface Product {
  productId: number;
  name: string;
  price: number;
  stock: number | null;
  linkedRecipeCount: number;
  status: ProductStatus | null;
  image: string;
  brand: string | null;
  categoryId: number | null;
  categories: { name: string; parent_id: number | null } | null;
  createdAt: string;
  rating: number;
  reviewCount: number;
}

export type ProductData = Omit<Product, 'id' | 'linkedRecipeCount' | 'createdAt'>;

// 상품 이미지
export interface ProductImageItem {
  id: string;
  imageId?: number;
  preview: string;
  file?: File;
}

export interface ImageUploadData {
  images: ProductImageItem[];
}

export interface ImageUploadFieldProps {
  data: ImageUploadData;
  onChange: (images: ProductImageItem[]) => void;
}

// 상품 설명
export interface DescriptionData {
  content: string;
}

export interface DescriptionEditorProps {
  data: DescriptionData;
  onChange: (content: string) => void;
}

// 상품등록 - 기본 정보
export interface BasicInfoData {
  parentCategoryId: string;
  categoryId: string;
  name: string;
  brand: string;
  origin: string;
  status: ProductStatus;
}
export interface BasicInfoFieldProps {
  data: BasicInfoData;
  categories: CategoryNode[];
  onChange: (field: keyof BasicInfoData, value: string) => void;
}

//  상품등록 - 판매 정보
export type DiscountType = 'none' | 'amount' | 'rate';

export interface PricingData {
  price: string;
  stock: string;
  discountType: DiscountType;
  discountValue: string;
}
export interface PricingFieldProps {
  data: PricingData;
  onChange: (field: keyof PricingData, value: string) => void;
}

export interface SortableImageProps {
  image: ProductImageItem;
  index: number;
  onRemove: (id: string) => void;
  onMoveFirst: (id: string) => void;
}

//반품정책
export interface ReturnPolicyData {
  content: string;
}

export interface FormActionButtonsProps {
  mode: ProductFormMode;
  onSubmit: () => void;
}

export type ProductFormMode = 'create' | 'edit';

export interface ProductFormProps {
  mode: ProductFormMode;
  initialData?: ProductFormData;
  fromPage?: string;
}

//  상품등록 - 전체 폼 데이터
export interface ProductFormData {
  productId?: number;
  basicInfo: BasicInfoData;
  pricingInfo: PricingData;
  images: ImageUploadData;
  description: DescriptionData;
  shippingTemplateId: number | null;
  returnPolicyTemplateId: number | null;
}

export const initialProductForm: ProductFormData = {
  // 기본 정보
  basicInfo: {
    parentCategoryId: '',
    categoryId: '',
    name: '',
    brand: '',
    origin: '',
    status: '판매중',
  },
  // 판매 정보
  pricingInfo: {
    price: '',
    stock: '',
    discountType: 'none',
    discountValue: '',
  },
  images: {
    images: [],
  },
  description: {
    content: '',
  },
  //배송 정보
  shippingTemplateId: null,

  //반품정책
  returnPolicyTemplateId: null,
};

export interface CreateProductInput {
  sellerId: number;
  name: string;
  brand: string;
  origin: string;
  categoryId: number;
  status: string;
  price: number;
  stock: number;
  description: string;
  shippingTemplateId: number | null;
  returnPolicyTemplateId: number | null;
  discountType: string;
  discountValue: number | null;
}
export interface UpdateProductInput {
  sellerId: number;
  productId: number;
  name: string;
  brand: string;
  origin: string;
  categoryId: number;
  status: string;
  price: number;
  stock: number;
  description: string;
  shippingTemplateId: number | null;
  returnPolicyTemplateId: number | null;
  discountType: string;
  discountValue: number | null;
}

export interface SubImageInput {
  imageId?: number;
  file?: File;
}

export type ProductSortBy = 'price' | 'stock';
export type SortOrder = 'asc' | 'desc';

export interface ProductFilters {
  keyword?: string;
  status?: string;
  categoryId?: number;
  parentId?: number;
  page: number;
  limit: number;
  sortBy?: ProductSortBy;
  sortOrder?: SortOrder;
}

export interface ProductTableProps {
  products: Product[];
  isLoading?: boolean;
  pageSize?: number;
  sortBy?: ProductSortBy;
  sortOrder?: SortOrder;
  onSortChange?: (sortBy: ProductSortBy) => void;
  selectedIds: number[];
  isAllSelectedMode: boolean;
  onSelect: (productId: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onStatusChanged?: () => void;
}

export interface BulkDeleteResult {
  successCount: number;
  failures: { productId: number; reason: string }[];
}

export interface ProductCounts {
  전체: number;
  판매중: number;
  품절: number;
  판매종료: number;
  숨김: number;
}

export interface LowStockProduct {
  productId: number;
  name: string;
  stock: number;
  minStock: number;
}

export interface ProductExportRow {
  productId: number;
  name: string;
  parentCategoryName: string;
  categoryName: string;
  brand: string;
  origin: string;
  price: number;
  stock: number | null;
  discountType: string;
  discountValue: number | null;
  status: ProductStatus | null;
  shippingTemplateName: string;
  returnPolicyTemplateName: string;
  linkedRecipeCount: number;
  rating: number;
  reviewCount: number;
  description: string;
  image: string;
  createdAt: string;
}

export interface BulkImportRow {
  name: string;
  parentCategoryName: string;
  categoryName: string;
  brand: string;
  origin: string;
  price: number;
  stock: number;
  discountType: string;
  discountValue: number | null;
  status: string;
  shippingTemplateName: string;
  returnPolicyTemplateName: string;
  description: string;
  image: string;
}
