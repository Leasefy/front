'use client';

/**
 * Doce meses de deuda, recaudo y dispersión, en barras.
 *
 * 🔴 La primera barra era «Facturado» —los cobros EMITIDOS— y el 2026-09-16
 * pasó a ser «Se debe» (`deudaDelMesCop`, las cuotas del contrato). El motivo
 * está en `Recaudo.tsx`: la inmobiliaria migrada tiene 0 cobros y 30.951
 * cuotas, así que esa barra era una línea plana en cero sobre miles de
 * millones de deuda real, y al lado de «Llegó» daba a entender que se recaudó
 * todo lo que había.
 *
 * Los colores van en hex como en el resto de los gráficos del repo
 * (`cotizador/*Chart.tsx`): recharts pinta atributos SVG y no resuelve
 * `var(--…)`. Cobalt para lo que llegó —la cifra que importa—, el neutro
 * cálido para lo que se debe y el verde de apoyo para lo que salió
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
import { useLocaleDelPanel, useTr } from '@/lib/i18n/use-tr';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

const COLOR = {
  seDebe: '#C9C5BE',
  recaudado: '#1A40FF',
  dispersado: '#307E57',
  eje: '#6E6A63',
  grilla: '#E5E2DC',
} as const;

const NOMBRE: Record<'deudaDelMesCop' | 'recaudadoCop' | 'dispersadoCop', string> = {
  deudaDelMesCop: 'Se debe',
  recaudadoCop: 'Llegó',
  dispersadoCop: 'Girado', // 22-10: la voz dice «girado» (como el Tablero)
};

/** «$ 1,2 M» / «$ 850 k» para el eje, donde no cabe la cifra entera. */
export function abreviarCop(valor: number): string {
  const abs = Math.abs(valor);
  const signo = valor < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${signo}$ ${m.toLocaleString(localeDeLasCifras(), { maximumFractionDigits: m >= 10 ? 0 : 1 })} M`;
  }
  if (abs >= 1_000) {
    return `${signo}$ ${Math.round(abs / 1_000).toLocaleString(localeDeLasCifras())} k`;
  }
  return `${signo}$ ${abs.toLocaleString(localeDeLasCifras())}`;
}

interface Props {
  serie: PuntoDeLaSerie[];
}

export function GraficoDeRecaudo({ serie }: Props) {
  const tr = useTr();
  const locale = useLocaleDelPanel();
  // Ronda 11: los meses viejos sin nada (antes de que la inmobiliaria empezara)
  // no se pintan; desde el primero con deuda, recaudo o giros, todos.
  const enOrden = [...serie].sort((x, y) => x.month.localeCompare(y.month));
  const primero = enOrden.findIndex((p) => p.deudaDelMesCop > 0 || p.recaudadoCop > 0 || p.dispersadoCop > 0);
  const datos = (primero > 0 ? enOrden.slice(primero) : enOrden).map((p) => ({ ...p, etiqueta: mesCorto(p.month, locale) }));

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
              tr(NOMBRE[String(nombre) as keyof typeof NOMBRE] ?? String(nombre)),
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
            formatter={(valor) => tr(NOMBRE[String(valor) as keyof typeof NOMBRE] ?? String(valor))}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="deudaDelMesCop" fill={COLOR.seDebe} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="recaudadoCop" fill={COLOR.recaudado} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="dispersadoCop" fill={COLOR.dispersado} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
