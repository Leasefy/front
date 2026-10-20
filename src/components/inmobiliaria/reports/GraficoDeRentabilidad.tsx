'use client';

/**
 * Los diez inmuebles que más neto le dejan al propietario, en barras
 * horizontales: el largo compara de un vistazo.
 *
 * QA 20-10 (REP-5): sólo entran los que dejaron neto (antes pintaba ocho
 * inmuebles en $0, sin barra) y cada nombre va en UNA línea: el título se
 * corta con «…» y el código queda entero; el nombre completo, al pasar el
 * mouse (antes los nombres partidos en tres líneas se montaban unos sobre otros).
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
import { useI18n } from '@/lib/i18n';
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

/** Cuántos caracteres caben en el eje de los nombres (180 px, letra mono de 11 px). */
export const LARGO_DE_LA_ETIQUETA = 26;

/**
 * El nombre en una sola línea: si no cabe, se corta el título con «…» y el
 * código («· #14») queda entero, que es lo que lo distingue de sus vecinos.
 */
export function etiquetaEnUnaLinea(etiqueta: string, largo: number = LARGO_DE_LA_ETIQUETA): string {
  if (etiqueta.length <= largo) return etiqueta;
  const corte = etiqueta.lastIndexOf(' · #');
  const codigo = corte >= 0 ? etiqueta.slice(corte) : '';
  const titulo = corte >= 0 ? etiqueta.slice(0, corte) : etiqueta;
  const espacio = Math.max(1, largo - codigo.length - 1);
  return `${titulo.slice(0, espacio).trimEnd()}…${codigo}`;
}

/** Las filas del gráfico: top N por neto, de mayor a menor; sólo las que dejaron neto. */
export function topPorNeto(filas: RentabilidadFila[], n: number = TOP_DEL_GRAFICO): PuntoDelGrafico[] {
  return filas
    .filter((f) => f.netoPropietarioCop > 0)
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

/** Cuántas barras pinta el gráfico (para el título: «Top 2…», nunca más de las que se ven). */
export function cuantosEnElGrafico(filas: RentabilidadFila[]): number {
  return topPorNeto(filas).length;
}

/** El nombre del eje en una línea, con el nombre completo al pasar el mouse. */
function EtiquetaDelEje({
  x,
  y,
  payload,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
}) {
  const etiqueta = String(payload?.value ?? '');
  return (
    <text x={x} y={y} dx={-4} textAnchor="end" dominantBaseline="central" fontSize={11} fill={COLOR.eje}>
      <title>{etiqueta}</title>
      {etiquetaEnUnaLinea(etiqueta)}
    </text>
  );
}

interface Props {
  filas: RentabilidadFila[];
}

export function GraficoDeRentabilidad({ filas }: Props) {
  const { t } = useI18n();
  const datos = topPorNeto(filas);
  if (datos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-fg-muted" data-testid="grafico-de-rentabilidad-vacio">
        {t('inmobiliaria.reportes.rentabilidad.chart.empty')}
      </p>
    );
  }
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
            tick={<EtiquetaDelEje />}
            interval={0}
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
