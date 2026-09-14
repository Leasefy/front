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

import { MagnifyingGlass, X, Funnel } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { IconButton, SegmentedControl } from '@leasefy/cadence';
import { CONTRACT_STATUS_LABELS, type ContractStatus } from '@/lib/types/contract';
import {
  FILTROS_INICIALES,
  DIAS_POR_VENCER,
  hayFiltros,
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
  /** Cuántas hay sin filtro ninguno. */
  total: number;
}

/** Los estados en el orden del ciclo de vida, como los lee la tabla. */
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

export function ContratoFilters({ filtros, onFiltros, totalFiltrado, total }: ContratoFiltersProps) {
  const { locale } = useI18n();
  const tx = (es: string, en: string) => (locale === 'en' ? en : es);

  const poner = <K extends keyof FiltrosDeContratos>(clave: K, valor: FiltrosDeContratos[K]) =>
    onFiltros({ ...filtros, [clave]: valor });

  const VIGENCIAS: { value: VigenciaDeFiltro; label: string }[] = [
    { value: 'all', label: tx('Toda vigencia', 'Any term') },
    { value: 'vigente', label: tx('Vigentes', 'In force') },
    { value: 'por_vencer', label: tx(`Vencen en ${DIAS_POR_VENCER} días`, `Ending in ${DIAS_POR_VENCER} days`) },
    { value: 'vencido', label: tx('Vencidos', 'Ended') },
    { value: 'sin_fechas', label: tx('Sin fechas', 'No dates') },
  ];
  const INMUEBLES: { value: ConOSin; label: string }[] = [
    { value: 'all', label: tx('Con o sin inmueble', 'With or without property') },
    { value: 'con', label: tx('Con inmueble', 'With property') },
    { value: 'sin', label: tx('Sin inmueble', 'Without property') },
  ];
  const INQUILINOS: { value: ConOSin; label: string }[] = [
    { value: 'all', label: tx('Con o sin inquilino', 'With or without tenant') },
    { value: 'con', label: tx('Con inquilino', 'With tenant') },
    { value: 'sin', label: tx('Sin inquilino', 'Without tenant') },
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

  const conFiltros = hayFiltros(filtros);

  return (
    <div className="p-4 space-y-4 border-b border-border" data-testid="filtros-de-contratos">
      {/* Fila 1: búsqueda */}
      <div className="relative max-w-md">
        <MagnifyingGlass
          className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={filtros.busqueda}
          onChange={(e) => poner('busqueda', e.target.value)}
          placeholder={tx(
            'Buscar por número, inquilino o dirección…',
            'Search by number, tenant or address…',
          )}
          aria-label={tx('Buscar contratos', 'Search contracts')}
          className="w-full pl-10 pr-10"
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

      {/* Fila 2: origen, desplegables, limpiar y conteo */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Migrado / nativo: para mirar la cartera que entró por archivo aparte. */}
        <SegmentedControl<OrigenDeFiltro>
          value={filtros.origen}
          onChange={(v) => poner('origen', v)}
          options={[
            { value: 'all', label: tx('Todos', 'All') },
            { value: 'migrado', label: tx('Migrados', 'Migrated') },
            { value: 'nativo', label: tx('Creados acá', 'Created here') },
          ]}
        />

        <div className="hidden sm:block w-px h-6 bg-border" />

        <Select value={filtros.estado} onValueChange={(v) => poner('estado', v as EstadoDeFiltro)}>
          <SelectTrigger className="w-auto max-w-[200px] gap-2" data-testid="filtro-estado">
            <span className="truncate">
              {filtros.estado === 'all'
                ? tx('Todos los estados', 'All statuses')
                : CONTRACT_STATUS_LABELS[filtros.estado]}
            </span>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">{tx('Todos los estados', 'All statuses')}</SelectItem>
            {ESTADOS.map((s) => (
              <SelectItem key={s} value={s}>
                {CONTRACT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.vigencia} onValueChange={(v) => poner('vigencia', v as VigenciaDeFiltro)}>
          <SelectTrigger className="w-auto max-w-[190px] gap-2" data-testid="filtro-vigencia">
            <span className="truncate">{etiqueta(VIGENCIAS, filtros.vigencia)}</span>
          </SelectTrigger>
          <SelectContent>
            {VIGENCIAS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.inmueble} onValueChange={(v) => poner('inmueble', v as ConOSin)}>
          <SelectTrigger className="w-auto max-w-[190px] gap-2" data-testid="filtro-inmueble">
            <span className="truncate">{etiqueta(INMUEBLES, filtros.inmueble)}</span>
          </SelectTrigger>
          <SelectContent>
            {INMUEBLES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.inquilino} onValueChange={(v) => poner('inquilino', v as ConOSin)}>
          <SelectTrigger className="w-auto max-w-[190px] gap-2" data-testid="filtro-inquilino">
            <span className="truncate">{etiqueta(INQUILINOS, filtros.inquilino)}</span>
          </SelectTrigger>
          <SelectContent>
            {INQUILINOS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.canon} onValueChange={(v) => poner('canon', v as CanonDeFiltro)}>
          <SelectTrigger className="w-auto max-w-[170px] gap-2" data-testid="filtro-canon">
            <span className="truncate">{etiqueta(CANONES, filtros.canon)}</span>
          </SelectTrigger>
          <SelectContent>
            {CANONES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {conFiltros && (
          <Button
            variant="link"
            size="sm"
            hideArrow
            /* Un solo cambio con todo limpio: encadenar `poner` arma cada
               objeto desde el mismo `filtros` viejo y el último pisa a los
               demás (ya pasó en propietarios). El orden se conserva: no es
               un filtro. */
            onClick={() => onFiltros({ ...FILTROS_INICIALES, campo: filtros.campo, sentido: filtros.sentido })}
            className="gap-1.5 text-warning"
            data-testid="limpiar-filtros"
          >
            <Funnel className="w-4 h-4" weight="fill" />
            {tx('Limpiar', 'Clear')}
            <X className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* «N de M»: el total con filtros contra el total real, no las filas
            de esta página — son cosas distintas en cuanto hay paginación. */}
        <span
          className="ml-auto text-sm text-muted-foreground tabular-nums"
          data-testid="conteo-filtrado"
        >
          {totalFiltrado} {tx('de', 'of')} {total}
        </span>
      </div>
    </div>
  );
}

export default ContratoFilters;
