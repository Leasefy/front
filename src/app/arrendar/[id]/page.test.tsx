import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const confettiMock = vi.hoisted(() => vi.fn());
// Estable como el de Next: un router nuevo en cada render re-dispara el efecto sin fin.
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: confettiMock }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/image', () => ({ default: (p: { alt: string }) => <img alt={p.alt} /> }));
vi.mock('@/components/brand/BrandHomeLink', () => ({ BrandHomeLink: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a> }));
vi.mock('@/components/brand', () => ({ LeasefyLogotype: () => <span>leasefy</span> }));

import ArrendarPage from './page';
import { guardarArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let c: HTMLDivElement | null = null;
beforeEach(() => { window.sessionStorage.clear(); confettiMock.mockReset(); router.replace.mockReset(); router.push.mockReset(); });
afterEach(() => { act(() => root?.unmount()); c?.remove(); });

function montar() {
  c = document.createElement('div');
  document.body.appendChild(c);
  root = createRoot(c);
  // Next 15: `params` es una promesa. Una ya marcada como cumplida (protocolo
  // de thenables de React) la lee `use()` sin suspender el render síncrono.
  const params = Object.assign(Promise.resolve({ id: 'p-1' }), { status: 'fulfilled', value: { id: 'p-1' } });
  act(() => root!.render(<ArrendarPage params={params} />));
}

describe('/arrendar/[id] — paso 1 cumplido', () => {
  it('felicita, celebra y lleva al paso 2 con el inmueble', () => {
    guardarArriendoEnCurso({ propertyId: 'p-1', titulo: 'Apartamento en Bello', ciudad: 'Bello', tipo: 'apartamento', foto: null, canon: 1_100_000, ingresoTotal: 5_000_000, canonMaximo: 3_333_333 });
    montar();
    expect(c!.textContent).toContain('¡Felicitaciones!');
    expect(c!.textContent).toContain('Te alcanza para este apartamento');
    expect(confettiMock).toHaveBeenCalled();
    expect(c!.querySelector('[data-testid="continuar-paso-2"]')?.getAttribute('href')).toBe('/aprobacion?paso=2&canon=1100000&ciudad=Bello&tipo=apartamento');
  });

  it('abre arriba aunque se llegue con la página bajada', () => {
    const subir = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    guardarArriendoEnCurso({ propertyId: 'p-1', titulo: 'Apartamento en Bello', ciudad: 'Bello', tipo: 'apartamento', foto: null, canon: 1_100_000, ingresoTotal: 5_000_000, canonMaximo: 3_333_333 });
    montar();
    expect(subir).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    subir.mockRestore();
  });

  it('sin recorrido guardado vuelve a la ficha y no celebra', () => {
    montar();
    expect(router.replace).toHaveBeenCalledWith('/propiedades/p-1');
    expect(confettiMock).not.toHaveBeenCalled();
  });
});

/**
 * Cerrar desde el paso 1 pregunta antes (Nico, 2026-09-15): era un enlace a la
 * ficha y se salía de una, sin decir que puede perder el inmueble.
 */
describe('/arrendar/[id] — cerrar', () => {
  const guardado = () =>
    guardarArriendoEnCurso({ propertyId: 'p-1', titulo: 'Local en Centro, Caldas', ciudad: 'Caldas', tipo: 'local', foto: null, canon: 2_200_000, ingresoTotal: 9_000_000, canonMaximo: 4_000_000 });
  const cerrar = () => c!.querySelector<HTMLButtonElement>('[data-testid="cerrar-arrendar"]')!;
  const boton = (id: string) => document.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);

  it('Cerrar ya no es un enlace: abre la confirmación nombrando el inmueble, y no navega', () => {
    guardado();
    montar();
    expect(cerrar().tagName).toBe('BUTTON');
    act(() => cerrar().click());
    expect(router.push).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="confirmar-salida-aprobacion"]')?.textContent).toContain('Local en Centro, Caldas');
  });

  it('«Salir de todos modos» vuelve a la ficha del inmueble', () => {
    guardado();
    montar();
    act(() => cerrar().click());
    act(() => boton('salir-de-aprobacion')!.click());
    expect(router.push).toHaveBeenCalledWith('/propiedades/p-1');
  });

  it('«Seguir con mi solicitud» se queda en el paso 1', () => {
    guardado();
    montar();
    act(() => cerrar().click());
    act(() => boton('seguir-en-aprobacion')!.click());
    expect(router.push).not.toHaveBeenCalled();
  });
});

