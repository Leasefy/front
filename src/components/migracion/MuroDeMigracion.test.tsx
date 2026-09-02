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

/*
 * Los componentes de paso ya tienen sus propias pruebas. Acá son stubs: lo
 * que se prueba es que el muro monta EL DEL PASO ELEGIDO, adentro, y que los
 * saltos entre pasos (PUC → contables, contables → PUC) se quedan adentro.
 */
vi.mock('./MigrarTerceros', () => ({
  MigrarTerceros: ({
    tipoFijo,
    onOcupado,
  }: {
    tipoFijo?: 'PROPIETARIO' | 'INQUILINO';
    onOcupado?: (o: boolean) => void;
  }) => (
    <div data-testid={`contenido-${tipoFijo === 'INQUILINO' ? 'inquilinos' : 'propietarios'}`}>
      <button type="button" data-testid="paso-ocupado-on" onClick={() => onOcupado?.(true)} />
      <button type="button" data-testid="paso-ocupado-off" onClick={() => onOcupado?.(false)} />
    </div>
  ),
}));
vi.mock('./PlanDeCuentas', () => ({
  PlanDeCuentas: ({ onContinuar }: { onContinuar?: () => void }) => (
    <div data-testid="contenido-puc">
      <button type="button" data-testid="puc-continuar" onClick={onContinuar} />
    </div>
  ),
}));
vi.mock('./RegistrosContables', () => ({
  RegistrosContables: ({ onIrAlPuc }: { onIrAlPuc?: () => void }) => (
    <div data-testid="contenido-contables">
      <button type="button" data-testid="contables-ir-al-puc" onClick={onIrAlPuc} />
    </div>
  ),
}));
// canvas-confetti pide un contexto 2D real y happy-dom devuelve null: la
// bienvenida lo dispararía al levantarse el muro y reventaría el test.
vi.mock('canvas-confetti', () => ({
  default: Object.assign(vi.fn(), { reset: vi.fn() }),
}));

vi.mock('@/components/inmobiliaria/import/ImportWizard', () => ({
  ImportWizard: () => <div data-testid="contenido-propiedades" />,
}));
vi.mock('@/components/contratos/MigrarContratos', () => ({
  MigrarContratos: () => <div data-testid="contenido-contratos" />,
}));
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: () => {}, start: () => {} }),
}));

const permisos = vi.hoisted(() => ({ puede: true, cargando: false }));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canAccess: () => permisos.puede,
    isLoading: permisos.cargando,
    isAdmin: permisos.puede,
    agencyRole: 'ADMIN',
  }),
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
  paso('propietarios', 'pendiente'),
  paso('inquilinos', 'pendiente'),
  paso('propiedades', 'pendiente'),
  paso('contratos', 'pendiente'),
  paso('puc', 'pendiente'),
  paso('contables', 'pendiente'),
];

