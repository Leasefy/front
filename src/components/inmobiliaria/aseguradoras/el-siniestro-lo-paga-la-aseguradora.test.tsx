/**
 * 🔴 D11 en pantalla (17-09-2026): «¿Quién paga?» en el recibo y la deuda
 * subrogada en el estado de cuenta.
 *
 * «El recibo lleva como pagador a la aseguradora y se aplica a las cuotas del
 * inquilino; esas cuotas quedan pagadas para la inmobiliaria y el propietario,
 * pero la deuda aparece como "subrogada a la aseguradora", visible y separada.»
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ContratoDelEstadoDeCuenta, FilaDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

const { api } = vi.hoisted(() => ({
  api: { listar: vi.fn(), crear: vi.fn(), actualizar: vi.fn() },
}));

vi.mock('@/lib/api/aseguradoras.service', () => ({ aseguradorasApi: api }));

import {
  faltaElPagador,
  PAGA_EL_CLIENTE,
  pagadorParaElBack,
  QuienPaga,
  type QuienPagaValor,
} from './QuienPaga';
import { ContratoDelEstado } from '@/components/estado-de-cuenta/ContratoDelEstado';

let root: Root | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar(nodo: React.ReactElement) {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(nodo);
  });
  await esperar();
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.listar.mockResolvedValue([
    { id: 'as-1', nombre: 'Seguros Bolívar S.A.', nit: '860002503', activa: true },
    { id: 'as-2', nombre: 'Aseguradora vieja', nit: '900111222', activa: false },
  ]);
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

describe('¿quién paga? — el cliente o una aseguradora', () => {
  it('por defecto paga el cliente: el recibo no lleva pagador', () => {
    expect(pagadorParaElBack(PAGA_EL_CLIENTE)).toBeUndefined();
    expect(faltaElPagador(PAGA_EL_CLIENTE)).toBe(false);
  });

  it('con aseguradora hay que elegir cuál; el siniestro es opcional y va sin espacios', () => {
    const sinElegir: QuienPagaValor = {
      tipo: 'ASEGURADORA',
      aseguradoraId: null,
      siniestroReferencia: '',
    };
    expect(faltaElPagador(sinElegir)).toBe(true);
    expect(pagadorParaElBack(sinElegir)).toBeUndefined();

    expect(
      pagadorParaElBack({
        tipo: 'ASEGURADORA',
        aseguradoraId: 'as-1',
        siniestroReferencia: '  SIN-2026-0042 ',
      }),
    ).toEqual({ tipo: 'ASEGURADORA', aseguradoraId: 'as-1', siniestroReferencia: 'SIN-2026-0042' });

    expect(
      pagadorParaElBack({ tipo: 'ASEGURADORA', aseguradoraId: 'as-1', siniestroReferencia: '  ' }),
    ).toEqual({ tipo: 'ASEGURADORA', aseguradoraId: 'as-1' });
  });

  it('al elegir «una aseguradora» se listan sólo las ACTIVAS y se dice qué pasa con la deuda', async () => {
    let valor: QuienPagaValor = PAGA_EL_CLIENTE;
    const onChange = vi.fn((v: QuienPagaValor) => {
      valor = v;
    });
    await montar(<QuienPaga valor={valor} onChange={onChange} />);
    await act(async () => {
      $('[data-testid="paga-aseguradora"]').click();
    });
    expect(onChange).toHaveBeenCalledWith({
      tipo: 'ASEGURADORA',
      aseguradoraId: null,
      siniestroReferencia: '',
    });

    // Se vuelve a montar con el valor nuevo (el modal es quien lo guarda).
    await act(async () => {
      root!.render(<QuienPaga valor={valor} onChange={onChange} />);
    });
    await esperar();
    const opciones = Array.from(
      ($('[data-testid="elegir-aseguradora"]') as HTMLSelectElement).options,
    ).map((o) => o.textContent);
    expect(opciones).toEqual(['Elige la aseguradora', 'Seguros Bolívar S.A. · NIT 860002503']);
    expect(document.body.textContent).toContain('subrogada a la aseguradora');
  });

  it('sin la migración el back responde 503 y la pantalla lo dice en palabras', async () => {
    api.listar.mockRejectedValue(
      new Error('Las aseguradoras todavía no están disponibles: falta la migración 20260917160000.'),
    );
    await montar(
      <QuienPaga
        valor={{ tipo: 'ASEGURADORA', aseguradoraId: null, siniestroReferencia: '' }}
        onChange={vi.fn()}
      />,
    );
    expect($('[data-testid="aseguradoras-error"]').textContent).toContain('20260917160000');
  });
});

describe('el estado de cuenta del inquilino: pagada, pero subrogada', () => {
  function fila(sobre: Partial<FilaDelEstadoDeCuenta> = {}): FilaDelEstadoDeCuenta {
    return {
      concepto: 'Canon de agosto',
      estado: 'CANCELADA',
      fechaDePago: '2026-09-16',
      valorBruto: 1_000_000,
      iva: 0,
      retencion: 0,
      reteIva: 0,
      reteIca: 0,
      valorNeto: 1_000_000,
      fechaVencimiento: '2026-08-05',
      documentoDePago: {
        numero: '101',
        tipo: 'INGRESO',
        descripcion: 'transferencia',
        pagador: {
          tipo: 'ASEGURADORA',
          nombre: 'Seguros Bolívar S.A.',
          nit: '860002503',
          siniestroReferencia: 'SIN-2026-0042',
        },
      },
      parcial: false,
      cuotaId: 'q-1',
      cajon: 'SIN_DEUDA',
      diasDeMora: 0,
      subrogadaA: { nombre: 'Seguros Bolívar S.A.', nit: '860002503' },
      ...sobre,
    } as FilaDelEstadoDeCuenta;
  }

  const contrato: ContratoDelEstadoDeCuenta = {
    id: 'ct-1',
    numero: '1686',
    rol: 'INQUILINO',
    inmueble: { direccion: 'Cra 76 #45-12' },
    vigente: true,
    secciones: { arriendos: [fila()], otrosConceptos: [] },
    totales: { cancelado: 1_000_000, pendiente: 0, restaPorPagar: 0 },
    subrogacion: {
      aseguradoras: [
        {
          nombre: 'Seguros Bolívar S.A.',
          nit: '860002503',
          valorCop: 1_000_000,
          siniestros: ['SIN-2026-0042'],
        },
      ],
      totalCop: 1_000_000,
    },
    cortes: [],
  } as unknown as ContratoDelEstadoDeCuenta;

  it('🔴 la fila dice a quién se le debe y el bloque va APARTE de lo que se le debe a la inmobiliaria', async () => {
    await montar(<ContratoDelEstado contrato={contrato} hoy="2026-09-17" sinPaginar />);
    expect($('[data-testid="fila-subrogada"]').textContent).toContain('Seguros Bolívar');
    const bloque = $('[data-testid="subrogacion-contrato-1686"]');
    expect(bloque.textContent).toContain('NIT 860002503');
    expect(bloque.textContent).toContain('SIN-2026-0042');
    // El total del contrato sigue en cero: para la inmobiliaria está pagado.
    expect($('[data-testid="total-contrato-1686"]').textContent).toContain('0');
  });

  it('sin subrogación no aparece ningún bloque', async () => {
    const normal = {
      ...contrato,
      subrogacion: null,
      secciones: {
        arriendos: [fila({ subrogadaA: undefined, documentoDePago: { numero: '9', tipo: 'INGRESO', descripcion: 'efectivo' } })],
        otrosConceptos: [],
      },
    } as unknown as ContratoDelEstadoDeCuenta;
    await montar(<ContratoDelEstado contrato={normal} hoy="2026-09-17" sinPaginar />);
    expect(document.querySelector('[data-testid="subrogacion-contrato-1686"]')).toBeNull();
    expect(document.querySelector('[data-testid="fila-subrogada"]')).toBeNull();
  });
});
