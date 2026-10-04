/**
 * El aviso «Leasefy revisa las preguntas…» queda construido pero APAGADO hasta
 * que Nico / legal aprueben la cláusula (04-10-2026).
 */
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

import { AVISO_DE_PREGUNTAS_ENCENDIDO, AvisoDePreguntas, TEXTO_DEL_AVISO_DE_PREGUNTAS } from './AvisoDePreguntas';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function pintar(el: React.ReactElement): HTMLDivElement {
  const c = document.createElement('div');
  document.body.appendChild(c);
  act(() => {
    createRoot(c).render(el);
  });
  return c;
}

describe('AvisoDePreguntas', () => {
  it('🔴 está apagado hasta la aprobación de la cláusula', () => {
    expect(AVISO_DE_PREGUNTAS_ENCENDIDO).toBe(false);
    const c = pintar(<AvisoDePreguntas />);
    expect(c.querySelector('[data-testid="aviso-de-preguntas"]')).toBeNull();
  });

  it('prendido dice el texto de la cláusula y abre la política en otra pestaña', () => {
    const c = pintar(<AvisoDePreguntas encendido />);
    expect(c.textContent).toContain(TEXTO_DEL_AVISO_DE_PREGUNTAS);
    expect(c.textContent).toContain('Se guardan 12 meses.');
    const a = c.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/privacidad');
    expect(a.getAttribute('target')).toBe('_blank');
  });
});
