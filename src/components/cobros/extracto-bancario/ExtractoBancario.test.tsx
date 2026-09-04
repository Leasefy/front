/**
 * ExtractoBancario — la pantalla con el API mockeado.
 *
 * No se prueba la lectura del archivo (eso vive en `lib/cobros/extracto-bancario`):
 * acá se prueba lo que la persona ve y toca — candidatos con el seguro
 * resaltado, conciliar, ignorar con motivo, reabrir, el lote de seguros y el
 * error del back en palabras.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { MovimientoBancario, ResumenDeConciliacion } from '@/lib/api/conciliacion-bancaria.types';

const { api, toastMock, permisos } = vi.hoisted(() => ({
  api: {
    listar: vi.fn(),
    resumen: vi.fn(),
    conciliar: vi.fn(),
    ignorar: vi.fn(),
    reabrir: vi.fn(),
    conciliarSeguros: vi.fn(),
    cargarExtracto: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
  permisos: { canAccess: vi.fn((_modulo: string, _accion: string) => true), isLoading: false },
}));

vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo-de-carga">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));
vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({ parseSpreadsheetFile: vi.fn() }));

import { ExtractoBancario } from './ExtractoBancario';

function movimiento(sobre: Partial<MovimientoBancario> = {}): MovimientoBancario {
  return {
    id: 'm-1',
    agencyId: 'a-1',
    fecha: '2026-09-06T00:00:00.000Z',
    valorCop: 1800000,
    descripcion: 'TRANSFERENCIA PEREZ GOMEZ',
    referencia: '0009812',
    extractoNombre: 'sep.csv',
    estado: 'PENDIENTE',
    cobroId: null,
    reciboId: null,
    motivoIgnorado: null,
    conciliadoPorUserId: null,
    conciliadoAt: null,
    cargadoPorUserId: 'u-1',
    createdAt: '2026-09-07T00:00:00.000Z',
    candidatos: [
      {
        cobroId: 'c-1',
        tenantName: 'Laura Pérez Gómez',
        propertyTitle: 'Apto 301',
        month: '2026-09',
        saldoCop: 1800000,
        puntaje: 100,
        porQue: ['El valor es igual al saldo del cobro.', '«perez» aparece en la descripción.'],
        seguro: true,
      },
      {
        cobroId: 'c-2',
        tenantName: 'Carlos Ramírez',
        propertyTitle: 'Casa 12',
        month: '2026-09',
        saldoCop: 1800000,
        puntaje: 70,
        porQue: ['El valor es igual al saldo del cobro.'],
        seguro: false,
      },
    ],
    recibo: null,
    ...sobre,
  };
}

const RESUMEN: ResumenDeConciliacion = {
  pendientes: 2,
  ignorados: 1,
  conciliadosEsteMes: 3,
  ultimoExtracto: { nombre: 'sep.csv', cargadoAt: '2026-09-07T10:00:00.000Z' },
};

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<ExtractoBancario />);
  });
  await esperar();
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

function botonConTexto(texto: string, dentro: ParentNode = document): HTMLButtonElement {
  const boton = Array.from(dentro.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes(texto));
  if (!boton) throw new Error(`No hay botón con «${texto}»`);
  return boton;
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
  await esperar();
}

/** Radix Tabs cambia de pestaña en `mousedown`, no en `click`. */
async function activarPestana(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    el.click();
  });
  await esperar();
  await esperar();
}

