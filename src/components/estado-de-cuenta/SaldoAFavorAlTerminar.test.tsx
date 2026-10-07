/**
 * 🔴 Ola E (Juan Camilo): el saldo a favor del inquilino al terminar el
 * contrato, en el estado de cuenta del panel. Lo que tiene a favor, lo que
 * debe (se descuenta primero), lo que se le devuelve, y «Registrar la
 * devolución» → cuenta por pagar (egreso pendiente a su nombre).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { LiquidacionDelSaldoAFavor } from '@/lib/api/saldo-a-favor';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
const api = vi.hoisted(() => ({ liquidacion: vi.fn(), devolver: vi.fn(), revisado: vi.fn() }));
vi.mock('@/lib/api/saldo-a-favor', async (original) => ({
  ...(await original<typeof import('@/lib/api/saldo-a-favor')>()),
  saldoAFavorApi: api,
}));
const permisos = vi.hoisted(() => ({ puede: true }));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({
    canAccess: (modulo: string, accion: string) => permisos.puede && modulo === 'cobros' && accion === 'create',
  }),
}));

import {
  SaldoAFavorAlTerminarSeccion,
  claveDelEstadoDeLaDevolucion,
  haySaldoAFavorQueMostrar,
} from './SaldoAFavorAlTerminar';

const TERMINADO: LiquidacionDelSaldoAFavor = {
  disponible: true,
  motivo: null,
  contrato: { id: 'ct-1', numero: '14', estado: 'EXPIRED', terminado: true },
  inquilino: { tenantId: 'inq-1', nombre: 'Ana Gómez', documento: '1020' },
  aFavor: { anticipoDelContratoCop: 900_000, saldoSueltoCop: 100_000, sueltoIncluido: true, totalCop: 1_000_000 },
  debeCop: 600_000,
  aDevolverCop: 400_000,
  devolucion: null,
  sePuedeDevolver: true,
  porQueNo: null,
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  api.liquidacion.mockReset();
  api.devolver.mockReset();
  api.revisado.mockReset();
  permisos.puede = true;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function montar() {
  await act(async () => {
    root.render(<SaldoAFavorAlTerminarSeccion contractId="ct-1" />);
  });
}

const porTestId = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function clic(el: Element | null) {
  expect(el).not.toBeNull();
  await act(async () => {
    (el as HTMLElement).click();
  });
}

async function escribir(id: string, valor: string) {
  const input = host.querySelector<HTMLInputElement>(`#${id}`);
  expect(input).not.toBeNull();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    setter?.call(input, valor);
    input!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('<SaldoAFavorAlTerminarSeccion>', () => {
  it('dice lo que tiene a favor, lo que debe y lo que se le devuelve', async () => {
    api.liquidacion.mockResolvedValue(TERMINADO);
    await montar();
    expect(api.liquidacion).toHaveBeenCalledWith('ct-1');
    const seccion = porTestId('saldo-a-favor-al-terminar')?.textContent ?? '';
    expect(seccion).toContain('900.000');
    expect(seccion).toContain('100.000');
    expect(seccion).toContain('600.000');
    expect(porTestId('saldo-a-devolver')?.textContent).toMatch(/400\.000/);
    expect(porTestId('registrar-devolucion')).not.toBeNull();
  });

  it('registra la devolución con la cuenta del inquilino y vuelve a leer', async () => {
    api.liquidacion.mockResolvedValueOnce(TERMINADO).mockResolvedValueOnce({
      ...TERMINADO,
      sePuedeDevolver: false,
      devolucion: {
        egresoId: 'e-1',
        numero: null,
        estado: 'PENDIENTE',
        valorCop: 400_000,
        registradaEl: '2026-10-03',
        pagadaEl: null,
      },
    });
    api.devolver.mockResolvedValue({
      aplicadoCop: 600_000,
      recibos: 1,
      aDevolverCop: 400_000,
      egreso: { id: 'e-1', estado: 'PENDIENTE', valorCop: 400_000 },
    });
    await montar();
    await clic(porTestId('registrar-devolucion'));
    expect(porTestId('formulario-de-la-devolucion')).not.toBeNull();
    await escribir('devolucion-banco', ' Bancolombia ');
    await escribir('devolucion-numero', '12345678');
    await clic(porTestId('confirmar-devolucion'));

    expect(api.devolver).toHaveBeenCalledWith('ct-1', { banco: 'Bancolombia', numeroDeCuenta: '12345678' });
    const registrada = porTestId('devolucion-registrada')?.textContent ?? '';
    expect(registrada).toContain('400.000');
    expect(registrada).toContain('600.000');
    expect(api.liquidacion).toHaveBeenCalledTimes(2);
    // Ya registrada: dice en qué va y no ofrece registrarla otra vez.
    expect(porTestId('estado-de-la-devolucion')?.textContent).toContain('falta girarla');
    expect(porTestId('registrar-devolucion')).toBeNull();
  });

  it('un número de cuenta con letras no se manda', async () => {
    api.liquidacion.mockResolvedValue(TERMINADO);
    await montar();
    await clic(porTestId('registrar-devolucion'));
    await escribir('devolucion-numero', '12-AB');
    expect(host.textContent).toContain('sólo con dígitos');
    const boton = porTestId('confirmar-devolucion') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(api.devolver).not.toHaveBeenCalled();
  });

  it('si el back la rechaza, lo dice en el formulario (sin cerrarlo)', async () => {
    api.liquidacion.mockResolvedValue(TERMINADO);
    api.devolver.mockRejectedValue(
      Object.assign(new Error('El inquilino tiene otro contrato vigente con esta inmobiliaria.'), {
        status: 409,
        code: 'EL_INQUILINO_TIENE_OTRO_CONTRATO_VIGENTE',
      }),
    );
    await montar();
    await clic(porTestId('registrar-devolucion'));
    await clic(porTestId('confirmar-devolucion'));
    expect(porTestId('devolucion-error')).not.toBeNull();
    expect(porTestId('formulario-de-la-devolucion')).not.toBeNull();
  });

  it('sin el permiso de crear cobros no ofrece registrar', async () => {
    permisos.puede = false;
    api.liquidacion.mockResolvedValue(TERMINADO);
    await montar();
    expect(porTestId('saldo-a-favor-al-terminar')).not.toBeNull();
    expect(porTestId('registrar-devolucion')).toBeNull();
  });

  it('cuando no se puede devolver, dice por qué', async () => {
    api.liquidacion.mockResolvedValue({
      ...TERMINADO,
      sePuedeDevolver: false,
      porQueNo: 'El inquilino tiene otro contrato vigente: el saldo suelto se queda para ése.',
    });
    await montar();
    expect(porTestId('saldo-a-favor-por-que-no')?.textContent).toContain('otro contrato vigente');
    expect(porTestId('registrar-devolucion')).toBeNull();
  });

  it('sin saldo ni devolución, o con el contrato vigente, no dice nada', async () => {
    api.liquidacion.mockResolvedValue({
      ...TERMINADO,
      aFavor: { ...TERMINADO.aFavor, anticipoDelContratoCop: 0, saldoSueltoCop: 0, totalCop: 0 },
    });
    await montar();
    expect(host.textContent).toBe('');
    expect(haySaldoAFavorQueMostrar({ ...TERMINADO, contrato: { ...TERMINADO.contrato, terminado: false } })).toBe(
      false,
    );
  });

  it('si no se pudo leer, lo dice', async () => {
    api.liquidacion.mockRejectedValue(new Error('red'));
    await montar();
    expect(porTestId('saldo-a-favor-error')?.textContent).toContain('No pudimos leer el saldo a favor');
  });

  it('el estado de la devolución pagada sin número no promete un comprobante', () => {
    expect(claveDelEstadoDeLaDevolucion('PAGADO', 7)).toBe('estadoPagado');
    expect(claveDelEstadoDeLaDevolucion('PAGADO', null)).toBe('estadoPagadoSinNumero');
    expect(claveDelEstadoDeLaDevolucion('EN_LOTE', null)).toBe('estadoEnLote');
    expect(claveDelEstadoDeLaDevolucion('ANULADO', null)).toBe('estadoAnulado');
    expect(claveDelEstadoDeLaDevolucion('PENDIENTE', null)).toBe('estadoPendiente');
  });
});

/**
 * 🔴 ARREGLOS-3 (03-10-2026, Nico, la recomendada «a» de PRUEBAS-PAGOS): la deuda
 * que llega DESPUÉS de registrar la devolución (la cuota de cierre del acta)
 * dejaba el egreso por el valor viejo. Ahora se avisa, no se gira, y «Revisado»
 * la recalcula.
 */
