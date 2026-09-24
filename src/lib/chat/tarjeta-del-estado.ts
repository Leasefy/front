import type { ChatDataTile } from '@leasefy/cadence';
import type { ChatSnapshot } from '@/lib/types/beta-chat';

/**
 * La tarjeta «estado de hoy» que va debajo de una respuesta cuando las cifras
 * de la inmobiliaria cambiaron.
 *
 * ── Por qué cambió (Nico, 23-09) ───────────────────────────────────────────
 * Las cifras salían del esquema viejo del agente (`agent.*`): en una
 * inmobiliaria migrada al ERP eran «0 deudores · $ 0 pagado hoy · 0 llamadas»
 * debajo de CADA primera respuesta —el mismo origen del «Sin datos de cartera»
 * del paso—. Ahora, si el micro manda la cartera del ERP (la cifra de Pagos →
 * Cartera), esa manda; las del agente sólo aparecen si dicen algo (> 0). Un
 * micro viejo, sin la cartera del ERP, se ve como antes.
 */

type T = (clave: string, vars?: Record<string, string | number>) => string;

/** COP compacto para un mosaico angosto: 8_420_000 → «$ 8,4 M». */
export function copCompacto(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(valor);
}

export function mosaicosDelEstado(s: ChatSnapshot, t: T): ChatDataTile[] {
  const conErp = typeof s.carteraCop === 'number';
  const mosaicos: ChatDataTile[] = [];
  if (conErp) {
    mosaicos.push({ label: t('beta.estadoDeHoy.cartera'), value: copCompacto(s.carteraCop ?? 0) });
    if (typeof s.contratosEnCartera === 'number') {
      mosaicos.push({ label: t('beta.estadoDeHoy.contratosEnCartera'), value: s.contratosEnCartera });
    }
  }
  const delAgente: Array<[string, number, ChatDataTile['value']]> = [
    ['beta.estadoDeHoy.deudores', s.deudoresActivos, s.deudoresActivos],
    ['beta.estadoDeHoy.pagadoHoy', s.pagadoHoyCop, copCompacto(s.pagadoHoyCop)],
    ['beta.estadoDeHoy.llamadas', s.llamadasHoy, s.llamadasHoy],
  ];
  for (const [clave, n, valor] of delAgente) {
    // Sin la cartera del ERP, las tres de siempre (como antes); con ella, sólo
    // las que dicen algo.
    if (!conErp || n > 0) mosaicos.push({ label: t(clave), value: valor });
  }
  if (s.escalacionesPendientes > 0) {
    mosaicos.push({ label: t('beta.estadoDeHoy.escalaciones'), value: s.escalacionesPendientes });
  }
  if (s.enPrejuridico > 0) {
    mosaicos.push({ label: t('beta.estadoDeHoy.prejuridico'), value: s.enPrejuridico });
  }
  return mosaicos;
}
