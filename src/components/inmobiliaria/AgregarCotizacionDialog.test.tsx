/**
 * El diálogo que le agrega una cotización a una solicitud YA creada.
 *
 * Nico, 2026-09-12: «en el detalle, en los tres puntos, en el menú, no deja
 * agregar la cotización a un mantenimiento ya creado. Crea toda esa
 * funcionalidad de agregar cotización por favor.»
 *
 * Lo que fijan estas pruebas:
 *   - se manda EXACTAMENTE lo que guarda `MantenimientoQuote` (cinco campos) y
 *     nada más: un campo de más es un 400 del cuerpo entero
 *     (`forbidNonWhitelisted` en el back);
 *   - el teléfono vacío se OMITE, no viaja como `''`;
 *   - un formulario incompleto no llega al cable;
 *   - si el back rechaza, el diálogo NO se cierra (lo tecleado se conserva).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatDate: (d: string) => d,
  }),
}));

import { AgregarCotizacionDialog } from './AgregarCotizacionDialog';

function hacerSolicitud(
  overrides: Partial<SolicitudMantenimiento> = {},
): SolicitudMantenimiento {
  return {
    id: 'sol-1',
    consignacionId: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'own-1',
    tenantId: 'ten-1',
    propertyTitle: 'Apto 402 — Laureles',
    propertyAddress: 'Cra 76 #34-12',
    tenantName: 'Camila Restrepo',
    propietarioName: 'Ana Dueña',
    type: 'plumbing',
    priority: 'medium',
    status: 'reported',
    title: 'Gotera en el baño',
    description: 'El sifón del lavamanos gotea',
    photoUrls: [],
    quotes: [],
    paidBy: 'owner',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  } as SolicitudMantenimiento;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

const campo = (id: string) =>
  document.body.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;

const guardar = () =>
  document.body.querySelector<HTMLButtonElement>('[data-testid="cotizacion-guardar"]')!;

/** Escribe en un input controlado por React (setter nativo + evento `input`). */
function escribir(elemento: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const prototipo =
    elemento instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototipo, 'value')!.set!;
  act(() => {
    setter.call(elemento, valor);
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function montar(props: Partial<React.ComponentProps<typeof AgregarCotizacionDialog>> = {}) {
  const onGuardar = props.onGuardar ?? vi.fn().mockResolvedValue(undefined);
  const onOpenChange = props.onOpenChange ?? vi.fn();
  act(() => {
    root.render(
      <AgregarCotizacionDialog
        // `??` no sirve acá: `null` es justo el caso que se quiere probar.
        solicitud={'solicitud' in props ? props.solicitud! : hacerSolicitud()}
        abierto={props.abierto ?? true}
        onOpenChange={onOpenChange}
        onGuardar={onGuardar}
      />,
    );
  });
  return { onGuardar, onOpenChange };
}

function llenarTodo() {
  escribir(campo('cotizacion-proveedor'), 'Plomería El Rayo');
  escribir(campo('cotizacion-monto'), '350000');
  escribir(campo('cotizacion-alcance'), 'Cambio del sifón y prueba de presión');
  escribir(campo('cotizacion-dias'), '2');
}

describe('<AgregarCotizacionDialog>', () => {
  it('sin solicitud no dibuja nada: el diálogo no tiene sujeto', () => {
    montar({ solicitud: null });
    expect(document.body.querySelector('[data-testid="cotizacion-dialogo"]')).toBeNull();
  });

  it('dice sobre qué solicitud se está cotizando', () => {
    montar();
    expect(document.body.textContent).toContain('Gotera en el baño');
    expect(document.body.textContent).toContain('Apto 402 — Laureles');
  });

  it('manda los cinco campos del modelo y NINGUNO más', async () => {
    const { onGuardar } = montar();
    llenarTodo();
    escribir(campo('cotizacion-telefono'), '3001234567');

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).toHaveBeenCalledTimes(1);
    const [id, cotizacion] = onGuardar.mock.calls[0];
    expect(id).toBe('sol-1');
    expect(cotizacion).toEqual({
      providerName: 'Plomería El Rayo',
      providerPhone: '3001234567',
      amount: 350000,
      description: 'Cambio del sifón y prueba de presión',
      estimatedDays: 2,
    });
    expect(Object.keys(cotizacion).sort()).toEqual([
      'amount',
      'description',
      'estimatedDays',
      'providerName',
      'providerPhone',
    ]);
  });

  it('el teléfono vacío se OMITE, no viaja como cadena vacía', async () => {
    const { onGuardar } = montar();
    llenarTodo();

    await act(async () => {
      guardar().click();
    });

    const [, cotizacion] = onGuardar.mock.calls[0];
    expect(cotizacion.providerPhone).toBeUndefined();
  });

  it('el monto llega como número, no como el texto agrupado que se ve', async () => {
    const { onGuardar } = montar();
    llenarTodo();
    escribir(campo('cotizacion-monto'), '1250000');

    await act(async () => {
      guardar().click();
    });

    const [, cotizacion] = onGuardar.mock.calls[0];
    expect(cotizacion.amount).toBe(1250000);
    // Lo que se ve sí está agrupado: el campo formatea mientras se escribe.
    expect(campo('cotizacion-monto').value).toContain('1.250.000');
  });

  it('sin proveedor, sin monto o sin alcance no llama al cable y marca los campos', async () => {
    const { onGuardar } = montar();

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).not.toHaveBeenCalled();
    expect(campo('cotizacion-proveedor').getAttribute('aria-invalid')).toBe('true');
    expect(campo('cotizacion-monto').getAttribute('aria-invalid')).toBe('true');
    expect(campo('cotizacion-alcance').getAttribute('aria-invalid')).toBe('true');
  });

  it('un monto en cero no es una cotización', async () => {
    const { onGuardar } = montar();
    llenarTodo();
    escribir(campo('cotizacion-monto'), '0');

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('cuando guarda bien, cierra el diálogo', async () => {
    const { onOpenChange } = montar();
    llenarTodo();

    await act(async () => {
      guardar().click();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('si el back rechaza, el diálogo NO se cierra y lo tecleado sigue ahí', async () => {
    const onGuardar = vi.fn().mockRejectedValue(new Error('Solicitud completada'));
    const { onOpenChange } = montar({ onGuardar });
    llenarTodo();

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(campo('cotizacion-proveedor').value).toBe('Plomería El Rayo');
    // Y se puede reintentar: el botón volvió a estar disponible.
    expect(guardar().disabled).toBe(false);
  });

  it('el tope del teléfono es el de la columna (20), no infinito', () => {
    montar();
    expect(campo('cotizacion-telefono').getAttribute('maxlength')).toBe('20');
    expect(campo('cotizacion-proveedor').getAttribute('maxlength')).toBe('200');
  });
});
