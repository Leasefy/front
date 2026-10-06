/**
 * QA-INQ (03-10-2026) · la lista de Inquilinos con la TABLA de verdad.
 *
 *  · I-01: «Inquilino A→Z» se aplicaba SÓLO dentro de la página (la tabla
 *    recibía las 10 filas y ordenaba ésas): la página 1 iba de Ana a
 *    Sebastián y la 2 volvía a empezar en Carlos. Se ordena TODO y después se
 *    pagina.
 *  · I-11: cambiar el orden vuelve a la página 1, y las cabeceras ordenables
 *    dicen su orden (`aria-sort`).
 *  · I-07: los tres números de arriba son del PORTAFOLIO; una búsqueda no los
 *    deja en «0 · $ 0».
 *  · I-25: el cartel de acceso negado dice «Inquilinos».
 *  · I-23: crear a alguien vuelve a leer el aviso de invitaciones.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => String(n),
    formatDate: (d: string) => d,
  }),
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}));

const { guardias } = vi.hoisted(() => ({ guardias: [] as Array<Record<string, unknown>> }));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    const { children, ...resto } = props;
    guardias.push(resto);
    return children;
  },
}));
vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({ useMigracionConDeuda: () => null }));

const { versiones } = vi.hoisted(() => ({ versiones: [] as number[] }));
vi.mock('@/components/inmobiliaria/InvitacionesPendientes', () => ({
  InvitacionesPendientes: ({ version = 0 }: { version?: number }) => {
    versiones.push(version);
    return null;
  },
}));
vi.mock('@/components/inmobiliaria/InquilinoDrawer', () => ({ InquilinoDrawer: () => null }));
const { alCrearDelCajon } = vi.hoisted(() => ({ alCrearDelCajon: { fn: null as null | ((i: unknown) => void) } }));
vi.mock('@/components/inmobiliaria/NuevoInquilinoDrawer', () => ({
  NuevoInquilinoDrawer: ({ onCreado, editando }: { onCreado: (i: unknown) => void; editando?: unknown }) => {
    if (!editando) alCrearDelCajon.fn = onCreado;
    return null;
  },
}));

import type { Inquilino } from '@/lib/api/inquilinos.service';

/** 25 personas con nombres desordenados, como los manda el back (por fecha). */
const NOMBRES = [
  'Sebastián', 'Carlos', 'Ana Sofía', 'Valentina', 'Bruno', 'Ñeco', 'Daniela', 'Óscar', 'Felipe', 'Iván',
  'Juliana', 'Zoe', 'Mateo', 'Luisa', 'Pablo', 'Eduardo', 'Gabriela', 'Hernán', 'Karen', 'Rocío',
  'Tomás', 'Úrsula', 'Wilson', 'Ximena', 'Yolanda',
];
function persona(nombre: string, i: number): Inquilino {
  return {
    tenantId: `t-${i}`,
    nombre,
    email: `${i}@correo.co`,
    telefono: null,
    documento: null,
    arriendos: [
      {
        leaseId: `l-${i}`,
        contractId: `c-${i}`,
        estado: 'ACTIVE',
        desde: '2026-01-01',
        hasta: '2026-12-31',
        canonCop: 1_000_000,
        inmueble: null,
      },
    ],
  };
}
const TODOS = NOMBRES.map(persona);

const { hook } = vi.hoisted(() => ({
  hook: {
    args: [] as Array<{ buscar: string; estado: string }>,
    opciones: undefined as undefined | { portafolio?: boolean },
    filas: (_f: { buscar: string; estado: string }) => [] as Inquilino[],
    portafolio: null as null | { personas: number; vigentes: number; canon: number },
    refrescar: vi.fn(),
  },
}));
vi.mock('@/lib/hooks/use-inquilinos', () => ({
  useInquilinos: (f: { buscar: string; estado: string }, o?: { portafolio?: boolean }) => {
    hook.args.push(f);
    hook.opciones = o;
    return {
      inquilinos: hook.filas(f),
      consulta: `${f.estado}|${f.buscar}`,
      cargando: false,
      error: null,
      refrescar: hook.refrescar,
      conteos: null,
      portafolio: hook.portafolio,
      cargandoPortafolio: false,
      errorPortafolio: null,
    };
  },
}));

