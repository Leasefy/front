import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

import { SiguePublicando } from './SiguePublicando';

let raiz: Root;
let caja: HTMLDivElement;
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
});
afterEach(() => {
  act(() => raiz.unmount());
  caja.remove();
});

const guardar = (inmuebles: unknown[]) =>
  window.localStorage.setItem('leasefy.publica.borrador.v1:u1', JSON.stringify({ inmuebles }));
const tarjeta = (extra: Record<string, unknown>) => ({ clave: 'a', llave: 'llave-12345678', operacion: 'rent', tipo: null, direccion: '', ciudad: '', barrio: '', precio: null, habitaciones: null, banos: null, area: null, descripcion: '', ...extra });

describe('«Te falta publicar»: quien se devolvió sin publicar retoma donde iba (Nico, 28-10)', () => {
  it('con una tarjeta a medio llenar, lo dice y lleva a /publica', async () => {
    guardar([tarjeta({ direccion: 'Cra 76 # 34-21' }), tarjeta({ clave: 'b' })]);
    await act(async () => raiz.render(<SiguePublicando />));
    expect(caja.querySelector('[data-testid="sigue-publicando"]')?.textContent).toContain('Dejaste un inmueble a medio llenar.');
    expect(caja.querySelector('[data-testid="seguir-publicando"]')?.getAttribute('href')).toBe('/publica');
  });

  it('sin borrador, o con todo publicado, nada', async () => {
    guardar([tarjeta({ direccion: 'Cra 76', idCreado: 'p1' })]);
    await act(async () => raiz.render(<SiguePublicando />));
    expect(caja.querySelector('[data-testid="sigue-publicando"]')).toBeNull();
  });
});
