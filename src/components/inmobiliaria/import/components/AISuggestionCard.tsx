'use client';

import { useState } from 'react';
import {
  Check,
  X,
  CaretDown,
  CaretUp,
  Warning,
  Sparkle,
  PencilSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { IconButton, MonoLabel } from '@leasefy/cadence';
import { faltantesParaElBack } from '../lib/requisitosDelBack';
import type { ImportProperty, AISuggestion } from '../lib/importTypes';

interface AISuggestionCardProps {
  property: ImportProperty;
  index: number;
  onToggleSelect: (rowIndex: number) => void;
  /** `valorEditado` llega cuando la persona cambió la sugerencia antes de aceptarla. */
  onAcceptSuggestion: (rowIndex: number, field: string, valorEditado?: string) => void;
  onRejectSuggestion: (rowIndex: number, field: string) => void;
  onAcceptAll: (rowIndex: number) => void;
  /** Escribir un campo a mano, venga o no de una sugerencia. */
  onEditField: (rowIndex: number, campo: keyof ImportProperty, valor: string) => void;
}

/** Todo lo que se puede escribir a mano en la revisión. */
const CAMPOS_EDITABLES: {
  campo: keyof ImportProperty;
  etiqueta: string;
  tipo: 'texto' | 'numero';
  sufijo?: string;
}[] = [
  { campo: 'propertyTitle', etiqueta: 'Título', tipo: 'texto' },
  { campo: 'propertyAddress', etiqueta: 'Dirección', tipo: 'texto' },
  { campo: 'propertyCity', etiqueta: 'Ciudad', tipo: 'texto' },
  { campo: 'propertyZone', etiqueta: 'Barrio / zona', tipo: 'texto' },
  // T-0038 §3.2.1/§3.2.6 — department and consignedAt, agency-facing only.
  { campo: 'propertyDepartment', etiqueta: 'Departamento', tipo: 'texto' },
  // T-0038 §3.2.2 — free text as read from the file ("Arriendo"/"Venta");
  // resolveImportListingType (requisitosDelBack.ts) interprets it, the same
  // heuristic toCreatePayload/faltantesParaElBack/gapFiller already use.
  { campo: 'listingType', etiqueta: 'Tipo de operación (arriendo/venta)', tipo: 'texto' },
  { campo: 'monthlyRent', etiqueta: 'Canon mensual', tipo: 'numero', sufijo: 'COP' },
  { campo: 'salePrice', etiqueta: 'Precio de venta', tipo: 'numero', sufijo: 'COP' },
  { campo: 'adminFee', etiqueta: 'Administración', tipo: 'numero', sufijo: 'COP' },
  { campo: 'propertyArea', etiqueta: 'Área', tipo: 'numero', sufijo: 'm²' },
  { campo: 'bedrooms', etiqueta: 'Habitaciones', tipo: 'numero' },
  { campo: 'bathrooms', etiqueta: 'Baños', tipo: 'numero' },
  { campo: 'commissionPercent', etiqueta: 'Comisión', tipo: 'numero', sufijo: '%' },
  { campo: 'ownerName', etiqueta: 'Propietario', tipo: 'texto' },
  { campo: 'ownerPhone', etiqueta: 'Teléfono del propietario', tipo: 'texto' },
  { campo: 'consignedAt', etiqueta: 'Fecha de consignación', tipo: 'texto' },
];

/** Un campo escribible. Vacío se muestra vacío, nunca como cero. */
function CampoEditable({
  etiqueta,
  valor,
  sufijo,
  tipo,
  invalido,
  ayuda,
  onCambiar,
  testId,
}: {
  etiqueta: string;
  valor: unknown;
  sufijo?: string;
  tipo: 'texto' | 'numero';
  invalido?: boolean;
  ayuda?: string;
  onCambiar: (valor: string) => void;
  testId?: string;
}) {
  const mostrado =
    valor === undefined || valor === null || (typeof valor === 'number' && Number.isNaN(valor))
      ? ''
      : String(valor);

  return (
    <label className="block">
      <span className="block text-xs text-fg-muted dark:text-fg-subtle mb-1">
        {etiqueta}
        {sufijo && <span className="text-fg-subtle"> ({sufijo})</span>}
      </span>
      <Input
        value={mostrado}
        inputMode={tipo === 'numero' ? 'numeric' : 'text'}
        onChange={(e) => onCambiar(e.target.value)}
        className={cn('h-8 text-sm', invalido && 'border-danger')}
        data-testid={testId}
        aria-invalid={invalido || undefined}
      />
      {ayuda && (
        <span className={cn('block text-xs mt-1', invalido ? 'text-danger' : 'text-fg-subtle')}>
          {ayuda}
        </span>
      )}
    </label>
  );
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getEffectiveValue(property: ImportProperty, field: string): string {
  const value = (property as unknown as Record<string, unknown>)[field];
  if (value === undefined || value === null) return '—';
  if (typeof value === 'number') {
    if (field === 'monthlyRent' || field === 'adminFee') return formatCOP(value);
    if (field === 'commissionPercent') return `${value}%`;
    return String(value);
  }
  return String(value);
}

function ConfidencePill({ confidence }: { confidence: AISuggestion['confidence'] }) {
  return (
    <Badge
      variant={
        confidence === 'alta' ? 'success' : confidence === 'media' ? 'warning' : 'destructive'
      }
      className="shrink-0"
    >
      {confidence}
    </Badge>
  );
}

function SuggestionRow({
  suggestion,
  rowIndex,
  onAccept,
  onReject,
}: {
  suggestion: AISuggestion;
  rowIndex: number;
  onAccept: (rowIndex: number, field: string, valorEditado?: string) => void;
  onReject: (rowIndex: number, field: string) => void;
}) {
  const { t } = useI18n();

  // Una sugerencia es una propuesta, no un menú de dos opciones. Antes sólo se
  // podía aceptar tal cual o rechazar: si el canon estimado era $2.000.000 y el
  // real $1.850.000, había que rechazar y quedarse sin nada.
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(suggestion.suggestedValue);

  const fieldLabel = t(`inmobiliaria.import.fields.${suggestion.field}` as Parameters<typeof t>[0]);
  const esNumerico = ['monthlyRent', 'adminFee', 'commissionPercent'].includes(suggestion.field);

  const confirmar = () => {
    const limpio = esNumerico ? borrador.replace(/[^\d]/g, '') : borrador.trim();
    if (!limpio) return;
    onAccept(rowIndex, suggestion.field, limpio);
    setEditando(false);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-md transition-colors',
        suggestion.accepted === true
          ? 'bg-success-soft'
          : suggestion.accepted === false
            ? 'bg-surface-muted opacity-60'
            : 'bg-surface dark:bg-ink'
      )}
    >
      {/* Left: Field + value */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-fg-muted dark:text-fg-subtle">
            {fieldLabel}
          </span>
          <ConfidencePill confidence={suggestion.confidence} />
        </div>
        {editando ? (
          <div className="mt-1 flex items-center gap-2">
            <Input
              value={borrador}
              autoFocus
              inputMode={esNumerico ? 'numeric' : 'text'}
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmar();
                if (e.key === 'Escape') setEditando(false);
              }}
              className="h-8 text-sm font-mono"
              aria-label={`Valor para ${fieldLabel}`}
              data-testid={`sugerencia-editar-${suggestion.field}`}
            />
            <span className="text-xs text-fg-subtle whitespace-nowrap">Enter para guardar</span>
          </div>
        ) : (
          <div
            className={cn(
              'font-mono text-sm mt-0.5',
              suggestion.accepted === false
                ? 'line-through text-fg-subtle dark:text-fg-muted'
                : suggestion.accepted === true
                  ? 'text-success'
                  : 'text-fg dark:text-white'
            )}
          >
            {suggestion.field === 'monthlyRent'
              ? formatCOP(Number(suggestion.suggestedValue))
              : suggestion.field === 'commissionPercent'
                ? `${suggestion.suggestedValue}%`
                : suggestion.suggestedValue}
          </div>
        )}
        <p className="text-xs text-fg-subtle dark:text-fg-muted italic mt-0.5 leading-relaxed">
          {suggestion.reasoning}
        </p>
      </div>

      {/* Right: aceptar · editar · rechazar */}
      {suggestion.accepted === null ? (
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            icon={<Check className="w-3.5 h-3.5" weight="bold" />}
            onClick={() => (editando ? confirmar() : onAccept(rowIndex, suggestion.field))}
            aria-label={editando ? 'Guardar valor' : 'Aceptar sugerencia'}
            title={editando ? 'Guardar valor' : 'Aceptar sugerencia'}
            className="text-success border-success/30 hover:bg-success-soft"
          />
          {!editando && (
            <IconButton
              type="button"
              variant="outline"
              size="sm"
              icon={<PencilSimple className="w-3.5 h-3.5" />}
              onClick={() => {
                setBorrador(suggestion.suggestedValue);
                setEditando(true);
              }}
              aria-label="Editar el valor"
              title="Editar el valor antes de aceptarlo"
              data-testid={`sugerencia-lapiz-${suggestion.field}`}
            />
          )}
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            icon={<X className="w-3.5 h-3.5" weight="bold" />}
            onClick={() => (editando ? setEditando(false) : onReject(rowIndex, suggestion.field))}
            aria-label={editando ? 'Cancelar edición' : 'Rechazar sugerencia'}
            title={editando ? 'Cancelar edición' : 'Rechazar sugerencia'}
          />
        </div>
      ) : (
        <MonoLabel
          className={cn(
            'text-xs shrink-0 mt-1',
            suggestion.accepted ? 'text-success' : 'text-fg-subtle dark:text-fg-muted'
          )}
        >
          {suggestion.accepted
            ? 'Aceptado'
            : 'Rechazado'}
        </MonoLabel>
      )}
    </div>
  );
}

