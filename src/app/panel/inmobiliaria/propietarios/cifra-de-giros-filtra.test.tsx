/**
 * GLOW UP 21-10 · la cifra «Con giros atrasados» ES el filtro de la lista (antes, un chip aparte en
 * la barra de la tabla, debajo de una franja que sólo informaba). Va dentro de la tarjeta de la tabla.
 *
 * (Cabecera copiada de page.test.tsx.)
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

// Con todos los permisos: acá se prueba el `?persona=`, no los gates
// (esos viven en `errores-y-permisos.test.tsx`).
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
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
// La tabla de verdad tiene sus propias pruebas: acá sólo importa qué filas y qué filtros le llegan.
vi.mock('@/components/inmobiliaria', () => ({
  PropietarioCard: () => null,
  PropietarioTable: (p: { propietarios: unknown[]; filtros: { soloConSaldo: boolean }; filtroDeSaldoAfuera?: boolean }) => (
    <div
      data-testid="tabla"
      data-filas={p.propietarios.length}
      data-solo={String(p.filtros.soloConSaldo)}
      data-afuera={String(Boolean(p.filtroDeSaldoAfuera))}
    />
  ),
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

describe('Propietarios — la cifra de giros atrasados filtra la lista (glow up 21-10)', () => {
  const lista = () => [
    unPropietario({ id: 'a', name: 'Ana', pendingBalance: 0 }),
    unPropietario({ id: 'b', name: 'Beto', pendingBalance: 1_200_000, girosVencidos: 1 } as Partial<Propietario>),
    unPropietario({ id: 'c', name: 'Carla', pendingBalance: 0 }),
  ];
  const tabla = () => host.querySelector<HTMLElement>('[data-testid="tabla"]')!;
  const cifra = () => host.querySelector<HTMLElement>('[data-testid="cifra-giros-atrasados"]');

  it('un toque muestra sólo a quien hay que girarle; otro, la lista entera', () => {
    listaMock.mockReturnValue(lista());
    montar();
    expect(tabla().dataset.filas).toBe('3');
    expect(tabla().dataset.afuera).toBe('true');

    const boton = cifra()?.closest('button') ?? cifra();
    expect(boton?.tagName).toBe('BUTTON');
    act(() => boton!.click());
    expect(tabla().dataset.solo).toBe('true');
    expect(tabla().dataset.filas).toBe('1');
    expect(boton!.getAttribute('aria-pressed')).toBe('true');

    act(() => boton!.click());
    expect(tabla().dataset.solo).toBe('false');
    expect(tabla().dataset.filas).toBe('3');
  });

  it('las cifras viven dentro de la tarjeta de la tabla, arriba de ella', () => {
    listaMock.mockReturnValue(lista());
    montar();
    const franja = host.querySelector('[data-testid="cifras-de-propietarios"]')!;
    expect(franja).not.toBeNull();
    expect(franja.parentElement?.contains(tabla())).toBe(true);
  });

  it('sin nadie atrasado la cifra no se ofrece como filtro (no hay a quién mostrar)', () => {
    listaMock.mockReturnValue([unPropietario({ id: 'a', pendingBalance: 0 })]);
    montar();
    const c = cifra();
    expect(c?.closest('button') ?? null).toBeNull();
  });
});
