/**
 * @vitest-environment happy-dom
 *
 * El cajón del contrato en Servicios públicos: las facturas (con la liquidación de entrada de la que cruza el inicio)
 * y la entrega del inmueble (la liquidación de salida), en dos pestañas, sin perder la lista (Portofino, 29-10-2026).
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/agentes/OrbeDeAgente', () => ({ OrbeDeAgente: () => <span /> }));
vi.mock('@/lib/api/servicios-publicos.service', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/servicios-publicos.service')>()),
  serviciosPublicosApi: {
    delContrato: vi.fn(),
    aprobar: vi.fn(),
    rechazar: vi.fn(),
    soporte: vi.fn(),
    revisarEntrada: vi.fn(),
    registrar: vi.fn(),
    pagarConLaGarantia: vi.fn(),
    entradaDeLaFactura: vi.fn(),
    simularEntrada: vi.fn(),
    liquidacionDeSalida: vi.fn(),
    cargarLiquidacionDeSalida: vi.fn(),
  },
}));

import { serviciosPublicosApi, type FacturaDeServicio, type FilaDelTablero } from '@/lib/api/servicios-publicos.service';
import { CajonDelContrato } from './CajonDelContrato';

const api = serviciosPublicosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const factura = (over: Partial<FacturaDeServicio> = {}): FacturaDeServicio => ({
  id: 'f1',
  contractId: 'c1',
  servicio: 'ENERGIA',
  nombreDelServicio: 'Energía',
  empresa: 'EPM',
  periodoDesde: '2026-08-15',
  periodoHasta: '2026-09-15',
  valorCop: 115_260,
  tipo: 'MENSUAL',
  pagadaPor: 'INQUILINO',
  estado: 'POR_REVISAR',
  tieneSoporte: false,
  soporteNombre: null,
  subidaPor: 'INQUILINO',
  liquidacion: null,
  nota: null,
  motivoDeLaRevision: null,
  creadaAt: '2026-10-05T10:00:00.000Z',
  comoCaeEnElContrato: 'CRUZA_EL_INICIO',
  ...over,
});

const fila: FilaDelTablero = {
  contractId: 'c1',
  contrato: '515',
  inquilino: 'María Isabel Bolívar',
  documentoDelInquilino: '43687485',
  inmueble: 'CL 131 CR 51',
  estadoDelMes: 'POR_REVISAR',
  porRevisar: 1,
  ajustesPorRevisar: 0,
  entradaRegistrada: false,
  inicio: '2026-09-08',
  ultimaFactura: null,
};

let root: Root;
let caja: HTMLDivElement;
const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
/** Radix cambia de pestaña con el botón del mouse abajo, no con `click`. */
const elegirPestana = (id: string) =>
  act(async () => {
    $(id)!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
  });

beforeEach(() => {
  vi.clearAllMocks();
  api.delContrato.mockResolvedValue({
    disponible: true,
    contractId: 'c1',
    contrato: '515',
    inquilino: 'María',
    entrega: '2026-09-08',
    devolucion: null,
    entradaRegistrada: false,
    garantia: null,
    facturas: [factura()],
  });
  caja = document.createElement('div');
  document.body.appendChild(caja);
  root = createRoot(caja);
});
afterEach(async () => {
  await act(async () => root.unmount());
  caja.remove();
});

async function montar(props: { puedeCargar?: boolean } = {}) {
  await act(async () =>
    root.render(<CajonDelContrato fila={fila} onCerrar={vi.fn()} onCambio={vi.fn()} puedeEditar puedeCargar={props.puedeCargar ?? true} />),
  );
  await act(async () => {});
}

describe('El cajón del contrato', () => {
  it('dice desde cuándo empezó el contrato y cuántas facturas esperan revisión', async () => {
    await montar();
    expect(document.body.textContent).toContain('empezó el 8 sep 2026');
    expect($('pestana-facturas')!.textContent).toBe('Facturas1');
  });

  it('🔴 la factura de entrada abre su liquidación en el mismo cajón y vuelve a la lista', async () => {
    api.entradaDeLaFactura.mockResolvedValue({
      mesFacturado: '2026-10',
      corteDesde: '2026-08-15',
      corteHasta: '2026-09-15',
      diasDelCorte: 32,
      fechaEntrega: '2026-09-08',
      anterior: { desde: '2026-08-15', hasta: '2026-09-07', dias: 24, valorCop: 86_445 },
      nuevo: { desde: '2026-09-08', hasta: '2026-09-15', dias: 8, valorCop: 28_815 },
      totalCop: 115_260,
      frase: '…',
    });
    await montar();
    await act(async () => $('partir-f1')!.click());
    expect($('vista-de-la-entrada')).not.toBeNull();
    await act(async () => new Promise((r) => setTimeout(r, 400)));
    expect(api.entradaDeLaFactura).toHaveBeenCalledWith('f1', '2026-09-08');
    expect($('entrada-nuevo')!.textContent).toContain('$ 28.815');
    await act(async () => $('volver-a-las-facturas')!.click());
    expect($('factura-f1')).not.toBeNull();
  });

  it('la liquidación de la entrega se pide sólo al abrir su pestaña', async () => {
    api.liquidacionDeSalida.mockResolvedValue({
      disponible: true,
      contractId: 'c1',
      contrato: '515',
      inquilino: 'María',
      inmueble: 'CL 131 CR 51',
      fechaEntrega: '2026-10-29',
      fechaEntregaDe: 'ACTA_DE_DEVOLUCION',
      tramitesPorDefectoCop: 10_000,
      anticipoDelContratoCop: 0,
      facturasDelPromedio: 6,
      grupos: [],
      filas: [],
      subtotalCop: 0,
      tramitesCop: 10_000,
      saldoAFavorCop: 0,
      totalCop: 10_000,
      aDevolverCop: 0,
      sinHistorial: true,
      avisos: [],
      frase: '',
    });
    await montar();
    expect(api.liquidacionDeSalida).not.toHaveBeenCalled();
    await elegirPestana('pestana-salida');
    await act(async () => {});
    expect(api.liquidacionDeSalida).toHaveBeenCalledWith('c1', {});
    expect(document.body.textContent).toContain('Sale del acta de devolución del inmueble.');
  });
});
