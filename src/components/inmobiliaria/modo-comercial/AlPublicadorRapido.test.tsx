/**
 * La cuenta del marketplace publica con el publicador rápido también desde el
 * panel (Nico, 27-10-2026: «está pidiendo propietario obligatoriamente»).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const sesion: { agency: { modoComercial?: boolean } | null; isLoading: boolean } = { agency: null, isLoading: false };
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => sesion }));

vi.mock('@/components/ui/carga-de-marca', () => ({
  CargaDeMarca: (p: { texto: string; 'data-testid'?: string }) => <p data-testid={p['data-testid']}>{p.texto}</p>,
}));

import { AlPublicadorRapido } from './AlPublicadorRapido';

let container: HTMLDivElement;
let root: Root | null = null;

function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(
      <AlPublicadorRapido destino="/publica?perfil=agency">
        <p data-testid="asistente">El asistente con propietario</p>
      </AlPublicadorRapido>,
    );
  });
}

const q = (id: string) => container.querySelector(`[data-testid="${id}"]`);

beforeEach(() => {
  replace.mockReset();
  sesion.agency = null;
  sesion.isLoading = false;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

describe('AlPublicadorRapido', () => {
  it('🔴 en el modo comercial abre el publicador rápido (sin propietario) y nunca el asistente', () => {
    sesion.agency = { modoComercial: true };
    pintar();
    expect(replace).toHaveBeenCalledWith('/publica?perfil=agency');
    expect(q('asistente')).toBeNull();
    expect(q('al-publicador-rapido')?.textContent).toBe('Abriendo el publicador…');
  });

  it('con la cuenta activada, el asistente de siempre', () => {
    sesion.agency = { modoComercial: false };
    pintar();
    expect(replace).not.toHaveBeenCalled();
    expect(q('asistente')).not.toBeNull();
  });

  it('mientras no se sabe la cuenta, ni el asistente ni el salto', () => {
    sesion.isLoading = true;
    pintar();
    expect(replace).not.toHaveBeenCalled();
    expect(q('asistente')).toBeNull();
    expect(q('al-publicador-rapido')).not.toBeNull();
  });
});
