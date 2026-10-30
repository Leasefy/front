/**
 * Un código del PUC listo para `useOrdenDeLaTabla` (Nico, 28-10-2026: «que todas las tablas tengan lo de ordenamiento
 * general y por columnas»). El orden de las tablas compara los dígitos como NÚMERO («Apto 2» antes que «Apto 10»), y
 * eso con el PUC sale mal: 4135 iría antes que 110505. El plan se lee dígito a dígito —1, 11, 1105, 110505, 2, 28,
 * 4, 41, 4135—, así que cada dígito pasa a una letra (0 → a … 9 → j) y el texto se ordena como el plan.
 */
export function codigoDelPucParaOrdenar(codigo: string | null | undefined): string | null {
  const limpio = (codigo ?? '').trim();
  if (limpio === '') return null;
  return limpio.replace(/\d/g, (d) => String.fromCharCode(97 + Number(d)));
}
