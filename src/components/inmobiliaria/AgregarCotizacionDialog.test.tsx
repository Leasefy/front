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

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// SO-08 (04-10): sin proveedores registrados el diálogo abre el registro
// rápido; al guardar, registra al proveedor y cotiza con su id.
const proveedoresApi = vi.hoisted(() => ({
  listar: vi.fn(),
  crear: vi.fn(),
}));
vi.mock('@/lib/api/proveedores-de-mantenimiento.service', () => ({
  proveedoresDeMantenimientoApi: proveedoresApi,
}));
beforeEach(() => {
  proveedoresApi.listar.mockReset();
  proveedoresApi.crear.mockReset();
  proveedoresApi.listar.mockResolvedValue([]);
  proveedoresApi.crear.mockImplementation((d: { nombre: string; telefono?: string }) =>
    Promise.resolve({ id: 'prov-nuevo', nombre: d.nombre, telefono: d.telefono ?? null, especialidades: [], avisos: [], calificacion: null }),
  );
});

import { AgregarCotizacionDialog } from './AgregarCotizacionDialog';
import { ApiError } from '@/lib/api/client';
import { MENSAJES_DEL_MANTENIMIENTO } from '@/lib/mantenimiento/limites-del-mantenimiento';

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

async function montar(props: Partial<React.ComponentProps<typeof AgregarCotizacionDialog>> = {}) {
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
  // La lista de proveedores llega después del primer pintado.
  await act(async () => {
    await Promise.resolve();
  });
  return { onGuardar: onGuardar as ReturnType<typeof vi.fn>, onOpenChange };
}

function llenarTodo() {
  escribir(campo('cotizacion-proveedor'), 'Plomería El Rayo');
  escribir(campo('cotizacion-documento'), '900123456');
  escribir(campo('cotizacion-monto'), '350000');
  escribir(campo('cotizacion-alcance'), 'Cambio del sifón y prueba de presión');
  escribir(campo('cotizacion-dias'), '2');
}