const TODO_MIGRADO: PasoDeMigracion[] = [
  paso('propietarios', 'listo', 12, '12 propietarios'),
  paso('inquilinos', 'listo', 30, '30 inquilinos'),
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
  permisos.puede = true;
  permisos.cargando = false;
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
// 🔴 No hay rutas exentas: todo pasa adentro
// ══════════════════════════════════════════════════════════════════════════

describe('el muro tapa TODAS las rutas del panel — también las de los pasos', () => {
  beforeEach(() => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });
  });

  it.each([
    '/panel/inmobiliaria/dashboard',
    '/panel/inmobiliaria/inmuebles',
    '/panel/inmobiliaria/migracion',
    '/panel/inmobiliaria/migracion/terceros',
    '/panel/inmobiliaria/inmuebles/importar',
    '/panel/inmobiliaria/contratos/migrar',
    '/panel/inmobiliaria/migracion/puc',
    '/panel/inmobiliaria/migracion/contables',
  ])('%s → muro puesto y panel borroso', async (ruta) => {
    rutaActual.valor = ruta;

    await pintar();

    // Antes las cinco pantallas de paso estaban exentas: un clic en
    // «Empezar» y la persona veía la plataforma entera sin migrar nada.
    expect(q('muro-migracion')).not.toBeNull();
    expect((q('panel-detras-del-muro') as HTMLElement).className).toContain('blur');
  });

  it('el muro NO tiene un solo enlace que salga de él', async () => {
    await pintar();

    const enlaces = q('muro-migracion')?.querySelectorAll('a[href]') ?? [];
    expect(enlaces.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// El encadenado de los pasos
// ══════════════════════════════════════════════════════════════════════════

describe('los pasos van encadenados, y el contenido del paso vive adentro', () => {
  it('recién llegada: se ve el paso 1 ENTERO, y el 2 no se puede elegir — y dice por qué', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });

    await pintar();

    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('propietarios');
    expect(q('contenido-propietarios')).not.toBeNull();
    expect(q('contenido-propiedades')).toBeNull();

    // El paso 1 es elegible en la barra; el 2 no, sin botón muerto.
    expect(q('muro-ir-propietarios')).not.toBeNull();
    expect(q('muro-paso-inquilinos')?.getAttribute('data-habilitado')).toBe('false');
    expect(q('muro-ir-inquilinos')).toBeNull();
    expect(q('muro-paso-propiedades')?.getAttribute('data-habilitado')).toBe('false');
    // El porqué, nombrando el paso que falta.
    expect(q('muro-porque-inquilinos')?.textContent).toContain('migracion.pasos.propietarios.titulo');
    // Y el pie no ofrece seguir: este paso no está terminado.
    expect(q('muro-siguiente')).toBeNull();
    expect(q('muro-falta')).not.toBeNull();
  });

  it('con el paso 1 listo arranca en el 2; el 1 se puede volver a abrir adentro', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [paso('propietarios', 'listo', 42, '12 propietarios · 30 inquilinos'), ...RECIEN_LLEGADA.slice(1)],
    });

    await pintar();

    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('inquilinos');
    expect(q('contenido-inquilinos')).not.toBeNull();
    expect(q('muro-paso-propiedades')?.getAttribute('data-habilitado')).toBe('false');

    // Quien cargó diez propietarios y quiere cargar más no espera a que
    // baje el muro: vuelve al paso 1 desde la barra, sin salir.
    await click('muro-ir-propietarios');
    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('propietarios');
    expect(q('contenido-propietarios')).not.toBeNull();
    expect(q('muro-paso-listo')?.textContent).toContain('12 propietarios');
    // Y desde un paso listo, el pie ofrece seguir con el que falta.
    expect(q('muro-siguiente')?.textContent).toContain('migracion.pasos.inquilinos.corto');
    await click('muro-siguiente');
    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('inquilinos');
  });

  it('el paso 6 (registros contables) espera al 5 (plan de cuentas)', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [...TODO_MIGRADO.slice(0, 4), paso('puc', 'pendiente'), paso('contables', 'pendiente')],
    });

    await pintar();

    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('puc');
    expect(q('contenido-puc')).not.toBeNull();
    expect(q('muro-paso-contables')?.getAttribute('data-habilitado')).toBe('false');
    expect(q('muro-ir-contables')).toBeNull();
    expect(q('muro-porque-contables')?.textContent).toContain('migracion.pasos.puc.titulo');
  });

  it('los saltos entre el 5 y el 6 se quedan ADENTRO del muro', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [...TODO_MIGRADO.slice(0, 5), paso('contables', 'pendiente')],
    });

    await pintar();

    // Arranca en el 6, que es el que falta.
    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('contables');
    // «Ir al paso 5» del componente de contables → el PUC, adentro.
    await click('contables-ir-al-puc');
    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('puc');
    expect(q('contenido-puc')).not.toBeNull();
    // «Continuar al paso 6» del PUC → contables, adentro.
    await click('puc-continuar');
    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('contables');
    expect(q('muro-migracion')).not.toBeNull();
  });

  it('un paso que el back marca `no_disponible` se dice y NO monta su componente', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [...TODO_MIGRADO.slice(0, 5), paso('contables', 'no_disponible')],
    });

    await pintar();

    expect(q('muro-paso-contables')?.getAttribute('data-estado')).toBe('no_disponible');
    expect(q('muro-paso-contables')?.textContent).toContain('migracion.muro.noDisponible');
    expect(q('muro-ir-contables')).toBeNull();
    // Es donde cae la selección (todo lo exigible está listo): se explica,
    // sin montar una pantalla que no responde.
    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('contables');
    expect(q('muro-aviso-no-disponible')).not.toBeNull();
    expect(q('contenido-contables')).toBeNull();
    // Y como lo exigible está listo, la puerta está.
    expect(q('muro-ya-termine')).not.toBeNull();
  });

  it('si el usuario no tiene permiso para un paso, se le dice en vez de dejar que falle', async () => {
    permisos.puede = false;
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });

    await pintar();

    expect(q('muro-sin-permiso')).not.toBeNull();
    expect(q('contenido-propietarios')).toBeNull();
    // Y la salida de «arranco de cero» sigue estando.
    expect(q('muro-arrancar-de-cero')).not.toBeNull();
  });

  it('un paso elegido que quedó frenado (el anterior volvió a pendiente) lo dice y ofrece ir', async () => {
    // Estaba en «inquilinos» con propietarios listo; el refresco trae propietarios
    // pendiente (borraron el único propietario). La selección no se mueve
    // sola: se explica y se ofrece ir.
    estadoMock.estado.mockResolvedValueOnce({
      bloquea: true,
      resuelta: null,
      pasos: [paso('propietarios', 'listo', 1), ...RECIEN_LLEGADA.slice(1)],
    });
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: RECIEN_LLEGADA,
    });

    vi.useFakeTimers();
    try {
      await pintar();
      expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('inquilinos');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('inquilinos');
      expect(q('muro-aviso-frenado')?.textContent).toContain('migracion.pasos.propietarios.titulo');
      expect(q('contenido-inquilinos')).toBeNull();
      await click('muro-ir-al-que-frena');
      expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('propietarios');
    } finally {
      vi.useRealTimers();
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// El refresco del estado
// ══════════════════════════════════════════════════════════════════════════

describe('el pie espera a que el paso termine de crear', () => {
  it('mientras el paso avisa «ocupado», no se ofrece seguir ni terminar; al soltar, vuelve', async () => {
    // Propietarios listo → normalmente el pie ofrece «Seguir con Inquilinos».
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [paso('propietarios', 'listo', 60, '60 propietarios'), ...RECIEN_LLEGADA.slice(1)],
    });

    await pintar();
    await click('muro-ir-propietarios');
    expect(q('muro-siguiente')).not.toBeNull();

    await click('paso-ocupado-on');
    expect(q('muro-siguiente')).toBeNull();
    expect(q('muro-ya-termine')).toBeNull();
    expect(q('muro-ocupado')).not.toBeNull();

    await click('paso-ocupado-off');
    expect(q('muro-ocupado')).toBeNull();
    expect(q('muro-siguiente')).not.toBeNull();
  });

  it('cambiar de paso suelta la señal: el aviso de ocupado no persigue a la persona', async () => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: [paso('propietarios', 'listo', 60, '60 propietarios'), ...RECIEN_LLEGADA.slice(1)],
    });

    await pintar();
    await click('muro-ir-propietarios');
    await click('paso-ocupado-on');
    expect(q('muro-ocupado')).not.toBeNull();

    await click('muro-ir-inquilinos');
    expect(q('muro-ocupado')).toBeNull();
  });
});

