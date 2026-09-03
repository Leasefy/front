'use client';

/**
 * La tabla del modo «Uno por uno» del diálogo de mandatos del final de la
 * importación (`CompletarMandatosLoteDialog`). Una fila por inmueble; en
 * cada una se elige el propietario y, si hace falta, una comisión distinta
 * de la general. La fecha de contrato y el agente viven arriba, en el
 * diálogo, porque son los mismos para todas las filas.
 *
 * Es presentación pura: el estado (`asignaciones`, `nuevos`) lo tiene el
 * diálogo, que es quien lo manda al back. Acá sólo viven el filtro, la
 * página y qué fila tiene abierto el formulario de propietario nuevo.
 *
 * ── Decisiones ──────────────────────────────────────────────────────────
 *
 * - **`Combobox` de cadence por fila**, como en `SelectorDePropietario`
 *   (contratos): mismo control, misma altura que el campo de comisión de al
 *   lado. Su filtro mira sólo `label`, así que nombre, documento y correo
 *   van pegados en la etiqueta — es lo que hace que se pueda buscar por
 *   cédula o correo.
 * - **«Agregar nuevo…» es la primera opción** de cada lista. Abre el mismo
 *   `PropietarioForm` mínimo del modo «todos», debajo de la fila. El
 *   propietario nuevo queda disponible en TODAS las filas (con el sufijo
 *   «nuevo»), así que elegirlo en varias no lo crea varias veces: el
 *   diálogo lo persiste una sola vez al guardar.
 * - **Sin virtualización**: con 100 filas alcanza con paginar de a 25
 *   (`TablePagination`), conservando el estado de todas las filas aunque
 *   no estén a la vista. El pie de página sólo aparece si hay más de una.
 * - **«Copiar el de arriba»** copia el propietario de la fila anterior EN
 *   EL ORDEN QUE SE VE (filtro aplicado): lo que el usuario tiene arriba de
 *   los ojos, no una fila escondida por el buscador.
 */

