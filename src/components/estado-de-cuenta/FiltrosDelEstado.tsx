'use client';

/**
 * La barra de filtros del estado de cuenta: una fila de píldoras, no una
 * tarjeta con formularios.
 *
 * Nico (2026-09-13, sobre la primera versión): «eso de filtros arriba es
 * horrible». Lo horrible era un `Checkbox` y dos `<input type="date">` con
 * rótulos en mayúsculas metidos en su propia tarjeta encima del documento:
 * parecía un formulario que había que llenar antes de poder leer. Acá son tres
 * píldoras (§15 de DESIGN.md) que se leen como lo que son —qué mostrar, de
 * cuándo, de cuál contrato— y el período trae atajos, porque «este mes» y
 * «este año» son lo que de verdad se busca en un estado de cuenta; el par
 * desde/hasta queda para el caso raro, dentro del popover.
 *
 * Los `data-testid` se conservan (`filtro-pendientes`, `filtro-desde`,
 * `filtro-hasta`, `filtro-contrato`, `filtro-limpiar`, `estado-filtros`): son
 * el contrato con las pruebas y con la impresión (`[data-estado-barra]` se
 * esconde en papel).
 */

import * as React from 'react';
import { SegmentedControl } from '@leasefy/cadence';
import { CalendarBlank, CaretDown, FileText, X } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  fechaLegible,
  hayFiltros,
  rangoPreestablecido,
  SIN_FILTROS,
  type FiltrosDelEstadoDeCuenta,
  type PeriodoPreestablecido,
} from './filas';
import { useTextoDelEstado } from './textos';

/** La píldora de filtro de DESIGN.md §15: borde, fondo de superficie, chevrón. */
const PILDORA =
  'inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-body-sm text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';
const PILDORA_ACTIVA = 'border-border-strong bg-surface-muted';

const ATAJOS: PeriodoPreestablecido[] = [
  'esteMes',
  'ultimosTresMeses',
  'proximosTresMeses',
  'esteAnio',
];

type QueMostrar = 'todo' | 'pendiente';

export interface FiltrosDelEstadoProps {
  filtros: FiltrosDelEstadoDeCuenta;
  onCambiar: (f: FiltrosDelEstadoDeCuenta) => void;
  /** Los números de contrato del documento. Con uno solo no hay píldora. */
  contratos: string[];
  /** `YYYY-MM-DD`: desde acá se cuentan los atajos del período. */
  hoy: string;
  /** Cuántas filas quedan a la vista y cuántas tiene el documento entero. */
  visibles: number;
  total: number;
  className?: string;
}

export function FiltrosDelEstado({
  filtros,
  onCambiar,
  contratos,
  hoy,
  visibles,
  total,
  className,
}: FiltrosDelEstadoProps) {
  const t = useTextoDelEstado();
  const activos = hayFiltros(filtros);

  return (
    <div
      data-estado-barra
      data-testid="estado-filtros"
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      <SegmentedControl<QueMostrar>
        aria-label={t('estadoDeCuenta.queMostrar')}
        size="sm"
        value={filtros.soloPendientes ? 'pendiente' : 'todo'}
        onChange={(v) => onCambiar({ ...filtros, soloPendientes: v === 'pendiente' })}
        options={[
          {
            value: 'todo',
            ariaLabel: t('estadoDeCuenta.todo'),
            label: <span data-testid="filtro-todo">{t('estadoDeCuenta.todo')}</span>,
          },
          {
            value: 'pendiente',
            ariaLabel: t('estadoDeCuenta.soloPendientes'),
            label: (
              <span data-testid="filtro-pendientes">{t('estadoDeCuenta.pendientes')}</span>
            ),
          },
        ]}
      />

      <PildoraDePeriodo filtros={filtros} onCambiar={onCambiar} hoy={hoy} />

      {contratos.length > 1 && (
        <PildoraDeContrato filtros={filtros} onCambiar={onCambiar} contratos={contratos} />
      )}

      {activos && (
        <div className="ml-auto flex items-center gap-1">
          <span
            data-testid="filtro-conteo"
            className="font-mono text-caption tabular-nums text-fg-muted"
          >
            {t('estadoDeCuenta.viendoFilas', { visibles, total })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => onCambiar(SIN_FILTROS)}
            data-testid="filtro-limpiar"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {t('estadoDeCuenta.limpiar')}
          </Button>
        </div>
      )}
    </div>
  );
}

