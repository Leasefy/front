'use client';

/**
 * La barra de filtros de la tabla de contratos.
 *
 * 🔴 Nico, 2026-09-12: «la tabla de contratos con TODOS los filtros, el mismo
 * patrón de las otras tablas (estado, vigencia, inmueble, canon…)». Es el
 * mismo dibujo que `ConsignacionFilters` y `PropietarioTable`: búsqueda
 * arriba, y debajo un control segmentado, los desplegables, «Limpiar» y el
 * conteo «N de M».
 *
 * Es CONTROLADA: recibe `filtros` y avisa cambios. Quién filtra es
 * `lib/contratos/filtrar-contratos.ts`, sobre la lista COMPLETA y antes de
 * paginar — nunca al revés.
 */

import { useState } from 'react';
import { MagnifyingGlass, X, Funnel } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { AnimatedNumber, IconButton, Presence, SegmentedControl } from '@leasefy/cadence';
import { CONTRACT_STATUS_LABELS, type ContractStatus } from '@/lib/types/contract';
import {
  DIAS_POR_VENCER,
  type FiltrosDeContratos,
  type CanonDeFiltro,
  type ConOSin,
  type EstadoDeFiltro,
  type OrigenDeFiltro,
  type VigenciaDeFiltro,
} from '@/lib/contratos/filtrar-contratos';

interface ContratoFiltersProps {
  filtros: FiltrosDeContratos;
  onFiltros: (filtros: FiltrosDeContratos) => void;
  /** Cuántas filas quedan con estos filtros (todas las páginas). */
  totalFiltrado: number;
  /** ¿Hay filtros puestos además de la pestaña de estado? */
  conFiltros: boolean;
  /** Quita los filtros y conserva la pestaña y el orden. */
  onLimpiar: () => void;
}

const ESTADOS: ContractStatus[] = [
  'draft',
  'pending_landlord',
  'pending_tenant',
  'rejected_pending_modifications',
  'signed',
  'active',
  'expired',
  'cancelled',
];

