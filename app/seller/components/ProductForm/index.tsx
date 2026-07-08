'use client';

import { useCallback, useEffect, useState } from 'react';
import BasicInfoField from './BasicInfoField';
import PricingField from './PricingField';
import ImageUploadField from './ImageUploadField';
import DescriptionEditor from './DescriptionEditor';
import ShippingSection from './ShippingSection';
import FormActionButtons from './FormActionButtons';
import type { CategoryNode, ProductFormData, ProductFormProps } from '@/types/seller/product';
import { initialProductForm } from '@/types/seller/product';
import ReturnPolicyField from './ReturnPolicyField';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ReturnPolicyTemplateOption, ShippingTemplateOption } from '@/types/seller/shipping';

export default function ProductForm({ mode, initialData, fromPage }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [form, setForm] = useState<ProductFormData>(initialData ?? initialProductForm);
  const [shippingTemplates, setShippingTemplates] = useState<ShippingTemplateOption[]>([]);
  const [returnPolicyTemplates, setReturnPolicyTemplates] = useState<ReturnPolicyTemplateOption[]>(
    []
  );

  const fetchShippingTemplates = useCallback(
    async (selectDefaultIfCreate = false) => {
      const { data } = await api.get('/seller/shipping/templates');
      setShippingTemplates(data.data);
      if (selectDefaultIfCreate && mode === 'create') {
        const defaultTemplate = (data.data as ShippingTemplateOption[]).find((t) => t.isDefault);
        if (defaultTemplate) {
          setForm((prev) => ({ ...prev, shippingTemplateId: defaultTemplate.templateId }));
        }
      }
    },
    [mode]
  );

  const fetchReturnPolicyTemplates = useCallback(
    async (selectDefaultIfCreate = false) => {
      const { data } = await api.get('/seller/return-policy/templates');
      setReturnPolicyTemplates(data.data);
      if (selectDefaultIfCreate && mode === 'create') {
        const defaultTemplate = (data.data as ReturnPolicyTemplateOption[]).find(
          (t) => t.isDefault
        );
        if (defaultTemplate) {
          setForm((prev) => ({ ...prev, returnPolicyTemplateId: defaultTemplate.templateId }));
        }
      }
    },
    [mode]
  );

  useEffect(() => {
    const run = () => {
      api.get('/categories').then(({ data }) => setCategories(data.data));
      fetchShippingTemplates(true);
      fetchReturnPolicyTemplates(true);
    };
    run();
  }, [mode, fetchShippingTemplates, fetchReturnPolicyTemplates]);

  const handleChange = <S extends 'basicInfo' | 'pricingInfo', K extends keyof ProductFormData[S]>(
    section: S,
    field: K,
    value: ProductFormData[S][K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (
      !form.basicInfo.name ||
      !form.basicInfo.parentCategoryId ||
      !form.basicInfo.categoryId ||
      !form.pricingInfo.price ||
      !form.pricingInfo.stock ||
      !form.shippingTemplateId ||
      !form.returnPolicyTemplateId
    ) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }

    const [representativeImage, ...subImages] = form.images.images;

    const formData = new FormData();
    formData.append('name', form.basicInfo.name);
    formData.append('brand', form.basicInfo.brand);
    formData.append('origin', form.basicInfo.origin);
    formData.append('categoryId', form.basicInfo.categoryId);
    formData.append('status', form.basicInfo.status);
    formData.append('price', form.pricingInfo.price);
    formData.append('stock', form.pricingInfo.stock);
    formData.append('description', form.description.content);
    formData.append('discountType', form.pricingInfo.discountType);
    formData.append('discountValue', form.pricingInfo.discountValue);

    if (representativeImage?.file) {
      formData.append('image', representativeImage.file);
    }

    if (form.shippingTemplateId !== null) {
      formData.append('shippingTemplateId', String(form.shippingTemplateId));
    }
    if (form.returnPolicyTemplateId !== null) {
      formData.append('returnPolicyTemplateId', String(form.returnPolicyTemplateId));
    }

    try {
      if (mode === 'create') {
        subImages.forEach((img) => {
          if (img.file) {
            formData.append('subImages', img.file);
          }
        });

        await api.post('/seller/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('상품이 등록되었습니다.');
        router.push('/seller/products');
      } else {
        const meta = subImages.map((img) =>
          img.imageId !== undefined ? { imageId: img.imageId } : { isNew: true }
        );
        formData.append('subImages_meta', JSON.stringify(meta));

        subImages.forEach((img) => {
          if (img.file) {
            formData.append('subImages_files', img.file);
          }
        });

        await api.patch(`/seller/products/${form.productId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        window.dispatchEvent(new Event('product-stock-updated'));
        toast.success('상품이 수정되었습니다.');
        router.push(`/seller/products?page=${fromPage}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '처리에 실패했습니다.';
      toast.error(msg, { id: msg });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <BasicInfoField
        data={form.basicInfo}
        categories={categories}
        onChange={(field, value) => handleChange('basicInfo', field, value)}
      />
      <ImageUploadField
        data={form.images}
        onChange={(images) =>
          setForm((prev) => ({
            ...prev,
            images: { images },
          }))
        }
      />
      <DescriptionEditor
        data={form.description}
        onChange={(content) =>
          setForm((prev) => ({
            ...prev,
            description: { content },
          }))
        }
      />
      <PricingField
        data={form.pricingInfo}
        onChange={(field, value) => handleChange('pricingInfo', field, value)}
      />
      <ShippingSection
        templates={shippingTemplates}
        value={form.shippingTemplateId}
        onChange={(templateId) => setForm((prev) => ({ ...prev, shippingTemplateId: templateId }))}
        onTemplateCreated={() => fetchShippingTemplates(false)}
      />
      <ReturnPolicyField
        templates={returnPolicyTemplates}
        value={form.returnPolicyTemplateId}
        onChange={(templateId) =>
          setForm((prev) => ({ ...prev, returnPolicyTemplateId: templateId }))
        }
        onTemplateCreated={() => fetchReturnPolicyTemplates(false)}
      />

      <FormActionButtons mode={mode} onSubmit={handleSubmit} />
    </div>
  );
}
