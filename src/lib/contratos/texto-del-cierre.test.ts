import { describe, expect, it } from 'vitest';

import { textoDelCierre } from './texto-del-cierre';

const SIN_COMISION =
  'No sabemos la comisión de este inmueble: ni el archivo de inmuebles ni el contrato la traían. Escríbela en la ficha del contrato («Cómo se cobra» → Corregir) y la tabla de cuotas se arma.';

describe('textoDelCierre (CONTR-5)', () => {
  it('activo con tabla: nacieron sus cuotas', () => {
    expect(textoDelCierre({ status: 'active', sinTablaDeCuotas: null })).toContain('nacieron sus cuotas');
  });

  it('activo SIN tabla: no anuncia cuotas y dice qué falta y dónde arreglarlo', () => {
    const t = textoDelCierre({ status: 'active', sinTablaDeCuotas: SIN_COMISION });
    expect(t).not.toContain('nacieron sus cuotas');
    expect(t).toContain('todavía no tiene tabla de cuotas. No sabemos la comisión');
    expect(t).toContain('«Cómo se cobra» → Corregir');
  });

  it('firmado pero no activo todavía: se activa en su fecha de inicio', () => {
    expect(textoDelCierre({ status: 'signed', sinTablaDeCuotas: SIN_COMISION })).toContain('se activa en su fecha de inicio');
  });
});
