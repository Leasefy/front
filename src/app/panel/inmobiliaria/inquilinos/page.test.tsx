/**
 * page.test.tsx — Inquilinos: el vacío (que son DOS) y el camino para cargar
 * UNO solo.
 *
 * 1. **Nada migrado**: Nico (2026-09-03) «¿por qué tengo migrar contrato como
 *    CTA secundario?». «Migrar contratos» es el PRIMARIO: el back arma esta
 *    lista con `lease.findMany` agrupado por `tenantId`, así que lo único que
 *    la llena es un contrato.
 *
 * 2. **Migrado y a medias** (2026-09-03, tarde): 91 contratos migrados, 89 sin
 *    inmueble ⇒ cero arriendos ⇒ esta lista vacía. Decir «traé los que ya
 *    tenés en otro sistema» es pedirle migrar a alguien que acaba de migrar.
 *    Se dice el número real y el botón lleva a completar la migración.
 *
 * 3. **Uno solo** (2026-09-04): «¿y si no quiero migrar un montón de
 *    inquilinos sino que quiero crear uno solo, qué?». El contrato manual
 *    (`?modo=manual`) es ese camino, y tiene que estar en los dos vacíos Y con
 *    la lista llena — quien ya tiene 40 inquilinos no vuelve a ver un vacío
 *    nunca más. La ruta importa: `/contratos/nuevo` a secas responde «Falta el
 *    parámetro applicationId».
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

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

const { listaMock } = vi.hoisted(() => ({ listaMock: vi.fn() }));
vi.mock('@/lib/hooks/use-inquilinos', () => ({
  useInquilinos: () => ({
    inquilinos: listaMock(),
    cargando: false,
    error: null,
    refrescar: vi.fn(),
  }),
}));

/*
 * El permiso se deja pasar acá, pero se GUARDA con qué llave se preguntó: el
 * destino está protegido con `PageGuard module="contratos" action="create"` y
 * un botón detrás de otra llave sería un clic que rebota.
 */
const { llavesPedidas } = vi.hoisted(() => ({ llavesPedidas: [] as string[] }));
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
    return children;
  },
}));

vi.mock('@/components/inmobiliaria/InquilinosTable', () => ({
  BarraDeInquilinos: () => null,
  InquilinosTable: () => null,
}));

vi.mock('@/components/inmobiliaria/InquilinoDrawer', () => ({
  InquilinoDrawer: () => null,
}));

/** La deuda de migración es lo único que cambia entre los dos vacíos. */
const { deudaMock } = vi.hoisted(() => ({ deudaMock: vi.fn() }));
vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({
  useMigracionConDeuda: () => deudaMock(),
}));

import InquilinosPage from './page';
import type { Inquilino } from '@/lib/api/inquilinos.service';
import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';

const RUTA_MANUAL = '/panel/inmobiliaria/contratos/nuevo?modo=manual';

