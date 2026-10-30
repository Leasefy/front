/**
 * @vitest-environment happy-dom
 */
import { act, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const marcar = vi.fn(async () => ({ id: 'p1' }));
vi.mock('@/lib/api/colecciones.service', () => ({
  coleccionesApi: {
    publica: vi.fn(async () => ({
      paraQuien: 'Camila Restrepo',
      nota: 'Te escogí los que quedan cerca',
      creadaEn: '2026-10-28T15:00:00Z',
      agente: { nombre: 'Laura Gómez', foto: null, inmobiliaria: 'Arriendos del Valle', logo: null, whatsapp: '3001234567' },
      inmuebles: [{ id: 'p1', titulo: 'Apartamento en Laureles', barrio: 'Laureles', ciudad: 'Medellín', canon: 2_800_000, venta: null, habitaciones: 3, banos: 2, area: 80, foto: null, disponible: true, reaccion: null, comentario: null }],
    })),
    marcar: (...a: unknown[]) => marcar(...(a as [])),
  },
}));

import ColeccionDelCliente from './page';

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  caja?.remove();
  document.body.innerHTML = '';
});

describe('La colección del lado del cliente', () => {
  it('saluda por el nombre, muestra el inmueble y «Me gusta» le avisa al agente', async () => {
    caja = document.createElement('div');
    document.body.appendChild(caja);
    raiz = createRoot(caja);
    await act(async () => {
      raiz!.render(
        <Suspense fallback={null}>
          <ColeccionDelCliente params={Promise.resolve({ token: 'abcdefghijklmnopqrstuv' })} />
        </Suspense>,
      );
    });
    for (let i = 0; i < 5; i++) await act(async () => {});
    expect(document.body.textContent).toContain('Camila, te escogí este inmueble');
    expect(document.body.textContent).toContain('Apartamento en Laureles');
    expect(document.querySelector('[data-testid="coleccion-whatsapp"]')?.getAttribute('href')).toContain('wa.me/573001234567');
    await act(async () => (document.querySelector('[data-testid="me-gusta-p1"]') as HTMLElement).click());
    expect(marcar).toHaveBeenCalledWith('abcdefghijklmnopqrstuv', 'p1', { reaccion: 'me_gusta' });
  });
});