describe('el muro vuelve a mirar el estado mientras está puesto', () => {
  it('cada 5 s; un fallo de red NO lo baja; una respuesta nueva actualiza la barra sin mover a la persona', async () => {
    estadoMock.estado
      .mockResolvedValueOnce({ bloquea: true, resuelta: null, pasos: RECIEN_LLEGADA })
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue({
        bloquea: true,
        resuelta: null,
        pasos: [paso('propietarios', 'listo', 3, '3 propietarios'), ...RECIEN_LLEGADA.slice(1)],
      });

    vi.useFakeTimers();
    try {
      await pintar();
      expect(estadoMock.estado).toHaveBeenCalledTimes(1);
      expect(q('muro-paso-propietarios')?.getAttribute('data-estado')).toBe('pendiente');

      // Primer refresco: falla. El muro se queda, con el paso montado.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(estadoMock.estado).toHaveBeenCalledTimes(2);
      expect(q('muro-migracion')).not.toBeNull();
      expect(q('contenido-propietarios')).not.toBeNull();

      // Segundo: terceros pasó a listo. La barra lo dice, el pie ofrece
      // seguir, y la pantalla NO cambió sola.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(q('muro-paso-propietarios')?.getAttribute('data-estado')).toBe('listo');
      expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('propietarios');
      expect(q('contenido-propietarios')).not.toBeNull();
      expect(q('muro-siguiente')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('una respuesta con `bloquea: false` sí lo baja — así termina', async () => {
    estadoMock.estado
      .mockResolvedValueOnce({ bloquea: true, resuelta: null, pasos: RECIEN_LLEGADA })
      .mockResolvedValue({ bloquea: false, resuelta: 'omitida', pasos: RECIEN_LLEGADA });

    vi.useFakeTimers();
    try {
      await pintar();
      expect(q('muro-migracion')).not.toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(q('muro-migracion')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * Nico: «cuando se termine la migración sería bueno darle un feedback top
 * con animación de bienvenido a Leasefy, con confeti, y ahí sí luego de eso
 * ya puede hacer lo que quiera». Antes el muro desaparecía de golpe y el
 * panel aparecía sin que nadie dijera que ya estaba adentro.
 */
describe('la bienvenida cuando el muro se levanta', () => {
  const LISTOS = RECIEN_LLEGADA.map((p) => ({
    ...p,
    estado: 'listo' as const,
    conteo: 7,
    detalle: `7 ${p.id}`,
  }));

  it('aparece en la transición puesto → levantado, con lo que entró, y un botón la cierra', async () => {
    estadoMock.estado
      .mockResolvedValueOnce({ bloquea: true, resuelta: null, pasos: LISTOS })
      .mockResolvedValue({ bloquea: false, resuelta: 'completada', pasos: LISTOS });

    vi.useFakeTimers();
    try {
      await pintar();
      expect(q('bienvenida-a-leasefy')).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      const bienvenida = q('bienvenida-a-leasefy');
      expect(bienvenida).not.toBeNull();
      expect(bienvenida?.textContent).toContain('Bienvenido a Leasefy');
      expect(bienvenida?.textContent).toContain('Migración completa');
      // Lo que entró, paso por paso, con el texto que armó el back.
      expect(q('bienvenida-resumen')?.textContent).toContain('7 propietarios');
      // Y el panel de atrás sigue tapado hasta que la persona entre.
      expect(q('panel-detras-del-muro')?.getAttribute('aria-hidden')).toBe('true');

      await act(async () => {
        (q('bienvenida-entrar') as HTMLButtonElement).click();
      });
      expect(q('bienvenida-a-leasefy')).toBeNull();
      expect(q('panel-detras-del-muro')?.getAttribute('aria-hidden')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('«arranco de cero» también saluda, sin resumen', async () => {
    estadoMock.estado
      .mockResolvedValueOnce({ bloquea: true, resuelta: null, pasos: RECIEN_LLEGADA })
      .mockResolvedValue({ bloquea: false, resuelta: 'omitida', pasos: RECIEN_LLEGADA });

    vi.useFakeTimers();
    try {
      await pintar();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      const bienvenida = q('bienvenida-a-leasefy');
      expect(bienvenida?.textContent).toContain('Bienvenido a Leasefy');
      expect(bienvenida?.textContent).toContain('Todo listo');
      expect(q('bienvenida-resumen')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('NO aparece para quien entra con el panel ya abierto: no está terminando nada', async () => {
    estadoMock.estado.mockResolvedValue({ bloquea: false, resuelta: 'completada', pasos: LISTOS });

    await pintar();
    expect(q('muro-migracion')).toBeNull();
    expect(q('bienvenida-a-leasefy')).toBeNull();
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

  it('un fallo CON mensaje del back muestra ese mensaje, no el genérico', async () => {
    // El 409 de «terminar» dice exactamente qué falta. Tragárselo y mostrar
    // «no pudimos» obliga a adivinar qué corregir.
    const { ApiError } = await import('@/lib/api/client');
    estadoMock.omitir.mockRejectedValue(
      new ApiError(409, 'Todavía falta cargar los inmuebles.', 'MIGRACION_INCOMPLETA'),
    );

    await pintar();
    await click('muro-arrancar-de-cero');
    await click('muro-confirmar-si');
    await act(async () => {});

    expect(q('muro-fallo')?.textContent).toContain('Todavía falta cargar los inmuebles.');
    expect(q('muro-fallo')?.textContent).not.toContain('migracion.muro.fallo');
  });

  it('un fallo SIN mensaje del back (bug, red rara) cae al genérico — nunca un stack', async () => {
    estadoMock.omitir.mockRejectedValue(new TypeError('x is not a function'));

    await pintar();
    await click('muro-arrancar-de-cero');
    await click('muro-confirmar-si');
    await act(async () => {});

    expect(q('muro-fallo')?.textContent).toContain('migracion.muro.fallo');
    expect(q('muro-fallo')?.textContent).not.toContain('is not a function');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Todo listo
// ══════════════════════════════════════════════════════════════════════════

describe('con todo listo', () => {
  beforeEach(() => {
    estadoMock.estado.mockResolvedValue({
      bloquea: true,
      resuelta: null,
      pasos: TODO_MIGRADO,
    });
  });

  it('la franja resume lo cargado en chips, el paso sigue abierto para cargar más, y la puerta es «entrar»', async () => {
    await pintar();

    const franja = q('muro-todo-listo');
    expect(franja).not.toBeNull();
    // Un chip por conteo — una frase corrida se partía dejando «· 1 asiento» huérfano.
    expect([...(franja?.querySelectorAll('li') ?? [])].map((li) => li.textContent)).toEqual([
      '12 propietarios',
      '30 inquilinos',
      '75 cuentas',
      '1 asiento',
    ]);
    // El último paso queda a la vista, por si falta cargar algo.
    expect(q('muro-en-foco')?.getAttribute('data-paso')).toBe('contables');
    expect(q('contenido-contables')).not.toBeNull();
    expect(q('muro-ya-termine')).not.toBeNull();
    // Con todo listo «arranco de cero» sobra: la puerta es entrar.
    expect(q('muro-arrancar-de-cero')).toBeNull();
    expect(q('muro-siguiente')).toBeNull();
  });
});
