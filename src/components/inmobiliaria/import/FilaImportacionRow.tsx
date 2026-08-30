'use client';

/**
 * FilaImportacionRow — one PENDIENTE row of a staged import batch
 * (wu-4-report.md §6). Surfaces the `faltantes` vocabulary and lets the
 * agency fix a row in place instead of re-uploading the whole file.
 *
 * `posible_duplicado` is a special case: its only exit is
 * `PATCH filas/:id { permitirDuplicado: true }` — a dedicated action, not a
 * form field (see `candidatos`).
 */

import { useState } from 'react';
import { WarningCircle, PencilSimple, Trash, X } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { etiquetaDeFaltante, esPosibleDuplicado } from './lib/faltantesInmuebles';
import {
  formularioDesde,
  cambiosDesdeFormulario,
  type FormularioFila,
} from './lib/datosDeFila';
import type { ListingType, PropertyType } from '@/lib/types/property';
import type {
  FilaDeImportacion,
  ResolverInmuebleDto,
} from '@/lib/api/inmuebles-importacion.service';

const TIPOS = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Apartaestudio' },
  { value: 'commercial', label: 'Local comercial' },
  { value: 'office', label: 'Oficina' },
  { value: 'warehouse', label: 'Bodega' },
];

interface FilaImportacionRowProps {
  fila: FilaDeImportacion;
  onResolver: (id: string, cambios: ResolverInmuebleDto) => Promise<void>;
  onDescartar: (id: string) => Promise<void>;
  isBusy: boolean;
}

export function FilaImportacionRow({ fila, onResolver, onDescartar, isBusy }: FilaImportacionRowProps) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormularioFila>(() => formularioDesde(fila.datos));

  const esDuplicado = esPosibleDuplicado(fila.faltantes);
  const isSale = form.listingType === 'sale';

  const handleGuardar = async () => {
    // The domain -> wire translation lives in `./lib/datosDeFila`, tested
    // there. It is the mapping that produced F-2; keeping it out of the
    // component is what makes it testable at all.
    await onResolver(fila.id, cambiosDesdeFormulario(form));
    setEditando(false);
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3" data-testid={`fila-importacion-${fila.fila}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg truncate">
            {fila.datos.title || fila.datos.address || `Fila ${fila.fila}`}
          </p>
          <p className="text-xs text-fg-muted truncate">
            {[fila.datos.address, fila.datos.city].filter(Boolean).join(', ') || 'Sin datos de dirección'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => setEditando((v) => !v)}
            disabled={isBusy}
            aria-label={editando ? 'Cerrar edición' : 'Editar fila'}
          >
            {editando ? <X className="w-4 h-4" /> : <PencilSimple className="w-4 h-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => onDescartar(fila.id)}
            disabled={isBusy}
            aria-label="Descartar fila"
          >
            <Trash className="w-4 h-4 text-danger" />
          </Button>
        </div>
      </div>

      {fila.faltantes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fila.faltantes.map((f) => (
            <Badge key={f} variant={f === 'posible_duplicado' ? 'warning' : 'secondary'} className="gap-1">
              <WarningCircle className="w-3 h-3" />
              {etiquetaDeFaltante(f)}
            </Badge>
          ))}
        </div>
      )}

      {esDuplicado && fila.candidatos.length > 0 && (
        <div className="rounded-md bg-warning-soft border border-border p-3 space-y-2">
          <p className="text-sm text-warning font-medium">Puede ser el mismo inmueble que:</p>
          <ul className="space-y-1">
            {fila.candidatos.map((c) => (
              <li key={c.id} className="text-sm text-fg-muted">
                #{c.code} — {c.title} · {c.address}, {c.city}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            hideArrow
            disabled={isBusy}
            onClick={() => onResolver(fila.id, { permitirDuplicado: true })}
          >
            Usar de todos modos
          </Button>
        </div>
      )}

      {editando && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-faint">
          <Input
            placeholder="Título"
            value={form.title ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Input
            placeholder="Dirección"
            value={form.address ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <Input
            placeholder="Ciudad"
            value={form.city ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
          <Input
            placeholder="Barrio"
            value={form.neighborhood ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
          />
          <Input
            placeholder="Departamento"
            value={form.department ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
          />
          <Select
            value={form.propertyType ?? undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, propertyType: v as PropertyType }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de inmueble" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.listingType ?? undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, listingType: v as ListingType }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Arriendo o venta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rent">Arriendo</SelectItem>
              <SelectItem value="sale">Venta</SelectItem>
            </SelectContent>
          </Select>
          {isSale ? (
            <Input
              type="number"
              placeholder="Precio de venta"
              value={form.salePrice ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value ? Number(e.target.value) : undefined }))}
            />
          ) : (
            <Input
              type="number"
              placeholder="Canon mensual"
              value={form.monthlyRent ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, monthlyRent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          )}
          <Input
            type="number"
            placeholder="Área (m²)"
            value={form.area ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value ? Number(e.target.value) : undefined }))}
          />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="button" hideArrow size="sm" disabled={isBusy} onClick={handleGuardar}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
