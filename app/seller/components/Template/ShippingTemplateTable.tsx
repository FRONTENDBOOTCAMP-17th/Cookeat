'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2 } from 'lucide-react';
import { formatWon } from '@/lib/format';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';
import { ShippingTemplateTableProps } from '@/types/seller/shipping';
import { useAuthStore } from '@/store/authStore';

export default function ShippingTemplateTable({
  shippings,
  onEdit,
  onDelete,
  onSetDefault,
}: ShippingTemplateTableProps) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const defaultId = shippings.find((s) => s.isDefault)?.templateId ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(defaultId);
  const [isDefaultConfirmOpen, setIsDefaultConfirmOpen] = useState(false);
  const [prevShippings, setPrevShippings] = useState(shippings);

  if (shippings !== prevShippings) {
    setPrevShippings(shippings);
    setSelectedId(defaultId);
  }

  const feeDescription = (shipping: ShippingTemplateTableProps['shippings'][0]) => {
    if (shipping.feeType === '무료') return '무료';
    if (shipping.feeType === '조건부 무료')
      return `${formatWon(shipping.fee)} (${formatWon(shipping.freeThreshold ?? 0)} 이상 무료)`;
    return formatWon(shipping.fee);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden py-3">
        <RadioGroup
          value={selectedId !== null ? String(selectedId) : ''}
          onValueChange={(value) => setSelectedId(Number(value))}
        >
          <div className="overflow-x-auto whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">기본</TableHead>
                  <TableHead>템플릿명</TableHead>
                  <TableHead className="text-center">배송 유형</TableHead>
                  <TableHead className="text-center">배송비</TableHead>
                  <TableHead className="text-center">반품/교환</TableHead>
                  <TableHead>출고지</TableHead>
                  <TableHead className="w-20 text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shippings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                      등록된 배송 템플릿이 없어요
                    </TableCell>
                  </TableRow>
                ) : (
                  shippings.map((shipping) => (
                    <TableRow
                      key={shipping.templateId}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(shipping.templateId)}
                    >
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <RadioGroupItem value={String(shipping.templateId)} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">{shipping.name}</TableCell>
                      <TableCell className="text-center text-gray-700">{shipping.feeType}</TableCell>
                      <TableCell className="text-center text-gray-700">
                        {feeDescription(shipping)}
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {formatWon(shipping.returnFee)}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm max-w-48 truncate">
                        {shipping.originAddress || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {!isAdmin ? (
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(shipping);
                              }}
                            >
                              <Pencil size={15} className="text-gray-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(shipping.templateId);
                              }}
                            >
                              <Trash2 size={15} className="text-red-400" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </RadioGroup>
        {!isAdmin && (
          <div className="flex justify-end px-4 pt-3">
            <Button onClick={() => setIsDefaultConfirmOpen(true)}>저장</Button>
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>해당 템플릿을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              [{shippings.find((s) => s.templateId === deleteTarget)?.name}] 템플릿이 삭제됩니다. 이
              작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget !== null) onDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isDefaultConfirmOpen} onOpenChange={setIsDefaultConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기본 템플릿을 변경하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              [{shippings.find((s) => s.templateId === selectedId)?.name}] 템플릿이 기본값으로
              설정됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedId(defaultId)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedId !== null) onSetDefault(selectedId);
                setIsDefaultConfirmOpen(false);
              }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
