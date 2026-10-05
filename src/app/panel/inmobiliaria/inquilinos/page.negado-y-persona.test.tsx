/**
 * QA-INQ-95 (04-10-2026):
 *  · E-18 / XE-03: un 403 de la lista apaga la pantalla entera (`EstadoDeDatos
 *    principal` → `PageGuard`); quedaban «Nuevo inquilino» y «Crear un contrato» vivos.
 *  · L-07: cerrada la ficha que pidió `?persona=`, la URL deja de pedirla
 *    (recargar la reabría).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string) => k,
    formatCurrency: (n: number) => String(n),
  }),
}));

/*
 * `?persona=<User.id>` — con quién viene la pantalla desde otro lado (hoy,
 * «Ver ficha del inquilino» en la bandeja de mensajes).
 */
const { paramsState } = vi.hoisted(() => ({ paramsState: { persona: null as string | null } }));
const { reemplazar } = vi.hoisted(() => ({ reemplazar: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (k: string) => (k === 'persona' ? paramsState.persona : null),
    toString: () => (paramsState.persona ? `persona=${paramsState.persona}` : ''),
  }),
  useRouter: () => ({ push: vi.fn(), replace: reemplazar }),
}));
const { denegar } = vi.hoisted(() => ({ denegar: vi.fn() }));
vi.mock('@/components/auth/acceso-de-la-pantalla', async (original) => ({
  ...(await original<typeof import('@/components/auth/acceso-de-la-pantalla')>()),
  useAccesoDeLaPantalla: () => ({ denegar, denegado: false }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

const { listaMock, carga } = vi.hoisted(() => ({
  listaMock: vi.fn(),
  carga: { cargando: false, error: null as unknown },
}));
vi.mock('@/lib/hooks/use-inquilinos', () => ({
  useInquilinos: () => ({
    inquilinos: listaMock(),
    cargando: carga.cargando,
    error: carga.error,
    refrescar: vi.fn(),
  }),
}));

/*
 * El permiso se deja pasar acá, pero se GUARDA con qué llave se preguntó: el
 * destino está protegido con `PageGuard module="contratos" action="create"` y
 * un botón detrás de otra llave sería un clic que rebota.
 */
const { llavesPedidas, negadas } = vi.hoisted(() => ({ llavesPedidas: [] as string[], negadas: new Set<string>() }));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () =>
    negadas.size === 0 ? null : { canAccess: (m: string, a: string) => !negadas.has(`${m}:${a}`) },
}));
vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({
    module,
    action,
    children,
  }: {
    module: string;
    action: string;
    children?: React.ReactNode;
  }) => {
    llavesPedidas.push(`${module}:${action}`);
    return negadas.has(`${module}:${action}`) ? null : children;
  },
}));

vi.mock('@/components/inmobiliaria/InquilinosTable', () => ({
  BarraDeInquilinos: () => null,
  InquilinosTable: () => null,
  // La ruta vive en la tabla (la usa también la fila sin arriendo) y la
  // página la importa de ahí: si el mock no la re-exporta, el `href` del
  // botón secundario queda en `undefined` y el test pasaría igual.
  RUTA_DEL_CONTRATO_MANUAL: '/panel/inmobiliaria/contratos/nuevo?modo=manual',
}));

/*
 * El cajón se prueba aparte; acá lo único que importa es A QUIÉN le abrieron,
 * así que el doble publica el `tenantId` que recibió.
 */
vi.mock('@/components/inmobiliaria/InquilinoDrawer', () => ({
  InquilinoDrawer: ({ persona, onCerrar }: { persona: { tenantId: string } | null; onCerrar: () => void }) =>
    persona ? (
      <button type="button" data-testid="cerrar-cajon" data-persona={persona.tenantId} onClick={onCerrar}>
        cerrar
      </button>
    ) : null,
}));

/*
 * El cajón de crear se prueba aparte (`NuevoInquilinoDrawer.test.tsx`). Acá
 * sólo importa que la página lo monte y que el botón lo abra, así que el
 * stub publica su estado en el DOM.
 */
vi.mock('@/components/inmobiliaria/NuevoInquilinoDrawer', () => ({
  NuevoInquilinoDrawer: ({ abierto }: { abierto: boolean }) => (
    <div data-testid="cajon-nuevo-inquilino" data-abierto={String(abierto)} />
  ),
}));

