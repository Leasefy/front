'use client';

/**
 * El recaudo acumulado por día del mes: el mes en foco contra el anterior, en
 * dos líneas (Nico, 2026-09-25, lo que muestra Palomma).
 *
 * «Llegó» es la MISMA definición de la pantalla: recibos de caja no anulados,
 * por su fecha. La línea del mes anterior va entera —es la referencia de hasta
 * dónde se llegó— y la del mes en curso se corta HOY: el back manda `null` en
 * los días que no pasaron y la línea se detiene ahí en vez de dibujar una
 * meseta que parecería «ya no entró nada».
 *
 * Colores en hex como `GraficoDeRecaudo` (recharts pinta atributos SVG y no
 * resuelve `var(--…)`): cobalt para el mes en foco —la cifra que importa— y el
 * neutro cálido del eje, punteado, para el anterior. El punteado es lo que las
 * separa sin depender sólo del color.
 */

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DiaDeLaComparativa } from '@/lib/api/recaudo.types';
import { formatCurrency } from '@/lib/format';
import { abreviarCop } from './GraficoDeRecaudo';

const COLOR = {
  esteMes: '#1A40FF',
  mesAnterior: '#6E6A63',
  eje: '#6E6A63',
  grilla: '#E5E2DC',
} as const;

interface Props {
  dias: DiaDeLaComparativa[];
  /** El nombre de cada línea en la leyenda y el tooltip: «Septiembre», «Agosto». */
  nombreEsteMes: string;
  nombreMesAnterior: string;
  /** El resumen en palabras, para quien no ve el gráfico. */
  resumen: string;
  /** «Día 10», traducido por quien llama. */
  rotuloDelDia: (dia: number) => string;
}

export function GraficoDiaADia({
  dias,
  nombreEsteMes,
  nombreMesAnterior,
  resumen,
  rotuloDelDia,
}: Props) {
  const nombre: Record<string, string> = {
    esteMesCop: nombreEsteMes,
    mesAnteriorCop: nombreMesAnterior,
  };
  return (
    <div className="h-[240px] w-full font-mono" role="img" aria-label={resumen} data-testid="grafico-dia-a-dia">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dias} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={COLOR.grilla} strokeDasharray="2 4" />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: COLOR.eje }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tickFormatter={abreviarCop}
            tick={{ fontSize: 11, fill: COLOR.eje }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            formatter={(valor, clave) => [formatCurrency(Number(valor)), nombre[String(clave)] ?? String(clave)]}
            labelFormatter={(dia) => rotuloDelDia(Number(dia))}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: `1px solid ${COLOR.grilla}`,
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <Legend
            iconType="plainline"
            iconSize={14}
            formatter={(clave) => nombre[String(clave)] ?? String(clave)}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="mesAnteriorCop"
            stroke={COLOR.mesAnterior}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="esteMesCop"
            stroke={COLOR.esteMes}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
