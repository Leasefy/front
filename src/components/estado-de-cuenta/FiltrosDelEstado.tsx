'use client';

/**
 * La barra de filtros del estado de cuenta, con el MISMO dibujo que las
 * demás tablas del panel (`ContratoFilters`, `ConsignacionFilters`,
 * `PropietarioTable`): dentro de la tarjeta, un control segmentado, los
 * desplegables, «Limpiar» y el conteo «N de M» a la derecha.
 *
 * Nico, 2026-09-13: «ya sabes que nuestras tablas tienen estas cosas
 * unificadas». La primera versión tenía píldoras propias con un popover de
 * fechas: bonitas, pero distintas de todo lo demás. Acá el período es un
 * desplegable con los cuatro atajos por mes calendario y «Fechas exactas…» al
 * final, que es exactamente lo que hizo Contratos con la vigencia; sólo al
 * elegir eso aparecen desde/hasta.
 *
 * Los `data-testid` se conservan (`estado-filtros`, `filtro-pendientes`,
 * `filtro-periodo`, `filtro-desde`, `filtro-hasta`, `filtro-contrato`,
 * `filtro-limpiar`, `filtro-conteo`): son el contrato con las pruebas y con
 * la impresión (`[data-estado-barra]` se esconde en papel).
 */

import * as React from 'react';
import { SegmentedControl } from '@leasefy/cadence';
import { Funnel, X } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
  fechaLegible,
  hayFiltros,
  rangoPreestablecido,
  SIN_FILTROS,
  type FiltrosDelEstadoDeCuenta,
  type PeriodoPreestablecido,
} from './filas';
import { useTextoDelEstado } from './textos';

const ATAJOS: PeriodoPreestablecido[] = [
  'esteMes',
  'ultimosTresMeses',
  'proximosTresMeses',
  'esteAnio',
];

type QueMostrar = 'todo' | 'pendiente';
type OpcionDePeriodo = 'todo' | PeriodoPreestablecido | 'fechas';

/** Qué opción del desplegable corresponde a las fechas puestas. */
export function opcionDePeriodo(
  filtros: FiltrosDelEstadoDeCuenta,
  hoy: string,
): OpcionDePeriodo {
  if (!filtros.desde && !filtros.hasta) return 'todo';
  const atajo = ATAJOS.find((a) => {
    const r = rangoPreestablecido(a, hoy);
    return r.desde === filtros.desde && r.hasta === filtros.hasta;
  });
  return atajo ?? 'fechas';
}

export interface FiltrosDelEstadoProps {
  filtros: FiltrosDelEstadoDeCuenta;
  onCambiar: (f: FiltrosDelEstadoDeCuenta) => void;
  /** Los números de contrato del documento. Con uno solo no hay desplegable. */
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

  const opcion = opcionDePeriodo(filtros, hoy);
  // «Fechas exactas…» recién elegida no tiene fechas todavía: los campos se
  // muestran igual, y se quedan mientras las fechas no calcen con un atajo.
  const [pidiendoFechas, setPidiendoFechas] = React.useState(false);
  const conFechas = pidiendoFechas || opcion === 'fechas';

  const elegirPeriodo = (v: OpcionDePeriodo) => {
    if (v === 'fechas') {
      setPidiendoFechas(true);
      return;
    }
    setPidiendoFechas(false);
    if (v === 'todo') {
      onCambiar({ ...filtros, desde: '', hasta: '' });
      return;
    }
    onCambiar({ ...filtros, ...rangoPreestablecido(v, hoy) });
  };

  const etiquetaDelPeriodo = (() => {
    if (conFechas && opcion === 'fechas') {
      if (filtros.desde && filtros.hasta) {
        return `${fechaLegible(filtros.desde)} – ${fechaLegible(filtros.hasta)}`;
      }
      if (filtros.desde) return t('estadoDeCuenta.periodoDesde', { desde: fechaLegible(filtros.desde) });
      if (filtros.hasta) return t('estadoDeCuenta.periodoHasta', { hasta: fechaLegible(filtros.hasta) });
    }
    if (conFechas) return t('estadoDeCuenta.fechasExactas');
    return t(opcion === 'todo' ? 'estadoDeCuenta.periodoTodo' : `estadoDeCuenta.${opcion}`);
  })();

  return (
    <div
      data-estado-barra
      data-testid="estado-filtros"
      className={cn('p-4 space-y-4 border-b border-border', className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<QueMostrar>
          aria-label={t('estadoDeCuenta.queMostrar')}
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

        <div className="hidden sm:block w-px h-6 bg-border" />

        <Select
          value={conFechas ? 'fechas' : opcion}
          onValueChange={(v) => elegirPeriodo(v as OpcionDePeriodo)}
        >
          <SelectTrigger className="w-auto max-w-[220px] gap-2" data-testid="filtro-periodo">
            <span className="truncate">{etiquetaDelPeriodo}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">{t('estadoDeCuenta.periodoTodo')}</SelectItem>
            {ATAJOS.map((a) => (
              <SelectItem key={a} value={a}>
                {t(`estadoDeCuenta.${a}`)}
              </SelectItem>
            ))}
            <SelectItem value="fechas">{t('estadoDeCuenta.fechasExactas')}</SelectItem>
          </SelectContent>
        </Select>

        {conFechas && (
          <>
            <Input
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => onCambiar({ ...filtros, desde: e.target.value })}
              aria-label={t('estadoDeCuenta.desde')}
              className="w-[10.5rem]"
              data-testid="filtro-desde"
            />
            <span className="text-sm text-muted-foreground" aria-hidden="true">
              –
            </span>
            <Input
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => onCambiar({ ...filtros, hasta: e.target.value })}
              aria-label={t('estadoDeCuenta.hasta')}
              className="w-[10.5rem]"
              data-testid="filtro-hasta"
            />
          </>
        )}

        {contratos.length > 1 && (
          <Select
            value={filtros.contrato || 'all'}
            onValueChange={(v) => onCambiar({ ...filtros, contrato: v === 'all' ? '' : v })}
          >
            <SelectTrigger className="w-auto max-w-[200px] gap-2" data-testid="filtro-contrato">
              <span className="truncate">
                {filtros.contrato
                  ? t('estadoDeCuenta.contrato', { numero: filtros.contrato })
                  : t('estadoDeCuenta.todosLosContratos')}
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t('estadoDeCuenta.todosLosContratos')}</SelectItem>
              {contratos.map((n) => (
                <SelectItem key={n} value={n}>
                  {t('estadoDeCuenta.contrato', { numero: n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {activos && (
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={() => {
              setPidiendoFechas(false);
              onCambiar(SIN_FILTROS);
            }}
            className="gap-1.5 text-warning"
            data-testid="filtro-limpiar"
          >
            <Funnel className="w-4 h-4" weight="fill" />
            {t('estadoDeCuenta.limpiar')}
            <X className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* «N de M»: las filas que quedan contra las del documento entero. */}
        <span
          className="ml-auto text-sm text-muted-foreground tabular-nums"
          data-testid="filtro-conteo"
        >
          {t('estadoDeCuenta.viendoFilas', { visibles, total })}
        </span>
      </div>
    </div>
  );
}