export function AISuggestionCard({
  property,
  index,
  onToggleSelect,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAcceptAll,
  onEditField,
}: AISuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    property.hasErrors || property.suggestions.length > 0
  );
  const [editandoTodo, setEditandoTodo] = useState(false);

  const pendingSuggestions = property.suggestions.filter((s) => s.accepted === null);
  const hasSuggestions = property.suggestions.length > 0;
  const faltantes = faltantesParaElBack(property);

  // Status
  const statusLabel = (() => {
    if (property.hasErrors) return 'Error';
    if (pendingSuggestions.length > 0) return `${pendingSuggestions.length} sugerencias`;
    if (hasSuggestions && pendingSuggestions.length === 0) return 'Listo';
    return 'Completo';
  })();

  const statusDotClass = (() => {
    if (property.hasErrors) return 'bg-danger';
    if (pendingSuggestions.length > 0) return 'bg-warning';
    return 'bg-success';
  })();

  const statusTextClass = (() => {
    if (property.hasErrors) return 'text-danger';
    if (pendingSuggestions.length > 0) return 'text-warning';
    return 'text-success';
  })();

  const displayTitle =
    property.propertyTitle ||
    property.propertyAddress ||
    `Propiedad fila ${property._rowIndex + 1}`;

  return (
    <div
      className="animate-stagger-in rounded-xl border border-border dark:border-border-strong overflow-hidden bg-surface dark:bg-bg"
      style={{ animationDelay: `${Math.min(index, 20) * 50}ms` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <Checkbox
          checked={property.selected}
          onCheckedChange={() => onToggleSelect(property._rowIndex)}
          className="shrink-0"
          disabled={property.hasErrors}
          title={property.hasErrors ? 'No se puede importar: tiene errores sin resolver' : undefined}
        />

        {/* Title + Address */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-fg dark:text-white text-sm truncate">
            {displayTitle}
          </p>
          {property.propertyAddress && property.propertyTitle && (
            <p className="text-xs text-fg-muted dark:text-fg-subtle truncate mt-0.5">
              {property.propertyAddress}
            </p>
          )}
        </div>

        {/* Status badge */}
        <div className={cn('flex items-center gap-1.5 shrink-0', statusTextClass)}>
          <div className={cn('w-1.5 h-1.5 rounded-full', statusDotClass)} />
          <MonoLabel className="text-xs whitespace-nowrap">
            {statusLabel}
          </MonoLabel>
        </div>

        {/* Expand toggle */}
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          icon={isExpanded ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
          onClick={() => setIsExpanded((v) => !v)}
          aria-label={isExpanded ? 'Contraer' : 'Expandir'}
          className="shrink-0"
        />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border-faint dark:border-border-strong px-4 pb-4 pt-3 space-y-3">
          {/* Las fotos que trajo el enlace (Nico, 2026-09-02: «si tiene
              imágenes, deberíamos mostrarlas»). Son URLs del portal de
              origen, no del CDN propio: `<img>` a secas, sin next/image. Una
              foto rota se esconde sola. Hasta 6, el resto se cuenta. */}
          {property.imagenes && property.imagenes.length > 0 && (
            <ul
              className="flex gap-2 overflow-x-auto pb-1"
              data-testid="import-fotos"
              aria-label={`${property.imagenes.length} fotos del aviso`}
            >
              {property.imagenes.slice(0, 6).map((url, i) => (
                <li key={`${url}-${i}`} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md border border-border-faint bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- CDN ajeno, sin dominio conocido para next/image */}
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.currentTarget.parentElement as HTMLElement).style.display = 'none'
                    }}
                  />
                  {i === 5 && property.imagenes && property.imagenes.length > 6 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-mono text-sm text-white">
                      +{property.imagenes.length - 6}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Property summary pills */}
          <div className="flex flex-wrap gap-2">
            {property.propertyType && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-muted dark:bg-ink text-xs font-mono text-fg-muted dark:text-fg-subtle">
                {property.propertyType}
              </span>
            )}
            {property.propertyCity && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-muted dark:bg-ink text-xs font-mono text-fg-muted dark:text-fg-subtle">
                {property.propertyCity}
              </span>
            )}
            {property.propertyZone && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-muted dark:bg-ink text-xs font-mono text-fg-muted dark:text-fg-subtle">
                {property.propertyZone}
              </span>
            )}
            {/* T-0038 §3.2.2/§3.2.4 — a SALE row shows salePrice, not the
                (absent) monthlyRent. Never a fabricated $0 chip either way. */}
            {property.salePrice && property.salePrice > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-primary-soft text-primary">
                {formatCOP(property.salePrice)} (venta)
              </span>
            ) : (
              property.monthlyRent && property.monthlyRent > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-primary-soft text-primary">
                  {formatCOP(property.monthlyRent)}/mes
                </span>
              )
            )}
          </div>

          {/* Lo que falta para poder crearlo — editable ACÁ.
              Antes esto aparecía recién en el último paso, en una pantalla sin
              campos: se veía «no se puede importar» y no había qué hacer. */}
          {faltantes.length > 0 && (
            <div
              className="border-t border-border-faint dark:border-border-strong pt-3"
              data-testid={`completar-${property._rowIndex}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Warning className="w-3.5 h-3.5 text-danger" />
                <span className="text-xs font-semibold text-danger uppercase tracking-wide">
                  Completá esto para poder crearlo
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {faltantes.map((f) => (
                  <CampoEditable
                    key={f.campo}
                    etiqueta={f.etiqueta}
                    valor={property[f.campo]}
                    sufijo={f.sufijo}
                    tipo={f.tipo}
                    invalido
                    ayuda={f.ayuda}
                    testId={`falta-${f.campo}-${property._rowIndex}`}
                    onCambiar={(v) => onEditField(property._rowIndex, f.campo, v)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Editar cualquier dato, falte o no. Un valor leído de un archivo
              ajeno puede estar mal sin estar vacío. */}
          <div className="border-t border-border-faint dark:border-border-strong pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => setEditandoTodo((v) => !v)}
              className="gap-1.5"
              data-testid={`editar-todo-${property._rowIndex}`}
            >
              <PencilSimple className="w-3.5 h-3.5" />
              {editandoTodo ? 'Ocultar los campos' : 'Editar los datos'}
            </Button>

            {editandoTodo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {CAMPOS_EDITABLES.map((c) => (
                  <CampoEditable
                    key={c.campo}
                    etiqueta={c.etiqueta}
                    valor={property[c.campo]}
                    sufijo={c.sufijo}
                    tipo={c.tipo}
                    testId={`campo-${c.campo}-${property._rowIndex}`}
                    onCambiar={(v) => onEditField(property._rowIndex, c.campo, v)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Suggestions list */}
          {hasSuggestions && (
            <>
              <div className="border-t border-border-faint dark:border-border-strong pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkle className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-fg dark:text-fg-subtle uppercase tracking-wide">
                    Sugerencias AI
                  </span>
                </div>
                <div className="space-y-1">
                  {property.suggestions.map((suggestion) => (
                    <SuggestionRow
                      key={suggestion.field}
                      suggestion={suggestion}
                      rowIndex={property._rowIndex}
                      onAccept={onAcceptSuggestion}
                      onReject={onRejectSuggestion}
                    />
                  ))}
                </div>

                {/* Accept all button (only when there are pending) */}
                {pendingSuggestions.length > 0 && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      hideArrow
                      onClick={() => onAcceptAll(property._rowIndex)}
                      className="gap-1.5"
                    >
                      <Sparkle className="w-3 h-3" />
                      Aceptar todas
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error messages */}
          {property.hasErrors && property.errorMessages.length > 0 && (
            <div className="border-t border-border-faint dark:border-border-strong pt-3 space-y-1.5">
              {property.errorMessages.map((msg, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-md bg-danger-soft border border-danger/30"
                >
                  <Warning className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <p className="text-xs text-danger">{msg}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
