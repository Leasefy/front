'use client';

/**
 * InventarioItemDialog — agregar o editar UN ítem del inventario del inmueble.
 *
 * Nico (2026-09-02): «¿por qué este inmueble no deja agregar inventario? ¿no
 * está construido?». No lo estaba: los tres botones de la tarjeta venían
 * `disabled` con «Próximamente» y el back no guardaba inventario en la
 * consignación. Ahora sí: el inventario se carga desde que el inmueble entra
 * a la agencia —lo que hay y en qué estado, tal como se lo recibe al
 * propietario—, sin esperar contrato, entrega ni acta. Un inmueble en venta
 * también tiene inventario.
 *
 * La foto es un enlace por ahora: la subida de archivos desde acá queda
 * dicha en el helper, no fingida.
 */

import { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

export const CONDICIONES: ReadonlyArray<InventoryItem['condition']> = ['excellent', 'good', 'fair', 'poor'];

const CONDICION_LABEL_KEY: Record<InventoryItem['condition'], string> = {
  excellent: 'inmobiliaria.acta.condExcellent',
  good: 'inmobiliaria.acta.condGood',
  fair: 'inmobiliaria.acta.condFair',
  poor: 'inmobiliaria.acta.condPoor',
};

export type ItemDeInventarioBorrador = Omit<InventoryItem, 'id'> & { id?: string };

interface Props {
  abierto: boolean;
  /** `null` = agregar; con ítem = editar. */
  item: InventoryItem | null;
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (item: ItemDeInventarioBorrador) => void;
}

function nuevoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function InventarioItemDialog({ abierto, item, guardando, onCerrar, onGuardar }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState<InventoryItem['condition']>('good');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [errores, setErrores] = useState<{ name?: string; quantity?: string }>({});

  // Cada apertura arranca del ítem que se edita (o en blanco).
  useEffect(() => {
    if (!abierto) return;
    setName(item?.name ?? '');
    setQuantity(String(item?.quantity ?? 1));
    setCondition(item?.condition ?? 'good');
    setNotes(item?.notes ?? '');
    setPhotoUrl(item?.photoUrl ?? '');
    setErrores({});
  }, [abierto, item]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const cantidad = Number(quantity);
    const nuevosErrores: typeof errores = {};
    if (!name.trim()) nuevosErrores.name = t('inmobiliaria.acta.itemDialog.nameRequired');
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) {
      nuevosErrores.quantity = t('inmobiliaria.acta.itemDialog.quantityInvalid');
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;
    onGuardar({
      id: item?.id ?? nuevoId(),
      name: name.trim().slice(0, 120),
      quantity: cantidad,
      condition,
      ...(notes.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
      ...(photoUrl.trim() ? { photoUrl: photoUrl.trim().slice(0, 500) } : {}),
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !guardando && onCerrar()}>
      <DialogContent className="sm:max-w-md" data-testid="inventario-item-dialog">
        <DialogHeader>
          <DialogTitle>
            {item ? t('inmobiliaria.acta.itemDialog.titleEdit') : t('inmobiliaria.acta.itemDialog.titleNew')}
          </DialogTitle>
          <DialogDescription>{t('inmobiliaria.acta.itemDialog.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="inv-name" className="text-sm font-medium text-fg">
              {t('inmobiliaria.acta.itemDialog.name')} <span className="text-danger">*</span>
            </label>
            <Input
              id="inv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('inmobiliaria.acta.itemDialog.namePlaceholder')}
              maxLength={120}
              autoFocus
            />
            {errores.name && <p className="text-xs text-danger">{errores.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="inv-qty" className="text-sm font-medium text-fg">
                {t('inmobiliaria.acta.itemDialog.quantity')} <span className="text-danger">*</span>
              </label>
              <Input
                id="inv-qty"
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errores.quantity && <p className="text-xs text-danger">{errores.quantity}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t('inmobiliaria.acta.itemDialog.condition')}</label>
              <Select value={condition} onValueChange={(v) => setCondition(v as InventoryItem['condition'])}>
                <SelectTrigger data-testid="inventario-condicion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDICIONES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(CONDICION_LABEL_KEY[c])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="inv-notes" className="text-sm font-medium text-fg">
              {t('inmobiliaria.acta.itemDialog.notes')}
            </label>
            <textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('inmobiliaria.acta.itemDialog.notesPlaceholder')}
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="inv-photo" className="text-sm font-medium text-fg">
              {t('inmobiliaria.acta.itemDialog.photoUrl')}
            </label>
            <Input
              id="inv-photo"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder={t('inmobiliaria.acta.itemDialog.photoUrlPlaceholder')}
              maxLength={500}
            />
            <p className="text-xs text-fg-muted">{t('inmobiliaria.acta.itemDialog.photoUrlHelp')}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" hideArrow onClick={onCerrar} disabled={guardando}>
              {t('inmobiliaria.acta.itemDialog.cancel')}
            </Button>
            <Button type="submit" hideArrow isLoading={guardando} data-testid="inventario-item-guardar">
              {item ? t('inmobiliaria.acta.itemDialog.save') : t('inmobiliaria.acta.itemDialog.saveNew')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
