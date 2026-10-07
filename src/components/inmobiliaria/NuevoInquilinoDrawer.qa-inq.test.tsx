/**
 * QA-INQ (03-10-2026) · «Nuevo inquilino» y «Editar datos».
 *
 *  · I-18: con el correo obligatorio de la inmobiliaria, Correo lo dice desde
 *    el principio y se valida antes de mandar.
 *  · I-19: al guardar con errores, el foco va al primer campo con error.
 *  · I-20: `FALTA_CORREO_DEL_TERCERO` va bajo Correo y el 409 del documento
 *    repetido bajo Documento, con el enlace a esa persona; el toast, sólo lo
 *    que no tiene campo.
 *  · I-14: un NIT con un dígito de verificación equivocado se dice.
 *  · E-16: el mismo formulario corrige los datos; manda sólo lo que cambió y
 *    el correo de una cuenta pide confirmación.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { crearMock, actualizarMock, exigidoMock, confirmarMock, errores, exitos, permisos } = vi.hoisted(() => ({
  crearMock: vi.fn(),
  actualizarMock: vi.fn(),
  exigidoMock: vi.fn(),
  confirmarMock: vi.fn(),
  errores: [] as Array<{ titulo: string; descripcion?: string }>,
  exitos: [] as string[],
  permisos: { cobrosView: true },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (titulo: string) => exitos.push(titulo),
    error: (titulo: string, o?: { description?: string }) => errores.push({ titulo, descripcion: o?.description }),
  },
}));
vi.mock('@/lib/api/inquilinos.service', async (importar) => {
  const real = await importar<typeof import('@/lib/api/inquilinos.service')>();
  return { ...real, inquilinosApi: { crear: crearMock, actualizar: actualizarMock } };
});
vi.mock('@/lib/api/facturacion-electronica.service', () => ({
  facturacionElectronicaService: { tercerosSinCorreo: exigidoMock },
}));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({
    canAccess: (m: string, a: string) => (m === 'cobros' && a === 'view' ? permisos.cobrosView : true),
  }),
}));
vi.mock('@/components/ui/confirmar', () => ({ confirmar: confirmarMock }));

import { ApiError } from '@/lib/api/client';
import { NuevoInquilinoDrawer, validarInquilino, INQUILINO_VACIO } from './NuevoInquilinoDrawer';
import type { Inquilino } from '@/lib/api/inquilinos.service';

let host: HTMLDivElement | undefined;
let root: Root | undefined;

async function montar(props: Partial<React.ComponentProps<typeof NuevoInquilinoDrawer>> = {}) {
  const c = document.createElement('div');
  document.body.appendChild(c);
  const r = createRoot(c);
  host = c;
  root = r;
  await act(async () => {
    r.render(<NuevoInquilinoDrawer abierto onOpenChange={() => {}} onCreado={() => {}} {...props} />);
  });
  await act(async () => {});
}

const campo = (testid: string) => document.querySelector<HTMLInputElement>(`[data-testid="${testid}"]`)!;
const errorDe = (id: string) => document.getElementById(`${id}-error`)?.textContent ?? '';

function escribir(testid: string, valor: string) {
  const input = campo(testid);
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function guardar() {
  await act(async () => {
    campo('inquilino-guardar').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  crearMock.mockReset();
  actualizarMock.mockReset();
  exigidoMock.mockReset();
  confirmarMock.mockReset();
  exigidoMock.mockResolvedValue({ exigido: false, terceros: [] });
  errores.length = 0;
  exitos.length = 0;
  permisos.cobrosView = true;
});
afterEach(() => {
  const r = root;
  if (r) act(() => r.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

describe('I-18 · el correo obligatorio se dice desde el principio', () => {
  it('🔴 con la política prendida, Correo dice «obligatorio» y no se manda sin él (el error va bajo Correo)', async () => {
    exigidoMock.mockResolvedValue({ exigido: true, terceros: [] });
    await montar();
    const etiqueta = document.querySelector('label[for="inquilino-correo"]')!;
    expect(etiqueta.textContent).toBe('Correo (obligatorio)');
    escribir('inquilino-nombre', 'Tomás Gil');
    escribir('inquilino-documento', '1020304050');
    await guardar();
    expect(crearMock).not.toHaveBeenCalled();
    expect(errorDe('inquilino-correo')).toContain('Escribe su correo');
    expect(document.activeElement).toBe(campo('inquilino-correo'));
  });

  it('con la política apagada queda como antes: correo O documento', async () => {
    await montar();
    expect(document.querySelector('label[for="inquilino-correo"]')!.textContent).not.toContain('obligatorio');
    expect(validarInquilino({ ...INQUILINO_VACIO, nombre: 'Ana', documento: '1' }).correo).toBeUndefined();
  });

  it('sin permiso para leer la política no la pide (el back decide y su 400 va bajo Correo)', async () => {
    permisos.cobrosView = false;
    await montar();
    expect(exigidoMock).not.toHaveBeenCalled();
  });
});

describe('I-19 · el foco va al primer campo con error', () => {
  it('🔴 guardar vacío enfoca el nombre', async () => {
    await montar();
    await guardar();
    expect(document.activeElement).toBe(campo('inquilino-nombre'));
  });
});

describe('I-20 · los rechazos del back van bajo su campo', () => {
  it('🔴 FALTA_CORREO_DEL_TERCERO va bajo Correo, no al toast', async () => {
    crearMock.mockRejectedValue(
      new ApiError(400, 'El correo del inquilino es obligatorio en tu inmobiliaria.', 'FALTA_CORREO_DEL_TERCERO'),
    );
    await montar();
    escribir('inquilino-nombre', 'Tomás Gil');
    escribir('inquilino-documento', '1020304050');
    await guardar();
    expect(errorDe('inquilino-correo')).toBe('El correo del inquilino es obligatorio en tu inmobiliaria.');
    expect(campo('inquilino-correo').getAttribute('aria-invalid')).toBe('true');
    expect(errores).toEqual([]);
  });

  it('🔴 el 409 del documento repetido va bajo Documento, con el enlace que abre a esa persona', async () => {
    const onVerExistente = vi.fn();
    crearMock.mockRejectedValue(
      new ApiError(409, 'Ya tienes a Carla Mesa con el documento 1020304050.', 'INQUILINO_YA_EXISTE', {
        statusCode: 409,
        code: 'INQUILINO_YA_EXISTE',
        message: 'Ya tienes a Carla Mesa con el documento 1020304050.',
        campo: 'documento',
        tenantId: 'u-carla',
      }),
    );
    await montar({ onVerExistente });
    escribir('inquilino-nombre', 'Carla M.');
    escribir('inquilino-documento', '1020304050');
    await guardar();
    expect(errorDe('inquilino-documento')).toContain('Carla Mesa');
    expect(errores).toEqual([]);
    act(() => {
      campo('inquilino-ver-existente').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onVerExistente).toHaveBeenCalledWith({ llave: '1020304050', tenantId: 'u-carla' });
  });

  it('lo que no tiene campo sigue en el toast (un 5xx)', async () => {
    crearMock.mockRejectedValue(new ApiError(500, 'x', 'ERROR_INTERNO', { referencia: 'ab12' }));
    await montar();
    escribir('inquilino-nombre', 'Ana');
    escribir('inquilino-documento', '1');
    await guardar();
    expect(errores[0].titulo).toBe('No se pudo crear el inquilino');
  });
});

describe('I-14 · el dígito de verificación del NIT', () => {
  it('🔴 un DV equivocado se dice bajo el campo y no se manda', () => {
    const e = validarInquilino({ ...INQUILINO_VACIO, nombre: 'Empresa SAS', tipoDocumento: 'NIT', documento: '900777888-9' });
    expect(e.documento).toBe('El dígito de verificación de este NIT es 2, no 9.');
  });

  it('el DV correcto (o sin DV) pasa', () => {
    expect(validarInquilino({ ...INQUILINO_VACIO, nombre: 'E', tipoDocumento: 'NIT', documento: '900777888-2' }).documento).toBeUndefined();
    expect(validarInquilino({ ...INQUILINO_VACIO, nombre: 'E', tipoDocumento: 'NIT', documento: '900777888' }).documento).toBeUndefined();
  });
});

describe('E-16 · «Editar datos»', () => {
  const sofia: Inquilino = {
    tenantId: '5b0c8a64-1d1e-4c39-9d0f-3f2b9a1c7e21',
    nombre: 'Sofía Vélez',
    email: 'sofia@correo.co',
    telefono: '3001112233',
    documento: '1020304050',
    tipoDocumento: 'CC',
    arriendos: [],
  };

  it('abre con sus datos y manda SÓLO lo que cambió, por su identidad', async () => {
    const onCreado = vi.fn();
    actualizarMock.mockResolvedValue({ inquilino: { ...sofia, telefono: '3009998877' }, avisos: [] });
    await montar({ editando: sofia, onCreado });
    expect(campo('inquilino-nombre').value).toBe('Sofía Vélez');
    expect(campo('inquilino-guardar').textContent).toBe('Guardar cambios');
    escribir('inquilino-telefono', '3009998877');
    await guardar();
    expect(actualizarMock).toHaveBeenCalledWith(sofia.tenantId, { telefono: '3009998877' });
    expect(onCreado).toHaveBeenCalledWith(expect.objectContaining({ telefono: '3009998877' }));
  });

  it('🔴 cambiar el correo de alguien con cuenta pide confirmación y reenvía con confirmarCambioDeCorreo', async () => {
    actualizarMock
      .mockRejectedValueOnce(
        new ApiError(409, 'Sofía entra al portal con sofia@correo.co…', 'CONFIRMA_EL_CAMBIO_DE_CORREO', {
          code: 'CONFIRMA_EL_CAMBIO_DE_CORREO',
          campo: 'correo',
          correoActual: 'sofia@correo.co',
          correoNuevo: 'nuevo@correo.co',
        }),
      )
      .mockResolvedValueOnce({ inquilino: { ...sofia, email: 'nuevo@correo.co' }, avisos: ['Le debemos una invitación nueva.'] });
    confirmarMock.mockResolvedValue(true);
    await montar({ editando: sofia });
    escribir('inquilino-correo', 'nuevo@correo.co');
    await guardar();
    await act(async () => {});
    expect(confirmarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: '¿Cambiar el correo con el que entra al portal?',
        descripcion: expect.stringContaining('entra a su portal con sofia@correo.co'),
      }),
    );
    expect(actualizarMock).toHaveBeenLastCalledWith(sofia.tenantId, {
      correo: 'nuevo@correo.co',
      confirmarCambioDeCorreo: true,
    });
  });

  it('si no confirma, no se manda nada más', async () => {
    actualizarMock.mockRejectedValueOnce(new ApiError(409, 'Confirma.', 'CONFIRMA_EL_CAMBIO_DE_CORREO'));
    confirmarMock.mockResolvedValue(false);
    await montar({ editando: sofia });
    escribir('inquilino-correo', 'otro@correo.co');
    await guardar();
    expect(actualizarMock).toHaveBeenCalledTimes(1);
  });

  it('🔴 un rechazo del back con `campo` (CORREO_DE_OTRA_CUENTA) va bajo ese campo, no al toast', async () => {
    actualizarMock.mockRejectedValueOnce(
      new ApiError(409, 'otro@correo.co ya es el correo de otra cuenta de Leasefy.', 'CORREO_DE_OTRA_CUENTA', {
        code: 'CORREO_DE_OTRA_CUENTA',
        campo: 'correo',
      }),
    );
    await montar({ editando: sofia });
    escribir('inquilino-correo', 'otro@correo.co');
    await guardar();
    expect(errorDe('inquilino-correo')).toContain('ya es el correo de otra cuenta');
    expect(document.activeElement).toBe(campo('inquilino-correo'));
    expect(errores).toEqual([]);
  });

  it('el NIT de una empresa se edita con su DV', async () => {
    await montar({ editando: { ...sofia, nombre: 'Consultores SAS', documento: '900777888', tipoDocumento: 'NIT' } });
    expect(campo('inquilino-documento').value).toBe('900777888-2');
  });
});
