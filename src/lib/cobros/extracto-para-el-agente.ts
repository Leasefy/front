/**
 * El extracto, como lo lee el AGENTE de conciliación (el micro).
 *
 * El micro lee el CSV de cada banco por POSICIÓN fija
 * (`agent/src/conciliacion/sources/statement-source.ts`): Bancolombia
 * «fecha;descripción;débito;crédito;referencia», Davivienda
 * «fecha,descripción,valor,,referencia». Un archivo con otro orden, un Excel o
 * un extracto con la cuenta arriba no entraba.
 *
 * 🔴 20-10-2026 (Nico: «igual para conciliación»): el navegador lo lee COMO
 * VENGA (`lib/importar/leer-planilla.ts` con los campos del extracto) y acá se
 * reescribe en el formato del banco elegido. El micro no cambia.
 */
import type { FilaDeExtracto } from '@/lib/api/conciliacion-bancaria.types';

export type BancoDelAgente = 'bancolombia' | 'davivienda';

/** Sin el separador ni saltos de línea: el micro parte la línea a mano, sin comillas. */
function limpio(texto: string | undefined, separador: string): string {
  return (texto ?? '').replace(/[\r\n]+/g, ' ').split(separador).join(' ').trim();
}

/**
 * Las líneas en el CSV del banco. El valor va CON signo (positivo entra,
 * negativo sale): en Bancolombia, en la columna de débito, que el micro lee
 * siempre que no diga «-».
 */
export function csvParaElAgente(filas: readonly FilaDeExtracto[], banco: BancoDelAgente): string {
  if (banco === 'bancolombia') {
    const lineas = filas.map((f) =>
      [f.fecha, limpio(f.descripcion, ';'), String(Math.round(f.valorCop)), '', limpio(f.referencia, ';')].join(';'),
    );
    return ['Fecha;Descripcion;Debito;Credito;Referencia', ...lineas].join('\n');
  }
  const lineas = filas.map((f) =>
    [f.fecha, limpio(f.descripcion, ','), String(Math.round(f.valorCop)), '', limpio(f.referencia, ',')].join(','),
  );
  return ['Fecha,Descripcion,Valor,,Referencia', ...lineas].join('\n');
}