export function ContratoFilters({ filtros, onFiltros, totalFiltrado, conFiltros, onLimpiar }: ContratoFiltersProps) {
  const [abiertos, setAbiertos] = useState(false);
  const { locale } = useI18n();
  const tx = (es: string, en: string) => (locale === 'en' ? en : es);

  const poner = <K extends keyof FiltrosDeContratos>(clave: K, valor: FiltrosDeContratos[K]) =>
    onFiltros({ ...filtros, [clave]: valor });

  const VIGENCIAS: { value: VigenciaDeFiltro; label: string }[] = [
    { value: 'all', label: tx('Toda vigencia', 'Any term') },
    { value: 'vigente', label: tx('Vigentes', 'In force') },
    { value: 'por_vencer', label: tx(`Vencen en ${DIAS_POR_VENCER} días`, `Ending in ${DIAS_POR_VENCER} days`) },
    // C-05: los que empiezan después de hoy no son «vigentes»; se buscan acá.
    { value: 'por_empezar', label: tx('Por empezar', 'Not started yet') },
    { value: 'vencido', label: tx('Vencidos', 'Ended') },
    { value: 'vencido_sin_renovar', label: tx('Vencidos sin renovar', 'Ended, not renewed') },
    { value: 'sin_fechas', label: tx('Sin fechas', 'No dates') },
  ];
  /*
   * QA-CONT C-06: la fila de un `expired` dice «Terminado» (`etiquetaDeVigencia`)
   * y el filtro decía «Expirado»: la misma cosa con dos nombres. El filtro usa
   * el de la fila.
   */
  const etiquetaDelEstado = (estado: ContractStatus) =>
    estado === 'expired' ? tx('Terminado', 'Ended') : CONTRACT_STATUS_LABELS[estado];
  const INMUEBLES: { value: ConOSin; label: string }[] = [
    { value: 'all', label: tx('Con o sin inmueble', 'With or without property') },
    { value: 'con', label: tx('Con inmueble', 'With property') },
    { value: 'sin', label: tx('Sin inmueble', 'Without property') },
  ];
  /*
   * QA-CONT-95 (A-13, CR-22): este filtro mira la CUENTA del portal del
   * inquilino (`tenantId`), no si hay persona —todo contrato tiene inquilino—.
   * Decía «Con / Sin inquilino» y traía 9 y 42 de 51 contratos con persona.
   */
  const INQUILINOS: { value: ConOSin; label: string }[] = [
    { value: 'all', label: tx('Con o sin cuenta del inquilino', 'With or without tenant account') },
    { value: 'con', label: tx('Inquilino con cuenta', 'Tenant with account') },
    { value: 'sin', label: tx('Inquilino sin cuenta en el portal', 'Tenant without portal account') },
  ];
  const CANONES: { value: CanonDeFiltro; label: string }[] = [
    { value: 'all', label: tx('Cualquier canon', 'Any rent') },
    { value: 'hasta_1m', label: tx('Hasta $1 M', 'Up to $1M') },
    { value: '1m_2m', label: tx('$1 M a $2 M', '$1M to $2M') },
    { value: '2m_5m', label: tx('$2 M a $5 M', '$2M to $5M') },
    { value: 'mas_5m', label: tx('Más de $5 M', 'Over $5M') },
    { value: 'sin_canon', label: tx('Sin canon', 'No rent') },
  ];

  const etiqueta = <V extends string>(opciones: { value: V; label: string }[], valor: V) =>
    opciones.find((o) => o.value === valor)?.label ?? '';

  /** Los filtros del panel que están puestos: el botón «Filtros (n)» los cuenta. */
  const secundarios = [
    filtros.origen !== 'all',
    filtros.inmueble !== 'all',
    filtros.inquilino !== 'all',
    filtros.canon !== 'all',
    !['all', 'active', 'por_firmar', 'draft', 'terminados'].includes(filtros.estado),
  ].filter(Boolean).length;

  return (
    <div className="space-y-3 border-b border-border p-4" data-testid="filtros-de-contratos">
      {/*
        🔴 21-10 (revisión de diseño, «los selects tirados»): UNA línea a la misma
        altura — buscador flexible, Vigencia, «Filtros (n)» y Limpiar (sólo con
        filtros). Antes eran tres renglones: el buscador solo, un segmentado y
        cuatro selects de altos distintos, y «Cualquier canon» huérfano. El
        estado lo dicen las pestañas de arriba; lo demás va en el panel.
      */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 sm:min-w-[16rem] sm:max-w-md sm:flex-1">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => poner('busqueda', e.target.value)}
            // Ronda 17: un texto que cabe a 390 (el largo se cortaba).
            placeholder={tx('Buscar contrato o inquilino', 'Search contract or tenant')}
            aria-label={tx('Buscar contratos', 'Search contracts')}
            // QA-CONT-95: sin la «×» nativa del buscador (salían dos, A-10).
            className="w-full pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
            data-testid="buscar-contratos"
          />
          {filtros.busqueda && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<X className="w-4 h-4" />}
              onClick={() => poner('busqueda', '')}
              aria-label={tx('Limpiar la búsqueda', 'Clear search')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filtros.vigencia} onValueChange={(v) => poner('vigencia', v as VigenciaDeFiltro)}>
          <SelectTrigger className="w-auto max-w-[190px] gap-2" data-testid="filtro-vigencia" aria-label={tx('Filtrar por vigencia', 'Filter by term')}>
            <span className="truncate">{etiqueta(VIGENCIAS, filtros.vigencia)}</span>
          </SelectTrigger>
          <SelectContent>
            {VIGENCIAS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

          <Button
            variant="secondary"
            hideArrow
            className="gap-2"
            aria-expanded={abiertos}
            aria-controls="filtros-de-contratos-panel"
            onClick={() => setAbiertos((v) => !v)}
            data-testid="contratos-mas-filtros"
          >
            <Funnel className="h-4 w-4" aria-hidden />
            {tx('Filtros', 'Filters')}
            {secundarios > 0 ? <span className="font-mono text-caption tabular-nums">({secundarios})</span> : null}
          </Button>

          <Presence show={conFiltros} initial={false} direction="left" distance="xs">
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={onLimpiar}
              className="gap-1.5"
              data-testid="limpiar-filtros"
            >
              {tx('Limpiar', 'Clear')}
              <X className="w-3.5 h-3.5" />
            </Button>
          </Presence>
        </div>

        {/* «N de M» sólo con filtros: sin ellos, el número ya está en la pestaña. */}
        {conFiltros ? (
          <span className="text-sm text-muted-foreground tabular-nums sm:ml-auto" data-testid="conteo-filtrado">
            <AnimatedNumber value={totalFiltrado} format={(n) => Math.round(n).toLocaleString(localeDeLasCifras())} />{' '}
            {totalFiltrado === 1 ? tx('contrato', 'contract') : tx('contratos', 'contracts')}
          </span>
        ) : null}
      </div>

      {/* El panel de los demás filtros: montado siempre (las pruebas y el lector de
          pantalla lo encuentran), visible sólo al abrir «Filtros». */}
      <div
        id="filtros-de-contratos-panel"
        className={cn('flex-wrap items-center gap-2 rounded-lg bg-surface-muted/60 p-3', abiertos ? 'flex' : 'hidden')}
      >
        {/* Migrado / nativo: para mirar la cartera que entró por archivo aparte. */}
        <SegmentedControl<OrigenDeFiltro>
          value={filtros.origen}
          onChange={(v) => poner('origen', v)}
          options={[
            { value: 'all', label: tx('Todos', 'All') },
            { value: 'migrado', label: tx('Migrados', 'Migrated') },
            { value: 'nativo', label: tx('Creados aquí', 'Created here') },
          ]}
        />
        <Select value={filtros.estado} onValueChange={(v) => poner('estado', v as EstadoDeFiltro)}>
          <SelectTrigger className="w-auto max-w-[200px] gap-2" data-testid="filtro-estado" aria-label={tx('Filtrar por estado', 'Filter by status')}>
            <span className="truncate">
              {filtros.estado === 'all'
                ? tx('Todos los estados', 'All statuses')
                : filtros.estado === 'por_firmar'
                  ? tx('Por firmar', 'Awaiting signature')
                  : filtros.estado === 'terminados'
                    ? tx('Terminados', 'Ended')
                    : etiquetaDelEstado(filtros.estado)}
            </span>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">{tx('Todos los estados', 'All statuses')}</SelectItem>
            {/* Los dos que esperan una firma, como la cifra «Por firmar» de la tabla. */}
            <SelectItem value="por_firmar">{tx('Por firmar', 'Awaiting signature')}</SelectItem>
            {ESTADOS.map((s) => (
              <SelectItem key={s} value={s}>
                {etiquetaDelEstado(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtros.inmueble} onValueChange={(v) => poner('inmueble', v as ConOSin)}>
          <SelectTrigger className="w-auto max-w-[190px] gap-2" data-testid="filtro-inmueble" aria-label={tx('Filtrar por inmueble', 'Filter by property')}>
            <span className="truncate">{etiqueta(INMUEBLES, filtros.inmueble)}</span>
          </SelectTrigger>
          <SelectContent>
            {INMUEBLES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtros.inquilino} onValueChange={(v) => poner('inquilino', v as ConOSin)}>
          <SelectTrigger className="w-auto max-w-[190px] gap-2" data-testid="filtro-inquilino" aria-label={tx('Filtrar por la cuenta del inquilino', 'Filter by tenant account')}>
            <span className="truncate">{etiqueta(INQUILINOS, filtros.inquilino)}</span>
          </SelectTrigger>
          <SelectContent>
            {INQUILINOS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtros.canon} onValueChange={(v) => poner('canon', v as CanonDeFiltro)}>
          {/* C-18: con 170 px «Cualquier canon» salía «Cualquier can…». */}
          <SelectTrigger className="w-auto max-w-[220px] gap-2" data-testid="filtro-canon" aria-label={tx('Filtrar por canon', 'Filter by rent')}>
            <span className="truncate">{etiqueta(CANONES, filtros.canon)}</span>
          </SelectTrigger>
          <SelectContent>
            {CANONES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default ContratoFilters;
