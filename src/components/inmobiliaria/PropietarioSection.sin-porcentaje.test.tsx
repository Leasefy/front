/**
 * 🔴 Copropiedad migrada SIN porcentaje (Nico, 04-10-2026, tal cual: «vacío y
 * giro bloqueado», la regla del 22-09).
 *
 * El back guarda partes iguales PROVISIONALES (su CHECK exige un número) y la
 * marca `participacionesDesconocidas`. La ficha del inmueble nunca muestra ese
 * 50 % como si fuera un dato: dice «Falta el porcentaje de cada propietario»,
 * que el giro está frenado, y ofrece ponerlo.
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
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: { invitarAlPortal: vi.fn() }, consignacionesApi: {} }));

import { PropietarioSection } from './ConsignacionDetailSections';

const ANA = { id: 'ana', name: 'Ana Gómez', documentType: 'CC', documentNumber: '43090971' } as Propietario;
const PROVISIONALES = [
  { propietarioId: 'ana', participacionBps: 5_000, propietario: { name: 'Ana Gómez' } },
  { propietarioId: 'beto', participacionBps: 5_000, propietario: { name: 'Beto Gómez' } },
] as unknown as Copropietario[];

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(props: { desconocidas: boolean; onCambiar?: () => void }) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <PropietarioSection
        propietario={ANA}
        copropietarios={PROVISIONALES}
        onCambiar={props.onCambiar}
        onElegirPrincipal={vi.fn()}
        participacionesDesconocidas={props.desconocidas}
      />,
    );
  });
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

describe('<PropietarioSection> — copropiedad sin porcentaje', () => {
  it('🔴 dice «Falta el porcentaje de cada propietario», que el giro no sale, y no muestra el 50 % provisional', async () => {
    const onCambiar = vi.fn();
    await pintar({ desconocidas: true, onCambiar });

    const aviso = q('falta-el-porcentaje')?.textContent ?? '';
    expect(aviso).toContain('Falta el porcentaje de cada propietario');
    expect(aviso).toContain('el giro de este inmueble no sale');
    expect(container.querySelectorAll('[data-testid="copropietario-sin-porcentaje"]')).toHaveLength(2);
    expect(q('copropietarios-lista')?.textContent).not.toContain('50');
    // Un empate provisional no es un empate: no se ofrece «Hacer principal».
    expect(q('hacer-principal')).toBeNull();

    await act(async () => {
      (q('poner-los-porcentajes') as HTMLElement).click();
    });
    expect(onCambiar).toHaveBeenCalledTimes(1);
  });

  it('con los porcentajes puestos, la ficha es la de siempre', async () => {
    await pintar({ desconocidas: false });
    expect(q('falta-el-porcentaje')).toBeNull();
    expect(q('copropietario-sin-porcentaje')).toBeNull();
    expect(q('copropietarios-lista')?.textContent).toContain('50');
  });
});
