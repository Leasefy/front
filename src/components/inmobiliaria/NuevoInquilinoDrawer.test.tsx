/**
 * El cajón de «Nuevo inquilino».
 *
 * Lo que se protege acá es lo que hace inútil a una persona cargada: que se
 * guarde sin correo NI documento —las dos llaves con las que después se la
 * encuentra— y que el `''` de un campo vacío viaje al back, que corre con
 * `forbidNonWhitelisted` y trata un vacío como un valor.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { crearMock, exitos, errores } = vi.hoisted(() => ({
  crearMock: vi.fn(),
  exitos: [] as Array<{ titulo: string; descripcion?: string }>,
  errores: [] as Array<{ titulo: string; descripcion?: string }>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (titulo: string, o?: { description?: string }) =>
      exitos.push({ titulo, descripcion: o?.description }),
    error: (titulo: string, o?: { description?: string }) =>
      errores.push({ titulo, descripcion: o?.description }),
  },
}));

vi.mock('@/lib/api/inquilinos.service', () => ({
  inquilinosApi: { crear: crearMock },
}));

import { ApiError } from '@/lib/api/client';
import {
  NuevoInquilinoDrawer,
  validarInquilino,
  INQUILINO_VACIO,
} from './NuevoInquilinoDrawer';

// Los tests de `validarInquilino` no montan nada: el desmontaje lo tolera.
let host: HTMLDivElement | undefined;
let root: Root | undefined;
const creados: string[] = [];

function montar(abierto = true) {
  const c = document.createElement('div');
  document.body.appendChild(c);
  const r = createRoot(c);
  host = c;
  root = r;
  act(() => {
    r.render(
      <NuevoInquilinoDrawer
        abierto={abierto}
        onOpenChange={() => {}}
        onCreado={(i) => creados.push(i.tenantId)}
      />,
    );
  });
}

/** El `Sheet` se porta en un portal: se busca en todo el documento. */
const campo = (testid: string) =>
  document.querySelector<HTMLInputElement>(`[data-testid="${testid}"]`)!;

