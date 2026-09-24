/**
 * @vitest-environment happy-dom
 */
/**
 * Guardián: dentro del hilo del chat NO hay scroll vertical anidado.
 *
 * Nico (24-09, 00:15), con la tabla «Cuotas sin pagar»: «no deja hacer scroll
 * interno en esa tabla». La regla: una tabla muestra sus filas completas (el
 * corte de 8 y «Ver las N que faltan» en el pie); al abrirla la caja crece y
 * todo se ve con el scroll del chat. Nada de `max-height` con `overflow-y` en
 * las cajas de bloques. A lo ancho sí (390 px), dentro de su caja.
 *
 * Dos pruebas: una estática sobre lo que se pinta DENTRO del hilo, y una que
 * pinta la tabla y mira que su contenedor horizontal no scrollee en vertical.
 */

import * as React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => ({
    sendMessage: vi.fn(),
    anotarTarjetaAbierta: vi.fn(),
    isThinking: false,
    isStreaming: false,
  }),
  useBetaChatOpcional: () => null,
}));

import { RespuestaConForma } from './RespuestaConForma';

// Lo que se pinta DENTRO de una respuesta del hilo (no el hilo mismo, que es
// el único que scrollea en vertical, ni los paneles laterales).
const DENTRO_DEL_HILO = [
  'CajaDelChat.tsx',
  'RespuestaConForma.tsx',
  'AccionesEnElHilo.tsx',
  'ResponseCard.tsx',
  'AssistantBubble.tsx',
  'MarkdownRenderer.tsx',
  'UserBubble.tsx',
  'AccionPropuestaCard.tsx',
  'DecisionCard.tsx',
  'MessageActions.tsx',
  'TypingIndicator.tsx',
  'AgentTaskThread.tsx',
];

// Una caja con alto tope y scroll vertical propio.
const SCROLL_VERTICAL = /\b(max-h-[\w[\].-]+|overflow-y-(auto|scroll)|overflow-(auto|scroll))\b/g;

describe('sin scroll vertical anidado en el hilo', () => {
  it.each(DENTRO_DEL_HILO)('%s no tiene cajas con alto tope ni scroll vertical', (archivo) => {
    const fuente = readFileSync(join(__dirname, archivo), 'utf8');
    expect(fuente.match(SCROLL_VERTICAL) ?? []).toEqual([]);
  });

  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('la tabla sólo se desplaza a lo ancho: su contenedor horizontal no scrollea en vertical', () => {
    const filas = Array.from({ length: 20 }, (_, i) => ({ cuota: String(i + 1), falta: 1_550_000 }));
    act(() =>
      root.render(
        <RespuestaConForma
          bloques={[
            {
              tipo: 'tabla',
              titulo: 'Cuotas sin pagar',
              columnas: [
                { clave: 'cuota', titulo: 'Cuota', formato: 'texto' },
                { clave: 'falta', titulo: 'Falta', formato: 'moneda' },
              ],
              filas,
              total: 20,
              truncada: false,
            },
          ]}
        />,
      ),
    );
    const caja = container.querySelector('[data-testid="bloque-tabla"]')!;
    const envoltura = caja.querySelector<HTMLElement>('[data-desplazamiento-de-la-tabla]')!;
    // El contenedor con `overflow-x-auto` (de la tabla de Cadence) es nieto de la envoltura.
    const horizontal = envoltura.querySelector(':scope > div > div')!;
    expect(horizontal.className).toContain('overflow-x-auto');
    expect(envoltura.className).toContain('[&>div>div]:overflow-y-hidden');
    // Y nada en la caja con alto tope.
    const clases = [...caja.querySelectorAll('*')].map((e) => String(e.getAttribute('class') ?? '')).join(' ');
    expect(clases.match(SCROLL_VERTICAL) ?? []).toEqual([]);
  });
});

void React;
