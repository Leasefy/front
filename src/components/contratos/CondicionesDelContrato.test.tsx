/**
 * Las condiciones del contrato (Nico, 17-09): D9 gastos de cobranza, seguro
 * opcional con aceptación expresa, póliza y administración de la copropiedad.
 *
 * Lo que no puede fallar: que un seguro se cobre sin que el inquilino lo haya
 * aceptado (con fecha y quién), y que la administración de la copropiedad diga
 * quién la paga.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    condiciones: vi.fn(),
    fijarGastosDeCobranza: vi.fn(),
    aceptarSeguroOpcional: vi.fn(),
    retirarSeguroOpcional: vi.fn(),
    registrarPoliza: vi.fn(),
    fijarAdministracionDeLaCopropiedad: vi.fn(),
  },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { cicloDeVidaApi, type CondicionesDelContrato as Condiciones } from '@/lib/api/ciclo-de-vida.service';
import { CondicionesDelContrato } from './CondicionesDelContrato';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function condiciones(overrides: Partial<Condiciones> = {}): Condiciones {
  return {
    contractId: 'c1',
    gastosDeCobranza: { disponible: true, delContrato: null, deLaAgencia: null, resuelto: null },
    seguroOpcional: {
      disponible: true,
      oferta: { plan: 'BASIC', nombre: 'Seguro básico', primaCop: 45_000 },
      aceptado: null,
    },
    poliza: {
      disponible: true,
      aseguradora: null,
      numero: null,
      cobertura: null,
      vigenciaDesde: null,
      vigenciaHasta: null,
    },
    administracion: { disponible: true, modalidad: null, valorCop: null, delMandatoCop: 250_000 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
});

async function montar(puedeEditar = true) {
  await act(async () => {
    root!.render(<CondicionesDelContrato contractId="c1" puedeEditar={puedeEditar} />);
  });
}

const $ = (id: string) => container!.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('<CondicionesDelContrato> (17-09)', () => {
  it('🔴 D9: marcar que no pacta gastos de cobranza lo guarda y lo dice', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.fijarGastosDeCobranza.mockResolvedValue(
      condiciones({ gastosDeCobranza: { disponible: true, delContrato: false, deLaAgencia: null, resuelto: false } }),
    );
    await montar();
    await act(async () => ($('pacta-gastos-NO') as HTMLInputElement).click());
    expect(api.fijarGastosDeCobranza).toHaveBeenCalledWith('c1', false);
    expect($('gastos-no-pactados')!.textContent).toContain('no causa gastos de cobranza');
  });

  it('D9: «lo que diga la inmobiliaria» manda null, no false', async () => {
    api.condiciones.mockResolvedValue(
      condiciones({ gastosDeCobranza: { disponible: true, delContrato: false, deLaAgencia: true, resuelto: false } }),
    );
    api.fijarGastosDeCobranza.mockResolvedValue(condiciones());
    await montar();
    await act(async () => ($('pacta-gastos-HEREDA') as HTMLInputElement).click());
    expect(api.fijarGastosDeCobranza).toHaveBeenCalledWith('c1', null);
  });

  it('🔴 el seguro opcional NO se cobra sin aceptación expresa: hay que marcarla, con quién y cuándo', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.aceptarSeguroOpcional.mockResolvedValue(
      condiciones({
        seguroOpcional: {
          disponible: true,
          oferta: { plan: 'BASIC', nombre: 'Seguro básico', primaCop: 45_000 },
          aceptado: {
            nombre: 'Seguro básico',
            primaCop: 45_000,
            aceptadoEl: '2026-09-17',
            aceptadoPor: 'Ana Díaz',
          },
        },
      }),
    );
    await montar();
    // Sin marcar la casilla no hay ni dónde escribir quién aceptó.
    expect($('seguro-quien')).toBeNull();
    expect(container!.textContent).toContain('No se cobra mientras el inquilino no lo acepte');

    await act(async () => ($('acepta-seguro') as HTMLInputElement).click());
    const guardar = $('guardar-seguro') as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
    await escribir($('seguro-quien') as HTMLInputElement, 'Ana Díaz');
    await act(async () => ($('guardar-seguro') as HTMLButtonElement).click());

    expect(api.aceptarSeguroOpcional).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ aceptadoPor: 'Ana Díaz', primaCop: 45000 }),
    );
    expect(container!.textContent).toContain('Aceptado por Ana Díaz el 2026-09-17');
  });

  it('la póliza del contrato se registra y no le cobra al inquilino', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.registrarPoliza.mockResolvedValue(condiciones());
    await montar();
    expect($('poliza-del-contrato')!.textContent).toContain('no se le cobra al inquilino');
    const campos = $('poliza-del-contrato')!.querySelectorAll('input');
    await escribir(campos[0] as HTMLInputElement, 'Sura');
    await escribir(campos[1] as HTMLInputElement, 'POL-9');
    await act(async () => ($('guardar-poliza') as HTMLButtonElement).click());
    expect(api.registrarPoliza).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ aseguradora: 'Sura', numero: 'POL-9' }),
    );
  });

  it('🔴 administración: «la paga la inmobiliaria» exige su valor y lo manda', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.fijarAdministracionDeLaCopropiedad.mockResolvedValue(
      condiciones({
        administracion: {
          disponible: true,
          modalidad: 'LA_PAGA_LA_INMOBILIARIA',
          valorCop: 300_000,
          delMandatoCop: 250_000,
        },
      }),
    );
    await montar();
    await act(async () => ($('modalidad-LA_PAGA_LA_INMOBILIARIA') as HTMLInputElement).click());
    expect(($('guardar-administracion') as HTMLButtonElement).disabled).toBe(true);
    await escribir($('valor-administracion') as HTMLInputElement, '300.000');
    await act(async () => ($('guardar-administracion') as HTMLButtonElement).click());
    expect(api.fijarAdministracionDeLaCopropiedad).toHaveBeenCalledWith('c1', {
      modalidad: 'LA_PAGA_LA_INMOBILIARIA',
      valorCop: 300000,
    });
  });

  it('«incluida en el canon» se guarda sin valor', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.fijarAdministracionDeLaCopropiedad.mockResolvedValue(condiciones());
    await montar();
    await act(async () => ($('modalidad-INCLUIDA_EN_CANON') as HTMLInputElement).click());
    await act(async () => ($('guardar-administracion') as HTMLButtonElement).click());
    expect(api.fijarAdministracionDeLaCopropiedad).toHaveBeenCalledWith('c1', { modalidad: 'INCLUIDA_EN_CANON' });
  });

  it('sin migración lo dice y no ofrece guardar', async () => {
    api.condiciones.mockResolvedValue(
      condiciones({
        gastosDeCobranza: { disponible: false, delContrato: null, deLaAgencia: null, resuelto: null },
        seguroOpcional: { disponible: false, oferta: null, aceptado: null },
        poliza: {
          disponible: false,
          aseguradora: null,
          numero: null,
          cobertura: null,
          vigenciaDesde: null,
          vigenciaHasta: null,
        },
        administracion: { disponible: false, modalidad: null, valorCop: null, delMandatoCop: null },
      }),
    );
    await montar();
    expect(container!.textContent).toContain('Falta una actualización de la base');
    expect($('guardar-poliza')).toBeNull();
    expect($('guardar-administracion')).toBeNull();
  });

  it('sin permiso de editar se lee pero no se cambia nada', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    await montar(false);
    expect($('condiciones-del-contrato')).not.toBeNull();
    expect($('acepta-seguro')).toBeNull();
    expect($('guardar-administracion')).toBeNull();
  });
});
