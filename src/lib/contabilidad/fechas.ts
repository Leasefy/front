/**
 * Días contables en el front.
 *
 * El back guarda `AsientoContable.fecha` como `@db.Date` y lo serializa como
 * `2026-02-05T00:00:00.000Z`; los filtros viajan como `AAAA-MM-DD` a secas.
 * Todo lo que se muestra o se manda pasa por acá para que un asiento del 1.º
 * no aparezca como del 31 por la zona horaria.
 */

const DIA = /^\d{4}-\d{2}-\d{2}/;

/** `2026-02-05T00:00:00.000Z` → `2026-02-05`. Devuelve `''` si no es un día. */
export function diaDe(valor: string | null | undefined): string {
  if (!valor) return '';
  const m = DIA.exec(valor);
  return m ? m[0] : '';
}

/** Un `Date` local → `AAAA-MM-DD`, sin pasar por UTC. */
export function aTextoDeDia(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hoy(ahora: Date = new Date()): string {
  return aTextoDeDia(ahora);
}

export function primerDiaDelMes(ahora: Date = new Date()): string {
  return aTextoDeDia(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
}

/**
 * `2026-02-05` → «5 feb 2026», sin que la zona horaria lo corra. Un texto que
 * no sea un día vuelve tal cual: mejor ver el crudo que un «Invalid Date».
 */
export function diaLegible(valor: string | null | undefined): string {
  const dia = diaDe(valor);
  if (!dia) return valor ?? '';
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** `true` si `a` y `b` son días válidos y `a > b`. */
export function rangoInvertido(a: string, b: string): boolean {
  return Boolean(diaDe(a) && diaDe(b) && a > b);
}

/** El mes anterior al de `ahora`, entero: `desde` el 1.º, `hasta` el último día, y su etiqueta `AAAA-MM`. */
export function rangoDelMesAnterior(ahora: Date = new Date()): { mes: string; desde: string; hasta: string } {
  const primero = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  // Día 0 del mes actual = último día del mes anterior.
  const ultimo = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
  return {
    mes: aTextoDeDia(primero).slice(0, 7),
    desde: aTextoDeDia(primero),
    hasta: aTextoDeDia(ultimo),
  };
}
