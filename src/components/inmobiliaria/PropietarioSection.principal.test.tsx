/**
 * QA-PROP P-03 (seguimiento, SEGUIMIENTO-FRONT 03-10-2026): en una copropiedad
 * con EMPATE de participación (50/50) el administrador o el contador elige
 * quién queda como principal (`PUT /consignaciones/:id/principal`). Sólo entre
 * los empatados con la mayor participación; un 30 % no se ofrece.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Copropietario, Propietario } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, formatDate: () => '' }) }));
const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ toast }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: { invitarAlPortal: vi.fn() }, consignacionesApi: {} }));

import { PropietarioSection } from './ConsignacionDetailSections';
import { ApiError } from '@/lib/api/client';

const PAULA = { id: 'paula', name: 'Paula Propietaria Ruiz', documentType: 'CC', documentNumber: '52123456', cuentaDePortalId: 'u1' } as Propietario;
const duenos = (ana: number, paula = 10_000 - ana): Copropietario[] =>
  [
    { propietarioId: 'paula', participacionBps: paula, propietario: { name: 'Paula Propietaria Ruiz' } },
    { propietarioId: 'ana', participacionBps: ana, propietario: { name: 'Ana Lucía Peña Úsuga' } },
  ] as unknown as Copropietario[];

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(copropietarios: Copropietario[], onElegirPrincipal?: (id: string) => Promise<void>) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<PropietarioSection propietario={PAULA} copropietarios={copropietarios} onElegirPrincipal={onElegirPrincipal} />);
  });
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

const botones = () => Array.from(container.querySelectorAll('[data-testid="hacer-principal"]'));

describe('<PropietarioSection> — elegir el principal en un empate', () => {
  it('🔴 el chip «Principal» va en el principal de verdad, no en el primero de la lista', async () => {
    // En el laboratorio la lista venía con Ana Lucía primero y el principal era Paula.
    await pintar([...duenos(5000)].reverse(), vi.fn());
    const items = Array.from(container.querySelectorAll('[data-testid="copropietario-item"]'));
    expect(items[0]!.textContent).toContain('Ana Lucía');
    expect(items[0]!.querySelector('[data-testid="copropietario-principal-chip"]')).toBeNull();
    expect(items[1]!.querySelector('[data-testid="copropietario-principal-chip"]')).not.toBeNull();
    // Y «Hacer principal» va en la otra empatada (Ana Lucía).
    expect(items[0]!.querySelector('[data-testid="hacer-principal"]')).not.toBeNull();
  });

  it('🔴 50/50: «Hacer principal» en el otro empatado, y lo manda', async () => {
    const elegir = vi.fn(async () => undefined);
    await pintar(duenos(5000), elegir);
    expect(botones()).toHaveLength(1);
    await act(async () => {
      (botones()[0] as HTMLElement).click();
    });
    expect(elegir).toHaveBeenCalledWith('ana');
    expect(toast.success).toHaveBeenCalledWith(
      'Ahora el propietario principal es Ana Lucía Peña Úsuga.',
      expect.anything(),
    );
  });

  it('70/30: no se ofrece (el principal es el de mayor participación)', async () => {
    await pintar(duenos(3000), vi.fn());
    expect(botones()).toHaveLength(0);
  });

  it('sin permiso (no llega `onElegirPrincipal`) no se ofrece', async () => {
    await pintar(duenos(5000));
    expect(botones()).toHaveLength(0);
  });

  it('si el back lo rechaza, lo dice en palabras', async () => {
    const elegir = vi.fn(async () => {
      throw new ApiError(403, 'Elegir el propietario principal de un inmueble lo hace un administrador o el contador de la inmobiliaria.', 'SOLO_ADMINISTRADOR_O_CONTADOR');
    });
    await pintar(duenos(5000), elegir);
    await act(async () => {
      (botones()[0] as HTMLElement).click();
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
