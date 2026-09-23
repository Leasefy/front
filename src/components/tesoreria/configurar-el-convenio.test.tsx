/**
 * @vitest-environment happy-dom
 *
 * 🔴 CONFIGURAR EL CONVENIO DE RECAUDO — la función que faltaba entera.
 *
 * Nico, 21-09-2026: «no se entiende nada qué tiene que hacer el usuario ni qué
 * ver», sobre `pagos/recaudo-bancario`.
 *
 * La causa no era la redacción: la pantalla mandaba a configurar un convenio y
 * **no había dónde**. El back tenía `POST /convenios` desde siempre y el cliente
 * del front tenía `crearConvenio` escrito, sin un solo llamador.
 *
 * Lo que estas pruebas cuidan:
 *
 *  1. el vacío tiene UNA acción y abre el formulario;
 *  2. el preset llena el formato y muestra QUÉ comparar contra el papel del
 *     banco — sin eso se importan 400 líneas corridas un carácter;
 *  3. lo que se escribe es lo que viaja al back;
 *  4. el motivo del back se muestra tal cual (dice qué campo se pisa con cuál);
 *  5. editar un convenio precarga sus datos y guarda contra SU id;
 *  6. sin la migración no se ofrece guardar, y se dice por qué.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';
import type { Convenio, ListaDeConvenios } from '@/lib/api/tesoreria.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  listarConvenios: vi.fn(),
  crearConvenio: vi.fn(),
  guardarConvenio: vi.fn(),
  previa: vi.fn(),
  importar: vi.fn(),
}));

vi.mock('@/lib/api/tesoreria.service', () => ({
  tesoreriaApi: {
    listarConvenios: h.listarConvenios,
    crearConvenio: h.crearConvenio,
    guardarConvenio: h.guardarConvenio,
    previa: h.previa,
    importar: h.importar,
  },
}));

const toastSuccess = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { RecaudoBancarioPanel } from './RecaudoBancario';

const PRESET = {
  clave: 'ancho-fijo-tipico',
  nombre: 'Ancho fijo con valor en centavos',
  advertencia:
    'Referencia en las posiciones 1-24, fecha 25-32 (YYYYMMDD) y valor 33-47 en centavos. Verifica las posiciones contra el diseño de registro de tu convenio.',
  formato: {
    tipo: 'ANCHO_FIJO' as const,
    columnas: {
      referencia: { desde: 1, largo: 24 },
      fecha: { desde: 25, largo: 8 },
      valor: { desde: 33, largo: 15 },
    },
    formatoDeFecha: 'YYYYMMDD',
    decimales: 2,
    lineasDeEncabezado: 0,
    lineasDePie: 0,
    marcaDeDetalle: null,
    marcaEn: null,
  },
};

const CATALOGO = {
  tipos: [
    { valor: 'ANCHO_FIJO' as const, nombre: 'Ancho fijo' },
    { valor: 'DELIMITADO' as const, nombre: 'Delimitado' },
  ],
  formatosDeFecha: ['YYYYMMDD', 'DD/MM/YYYY'],
  presets: [PRESET],
  viasDeEntrada: [
    { valor: 'ARCHIVO' as const, nombre: 'Archivo de recaudo del convenio' },
    { valor: 'EXTRACTO' as const, nombre: 'Extracto bancario' },
  ],
};

const SIN_CONVENIOS: ListaDeConvenios = {
  disponible: true,
  motivo: null,
  convenios: [],
  ...CATALOGO,
};

const UNO: Convenio = {
  id: 'c-1',
  banco: 'Bancolombia',
  codigo: '90210',
  nombre: 'Recaudo de arriendos',
  activo: true,
  tipo: 'DELIMITADO',
  separador: ';',
  columnas: { referencia: { indice: 0 }, fecha: { indice: 1 }, valor: { indice: 2 } },
  formatoDeFecha: 'DD/MM/YYYY',
  decimales: 0,
  lineasDeEncabezado: 1,
  lineasDePie: 0,
  marcaDeDetalle: null,
  marcaEn: null,
  referenciaLargo: 10,
  referenciaPrefijo: null,
  referenciaDv: 'MODULO_10',
  cuentaBancaria: '001-234567-89',
  viaDeEntrada: 'ARCHIVO',
  viaDeEntradaNombre: 'Archivo de recaudo del convenio',
  ejemploDeReferencia: '00000018507',
  avisos: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

let contenedor: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  vi.clearAllMocks();
  h.crearConvenio.mockResolvedValue({ ejemploDeReferencia: '00000018507' });
  h.guardarConvenio.mockResolvedValue({ ejemploDeReferencia: '00000018507' });
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<RecaudoBancarioPanel />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

/** El cajón de Radix monta en un PORTAL sobre `document.body`. */
const enElCajon = (testid: string) =>
  document.body.querySelector(`[data-testid="${testid}"]`);
