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

import { useState, type ReactNode } from 'react';
import { WarningCircle, PencilSimple, Trash, X } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { AVISO_FILA_SIN_CANON } from '@/lib/inmuebles/canon-por-confirmar';
import { errorDelNumero } from './lib/limites-de-la-importacion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  celdaDelFaltanteInmueble,
  etiquetaDeFaltante,
  nombreDelCampoInmueble,
  valorDelCampoInmueble,
  esPosibleDuplicado,
  fraseDeLaPlataConCentavos,
} from './lib/faltantesInmuebles';
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
import { formatCurrency } from '@/lib/format';
import { bpsComoPorcentaje } from '@/lib/migracion/valores-de-origen';

const TIPOS = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Apartaestudio' },
  { value: 'commercial', label: 'Local comercial' },
  { value: 'office', label: 'Oficina' },
  { value: 'warehouse', label: 'Bodega' },
  { value: 'parking', label: 'Parqueadero' },
  { value: 'land', label: 'Lote' },
];

interface FilaImportacionRowProps {
  fila: FilaDeImportacion;
  /**
   * Guarda la corrección. Si el back responde un 400 con `campos`, la promesa
   * se RECHAZA con ese error y la fila lo pinta debajo de cada campo (con el
   * foco en el primero). Lo demás (un 409, un 5xx, la red) lo avisa quien
   * llama y la promesa se resuelve.
   */
  onResolver: (id: string, cambios: ResolverInmuebleDto) => Promise<void>;
  onDescartar: (id: string) => Promise<void>;
  isBusy: boolean;
}

/** Los campos que la fila deja corregir; los nombres son los del formulario. */
type CampoDeLaFila = keyof FormularioFila;
const CAMPOS_DE_LA_FILA: readonly CampoDeLaFila[] = [
  'title',
  'address',
  'city',
  'neighborhood',
  'department',
  'propertyType',
  'listingType',
  'monthlyRent',
  'salePrice',
  'area',
];

/** Un input con su error debajo, que entra suave (`ErrorDelCampo`). */
function ConError({ id, error, children }: { id: string; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      {children}
      <ErrorDelCampo id={`${id}-error`} mensaje={error} />
    </div>
  );
}

