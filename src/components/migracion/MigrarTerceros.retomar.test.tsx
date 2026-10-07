/**
 * MigrarTerceros.retomar.test.tsx — «Retomar» una carga grande (02-10-2026).
 *
 * Nico, en el muro, paso Inquilinos: «Tienes una carga sin terminar ·
 * inquilinos-2026-10-01-1815 · 1729 filas por revisar». Tocó «Retomar» y no
 * pasó nada útil; en la pestaña de red quedaron SIETE O MÁS `POST revisar` en
 * «(pending)» a la vez, y detrás el centro de procesos.
 *
 * La causa en esta pantalla: `retomar` no prendía ningún «ocupado» (el botón
 * seguía vivo y la pantalla igual), así que cada toque era otro `revisar` —que
 * en el back reescribe el lote entero—, y además CADA refresco de la lista
 * (página, corrección, crear) volvía a pedir `revisar`. Lo que se congela:
 *
 *  1. Siete toques = UN `revisar`; el botón dice «Retomando…».
 *  2. Se ve en qué va (poniendo al día → trayendo la lista) y, si tarda, se dice.
 *  3. «Dejar de esperar» es la salida: la tarjeta vuelve con sus dos botones y
 *     lo que llegue tarde no abre nada.
 *  4. Un `revisar` que falla no impide abrir; una lista que no llega lo dice y
 *     la carga sigue ofreciéndose — nunca atascado detrás del muro.
 *  5. Abierta la carga, crear / refrescar NO vuelve a revisar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: {
    plantilla: vi.fn(),
    lotesAbiertos: vi.fn(),
    descartarLote: vi.fn(),
    revisar: vi.fn(),
    resumen: vi.fn(),
    filas: vi.fn(),
    motivos: vi.fn(),
    aplicar: vi.fn(),
  },
}));

// Arranca sin nadie cargado: es cuando la tarjeta de cargas sin terminar
// convive con la subida (lo ya cargado se prueba en `ya-cargados`).
vi.mock('./TercerosYaCargados', async () => {
  const { useEffect } = await import('react');
  return {
    TercerosYaCargados: ({ onEstado }: { onEstado: (e: unknown) => void }) => {
      useEffect(() => onEstado({ cargando: false, fallo: false, total: 0 }), [onEstado]);
      return null;
    },
  };
});

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/migracion-terceros.service')>(
    '@/lib/api/migracion-terceros.service',
  );
  return { ...actual, migracionTercerosApi: api };
});

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
}));

import { MigrarTerceros, MS_PARA_DECIR_QUE_RETOMAR_TARDA } from './MigrarTerceros';

/** La carga de Nico, tal cual la tarjeta la mostraba. */
const LOTE = {
  lote: 'inquilinos-2026-10-01-1815',
  tipo: 'INQUILINO' as const,
  actualizado: '2026-10-01T23:15:40.556Z',
  total: 1729,
  borradores: 0,
  requierenAtencion: 1729,
  listos: 0,
  aplicados: 0,
  descartados: 0,
};

const RESUMEN = {
  lote: LOTE.lote,
  total: 1729,
  borradores: 0,
  requierenAtencion: 1729,
  listos: 0,
  aplicados: 0,
  descartados: 0,
};

const PAGINA = { filas: [], total: 1729, pagina: 1, porPagina: 25 };

/** Una promesa que se resuelve a mano: así se ve «el back todavía no contesta». */
function diferida<T>() {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarTerceros tipoFijo="INQUILINO" />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);
const botonRetomar = () => q(`retomar-lote-${LOTE.lote}`) as HTMLButtonElement | null;

