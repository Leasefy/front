/**
 * «Crear estudio y enviar solicitud» no creaba ni enviaba nada.
 *
 * 🔴 El handler entero era:
 *
 *     const handleSubmit = (e) => { e.preventDefault(); setConfirmed(true) }
 *
 * y el estado `confirmed` pintaba un check verde. Y no es que faltara
 * cablearlo: no hay a qué. El único camino real para abrir un estudio es
 * `POST /evaluations/:applicationId`, que arranca desde una POSTULACIÓN
 * existente — necesita un id que este intake libre no tiene ni puede
 * inventar. La pestaña «Crear» está en el menú del agente, así que alguien
 * llena catorce campos, aprieta, y no pasa nada.
 *
 * Se queda la pantalla (el diseño del formulario es el que se va a cablear el
 * día que exista la ruta), pero apagada y diciendo dónde SÍ se hace.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

import EstudioNuevoPage from './page';

void React;

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

describe('/postulaciones/estudio/nuevo', () => {
  it('la CTA está apagada y explica por qué', () => {
    act(() => root.render(<EstudioNuevoPage />));
    const cta = container.querySelector('[data-testid="estudio-nuevo-cta"]') as HTMLButtonElement;
    expect(cta).not.toBeNull();
    expect(cta.disabled).toBe(true);
    expect(container.textContent).toContain('un estudio se abre desde una postulación');
  });

  it('avisa arriba que no guarda nada, y ofrece a dónde ir de verdad', () => {
    act(() => root.render(<EstudioNuevoPage />));
    const aviso = container.querySelector('[data-testid="estudio-nuevo-aviso"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('nada de lo que escribas acá se guarda');
    expect(aviso!.querySelector('a[href="/panel/inmobiliaria/postulaciones"]')).not.toBeNull();
  });

  it('apretar no produce ninguna confirmación de que se creó algo', () => {
    act(() => root.render(<EstudioNuevoPage />));
    const form = container.querySelector('form') as HTMLFormElement;
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    // La frase vieja del bloque verde, y cualquier «creado/enviado» en pasado.
    expect(container.textContent).not.toContain('Próximamente: esto creará el estudio');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
