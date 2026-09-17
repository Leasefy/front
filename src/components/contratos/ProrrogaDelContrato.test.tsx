/**
 * D5 · La prórroga en la ficha del contrato (Nico, 17-09).
 *
 * Lo que esta pantalla no puede equivocar: decir que un contrato se prorroga
 * cuando hay aviso de no renovación, o dejar prorrogar sin la migración.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    prorroga: vi.fn(),
    prorrogar: vi.fn(),
    fijarMesesDeProrroga: vi.fn(),
    fijarNoSeProrroga: vi.fn(),
    registrarAvisoDeNoRenovacion: vi.fn(),
    retirarAvisoDeNoRenovacion: vi.fn(),
  },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { cicloDeVidaApi, type PlanDeLaProrroga } from '@/lib/api/ciclo-de-vida.service';
import { ProrrogaDelContrato } from './ProrrogaDelContrato';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function plan(overrides: Partial<PlanDeLaProrroga> = {}): PlanDeLaProrroga {
  return {
    contractId: 'c1',
    accion: 'NO_VENCIDO',
    porQue: 'Todavía no vence.',
    ultimoDia: '2026-12-04',
    diasVencido: 0,
    regla: 'LEY_820_ART_6',
    meses: 12,
    tramos: [{ finAnterior: '2026-12-05', finNuevo: '2027-12-05' }],
    finNuevo: '2027-12-05',
    automatica: true,
    aviso: null,
    prorrogaMeses: null,
    noSeProrroga: false,
    noSeProrrogaDisponible: true,
    puenteDeRenovacion: false,
    uso: 'VIVIENDA',
    automaticaPrendida: false,
    disponible: true,
    historial: [],
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
    root!.render(<ProrrogaDelContrato contract={{ id: 'c1' }} puedeEditar={puedeEditar} />);
  });
}

const $ = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('<ProrrogaDelContrato> (D5)', () => {
  it('🔴 sin aviso dice hasta cuándo rige (D8) y por cuánto se prorroga', async () => {
    api.prorroga.mockResolvedValue(plan());
    await montar();
    const frase = $('prorroga-frase')!.textContent ?? '';
    expect(frase).toContain('2026-12-04');
    expect(frase).toContain('2027-12-05');
    expect(frase).toContain('por el mismo término');
  });

  it('🔴 con aviso de no renovación NO promete prórroga y ofrece retirarlo', async () => {
    api.prorroga.mockResolvedValue(
      plan({ aviso: { at: '2026-09-01T00:00:00.000Z', por: 'INQUILINO', motivo: 'Se muda', fuente: 'CONTRATO' } }),
    );
    await montar();
    expect($('prorroga-frase')!.textContent).toContain('no se prorroga');
    expect($('aviso-de-no-renovacion')!.textContent).toContain('El inquilino');
    expect($('abrir-aviso')).toBeNull();
  });

  it('vencido sin aviso: ofrece prorrogar y avisa que el proceso diario está apagado', async () => {
    api.prorroga.mockResolvedValue(
      plan({
        accion: 'PRORROGAR',
        porQue: 'Venció el 2026-09-04 y no hay aviso: se prorroga 12 meses.',
        diasVencido: 13,
      }),
    );
    api.prorrogar.mockResolvedValue({
      contractId: 'c1',
      finAnterior: '2026-09-05',
      finNuevo: '2027-09-05',
      meses: 12,
      regla: 'LEY_820_ART_6',
      tramos: 1,
    });
    await montar();
    const bloque = $('prorroga-por-hacer')!;
    expect(bloque.textContent).toContain('se prorroga 12 meses');
    expect(bloque.textContent).toContain('apagada');
    await act(async () => ($('prorrogar') as HTMLButtonElement).click());
    expect(api.prorrogar).toHaveBeenCalledWith('c1');
    // Después de prorrogar vuelve a pedir el plan: nada se inventa en pantalla.
    expect(api.prorroga).toHaveBeenCalledTimes(2);
  });

  it('🔴 la alerta del aviso vencido se ve como alerta', async () => {
    api.prorroga.mockResolvedValue(
      plan({
        accion: 'ALERTA_AVISO_DE_NO_RENOVACION',
        porQue: 'Venció con aviso de no renovación y sigue activo: decide qué hacer.',
        aviso: { at: '2026-06-01T00:00:00.000Z', por: 'PROPIETARIO', motivo: null, fuente: 'RENOVACION' },
      }),
    );
    await montar();
    expect($('prorroga-ALERTA_AVISO_DE_NO_RENOVACION')!.textContent).toContain('decide qué hacer');
    // El aviso vino de la renovación del inmueble: acá no se retira.
    expect($('aviso-de-no-renovacion')!.textContent).toContain('se retira desde ahí');
  });

  it('sin migración lo dice y no deja tocar nada', async () => {
    api.prorroga.mockResolvedValue(plan({ accion: 'PRORROGAR', disponible: false }));
    await montar();
    expect($('prorroga-sin-migracion')!.textContent).toContain('actualización de la base');
    expect($('prorrogar')).toBeNull();
  });

  it('registrar el aviso manda quién y por qué', async () => {
    api.prorroga.mockResolvedValue(plan());
    api.registrarAvisoDeNoRenovacion.mockResolvedValue(
      plan({ aviso: { at: '2026-09-17T00:00:00.000Z', por: 'PROPIETARIO', motivo: 'Va a vender', fuente: 'CONTRATO' } }),
    );
    await montar();
    await act(async () => ($('abrir-aviso') as HTMLButtonElement).click());
    await act(async () => ($('aviso-parte-PROPIETARIO') as HTMLButtonElement).click());
    const motivo = $('aviso-motivo') as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(motivo, 'Va a vender');
      motivo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => ($('aviso-confirmar') as HTMLButtonElement).click());
    expect(api.registrarAvisoDeNoRenovacion).toHaveBeenCalledWith('c1', {
      parte: 'PROPIETARIO',
      motivo: 'Va a vender',
    });
  });

  it('un contrato que no aplica no ocupa espacio en la ficha', async () => {
    api.prorroga.mockResolvedValue(plan({ accion: 'NO_APLICA' }));
    await montar();
    expect($('prorroga-del-contrato')).toBeNull();
  });

  it('🔴 con una renovación en curso se prorroga MES A MES: la deuda no desaparece', async () => {
    api.prorroga.mockResolvedValue(
      plan({
        accion: 'PRORROGAR',
        regla: 'MES_A_MES',
        meses: 1,
        puenteDeRenovacion: true,
        finNuevo: '2027-01-05',
        porQue:
          'Venció el 2026-12-04 con una renovación aprobada o firmándose: se prorroga MES A MES (hasta el 2027-01-05) para que la deuda no desaparezca mientras se firma. Al firmarla, la renovación manda.',
      }),
    );
    await montar();
    expect($('prorroga-por-hacer')!.textContent).toContain('MES A MES');
    expect($('puente-de-renovacion')!.textContent).toContain('la deuda del inquilino no');
  });

  it('🔴 «no se prorroga»: la casilla lo guarda, y el término deja de preguntarse', async () => {
    api.prorroga.mockResolvedValue(plan());
    api.fijarNoSeProrroga.mockResolvedValue(plan({ noSeProrroga: true }));
    await montar();

    expect($('meses-de-prorroga')).toBeTruthy();
    await act(async () => ($('no-se-prorroga-casilla') as HTMLInputElement).click());
    expect(api.fijarNoSeProrroga).toHaveBeenCalledWith('c1', true);
    // Con la bandera puesta, el término de la prórroga ya no aplica.
    expect($('meses-de-prorroga')).toBeNull();
  });

  it('la alerta de «no se prorroga» dice que nadie genera cuotas', async () => {
    api.prorroga.mockResolvedValue(
      plan({
        accion: 'ALERTA_NO_SE_PRORROGA',
        noSeProrroga: true,
        porQue:
          'Venció el 2026-12-04 y el contrato dice que NO se prorroga: no se generan cuotas nuevas. Decide: renovarlo, o terminarlo con la fecha de entrega.',
      }),
    );
    await montar();
    expect($('prorroga-ALERTA_NO_SE_PRORROGA')!.textContent).toContain('no se generan cuotas nuevas');
  });

  it('sin la migración 20260918021000 la casilla se ve pero no se puede mover', async () => {
    api.prorroga.mockResolvedValue(plan({ noSeProrrogaDisponible: false }));
    await montar();
    expect(($('no-se-prorroga-casilla') as HTMLInputElement).disabled).toBe(true);
    expect($('no-se-prorroga')!.textContent).toContain('Falta una actualización de la base');
  });
});
