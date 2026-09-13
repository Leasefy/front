/**
 * Dos cosas se prueban acá:
 *
 *  1. `sw-inventario.ts` — cuándo se registra el worker y cómo se le pide que
 *     guarde una ruta.
 *  2. `public/sw-inventario.js` — el worker de verdad. No se puede importar
 *     (es un archivo suelto, sin `export`, que corre con un `self` de service
 *     worker), así que se LEE y se evalúa con un `self` fingido: así lo que se
 *     prueba es el archivo que se despliega, no una copia que se desincroniza.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  debeRegistrarse,
  estaticosCargados,
  prepararRutaSinSenal,
  registrarServiceWorker,
  RUTA_DEL_WORKER,
} from './sw-inventario';

// ── 1. El lado del navegador ───────────────────────────────────────────────

describe('cuándo se registra el worker', () => {
  it('en producción, siempre', () => {
    expect(debeRegistrarse({ nodeEnv: 'production' })).toBe(true);
  });

  it('en desarrollo NO, para no dejarlo pegado en el localhost de todos', () => {
    expect(debeRegistrarse({ nodeEnv: 'development' })).toBe(false);
  });

  it('en desarrollo sí cuando se enciende a mano', () => {
    expect(debeRegistrarse({ nodeEnv: 'development', activadoAMano: '1' })).toBe(true);
  });
});

describe('registrar el worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lo registra en la raíz y sin caché HTTP', async () => {
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', { serviceWorker: { register } });

    expect(await registrarServiceWorker({ nodeEnv: 'production' })).toBe(true);
    expect(register).toHaveBeenCalledWith(RUTA_DEL_WORKER, {
      scope: '/',
      updateViaCache: 'none',
    });
  });

  it('un navegador que lo rechaza no tumba la pantalla', async () => {
    const register = vi.fn().mockRejectedValue(new Error('no'));
    vi.stubGlobal('navigator', { serviceWorker: { register } });

    expect(await registrarServiceWorker({ nodeEnv: 'production' })).toBe(false);
  });

  it('un navegador sin service workers no registra nada', async () => {
    vi.stubGlobal('navigator', {});
    expect(await registrarServiceWorker({ nodeEnv: 'production' })).toBe(false);
  });
});

describe('preparar una ruta para trabajar sin señal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('le manda al worker la ruta y los archivos que cargó', async () => {
    const postMessage = vi.fn((mensaje: unknown, transfer: MessagePort[]) => {
      void mensaje;
      transfer[0].postMessage({ ok: true });
    });
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ active: { postMessage } }) },
    });

    const listo = await prepararRutaSinSenal('/panel/inmobiliaria/inmuebles/c-1', [
      'https://app.test/_next/static/chunks/a.js',
    ]);

    expect(listo).toBe(true);
    expect(postMessage.mock.calls[0][0]).toEqual({
      tipo: 'preparar',
      url: '/panel/inmobiliaria/inmuebles/c-1',
      estaticos: ['https://app.test/_next/static/chunks/a.js'],
    });
  });

  it('sin worker activo dice que no, no promete', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ active: null }) },
    });
    expect(await prepararRutaSinSenal('/x')).toBe(false);
  });

  it('si el worker contesta que falló, el botón se entera', async () => {
    const postMessage = vi.fn((_m: unknown, transfer: MessagePort[]) => {
      transfer[0].postMessage({ ok: false, error: 'cuota llena' });
    });
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ active: { postMessage } }) },
    });
    expect(await prepararRutaSinSenal('/x', [])).toBe(false);
  });
});

describe('qué archivos se le mandan', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sólo los de `_next/static`, nunca las llamadas al back', () => {
    vi.stubGlobal('performance', {
      getEntriesByType: () => [
        { name: 'https://app.test/_next/static/chunks/page.js' },
        { name: 'https://api.test/inmobiliaria/consignaciones/c-1' },
        { name: 'https://app.test/_next/static/css/hoja.css' },
      ],
    });

    expect(estaticosCargados()).toEqual([
      'https://app.test/_next/static/chunks/page.js',
      'https://app.test/_next/static/css/hoja.css',
    ]);
  });
});

// ── 2. El worker que se despliega ──────────────────────────────────────────

interface DecisionesDelWorker {
  VERSION: string;
  CAJA_DE_RUTAS: string;
  CAJA_DE_ESTATICOS: string;
  TOPE_DE_ESTATICOS: number;
  esRutaGuardable(url: URL): boolean;
  esEstatico(url: URL): boolean;
  queHacerCon(pedido: { method: string; url: string; mode?: string }, origen: string): string;
  cajasQueSobran(nombres: string[]): string[];
  estaticosQueSobran(claves: unknown[], tope: number): unknown[];
}

function cargarWorker(): DecisionesDelWorker {
  const codigo = readFileSync(join(process.cwd(), 'public', 'sw-inventario.js'), 'utf8');
  // Un `self` sin `addEventListener`: se evalúan las decisiones, no el
  // cableado con el navegador (que el propio archivo saltea si no lo hay).
  const self: Record<string, unknown> = { location: { origin: 'https://app.test' } };
  new Function('self', codigo)(self);
  return self.__swInventario as unknown as DecisionesDelWorker;
}

const sw = cargarWorker();
const ORIGEN = 'https://app.test';
const pedido = (url: string, mode = 'navigate', method = 'GET') => ({ url, mode, method });

describe('qué rutas se guardan', () => {
  it('la lista de inmuebles y la ficha de uno', () => {
    expect(sw.esRutaGuardable(new URL(ORIGEN + '/panel/inmobiliaria/inmuebles'))).toBe(true);
    expect(sw.esRutaGuardable(new URL(ORIGEN + '/panel/inmobiliaria/inmuebles/c-1'))).toBe(true);
  });

  it('nada más del panel: cobros, contratos ni el resto', () => {
    expect(sw.esRutaGuardable(new URL(ORIGEN + '/panel/inmobiliaria/cobros'))).toBe(false);
    expect(sw.esRutaGuardable(new URL(ORIGEN + '/panel/inmobiliaria'))).toBe(false);
    expect(sw.esRutaGuardable(new URL(ORIGEN + '/panel/inmobiliaria/contratos/c-1'))).toBe(false);
  });

  it('tampoco las sub-pantallas del inmueble que necesitan el back', () => {
    expect(sw.esRutaGuardable(new URL(ORIGEN + '/panel/inmobiliaria/inmuebles/nuevo'))).toBe(false);
    expect(sw.esRutaGuardable(new URL(ORIGEN + '/panel/inmobiliaria/inmuebles/importar'))).toBe(false);
    expect(sw.esRutaGuardable(new URL(ORIGEN + '/panel/inmobiliaria/inmuebles/c-1/acta'))).toBe(false);
  });
});

describe('qué hace el worker con cada pedido', () => {
  it('la ficha va por red primero con la copia de respaldo', () => {
    expect(sw.queHacerCon(pedido(ORIGEN + '/panel/inmobiliaria/inmuebles/c-1'), ORIGEN)).toBe('ruta');
  });

  it('el código de la pantalla va por caché primero', () => {
    expect(sw.queHacerCon(pedido(ORIGEN + '/_next/static/chunks/a.js', 'no-cors'), ORIGEN)).toBe(
      'estatico',
    );
  });

  it('las llamadas al back pasan de largo — un dato viejo miente', () => {
    expect(sw.queHacerCon(pedido('https://api.test/inmobiliaria/consignaciones/c-1', 'cors'), ORIGEN)).toBe(
      'nada',
    );
  });

  it('lo que no es GET pasa de largo: subir una foto no se guarda acá', () => {
    expect(
      sw.queHacerCon(pedido(ORIGEN + '/panel/inmobiliaria/inmuebles/c-1', 'navigate', 'POST'), ORIGEN),
    ).toBe('nada');
  });

  it('pedir la ficha sin navegar (datos del router) no se guarda como página', () => {
    expect(sw.queHacerCon(pedido(ORIGEN + '/panel/inmobiliaria/inmuebles/c-1', 'cors'), ORIGEN)).toBe(
      'nada',
    );
  });
});

describe('versionado', () => {
  it('las cajas llevan la versión en el nombre', () => {
    expect(sw.CAJA_DE_RUTAS).toContain(sw.VERSION);
    expect(sw.CAJA_DE_ESTATICOS).toContain(sw.VERSION);
  });

  it('al activarse borra las cajas de versiones anteriores y nada más', () => {
    const sobran = sw.cajasQueSobran([
      sw.CAJA_DE_RUTAS,
      sw.CAJA_DE_ESTATICOS,
      'leasefy-inventario-rutas-v0',
      'leasefy-inventario-estaticos-v0',
      'otra-cosa-del-sitio',
    ]);
    expect(sobran).toEqual(['leasefy-inventario-rutas-v0', 'leasefy-inventario-estaticos-v0']);
  });

  it('la caja de estáticos se recorta al tope, sacando lo más viejo', () => {
    const claves = Array.from({ length: 5 }, (_, i) => `c${i}`);
    expect(sw.estaticosQueSobran(claves, 3)).toEqual(['c0', 'c1']);
    expect(sw.estaticosQueSobran(claves, 5)).toEqual([]);
  });
});

beforeEach(() => {
  vi.useRealTimers();
});
