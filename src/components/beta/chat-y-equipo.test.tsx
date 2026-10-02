/**
 * @vitest-environment happy-dom
 */
/**
 * El chat por dentro + el equipo (02-10-2026).
 *
 *  · El compositor de la conversación es la MISMA caja de la llegada
 *    (`CajaDeLlegada` compacta): Plantillas sale desde su botón, hacia arriba.
 *  · «El equipo» se abre desde la llegada (sus orbes, junto a la frase de los
 *    especialistas) y desde la cabecera de la conversación.
 *  · La cabecera ya no repite «Plantillas»: vive en el compositor.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto, equipo } = vi.hoisted(() => ({
  contexto: {
    filteredSummaries: [] as Array<Record<string, unknown>>,
    switchConversation: vi.fn(),
    deleteConversation: vi.fn(),
    createConversation: vi.fn(),
  },
  equipo: { abrir: vi.fn() },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => contexto,
  useBetaChatOpcional: () => contexto,
}));
vi.mock('@/lib/api/migracion-estado.service', () => ({ migracionEstadoApi: { recordatorio: vi.fn() } }));
// El modal del equipo pide la sesión: acá sólo importa que se abra.
vi.mock('@/components/agentes/equipo-de-agentes-context', () => ({
  useEquipoDeAgentes: () => ({ abrir: equipo.abrir, cerrar: () => {}, abierto: false, disponible: true }),
}));

import { BetaWelcome } from './BetaWelcome';
import { ChatInput } from './ChatInput';
import { ChatConversationBar } from './ChatConversationBar';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  equipo.abrir.mockReset();
  contexto.createConversation.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const pintar = (el: React.ReactElement) => act(() => root.render(el));

function escribir(area: HTMLTextAreaElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(area, texto);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const enter = (area: HTMLTextAreaElement) =>
  act(() => {
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });

describe('«El equipo» desde la llegada', () => {
  it('la fila de los especialistas lleva los orbes del equipo y lo abre', () => {
    pintar(<BetaWelcome />);
    const fila = container.querySelector('[data-testid="fila-del-equipo"]')!;
    expect(fila.textContent).toContain('Según lo que pidas, el chat llama a su especialista');
    const boton = fila.querySelector<HTMLButtonElement>('[data-testid="boton-del-equipo"]')!;
    expect(boton.textContent).toContain('Conoce al equipo');
    act(() => boton.click());
    expect(equipo.abrir).toHaveBeenCalledTimes(1);
  });
});

describe('el compositor de la conversación (la misma caja de la llegada)', () => {
  it('es la caja compacta, con Plantillas, y Enter envía', () => {
    const enviar = vi.fn();
    pintar(<ChatInput onSend={enviar} />);
    expect(container.querySelector('[data-compacta="true"]')).not.toBeNull();
    const area = container.querySelector<HTMLTextAreaElement>('[data-testid="caja-de-llegada"]')!;
    escribir(area, '¿Cómo va la cartera?');
    enter(area);
    expect(enviar).toHaveBeenCalledWith('¿Cómo va la cartera?');
  });

  it('con un turno corriendo se puede escribir pero no enviar', () => {
    const enviar = vi.fn();
    pintar(<ChatInput onSend={enviar} disabled />);
    const area = container.querySelector<HTMLTextAreaElement>('[data-testid="caja-de-llegada"]')!;
    escribir(area, 'otra pregunta');
    enter(area);
    expect(enviar).not.toHaveBeenCalled();
    expect(area.value).toBe('otra pregunta');
  });

  it('Plantillas abre su menú pegado al botón y HACIA ARRIBA (está abajo de la pantalla)', () => {
    const enviar = vi.fn();
    // El botón está abajo de la pantalla: arriba hay lugar, abajo no.
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({ top: 700, bottom: 740, left: 0, right: 100, width: 100, height: 40, x: 0, y: 700, toJSON: () => ({}) }) as DOMRect;
    pintar(<ChatInput onSend={enviar} />);
    const boton = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Plantillas')!;
    act(() => boton.click());
    HTMLElement.prototype.getBoundingClientRect = original;
    const menu = container.querySelector('[data-testid="menu-de-plantillas"]')!;
    expect(menu.className).toContain('bottom-full');
    // El menú vive en el mismo contenedor que su botón.
    expect(menu.parentElement).toBe(boton.parentElement);
    act(() => menu.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click());
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('lo que va encima (el avance del turno) entra DENTRO de la caja', () => {
    pintar(<ChatInput onSend={vi.fn()} topSlot={<div data-testid="avance">Paso 2 de 4</div>} />);
    const caja = container.querySelector('.llegada-caja')!;
    expect(caja.querySelector('[data-testid="avance"]')).not.toBeNull();
  });
});

describe('la cabecera de la conversación', () => {
  it('abre «El equipo» con sus orbes, deja «Terminar» y ya no repite Plantillas', () => {
    pintar(<ChatConversationBar />);
    const boton = container.querySelector<HTMLButtonElement>('[data-testid="boton-del-equipo"]')!;
    expect(boton.getAttribute('aria-label')).toBe('Abrir el equipo de agentes');
    act(() => boton.click());
    expect(equipo.abrir).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Terminar conversación');
    expect(container.textContent).not.toContain('Plantillas');
  });
});