function escribir(testid: string, valor: string) {
  const input = campo(testid);
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function guardar() {
  const boton = document.querySelector<HTMLButtonElement>(
    '[data-testid="inquilino-guardar"]',
  )!;
  act(() => {
    boton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  crearMock.mockReset();
  crearMock.mockResolvedValue({
    inquilino: {
      tenantId: 'u-1',
      nombre: 'Carla Mesa',
      email: null,
      telefono: null,
      documento: '1020304050',
      arriendos: [],
    },
    invitado: false,
  });
  exitos.length = 0;
  errores.length = 0;
  creados.length = 0;
});

afterEach(() => {
  const r = root;
  if (r) act(() => r.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

describe('validarInquilino', () => {
  it('🔴 sin correo NI documento no se puede guardar', () => {
    const e = validarInquilino({ ...INQUILINO_VACIO, nombre: 'Carla Mesa' });
    expect(e.llave).toContain('al menos el correo o el documento');
  });

  it('con sólo el documento alcanza', () => {
    expect(
      validarInquilino({ ...INQUILINO_VACIO, nombre: 'Carla Mesa', documento: '1020' }),
    ).toEqual({});
  });

  it('con sólo el correo alcanza', () => {
    expect(
      validarInquilino({
        ...INQUILINO_VACIO,
        nombre: 'Carla Mesa',
        correo: 'carla@ejemplo.co',
      }),
    ).toEqual({});
  });

  it('un correo escrito a medias se marca', () => {
    const e = validarInquilino({
      ...INQUILINO_VACIO,
      nombre: 'Carla Mesa',
      correo: 'carla@',
    });
    expect(e.correo).toBeTruthy();
  });

  it('el nombre no puede quedar en blanco', () => {
    expect(validarInquilino({ ...INQUILINO_VACIO, documento: '1020' }).nombre).toBeTruthy();
  });
});

describe('NuevoInquilinoDrawer', () => {
  it('🔴 no manda nada si falta la llave, y dice por qué', () => {
    montar();
    escribir('inquilino-nombre', 'Carla Mesa');
    guardar();

    expect(crearMock).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-testid="inquilino-error-llave"]')?.textContent,
    ).toContain('al menos el correo o el documento');
  });

  it('QA-INQ-95 r2 (N-06): sin correo NI documento, los DOS campos quedan marcados', () => {
    montar();
    escribir('inquilino-nombre', 'Carla Mesa');
    guardar();
    for (const id of ['inquilino-documento', 'inquilino-correo']) {
      const campo = document.querySelector(`[data-testid="${id}"]`);
      expect(campo?.getAttribute('aria-invalid')).toBe('true');
      expect(campo?.getAttribute('aria-describedby')).toContain('inquilino-llave-error');
    }
  });

  it('guarda y devuelve la persona creada', async () => {
    montar();
    escribir('inquilino-nombre', '  Carla Mesa  ');
    escribir('inquilino-documento', '1020304050');
    escribir('inquilino-telefono', '3009999999');
    guardar();
    await act(async () => {});

    expect(crearMock).toHaveBeenCalledWith({
      nombre: 'Carla Mesa',
      documento: '1020304050',
      // El tipo viaja con el número: el back lo exige para saber cómo
      // guardarlo, y `CC` es lo que el selector muestra elegido.
      tipoDocumento: 'CC',
      telefono: '3009999999',
    });
    expect(creados).toEqual(['u-1']);
  });

  it('QA-INQ-95 E-34: el teléfono pegado con +57 y espacios viaja en dígitos nacionales, como el del registro', async () => {
    montar();
    escribir('inquilino-nombre', 'Carla Mesa');
    escribir('inquilino-documento', '1020304050');
    escribir('inquilino-telefono', '+57 300 999 9999');
    guardar();
    await act(async () => {});

    expect((crearMock.mock.calls[0][0] as Record<string, unknown>).telefono).toBe('3009999999');
  });

  it('🔴 un campo vacío se OMITE, no se manda como «»', async () => {
    montar();
    escribir('inquilino-nombre', 'Carla Mesa');
    escribir('inquilino-correo', 'carla@ejemplo.co');
    guardar();
    await act(async () => {});

    const enviado = crearMock.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(enviado).sort()).toEqual(['correo', 'nombre']);
  });

  it('dice que todavía no cobra, y que salió la invitación cuando salió', async () => {
    crearMock.mockResolvedValue({
      inquilino: {
        tenantId: 'u-2',
        nombre: 'Carla Mesa',
        email: 'carla@ejemplo.co',
        telefono: null,
        documento: null,
        arriendos: [],
      },
      invitado: true,
    });
    montar();
    escribir('inquilino-nombre', 'Carla Mesa');
    escribir('inquilino-correo', 'carla@ejemplo.co');
    guardar();
    await act(async () => {});

    expect(exitos[0].descripcion).toContain('invitación');
    expect(exitos[0].descripcion).toContain('falta su contrato');
  });

  it('🔴 el 409 del back se muestra tal cual: dice con QUIÉN chocó', async () => {
    crearMock.mockRejectedValue(
      new ApiError(
        409,
        'Ya tienes a Carla Mesa con el documento 1020304050. Búscalo en la lista y hacele el contrato desde ahí.',
        'INQUILINO_YA_EXISTE',
      ),
    );
    montar();
    escribir('inquilino-nombre', 'Carla M.');
    escribir('inquilino-documento', '1020304050');
    guardar();
    await act(async () => {});

    expect(errores[0].descripcion).toContain('Carla Mesa');
    expect(creados).toEqual([]);
  });

  it('🔴 un 409 largo se muestra ENTERO (antes se tiraba si pasaba de 200 caracteres)', async () => {
    const largo =
      'Ya tienes a Carla Mesa con el documento 1020304050, cargada el 12 de septiembre desde la migración de contratos, ' +
      'con el contrato 1050 vigente en el Apartamento 301 de la Torre Alameda. Búscala en la lista y edítala desde ahí.';
    expect(largo.length).toBeGreaterThan(200);
    crearMock.mockRejectedValue(new ApiError(409, largo, 'INQUILINO_YA_EXISTE'));
    montar();
    escribir('inquilino-nombre', 'Carla M.');
    escribir('inquilino-documento', '1020304050');
    guardar();
    await act(async () => {});
    expect(errores[0].descripcion).toBe(largo);
  });

  it('🔴 un 400 con `campos`: el error va bajo SU campo, con el foco, y no al toast', async () => {
    const frase = 'Revisa el correo: no parece un correo válido.';
    crearMock.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        campos: [{ campo: 'correo', regla: 'formato', mensaje: frase }],
      }),
    );
    montar();
    escribir('inquilino-nombre', 'Carla Mesa');
    escribir('inquilino-correo', 'carla@ejemplo.co');
    guardar();
    await act(async () => {});

    const correo = campo('inquilino-correo');
    expect(document.getElementById(`${correo.id}-error`)?.textContent).toBe(frase);
    expect(correo.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(correo);
    expect(errores).toHaveLength(0);

    // Al corregirlo, el error del servidor se va.
    escribir('inquilino-correo', 'carla.mesa@ejemplo.co');
    expect(correo.getAttribute('aria-invalid')).toBeNull();
  });

  it('un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    crearMock.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    );
    montar();
    escribir('inquilino-nombre', 'Carla Mesa');
    escribir('inquilino-documento', '1020304050');
    guardar();
    await act(async () => {});
    expect(errores[0].descripcion).toMatch(/^No pudimos crear el inquilino: algo falló de nuestro lado/);
    expect(errores[0].descripcion).toContain('ab12cd34');
    expect(errores[0].descripcion).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta (la red) habla de la conexión', async () => {
    crearMock.mockRejectedValue(new TypeError('Failed to fetch'));
    montar();
    escribir('inquilino-nombre', 'Carla Mesa');
    escribir('inquilino-documento', '1020304050');
    guardar();
    await act(async () => {});
    expect(errores[0].descripcion).toMatch(/conexión/);
  });
});

/*
 * QA-INQ-95 (N-09, 04-10-2026): el pasaporte lleva letras; el teclado numérico
 * del celular no deja escribirlas.
 */
describe('tecladoDelDocumento', () => {
  it('numérico sólo para cédula y tarjeta de identidad', async () => {
    const { tecladoDelDocumento } = await import('./NuevoInquilinoDrawer');
    expect(tecladoDelDocumento('CC')).toBe('numeric');
    expect(tecladoDelDocumento('TI')).toBe('numeric');
    expect(tecladoDelDocumento('PASSPORT')).toBe('text');
    expect(tecladoDelDocumento('CE')).toBe('text');
    expect(tecladoDelDocumento('NIT')).toBe('text');
  });
});