async function tocar(el: Element | null, veces = 1) {
  if (!el) throw new Error('no está el elemento a tocar');
  // Todos los toques en el MISMO tick: React todavía no repintó el botón como
  // ocupado, que es justo el caso que la guarda tiene que atajar.
  await act(async () => {
    for (let i = 0; i < veces; i += 1) {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await act(async () => {});
}

beforeEach(() => {
  api.plantilla.mockResolvedValue({
    tipo: 'INQUILINO',
    columnas: [{ campo: 'nombre', titulo: 'Nombre', obligatoria: true, ejemplo: 'Ana', alias: [] }],
  });
  api.lotesAbiertos.mockResolvedValue([LOTE]);
  api.resumen.mockResolvedValue(RESUMEN);
  api.filas.mockResolvedValue(PAGINA);
  api.motivos.mockResolvedValue({ lote: LOTE.lote, requierenAtencion: 1729, completables: 1729, porMotivo: [] });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('«Retomar» una carga de 1.729 inquilinos', () => {
  it('🔴 siete toques mandan UN solo `revisar`, y el botón queda ocupado diciendo «Retomando…»', async () => {
    const revision = diferida<{ revisadas: number; ahoraListas: number }>();
    api.revisar.mockReturnValue(revision.promesa);
    await pintar();

    await tocar(botonRetomar(), 2); // dos en el mismo tick
    await tocar(botonRetomar(), 5); // y cinco más con la pantalla ya repintada

    expect(api.revisar).toHaveBeenCalledTimes(1);
    expect(api.revisar).toHaveBeenCalledWith(LOTE.lote);
    expect(botonRetomar()?.textContent).toContain('Retomando…');
    expect(botonRetomar()?.getAttribute('aria-busy')).toBe('true');
    // Todavía no se pidió la lista: primero se pone al día.
    expect(api.resumen).not.toHaveBeenCalled();
  });

  it('dice en qué va: primero pone al día las filas, después trae la lista, y abre la carga', async () => {
    const revision = diferida<{ revisadas: number; ahoraListas: number }>();
    const resumen = diferida<typeof RESUMEN>();
    api.revisar.mockReturnValue(revision.promesa);
    api.resumen.mockReturnValue(resumen.promesa);
    await pintar();

    await tocar(botonRetomar());
    const avance = () => q(`avance-retomar-${LOTE.lote}`)?.querySelector('[role="progressbar"]');
    expect(avance()?.getAttribute('aria-valuenow')).toBe('0');
    expect(avance()?.textContent).toContain('Paso 1 de 2');
    expect(q(`retomando-${LOTE.lote}`)?.textContent).toContain(
      'Poniendo al día las 1.729 filas con las reglas de hoy',
    );

    await act(async () => revision.resolver({ revisadas: 1729, ahoraListas: 0 }));
    await act(async () => {});
    // El avance AVANZA: paso 2, y dice lo que la revisión hizo.
    expect(avance()?.getAttribute('aria-valuenow')).toBe('1');
    expect(avance()?.textContent).toContain('Paso 2 de 2');
    expect(q(`retomando-${LOTE.lote}`)?.textContent).toContain(
      '1.729 filas quedaron al día. Trayendo la lista',
    );
    expect(q('lista-de-trabajo')).toBeNull();

    await act(async () => resumen.resolver(RESUMEN));
    await act(async () => {});
    expect(q('lista-de-trabajo')).not.toBeNull();
    expect(q('resumen-del-lote')?.textContent).toContain('1729');
  });

  it('si tarda más de lo normal lo dice, y ofrece soltar la espera', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    api.revisar.mockReturnValue(diferida().promesa);
    await pintar();

    await tocar(botonRetomar());
    expect(q(`retomando-${LOTE.lote}`)?.textContent).not.toContain('tardando');

    await act(async () => {
      vi.advanceTimersByTime(MS_PARA_DECIR_QUE_RETOMAR_TARDA + 1);
    });
    expect(q(`retomando-${LOTE.lote}`)?.textContent).toContain('Está tardando más de lo normal');
    expect(q(`dejar-de-esperar-${LOTE.lote}`)).not.toBeNull();
  });

  it('🔴 «Dejar de esperar» devuelve la tarjeta con sus dos salidas, y lo que llegue tarde no abre nada', async () => {
    const revision = diferida<{ revisadas: number; ahoraListas: number }>();
    api.revisar.mockReturnValue(revision.promesa);
    await pintar();

    await tocar(botonRetomar());
    // Mientras se espera, botarla no se ofrece: la salida es soltar la espera.
    expect(q(`descartar-lote-${LOTE.lote}`)).toBeNull();
    await tocar(q(`dejar-de-esperar-${LOTE.lote}`));

    expect(botonRetomar()?.textContent).toBe('Retomar');
    expect(botonRetomar()?.disabled).toBe(false);
    expect(q(`descartar-lote-${LOTE.lote}`)).not.toBeNull();
    expect(q(`retomando-${LOTE.lote}`)).toBeNull();

    // El back termina después: la pantalla no salta sola a una carga que se dejó.
    await act(async () => revision.resolver({ revisadas: 1729, ahoraListas: 0 }));
    await act(async () => {});
    expect(api.resumen).not.toHaveBeenCalled();
    expect(q('lista-de-trabajo')).toBeNull();
  });

  it('un `revisar` que falla no impide abrir la carga', async () => {
    api.revisar.mockRejectedValue(new Error('se cayó la conexión'));
    await pintar();

    await tocar(botonRetomar());

    expect(q('lista-de-trabajo')).not.toBeNull();
  });

  it('🔴 si la lista no llega, lo dice y la carga se sigue ofreciendo: retomar o botarla', async () => {
    api.revisar.mockResolvedValue({ revisadas: 0, ahoraListas: 0 });
    api.resumen.mockRejectedValue(new Error('La base no contestó.'));
    await pintar();

    await tocar(botonRetomar());

    expect(q('lista-de-trabajo')).toBeNull();
    expect(container.textContent).toContain('La base no contestó.');
    expect(container.textContent).toContain('Reintenta con «Retomar»');
    expect(botonRetomar()?.disabled).toBe(false);
    expect(q(`descartar-lote-${LOTE.lote}`)).not.toBeNull();

    // Y reintentar funciona.
    api.resumen.mockResolvedValue(RESUMEN);
    await tocar(botonRetomar());
    expect(q('lista-de-trabajo')).not.toBeNull();
  });

  it('🔴 abierta la carga, crear las fichas y refrescar la lista NO vuelven a pedir `revisar`', async () => {
    api.revisar.mockResolvedValue({ revisadas: 0, ahoraListas: 0 });
    api.resumen.mockResolvedValue({ ...RESUMEN, listos: 25, requierenAtencion: 1704 });
    api.aplicar.mockResolvedValue({
      lote: LOTE.lote,
      intentadas: 25,
      aplicadas: 25,
      fallidas: 0,
      invitados: 0,
      resultados: [],
    });
    await pintar();

    await tocar(botonRetomar());
    const crear = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Crear 25 inquilinos'),
    );
    await tocar(crear ?? null);

    expect(api.aplicar).toHaveBeenCalled();
    // La lista se releyó después de crear…
    expect(api.resumen.mock.calls.length).toBeGreaterThanOrEqual(2);
    // …sin volver a revisar el lote entero.
    expect(api.revisar).toHaveBeenCalledTimes(1);
  });
});