import { useMemo, useState } from 'react';
import { ArrowUp, MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { IconButton } from '@leasefy/cadence';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination } from '@/lib/hooks/use-table-pagination';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { InmuebleSinConsignacion, Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { PropietarioForm } from '@/components/inmobiliaria/PropietarioForm';

/** Lo que se decidió para una fila. Sin entrada ⇒ sin propietario todavía. */
export interface AsignacionFila {
  propietarioId: string | null;
  /** `undefined` ⇒ usa la comisión general del diálogo. */
  commissionPercent?: number;
}

/**
 * Un propietario creado desde el formulario inline, todavía sin persistir.
 * `persistedId` se completa cuando el diálogo lo crea en el back: si el
 * guardado falla a mitad de camino y el usuario reintenta, no se crea dos
 * veces.
 */
export interface PropietarioNuevo {
  tempId: string;
  data: PropietarioFormData;
  persistedId?: string;
}

/** Valor centinela de la opción «Agregar nuevo…» del Combobox. */
export const OPCION_NUEVO = '__nuevo__';

export const FILAS_POR_PAGINA = 25;
const OPCIONES_DE_PAGINA = [25, 50, 100];

/** Nombre, documento y correo juntos: es lo que hace buscables los tres. */
export function etiquetaDePropietario(p: Pick<Propietario, 'name' | 'documentNumber' | 'email'>) {
  return [p.name, p.documentNumber, p.email].filter(Boolean).join(' · ');
}

export interface MandatosPorInmuebleProps {
  inmuebles: InmuebleSinConsignacion[];
  propietarios: Propietario[];
  nuevos: PropietarioNuevo[];
  asignaciones: Record<string, AsignacionFila>;
  comisionGeneral: number;
  onAsignar: (propertyId: string, cambio: Partial<AsignacionFila>) => void;
  /** El formulario inline entregó un propietario nuevo para esa fila. */
  onNuevoPropietario: (propertyId: string, data: PropietarioFormData) => void;
  disabled?: boolean;
}

export function MandatosPorInmueble({
  inmuebles,
  propietarios,
  nuevos,
  asignaciones,
  comisionGeneral,
  onAsignar,
  onNuevoPropietario,
  disabled,
}: MandatosPorInmuebleProps) {
  const { t } = useI18n();
  const [filtro, setFiltro] = useState('');
  const [filaConFormulario, setFilaConFormulario] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return inmuebles;
    return inmuebles.filter(
      (i) =>
        i.propertyTitle.toLowerCase().includes(q) || i.propertyAddress.toLowerCase().includes(q),
    );
  }, [inmuebles, filtro]);

  const { pageItems, total, page, pageSize, setPage, setPageSize } = useTablePagination(filtradas, {
    initialPageSize: FILAS_POR_PAGINA,
    resetKey: filtro,
  });

  const opciones = useMemo<ComboboxOption[]>(
    () => [
      { value: OPCION_NUEVO, label: t('inmobiliaria.import.confirm.mandateBatch.porInmueble.agregarNuevo') },
      ...nuevos.map((n) => ({
        value: n.tempId,
        label: `${etiquetaDePropietario(n.data)} · ${t('inmobiliaria.import.confirm.mandateBatch.porInmueble.nuevoSufijo')}`,
      })),
      ...propietarios.map((p) => ({ value: p.id, label: etiquetaDePropietario(p) })),
    ],
    [nuevos, propietarios, t],
  );

  const listas = inmuebles.filter((i) => asignaciones[i.propertyId]?.propietarioId).length;

  const elegir = (propertyId: string, value: string | undefined) => {
    if (value === OPCION_NUEVO) {
      setFilaConFormulario(propertyId);
      return;
    }
    // El Combobox alterna: volver a elegir el mismo devuelve `undefined`, y
    // acá eso SÍ significa algo — soltar el propietario de la fila.
    onAsignar(propertyId, { propietarioId: value ?? null });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder={t('inmobiliaria.import.confirm.mandateBatch.porInmueble.filtroPlaceholder')}
            aria-label={t('inmobiliaria.import.confirm.mandateBatch.porInmueble.filtroPlaceholder')}
            className="pl-9"
            data-testid="filtro-inmuebles"
          />
        </div>
        <p
          className="shrink-0 text-sm text-fg-muted tabular-nums"
          data-testid="resumen-asignaciones"
          data-listas={listas}
          data-total={inmuebles.length}
        >
          {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.resumen', {
            listas,
            total: inmuebles.length,
          })}
        </p>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%]">
                {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.colInmueble')}
              </TableHead>
              <TableHead>{t('inmobiliaria.import.confirm.mandateBatch.porInmueble.colPropietario')}</TableHead>
              <TableHead className="w-28">
                {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.colComision')}
              </TableHead>
              <TableHead className="w-12">
                <span className="sr-only">
                  {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.copiarAnterior')}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-fg-muted">
                  {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.sinResultados', { q: filtro.trim() })}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((inmueble, idx) => {
              const asignacion = asignaciones[inmueble.propertyId];
              const tienePropietario = Boolean(asignacion?.propietarioId);
              // Índice en la lista filtrada completa, no en la página: la
              // fila «de arriba» de la primera de la página 2 está en la 1.
              const indiceGlobal = (page - 1) * pageSize + idx;
              const anterior = indiceGlobal > 0 ? filtradas[indiceGlobal - 1] : undefined;
              const propietarioAnterior = anterior
                ? asignaciones[anterior.propertyId]?.propietarioId ?? null
                : null;
              const comision = asignacion?.commissionPercent ?? comisionGeneral;

              return (
                <FilaDeInmueble
                  key={inmueble.propertyId}
                  inmueble={inmueble}
                  opciones={opciones}
                  propietarioId={asignacion?.propietarioId ?? null}
                  tienePropietario={tienePropietario}
                  comision={comision}
                  propietarioAnterior={propietarioAnterior}
                  disabled={disabled}
                  formularioAbierto={filaConFormulario === inmueble.propertyId}
                  onElegir={(v) => elegir(inmueble.propertyId, v)}
                  onComision={(v) => onAsignar(inmueble.propertyId, { commissionPercent: v })}
                  onCopiarAnterior={() =>
                    onAsignar(inmueble.propertyId, { propietarioId: propietarioAnterior })
                  }
                  onNuevo={async (data) => {
                    onNuevoPropietario(inmueble.propertyId, data);
                    setFilaConFormulario(null);
                  }}
                  onCancelarNuevo={() => setFilaConFormulario(null)}
                />
              );
            })}
          </TableBody>
        </Table>
        {total > FILAS_POR_PAGINA && (
          <div className="border-t border-border px-3 py-2">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={OPCIONES_DE_PAGINA}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface FilaDeInmuebleProps {
  inmueble: InmuebleSinConsignacion;
  opciones: ComboboxOption[];
  propietarioId: string | null;
  tienePropietario: boolean;
  comision: number;
  propietarioAnterior: string | null;
  disabled?: boolean;
  formularioAbierto: boolean;
  onElegir: (value: string | undefined) => void;
  onComision: (value: number) => void;
  onCopiarAnterior: () => void;
  onNuevo: (data: PropietarioFormData) => Promise<void>;
  onCancelarNuevo: () => void;
}

function FilaDeInmueble({
  inmueble,
  opciones,
  propietarioId,
  tienePropietario,
  comision,
  propietarioAnterior,
  disabled,
  formularioAbierto,
  onElegir,
  onComision,
  onCopiarAnterior,
  onNuevo,
  onCancelarNuevo,
}: FilaDeInmuebleProps) {
  const { t } = useI18n();
  const copiarLabel = t('inmobiliaria.import.confirm.mandateBatch.porInmueble.copiarAnterior');

  return (
    <>
      <TableRow data-testid="fila-inmueble" data-property-id={inmueble.propertyId} data-con-propietario={tienePropietario}>
        <TableCell className="align-middle">
          <div className="flex items-center gap-3">
            {inmueble.propertyThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto del portal de origen, sin dominio conocido para next/image
              <img
                src={inmueble.propertyThumbnail}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-md bg-surface-muted" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-fg">
                {/* Marca discreta: el punto dice si la fila ya tiene dueño.
                    No grita — antes de tocar nada, las 100 están sin dueño. */}
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    tienePropietario ? 'bg-success' : 'bg-warning',
                  )}
                  aria-hidden
                />
                <span className="truncate">{inmueble.propertyTitle}</span>
                {!tienePropietario && (
                  <span className="sr-only">
                    {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.sinPropietario')}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-fg-muted">
                {inmueble.propertyAddress}
                {inmueble.monthlyRent != null && (
                  <span className="ml-2 font-mono tabular-nums">{formatCurrency(inmueble.monthlyRent)}</span>
                )}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="align-middle">
          {/* El Combobox del DS no recibe aria-label; el grupo le da el nombre
              del inmueble para que un lector de pantalla sepa de qué fila es. */}
          <div
            role="group"
            aria-label={`${t('inmobiliaria.import.confirm.mandateBatch.porInmueble.colPropietario')}: ${inmueble.propertyTitle}`}
          >
            <Combobox
              value={propietarioId ?? undefined}
              onChange={onElegir}
              options={opciones}
              placeholder={t('inmobiliaria.import.confirm.mandateBatch.porInmueble.elegirPropietario')}
              searchPlaceholder={t('inmobiliaria.import.confirm.mandateBatch.porInmueble.buscarPropietario')}
              disabled={disabled}
              // El diálogo vive en z-[300]: sin esto la lista se abre DETRÁS.
              contentClassName="z-[400]"
            />
          </div>
        </TableCell>
        <TableCell className="align-middle">
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={comision}
              disabled={disabled}
              aria-label={`${t('inmobiliaria.import.confirm.mandateBatch.porInmueble.colComision')}: ${inmueble.propertyTitle}`}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 100) onComision(value);
              }}
              className="pr-8"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted">
              %
            </span>
          </div>
        </TableCell>
        <TableCell className="align-middle">
          <IconButton
            variant="ghost"
            size="sm"
            icon={<ArrowUp className="h-4 w-4" />}
            aria-label={`${copiarLabel}: ${inmueble.propertyTitle}`}
            title={copiarLabel}
            disabled={disabled || !propietarioAnterior}
            onClick={onCopiarAnterior}
            data-testid="copiar-anterior"
          />
        </TableCell>
      </TableRow>
      {formularioAbierto && (
        <TableRow data-testid="fila-nuevo-propietario">
          <TableCell colSpan={4} className="bg-surface-muted/60">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-base font-semibold text-fg">
                {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.nuevoPropietarioTitulo', {
                  title: inmueble.propertyTitle,
                })}
              </h3>
              <PropietarioForm mode="create" onSubmit={onNuevo} onCancel={onCancelarNuevo} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default MandatosPorInmueble;
