/**
 * El puente con WhatsApp, contado en la pantalla.
 *
 * Lo que se pinnea: que el aviso diga a QUIÉN y a qué número llega, que
 * cuando NO llega diga por qué, que un mensaje sin estado no pinte nada (sólo
 * vivió en la plataforma) y que «simulado» nunca se lea como «enviado».
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import {
  AvisoDeWhatsapp,
  EstadoDeWhatsappEnMensaje,
} from './CanalDeWhatsappEnElHilo';
import type { CanalDeWhatsapp } from '@/lib/api/messages.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CANAL: CanalDeWhatsapp = {
  puedeEnviar: true,
  motivo: 'ok',
  nombre: 'Ana Pérez',
  telefono: '+57 310 ••• 0479',
  aceptaWhatsapp: true,
};

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

function pintar(nodo: React.ReactNode): string {
  act(() => {
    root.render(nodo);
  });
  return container.textContent ?? '';
}

describe('AvisoDeWhatsapp', () => {
  it('dice a quién y a qué número llega', () => {
    const texto = pintar(<AvisoDeWhatsapp canal={CANAL} locale="es" />);
    expect(texto).toContain('también llega al WhatsApp de Ana Pérez +57 310 ••• 0479');
  });

  it('sin consentimiento dice que NO llega y dónde prenderlo', () => {
    const texto = pintar(
      <AvisoDeWhatsapp
        canal={{ ...CANAL, puedeEnviar: false, motivo: 'sin_consentimiento', aceptaWhatsapp: false }}
        locale="es"
      />,
    );
    expect(texto).toContain('NO le llega por WhatsApp a Ana Pérez');
    expect(texto).toContain('en su ficha');
  });

  it('sin teléfono lo dice con esas palabras', () => {
    const texto = pintar(
      <AvisoDeWhatsapp
        canal={{ ...CANAL, puedeEnviar: false, motivo: 'sin_telefono', telefono: null }}
        locale="es"
      />,
    );
    expect(texto).toContain('No tenemos su teléfono');
  });

  it('🔴 con dos números en la ficha explica que no elegimos por el usuario', () => {
    const texto = pintar(
      <AvisoDeWhatsapp
        canal={{ ...CANAL, puedeEnviar: false, motivo: 'ambiguo', telefono: null }}
        locale="es"
      />,
    );
    expect(texto).toContain('más de un número');
  });
});

describe('EstadoDeWhatsappEnMensaje', () => {
  it('sin estado no pinta nada: ese mensaje sólo vivió en la plataforma', () => {
    pintar(<EstadoDeWhatsappEnMensaje estado={null} locale="es" />);
    expect(container.innerHTML).toBe('');
  });

  it('pinta cada estado con su palabra', () => {
    expect(pintar(<EstadoDeWhatsappEnMensaje estado="ENCOLADO" locale="es" />)).toContain(
      'WhatsApp: en cola',
    );
    expect(pintar(<EstadoDeWhatsappEnMensaje estado="ENVIADO" locale="es" />)).toContain(
      'WhatsApp: enviado',
    );
    expect(pintar(<EstadoDeWhatsappEnMensaje estado="ENTREGADO" locale="es" />)).toContain(
      'WhatsApp: entregado',
    );
    expect(pintar(<EstadoDeWhatsappEnMensaje estado="RECIBIDO" locale="es" />)).toContain(
      'Llegó por WhatsApp',
    );
  });

  it('🔴 «simulado» no se lee como «enviado»', () => {
    const texto = pintar(<EstadoDeWhatsappEnMensaje estado="SIMULADO" locale="es" />);
    expect(texto).toContain('WhatsApp: simulado');
    expect(texto).not.toContain('WhatsApp: enviado');
  });

  it('un fallo muestra el motivo, no sólo que falló', () => {
    const texto = pintar(
      <EstadoDeWhatsappEnMensaje estado="FALLO" error="fuera de la ventana de 24 h" locale="es" />,
    );
    expect(texto).toContain('WhatsApp: falló');
    expect(texto).toContain('fuera de la ventana de 24 h');
  });
});
