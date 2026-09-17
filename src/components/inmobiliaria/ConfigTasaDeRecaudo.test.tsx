/**
 * ConfigTasaDeRecaudo.test.tsx — «¿Cómo mides tu tasa de recaudo?» en Configuración.
 *
 * Cubre: las dos opciones con su frase y su ejemplo; lo que daría cada una con
 * los números reales de la inmobiliaria; elegir guarda SÓLO
 * `{ tasaDeRecaudoSobre }` por el mismo `onSave` del perfil y vuelve atrás si
 * el PUT falla; sin la migración en la base no deja elegir y lo dice; y un
 * miembro que no es ADMIN no puede cambiarlo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

const { getTasaDeRecaudoMock } = vi.hoisted(() => ({ getTasaDeRecaudoMock: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  inmobiliariaDashboardApi: { getTasaDeRecaudo: getTasaDeRecaudoMock },
}));

import { ConfigTasaDeRecaudo } from './ConfigTasaDeRecaudo';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import type { ComoSeMideLaTasa } from '@/lib/tasa-de-recaudo';

const AGENCY: AgencyProfile = { id: 'ag-1', name: 'Inmobiliaria ABC', memberRole: 'ADMIN' } as AgencyProfile;

/** Los números de la agencia de QA en septiembre de 2026 (medidos en sólo lectura). */
function comoSeMide(sobre: Partial<ComoSeMideLaTasa> = {}): ComoSeMideLaTasa {
  return {
    month: '2026-09',
    base: 'CAUSADO',
    porDefecto: true,
    disponible: true,
    opciones: [
      {
        base: 'CAUSADO',
        porDefecto: true,
        rotulo: 'Recaudo sobre lo causado',
        definicion: '',
        numeradorCop: 8_200_000,
        denominadorCop: 364_795_650,
        pct: 2.2478,
      },
      {
        base: 'EMITIDO',
        porDefecto: false,
        rotulo: 'Pagado de lo emitido',
        definicion: '',
        numeradorCop: 8_200_000,
        denominadorCop: 18_800_000,
        pct: 43.617,
      },
    ],
    ...sobre,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  getTasaDeRecaudoMock.mockResolvedValue(comoSeMide());
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

async function flush() {
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 0));
  });
}

async function render(props: Partial<React.ComponentProps<typeof ConfigTasaDeRecaudo>> = {}) {
  const todas: React.ComponentProps<typeof ConfigTasaDeRecaudo> = {
    agency: AGENCY,
    onSave: vi.fn().mockResolvedValue(undefined),
    canEdit: true,
    ...props,
  };
  await act(async () => {
    root.render(<ConfigTasaDeRecaudo {...todas} />);
  });
  await flush();
  return todas;
}

function q<T extends Element = HTMLElement>(testId: string): T | null {
  return container.querySelector<T>(`[data-testid="${testId}"]`);
}

describe('ConfigTasaDeRecaudo', () => {
  it('muestra las dos opciones con su explicación, su ejemplo y lo que daría con tus números', async () => {
    await render();
    const texto = container.textContent ?? '';
    expect(texto).toContain('¿Cómo mides tu tasa de recaudo?');
    expect(texto).toContain('Sobre lo causado del mes');
    expect(texto).toContain('Sobre lo emitido en cobros');
    expect(texto).toContain('tus contratos cobran $10.000.000');
    expect(texto).toContain('emitiste cobros por $4.000.000');
    // El 2,2 % y el 43,6 % de la agencia, cada uno bajo su fórmula.
    expect(q('tasa-de-recaudo-con-tus-numeros-CAUSADO')?.textContent).toContain('2.2%');
    expect(q('tasa-de-recaudo-con-tus-numeros-EMITIDO')?.textContent).toContain('43.6%');
  });

  it('marca como elegida la que está en uso: por defecto, sobre lo causado', async () => {
    await render();
    expect(q('tasa-de-recaudo-opcion-CAUSADO')?.getAttribute('aria-checked')).toBe('true');
    expect(q('tasa-de-recaudo-opcion-EMITIDO')?.getAttribute('aria-checked')).toBe('false');
  });

  it('elegir sobre lo emitido guarda { tasaDeRecaudoSobre: "EMITIDO" } y nada más', async () => {
    const props = await render();
    await act(async () => {
      q('tasa-de-recaudo-opcion-EMITIDO')!.click();
    });
    await flush();
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledWith({ tasaDeRecaudoSobre: 'EMITIDO' });
    // Después de guardar vuelve a pedir la medida para pintar la que quedó.
    expect(getTasaDeRecaudoMock).toHaveBeenCalledTimes(2);
  });

  it('si el PUT falla (p. ej. 503 sin migración), la opción vuelve a la guardada', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('503'));
    await render({ onSave });
    await act(async () => {
      q('tasa-de-recaudo-opcion-EMITIDO')!.click();
    });
    await flush();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(q('tasa-de-recaudo-opcion-CAUSADO')?.getAttribute('aria-checked')).toBe('true');
  });

  it('sin la migración en la base lo dice y no deja elegir', async () => {
    getTasaDeRecaudoMock.mockResolvedValue(comoSeMide({ disponible: false }));
    const props = await render();
    expect(q('tasa-de-recaudo-no-disponible')?.textContent).toContain('falta una actualización de la base de datos');
    expect(q<HTMLButtonElement>('tasa-de-recaudo-opcion-EMITIDO')?.disabled).toBe(true);
    await act(async () => {
      q('tasa-de-recaudo-opcion-EMITIDO')!.click();
    });
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('un miembro que no es ADMIN la ve pero no la cambia', async () => {
    await render({ canEdit: false });
    expect(q<HTMLButtonElement>('tasa-de-recaudo-opcion-EMITIDO')?.disabled).toBe(true);
    expect(container.textContent).toContain('Sólo un administrador');
  });

  it('si no llegan los números del mes, se puede elegir igual', async () => {
    getTasaDeRecaudoMock.mockRejectedValue(new Error('red'));
    await render();
    expect(q('tasa-de-recaudo-sin-numeros')).not.toBeNull();
    expect(q<HTMLButtonElement>('tasa-de-recaudo-opcion-EMITIDO')?.disabled).toBe(false);
  });
});
