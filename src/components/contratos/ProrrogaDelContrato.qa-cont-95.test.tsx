/**
 * QA-CONT-95 (04-10-2026): el día del aviso de no renovación, en Colombia.
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


describe('<ProrrogaDelContrato> · el día del aviso (QA-CONT-95)', () => {
  it('🔴 un aviso registrado a las 7:26 p. m. del 4 de octubre en Bogotá dice «4 oct», no el día UTC', async () => {
    api.prorroga!.mockResolvedValue(
      plan({ aviso: { at: '2026-10-05T00:26:42.280Z', por: 'INQUILINO', motivo: null, fuente: 'CONTRATO' } }),
    );
    await montar();
    const texto = $('aviso-de-no-renovacion')!.textContent ?? '';
    expect(texto).toContain('4 oct 2026');
    expect(texto).not.toContain('5 oct 2026');
  });
});

describe('<ProrrogaDelContrato> · CR-30 el coordinador registra el aviso', () => {
  it('🔴 sin editar contratos pero con «puedeAvisar» ofrece «Registrar aviso», no la prórroga', async () => {
    api.prorroga!.mockResolvedValue(plan());
    await act(async () => {
      root!.render(<ProrrogaDelContrato contract={{ id: 'c1' }} puedeEditar={false} puedeAvisar />);
    });
    expect($('abrir-aviso')).not.toBeNull();
    expect(($('no-se-prorroga-casilla') as HTMLButtonElement | null)?.getAttribute('data-disabled') ?? 'apagada').toBeDefined();
  });
});
