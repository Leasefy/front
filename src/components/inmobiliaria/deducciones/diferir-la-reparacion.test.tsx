/**
 * Portofino (22-10-2026): «la reparación valió 2 millones y la vamos a diferir
 * en 5 meses». Al aprobar, cada lado que paga se cobra de una vez o en varios
 * meses; la tarjeta y el portal del propietario dicen en qué meses.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import type { AprobacionDeReparacion } from '@/lib/types/deducciones';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

const mantenimiento = vi.hoisted(() => ({ mesesParaDiferir: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ mantenimientoApi: mantenimiento }));
vi.mock('@/lib/plata/use-plata-con-centavos', () => ({ usePlataConCentavos: () => false }));

import { ACargoDeDialog, partesDeLaReparacion } from './ACargoDeDialog';
import { PropuestaYCargoDeLaReparacion } from './PropuestaYCargoDeLaReparacion';
import { planEnFrase } from '@/lib/mantenimiento/reparacion-diferida';

const MESES = [
  { mes: '2026-10', sePuede: false, porQue: 'PAGADA' as const },
  { mes: '2026-11', sePuede: true },
  { mes: '2026-12', sePuede: true },
  { mes: '2027-01', sePuede: true },
];

let contenedor: HTMLDivElement;
let raiz: Root;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  mantenimiento.mesesParaDiferir.mockReset();
  mantenimiento.mesesParaDiferir.mockResolvedValue({ disponible: true, contractId: 'c-1', meses: MESES });
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

const q = (testid: string) => document.body.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null;
const clic = async (testid: string) => {
  await act(async () => {
    q(testid)!.click();
  });
};
const escribir = async (testid: string, valor: string) => {
  const el = q(testid) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('partes de la reparación (la regla del back)', () => {
  it('compartida: el inquilino hacia abajo y el propietario se lleva el resto', () => {
    expect(partesDeLaReparacion('COMPARTIDA', 1_000_001, 30)).toEqual({ PROPIETARIO: 700_001, INQUILINO: 300_000 });
    expect(partesDeLaReparacion('PROPIETARIO', 900_000, 50)).toEqual({ PROPIETARIO: 900_000, INQUILINO: 0 });
    expect(partesDeLaReparacion('INMOBILIARIA', 900_000, 50)).toEqual({ PROPIETARIO: 0, INQUILINO: 0 });
  });

  it('el plan en una frase', () => {
    expect(planEnFrase([{ mes: '2027-01' }, { mes: '2026-11' }, { mes: '2026-12' }])).toBe(
      'en 3 meses (noviembre de 2026 a enero de 2027)',
    );
  });
});

describe('<ACargoDeDialog> — diferir en meses', () => {
  const abrir = async (onConfirmar = vi.fn(() => Promise.resolve())) => {
    await act(async () => {
      raiz.render(
        <ACargoDeDialog
          abierto
          onOpenChange={vi.fn()}
          cotizacion={{ proveedor: 'Techos Andes', valorCop: 900_000 }}
          solicitudId="sol-1"
          onConfirmar={onConfirmar}
        />,
      );
    });
    return onConfirmar;
  };

  it('a cargo del propietario: «En varios meses» trae los meses y manda el plan que suma', async () => {
    const onConfirmar = await abrir();
    await clic('a-cargo-de-PROPIETARIO');
    expect(q('cuando-se-cobra')).not.toBeNull();
    await clic('cuando-PROPIETARIO-meses');
    expect(mantenimiento.mesesParaDiferir).toHaveBeenCalledWith('sol-1', 'PROPIETARIO');
    await escribir('diferir-en', '3');
    await clic('diferir');
    expect(q('suma-de-los-meses')?.textContent).toContain('900.000');
    await clic('a-cargo-de-confirmar');
    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        aCargoDe: 'PROPIETARIO',
        diferir: {
          propietario: [
            { mes: '2026-11', valorCop: 300_000 },
            { mes: '2026-12', valorCop: 300_000 },
            { mes: '2027-01', valorCop: 300_000 },
          ],
        },
      }),
    );
  });

  it('en meses sin elegir ninguno: no deja aprobar', async () => {
    await abrir();
    await clic('a-cargo-de-INQUILINO');
    await clic('cuando-INQUILINO-meses');
    expect((q('a-cargo-de-confirmar') as HTMLButtonElement).disabled).toBe(true);
    await clic('cuando-INQUILINO-una-vez');
    expect((q('a-cargo-de-confirmar') as HTMLButtonElement).disabled).toBe(false);
  });

  it('de una vez (lo de siempre): no manda meses', async () => {
    const onConfirmar = await abrir();
    await clic('a-cargo-de-INQUILINO');
    await clic('a-cargo-de-confirmar');
    expect(onConfirmar).toHaveBeenCalledWith({ aCargoDe: 'INQUILINO' });
  });

  it('a cargo de la inmobiliaria nadie paga: no se ofrece diferir', async () => {
    await abrir();
    await clic('a-cargo-de-INMOBILIARIA');
    expect(q('cuando-se-cobra')).toBeNull();
  });

  it('compartida: un bloque por lado, cada uno con lo suyo', async () => {
    await abrir();
    await clic('a-cargo-de-COMPARTIDA');
    expect(q('cuando-PROPIETARIO-meses')).not.toBeNull();
    expect(q('cuando-INQUILINO-meses')).not.toBeNull();
    expect(q('cuando-se-cobra')?.textContent).toContain('450.000');
  });
});

const BASE: AprobacionDeReparacion = {
  id: 'ap-1',
  solicitudId: 'sol-1',
  quoteId: 'q-1',
  consignacionId: 'cons-1',
  propietarioId: 'own-1',
  valorCop: 900_000,
  motivo: 'Techo · Techos Andes',
  estado: 'PENDIENTE',
  emergencia: false,
  motivoDeEmergencia: null,
  soporteNombre: null,
  aviso: null,
  pedidaAt: '2026-10-22T10:00:00.000Z',
  decididaAt: null,
  motivoDeRechazo: null,
  anuladaAt: null,
  motivoDeAnulacion: null,
};

const solicitud = (o: Partial<SolicitudMantenimiento>) =>
  ({
    id: 'sol-1',
    quotes: [],
    selectedQuoteId: 'q-1',
    ...o,
  }) as SolicitudMantenimiento;

describe('<PropuestaYCargoDeLaReparacion> — lo diferido', () => {
  it('pendiente: dice en qué meses se le descontaría si la aprueba', async () => {
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({
            aprobacionDelPropietario: {
              ...BASE,
              diferidaEn: [
                { mes: '2026-11', valorCop: 450_000 },
                { mes: '2026-12', valorCop: 450_000 },
              ],
            },
          })}
        />,
      );
    });
    expect(q('diferida-propietario')?.textContent).toContain(
      'Si la aprueba, se le descuenta en 2 meses (noviembre de 2026 a diciembre de 2026).',
    );
    expect(q('meses-del-propietario')?.textContent).toContain('nov 2026');
  });

  it('del inquilino: los meses de su cuota, con cuánto en cada uno', async () => {
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({
            diferida: {
              INQUILINO: {
                conceptoId: 'cc-1',
                contractId: 'c-1',
                valorCop: 500_001,
                plan: [
                  { mes: '2026-11', valorCop: 250_000 },
                  { mes: '2026-12', valorCop: 250_001 },
                ],
              },
            },
          })}
        />,
      );
    });
    expect(q('diferida-inquilino')?.textContent).toContain('Al inquilino se le cobra en 2 meses');
    expect(q('meses-del-inquilino')?.textContent).toContain('250.001');
  });
});
