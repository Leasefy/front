/**
 * gate-del-contador.test.tsx — el front no puede ser más estricto que el back.
 *
 * 🔴 GATE-CONTADOR. Las tres pantallas de migración gateaban por
 * `module="configuracion"`, y `AGENCY_ROLE_DEFAULTS[CONTADOR].configuracion`
 * está VACÍO (back-erp, `agency/permissions/role-defaults.ts`). Pero sólo una de
 * las tres habla con un controller que pide ese permiso:
 *
 *   · `/migracion/terceros`  → `MigracionTercerosController`, que sí lleva
 *     `@RequirePermission('configuracion', …)`. El CONTADOR NO entra, y está bien.
 *   · `/migracion/puc`       → `PucController`
 *   · `/migracion/contables` → `AsientosController` + `MigracionContableController`
 *     Los dos van con `ContabilidadEscrituraGuard`, cuyo `ROLES_QUE_ESCRIBEN` es
 *     exactamente `[ADMIN, CONTADOR]`. Al contador —el rol que existe para armar
 *     el PUC y registrar la apertura— el front lo devolvía a la portada sin
 *     decirle nada, sobre un recurso que el back sí le abre.
 *
 * Este archivo congela las dos direcciones. Que el CONTADOR entre no alcanza:
 * borrar el guard entero también lo lograría, así que además se comprueba que el
 * AGENTE siga afuera de las dos pantallas de contabilidad, y que el CONTADOR
 * siga afuera de terceros.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { permisosMock, replaceMock } = vi.hoisted(() => ({
  permisosMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/panel/inmobiliaria/migracion',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}));

// El PageGuard es lo que se está probando: NO se mockea. Lo que se mockea es la
// fuente de permisos y el contenido de cada pantalla (que pega contra el back).
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => permisosMock(),
}));

vi.mock('@/components/migracion/PlanDeCuentas', () => ({
  PlanDeCuentas: () => <div data-testid="contenido">plan de cuentas</div>,
}));
vi.mock('@/components/migracion/RegistrosContables', () => ({
  RegistrosContables: () => <div data-testid="contenido">registros contables</div>,
}));
vi.mock('@/components/migracion/MigrarTerceros', () => ({
  MigrarTerceros: () => <div data-testid="contenido">terceros</div>,
}));

import PaginaDelPuc from './puc/page';
import PaginaDeContables from './contables/page';
import PaginaDeTerceros from './terceros/page';

/**
 * La matriz efectiva de cada rol, espejada de `AGENCY_ROLE_DEFAULTS` del back
 * (`agency/permissions/role-defaults.ts`). Sólo hacen falta los módulos que
 * estas pantallas podrían nombrar.
 */
const MODULOS_POR_ROL: Record<AgencyRole, Record<string, string[]>> = {
  // El ADMIN llega con `isAdmin: true` y `effectivePermissions: null`
  // (`AgencyService.buildPermissionsResponse`): no pasa por la matriz.
  ADMIN: {},
  AGENTE: { configuracion: [], reportes: [] },
  CONTADOR: { configuracion: [], reportes: ['view', 'export'] },
  VIEWER: { configuracion: [], reportes: ['view'] },
};

function comoRol(rol: AgencyRole) {
  const matriz = MODULOS_POR_ROL[rol];
  permisosMock.mockReturnValue({
    canAccess: (modulo: string, accion: string) =>
      rol === AGENCY_ROLES.ADMIN || (matriz[modulo] ?? []).includes(accion),
    isAdmin: rol === AGENCY_ROLES.ADMIN,
    isLoading: false,
    agencyRole: rol,
  });
}

let container: HTMLDivElement;
let root: Root | null = null;

async function abrir(Pagina: () => React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<Pagina />);
  });
  await act(async () => {});
}

/** Entró de verdad: se pintó el contenido y nadie la mandó a la portada. */
function entro() {
  return (
    container.querySelector('[data-testid="contenido"]') !== null && !replaceMock.mock.calls.length
  );
}

beforeEach(() => {
  permisosMock.mockReset();
  replaceMock.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

const CONTABILIDAD = [
  ['/migracion/puc', PaginaDelPuc],
  ['/migracion/contables', PaginaDeContables],
] as const;

describe('GATE-CONTADOR — migración de contabilidad', () => {
  it.each(CONTABILIDAD)('%s deja entrar al CONTADOR (el back se lo abre)', async (_ruta, Pagina) => {
    comoRol(AGENCY_ROLES.CONTADOR);
    await abrir(Pagina);

    expect(entro()).toBe(true);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it.each(CONTABILIDAD)('%s deja entrar al ADMIN', async (_ruta, Pagina) => {
    comoRol(AGENCY_ROLES.ADMIN);
    await abrir(Pagina);

    expect(entro()).toBe(true);
  });

  // Sin esto, «arreglar» el gate borrándolo también pasaría el test de arriba.
  it.each(CONTABILIDAD)('%s sigue cerrada para el AGENTE', async (_ruta, Pagina) => {
    comoRol(AGENCY_ROLES.AGENTE);
    await abrir(Pagina);

    expect(container.querySelector('[data-testid="contenido"]')).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria');
  });

  it.each(CONTABILIDAD)('%s sigue cerrada para el VIEWER', async (_ruta, Pagina) => {
    comoRol(AGENCY_ROLES.VIEWER);
    await abrir(Pagina);

    expect(container.querySelector('[data-testid="contenido"]')).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria');
  });
});

describe('GATE-CONTADOR — la asimetría de terceros es deliberada', () => {
  /*
   * `MigracionTercerosController` sí pide `@RequirePermission('configuracion', …)`.
   * Abrirle esta pantalla al CONTADOR lo mandaría a un 403 DESPUÉS de subir el
   * archivo, que es peor que no dejarlo entrar.
   */
  it('/migracion/terceros sigue cerrada para el CONTADOR', async () => {
    comoRol(AGENCY_ROLES.CONTADOR);
    await abrir(PaginaDeTerceros);

    expect(container.querySelector('[data-testid="contenido"]')).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria');
  });
});
