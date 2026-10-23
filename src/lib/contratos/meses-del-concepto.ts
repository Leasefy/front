/**
 * Los meses de un concepto del contrato (reunión con Portofino, 22-10-2026).
 * 🔁 Espejo de `back/src/contracts/conceptos-por-meses/plan-de-meses.ts`: el
 * reparto en partes iguales (lo que sobra a la ÚLTIMA) y la regla de que la suma
 * dé el total. El back vuelve a revisar todo y ubica cada mes.
 */

const NOMBRES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** «2026-12» → «diciembre de 2026». */
export function mesEnPalabras(mes: string): string {
  const [a, m] = mes.split('-');
  const i = Number(m) - 1;
  return NOMBRES[i] ? `${NOMBRES[i]} de ${a}` : mes;
}

/** «2026-12» → «dic 2026». */
export function mesCorto(mes: string): string {
  const [a, m] = mes.split('-');
  const i = Number(m) - 1;
  return CORTOS[i] ? `${CORTOS[i]} ${a}` : mes;
}

/** «2026-12» → «Dic» (el rótulo de la casilla del calendario). */
export function nombreCortoDelMes(mes: string): string {
  const corto = CORTOS[Number(mes.split('-')[1]) - 1];
  return corto ? corto.charAt(0).toUpperCase() + corto.slice(1) : mes;
}

/**
 * Los años que tocan esos meses, cada uno con sus 12 meses («2026-01»…«2026-12»),
 * para pintarlos como calendario (Nico 22-10: «no veo un calendario que deje
 * elegir los meses»). Los meses que no están en la lista quedan fuera del contrato.
 */
export function calendarioDeMeses(meses: readonly string[]): Array<{ anio: string; meses: string[] }> {
  const anios = [...new Set(meses.map((m) => m.slice(0, 4)))].sort();
  return anios.map((anio) => ({
    anio,
    meses: Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, '0')}`),
  }));
}

const centavos = (v: number) => Math.round(v * 100); // redondeo: no es plata (pasa a centavos enteros para comparar)

/** `total` en partes iguales entre los meses; lo que sobra va a la última. */
export function enPartesIguales(
  total: number,
  meses: readonly string[],
  conCentavos = false,
): Array<{ mes: string; valorCop: number }> {
  if (meses.length === 0) return [];
  const unidad = conCentavos ? 1 : 100;
  const t = centavos(total);
  const cada = Math.trunc(Math.trunc(t / unidad) / meses.length) * unidad; // redondeo: no es plata (unidades enteras)
  return meses.map((mes, i) => ({
    mes,
    valorCop: (i === meses.length - 1 ? t - cada * (meses.length - 1) : cada) / 100,
  }));
}

/** ¿Los valores de los meses suman el total, al centavo? */
export function sumanElTotal(total: number, partes: ReadonlyArray<{ valorCop: number }>): boolean {
  return partes.reduce((s, p) => s + centavos(p.valorCop), 0) === centavos(total);
}

export function sumaDeLasPartes(partes: ReadonlyArray<{ valorCop: number }>): number {
  return partes.reduce((s, p) => s + centavos(p.valorCop), 0) / 100;
}