describe('<SaldoAFavorAlTerminarSeccion> — la devolución EN REVISIÓN', () => {
  const REGISTRADA = {
    egresoId: 'e-1',
    numero: null,
    estado: 'PENDIENTE',
    valorCop: 500_000,
    registradaEl: '2026-10-03',
    pagadaEl: null,
  };
  const EN_REVISION: LiquidacionDelSaldoAFavor = {
    ...TERMINADO,
    sePuedeDevolver: false,
    devolucion: REGISTRADA,
    revision: {
      egresoId: 'e-1',
      contractId: 'ct-1',
      debeCop: 500_000,
      valorDelEgresoCop: 500_000,
      motivo:
        'Después de registrar la devolución llegó deuda nueva: el inquilino debe $500.000. El egreso sigue por $500.000, así que no se gira hasta que alguien lo revise.',
    },
  };

  it('🔴 avisa que está en revisión, con el porqué y las cifras, y ofrece «Revisado»', async () => {
    api.liquidacion.mockResolvedValue(EN_REVISION);
    await montar();
    const aviso = porTestId('devolucion-en-revision')?.textContent ?? '';
    expect(aviso).toContain('En revisión: esta devolución no se gira');
    expect(aviso).toContain('llegó deuda nueva');
    expect(aviso).toContain('500.000');
    expect(porTestId('marcar-revisada')).not.toBeNull();
  });

  it('🔴 «Revisado» recalcula, vuelve a leer y dice cómo quedó', async () => {
    api.liquidacion.mockResolvedValueOnce(EN_REVISION).mockResolvedValueOnce({
      ...TERMINADO,
      sePuedeDevolver: false,
      devolucion: null,
      revision: null,
      aFavor: { ...TERMINADO.aFavor, totalCop: 0 },
    });
    api.revisado.mockResolvedValue({
      anterior: { egresoId: 'e-1', valorCop: 500_000 },
      aplicadoCop: 500_000,
      recibos: 1,
      aDevolverCop: 0,
      egreso: null,
    });
    await montar();
    await clic(porTestId('marcar-revisada'));
    expect(api.revisado).toHaveBeenCalledWith('ct-1');
    expect(api.liquidacion).toHaveBeenCalledTimes(2);
    // Aunque ya no quede nada a favor, dice lo que pasó (antes la sección desaparecía con su aviso).
    expect(porTestId('devolucion-revisada')?.textContent).toContain('no quedó nada que devolver');
    expect(porTestId('devolucion-en-revision')).toBeNull();
  });

  it('si el back no deja (está en un lote), dice SU frase y el botón vuelve', async () => {
    api.liquidacion.mockResolvedValue(EN_REVISION);
    const { ApiError } = await import('@/lib/api/client');
    api.revisado.mockRejectedValue(
      new ApiError(
        409,
        'La devolución está dentro de un lote de egresos: anula ese lote (vuelve a quedar pendiente) y después márcala como revisada.',
        'DEVOLUCION_EN_UN_LOTE',
        {
          statusCode: 409,
          code: 'DEVOLUCION_EN_UN_LOTE',
          message:
            'La devolución está dentro de un lote de egresos: anula ese lote (vuelve a quedar pendiente) y después márcala como revisada.',
        },
      ),
    );
    await montar();
    await clic(porTestId('marcar-revisada'));
    expect(porTestId('revision-error')?.textContent).toContain('anula ese lote');
    expect((porTestId('marcar-revisada') as HTMLButtonElement).disabled).toBe(false);
  });

  it('sin permiso de cobros no ofrece «Revisado»: dice a quién pedírselo', async () => {
    permisos.puede = false;
    api.liquidacion.mockResolvedValue(EN_REVISION);
    await montar();
    expect(porTestId('marcar-revisada')).toBeNull();
    expect(porTestId('devolucion-en-revision')?.textContent).toContain('permiso de cobros');
  });

  it('un back anterior (sin `revision`) se ve como antes', async () => {
    const { revision: _sin, ...viejo } = EN_REVISION;
    api.liquidacion.mockResolvedValue(viejo);
    await montar();
    expect(porTestId('devolucion-en-revision')).toBeNull();
    expect(porTestId('estado-de-la-devolucion')).not.toBeNull();
  });
});

