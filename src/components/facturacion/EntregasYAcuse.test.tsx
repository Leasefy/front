/**
 * La entrega del documento al cliente y su acuse.
 *
 * Lo que protege esta prueba:
 *
 *  · 🔴 SIMULADA no es ENVIADA. En un entorno con el envío apagado el
 *    documento NO le llegó a nadie, y la pantalla lo dice con esas palabras —
 *    es el opuesto exacto del incidente del 14-09.
 *  · El canal ALTERNO (WhatsApp, enlace) se declara como lo que es: una deuda
 *    que se salda completando el correo.
 *  · Un RECHAZO exige motivo antes de dejar registrarlo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { entregas, registrarAcuse } = vi.hoisted(() => ({
  entregas: vi.fn(),
  registrarAcuse: vi.fn(),
}));

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real =
    await vi.importActual<
      typeof import('@/lib/api/facturacion-electronica.service')
    >('@/lib/api/facturacion-electronica.service');
  return {
    ...real,
    facturacionElectronicaService: { entregas, registrarAcuse },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { EntregasYAcuse } from './EntregasYAcuse';

function entrega(over: Record<string, unknown> = {}) {
  return {
    id: 'e-1',
    documentoTipo: 'FACTURA',
    documentoId: 'f-1',
    numeroDian: 'FE-1042',
    canal: 'CORREO',
    canalNombre: 'Correo con XML y PDF',
    destinatario: 'ana@leasefy.co',
    estado: 'ENVIADA',
    estadoNombre: 'Entregada',
    constancia: 'msg-1',
    motivo: null,
    enviadaAt: '2026-09-17T12:00:00.000Z',
    aceptaTacitoAt: '2026-09-22T12:00:00.000Z',
    acuseAt: null,
    acusePor: null,
    intentos: 1,
    esperaAcuse: true,
    ...over,
  };
}

function respuesta(over: Record<string, unknown> = {}) {
  return {
    disponible: true,
    migracion: null,
    resumen: { ENVIADA: 1 },
    entregas: [entrega()],
    explicacion: null,
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function pintar(r: Record<string, unknown>) {
  entregas.mockResolvedValue(r);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<EntregasYAcuse />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  host = document.createElement('div');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove();
});

const q = (s: string) =>
  host.querySelector(s) ?? document.body.querySelector(s);

describe('EntregasYAcuse', () => {
  it('muestra el canal, el destinatario y el plazo de aceptación tácita', async () => {
    await pintar(respuesta());
    const fila = q('[data-testid="entrega-e-1"]')!;
    expect(fila.textContent).toContain('Correo con XML y PDF');
    expect(fila.textContent).toContain('ana@leasefy.co');
    expect(fila.textContent).toContain('Entregada');
  });

  it('🔴 SIMULADA avisa que NO le llegó a nadie', async () => {
    await pintar(
      respuesta({
        resumen: { SIMULADA: 3 },
        entregas: [
          entrega({
            estado: 'SIMULADA',
            estadoNombre: 'No salió (envío apagado en este entorno)',
            motivo:
              'En este entorno el envío de correos está apagado (EMAIL_DELIVERY_ENABLED): el documento NO le llegó al cliente.',
          }),
        ],
      }),
    );
    const aviso = q('[data-testid="entregas-simuladas"]')!;
    expect(aviso.textContent).toContain('no le llegaron a nadie');
    expect(q('[data-testid="entrega-e-1"]')!.textContent).toContain(
      'NO le llegó al cliente',
    );
  });

  it('🔴 el canal ALTERNO se declara y manda a completar el correo', async () => {
    await pintar(
      respuesta({
        entregas: [
          entrega({
            canal: 'ENLACE',
            canalNombre: 'Enlace descargable',
            destinatario: null,
          }),
        ],
      }),
    );
    expect(q('[data-testid="entregas-alternas"]')!.textContent).toContain(
      'Terceros sin correo',
    );
  });

  it('aceptar registra el acuse sin pedir motivo', async () => {
    await pintar(respuesta());
    registrarAcuse.mockResolvedValue({ id: 'e-1', estado: 'ACEPTADA' });
    await act(async () => {
      (q('[data-testid="entrega-aceptar-e-1"]') as HTMLButtonElement).click();
    });
    expect(registrarAcuse).toHaveBeenCalledWith('e-1', { aceptada: true });
  });

  it('🔴 rechazar exige motivo antes de dejar registrarlo', async () => {
    await pintar(respuesta());
    await act(async () => {
      (q('[data-testid="entrega-rechazar-e-1"]') as HTMLButtonElement).click();
    });
    const confirmar = q(
      '[data-testid="entrega-rechazo-confirmar"]',
    ) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);

    const area = q('[data-testid="entrega-rechazo-motivo"]') as HTMLTextAreaElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )!.set!;
    await act(async () => {
      setter.call(area, 'El canon no corresponde al del contrato.');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    registrarAcuse.mockResolvedValue({ id: 'e-1', estado: 'RECHAZADA_CLIENTE' });
    await act(async () => {
      (q('[data-testid="entrega-rechazo-confirmar"]') as HTMLButtonElement).click();
    });
    expect(registrarAcuse).toHaveBeenCalledWith('e-1', {
      aceptada: false,
      motivo: 'El canon no corresponde al del contrato.',
    });
  });

  it('una entrega que ya no espera acuse no ofrece los botones', async () => {
    await pintar(
      respuesta({
        entregas: [
          entrega({
            estado: 'ACEPTADA_TACITA',
            estadoNombre: 'Aceptada tácitamente',
            esperaAcuse: false,
          }),
        ],
      }),
    );
    expect(q('[data-testid="entrega-aceptar-e-1"]')).toBeNull();
    expect(q('[data-testid="entrega-rechazar-e-1"]')).toBeNull();
  });

  it('🔴 sin la migración lo DICE en vez de fingir un listado vacío', async () => {
    await pintar(
      respuesta({
        disponible: false,
        migracion: '20260918001000_cola_de_transmision_y_entrega',
        entregas: [],
        resumen: {},
        explicacion:
          'La entrega y el acuse llegan con la migración 20260918001000_cola_de_transmision_y_entrega, que todavía no está aplicada en esta base.',
      }),
    );
    expect(q('[data-testid="entregas-sin-migracion"]')!.textContent).toContain(
      '20260918001000',
    );
  });
});
