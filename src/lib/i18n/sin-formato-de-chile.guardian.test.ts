/**
 * Guardián (21-10-2026): Leasefy es colombiano. 26 archivos formateaban con
 * `'es-CL'` (Chile): la plata en pesos salía «COP 2.350.000» en vez de
 * «$ 2.350.000» («Generar el contrato» del propietario) y las fechas cortas
 * «21 oct» en vez de «21 de oct». Todo pasa por `'es-CO'`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..');

function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre === 'node_modules') continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|tsx)$/.test(ruta) && !/\.test\.tsx?$/.test(ruta)) salida.push(ruta);
  }
  return salida;
}

describe('sin formato de Chile', () => {
  it('ningún archivo formatea con el locale es-CL', () => {
    const malos = archivos(SRC)
      .filter((ruta) => /['"`]es-CL['"`]/.test(readFileSync(ruta, 'utf8')))
      .map((ruta) => ruta.replace(SRC + '/', 'src/'));
    expect(malos).toEqual([]);
  });

  it('la plata en pesos con es-CO lleva el signo, no «COP»', () => {
    const plata = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(2_350_000);
    expect(plata).not.toContain('COP');
    expect(plata).toContain('$');
  });
});
