/**
 * El lote y Wompi · Pagos a terceros, en el detalle del lote.
 *
 * Lo que se fija:
 *   · con Wompi listo, «Enviar a Wompi» está prendido y dice desde qué cuenta sale;
 *   · sin permiso, o con el porqué del back, el botón se apaga CON ese porqué;
 *   · un lote en Wompi dice su avance en una frase («1 de 3 pagados · 1
 *     rechazado»), manda al panel de Wompi cuando espera al Aprobador y lista
 *     los giros que no salieron con su causal;
 *   · sin conexión, una sola línea que dice dónde se conecta; sin migración, nada.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { EnvioAWompi, VistaDelLoteEnWompi } from '@/lib/api/wompi-pagos.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ enviar: vi.fn(), consultar: vi.fn(), verLote: vi.fn() }));

vi.mock('@/lib/api/wompi-pagos.service', () => ({
  wompiPagosApi: { enviar: h.enviar, consultar: h.consultar, verLote: h.verLote },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { avanceEnPalabras, LoteEnWompi } from './LoteEnWompi';

const LOTE = 'lote-1';

function vista(extra: Partial<VistaDelLoteEnWompi> = {}): VistaDelLoteEnWompi {
  return {
    disponible: true,
    motivo: null,
    conexion: { ambiente: 'PRODUCCION', estado: 'CONECTADA' },
    sePuedeEnviar: true,
    porQueNo: null,
    cuentaOrigen: 'Bancolombia · CORRIENTE · ****5678',
    enlaceAlPanel: 'https://comercios.wompi.co',
    envio: null,
    intentosAnteriores: 0,
    ...extra,
  };
}

function envio(extra: Partial<EnvioAWompi> = {}): EnvioAWompi {
  return {
    id: 'e-1',
    intento: 1,
    estado: 'PAGANDO',
    abierto: true,
    estadoWompi: 'PENDING',
    estadoEnPalabras: 'Wompi lo está pagando',
    mensaje: 'Wompi lo está pagando. 1 de 3 pagados.',
    payoutId: 'po-1',
    ambiente: 'PRODUCCION',
    cuentaOrigen: 'Bancolombia · CORRIENTE · ****5678',
    totalDeGiros: 3,
    pagados: 1,
    rechazados: 1,
    pendientes: 1,
    totalCop: 6_000_000,
    facturarAhora: false,
    enviadoAt: '2026-09-23T14:00:00.000Z',
    ultimaConsultaAt: '2026-09-23T14:10:00.000Z',
    cerradoAt: null,
    procesoId: 'p-1',
    transacciones: [
      { dispersionId: 'd-1', nombre: 'Jorge Restrepo', cuentaFinal: '8901', valorCop: 1_000_000, estado: 'PAGADA', causal: null, motivo: null },
      {
        dispersionId: 'd-3',
        nombre: 'Luisa Botero',
        cuentaFinal: '4321',
        valorCop: 3_000_000,
        estado: 'RECHAZADA',
        causal: 'D07',
        motivo: 'El banco lo rechazó (D07): el número de cuenta no existe.',
      },
    ],
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.enviar.mockReset();
  h.consultar.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function pintar(props: Partial<React.ComponentProps<typeof LoteEnWompi>> = {}) {
  return act(async () => {
    root.render(
      <LoteEnWompi loteId={LOTE} estado="APROBADO" vista={vista()} puedeEditar onCambio={() => {}} {...props} />,
    );
  });
}

const enviar = () => container.querySelector<HTMLButtonElement>('[data-testid="boton-enviar-a-wompi"]');

describe('«Enviar a Wompi»', () => {
  it('con Wompi listo, está prendido y dice desde qué cuenta sale', async () => {
    await pintar();
    expect(enviar()?.disabled).toBe(false);
    expect(container.textContent).toContain('Sale desde Bancolombia · CORRIENTE · ****5678');
  });

  it('🔴 sin permiso de edición se apaga CON el porqué', async () => {
    await pintar({ puedeEditar: false });
    expect(enviar()?.disabled).toBe(true);
    expect(container.querySelector('[data-testid="por-que-no-wompi"]')?.textContent).toMatch(/permiso de edición sobre dispersiones/);
  });

  it('con el porqué del back (cuenta no vinculada) se apaga y lo dice tal cual', async () => {
    await pintar({ vista: vista({ sePuedeEnviar: false, porQueNo: 'La cuenta terminada en 5678 no está vinculada en Wompi.' }) });
    expect(enviar()?.disabled).toBe(true);
    expect(container.textContent).toContain('La cuenta terminada en 5678 no está vinculada en Wompi.');
  });

  it('confirmar lo manda y le pasa la vista nueva al detalle', async () => {
    const onCambio = vi.fn();
    const nueva = vista({ envio: envio({ estado: 'ESPERANDO_APROBACION' }) });
    h.enviar.mockResolvedValue(nueva);
    await pintar({ onCambio });
    await act(async () => enviar()?.click());
    const confirmar = document.body.querySelector<HTMLButtonElement>('[data-testid="confirmar-enviar-a-wompi"]');
    await act(async () => confirmar?.click());
    expect(h.enviar).toHaveBeenCalledWith(LOTE, false);
    expect(onCambio).toHaveBeenCalledWith(nueva);
  });

  it('sin conexión: una línea que dice dónde se conecta, y nada más', async () => {
    await pintar({ vista: vista({ conexion: null, sePuedeEnviar: false }) });
    expect(container.querySelector('[data-testid="wompi-sin-conectar"]')?.textContent).toMatch(/Configuración → Integraciones/);
    expect(enviar()).toBeNull();
  });

  it('sin la migración no pinta nada: el lote sigue por archivo', async () => {
    await pintar({ vista: vista({ disponible: false, motivo: 'Falta aplicar…' }) });
    expect(container.innerHTML).toBe('');
  });
});

describe('Un lote en Wompi', () => {
  it('dice el avance en UNA frase, con la plata y la cuenta', async () => {
    await pintar({ estado: 'EN_WOMPI', vista: vista({ envio: envio() }) });
    expect(container.querySelector('[data-testid="avance-en-wompi"]')?.textContent).toBe('1 de 3 pagados · 1 rechazado');
    expect(enviar()).toBeNull();
  });

  it('esperando al Aprobador, manda al panel de Wompi', async () => {
    await pintar({
      estado: 'EN_WOMPI',
      vista: vista({ envio: envio({ estado: 'ESPERANDO_APROBACION', pagados: 0, rechazados: 0, mensaje: 'Apruébalo en el panel de Wompi con tu rol de Aprobador.' }) }),
    });
    const enlace = [...container.querySelectorAll('a')].find((a) => a.textContent?.includes('Abrir el panel de Wompi'));
    expect(enlace?.getAttribute('href')).toBe('https://comercios.wompi.co');
    expect(container.textContent).toContain('Apruébalo en el panel de Wompi con tu rol de Aprobador.');
  });

  it('lista los giros que no salieron, con la causal en español', async () => {
    await pintar({ estado: 'EN_WOMPI', vista: vista({ envio: envio() }) });
    const lista = container.querySelector('[data-testid="giros-que-no-salieron"]');
    expect(lista?.textContent).toContain('Luisa Botero');
    expect(lista?.textContent).toContain('el número de cuenta no existe');
    expect(lista?.textContent).not.toContain('Jorge Restrepo');
  });

  it('«Consultar ahora» le pregunta a Wompi', async () => {
    h.consultar.mockResolvedValue(vista({ envio: envio({ pagados: 2 }) }));
    const onCambio = vi.fn();
    await pintar({ estado: 'EN_WOMPI', vista: vista({ envio: envio() }), onCambio });
    const b = [...container.querySelectorAll('button')].find((x) => x.textContent?.includes('Consultar ahora'));
    await act(async () => b?.click());
    expect(h.consultar).toHaveBeenCalledWith(LOTE);
    expect(onCambio).toHaveBeenCalled();
  });
});

describe('avanceEnPalabras', () => {
  it('sin rechazos no los menciona', () => {
    expect(avanceEnPalabras({ pagados: 37, totalDeGiros: 120, rechazados: 0 })).toBe('37 de 120 pagados');
  });
});
