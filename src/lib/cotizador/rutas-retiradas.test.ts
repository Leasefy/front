import { describe, it, expect } from 'vitest';
import { esRutaRetirada } from './rutas-retiradas';

describe('esRutaRetirada (Asegurabilidad, revisora r25)', () => {
  const B = '/panel/inmobiliaria/postulaciones/asegurabilidad';
  it('comparar, ejecución e integraciones vuelven al Resumen antes de la puerta', () => {
    expect(esRutaRetirada(`${B}/comparar`)).toBe(true);
    expect(esRutaRetirada(`${B}/ejecucion/`)).toBe(true);
    expect(esRutaRetirada(`${B}/integraciones/x`)).toBe(true);
  });
  it('las pestañas vivas no', () => {
    for (const r of ['', '/aseguradoras', '/cola', '/costos', '/insights', '/nueva', '/configuracion']) {
      expect(esRutaRetirada(`${B}${r}`)).toBe(false);
    }
    expect(esRutaRetirada(null)).toBe(false);
  });
});