import InquilinosPage from './page';

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

const nombresVisibles = () =>
  Array.from(host.querySelectorAll('[data-testid="inquilino-abrir"]')).map(
    (b) => b.querySelector('span')?.textContent,
  );

function clic(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** Las filas que SALEN se desmontan después de su salida (DESIGN §8b, «En las pruebas»). */
async function queSalgan() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 60));
  });
}

function irALaPagina(n: number) {
  const boton = Array.from(host.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === String(n),
  );
  expect(boton, `no hay botón de la página ${n}`).toBeTruthy();
  clic(boton!);
}

beforeEach(() => {
  hook.args.length = 0;
  hook.filas = () => TODOS;
  hook.portafolio = null;
  hook.refrescar.mockReset();
  guardias.length = 0;
  versiones.length = 0;
  alCrearDelCajon.fn = null;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const ordenAZ = [...NOMBRES].sort((a, b) => a.localeCompare(b, 'es-CO'));

describe('Inquilinos · I-01/I-11: se ordena TODO y después se pagina', () => {
  it('🔴 la página 1 son los 10 primeros de TODA la lista en A→Z, y la 2 sigue donde terminó la 1', async () => {
    montar();
    expect(nombresVisibles()).toEqual(ordenAZ.slice(0, 10));
    irALaPagina(2);
    await queSalgan();
    expect(nombresVisibles()).toEqual(ordenAZ.slice(10, 20));
  });

  it('🔴 cambiar el orden vuelve a la página 1 (con Z→A de TODA la lista)', async () => {
    montar();
    irALaPagina(2);
    await queSalgan();
    clic(host.querySelector('[data-testid="ordenar-nombre"]')!);
    await queSalgan();
    expect(nombresVisibles()).toEqual([...ordenAZ].reverse().slice(0, 10));
  });

  it('las cabeceras ordenables dicen su orden con aria-sort', () => {
    montar();
    const th = (campo: string) => host.querySelector(`[data-testid="ordenar-${campo}"]`)!.closest('th')!;
    expect(th('nombre').getAttribute('aria-sort')).toBe('ascending');
    expect(th('canon').getAttribute('aria-sort')).toBe('none');
    clic(host.querySelector('[data-testid="ordenar-nombre"]')!);
    expect(th('nombre').getAttribute('aria-sort')).toBe('descending');
  });
});

describe('Inquilinos · I-07: los KPI son del portafolio', () => {
  const tiles = () =>
    Array.from(host.querySelectorAll('[data-testid="kpi-valor"]')).map((t) => t.textContent);

  it('sin filtros salen de la lista (que ES el portafolio)', () => {
    montar();
    expect(tiles()).toEqual(['25', '25', '25000000']);
  });

  it('🔴 con una búsqueda que no encuentra a nadie, NO caen a 0 · $ 0: siguen siendo los del portafolio', () => {
    hook.filas = (f) => (f.buscar ? [] : TODOS);
    hook.portafolio = { personas: 25, vigentes: 25, canon: 25_000_000 };
    montar();
    const input = host.querySelector<HTMLInputElement>('[data-testid="inquilinos-buscar"] input, input[data-testid="inquilinos-buscar"]')!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'nadie');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(hook.args.at(-1)?.buscar).toBe('nadie');
    expect(tiles()).toEqual(['25', '25', '25000000']);
  });

  it('pide el portafolio al hook', () => {
    montar();
    // La página es la única que lo pide; el contrato manual usa el mismo hook sin él.
    expect(hook.opciones).toEqual({ portafolio: true });
  });
});

describe('Inquilinos · I-25 e I-23', () => {
  it('🔴 el cartel de acceso negado nombra la sección: «Inquilinos», no «Contratos»', () => {
    montar();
    expect(guardias[0]).toMatchObject({ module: 'contratos', seccion: 'Inquilinos' });
  });

  it('🔴 crear a alguien vuelve a leer el aviso de invitaciones', () => {
    montar();
    expect(versiones.at(-1)).toBe(0);
    act(() => {
      alCrearDelCajon.fn?.({ tenantId: 'nuevo', nombre: 'Sofía', email: 's@correo.co', arriendos: [] });
    });
    expect(versiones.at(-1)).toBe(1);
    expect(hook.refrescar).toHaveBeenCalled();
  });
});
