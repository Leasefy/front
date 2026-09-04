'use client';

/**
 * Los diez inmuebles que más neto le dejan al propietario, en barras
 * horizontales: el título se lee entero y el largo compara de un vistazo.
 *
 * Los colores del SVG van en hex, igual que en `recaudo/GraficoDeRecaudo.tsx`
 * y los `cotizador/*Chart.tsx`: recharts pinta atributos SVG y no resuelve
 * `var(--…)`. El tooltip sí es HTML y usa tokens del DS, así que se adapta
 * al modo oscuro.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { RentabilidadFila } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/format';
import { abreviarCop } from '@/components/recaudo/GraficoDeRecaudo';

const COLOR = {
  neto: '#1A40FF',
  eje: '#6E6A63',
  grilla: '#E5E2DC',
} as const;

export const TOP_DEL_GRAFICO = 10;

interface PuntoDelGrafico {
  consignacionId: string;
  etiqueta: string;
  netoPropietarioCop: number;
  recaudadoCop: number;
  comisionCop: number;
  gastosMantenimientoCop: number;
}

/** «Apto 302 Chapinero · #14», o el título solo si no hay código. */
export function etiquetaDelInmueble(fila: Pick<RentabilidadFila, 'propertyTitle' | 'codigo'>): string {
  return fila.codigo != null ? `${fila.propertyTitle} · #${fila.codigo}` : fila.propertyTitle;
}

/** Las filas del gráfico: top N por neto, de mayor a menor. */
export function topPorNeto(filas: RentabilidadFila[], n: number = TOP_DEL_GRAFICO): PuntoDelGrafico[] {
  return [...filas]
    .sort((a, b) => b.netoPropietarioCop - a.netoPropietarioCop)
    .slice(0, n)
    .map((f) => ({
      consignacionId: f.consignacionId,
      etiqueta: etiquetaDelInmueble(f),
      netoPropietarioCop: f.netoPropietarioCop,
      recaudadoCop: f.recaudadoCop,
      comisionCop: f.comisionCop,
      gastosMantenimientoCop: f.gastosMantenimientoCop,
    }));
}

function TooltipDeRentabilidad({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: PuntoDelGrafico }>;
}) {
  const punto = payload?.[0]?.payload;
  if (!active || !punto) return null;
  const lineas: Array<[string, number]> = [
    ['Neto al propietario', punto.netoPropietarioCop],
    ['Recaudado', punto.recaudadoCop],
    ['Comisión', punto.comisionCop],
    ['Gastos', punto.gastosMantenimientoCop],
  ];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-fg">{punto.etiqueta}</p>
      <dl className="space-y-0.5">
        {lineas.map(([nombre, valor]) => (
          <div key={nombre} className="flex items-baseline justify-between gap-4">
            <dt className="text-fg-muted">{nombre}</dt>
            <dd className="font-mono tabular-nums text-fg">{formatCurrency(valor)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface Props {
  filas: RentabilidadFila[];
}

export function GraficoDeRentabilidad({ filas }: Props) {
  const datos = topPorNeto(filas);
  // 32 px por barra, más el margen: diez inmuebles caben sin apretarse y
  // con tres no queda un hueco vacío.
  const alto = Math.max(160, datos.length * 32 + 24);

  return (
    <div
      className="w-full font-mono text-xs"
      style={{ height: alto }}
      data-testid="grafico-de-rentabilidad"
      data-barras={datos.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={COLOR.grilla} strokeDasharray="2 4" />
          <XAxis
            type="number"
            tickFormatter={abreviarCop}
            tick={{ fontSize: 11, fill: COLOR.eje }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={180}
            tick={{ fontSize: 11, fill: COLOR.eje }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: COLOR.grilla, opacity: 0.4 }} content={<TooltipDeRentabilidad />} />
          <Bar dataKey="netoPropietarioCop" fill={COLOR.neto} radius={[0, 3, 3, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
