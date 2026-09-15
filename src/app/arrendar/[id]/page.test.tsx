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
beforeEach(() => { window.sessionStorage.clear(); confettiMock.mockReset(); router.replace.mockReset(); });
afterEach(() => { act(() => root?.unmount()); c?.remove(); });

function montar() {
  c = document.createElement('div');
  document.body.appendChild(c);
  root = createRoot(c);
  act(() => root!.render(<ArrendarPage params={{ id: 'p-1' }} />));
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

  it('sin recorrido guardado vuelve a la ficha y no celebra', () => {
    montar();
    expect(router.replace).toHaveBeenCalledWith('/propiedades/p-1');
    expect(confettiMock).not.toHaveBeenCalled();
  });
});
