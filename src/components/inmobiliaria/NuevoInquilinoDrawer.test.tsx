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
        'Ya tenés a Carla Mesa con el documento 1020304050. Buscalo en la lista y hacele el contrato desde ahí.',
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
});
