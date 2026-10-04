import { describe, expect, it } from 'vitest';

import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { pasaGateDeFila, type NavFilterContext } from './agency-nav-filter';
import { modulosDelPanel, pestanasDelModulo } from './arquitectura-del-panel';

/**
 * 🔴 PG-R07 (QA de Pagos, 03-10-2026): el auxiliar de cartera hace recibos
 * (`cobros: view, create`) y la puerta de su trabajo —la Deuda del mes con
 * «Registrar un pago»— no estaba en su menú. Decisión de Nico (la
 * recomendada): la ve, sin Liquidaciones ni Dispersiones.
 */
const AUXILIAR: NavFilterContext = {
  canAccess: (modulo, accion) => modulo === 'cobros' && (accion === 'view' || accion === 'create'),
  isAdmin: false,
  agencyRole: AGENCY_ROLES.AUXILIAR_CARTERA,
};

describe('la Deuda del mes del auxiliar de cartera', () => {
  const pagos = modulosDelPanel().find((m) => m.key === 'pagos')!;

  it('ve la fila de Pagos (la Deuda del mes)', () => {
    expect(pasaGateDeFila(pagos, AUXILIAR)).toBe(true);
  });

  it('pero no Liquidaciones ni nada de lo que sale a los propietarios', () => {
    const liquidaciones = pestanasDelModulo(pagos).find((p) => p.href.endsWith('/pagos/liquidaciones'))!;
    expect(liquidaciones).toBeTruthy();
    expect(pasaGateDeFila(liquidaciones, AUXILIAR)).toBe(false);
  });

  it('el asesor sigue sin verla (no mueve plata)', () => {
    expect(
      pasaGateDeFila(pagos, { canAccess: () => false, isAdmin: false, agencyRole: AGENCY_ROLES.AGENTE }),
    ).toBe(false);
  });
});
