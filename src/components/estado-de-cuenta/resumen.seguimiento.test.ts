/**
 * 🔴 P-16 (QA-PROP, SEGUIMIENTO-FRONT 03-10-2026; back 5731a4e2): la «próxima
 * cuota» del PROPIETARIO es la suma del próximo mes de TODOS sus contratos, y la
 * manda el back en `doc.proximaCuota`. Tomar la primera fila daba la de UN
 * contrato: la ficha decía $1.982.250 y el estado de cuenta $1.585.800 del
 * mismo propietario.
 */
import { describe, expect, it } from 'vitest';

import { resumirElCliente } from './resumen';
import { contrato, estadoDeCuenta } from './ejemplo-de-prueba';

const HOY = '2026-09-13';

describe('resumirElCliente — la próxima del propietario (P-16)', () => {
  it('🔴 con `proximaCuota` del back, es ESA (la suma), no la primera fila', () => {
    const doc = { ...estadoDeCuenta({ contratos: [contrato()] }), proximaCuota: { fecha: '2026-10-01', monto: 3_170_000, contratos: 2 } };
    const r = resumirElCliente(doc, HOY);
    expect(r.proxima?.fecha).toBe('2026-10-01');
    expect(r.proxima?.valor).toBe(3_170_000);
  });

  it('con `proximaCuota: null` (nada por vencer) no inventa una próxima con la fila', () => {
    const doc = { ...estadoDeCuenta({ contratos: [contrato()] }), proximaCuota: null };
    expect(resumirElCliente(doc, HOY).proxima).toBeNull();
  });

  it('sin el campo (inquilino, back anterior): la primera fila que no ha vencido, como siempre', () => {
    const r = resumirElCliente(estadoDeCuenta({ contratos: [contrato()] }), HOY);
    expect(r.proxima?.fecha).toBe('2026-09-21');
  });
});