export function FilaImportacionRow({ fila, onResolver, onDescartar, isBusy }: FilaImportacionRowProps) {
  const [editando, setEditando] = useState(false);
  // T-0129 — con el canon por confirmar, `datos.monthlyRent` es un valor por
  // defecto (p. ej. $1), NO un canon: el campo arranca vacío y sólo viaja si la
  // persona escribe uno. Si no, guardar otro campo lo reenviaría y el back lo
  // leería como un canon tecleado.
  const canonPorConfirmar = fila.datosPendientes?.includes('canon') === true;
  const formularioInicial = (): FormularioFila => ({
    ...formularioDesde(fila.datos),
    ...(canonPorConfirmar ? { monthlyRent: undefined } : {}),
  });
  const [form, setForm] = useState<FormularioFila>(formularioInicial);
  /** El error de cada campo: el del cliente (los topes) o el que mandó el back. */
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaFila, string>>>({});

  const esDuplicado = esPosibleDuplicado(fila.faltantes);
  const isSale = form.listingType === 'sale';
  const idDe = (campo: CampoDeLaFila) => `fila-${fila.id}-${campo}`;

  /** Escribir en un campo borra su error: el aviso no sobrevive a su arreglo. */
  const escribir = (cambio: Partial<FormularioFila>) => {
    setForm((f) => ({ ...f, ...cambio }));
    setErrores((prev) => {
      const siguiente = { ...prev };
      for (const k of Object.keys(cambio) as CampoDeLaFila[]) delete siguiente[k];
      return siguiente;
    });
  };

  const enfocar = (campo: CampoDeLaFila | undefined) => {
    if (!campo || typeof document === 'undefined') return;
    document.getElementById(idDe(campo))?.focus();
  };

  /**
   * Manda la corrección. Un 400 con `campos` llega acá (quien llama lo
   * relanza): cada mensaje va a SU campo y el primero recibe el foco; lo que
   * no tiene campo en la fila sale en un aviso.
   */
  const resolver = async (cambios: ResolverInmuebleDto): Promise<boolean> => {
    try {
      await onResolver(fila.id, cambios);
      return true;
    } catch (e) {
      const reparto = repartirErroresDelServidor<CampoDeLaFila>(e, {
        mapa: { type: 'propertyType' },
        campos: CAMPOS_DE_LA_FILA,
        porDefecto: 'No pudimos guardar los cambios.',
        accion: 'guardar la fila',
      });
      setErrores(reparto.porCampo);
      if (reparto.orden.length > 0) setEditando(true);
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
      // Tras pintar: el input tiene que existir para recibir el foco.
      setTimeout(() => enfocar(reparto.orden[0]), 0);
      return false;
    }
  };

  const handleGuardar = async () => {
    // Los mismos topes que `ResolverInmuebleDto` (espejo en
    // `lib/limites-de-la-importacion.ts`): se atajan antes de mandar.
    const delCliente: Partial<Record<CampoDeLaFila, string>> = {};
    const precio = isSale ? 'salePrice' : 'monthlyRent';
    const errorDelPrecio = errorDelNumero(precio, form[precio]);
    if (errorDelPrecio) delCliente[precio] = errorDelPrecio;
    const errorDelArea = errorDelNumero('area', form.area);
    if (errorDelArea) delCliente.area = errorDelArea;
    const primero = CAMPOS_DE_LA_FILA.find((c) => delCliente[c]);
    if (primero) {
      setErrores(delCliente);
      enfocar(primero);
      return;
    }

    // The domain -> wire translation lives in `./lib/datosDeFila`, tested
    // there. It is the mapping that produced F-2; keeping it out of the
    // component is what makes it testable at all.
    // Sólo lo que la persona cambió: lo demás ya está guardado y reenviarlo no
    // aporta nada (y con el canon por defecto, haría daño).
    const antes = cambiosDesdeFormulario(formularioInicial());
    const todos = cambiosDesdeFormulario(form);
    const cambios: ResolverInmuebleDto = {};
    for (const k of Object.keys(todos) as (keyof ResolverInmuebleDto)[]) {
      if (todos[k] !== antes[k]) (cambios as Record<string, unknown>)[k] = todos[k];
    }
    if (Object.keys(cambios).length > 0 && !(await resolver(cambios))) return;
    setErrores({});
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
          {fila.faltantes.map((f) => {
            // El valor original va PEGADO a la etiqueta: «tipo de inmueble:
            // "APTO"» se corrige solo; «falta el tipo de inmueble» sobre una
            // celda escrita manda a buscar en el Excel.
            const celda = celdaDelFaltanteInmueble(
              fila.datos as Record<string, unknown> | null,
              f,
            );
            return (
              <Badge key={f} variant={f === 'posible_duplicado' ? 'warning' : 'secondary'} className="gap-1">
                <WarningCircle className="w-3 h-3" />
                {etiquetaDeFaltante(f)}
                {celda ? <span className="opacity-80">· dice «{celda}»</span> : null}
              </Badge>
            );
          })}
        </div>
      )}

      {/* T-0129 — neutral: no frena la fila, sólo avisa cómo va a quedar. */}
      {fila.datosPendientes?.includes('canon') && (
        <p className="text-xs text-fg-muted" data-testid="fila-sin-canon">
          {AVISO_FILA_SIN_CANON}
        </p>
      )}

      {/* Varios dueños con su % (Nico, 2026-09-13): lo que va a quedar en el
          mandato al activar, para verlo acá y no en la ficha después. */}
      {fila.datos.propietarios && fila.datos.propietarios.length >= 2 && (
        <ul className="space-y-0.5" data-testid="duenos-de-la-fila">
          <li className="text-xs text-fg-muted">{fila.datos.propietarios.length} propietarios</li>
          {fila.datos.propietarios.map((p, i) => (
            <li key={`${p.documento ?? p.nombre ?? i}`} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-fg">
                {p.nombre ?? p.documento ?? 'Sin nombre'}
                {p.documento && p.nombre ? <span className="text-fg-subtle"> · {p.documento}</span> : null}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-fg">
                {typeof p.participacionBps === 'number' ? bpsComoPorcentaje(p.participacionBps) : '—'}
                {typeof p.canon === 'number' ? (
                  <span className="text-fg-subtle"> · {formatCurrency(p.canon)}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
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
            onClick={() => void resolver({ permitirDuplicado: true })}
          >
            Usar de todos modos
          </Button>
        </div>
      )}

      {/* EN-38 / NI-07 (QA-MIGRACION-95): la cifra con centavos se dice desde la
          revisión, con la misma frase que al crear. */}
      {fila.faltantes.includes('plata_con_centavos') && fraseDeLaPlataConCentavos(fila.datos) && (
        <p className="rounded-md bg-warning-soft border border-border p-3 text-sm text-warning" data-testid="plata-con-centavos">
          {fraseDeLaPlataConCentavos(fila.datos)}
        </p>
      )}

      {/* MG-36 — el mismo código en otra fila del archivo, con otros datos.
          Al crear se quedaría UNA sola; aquí la persona elige cuál. */}
      {fila.faltantes.includes('codigo_repetido') && (fila.repetidas?.length ?? 0) > 0 && (
        <div className="rounded-md bg-warning-soft border border-border p-3 space-y-2" data-testid="codigo-repetido">
          <p className="text-sm text-warning font-medium">
            {`El código ${String(fila.datos.externalId ?? '').trim()} viene ${(fila.repetidas?.length ?? 0) + 1} veces en el archivo con datos distintos: elige cuál va.`}
          </p>
          <ul className="space-y-2">
            {fila.repetidas?.map((r) => (
              <li key={r.id} className="text-sm text-fg-muted space-y-0.5">
                <p className="text-fg">{`Esta es la fila ${fila.fila}; la otra es la fila ${r.fila}:`}</p>
                <ul className="space-y-0.5 pl-3">
                  {r.diferencias.map((d) => (
                    <li key={d.campo} className="break-words">
                      {`${nombreDelCampoInmueble(d.campo)}: aquí «${valorDelCampoInmueble(d.campo, d.aqui)}», en la fila ${r.fila} «${valorDelCampoInmueble(d.campo, d.alla)}»`}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="text-caption text-fg-muted">
            Descarta la fila que no va con el botón de la papelera, y la otra queda lista. Si son dos inmuebles distintos, corrige el código de uno de ellos en el archivo.
          </p>
        </div>
      )}

      {editando && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-faint">
          {(
            [
              ['title', 'Título'],
              ['address', 'Dirección'],
              ['city', 'Ciudad'],
              ['neighborhood', 'Barrio'],
              ['department', 'Departamento'],
            ] as const
          ).map(([campo, etiqueta]) => (
            <ConError key={campo} id={idDe(campo)} error={errores[campo]}>
              <Input
                id={idDe(campo)}
                placeholder={etiqueta}
                aria-label={etiqueta}
                value={form[campo] ?? ''}
                invalid={!!errores[campo]}
                aria-invalid={errores[campo] ? true : undefined}
                aria-describedby={errores[campo] ? `${idDe(campo)}-error` : undefined}
                onChange={(e) => escribir({ [campo]: e.target.value } as Partial<FormularioFila>)}
              />
            </ConError>
          ))}
          <ConError id={idDe('propertyType')} error={errores.propertyType}>
            <Select
              value={form.propertyType ?? undefined}
              onValueChange={(v) => escribir({ propertyType: v as PropertyType })}
            >
              <SelectTrigger
                id={idDe('propertyType')}
                aria-invalid={errores.propertyType ? true : undefined}
                aria-describedby={errores.propertyType ? `${idDe('propertyType')}-error` : undefined}
              >
                <SelectValue placeholder="Tipo de inmueble" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConError>
          <ConError id={idDe('listingType')} error={errores.listingType}>
            <Select
              value={form.listingType ?? undefined}
              onValueChange={(v) => escribir({ listingType: v as ListingType })}
            >
              <SelectTrigger
                id={idDe('listingType')}
                aria-invalid={errores.listingType ? true : undefined}
                aria-describedby={errores.listingType ? `${idDe('listingType')}-error` : undefined}
              >
                <SelectValue placeholder="Arriendo o venta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">Arriendo</SelectItem>
                <SelectItem value="sale">Venta</SelectItem>
              </SelectContent>
            </Select>
          </ConError>
          {isSale ? (
            <ConError id={idDe('salePrice')} error={errores.salePrice}>
              <Input
                id={idDe('salePrice')}
                type="number"
                placeholder="Precio de venta"
                aria-label="Precio de venta"
                value={form.salePrice ?? ''}
                invalid={!!errores.salePrice}
                aria-invalid={errores.salePrice ? true : undefined}
                aria-describedby={errores.salePrice ? `${idDe('salePrice')}-error` : undefined}
                onChange={(e) => escribir({ salePrice: e.target.value ? Number(e.target.value) : undefined })}
              />
            </ConError>
          ) : (
            <ConError id={idDe('monthlyRent')} error={errores.monthlyRent}>
              <Input
                id={idDe('monthlyRent')}
                type="number"
                placeholder={
                  canonPorConfirmar
                    ? `Por confirmar${typeof fila.datos.monthlyRent === 'number' ? ` (valor por defecto $${fila.datos.monthlyRent.toLocaleString('es-CO')})` : ''}`
                    : 'Canon mensual'
                }
                aria-label="Canon mensual"
                value={form.monthlyRent ?? ''}
                invalid={!!errores.monthlyRent}
                aria-invalid={errores.monthlyRent ? true : undefined}
                aria-describedby={errores.monthlyRent ? `${idDe('monthlyRent')}-error` : undefined}
                onChange={(e) => escribir({ monthlyRent: e.target.value ? Number(e.target.value) : undefined })}
              />
            </ConError>
          )}
          <ConError id={idDe('area')} error={errores.area}>
            <Input
              id={idDe('area')}
              type="number"
              placeholder="Área (m²)"
              aria-label="Área (m²)"
              value={form.area ?? ''}
              invalid={!!errores.area}
              aria-invalid={errores.area ? true : undefined}
              aria-describedby={errores.area ? `${idDe('area')}-error` : undefined}
              onChange={(e) => escribir({ area: e.target.value ? Number(e.target.value) : undefined })}
            />
          </ConError>
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
