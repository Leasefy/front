/**
 * 🔴 Deshacer una conciliación (Nico, P11, 03-10-2026): «desvincular con
 * motivo y bitácora, sin anular el recibo. Sólo administrador o contador».
 *
 *   · el botón sólo lo ven ADMIN y CONTADOR, y nunca en un pago en línea;
 *   · pide motivo (5–500) y dice que los recibos NO se anulan;
 *   · manda el motivo al back y avisa qué recibos quedaron vivos;
 *   · un 400 del motivo va debajo del motivo; un 403 o un 503, al aviso.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import { ApiError } from '@/lib/api/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock, permisos, salidas } = vi.hoisted(() => ({
  salidas: { vinculos: [] as unknown[] },
  api: { desvincular: vi.fn(), historia: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  permisos: { agencyRole: 'CONTADOR' as string | null, canAccess: () => true, isLoading: false },
}));

vi.mock('@/lib/api/deshacer-la-conciliacion', async (original) => {
  const real = await original<typeof import('@/lib/api/deshacer-la-conciliacion')>();
  return { ...real, deshacerLaConciliacionApi: api };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('./SalidasDelExtracto', () => ({
  useSalidaDeLaFila: () => ({
    salida: { evaluacion: null, vinculos: salidas.vinculos },
    sinTabla: false,
    marcarSinTabla: () => {},
    leido: true,
  }),
}));

import { DeshacerLaConciliacion, sePuedeDeshacer } from './DeshacerLaConciliacion';
import { textoDeLoDeshecho } from '@/lib/api/deshacer-la-conciliacion';

function movimiento(sobre: Partial<MovimientoBancario> = {}): MovimientoBancario {
  return {
    id: 'm-1',
    agencyId: 'ag-1',
    fecha: '2026-09-14T00:00:00.000Z',
    valorCop: 3_000_000,
    descripcion: 'TRANSFERENCIA LAURA PEREZ',
    referencia: null,
    extractoNombre: 'sep.csv',
    estado: 'CONCILIADO',
    cobroId: null,
    reciboId: 'r-1',
    motivoIgnorado: null,
    conciliadoPorUserId: 'u-1',
    conciliadoAt: '2026-09-15T10:00:00.000Z',
    cargadoPorUserId: 'u-1',
    createdAt: '2026-09-15T10:00:00.000Z',
    candidatos: [],
    recibo: { id: 'r-1', numero: 101, anuladoAt: null },
    ...sobre,
  };
}

let raiz: Root | null = null;
let contenedor: HTMLDivElement | null = null;

async function montar(m: MovimientoBancario, onCambio = vi.fn()) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  await act(async () => {
    raiz!.render(<DeshacerLaConciliacion movimiento={m} onCambio={onCambio} />);
  });
  return onCambio;
}

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;

async function clic(el: HTMLElement | null) {
  if (!el) throw new Error('No está el elemento');
  await act(async () => {
    el.click();
  });
}

async function escribir(el: HTMLElement | null, texto: string) {
  if (!el) throw new Error('No está el campo');
  const area = el as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(area, texto);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  permisos.agencyRole = 'CONTADOR';
  salidas.vinculos = [];
  api.desvincular.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

afterEach(async () => {
  await act(async () => raiz?.unmount());
  contenedor?.remove();
  raiz = null;
  contenedor = null;
  document.body.innerHTML = '';
});

describe('deshacer una conciliación', () => {
  it.each(['ADMIN', 'CONTADOR'])('%s ve «Deshacer» en una línea conciliada', async (rol) => {
    permisos.agencyRole = rol;
    await montar(movimiento());
    expect($('[data-testid="deshacer-m-1"]')).not.toBeNull();
  });

  it.each(['AGENTE', 'VIEWER', 'AUXILIAR_CARTERA', null])('%s no lo ve', async (rol) => {
    permisos.agencyRole = rol;
    await montar(movimiento());
    expect($('[data-testid="deshacer-m-1"]')).toBeNull();
  });

  it('🔴 una línea con vínculo de SALIDA (un reverso, un giro) no lo muestra: tiene su propio «Deshacer»', async () => {
    salidas.vinculos = [{ id: 'v-1', tipo: 'REVERSO' }];
    await montar(movimiento());
    expect($('[data-testid="deshacer-m-1"]')).toBeNull();
  });

  it('ni en una línea pendiente ni en el registro de un pago en línea', () => {
    expect(sePuedeDeshacer(movimiento({ estado: 'PENDIENTE' }), 'ADMIN')).toBe(false);
    expect(sePuedeDeshacer(movimiento({ valorCop: -50_000 }), 'ADMIN')).toBe(false);
    expect(sePuedeDeshacer(movimiento({ deLaPasarela: true }), 'ADMIN')).toBe(false);
    expect(sePuedeDeshacer(movimiento({ extractoNombre: 'Pasarela de pagos' }), 'ADMIN')).toBe(false);
    expect(sePuedeDeshacer(movimiento(), 'ADMIN')).toBe(true);
  });

  it('pide el motivo, dice que el recibo no se anula y manda el motivo al back', async () => {
    api.desvincular.mockResolvedValue({
      movimientoId: 'm-1',
      estado: 'PENDIENTE',
      recibos: [
        { id: 'r-1', numero: 101, valorCop: 1_500_000 },
        { id: 'r-2', numero: 102, valorCop: 1_500_000 },
      ],
      desvinculacion: {},
    });
    const onCambio = await montar(movimiento());
    await clic($('[data-testid="deshacer-m-1"]'));

    expect($('[data-testid="que-pasa-al-deshacer-m-1"]')?.textContent).toContain('no se anulan');
    const confirmar = $('[data-testid="confirmar-deshacer-m-1"]') as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);

    await escribir($('#motivo-deshacer-m-1'), 'Era el pago de otro inquilino.');
    expect(confirmar.disabled).toBe(false);
    await clic(confirmar);

    expect(api.desvincular).toHaveBeenCalledWith('m-1', 'Era el pago de otro inquilino.');
    expect(toastMock.success).toHaveBeenCalledWith(
      'La línea volvió a pendientes. Los recibos N.º 101 y N.º 102 siguen vivos, sin línea del banco: concílialos contra la línea correcta.',
    );
    expect(onCambio).toHaveBeenCalledTimes(1);
  });

  it('un 400 del motivo va debajo del motivo, no a un aviso', async () => {
    api.desvincular.mockRejectedValue(
      new ApiError(400, 'Escribe por qué deshaces la conciliación.', 'MOTIVO_OBLIGATORIO', {
        statusCode: 400,
        code: 'MOTIVO_OBLIGATORIO',
        message: 'Escribe por qué deshaces la conciliación.',
        campos: [{ campo: 'motivo', regla: 'longitud', mensaje: 'Entre 5 y 500 caracteres.' }],
      }),
    );
    await montar(movimiento());
    await clic($('[data-testid="deshacer-m-1"]'));
    await escribir($('#motivo-deshacer-m-1'), 'Motivo largo de verdad');
    await clic($('[data-testid="confirmar-deshacer-m-1"]'));
    expect($('#motivo-deshacer-m-1-error')?.textContent).toContain('Entre 5 y 500 caracteres.');
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('un 403 (otro rol) o un 503 (sin la bitácora) se dicen en el aviso, con las palabras del back', async () => {
    api.desvincular.mockRejectedValue(
      new ApiError(
        403,
        'Deshacer una conciliación es de un administrador o del contador de la inmobiliaria.',
        'SOLO_ADMINISTRADOR_O_CONTADOR',
        {
          statusCode: 403,
          code: 'SOLO_ADMINISTRADOR_O_CONTADOR',
          message: 'Deshacer una conciliación es de un administrador o del contador de la inmobiliaria.',
        },
      ),
    );
    await montar(movimiento());
    await clic($('[data-testid="deshacer-m-1"]'));
    await escribir($('#motivo-deshacer-m-1'), 'Era el pago de otro inquilino.');
    await clic($('[data-testid="confirmar-deshacer-m-1"]'));
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringContaining('administrador o del contador'),
    );
  });

  it('textoDeLoDeshecho: uno, varios y ninguno', () => {
    const base = { movimientoId: 'm', estado: 'PENDIENTE' as const, desvinculacion: {} as never };
    expect(textoDeLoDeshecho({ ...base, recibos: [] })).toBe('La línea volvió a pendientes.');
    expect(
      textoDeLoDeshecho({ ...base, recibos: [{ id: 'a', numero: 7, valorCop: 1 }] }),
    ).toContain('El recibo N.º 7 sigue vivo');
    expect(
      textoDeLoDeshecho({
        ...base,
        recibos: [
          { id: 'a', numero: 7, valorCop: 1 },
          { id: 'b', numero: 8, valorCop: 1 },
          { id: 'c', numero: 9, valorCop: 1 },
        ],
      }),
    ).toContain('Los recibos N.º 7, N.º 8 y N.º 9 siguen vivos');
  });
});
