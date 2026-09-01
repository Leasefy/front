/**
 * El muro de migración, montado.
 *
 * Lo que se prueba acá no es que dibuje cinco filas: es **a quién deja
 * afuera**. Un muro que se levanta por un 500 deja a un cliente que paga
 * mirando una pantalla que no pidió; un muro sin salida encierra para
 * siempre a la inmobiliaria que arranca de cero; un muro que tapa el
 * importador de inmuebles manda a la persona a una pantalla que él mismo
 * cubre. Los tres casos están abajo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { PasoDeMigracion } from '@/lib/api/migracion-estado.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) =>
      params ? `${k}::${JSON.stringify(params)}` : k,
    locale: 'es',
  }),
}));

const { rutaActual, estadoMock } = vi.hoisted(() => ({
  rutaActual: { valor: '/panel/inmobiliaria/dashboard' },
  estadoMock: { estado: vi.fn(), terminar: vi.fn(), omitir: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => rutaActual.valor,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// `next/link` necesita el contexto del App Router, que acá no existe.
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api/migracion-estado.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/migracion-estado.service')>(
    '@/lib/api/migracion-estado.service',
  );
  return { ...actual, migracionEstadoApi: estadoMock };
});

import { MuroDeMigracion } from './MuroDeMigracion';

// ══════════════════════════════════════════════════════════════════════════

function paso(
  id: PasoDeMigracion['id'],
  estado: PasoDeMigracion['estado'],
  conteo = 0,
  detalle: string | null = null,
): PasoDeMigracion {
  return { id, estado, detalle, conteo };
}

const RECIEN_LLEGADA: PasoDeMigracion[] = [
  paso('terceros', 'pendiente'),
  paso('propiedades', 'pendiente'),
  paso('contratos', 'pendiente'),
  paso('puc', 'pendiente'),
  paso('contables', 'pendiente'),
];

const TODO_MIGRADO: PasoDeMigracion[] = [
  paso('terceros', 'listo', 42, '12 propietarios · 30 inquilinos'),
  paso('propiedades', 'listo', 30),
  paso('contratos', 'listo', 28),
  paso('puc', 'listo', 75, '75 cuentas'),
  paso('contables', 'listo', 1, '1 asiento'),
];

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <MuroDeMigracion>
        <a href="/panel/inmobiliaria/dashboard" data-testid="algo-del-panel">
          Panel
        </a>
      </MuroDeMigracion>,
    );
  });
  // Una vuelta más: el efecto resuelve la promesa en un microtask.
  await act(async () => {});
}

function q(testid: string) {
  return container.querySelector(`[data-testid="${testid}"]`);
}

async function click(testid: string) {
  const el = q(testid) as HTMLElement | null;
  if (!el) throw new Error(`No existe [data-testid="${testid}"]`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  rutaActual.valor = '/panel/inmobiliaria/dashboard';
  estadoMock.estado.mockReset();
  estadoMock.terminar.mockReset();
  estadoMock.omitir.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

// ══════════════════════════════════════════════════════════════════════════
// 🔴 Ante la duda, no se bloquea
// ══════════════════════════════════════════════════════════════════════════

describe('cuando no se puede saber, el panel se ve normal', () => {
  it('la petición falla → NO hay muro y el panel no queda borroso', async () => {
    estadoMock.estado.mockRejectedValue(new Error('500'));

    await pintar();

    expect(q('muro-migracion')).toBeNull();
    const detras = q('panel-detras-del-muro') as HTMLElement;
    expect(detras.className).toBe('');
    expect(detras.getAttribute('aria-hidden')).toBeNull();
    expect(detras.hasAttribute('inert')).toBe(false);
    // Y lo de adentro sigue siendo alcanzable.
    expect(q('algo-del-panel')).not.toBeNull();
  });

  it('la respuesta viene con otra forma → NO hay muro', async () => {
    estadoMock.estado.mockResolvedValue({ ok: true } as never);

    await pintar();

    expect(q('muro-migracion')).toBeNull();
  });

  it('todavía no contestó → NO hay muro (nada de un muro que aparece por defecto)', async () => {
    // Una promesa que nunca resuelve: el estado que tarda.
    estadoMock.estado.mockReturnValue(new Promise(() => {}));

    await pintar();

    expect(q('muro-migracion')).toBeNull();
  });

  it('`bloquea: false` → no se renderiza nada del muro', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: false,
      resuelta: 'omitida',
      pasos: RECIEN_LLEGADA,
    });

    await pintar();

    expect(q('muro-migracion')).toBeNull();
    expect(q('muro-barra')).toBeNull();
    expect((q('panel-detras-del-muro') as HTMLElement).className).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// El muro puesto
// ══════════════════════════════════════════════════════════════════════════

describe('con `bloquea: true`', () => {
  beforeEach(() => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });
  });

  it('el panel se ve desenfocado detrás — no se desmonta', async () => {
    await pintar();

    expect(q('muro-migracion')).not.toBeNull();
    const detras = q('panel-detras-del-muro') as HTMLElement;
    expect(detras.className).toContain('blur');
    // 🔴 Sigue ahí: el mensaje es «esto te espera», no «no existe nada».
    expect(q('algo-del-panel')).not.toBeNull();
  });

  it('la navegación de atrás queda inerte y fuera del árbol accesible', async () => {
    await pintar();

    const detras = q('panel-detras-del-muro') as HTMLElement;
    // `inert=""` y no `inert="false"`: React 18 no lo tipa como booleano y
    // un `false` impreso como atributo el navegador lo lee como PRESENTE.
    expect(detras.getAttribute('inert')).toBe('');
    expect(detras.getAttribute('aria-hidden')).toBe('true');
    expect(detras.className).toContain('pointer-events-none');
  });

  it('es un muro, no un modal: Escape no lo baja', async () => {
    await pintar();

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });

    expect(q('muro-migracion')).not.toBeNull();
  });

  it('el foco arranca adentro del muro', async () => {
    await pintar();

    expect(q('muro-migracion')?.contains(document.activeElement)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 🔴 Las rutas exentas
// ══════════════════════════════════════════════════════════════════════════

describe('las pantallas a las que el propio muro manda no se tapan', () => {
  beforeEach(() => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });
  });

  it.each([
    '/panel/inmobiliaria/migracion/terceros',
    '/panel/inmobiliaria/inmuebles/importar',
    '/panel/inmobiliaria/contratos/migrar',
  ])('%s se ve entera, sin muro y sin blur', async (ruta) => {
    rutaActual.valor = ruta;

    await pintar();

    // Sin esto la persona queda encerrada: el muro la manda al importador
    // y el muro tapa el importador.
    expect(q('muro-migracion')).toBeNull();
    expect((q('panel-detras-del-muro') as HTMLElement).className).toBe('');
  });

  it('pero el resto del panel sí se tapa', async () => {
    rutaActual.valor = '/panel/inmobiliaria/inmuebles';

    await pintar();

    expect(q('muro-migracion')).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// El encadenado de los pasos
// ══════════════════════════════════════════════════════════════════════════

describe('los pasos van encadenados', () => {
  it('recién llegada: el paso 1 tiene botón, el 2 no — y dice por qué', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });

    await pintar();

    expect(q('muro-ir-terceros')).not.toBeNull();
    expect(q('muro-ir-terceros')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/migracion/terceros',
    );

    expect(q('muro-paso-propiedades')?.getAttribute('data-habilitado')).toBe('false');
    // Sin botón muerto: un `<button disabled>` invita a apretarlo y no explica nada.
    expect(q('muro-ir-propiedades')).toBeNull();
    // El porqué, nombrando el paso que falta.
    expect(q('muro-porque-propiedades')?.textContent).toContain('migracion.pasos.terceros.titulo');
  });

  it('con el paso 1 listo se abre el 2, y el 3 sigue esperando', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [paso('terceros', 'listo', 42), ...RECIEN_LLEGADA.slice(1)],
    });

    await pintar();

    expect(q('muro-paso-propiedades')?.getAttribute('data-habilitado')).toBe('true');
    expect(q('muro-ir-propiedades')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/inmuebles/importar',
    );
    expect(q('muro-paso-contratos')?.getAttribute('data-habilitado')).toBe('false');
  });

  it('el paso 5 (registros contables) espera al 4 (plan de cuentas)', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [...TODO_MIGRADO.slice(0, 3), paso('puc', 'pendiente'), paso('contables', 'pendiente')],
    });

    await pintar();

    expect(q('muro-paso-puc')?.getAttribute('data-habilitado')).toBe('true');
    expect(q('muro-ir-puc')?.getAttribute('href')).toBe('/panel/inmobiliaria/migracion/puc');
    expect(q('muro-paso-contables')?.getAttribute('data-habilitado')).toBe('false');
    expect(q('muro-ir-contables')).toBeNull();
    // El porqué nombra al PUC, que es lo que hay que hacer ahora.
    expect(q('muro-porque-contables')?.textContent).toContain('migracion.pasos.puc.titulo');
  });

  it('con el PUC listo se abre el 5 y manda a los registros contables', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [...TODO_MIGRADO.slice(0, 4), paso('contables', 'pendiente')],
    });

    await pintar();

    expect(q('muro-paso-contables')?.getAttribute('data-habilitado')).toBe('true');
    expect(q('muro-ir-contables')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/migracion/contables',
    );
  });

  it('un paso que el back marca `no_disponible` se muestra como lo que es y NO tiene botón', async () => {
    // Fallo genérico: si un módulo se cae, el muro lo dice en vez de ofrecer
    // un botón que lleva a una pantalla que no responde.
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [...TODO_MIGRADO.slice(0, 4), paso('contables', 'no_disponible')],
    });

    await pintar();

    expect(q('muro-paso-contables')?.getAttribute('data-estado')).toBe('no_disponible');
    expect(q('muro-ir-contables')).toBeNull();
    expect(q('muro-paso-contables')?.textContent).toContain('migracion.muro.noDisponible');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Las dos salidas
// ══════════════════════════════════════════════════════════════════════════

describe('«Ya terminé»', () => {
  it('no aparece mientras falte un paso exigible', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });

    await pintar();

    expect(q('muro-ya-termine')).toBeNull();
    expect(q('muro-falta')).not.toBeNull();
  });

  it('aparece con los cinco pasos listos', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: TODO_MIGRADO,
    });

    await pintar();

    expect(q('muro-ya-termine')).not.toBeNull();
  });

  it('al apretarlo llama POST terminar y vuelve a consultar el estado', async () => {
    estadoMock.estado.mockResolvedValueOnce({
      bloquea: true,
      resuelta: null,
      pasos: TODO_MIGRADO,
    });
    estadoMock.terminar.mockResolvedValue({
      bloquea: false,
      resuelta: 'completada',
      pasos: TODO_MIGRADO,
    });
    estadoMock.estado.mockResolvedValueOnce({
      bloquea: false,
      resuelta: 'completada',
      pasos: TODO_MIGRADO,
    });

    await pintar();
    await click('muro-ya-termine');
    await act(async () => {});

    expect(estadoMock.terminar).toHaveBeenCalledTimes(1);
    // El muro se baja con el estado que devuelve el back, no por optimismo.
    expect(q('muro-migracion')).toBeNull();
  });
});

describe('🔴 «No vengo de otro sistema, arranco de cero»', () => {
  beforeEach(() => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });
  });

  it('está aunque no haya un solo paso listo — si no, la inmobiliaria nueva queda encerrada', async () => {
    await pintar();

    expect(q('muro-arrancar-de-cero')).not.toBeNull();
  });

  it('el primer clic NO omite nada: pide confirmación y explica la consecuencia', async () => {
    await pintar();
    await click('muro-arrancar-de-cero');

    expect(estadoMock.omitir).not.toHaveBeenCalled();
    const confirmacion = q('muro-confirmar-cero');
    expect(confirmacion).not.toBeNull();
    expect(confirmacion?.textContent).toContain('migracion.muro.confirmar.detalle');
    expect(q('muro-confirmar-si')).not.toBeNull();
    expect(q('muro-confirmar-no')).not.toBeNull();
  });

  it('«volver» cancela y deja el muro como estaba', async () => {
    await pintar();
    await click('muro-arrancar-de-cero');
    await click('muro-confirmar-no');

    expect(estadoMock.omitir).not.toHaveBeenCalled();
    expect(q('muro-confirmar-cero')).toBeNull();
    expect(q('muro-pasos')).not.toBeNull();
  });

  it('confirmando sí llama POST omitir', async () => {
    estadoMock.omitir.mockResolvedValue({
      bloquea: false,
      resuelta: 'omitida',
      pasos: RECIEN_LLEGADA,
    });

    await pintar();
    await click('muro-arrancar-de-cero');
    await click('muro-confirmar-si');
    await act(async () => {});

    expect(estadoMock.omitir).toHaveBeenCalledTimes(1);
  });

  it('si el POST falla el muro se queda puesto y lo dice — no finge que salió', async () => {
    estadoMock.omitir.mockRejectedValue(new Error('500'));

    await pintar();
    await click('muro-arrancar-de-cero');
    await click('muro-confirmar-si');
    await act(async () => {});

    expect(q('muro-migracion')).not.toBeNull();
    expect(q('muro-fallo')).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// El paso en foco: una sola tarjeta, la del paso que toca ahora
// ══════════════════════════════════════════════════════════════════════════

describe('el paso en foco', () => {
  it('recién llegada: la tarjeta es la del paso 1 y es el ÚNICO botón de ir', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });

    await pintar();

    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('terceros');
    expect(container.querySelectorAll('[data-testid^="muro-ir-"]').length).toBe(1);
    // La barra dibuja los cinco, en columnas iguales, cada uno con su estado.
    expect(container.querySelectorAll('[data-testid^="muro-paso-"]').length).toBe(5);
    expect(q('muro-paso-terceros')?.getAttribute('aria-current')).toBe('step');
    expect(q('muro-paso-propiedades')?.getAttribute('aria-current')).toBeNull();
  });

  it('con el paso 1 listo la tarjeta pasa al 2, y el 1 queda como enlace para volver', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [paso('terceros', 'listo', 42, '12 propietarios · 30 inquilinos'), ...RECIEN_LLEGADA.slice(1)],
    });

    await pintar();

    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('propiedades');
    expect(q('muro-ir-terceros')).toBeNull();
    // Quien cargó diez propietarios y quiere cargar más no espera a que baje el muro.
    expect(q('muro-volver-terceros')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/migracion/terceros',
    );
    // Y lo que cargó se lee en la barra, no un cero inventado.
    // Un conteo por renglón, así que se buscan por separado.
    expect(q('muro-paso-terceros')?.textContent).toContain('12 propietarios');
    expect(q('muro-paso-terceros')?.textContent).toContain('30 inquilinos');
    expect(q('muro-progreso')?.textContent).toContain('"n":1');
  });

  it('con todo listo la tarjeta resume lo cargado y ofrece entrar', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: TODO_MIGRADO,
    });

    await pintar();

    const foco = q('muro-en-foco');
    expect(foco?.getAttribute('data-paso')).toBe('todo-listo');
    // Un chip por conteo — una frase corrida se partía dejando «· 1 asiento» huérfano.
    expect([...(foco?.querySelectorAll('li') ?? [])].map((li) => li.textContent)).toEqual([
      '12 propietarios',
      '30 inquilinos',
      '75 cuentas',
      '1 asiento',
    ]);
    expect(foco?.contains(q('muro-ya-termine'))).toBe(true);
    expect(container.querySelectorAll('[data-testid^="muro-ir-"]').length).toBe(0);
  });

  it('si el back no pudo verificar ningún paso, no hay botón muerto y la salida sigue', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA.map((p) => ({ ...p, estado: 'no_disponible' as const })),
    });

    await pintar();

    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('nada-disponible');
    expect(container.querySelectorAll('[data-testid^="muro-ir-"]').length).toBe(0);
    expect(q('muro-ya-termine')).toBeNull();
    expect(q('muro-arrancar-de-cero')).not.toBeNull();
    // Ninguno se marca como «ahora»: no hay nada que hacer ahora.
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
  });
});
