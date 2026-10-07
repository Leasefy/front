/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026): el CONTADOR hace el plan de
 * cuentas y los registros contables desde el muro.
 *
 * Visto en el navegador: el contador abre «Plan de cuentas» en el muro y lee
 * «Este paso lo tiene que hacer un administrador de tu inmobiliaria: tu usuario
 * no tiene permiso para cargar estos datos». Pero el back abre esos dos pasos
 * por ROL (`ContabilidadEscrituraGuard`: administrador o contador) y las
 * páginas sueltas también (`PageGuard roles={[ADMIN, CONTADOR]}`); el muro los
 * medía con el módulo `configuracion`, que el contador no tiene. Justo la
 * persona que conoce el plan de cuentas quedaba afuera.
 */
import { describe, expect, it } from 'vitest';

import { puedeHacerElPaso } from './muro-reglas';

const conModulos = (modulos: string[]) => (modulo: string) => modulos.includes(modulo);

describe('quién puede hacer cada paso del muro (QA-MIGRACION-95)', () => {
  it('el contador: plan de cuentas y registros contables sí; terceros, inmuebles y contratos no', () => {
    const p = { canAccess: conModulos(['reportes', 'cobros']), agencyRole: 'CONTADOR' };
    expect(puedeHacerElPaso('puc', p)).toBe(true);
    expect(puedeHacerElPaso('contables', p)).toBe(true);
    expect(puedeHacerElPaso('propietarios', p)).toBe(false);
    expect(puedeHacerElPaso('inquilinos', p)).toBe(false);
    expect(puedeHacerElPaso('propiedades', p)).toBe(false);
    expect(puedeHacerElPaso('contratos', p)).toBe(false);
  });

  it('el asesor (AGENTE) no hace la contabilidad aunque tenga algún módulo', () => {
    const p = { canAccess: conModulos(['portafolio', 'configuracion']), agencyRole: 'AGENTE' };
    expect(puedeHacerElPaso('puc', p)).toBe(false);
    expect(puedeHacerElPaso('contables', p)).toBe(false);
    expect(puedeHacerElPaso('propiedades', p)).toBe(true);
  });

  it('el administrador hace todo', () => {
    const p = { canAccess: () => true, agencyRole: 'ADMIN' };
    for (const id of ['propietarios', 'inquilinos', 'propiedades', 'contratos', 'puc', 'contables'] as const) {
      expect(puedeHacerElPaso(id, p)).toBe(true);
    }
  });

  it('sin saber el rol todavía, el plan de cuentas se mide por el módulo de siempre', () => {
    expect(puedeHacerElPaso('puc', { canAccess: conModulos(['configuracion']), agencyRole: null })).toBe(true);
    expect(puedeHacerElPaso('puc', { canAccess: conModulos([]), agencyRole: null })).toBe(false);
  });
});
