/**
 * 🔴 GUARDIÁN: lo que las pantallas de tesorería NO pueden afirmar.
 *
 * Tres cosas, y las tres ya se pagaron caro en este producto:
 *
 *   1. **«Importado» cuando no importó.** El mismo archivo dos veces no aplica
 *      nada (`yaImportado: true`), y decirle «listo» a quien lo subió por segunda
 *      vez es cómo alguien termina aprobando dos veces la misma plata.
 *   2. **Ofrecer «aplicar» cuando no hay contra qué.** Un pendiente sin deuda
 *      vencida no se puede aplicar: el botón no existe y el texto dice por qué.
 *   3. **Esconder el desglose del traslado detrás del botón.** Aprobar mueve
 *      plata de una cuenta a otra: quien aprueba tiene que ver de dónde sale cada
 *      peso ANTES.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type {
  ListaDeAplicables,
  ListaDeConvenios,
  ListaDeTraslados,
  PropuestaDeTraslado,
} from '@/lib/api/tesoreria.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  listarConvenios: vi.fn(),
  previa: vi.fn(),
  importar: vi.fn(),
  pendientes: vi.fn(),
  listarTraslados: vi.fn(),
  propuestaDeTraslado: vi.fn(),
}));

vi.mock('@/lib/api/tesoreria.service', () => ({
  tesoreriaApi: {
    listarConvenios: h.listarConvenios,
    previa: h.previa,
    importar: h.importar,
    pendientes: h.pendientes,
    listarTraslados: h.listarTraslados,
    propuestaDeTraslado: h.propuestaDeTraslado,
  },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { RecaudoBancarioPanel } from './RecaudoBancario';
import { PendientesDeAplicarPanel } from './PendientesDeAplicar';
import { TrasladoDeComisionPanel } from './TrasladoDeComision';

let contenedor: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

async function pintar(nodo: React.ReactElement) {
  await act(async () => {
    root.render(nodo);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const CONVENIOS: ListaDeConvenios = {
  disponible: true,
  motivo: null,
  convenios: [
    {
      id: 'c-1',
      banco: 'Bancolombia',
      codigo: '90210',
      nombre: 'Recaudo de arriendos',
      activo: true,
      tipo: 'DELIMITADO',
      separador: ';',
      columnas: { referencia: { indice: 0 }, valor: { indice: 2 } },
      formatoDeFecha: 'DD/MM/YYYY',
      decimales: 0,
      lineasDeEncabezado: 0,
      lineasDePie: 0,
      marcaDeDetalle: null,
      marcaEn: null,
      referenciaLargo: 10,
      referenciaPrefijo: null,
      referenciaDv: 'MODULO_10',
      ejemploDeReferencia: '00000018507',
      avisos: [],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  tipos: [],
  formatosDeFecha: [],
  presets: [],
};

describe('🔴 el recaudo bancario no dice «importado» cuando no importó', () => {
  it('la previa avisa que este archivo YA se importó, antes de apretar nada', async () => {
    h.listarConvenios.mockResolvedValue(CONVENIOS);
    h.previa.mockResolvedValue({
      convenio: { id: 'c-1', nombre: 'Recaudo', banco: 'Bancolombia' },
      huella: 'abc',
      yaImportado: {
        id: 'a-1',
        nombre: 'recaudo-15.txt',
        createdAt: '2026-09-15T00:00:00.000Z',
        nuevas: 42,
      },
      lineas: 3,
      omitidas: 0,
      totalCop: 3_000_000,
      validas: 3,
      rechazadas: [],
      avisos: [],
      muestra: [],
    });

    await pintar(<RecaudoBancarioPanel />);
    const input = contenedor.querySelector<HTMLInputElement>(
      '[data-testid="archivo-de-recaudo"]',
    );
    expect(input).not.toBeNull();

    const archivo = new File(['1850;05/09/2026;1000000'], 'recaudo-15.txt', {
      type: 'text/plain',
    });
    // `File.text()` no está en happy-dom con todas las versiones: se fija acá.
    Object.defineProperty(archivo, 'text', {
      value: () => Promise.resolve('1850;05/09/2026;1000000'),
    });
    Object.defineProperty(input!, 'files', { value: [archivo] });
    await act(async () => {
      input!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    const aviso = contenedor.querySelector('[data-testid="ya-importado"]');
    expect(aviso?.textContent).toContain('ya se importó');
    expect(aviso?.textContent).toContain('no va a aplicar nada');
    // Y NO se importó nada: la previa no escribe.
    expect(h.importar).not.toHaveBeenCalled();
  });

  it('el ejemplo de la referencia se muestra para compararlo contra el volante del banco', async () => {
    h.listarConvenios.mockResolvedValue(CONVENIOS);
    await pintar(<RecaudoBancarioPanel />);
    expect(contenedor.textContent).toContain('00000018507');
    expect(contenedor.textContent).toContain('volante');
  });

  it('sin la migración lo dice y no ofrece importar', async () => {
    h.listarConvenios.mockResolvedValue({
      ...CONVENIOS,
      disponible: false,
      motivo: 'Falta la migración 20260918120000_convenio_de_recaudo.',
      convenios: [],
    });
    await pintar(<RecaudoBancarioPanel />);
    expect(contenedor.querySelector('[data-testid="recaudo-sin-migracion"]')).not.toBeNull();
    expect(contenedor.querySelector('[data-testid="archivo-de-recaudo"]')).toBeNull();
  });
});

describe('🔴 el pendiente de aplicar no ofrece aplicar cuando no hay contra qué', () => {
  const base: ListaDeAplicables = {
    disponible: true,
    motivo: null,
    totalAplicableCop: 0,
    aplicables: [
      {
        pendiente: {
          id: 'p-1',
          contractId: 'k-1',
          tenantId: 't-1',
          nombre: 'Ana Pérez',
          origen: 'SINIESTRO',
          pagadorTipo: 'ASEGURADORA',
          aseguradoraId: 'a-1',
          pagadorNombre: 'Seguros Bolívar',
          siniestroReferencia: 'SIN-42',
          valorCop: 400_000,
          aplicadoCop: 0,
          devueltoCop: 0,
          saldoCop: 400_000,
          estado: 'PENDIENTE',
          fecha: '2026-09-16',
          medio: 'transferencia',
          referencia: null,
          notas: null,
          motivo: null,
          createdAt: '2026-09-16T00:00:00.000Z',
          movimientos: [],
        },
        vencidoCop: 0,
        aplicableCop: 0,
        porQue:
          'Ana Pérez no tiene deuda vencida en este momento: esta plata sigue en el pasivo hasta que venza otra cuota, o se le devuelve a Seguros Bolívar.',
      },
    ],
  };

  it('sin deuda vencida: no hay botón de aplicar, y el texto explica por qué', async () => {
    h.pendientes.mockResolvedValue(base);
    await pintar(<PendientesDeAplicarPanel />);
    expect(contenedor.querySelector('[data-testid="aplicar-p-1"]')).toBeNull();
    // Devolver SÍ se puede: es plata de un tercero que puede reclamarla.
    expect(contenedor.querySelector('[data-testid="devolver-p-1"]')).not.toBeNull();
    expect(contenedor.textContent).toContain('no tiene deuda vencida');
    expect(contenedor.textContent).toContain('Seguros Bolívar');
  });

  it('con deuda vencida sí ofrece aplicar, por el monto exacto', async () => {
    h.pendientes.mockResolvedValue({
      ...base,
      totalAplicableCop: 400_000,
      aplicables: [
        { ...base.aplicables[0], vencidoCop: 1_000_000, aplicableCop: 400_000, porQue: 'Hay deuda.' },
      ],
    });
    await pintar(<PendientesDeAplicarPanel />);
    const boton = contenedor.querySelector('[data-testid="aplicar-p-1"]');
    expect(boton).not.toBeNull();
    expect(boton?.textContent).toContain('400');
  });

  it('🔴 nunca lo llama «saldo a favor»: es un pasivo de quien puso la plata', async () => {
    h.pendientes.mockResolvedValue(base);
    await pintar(<PendientesDeAplicarPanel />);
    expect(contenedor.textContent?.toLowerCase()).not.toContain('saldo a favor');
  });
});

describe('🔴 el traslado muestra su desglose ANTES del botón', () => {
  const propuesta: PropuestaDeTraslado = {
    disponible: true,
    periodo: '2026-08',
    comisionCop: 4_000_000,
    ivaComisionCop: 760_000,
    retencionesComisionCop: 140_000,
    interesesCop: 300_000,
    gastosDeCobranzaCop: 0,
    yaTrasladadoCop: 0,
    totalCop: 4_920_000,
    hayQueTrasladar: true,
    renglones: [
      {
        concepto: 'Comisión de administración',
        valorCop: 4_000_000,
        porQue: 'Es el ingreso de la inmobiliaria por el mandato.',
      },
      {
        concepto: 'Retenciones que le practicaron sobre la comisión',
        valorCop: -140_000,
        porQue: 'Esa plata la inmobiliaria NO la recibió.',
      },
    ],
    avisos: [],
  };

  const traslados: ListaDeTraslados = { disponible: true, propuestos: [], recientes: [] };

  it('cada renglón viaja con su porqué, y los negativos se ven', async () => {
    h.propuestaDeTraslado.mockResolvedValue(propuesta);
    h.listarTraslados.mockResolvedValue(traslados);
    await pintar(<TrasladoDeComisionPanel />);
    const tabla = contenedor.querySelector('[data-testid="renglones-del-traslado"]');
    expect(tabla).not.toBeNull();
    expect(tabla?.textContent).toContain('Comisión de administración');
    expect(tabla?.textContent).toContain('NO la recibió');
    expect(contenedor.querySelector('[data-testid="proponer-traslado"]')).not.toBeNull();
  });

  it('cuando no hay nada que trasladar, no ofrece proponerlo', async () => {
    h.propuestaDeTraslado.mockResolvedValue({
      ...propuesta,
      totalCop: 0,
      hayQueTrasladar: false,
      avisos: ['La comisión de 2026-08 ya está trasladada ($4.920.000).'],
    });
    h.listarTraslados.mockResolvedValue(traslados);
    await pintar(<TrasladoDeComisionPanel />);
    expect(contenedor.querySelector('[data-testid="proponer-traslado"]')).toBeNull();
    expect(contenedor.textContent).toContain('ya está trasladada');
  });
});
