import { copCompacto } from '@/lib/chat/tarjeta-del-estado';
import type { NumerosDelBriefing } from '@/lib/types/beta-chat';

type T = (clave: string, vars?: Record<string, string | number>) => string;

/**
 * Las cifras del día que salen en la bandeja de la llegada del chat (Nico,
 * 02-10-2026: «cifras reales en la bandeja: sí»).
 *
 * Salen SÓLO del briefing del micro (`numeros`). Regla de la casa: nunca un
 * número inventado ni un cero falso. Por eso una cifra se pinta sólo si es
 * mayor que cero: el micro rellena con 0 un conteo que falló (`contar(…, 0)`
 * en `piloto/briefing.ts`), así que un 0 no distingue «no hubo» de «no se
 * pudo contar». Sin cifras, la bandeja se queda con el nombre de la
 * inmobiliaria.
 *
 * Lo que el briefing NO trae —la cartera en mora, los contratos que vencen
 * este mes— no se calcula acá: eso lo tendría que mandar el micro.
 */
export function cifrasDeLaBandeja(numeros: NumerosDelBriefing | null | undefined, t: T): string[] {
  if (!numeros) return [];
  const cifras: string[] = [];
  const { recuperadoMesCop, pendientes, llamadasHoy, promesasCreadasHoy } = numeros;
  if (recuperadoMesCop && recuperadoMesCop > 0) {
    cifras.push(t('beta.welcome.bandeja.recuperadoMes', { valor: copCompacto(recuperadoMesCop) }));
  }
  const conteos: Array<[number | undefined, string, string]> = [
    [pendientes, 'beta.welcome.bandeja.decisionUna', 'beta.welcome.bandeja.decisiones'],
    [llamadasHoy, 'beta.welcome.bandeja.llamadaUna', 'beta.welcome.bandeja.llamadas'],
    [promesasCreadasHoy, 'beta.welcome.bandeja.promesaUna', 'beta.welcome.bandeja.promesas'],
  ];
  for (const [n, una, varias] of conteos) {
    if (!n || n <= 0) continue;
    cifras.push(n === 1 ? t(una) : t(varias, { n: n.toLocaleString('es-CO') }));
  }
  return cifras;
}
