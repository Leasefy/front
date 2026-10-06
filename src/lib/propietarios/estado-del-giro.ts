/**
 * QA-PROP-95 C-10 (04-10-2026): el estado del GIRO de lo que dice el extracto.
 * El back ya manda, por línea y en el total, cuánto se giró, cuánto va en un
 * lote sin pagar y cuánto falta (`giradoCop + enGiroCop + porGirarCop =
 * netAmount`). El PDF lo decía («De eso, ya girado…», «En un giro pendiente de
 * pago…»); el extracto en pantalla no lo mostraba.
 */
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface ConGiro {
  giradoCop?: number | null;
  enGiroCop?: number | null;
  porGirarCop?: number | null;
}

const PARTES = [
  ['giradoCop', 'Girado'],
  ['enGiroCop', 'En giro'],
  ['porGirarCop', 'Por girar'],
] as const;

/** «Girado», «En giro», «Por girar», o «Girado $ 1 · Por girar $ 2» si se parte. `null` sin datos. */
export function estadoDelGiroDeLaLinea(l: ConGiro): string | null {
  if (l.giradoCop == null && l.enGiroCop == null && l.porGirarCop == null) return null;
  const conPlata = PARTES.filter(([k]) => (l[k] ?? 0) > 0)
  if (conPlata.length === 0) return null;
  if (conPlata.length === 1) return conPlata[0][1];
  return conPlata.map(([k, etiqueta]) => `${etiqueta} ${formatCurrency(l[k] ?? 0)}`).join(' · ');
}

/** Las partes del total con plata, en el orden del PDF. */
export function partesDelGiro(t: { totalGirado?: number | null; totalEnGiro?: number | null; totalPorGirar?: number | null }) {
  return [
    { etiqueta: 'De eso, ya girado', valor: t.totalGirado ?? 0 },
    { etiqueta: 'En un giro pendiente de pago', valor: t.totalEnGiro ?? 0 },
    { etiqueta: 'Por girar', valor: t.totalPorGirar ?? 0 },
  ].filter((p) => p.valor > 0);
}
