/**
 * 🔴 Protección de datos (23-09): las solicitudes de habeas data de los
 * titulares. Lo que protege este archivo:
 *
 *   · el resumen es UNA frase y dice lo urgente (vencidas y por vencer);
 *   · la pestaña por defecto son las ABIERTAS, y las pestañas filtran;
 *   · la fila abre el cajón; responder se apaga con el porqué hasta que hay
 *     decisión y texto, y manda lo que la persona escribió;
 *   · descargar los datos del titular baja el JSON del back;
 *   · sin la migración, la pantalla lo dice y no ofrece registrar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ListaDeSolicitudes, SolicitudDeHabeasData } from '@/lib/api/habeas-data.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toast, descargarBlob } = vi.hoisted(() => ({
  api: { listar: vi.fn(), crear: vi.fn(), responder: vi.fn(), datosDelTitular: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  descargarBlob: vi.fn(),
}));
vi.mock('@/lib/api/habeas-data.service', () => ({ habeasDataApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast }));
vi.mock('@/lib/reportes/exportables', () => ({ descargarBlob }));

import { SeccionProteccionDeDatos } from './SeccionProteccionDeDatos';

function solicitud(over: Partial<SolicitudDeHabeasData> = {}): SolicitudDeHabeasData {
  return {
    id: 's-1',
    tipo: 'SUPRESION',
    canal: 'CORREO',
    titular: { nombre: 'María Restrepo', tipoDocumento: 'CC', documento: '43123456', correo: null, telefono: null },
    descripcion: 'Pide que borren sus datos.',
    recibidaEl: '2026-09-23',
    venceEl: '2026-10-15',
    plazoEnDiasHabiles: 15,
    diasHabilesRestantes: 2,
    estado: 'ABIERTA',
    estadoDelPlazo: 'POR_VENCER',
    resultado: null,
    respuesta: null,
    respondidaEl: null,
    respondidaPor: null,
    creadaEl: '2026-09-23T15:00:00.000Z',
    ...over,
  };
}

function lista(over: Partial<ListaDeSolicitudes> = {}): ListaDeSolicitudes {
  return {
    disponible: true,
    migracion: null,
    resumen: { abiertas: 2, porVencer: 1, vencidas: 1, respondidas: 1 },
    solicitudes: [
      solicitud(),
      solicitud({ id: 's-2', titular: { ...solicitud().titular, nombre: 'Pedro Gómez' }, estadoDelPlazo: 'VENCIDA', diasHabilesRestantes: -2 }),
      solicitud({ id: 's-3', estado: 'RESPONDIDA', estadoDelPlazo: 'RESPONDIDA', resultado: 'ATENDIDA', respuesta: 'Listo.', titular: { ...solicitud().titular, nombre: 'Ana Ruiz' } }),
    ],
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;
const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<SeccionProteccionDeDatos />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}
async function clic(el: HTMLElement | null) {
  if (!el) throw new Error('no está el elemento');
  await act(async () => {
    el.click();
  });
}
async function escribir(el: HTMLElement | null, valor: string) {
  if (!el) throw new Error('no está el campo');
  const campo = el as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo), 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  api.listar.mockReset().mockResolvedValue(lista());
  api.responder.mockReset();
  api.datosDelTitular.mockReset();
  Object.values(toast).forEach((f) => f.mockReset());
  descargarBlob.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Protección de datos', () => {
  it('el resumen es una frase que dice lo urgente', async () => {
    await montar();
    expect($('frase-del-resumen')!.textContent).toBe(
      'Tienes 2 solicitudes abiertas: 1 vencida y 1 que vence en 3 días hábiles o menos. 1 ya tiene respuesta.',
    );
  });

  it('abre en las ABIERTAS y las pestañas filtran', async () => {
    await montar();
    expect($('solicitud-s-1')).not.toBeNull();
    expect($('solicitud-s-2')).not.toBeNull();
    expect($('solicitud-s-3')).toBeNull();
    expect($('plazo-s-2')!.textContent).toContain('Vencida hace 2 días hábiles');

    await clic($('pestana-respondidas'));
    expect($('solicitud-s-1')).toBeNull();
    expect($('solicitud-s-3')).not.toBeNull();
  });

  it('🔴 responder se apaga con el porqué y manda la decisión y el texto', async () => {
    api.responder.mockResolvedValue(
      solicitud({ estado: 'RESPONDIDA', estadoDelPlazo: 'RESPONDIDA', resultado: 'NEGADA', respuesta: 'La ley obliga a conservar el contrato.' }),
    );
    await montar();
    await clic($('solicitud-s-1'));

    const guardar = $('guardar-respuesta') as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
    expect(document.body.textContent).toContain('Elige si la solicitud se atendió o se negó.');

    await clic($('resultado-NEGADA'));
    await escribir($('respuesta-de-la-solicitud'), 'La ley obliga a conservar el contrato.');
    expect(($('guardar-respuesta') as HTMLButtonElement).disabled).toBe(false);

    await clic($('guardar-respuesta'));
    expect(api.responder).toHaveBeenCalledWith('s-1', {
      resultado: 'NEGADA',
      respuesta: 'La ley obliga a conservar el contrato.',
    });
    expect($('constancia')!.textContent).toContain('La ley obliga a conservar el contrato.');
  });

  it('descargar los datos del titular baja el JSON del back', async () => {
    api.datosDelTitular.mockResolvedValue({ encontrados: 3, secciones: {}, noIncluye: [] });
    await montar();
    await clic($('solicitud-s-1'));
    await clic($('exportar-datos-del-titular'));

    expect(api.datosDelTitular).toHaveBeenCalledWith('s-1');
    expect(descargarBlob).toHaveBeenCalledTimes(1);
    expect(descargarBlob.mock.calls[0][1]).toMatch(/^datos-del-titular-43123456-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('sin la migración lo dice y no ofrece registrar', async () => {
    api.listar.mockResolvedValue(
      lista({ disponible: false, migracion: '20260923200000_solicitudes_de_habeas_data', solicitudes: [], resumen: { abiertas: 0, porVencer: 0, vencidas: 0, respondidas: 0 } }),
    );
    await montar();
    expect($('habeas-data-sin-migrar')).not.toBeNull();
    expect($('registrar-solicitud')).toBeNull();
  });
});
