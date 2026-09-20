/**
 * propuesta-del-agente.test.tsx — «el agente de mantenimiento PROPONE, una
 * persona APRUEBA» (Nico y Juan Camilo, 2026-09-16), visto desde el panel.
 *
 * Lo que fija:
 *   · La propuesta pendiente se ve con su cotización, su sugerencia y su nota,
 *     y dice que la aprobación la hace una persona. «Revisar y aprobar» lleva a
 *     la aprobación de ESA cotización; nada se aprueba solo.
 *   · Una propuesta ya atendida, o con una cotización ya elegida, no se vuelve
 *     a ofrecer.
 *   · El cargo al inquilino se ve con su valor y la cuota donde entró.
 *   · En el diálogo de a cargo de quién, la sugerencia del agente se DICE pero
 *     no se preselecciona: confirmar sigue deshabilitado hasta que la persona
 *     elige.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { PropuestaYCargoDeLaReparacion } from './PropuestaYCargoDeLaReparacion';
import { ACargoDeDialog } from './ACargoDeDialog';

function solicitud(overrides: Partial<SolicitudMantenimiento> = {}): SolicitudMantenimiento {
  return {
    id: 'sol-1',
    consignacionId: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'own-1',
    tenantId: 'ten-1',
    propertyTitle: 'Apto 402 — Laureles',
    propertyAddress: 'Cra 76 #34-12',
    tenantName: 'Camila Restrepo',
    propietarioName: 'Ana Dueña',
    type: 'plumbing',
    priority: 'medium',
    status: 'quoted',
    title: 'Gotera en el baño',
    description: 'El sifón del lavamanos gotea',
    photoUrls: [],
    quotes: [
      {
        id: 'q-1',
        providerName: 'Plomería Rápida',
        providerPhone: '3001234567',
        amount: 180_000,
        description: 'Cambio de sifón',
        estimatedDays: 1,
        createdAt: '2026-09-15T10:00:00.000Z',
      },
    ],
    paidBy: 'owner',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  } as SolicitudMantenimiento;
}

const PROPUESTA = {
  quoteId: 'q-1',
  aCargoDeSugerido: 'INQUILINO' as const,
  nota: 'El inquilino reconoció que tapó el sifón',
  propuestaPor: 'AGENTE' as const,
  propuestaAt: '2026-09-15T11:00:00.000Z',
  atendidaAt: null,
};

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => {
    raiz.unmount();
  });
  contenedor.remove();
});

const q = (testid: string) => document.body.querySelector(`[data-testid="${testid}"]`);

describe('<PropuestaYCargoDeLaReparacion>', () => {
  it('muestra la propuesta pendiente y «Revisar y aprobar» lleva a esa cotización', async () => {
    const onRevisar = vi.fn();
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({ propuesta: PROPUESTA })}
          onRevisar={onRevisar}
        />,
      );
    });

    const bloque = q('propuesta-del-agente');
    expect(bloque).not.toBeNull();
    const texto = bloque?.textContent ?? '';
    expect(texto).toContain('Propuesta del agente');
    expect(texto).toContain('Plomería Rápida');
    expect(texto).toMatch(/180\.?000/);
    expect(texto).toContain('a cargo del inquilino');
    expect(texto).toContain('El inquilino reconoció que tapó el sifón');
    expect(texto).toContain('la haces tú');

    await act(async () => {
      (q('propuesta-revisar') as HTMLButtonElement).click();
    });
    expect(onRevisar).toHaveBeenCalledWith('sol-1', 'q-1');
  });

  it('sin quién apruebe, no ofrece el botón; y sin cotización dice que pide aprobación', async () => {
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({ propuesta: { ...PROPUESTA, quoteId: null, nota: null } })}
          onRevisar={vi.fn()}
        />,
      );
    });
    expect(q('propuesta-del-agente')?.textContent).toContain(
      'Pide que una persona apruebe la reparación.',
    );
    expect(q('propuesta-revisar')).toBeNull();
    expect(q('propuesta-nota')).toBeNull();

    await act(async () => {
      raiz.render(<PropuestaYCargoDeLaReparacion solicitud={solicitud({ propuesta: PROPUESTA })} />);
    });
    expect(q('propuesta-del-agente')).not.toBeNull();
    expect(q('propuesta-revisar')).toBeNull();
  });

  it('una propuesta atendida o con cotización ya elegida no se vuelve a ofrecer', async () => {
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({
            propuesta: { ...PROPUESTA, atendidaAt: '2026-09-16T09:00:00.000Z' },
          })}
          onRevisar={vi.fn()}
        />,
      );
    });
    expect(contenedor.innerHTML).toBe('');

    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({ propuesta: PROPUESTA, selectedQuoteId: 'q-1' })}
          onRevisar={vi.fn()}
        />,
      );
    });
    expect(q('propuesta-del-agente')).toBeNull();
  });

  it('el cargo al inquilino dice cuánto y en qué cuota entró', async () => {
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({
            selectedQuoteId: 'q-1',
            propuesta: { ...PROPUESTA, atendidaAt: '2026-09-16T09:00:00.000Z' },
            cargoAlInquilino: {
              id: 'c-1',
              contractId: 'k-1',
              nombre: 'Reparación: Gotera en el baño',
              valorCop: 180_000,
              mesDesde: '2026-09',
              mes: '2026-10',
              cuotaId: 'cuota-10',
            },
          })}
        />,
      );
    });
    expect(q('propuesta-del-agente')).toBeNull();
    const cargo = q('cargo-al-inquilino')?.textContent ?? '';
    expect(cargo).toContain('Cargo al inquilino');
    expect(cargo).toMatch(/180\.?000/);
    expect(cargo.toLowerCase()).toContain('octubre');
  });
});

describe('<ACargoDeDialog> — la sugerencia del agente', () => {
  it('se dice, pero no se preselecciona: confirmar espera a que la persona elija', async () => {
    const onConfirmar = vi.fn(() => Promise.resolve());
    await act(async () => {
      raiz.render(
        <ACargoDeDialog
          abierto
          onOpenChange={vi.fn()}
          cotizacion={{ proveedor: 'Plomería Rápida', valorCop: 180_000 }}
          sugerencia="INQUILINO"
          onConfirmar={onConfirmar}
        />,
      );
    });

    expect(q('a-cargo-de-sugerencia')?.textContent).toContain(
      'El agente sugiere que quede a cargo del inquilino. La decisión es tuya.',
    );
    expect(q('a-cargo-de-INQUILINO')?.getAttribute('aria-checked')).toBe('false');
    expect(q('a-cargo-de-PROPIETARIO')?.getAttribute('aria-checked')).toBe('false');
    expect((q('a-cargo-de-confirmar') as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      (q('a-cargo-de-PROPIETARIO') as HTMLButtonElement).click();
    });
    await act(async () => {
      (q('a-cargo-de-confirmar') as HTMLButtonElement).click();
    });
    // H-03: el diálogo devuelve un objeto (ver `LoQueSeAprueba`).
    expect(onConfirmar).toHaveBeenCalledWith({ aCargoDe: 'PROPIETARIO' });
  });

  it('sin sugerencia no dice nada del agente', async () => {
    await act(async () => {
      raiz.render(
        <ACargoDeDialog
          abierto
          onOpenChange={vi.fn()}
          cotizacion={{ proveedor: 'Plomería Rápida', valorCop: 180_000 }}
          onConfirmar={vi.fn(() => Promise.resolve())}
        />,
      );
    });
    expect(q('a-cargo-de')).not.toBeNull();
    expect(q('a-cargo-de-sugerencia')).toBeNull();
  });
});
