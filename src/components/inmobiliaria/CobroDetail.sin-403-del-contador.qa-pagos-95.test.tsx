/**
 * H-02 / N-15 (QA-PAGOS-95, 05-10-2026): el detalle del cobro vive montado en
 * Cobros emitidos aunque esté cerrado y pedía `/inmobiliaria/consignaciones`
 * sin mirar el permiso: el contador (sin `portafolio:view`) se llevaba un 403
 * en cada visita (barrido p0-contador, MIS copias). Sólo pide con el permiso.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const usePropietarios = vi.fn((..._args: unknown[]) => ({ propietarios: [] }));
const useConsignaciones = vi.fn((..._args: unknown[]) => ({ consignaciones: [] }));
const permisos = { current: null as null | Record<string, unknown> };

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: (...a: unknown[]) => usePropietarios(...a),
  useConsignaciones: (...a: unknown[]) => useConsignaciones(...a),
}));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.current,
}));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }));
vi.mock('@/components/providers/SmoothScroll', () => ({ useLenis: () => ({ stop: () => {}, start: () => {} }) }));
vi.mock('@/lib/hooks/useDetalleDeCobro', () => ({
  useDetalleDeCobro: () => ({ detalle: null, isLoading: false, error: null, refetch: async () => null, aplicarRespuesta: () => {} }),
}));
vi.mock('./permiso-de-recibo', () => ({ usePuedeHacerRecibo: () => true, MOTIVO_SIN_PERMISO_DE_RECIBO: '' }));

import { CobroDetail } from './CobroDetail';

function contador(conPortafolio: boolean) {
  return {
    isLoading: false,
    isAdmin: false,
    canAccess: (modulo: string) => (modulo === 'portafolio' ? conPortafolio : true),
  };
}

let contenedor: HTMLDivElement;
let raiz: Root;

function montar() {
  act(() => {
    raiz.render(<CobroDetail isOpen={false} onClose={() => {}} cobro={null} onRegisterPayment={() => {}} />);
  });
}

beforeEach(() => {
  usePropietarios.mockClear();
  useConsignaciones.mockClear();
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('CobroDetail: los mandatos sólo con permiso (H-02 / N-15)', () => {
  it('el contador sin portafolio:view no pide /inmobiliaria/consignaciones', () => {
    permisos.current = contador(false);
    montar();
    expect(useConsignaciones).toHaveBeenCalled();
    for (const llamada of useConsignaciones.mock.calls) expect(llamada[1]).toEqual({ skip: true });
    // Los propietarios sí los ve: se piden.
    expect(usePropietarios.mock.calls.at(-1)?.[1]).toEqual({ skip: false });
  });

  it('con el permiso se piden como siempre', () => {
    permisos.current = contador(true);
    montar();
    expect(useConsignaciones.mock.calls.at(-1)?.[1]).toEqual({ skip: false });
  });

  it('mientras cargan los permisos no se pide nada', () => {
    permisos.current = { ...contador(true), isLoading: true };
    montar();
    expect(useConsignaciones.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
    expect(usePropietarios.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
  });
});
