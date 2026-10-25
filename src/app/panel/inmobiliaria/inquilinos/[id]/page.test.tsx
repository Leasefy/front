/**
 * La ficha propia del inquilino (Nico, 21-10-2026: «ficha propia con
 * pestañas»): sale de la lista del portafolio por su tenantId (también los
 * `doc:`/`correo:`), y la pinta el MISMO cuerpo del cajón en modo ficha.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, Suspense } from 'react';

const { datos } = vi.hoisted(() => ({
  datos: { inquilinos: [] as Array<{ tenantId: string; nombre: string }>, cargando: false },
}));

vi.mock('@/components/auth/PageGuard', () => ({ PageGuard: ({ children }: { children?: React.ReactNode }) => children }));
vi.mock('@/lib/hooks/use-inquilinos', () => ({
  useInquilinos: () => ({ inquilinos: datos.inquilinos, cargando: datos.cargando, error: null, refrescar: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-inquilino-detalle', () => ({
  useInquilinoDetalle: (persona: { nombre: string }) => ({ persona }),
}));
vi.mock('@/components/inmobiliaria/InquilinoDrawer', () => ({
  CuerpoDelCajon: ({ detalle, enFicha }: { detalle: { persona: { nombre: string } }; enFicha?: boolean }) => (
    <div data-testid="cuerpo" data-en-ficha={String(Boolean(enFicha))}>
      {detalle.persona.nombre}
    </div>
  ),
}));
vi.mock('@/components/inmobiliaria/NuevoInquilinoDrawer', () => ({ NuevoInquilinoDrawer: () => null }));

import FichaDelInquilinoPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function montar(id: string) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const params = Promise.resolve({ id });
  await act(async () => {
    root!.render(
      <Suspense fallback={null}>
        <FichaDelInquilinoPage params={params} />
      </Suspense>,
    );
  });
  await act(async () => {
    await params;
  });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  datos.inquilinos = [
    { tenantId: 'u-1', nombre: 'Iván Pérez' },
    { tenantId: 'doc:CC-1037', nombre: 'Ana Ruiz' },
  ];
  datos.cargando = false;
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('La ficha del inquilino', () => {
  it('pinta el cuerpo del cajón en modo ficha (pestañas)', async () => {
    await montar('u-1');
    expect($('cuerpo')?.textContent).toBe('Iván Pérez');
    expect($('cuerpo')?.getAttribute('data-en-ficha')).toBe('true');
    expect($('ficha-inquilino-volver')?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/inquilinos');
  });

  it('encuentra también a quien no tiene cuenta (doc:…), con el id codificado en la URL', async () => {
    await montar(encodeURIComponent('doc:CC-1037'));
    expect($('cuerpo')?.textContent).toBe('Ana Ruiz');
  });

  it('un id que no está en el portafolio lo dice', async () => {
    await montar('otro');
    expect(document.body.textContent).toContain('No encontramos a este inquilino');
  });
});
