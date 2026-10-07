/**
 * El año con que abre «Mis informes» (portal del propietario).
 *
 * 🔴 QA-PROP-95 C-35 (04-10-2026): abre en el año ANTERIOR si está entre los
 * que se ofrecen —es el que se declara, y es la misma regla del back cuando no
 * se le pide año (`informes-del-propietario.controller.ts`)—; si no, en el más
 * nuevo. Antes abría siempre el más nuevo: en octubre, un año a medio causar.
 */
export function anioQueAbreElCertificado(
  anios: readonly number[],
  hoy: Date = new Date(),
): number | null {
  if (anios.length === 0) return null;
  const elQueSeDeclara = hoy.getFullYear() - 1;
  return anios.includes(elQueSeDeclara) ? elQueSeDeclara : Math.max(...anios);
}