const UNA_PERSONA: Inquilino[] = [
  {
    tenantId: 't-1',
    nombre: 'Marta Ríos',
    email: 'marta@ejemplo.co',
    telefono: '3001234567',
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
  deudaMock.mockReset();
  listaMock.mockReset();
  listaMock.mockReturnValue([]);
  llavesPedidas.length = 0;
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe('/panel/inmobiliaria/inquilinos — vacío sin nada migrado', () => {
  beforeEach(() => {
    deudaMock.mockReturnValue(null);
    montar();
  });

  it('el primario sigue siendo migrar contratos', () => {
    const vacio = host.querySelector('[data-testid="sin-datos"]');
    expect(vacio).not.toBeNull();
    expect(vacio!.getAttribute('data-caso')).toBe('vacio');

    const enlaces = Array.from(vacio!.querySelectorAll('a'));
    expect(enlaces[0].getAttribute('href')).toBe('/panel/inmobiliaria/contratos/migrar');
    expect(enlaces[0].textContent).toContain('inquilinos.vacioContrato');

    // El paso «Terceros» de la migración no lleva botón: carga personas, no
    // arriendos, y esta lista seguiría vacía.
    expect(vacio!.querySelectorAll('button')).toHaveLength(0);
    expect(host.querySelector('a[href*="migracion/terceros"]')).toBeNull();
    expect(vacio!.textContent).toContain('inquilinos.vacioDescripcion');
  });

  it('🔴 y al lado ofrece cargar uno a mano — migrar no es la única salida', () => {
    const vacio = host.querySelector('[data-testid="sin-datos"]')!;
    const manual = vacio.querySelector('[data-testid="crear-contrato-manual"]');
    expect(manual).not.toBeNull();
    expect(manual!.getAttribute('href')).toBe(RUTA_MANUAL);
    expect(manual!.textContent).toContain('inquilinos.crearContrato');
  });
});

describe('/panel/inmobiliaria/inquilinos — vacío con la migración a medias', () => {
  beforeEach(() => {
    deudaMock.mockReturnValue({
      contratos: 91,
      sinInmueble: 89,
      sinPropietario: 89,
      pendientes: 0,
      sinInquilino: null,
    });
    montar();
  });

  it('🔴 no le pide migrar a quien ya migró', () => {
    const vacio = host.querySelector('[data-testid="sin-datos"]')!;
    expect(vacio.textContent).not.toContain('inquilinos.vacioDescripcion');
    expect(vacio.textContent).not.toContain('inquilinos.vacioContrato');
  });

  it('nombra la deuda de la migración y trae el botón que la completa', () => {
    const vacio = host.querySelector('[data-testid="sin-datos"]')!;
    expect(vacio.textContent).toContain('migracion.enLaLista.titulo');
    expect(vacio.textContent).toContain('migracion.enLaLista.detalle');

    const enlaces = Array.from(vacio.querySelectorAll('a'));
    expect(enlaces[0].getAttribute('href')).toBe('/panel/inmobiliaria/contratos/migrar');
    expect(enlaces[0].textContent).toContain('migracion.enLaLista.accion');
  });

  it('🔴 completar la migración NO tapa el camino de cargar uno a mano', () => {
    const manual = host
      .querySelector('[data-testid="sin-datos"]')!
      .querySelector('[data-testid="crear-contrato-manual"]');
    expect(manual).not.toBeNull();
    expect(manual!.getAttribute('href')).toBe(RUTA_MANUAL);
  });
});

describe('/panel/inmobiliaria/inquilinos — el camino de cargar UNO solo', () => {
  it('el botón del encabezado está aunque la lista tenga filas', () => {
    deudaMock.mockReturnValue(null);
    listaMock.mockReturnValue(UNA_PERSONA);
    montar();

    // Con filas no hay vacío: el único botón es el del encabezado.
    expect(host.querySelector('[data-testid="sin-datos"]')).toBeNull();
    const botones = Array.from(
      host.querySelectorAll('[data-testid="crear-contrato-manual"]'),
    );
    expect(botones).toHaveLength(1);
    expect(botones[0].getAttribute('href')).toBe(RUTA_MANUAL);
    expect(botones[0].textContent).toContain('inquilinos.crearContrato');
  });

  it('🔴 pregunta por contratos/create, que es la llave que exige el destino', () => {
    deudaMock.mockReturnValue(null);
    listaMock.mockReturnValue(UNA_PERSONA);
    montar();

    expect(llavesPedidas).toContain('contratos:create');
    // Nada más: preguntar por otra llave escondería el botón a quien sí puede.
    expect(new Set(llavesPedidas)).toEqual(new Set(['contratos:create']));
  });

  it('🔴 el subtítulo ya no niega que se pueda crear a mano', () => {
    /*
     * El texto real, no la clave: decía «acá no se crea a nadie a mano», y con
     * el botón nuevo eso pasó a ser mentira. Se lee del diccionario porque la
     * pantalla, en el test, rinde claves.
     */
    expect(es.inquilinos.subtitulo).not.toContain('no se crea a nadie a mano');
    expect(es.inquilinos.subtitulo).toContain('cargalo a mano');
    expect(en.inquilinos.subtitulo).not.toContain('nobody is created by hand');
  });
});
