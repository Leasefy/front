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
 * 3. **Uno solo** (2026-09-04): «*¿pero por qué crear contrato en inquilinos?
 *    En inquilino es crear inquilino*». El primario es «Nuevo inquilino», que
 *    abre el cajón; el contrato manual (`?modo=manual`) queda de secundario y
 *    NO se va —un inquilino sin contrato no cobra—. Los dos tienen que estar
 *    en los dos vacíos Y con la lista llena: quien ya tiene 40 inquilinos no
 *    vuelve a ver un vacío nunca más. La ruta importa: `/contratos/nuevo` a
 *    secas responde «Falta el parámetro applicationId».
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
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (k: string) => (k === 'persona' ? paramsState.persona : null),
  }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
  InquilinoDrawer: ({ persona }: { persona: { tenantId: string } | null }) =>
    persona ? <div data-testid="cajon-inquilino" data-persona={persona.tenantId} /> : null,
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
import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';

const RUTA_MANUAL = '/panel/inmobiliaria/contratos/nuevo?modo=manual';

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
  deudaMock.mockReset();
  listaMock.mockReset();
  listaMock.mockReturnValue([]);
  llavesPedidas.length = 0;
  paramsState.persona = null;
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

    // El paso «Terceros» de la migración sigue sin botón propio: cargar UNA
    // persona ya no manda a esa pantalla, la crea acá.
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

  it('🔴 el subtítulo ya no dice que el inquilino nazca de su contrato', () => {
    /*
     * El texto real, no la clave: decía «cada inquilino nace de su contrato»,
     * y desde que se puede crear uno solo eso pasó a ser mentira. Se lee del
     * diccionario porque la pantalla, en el test, rinde claves.
     */
    expect(es.inquilinos.subtitulo).not.toContain('nace de su contrato');
    expect(es.inquilinos.subtitulo).toContain('Cargá uno acá');
    expect(en.inquilinos.subtitulo).not.toContain('comes from their lease');
  });
});

describe('/panel/inmobiliaria/inquilinos — «Nuevo inquilino»', () => {
  it('está en el encabezado con la lista llena, y abre el cajón', () => {
    deudaMock.mockReturnValue(null);
    listaMock.mockReturnValue(UNA_PERSONA);
    montar();

    const cajon = host.querySelector('[data-testid="cajon-nuevo-inquilino"]')!;
    expect(cajon.getAttribute('data-abierto')).toBe('false');

    const boton = host.querySelector<HTMLButtonElement>(
      '[data-testid="nuevo-inquilino"]',
    )!;
    expect(boton).not.toBeNull();
    expect(boton.textContent).toContain('inquilinos.nuevoInquilino');

    act(() => {
      boton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(
      host
        .querySelector('[data-testid="cajon-nuevo-inquilino"]')!
        .getAttribute('data-abierto'),
    ).toBe('true');
  });

  it('🔴 y también en el vacío, al lado de migrar y del contrato manual', () => {
    deudaMock.mockReturnValue(null);
    listaMock.mockReturnValue([]);
    montar();

    const vacio = host.querySelector('[data-testid="sin-datos"]')!;
    // Los TRES caminos conviven: migrar (muchos), crear la persona (uno) y el
    // contrato entero (la persona con su arriendo de una).
    expect(vacio.querySelector('a[href="/panel/inmobiliaria/contratos/migrar"]')).not.toBeNull();
    expect(vacio.querySelector('[data-testid="nuevo-inquilino"]')).not.toBeNull();
    expect(vacio.querySelector('[data-testid="crear-contrato-manual"]')).not.toBeNull();
  });

  it('🔴 pide la MISMA llave que el POST del back: contratos/create', () => {
    deudaMock.mockReturnValue(null);
    listaMock.mockReturnValue(UNA_PERSONA);
    montar();

    // Un botón que abre un cajón cuyo guardar devuelve 403 es peor que no
    // tener botón.
    expect(new Set(llavesPedidas)).toEqual(new Set(['contratos:create']));
  });
});

describe('/panel/inmobiliaria/inquilinos — ?persona= (desde la bandeja de mensajes)', () => {
  it('abre el cajón de esa persona', () => {
    deudaMock.mockReturnValue(null);
    listaMock.mockReturnValue(UNA_PERSONA);
    paramsState.persona = 't-1';
    montar();

    const cajon = host.querySelector('[data-testid="cajon-inquilino"]');
    expect(cajon).not.toBeNull();
    expect(cajon!.getAttribute('data-persona')).toBe('t-1');
    expect(host.querySelector('[data-testid="persona-no-encontrada"]')).toBeNull();
  });

  it('🔴 si no está, lo DICE — no deja la pantalla igual sin explicar por qué', () => {
    deudaMock.mockReturnValue(null);
    listaMock.mockReturnValue(UNA_PERSONA);
    paramsState.persona = 't-que-no-existe';
    montar();

    expect(host.querySelector('[data-testid="cajon-inquilino"]')).toBeNull();
    const aviso = host.querySelector('[data-testid="persona-no-encontrada"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('No encontramos a esa persona en el directorio');
  });

  it('sin el parámetro no pasa nada: ni cajón ni aviso', () => {
    deudaMock.mockReturnValue(null);
    listaMock.mockReturnValue(UNA_PERSONA);
    montar();

    expect(host.querySelector('[data-testid="cajon-inquilino"]')).toBeNull();
    expect(host.querySelector('[data-testid="persona-no-encontrada"]')).toBeNull();
  });
});