/** «1 sep 2026 – 30 sep 2026», «desde 1 sep 2026» o «hasta 30 sep 2026». */
function periodoEnPalabras(
  desde: string,
  hasta: string,
  t: ReturnType<typeof useTextoDelEstado>,
): string {
  if (desde && hasta) return `${fechaLegible(desde)} – ${fechaLegible(hasta)}`;
  if (desde) return t('estadoDeCuenta.periodoDesde', { desde: fechaLegible(desde) });
  return t('estadoDeCuenta.periodoHasta', { hasta: fechaLegible(hasta) });
}

function PildoraDePeriodo({
  filtros,
  onCambiar,
  hoy,
}: {
  filtros: FiltrosDelEstadoDeCuenta;
  onCambiar: (f: FiltrosDelEstadoDeCuenta) => void;
  hoy: string;
}) {
  const t = useTextoDelEstado();
  const [abierto, setAbierto] = React.useState(false);
  const puesto = filtros.desde !== '' || filtros.hasta !== '';

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="filtro-periodo"
          className={cn(PILDORA, puesto && PILDORA_ACTIVA)}
        >
          <CalendarBlank className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          {puesto ? (
            <span className="font-mono text-caption tabular-nums">
              {periodoEnPalabras(filtros.desde, filtros.hasta, t)}
            </span>
          ) : (
            <span>{t('estadoDeCuenta.periodo')}</span>
          )}
          <CaretDown className="h-3.5 w-3.5 text-fg-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[21rem] p-3" data-lenis-prevent>
        <div className="grid grid-cols-2 gap-1.5">
          {ATAJOS.map((atajo) => {
            const rango = rangoPreestablecido(atajo, hoy);
            const activo = filtros.desde === rango.desde && filtros.hasta === rango.hasta;
            return (
              <button
                key={atajo}
                type="button"
                data-testid={`periodo-${atajo}`}
                aria-pressed={activo}
                onClick={() => {
                  onCambiar({ ...filtros, ...rango });
                  setAbierto(false);
                }}
                className={cn(
                  'h-8 whitespace-nowrap rounded-md border px-2.5 text-caption text-fg transition-colors hover:bg-surface-muted',
                  activo ? 'border-border-strong bg-surface-muted' : 'border-border-faint',
                )}
              >
                {t(`estadoDeCuenta.${atajo}`)}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border-faint pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-label uppercase tracking-wide text-fg-subtle">
              {t('estadoDeCuenta.desde')}
            </span>
            <Input
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => onCambiar({ ...filtros, desde: e.target.value })}
              className="h-9"
              data-testid="filtro-desde"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label uppercase tracking-wide text-fg-subtle">
              {t('estadoDeCuenta.hasta')}
            </span>
            <Input
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => onCambiar({ ...filtros, hasta: e.target.value })}
              className="h-9"
              data-testid="filtro-hasta"
            />
          </label>
        </div>

        {puesto && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            className="mt-2 w-full"
            onClick={() => onCambiar({ ...filtros, desde: '', hasta: '' })}
            data-testid="filtro-quitar-periodo"
          >
            {t('estadoDeCuenta.quitarPeriodo')}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PildoraDeContrato({
  filtros,
  onCambiar,
  contratos,
}: {
  filtros: FiltrosDelEstadoDeCuenta;
  onCambiar: (f: FiltrosDelEstadoDeCuenta) => void;
  contratos: string[];
}) {
  const t = useTextoDelEstado();
  const puesto = filtros.contrato !== '';
  return (
    /* Un `<select>` nativo vestido de píldora, y no el del DS: hay un contrato
       por opción y la lista puede tener quince; el nativo sabe buscar
       escribiendo y no se pelea con la impresión. */
    <label className={cn(PILDORA, 'relative cursor-pointer pr-9', puesto && PILDORA_ACTIVA)}>
      <FileText className="h-4 w-4 text-fg-muted" aria-hidden="true" />
      <select
        value={filtros.contrato}
        onChange={(e) => onCambiar({ ...filtros, contrato: e.target.value })}
        aria-label={t('estadoDeCuenta.contratoPalabra')}
        className="cursor-pointer appearance-none bg-transparent font-mono text-caption tabular-nums text-fg focus:outline-none"
        data-testid="filtro-contrato"
      >
        <option value="">{t('estadoDeCuenta.todosLosContratos')}</option>
        {contratos.map((n) => (
          <option key={n} value={n}>
            {t('estadoDeCuenta.contrato', { numero: n })}
          </option>
        ))}
      </select>
      <CaretDown
        className="pointer-events-none absolute right-3.5 h-3.5 w-3.5 text-fg-muted"
        aria-hidden="true"
      />
    </label>
  );
}