describe('<AgregarCotizacionDialog>', () => {
  it('sin solicitud no dibuja nada: el diálogo no tiene sujeto', async () => {
    await montar({ solicitud: null });
    expect(document.body.querySelector('[data-testid="cotizacion-dialogo"]')).toBeNull();
  });

  it('dice sobre qué solicitud se está cotizando', async () => {
    await montar();
    expect(document.body.textContent).toContain('Gotera en el baño');
    expect(document.body.textContent).toContain('Apto 402 — Laureles');
  });

  it('manda los cinco campos del modelo y NINGUNO más', async () => {
    const { onGuardar } = await montar();
    llenarTodo();
    escribir(campo('cotizacion-telefono'), '3001234567');

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).toHaveBeenCalledTimes(1);
    const [id, cotizacion] = onGuardar.mock.calls[0];
    expect(id).toBe('sol-1');
    expect(cotizacion).toEqual({
      proveedorId: 'prov-nuevo',
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
      'proveedorId',
      'providerName',
      'providerPhone',
    ]);
  });

  it('el teléfono vacío se OMITE, no viaja como cadena vacía', async () => {
    const { onGuardar } = await montar();
    llenarTodo();

    await act(async () => {
      guardar().click();
    });

    const [, cotizacion] = onGuardar.mock.calls[0];
    expect(cotizacion.providerPhone).toBeUndefined();
  });

  it('el monto llega como número, no como el texto agrupado que se ve', async () => {
    const { onGuardar } = await montar();
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
    const { onGuardar } = await montar();

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).not.toHaveBeenCalled();
    expect(campo('cotizacion-proveedor').getAttribute('aria-invalid')).toBe('true');
    expect(campo('cotizacion-monto').getAttribute('aria-invalid')).toBe('true');
    expect(campo('cotizacion-alcance').getAttribute('aria-invalid')).toBe('true');
  });

  it('un monto en cero no es una cotización', async () => {
    const { onGuardar } = await montar();
    llenarTodo();
    escribir(campo('cotizacion-monto'), '0');

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('cuando guarda bien, cierra el diálogo', async () => {
    const { onOpenChange } = await montar();
    llenarTodo();

    await act(async () => {
      guardar().click();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('si el back rechaza, el diálogo NO se cierra y lo tecleado sigue ahí', async () => {
    const onGuardar = vi.fn().mockRejectedValue(new Error('Solicitud completada'));
    const { onOpenChange } = await montar({ onGuardar });
    llenarTodo();

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(campo('cotizacion-monto').value).not.toBe('');
    // SO-08: el proveedor ya quedó registrado y ESCOGIDO; reintentar no lo
    // registra dos veces.
    expect(proveedoresApi.crear).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('[data-testid="cotizacion-proveedor-lista"]')).not.toBeNull();
    // Y se puede reintentar: el botón volvió a estar disponible.
    expect(guardar().disabled).toBe(false);
    await act(async () => {
      guardar().click();
    });
    expect(proveedoresApi.crear).toHaveBeenCalledTimes(1);
    expect(onGuardar.mock.calls[1][1]).toMatchObject({ proveedorId: 'prov-nuevo' });
  });

  it('🔴 SO-08: con proveedores registrados se ESCOGE de la lista (con su oficio y su calificación) y viaja su id', async () => {
    proveedoresApi.listar.mockResolvedValue([
      { id: 'p-1', nombre: 'Plomería QA Día S.A.S.', telefono: '3001112233', especialidades: ['PLUMBING'], calificacion: 4.5, avisos: [] },
    ]);
    const { onGuardar } = await montar();
    expect(document.body.querySelector('#cotizacion-proveedor')).toBeNull();
    expect(document.body.querySelector('[data-testid="cotizacion-proveedor-lista"]')).not.toBeNull();

    // Sin escoger: no viaja y lo pide.
    escribir(campo('cotizacion-monto'), '180000');
    escribir(campo('cotizacion-alcance'), 'Cambio del sifón');
    await act(async () => {
      guardar().click();
    });
    expect(onGuardar).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Escoge el proveedor de la lista o regístralo.');
  });

  it('🔴 un valor de once cifras se ataja antes de enviar, con la frase del back', async () => {
    const { onGuardar } = await montar();
    llenarTodo();
    escribir(campo('cotizacion-monto'), '30000000000');

    await act(async () => {
      guardar().click();
    });

    expect(onGuardar).not.toHaveBeenCalled();
    expect(document.body.querySelector('#cotizacion-monto-error')?.textContent).toBe(
      MENSAJES_DEL_MANTENIMIENTO.valorMaximo,
    );
  });

  it('🔴 un 400 con campos: el error sale bajo SU campo y el campo recibe el foco', async () => {
    const onGuardar = vi.fn().mockRejectedValue(
      new ApiError(400, [MENSAJES_DEL_MANTENIMIENTO.diasMaximos], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [MENSAJES_DEL_MANTENIMIENTO.diasMaximos],
        campos: [{ campo: 'estimatedDays', regla: 'maximo', mensaje: MENSAJES_DEL_MANTENIMIENTO.diasMaximos }],
      }),
    );
    const { onOpenChange } = await montar({ onGuardar });
    llenarTodo();

    await act(async () => {
      guardar().click();
    });

    expect(document.body.querySelector('#cotizacion-dias-error')?.textContent).toBe(
      MENSAJES_DEL_MANTENIMIENTO.diasMaximos,
    );
    expect(campo('cotizacion-dias').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(campo('cotizacion-dias'));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('el tope del teléfono es el de la columna (20), no infinito', async () => {
    await montar();
    expect(campo('cotizacion-telefono').getAttribute('maxlength')).toBe('20');
    expect(campo('cotizacion-proveedor').getAttribute('maxlength')).toBe('200');
  });
});
