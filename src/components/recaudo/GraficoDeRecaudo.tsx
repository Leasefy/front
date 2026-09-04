'use client';

/**
 * Doce meses de facturado, recaudado y dispersado, en barras.
 *
 * Los colores van en hex como en el resto de los gráficos del repo
 * (`cotizador/*Chart.tsx`): recharts pinta atributos SVG y no resuelve
 * `var(--…)`. Cobalt para lo que llegó —la cifra que importa—, el neutro
 * cálido para lo facturado y el verde de apoyo para lo que salió
 * (DESIGN §Tinted: los tonos de apoyo son para gráficos).
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PuntoDeLaSerie } from '@/lib/api/recaudo.types';
import { formatCurrency } from '@/lib/format';
import { mesCorto } from '@/lib/recaudo/meses';

const COLOR = {
  facturado: '#C9C5BE',
  recaudado: '#1A40FF',
  dispersado: '#307E57',
  eje: '#6E6A63',
  grilla: '#E5E2DC',
} as const;

const NOMBRE: Record<'facturadoCop' | 'recaudadoCop' | 'dispersadoCop', string> = {
  facturadoCop: 'Facturado',
  recaudadoCop: 'Llegó',
  dispersadoCop: 'Dispersado',
};

/** «$ 1,2 M» / «$ 850 k» para el eje, donde no cabe la cifra entera. */
export function abreviarCop(valor: number): string {
  const abs = Math.abs(valor);
  const signo = valor < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${signo}$ ${m.toLocaleString('es-CO', { maximumFractionDigits: m >= 10 ? 0 : 1 })} M`;
  }
  if (abs >= 1_000) {
    return `${signo}$ ${Math.round(abs / 1_000).toLocaleString('es-CO')} k`;
  }
  return `${signo}$ ${abs.toLocaleString('es-CO')}`;
}

interface Props {
  serie: PuntoDeLaSerie[];
}

export function GraficoDeRecaudo({ serie }: Props) {
  const datos = serie.map((p) => ({ ...p, etiqueta: mesCorto(p.month) }));

  return (
    <div className="h-[260px] w-full font-mono text-xs" data-testid="grafico-de-recaudo">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={COLOR.grilla} strokeDasharray="2 4" />
          <XAxis
            dataKey="etiqueta"
            tick={{ fontSize: 11, fill: COLOR.eje }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={abreviarCop}
            tick={{ fontSize: 11, fill: COLOR.eje }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            cursor={{ fill: COLOR.grilla, opacity: 0.4 }}
            formatter={(valor, nombre) => [
              formatCurrency(Number(valor)),
              NOMBRE[String(nombre) as keyof typeof NOMBRE] ?? String(nombre),
            ]}
            labelFormatter={(etiqueta) => String(etiqueta)}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: `1px solid ${COLOR.grilla}`,
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <Legend
            iconType="square"
            iconSize={10}
            formatter={(valor) => NOMBRE[String(valor) as keyof typeof NOMBRE] ?? String(valor)}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="facturadoCop" fill={COLOR.facturado} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="recaudadoCop" fill={COLOR.recaudado} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="dispersadoCop" fill={COLOR.dispersado} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