/** La deuda de migración es lo único que cambia entre los dos vacíos. */
const { deudaMock } = vi.hoisted(() => ({ deudaMock: vi.fn() }));
vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({
  useMigracionConDeuda: () => deudaMock(),
}));

import InquilinosPage from './page';
import type { Inquilino } from '@/lib/api/inquilinos.service';
import { ApiError } from '@/lib/api/client';


const UNA_PERSONA: Inquilino[] = [
  {
    tenantId: 't-1',
    nombre: 'Marta Ríos',
    email: 'marta@ejemplo.co',
    telefono: '3001234567',
    documento: '1020304050',
    arriendos: [
      {
        leaseId: 'l-1',
        contractId: 'c-1',
        estado: 'ACTIVE',
        desde: '2026-01-01',
        hasta: '2026-12-31',
        canonCop: 2_000_000,
        inmueble: { id: 'p-1', title: 'Apto 301', address: 'Calle 1', city: 'Bogotá' },
      },
    ],
  },
];

let host: HTMLDivElement;
let root: Root;

function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<InquilinosPage />);
  });
}

beforeEach(() => {
  carga.cargando = false;
  carga.error = null;
  deudaMock.mockReset();
  deudaMock.mockReturnValue(null);
  listaMock.mockReset();
  listaMock.mockReturnValue(UNA_PERSONA);
  paramsState.persona = null;
  reemplazar.mockReset();
  denegar.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('E-18 · un 403 de la lista apaga la pantalla', () => {
  it('avisa a PageGuard que el servidor negó el dato principal', () => {
    carga.error = new ApiError(403, 'Tu rol no incluye Contratos.', 'SIN_PERMISO_DE_MODULO');
    montar();
    expect(denegar).toHaveBeenCalledTimes(1);
  });

  it('un 500 no apaga nada', () => {
    carga.error = new ApiError(500, 'Algo falló.', 'ERROR_INTERNO');
    montar();
    expect(denegar).not.toHaveBeenCalled();
  });
});

describe('L-07 · ?persona= se abre una vez y, al cerrar, sale de la URL', () => {
  it('cerrar la ficha quita ?persona= del enlace', () => {
    paramsState.persona = 't-1';
    montar();
    const cerrar = host.querySelector('[data-testid="cerrar-cajon"]') as HTMLButtonElement;
    expect(cerrar?.getAttribute('data-persona')).toBe('t-1');
    act(() => cerrar.click());
    expect(reemplazar).toHaveBeenCalledTimes(1);
    expect(String(reemplazar.mock.calls[0][0])).not.toContain('persona=');
  });
});

/*
 * QA-INQ-95 (V-01 / V-03, 04-10-2026): el vacío repetía el título en la
 * descripción («Todavía no tienes inquilinos Todavía no tienes inquilinos.») y
 * al contador le ofrecía «Migrar contratos», que pide `contratos:create`.
 */
describe('InquilinosPage — el vacío de una inmobiliaria sin inquilinos', () => {
  let cont: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    cont = document.createElement('div');
    document.body.appendChild(cont);
    root = createRoot(cont);
    listaMock.mockReturnValue([]);
    deudaMock.mockReturnValue(null);
  });
  afterEach(() => {
    act(() => root.unmount());
    cont.remove();
    negadas.clear();
  });

  it('la descripción no repite el título', async () => {
    const es = (await import('@/lib/i18n/locales/es.json')).default as { inquilinos: Record<string, unknown> };
    expect(String(es.inquilinos.vacioDescripcion)).not.toMatch(/^Todavía no tienes inquilinos/);
  });

  it('con permiso: «Migrar contratos» y la descripción para cargar', () => {
    act(() => root.render(<InquilinosPage />));
    expect(cont.querySelector('a[href*="migr"]')).not.toBeNull();
    expect(cont.textContent).toContain('inquilinos.vacioDescripcion');
  });

  it('sin contratos:create: ni «Migrar contratos» ni «trae los tuyos»', () => {
    negadas.add('contratos:create');
    act(() => root.render(<InquilinosPage />));
    expect(cont.querySelector('a[href*="migr"]')).toBeNull();
    expect(cont.textContent).toContain('inquilinos.vacioDescripcionSinPermiso');
  });
});

