/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — TE-08: con «reemplazar»
 * marcado, la explicación ya no dice que lo que tiene valor no se toca, y el
 * aviso está bien dicho.
 */
import { describe, it, expect } from 'vitest';
import { alcanceDeLasIncompletas, avisoDeReemplazo, explicacionDelValorPorDefecto } from './valor-por-defecto';

describe('las frases del valor por defecto (TE-08)', () => {
  it('sin reemplazar: sólo lo vacío', () => {
    expect(explicacionDelValorPorDefecto(false)).toMatch(/lo que ya trae valor no se toca/);
  });
  it('🔴 reemplazando: no promete que lo que tiene valor no se toca', () => {
    expect(explicacionDelValorPorDefecto(true)).not.toMatch(/no se toca/);
    expect(explicacionDelValorPorDefecto(true)).toMatch(/también donde ya hay un valor/);
  });
  it('🔴 el aviso de lo que se pierde, bien dicho en singular y plural', () => {
    expect(avisoDeReemplazo(1)).toBe('Ojo: se pierde el valor que ya traía la fila.');
    expect(avisoDeReemplazo(1250)).toBe('Ojo: se pierde el valor que ya traían las 1.250.');
  });
  it('🔴 «Crear con datos por completar» con una sola fila no dice «las fila»', () => {
    expect(alcanceDeLasIncompletas(1)).toBe('Sólo cambia la fila si únicamente le falta el documento o su tipo; si no, sigue acá.');
    expect(alcanceDeLasIncompletas(3)).toMatch(/^Sólo cambia las filas /);
  });
});