function escribir(el: HTMLTextAreaElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  setter.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  permisos.canAccess.mockReset();
  permisos.canAccess.mockReturnValue(true);
  permisos.isLoading = false;
  api.resumen.mockResolvedValue(RESUMEN);
  api.listar.mockResolvedValue({ data: [movimiento()], total: 1, limite: 50, desplazamiento: 0 });
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('ExtractoBancario — pendientes', () => {
  it('pinta el resumen, el movimiento y sus candidatos con el seguro resaltado', async () => {
    await montar();
    expect($('[data-testid="resumen"]').textContent).toContain('2');
    expect($('[data-testid="resumen"]').textContent).toContain('sep.csv');
    expect(api.listar).toHaveBeenCalledWith({ estado: 'PENDIENTE', limite: 50, desplazamiento: 0 });

    const fila = $('[data-testid="movimiento-m-1"]');
    expect(fila.textContent).toContain('TRANSFERENCIA PEREZ GOMEZ');
    expect(fila.textContent).toContain('$ 1.800.000');
    const seguro = $('[data-testid="candidato-m-1-c-1"]');
    expect(seguro.getAttribute('data-seguro')).toBe('true');
    expect(seguro.textContent).toContain('Seguro');
    expect(seguro.textContent).toContain('«perez» aparece en la descripción.');
    expect($('[data-testid="candidato-m-1-c-2"]').getAttribute('data-seguro')).toBe('false');
    expect($('[data-testid="conciliar-seguros"]').textContent).toContain('(1)');
  });

  it('«Conciliar» manda el movimiento y el cobro, avisa con el número del recibo y recarga', async () => {
    api.conciliar.mockResolvedValue({ recibo: { id: 'r-1', numero: 41 }, movimiento: {}, cobro: {} });
    await montar();
    await clic(botonConTexto('Conciliar', $('[data-testid="candidato-m-1-c-1"]')));
    expect(api.conciliar).toHaveBeenCalledWith('m-1', 'c-1');
    expect(toastMock.success).toHaveBeenCalledWith('Recibo N.º 41 emitido a Laura Pérez Gómez.');
    expect(api.listar).toHaveBeenCalledTimes(2);
  });

  it('el error del back sale en palabras por toast y la fila sigue', async () => {
    api.conciliar.mockRejectedValue(new Error('El movimiento ($ 1.800.000) supera lo que falta por pagar.'));
    await montar();
    await clic(botonConTexto('Conciliar', $('[data-testid="candidato-m-1-c-1"]')));
    expect(toastMock.error).toHaveBeenCalledWith('El movimiento ($ 1.800.000) supera lo que falta por pagar.');
    expect(document.querySelector('[data-testid="movimiento-m-1"]')).not.toBeNull();
  });

  it('ignorar pide un motivo de 5+ caracteres y lo manda', async () => {
    api.ignorar.mockResolvedValue({});
    await montar();
    await clic(botonConTexto('Ignorar', $('[data-testid="movimiento-m-1"]')));
    const confirmar = $('[data-testid="confirmar-ignorar"]') as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    await act(async () => {
      escribir($('#motivo-ignorar') as HTMLTextAreaElement, 'Es la nómina de la oficina.');
    });
    await esperar();
    expect(($('[data-testid="confirmar-ignorar"]') as HTMLButtonElement).disabled).toBe(false);
    await clic($('[data-testid="confirmar-ignorar"]'));
    expect(api.ignorar).toHaveBeenCalledWith('m-1', 'Es la nómina de la oficina.');
    expect(toastMock.success).toHaveBeenCalledWith('Movimiento ignorado.');
  });

  it('«Conciliar los seguros» confirma con la cantidad y llama al lote', async () => {
    api.conciliarSeguros.mockResolvedValue({ conciliados: 1, sinCandidatoSeguro: 0, errores: [] });
    await montar();
    await clic($('[data-testid="conciliar-seguros"]'));
    expect(document.body.textContent).toContain('Conciliar 1 movimiento seguro');
    await clic($('[data-testid="confirmar-seguros"]'));
    expect(api.conciliarSeguros).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith('1 conciliado · 0 sin candidato seguro', { description: undefined });
  });

  it('una salida no ofrece candidatos ni conciliar, sólo ignorar', async () => {
    api.listar.mockResolvedValue({
      data: [movimiento({ id: 'm-s', valorCop: -45000, descripcion: 'CUOTA DE MANEJO', candidatos: [] })],
      total: 1,
      limite: 50,
      desplazamiento: 0,
    });
    await montar();
    const fila = $('[data-testid="movimiento-m-s"]');
    expect(fila.textContent).toContain('Salida');
    expect(fila.textContent).toContain('−$ 45.000');
    expect(Array.from(fila.querySelectorAll('button')).map((b) => b.textContent?.trim())).toEqual(['Ignorar']);
    expect(($('[data-testid="conciliar-seguros"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sin permiso de crear no se puede conciliar ni cargar; sin editar no se ignora', async () => {
    permisos.canAccess.mockImplementation((_m: string, a: string) => a === 'view');
    await montar();
    expect(document.querySelector('[data-testid="cargar-extracto"]')).toBeNull();
    expect(botonConTexto('Conciliar', $('[data-testid="candidato-m-1-c-1"]')).disabled).toBe(true);
    expect(botonConTexto('Ignorar', $('[data-testid="movimiento-m-1"]')).disabled).toBe(true);
  });
});

describe('ExtractoBancario — las otras pestañas', () => {
  it('conciliados muestran el número de recibo; ignorados el motivo y «Volver a pendiente»', async () => {
    api.listar.mockImplementation(async ({ estado }: { estado: string }) => ({
      data:
        estado === 'PENDIENTE'
          ? [movimiento()]
          : estado === 'CONCILIADO'
            ? [movimiento({ id: 'm-c', estado: 'CONCILIADO', candidatos: [], recibo: { id: 'r', numero: 12, anuladoAt: null } })]
            : [movimiento({ id: 'm-i', estado: 'IGNORADO', candidatos: [], motivoIgnorado: 'Nómina' })],
      total: 1,
      limite: 50,
      desplazamiento: 0,
    }));
    api.reabrir.mockResolvedValue({});
    await montar();

    await activarPestana($('[data-testid="pestana-CONCILIADO"]'));
    expect(api.listar).toHaveBeenLastCalledWith({ estado: 'CONCILIADO', limite: 50, desplazamiento: 0 });
    expect($('[data-testid="movimiento-m-c"]').textContent).toContain('Recibo N.º 12');

    await activarPestana($('[data-testid="pestana-IGNORADO"]'));
    const fila = $('[data-testid="movimiento-m-i"]');
    expect(fila.textContent).toContain('Motivo: Nómina');
    await clic(botonConTexto('Volver a pendiente', fila));
    expect(api.reabrir).toHaveBeenCalledWith('m-i');
  });

  it('un fallo al cargar se muestra, no se traga', async () => {
    api.listar.mockRejectedValue(new Error('Se cayó la red.'));
    await montar();
    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('Se cayó la red.');
  });
});