const q = (testid: string) => contenedor.querySelector(`[data-testid="${testid}"]`);

async function clic(el: Element | null) {
  if (!el) throw new Error('no existe el elemento');
  await act(async () => {
    (el as HTMLElement).click();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

/** React descarta un `.value` asignado a mano: hay que usar el setter nativo. */
async function escribir(testid: string, texto: string) {
  const input = enElCajon(testid) as HTMLInputElement;
  if (!input) throw new Error(`no existe el input ${testid}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function abrirElFormulario() {
  await pintar();
  await clic(q('configurar-convenio'));
}

describe('el vacío tiene UNA acción', () => {
  it('sin convenios se ofrece configurarlo, y no dos párrafos que dicen lo mismo', async () => {
    h.listarConvenios.mockResolvedValue(SIN_CONVENIOS);
    await pintar();

    const vacio = q('sin-convenio');
    expect(vacio).not.toBeNull();
    expect(q('configurar-convenio')).not.toBeNull();
    // La frase vieja mandaba a configurar algo que no existía en ningún lado.
    expect(vacio?.textContent).not.toContain('Configúralo con el diseño de registro');
  });

  it('la acción abre el formulario', async () => {
    h.listarConvenios.mockResolvedValue(SIN_CONVENIOS);
    await abrirElFormulario();

    expect(enElCajon('cajon-convenio')).not.toBeNull();
    expect(enElCajon('convenio-banco')).not.toBeNull();
  });

  /*
   * 🔴 Sin la migración el back no puede guardar. Ofrecer el botón dejaría a
   * alguien copiando 14 campos de un papel para recibir un 503 al final.
   */
  it('sin la migración no se ofrece guardar, y se dice por qué', async () => {
    h.listarConvenios.mockResolvedValue({
      ...SIN_CONVENIOS,
      disponible: false,
      motivo: 'Falta la migración 20260918: la aplica Víctor.',
    });
    await pintar();

    expect((q('configurar-convenio') as HTMLButtonElement).disabled).toBe(true);
    /*
     * El aviso NO le nombra a Víctor al usuario —eso es interno— y sí promete
     * que no se pierde trabajo. `SinLaMigracion` ya lo hace bien; lo que esta
     * prueba cuida es que el aviso ESTÉ y que el botón no invite a llenar 14
     * campos para recibir un 503 al final.
     */
    expect(q('recaudo-sin-migracion')?.textContent).toContain(
      'no se puede guardar el convenio de recaudo',
    );
    expect(q('recaudo-sin-migracion')?.textContent).toContain('no se pierde trabajo');
  });
});

describe('el preset es por dónde se empieza', () => {
  it('elegirlo llena el formato y dice QUÉ comparar contra el papel del banco', async () => {
    h.listarConvenios.mockResolvedValue(SIN_CONVENIOS);
    await abrirElFormulario();

    await clic(document.body.querySelector(`#preset-${PRESET.clave}`));

    expect(enElCajon('advertencia-del-preset')?.textContent).toContain(
      'Verifica las posiciones contra el diseño de registro',
    );
    // Y las posiciones quedaron puestas: la referencia arranca en la 1 y mide 24.
    const referencia = enElCajon('campo-referencia')!
      .querySelectorAll('input')
    expect((referencia[0] as HTMLInputElement).value).toBe('1')
    expect((referencia[1] as HTMLInputElement).value).toBe('24')
  });
});

describe('lo que se escribe es lo que viaja', () => {
  it('guardar manda el banco, el código y el nombre tal como se escribieron', async () => {
    h.listarConvenios.mockResolvedValue(SIN_CONVENIOS);
    await abrirElFormulario();

    await escribir('convenio-banco', 'Davivienda');
    await escribir('convenio-codigo', '77123');
    await escribir('convenio-nombre', 'Recaudo de cánones');
    await clic(enElCajon('guardar-convenio'));

    expect(h.crearConvenio).toHaveBeenCalledTimes(1);
    const dto = h.crearConvenio.mock.calls[0][0] as Record<string, unknown>;
    expect(dto.banco).toBe('Davivienda');
    expect(dto.codigo).toBe('77123');
    expect(dto.nombre).toBe('Recaudo de cánones');
  });

  it('sin banco, código o nombre el botón no se puede apretar', async () => {
    h.listarConvenios.mockResolvedValue(SIN_CONVENIOS);
    await abrirElFormulario();

    expect((enElCajon('guardar-convenio') as HTMLButtonElement).disabled).toBe(true);
    await escribir('convenio-banco', 'Davivienda');
    expect((enElCajon('guardar-convenio') as HTMLButtonElement).disabled).toBe(true);
  });

  /*
   * 🔴 Un campo numérico vacío NO se manda como 0. `lineasDeEncabezado: 0` es
   * una afirmación («este archivo no tiene encabezado»); mandarla por omisión
   * haría que la primera línea de datos se lea como encabezado o al revés.
   */
  it('un campo numérico vacío se omite, no viaja como cero', async () => {
    h.listarConvenios.mockResolvedValue(SIN_CONVENIOS);
    await abrirElFormulario();

    await escribir('convenio-banco', 'Davivienda');
    await escribir('convenio-codigo', '77123');
    await escribir('convenio-nombre', 'Recaudo');
    await escribir('convenio-encabezado', '');
    await clic(enElCajon('guardar-convenio'));

    const dto = h.crearConvenio.mock.calls[0][0] as Record<string, unknown>;
    expect(dto.lineasDeEncabezado).toBeUndefined();
    expect(dto.marcaDeDetalle).toBeUndefined();
  });

  it('el ejemplo de referencia del back se dice al terminar: es lo que se compara con el volante', async () => {
    h.listarConvenios.mockResolvedValue(SIN_CONVENIOS);
    await abrirElFormulario();

    await escribir('convenio-banco', 'Davivienda');
    await escribir('convenio-codigo', '77123');
    await escribir('convenio-nombre', 'Recaudo');
    await clic(enElCajon('guardar-convenio'));

    expect(toastSuccess.mock.calls[0][1].description).toContain('00000018507');
  });
});

describe('el motivo del back se muestra tal cual', () => {
  /*
   * El back valida el formato y devuelve los problemas EN PALABRAS («la
   * referencia y la fecha se pisan en la posición 25»). Reemplazarlo por una
   * frase genérica deja a alguien mirando 14 campos sin saber cuál está mal.
   */
  it('un 400 del back se lee en el formulario, no como «revisa los datos»', async () => {
    h.listarConvenios.mockResolvedValue(SIN_CONVENIOS);
    h.crearConvenio.mockRejectedValue(
      new ApiError(
        400,
        'La referencia (1-24) y la fecha (25-32) se pisan: revisa el diseño de registro.',
        'FORMATO_INVALIDO',
      ),
    );
    await abrirElFormulario();

    await escribir('convenio-banco', 'Davivienda');
    await escribir('convenio-codigo', '77123');
    await escribir('convenio-nombre', 'Recaudo');
    await clic(enElCajon('guardar-convenio'));

    expect(enElCajon('convenio-error')?.textContent).toContain('se pisan');
    // Y el cajón NO se cierra: lo que se escribió sigue ahí para corregirlo.
    expect(enElCajon('cajon-convenio')).not.toBeNull();
  });
});

describe('un convenio guardado se puede cambiar', () => {
  it('el formato copiado del papel casi nunca queda bien la primera vez', async () => {
    h.listarConvenios.mockResolvedValue({ ...SIN_CONVENIOS, convenios: [UNO] });
    await pintar();

    await clic(q('editar-convenio-c-1'));

    // Precargado con lo que ya estaba guardado.
    expect((enElCajon('convenio-banco') as HTMLInputElement).value).toBe('Bancolombia');
    expect((enElCajon('convenio-codigo') as HTMLInputElement).value).toBe('90210');

    await escribir('convenio-nombre', 'Recaudo de arriendos y administración');
    await clic(enElCajon('guardar-convenio'));

    // Contra SU id, no creando otro.
    expect(h.guardarConvenio).toHaveBeenCalledTimes(1);
    expect(h.guardarConvenio.mock.calls[0][0]).toBe('c-1');
    expect(h.crearConvenio).not.toHaveBeenCalled();
  });

  it('con convenios guardados el vacío no aparece, y se puede agregar otro', async () => {
    h.listarConvenios.mockResolvedValue({ ...SIN_CONVENIOS, convenios: [UNO] });
    await pintar();

    expect(q('sin-convenio')).toBeNull();
    expect(q('nuevo-convenio')).not.toBeNull();
  });

  /*
   * Un convenio inactivo no es lo mismo que ningún convenio: no se puede
   * importar, pero el camino para arreglarlo es activarlo, no configurar otro.
   */
  it('con un convenio inactivo se dice eso, no «no tienes convenio»', async () => {
    h.listarConvenios.mockResolvedValue({
      ...SIN_CONVENIOS,
      convenios: [{ ...UNO, activo: false }],
    });
    await pintar();

    expect(q('sin-convenio-activo')?.textContent).toContain('Actívalo');
    expect(q('sin-convenio')).toBeNull();
  });
});
