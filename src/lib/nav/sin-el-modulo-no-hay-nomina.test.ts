/**
 * 🔴 SIN EL MÓDULO COMPRADO, NÓMINA NO EXISTE EN EL MENÚ.
 *
 * Nico (17-09): «nómina va detrás de un feature flag por inmobiliaria, porque es
 * un módulo de pago: sólo se le muestra a las que lo compren… Con el flag apagado
 * la nómina NO aparece en el menú ni en ninguna pantalla».
 *
 * ── Por qué hace falta un test y no alcanza con la revisión ─────────────────
 *
 * Es un gate que **falla cerrado**, y un gate que falla cerrado se rompe en
 * silencio: si mañana alguien cambia `ctx.modulosPagos ?? []` por
 * `ctx.modulosPagos ?? ['nomina']` —para «que no desaparezca mientras carga»— la
 * fila aparece para todo el mundo, la pantalla responde 402 y nadie se entera
 * hasta que un cliente pregunta por qué ve un módulo que no compró.
 *
 * Lo que este test fija:
 *
 *   1. sin la lista (todavía no llegó) la fila NO se muestra;
 *   2. con la lista vacía tampoco;
 *   3. con otro módulo prendido tampoco;
 *   4. con `nomina` prendido sí — y sólo para ADMIN y CONTADOR;
 *   5. el gate del módulo de pago corre ANTES que el de rol y el de permiso: una
 *      fila sin comprar no se muestra ni a un administrador;
 *   6. ninguna OTRA fila del panel se rompe por esto.
 */

import { describe, expect, it } from 'vitest';

import { ARQUITECTURA_DEL_PANEL } from './arquitectura-del-panel';
import {
  filterAgencyNav,
  pasaGateDeFila,
  type NavFilterContext,
  type NavItemWithModule,
} from './agency-nav-filter';
import { filasDelSidebar } from './sidebar-del-panel';

const t = (k: string) => k;

function ctx(extra: Partial<NavFilterContext> = {}): NavFilterContext {
  return {
    canAccess: () => true,
    isAdmin: false,
    agencyRole: 'ADMIN',
    ...extra,
  };
}

function filasVisibles(c: NavFilterContext): string[] {
  return filterAgencyNav(filasDelSidebar(t, c), c)
    .filter((f) => f.kind !== 'section')
    .map((f) => f.href);
}

const HREF_DE_NOMINA = '/panel/inmobiliaria/nomina';

// Decisión 29 de Nico (22-10-2026), cambia la del 17-09: «debe de aparecer y si la inmobiliaria lo quiere, que lo
// pague». La fila de Nómina se ve aunque el módulo no esté comprado; la pantalla dice que es de pago y ofrece el plan.
describe('la fila de Nómina se ve aunque el módulo no esté comprado (decisión 29)', () => {
  it('sin la lista de módulos (todavía no llegó) se muestra', () => {
    expect(filasVisibles(ctx())).toContain(HREF_DE_NOMINA);
  });

  it('con la lista VACÍA también', () => {
    expect(filasVisibles(ctx({ modulosPagos: [] }))).toContain(HREF_DE_NOMINA);
  });

  it('con `nomina` prendido, igual', () => {
    expect(filasVisibles(ctx({ modulosPagos: ['nomina'] }))).toContain(HREF_DE_NOMINA);
  });
});

describe('quién ve Nómina cuando SÍ está comprada', () => {
  const prendida = { modulosPagos: ['nomina'] as const };

  it('el administrador y el contador', () => {
    for (const rol of ['ADMIN', 'CONTADOR']) {
      expect(filasVisibles(ctx({ ...prendida, agencyRole: rol }))).toContain(
        HREF_DE_NOMINA,
      );
    }
  });

  it('🔴 el ASESOR COMERCIAL no: no ve nada que tenga que ver con operación', () => {
    expect(
      filasVisibles(ctx({ ...prendida, agencyRole: 'AGENTE' })),
    ).not.toContain(HREF_DE_NOMINA);
  });

  it('🔴 el VIEWER tampoco: una nómina son los salarios de todo el mundo', () => {
    expect(
      filasVisibles(ctx({ ...prendida, agencyRole: 'VIEWER' })),
    ).not.toContain(HREF_DE_NOMINA);
  });
});

describe('el gate del módulo de pago, aislado', () => {
  const fila = { moduloPago: 'nomina' } as const;

  it('no pasa sin la lista, con la lista vacía ni con otro módulo', () => {
    expect(pasaGateDeFila(fila, ctx())).toBe(false);
    expect(pasaGateDeFila(fila, ctx({ modulosPagos: [] }))).toBe(false);
    expect(pasaGateDeFila(fila, ctx({ modulosPagos: ['x'] }))).toBe(false);
  });

  it('pasa con el módulo prendido', () => {
    expect(pasaGateDeFila(fila, ctx({ modulosPagos: ['nomina'] }))).toBe(true);
  });

  it('🔴 corre ANTES del gate de permiso: sin comprar no importa el permiso', () => {
    const conPermiso = ctx({ canAccess: () => true, modulosPagos: [] });
    expect(
      pasaGateDeFila({ ...fila, module: 'reportes' }, conPermiso),
    ).toBe(false);
  });

  it('una fila SIN `moduloPago` no se ve afectada por la lista', () => {
    expect(pasaGateDeFila({ module: null }, ctx({ modulosPagos: [] }))).toBe(true);
  });
});

describe('nada más del panel se rompe', () => {
  it('el menú es el mismo con el módulo prendido o apagado (decisión 29)', () => {
    const apagada = filasVisibles(ctx({ modulosPagos: [] }));
    const prendida = filasVisibles(ctx({ modulosPagos: ['nomina'] }));
    expect(prendida).toEqual(apagada);
  });

  it('ninguna fila del menú se esconde hoy por un módulo de pago', () => {
    const conModuloPago = ARQUITECTURA_DEL_PANEL.flatMap((g) =>
      g.modulos.filter((m) => m.moduloPago != null).map((m) => m.key),
    );
    expect(conModuloPago).toEqual([]);
  });
});
