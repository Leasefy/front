/**
 * La llegada del chat (rediseño del 02-10-2026).
 *
 * Lo que se prueba es lo que no se puede romper al cambiarle la cara:
 * - enviar sigue llamando a `onPromptClick` (Enter, botón, atajos);
 * - la caja tiene etiqueta y el ejemplo que se escribe solo es decoración;
 * - la bandeja sólo dice datos reales (nombre de la inmobiliaria, paso de la
 *   migración) y desaparece sin ellos — nunca un número inventado;
 * - no hay «+» ni adjuntar (el chat no recibe archivos);
 * - el historial vacío sigue llevando a las plantillas.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto } = vi.hoisted(() => ({
  contexto: {
    filteredSummaries: [] as Array<Record<string, unknown>>,
    switchConversation: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
const { recordatorio } = vi.hoisted(() => ({ recordatorio: vi.fn() }));
vi.mock('@/lib/api/migracion-estado.service', () => ({ migracionEstadoApi: { recordatorio } }));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => contexto,
  useBetaChatOpcional: () => contexto,
}));

import { BetaWelcome } from './BetaWelcome';
import { AuthContext } from '@/lib/auth/auth-context';
import { MigracionContext, type ContextoDeMigracion } from '@/components/migracion/migracion-context';
import type { EstadoDeMigracion } from '@/lib/api/migracion-estado.service';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contexto.filteredSummaries = [];
  recordatorio.mockReset();
  recordatorio.mockResolvedValue({});
  contexto.switchConversation.mockReset();
  contexto.deleteConversation.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

let ctxMigracion: ContextoDeMigracion;

function pintar(
  ui: React.ReactElement,
  { agencia, migracion }: { agencia?: string | null; migracion?: EstadoDeMigracion | null } = {}
) {
  let arbol = ui;
  if (migracion !== undefined) {
    const valor: ContextoDeMigracion = { estado: migracion, abrir: vi.fn(), recargar: vi.fn(async () => {}) };
    ctxMigracion = valor;
    arbol = <MigracionContext.Provider value={valor}>{arbol}</MigracionContext.Provider>;
  }
  if (agencia !== undefined) {
    const auth = { agency: agencia === null ? null : { id: 'ag-1', name: agencia } } as unknown as React.ContextType<
      typeof AuthContext
    >;
    arbol = <AuthContext.Provider value={auth}>{arbol}</AuthContext.Provider>;
  }
  act(() => root.render(arbol));
}

const caja = () => container.querySelector<HTMLTextAreaElement>('[data-testid="caja-de-llegada"]')!;
const botonEnviar = () => container.querySelector<HTMLButtonElement>('[data-testid="enviar-llegada"]')!;

/** Escribe en un textarea controlado por React (el setter nativo + `input`). */
function escribir(area: HTMLTextAreaElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(area, texto);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function tecla(area: HTMLTextAreaElement, key: string, shiftKey = false) {
  act(() => {
    area.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
  });
}

function migracion(listos: number, extra: Partial<EstadoDeMigracion> = {}): EstadoDeMigracion {
  const ids = ['propietarios', 'inquilinos', 'propiedades', 'contratos', 'puc', 'contables'] as const;
  return {
    bloquea: false,
    resuelta: null,
    pasos: ids.map((id, i) => ({ id, estado: i < listos ? 'listo' : 'pendiente', detalle: null, conteo: 0 })),
    ...extra,
  };
}

describe('la llegada del chat', () => {
  it('dice el título y la línea de apoyo nuevos', () => {
    pintar(<BetaWelcome />);
    expect(container.querySelector('h1')?.textContent).toBe('¿Qué revisamos hoy?');
    expect(container.textContent).toContain(
      'Pregúntale a tu inmobiliaria por cartera, contratos, inmuebles y pagos.'
    );
  });

  it('la caja tiene etiqueta y descripción; el ejemplo que se escribe solo es decoración', () => {
    pintar(<BetaWelcome />);
    const area = caja();
    const etiqueta = container.querySelector(`label[for="${area.id}"]`);
    expect(etiqueta?.textContent).toBe('Escribe tu pregunta para el chat');
    const ayuda = document.getElementById(area.getAttribute('aria-describedby')!);
    expect(ayuda?.textContent).toContain('Enter envía');
    expect(container.querySelector('[data-testid="ejemplo-de-llegada"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('Enter envía el texto (recortado); Shift+Enter no', () => {
    const onPromptClick = vi.fn();
    pintar(<BetaWelcome onPromptClick={onPromptClick} />);
    escribir(caja(), '  ¿Cuántos contratos vencen el próximo mes?  ');
    tecla(caja(), 'Enter', true);
    expect(onPromptClick).not.toHaveBeenCalled();
    tecla(caja(), 'Enter');
    expect(onPromptClick).toHaveBeenCalledWith('¿Cuántos contratos vencen el próximo mes?');
    expect(caja().value).toBe('');
  });

  it('el botón de enviar está apagado sin texto y manda con texto', () => {
    const onPromptClick = vi.fn();
    pintar(<BetaWelcome onPromptClick={onPromptClick} />);
    expect(botonEnviar().disabled).toBe(true);
    expect(botonEnviar().getAttribute('aria-label')).toBe('Enviar mensaje');
    escribir(caja(), 'hola');
    expect(botonEnviar().disabled).toBe(false);
    act(() => botonEnviar().click());
    expect(onPromptClick).toHaveBeenCalledWith('hola');
  });

  it('los atajos mandan el mismo texto que la plantilla', () => {
    const onPromptClick = vi.fn();
    pintar(<BetaWelcome onPromptClick={onPromptClick} />);
    const atajos = [...container.querySelectorAll('[data-testid^="atajo-"]')].map((b) => b.textContent);
    expect(atajos).toEqual(['Cobros y recaudos', 'Contratos', 'Propiedades']);
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="atajo-contratos"]')!.click());
    expect(onPromptClick).toHaveBeenCalledWith('¿Hay contratos próximos a vencer?');
  });

  it('«Plantillas» abre el menú de siempre', () => {
    pintar(<BetaWelcome />);
    const boton = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Plantillas')!;
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    act(() => boton.click());
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
  });

  it('no dibuja controles que el chat no soporta: ni «+», ni adjuntar, ni voz sin dictado', () => {
    pintar(<BetaWelcome />);
    const nombres = [...container.querySelectorAll('button')].map(
      (b) => `${b.textContent} ${b.getAttribute('aria-label') ?? ''}`
    );
    expect(nombres.some((n) => /adjunt|\+|dictar/i.test(n))).toBe(false);
  });

  it('«Plantillas» sale desde su botón: el menú vive junto al botón, no debajo de la bandeja', () => {
    pintar(<BetaWelcome />, { agencia: 'Portofino' });
    const boton = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Plantillas')!;
    act(() => boton.click());
    const menu = container.querySelector('[data-testid="menu-de-plantillas"]')!;
    expect(menu.parentElement!.contains(boton)).toBe(true);
    expect(container.querySelector('[data-testid="bandeja-de-llegada"]')!.contains(menu)).toBe(false);
  });

  it('sin conversaciones no se muestra NADA de «Conversaciones recientes»', () => {
    pintar(<BetaWelcome />, { agencia: 'Portofino' });
    expect(container.textContent).not.toContain('Conversaciones recientes');
    expect(container.textContent).not.toContain('Aún no tienes conversaciones');
  });
});

describe('las conversaciones recientes, en la bandeja', () => {
  const conversaciones = () => [
    { id: 'c1', title: 'Cartera de septiembre', preview: 'Te deben…', messageCount: 4, updatedAt: new Date() },
    { id: 'c2', title: 'Contratos por vencer', preview: 'Vencen 5…', messageCount: 2, updatedAt: new Date() },
    { id: 'c0', title: 'Vacía', preview: '', messageCount: 0, updatedAt: new Date() },
  ];
  const acceso = () => container.querySelector<HTMLButtonElement>('[data-testid="conversaciones-recientes"]');
  const panel = () => container.querySelector('[data-testid="panel-de-conversaciones"]');

  it('el acceso cuenta sólo las que tienen mensajes y vive en la bandeja', () => {
    contexto.filteredSummaries = conversaciones();
    pintar(<BetaWelcome />);
    expect(acceso()?.textContent).toBe('Conversaciones recientes (2)');
    expect(container.querySelector('[data-testid="bandeja-de-llegada"]')!.contains(acceso())).toBe(true);
    expect(panel()).toBeNull();
  });

  it('abre la lista DENTRO del chat (sin enlaces) y abrir una conversación funciona', () => {
    contexto.filteredSummaries = conversaciones();
    pintar(<BetaWelcome />);
    act(() => acceso()!.click());
    expect(acceso()!.getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.textContent).toContain('Cartera de septiembre');
    expect(panel()?.textContent).not.toContain('Vacía');
    expect(panel()!.querySelector('a[href]')).toBeNull();
    const abrir = [...panel()!.querySelectorAll('button')].find((b) => b.textContent?.includes('Contratos por vencer'))!;
    act(() => abrir.click());
    expect(contexto.switchConversation).toHaveBeenCalledWith('c2');
  });

  it('borrar confirma en línea', () => {
    contexto.filteredSummaries = conversaciones();
    pintar(<BetaWelcome />);
    act(() => acceso()!.click());
    const papelera = panel()!.querySelector<HTMLButtonElement>('button[aria-label="Eliminar conversacion"]')!;
    act(() => papelera.click());
    expect(contexto.deleteConversation).not.toHaveBeenCalled();
    const si = [...panel()!.querySelectorAll('button')].find((b) => b.textContent === 'Eliminar')!;
    act(() => si.click());
    expect(contexto.deleteConversation).toHaveBeenCalledWith('c1');
  });
});

describe('la bandeja: sólo datos reales (sin cifras desde el 02-10)', () => {
  const bandeja = () => container.querySelector('[data-testid="bandeja-de-llegada"]');

  it('sin inmobiliaria ni migración, no hay bandeja', () => {
    pintar(<BetaWelcome />);
    expect(bandeja()).toBeNull();
  });

  it('dice con los datos de qué inmobiliaria responde', () => {
    pintar(<BetaWelcome />, { agencia: 'Portofino Inmobiliaria' });
    expect(bandeja()?.textContent).toBe('Responde con los datos de Portofino Inmobiliaria');
  });

  it('el nombre de relleno «Agency» no es el nombre de nadie', () => {
    pintar(<BetaWelcome />, { agencia: 'Agency' });
    expect(bandeja()).toBeNull();
  });

  it('la migración ya no va en la bandeja: va en la franja', () => {
    pintar(<BetaWelcome />, { agencia: 'Portofino', migracion: migracion(2) });
    expect(bandeja()?.textContent).not.toContain('Migración');
  });
});

describe('la franja de la migración', () => {
  const franja = () => container.querySelector('[data-testid="franja-de-migracion"]');

  it('con la migración empezada y sin terminar: paso, qué sigue, «Continuar» y ✕', () => {
    pintar(<BetaWelcome />, { agencia: 'Portofino', migracion: migracion(2) });
    expect(franja()?.textContent).toContain('Paso 3 de 6');
    expect(franja()?.textContent).toContain('Termina tu migración: sigue con');
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="franja-de-migracion-continuar"]')!.click());
    expect(ctxMigracion.abrir).toHaveBeenCalledTimes(1);
  });

  it('la ✕ la oculta y guarda el «descartado» de la cuenta', async () => {
    pintar(<BetaWelcome />, { agencia: 'Portofino', migracion: migracion(2) });
    const cerrar = container.querySelector<HTMLButtonElement>('[data-testid="franja-de-migracion-cerrar"]')!;
    expect(cerrar.getAttribute('aria-label')).toBe('Cerrar el aviso de la migración');
    await act(async () => {
      cerrar.click();
      await new Promise((r) => setTimeout(r, 700));
    });
    expect(recordatorio).toHaveBeenCalledWith(true);
    expect(ctxMigracion.recargar).toHaveBeenCalled();
    expect(franja()).toBeNull();
  });

  it('sin empezar, terminada, bloqueando o con el recordatorio cerrado: no hay franja', () => {
    for (const estado of [
      migracion(0),
      migracion(6),
      migracion(2, { bloquea: true }),
      migracion(2, { recordatorioDescartado: true }),
      migracion(2, { resuelta: 'completada' }),
    ]) {
      pintar(<BetaWelcome />, { agencia: 'Portofino', migracion: estado });
      expect(franja()).toBeNull();
    }
  });

  it('fuera del panel (sin contexto de migración): no hay franja', () => {
    pintar(<BetaWelcome />, { agencia: 'Portofino' });
    expect(franja()).toBeNull();
  });
});

describe('la voz en la caja', () => {
  class ReconocimientoFalso {
    static ultima: ReconocimientoFalso | null = null;
    lang = '';
    interimResults = false;
    continuous = false;
    onresult: ((e: { results: Array<{ 0: { transcript: string } }> }) => void) | null = null;
    onerror: ((e: { error?: string }) => void) | null = null;
    onend: (() => void) | null = null;
    constructor() {
      ReconocimientoFalso.ultima = this;
    }
    start() {}
    stop() {
      this.onend?.();
    }
  }
  beforeEach(() => {
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = ReconocimientoFalso;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(() => Promise.reject(new Error('sin micrófono'))) },
    });
  });
  afterEach(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  // `AnimatePresence mode="wait"`: la vista de la voz entra cuando la del texto terminó de salir.
  const esperar = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));

  it('«Voz» escucha con su texto (sin claves crudas) y no se cierra sola al primer silencio', async () => {
    pintar(<BetaWelcome />);
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="voz-llegada"]')!.click());
    await esperar(500);
    const voz = () => container.querySelector('[data-testid="voz-escuchando"]');
    expect(voz()?.textContent).toContain('Te escucho · español');
    expect(voz()?.textContent).toContain('0:00 · haz una pausa y sigo escuchando');
    expect(voz()?.textContent).toContain('Cancelar');
    expect(container.textContent).not.toMatch(/beta\.welcome/);
    act(() => ReconocimientoFalso.ultima!.onend?.()); // Chrome corta por silencio
    await esperar(300);
    expect(voz()).not.toBeNull();
  });

  it('sin permiso del micrófono lo dice dentro de la caja', async () => {
    pintar(<BetaWelcome />);
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="voz-llegada"]')!.click());
    await esperar(500);
    await act(async () => {
      ReconocimientoFalso.ultima!.onerror?.({ error: 'not-allowed' });
      ReconocimientoFalso.ultima!.onend?.();
    });
    await esperar(900);
    const aviso = container.querySelector('[data-testid="voz-error"]');
    expect(aviso?.getAttribute('role')).toBe('alert');
    expect(aviso?.textContent).toContain('no le dio permiso al micrófono');
  });
});
