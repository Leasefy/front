/**
 * page.test.tsx — Propietarios: `?persona=<User.id>`.
 *
 * De dónde viene el parámetro: del menú de los tres puntos de una conversación
 * («Ver ficha del propietario», `/panel/inmobiliaria/mensajes`, 2026-09-04).
 * Ahí lo único que se sabe de la persona es su `User.id`.
 *
 * 🔴 Lo que estos tests fijan es CON QUÉ CAMPO se la busca. La tentación es
 * `propietario.id`, y está mal: ese es el id de la ficha COMERCIAL de la
 * agencia, que no es un usuario y nunca va a coincidir con un `User.id`. La
 * llave es `cuentaDePortalId` —el back la resuelve por correo y la manda en la
 * lista justamente para esto— y puede ser `null`, así que los nulos se saltean:
 * si no, cualquier `persona` haría match con el primer propietario sin cuenta.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { paramsState, replaceMock, listaMock } = vi.hoisted(() => ({
  paramsState: { persona: null as string | null, nuevo: null as string | null },
  replaceMock: vi.fn(),
  listaMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (k: string) =>
      k === 'persona' ? paramsState.persona : k === 'nuevo' ? paramsState.nuevo : null,
  }),
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatCurrency: (n: number) => String(n) }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({
    propietarios: listaMock(),
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({
  useMigracionConDeuda: () => null,
}));

/* `useLenis` va real: fuera del provider ya devuelve `{stop, start}` de no-op,
   y un doble que devolviera `null` reventaría el cleanup del modal —que
   llama `lenis.start()` sin guardas— por un problema que no existe. */

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

// La tabla, las tarjetas y los formularios tienen sus propios archivos: acá lo
// que se prueba es a dónde manda el parámetro, no cómo se pinta una fila.
vi.mock('@/components/inmobiliaria', () => ({
  PropietarioCard: () => null,
  PropietarioTable: () => null,
  PropietarioForm: () => null,
}));

vi.mock('@/components/inmobiliaria/TerceroIACapture', () => ({
  TerceroIACapture: () => null,
}));

/*
 * cadence y framer-motion van REALES a propósito: el barril
 * `@/components/ui` arrastra medio design system, y un doble total del paquete
 * deja `undefined` cualquier primitivo que no se haya listado —que React no
 * reporta como «falta un mock» sino como una pantalla rota.
 */
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import PropietariosPage from './page';
import type { Propietario } from '@/lib/types/inmobiliaria';

function unPropietario(over: Partial<Propietario> = {}): Propietario {
  return {
    id: 'ficha-1',
    name: 'Ana Gómez',
    email: 'ana@ejemplo.co',
    phone: '3001234567',
    documentType: 'CC',
    documentNumber: '1020304050',
    propertyCount: 2,
    totalMonthlyRent: 4_000_000,
    pendingBalance: 0,
    cuentaDePortalId: 'user-ana',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as Propietario;
}

let host: HTMLDivElement;
let root: Root;

function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<PropietariosPage />);
  });
}

beforeEach(() => {
  paramsState.persona = null;
  paramsState.nuevo = null;
  replaceMock.mockReset();
  listaMock.mockReset().mockReturnValue([]);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe('/panel/inmobiliaria/propietarios — ?persona= (desde la bandeja de mensajes)', () => {
  it('lleva a la ficha del propietario cuya cuenta del portal coincide', () => {
    listaMock.mockReturnValue([unPropietario()]);
    paramsState.persona = 'user-ana';
    montar();

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/propietarios/ficha-1');
    expect(host.querySelector('[data-testid="persona-no-encontrada"]')).toBeNull();
  });

  it('🔴 busca por `cuentaDePortalId`, NO por el id de la ficha', () => {
    listaMock.mockReturnValue([unPropietario({ id: 'ficha-1', cuentaDePortalId: 'user-ana' })]);
    // El id de la ficha comercial no es un `User.id`: pasarlo no puede abrir nada.
    paramsState.persona = 'ficha-1';
    montar();

    expect(replaceMock).not.toHaveBeenCalled();
    expect(host.querySelector('[data-testid="persona-no-encontrada"]')).not.toBeNull();
  });

  it('🔴 un propietario SIN cuenta del portal no matchea con nada', () => {
    listaMock.mockReturnValue([
      unPropietario({ id: 'ficha-sin-cuenta', cuentaDePortalId: null }),
      unPropietario({ id: 'ficha-2', name: 'Beto', cuentaDePortalId: 'user-beto' }),
    ]);
    paramsState.persona = 'user-beto';
    montar();

    // El `null` de la primera fila no se lo come: va a la que corresponde.
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/propietarios/ficha-2');
  });

  it('si no está, lo dice — nunca una pantalla que se queda igual', () => {
    listaMock.mockReturnValue([unPropietario()]);
    paramsState.persona = 'user-que-no-existe';
    montar();

    const aviso = host.querySelector('[data-testid="persona-no-encontrada"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('No encontramos a esa persona en el directorio');
  });

  it('sin el parámetro no navega ni avisa nada', () => {
    listaMock.mockReturnValue([unPropietario()]);
    montar();

    expect(replaceMock).not.toHaveBeenCalled();
    expect(host.querySelector('[data-testid="persona-no-encontrada"]')).toBeNull();
  });
});
