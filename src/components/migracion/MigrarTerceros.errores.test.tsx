/**
 * MigrarTerceros.errores.test.tsx — todo lo que puede fallar, con su salida.
 *
 * La regla que se congela acá: **ningún fallo deja la pantalla muerta ni
 * miente sobre lo que pasó**. Cada caso tiene tres partes: el fallo es
 * visible, la salida está en el mismo lugar, y lo que la persona ya hizo
 * (el archivo subido, el mapeo, lo tecleado) no se pierde.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, parseMock } = vi.hoisted(() => ({
  api: {
    plantilla: vi.fn(),
    lotesAbiertos: vi.fn(),
    resumen: vi.fn(),
    filas: vi.fn(),
    aplicar: vi.fn(),
    preparar: vi.fn(),
    corregir: vi.fn(),
    descartar: vi.fn(),
    resolverMasivo: vi.fn(),
  },
  parseMock: vi.fn(),
}));

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/migracion-terceros.service')
  >('@/lib/api/migracion-terceros.service');
  return { ...actual, migracionTercerosApi: api };
});

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: parseMock,
}));

import { MigrarTerceros, resumenDeFallidas } from './MigrarTerceros';
import type { FilaDeStaging } from '@/lib/api/migracion-terceros.service';

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarTerceros tipoFijo="INQUILINO" />);
  });
  await act(async () => {});
}

function boton(texto: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll('button')].find((x) =>
    (x.textContent ?? '').includes(texto),
  ) as HTMLButtonElement | undefined;
}

async function clic(texto: string) {
  const b = boton(texto);
  if (!b) throw new Error(`No hay botón «${texto}»`);
  await act(async () => {
    b.click();
  });
  await act(async () => {});
}

const PLANTILLA = {
  tipo: 'INQUILINO' as const,
  columnas: [
    { campo: 'nombre', titulo: 'Nombre completo', obligatoria: true, ejemplo: 'Ana', alias: [] },
    { campo: 'correo', titulo: 'Correo', obligatoria: true, ejemplo: 'ana@x.co', alias: [] },
  ],
};

const LOTE = {
  lote: 'inquilinos-x',
  tipo: 'INQUILINO' as const,
  actualizado: '2026-09-01T10:00:00.000Z',
  total: 4,
  borradores: 0,
  requierenAtencion: 2,
  listos: 2,
  aplicados: 0,
  descartados: 0,
};

const filaPendiente = (n: number): FilaDeStaging => ({
  id: `f-${n}`,
  lote: 'inquilinos-x',
  tipo: 'INQUILINO',
  estado: 'REQUIERE_ATENCION',
  datos: { _fila: n, nombre: `Persona ${n}` },
  errores: [{ codigo: 'FALTA_CORREO', campo: 'correo', mensaje: 'falta el correo' }],
  propietarioId: null,
  userId: null,
  aplicadoAt: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  version: 3,
});

/** Sube un archivo por el dropzone con el parser mockeado. */
async function subirArchivo() {
  parseMock.mockResolvedValue({
    rows: [
      { Nombre: 'Ana', Correo: 'ana@x.co' },
      { Nombre: 'Beto', Correo: 'beto@x.co' },
    ],
    headers: ['Nombre', 'Correo'],
  });
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const archivo = new File(['x'], 'inquilinos.xlsx');
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.plantilla.mockResolvedValue(PLANTILLA);
  api.lotesAbiertos.mockResolvedValue([]);
  api.resumen.mockResolvedValue(LOTE);
  api.filas.mockResolvedValue({
    filas: [filaPendiente(1), filaPendiente(2)],
    total: 2,
    pagina: 1,
    porPagina: 25,
  });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════

describe('la plantilla que no llega', () => {
  it('🔴 el fallo se ve y el reintento está en el lugar — la pantalla no muere', async () => {
    api.plantilla.mockRejectedValueOnce(new Error('se cayó la red'));
    await pintar();

    const caja = container.querySelector('[data-testid="error-de-plantilla"]')!;
    expect(caja).not.toBeNull();
    expect(caja.textContent).toContain('se cayó la red');
    expect(caja.textContent).toContain('Reintentar');

    // El reintento revive TODO: el cartel se va y la descarga se habilita.
    await clic('Reintentar');
    expect(container.querySelector('[data-testid="error-de-plantilla"]')).toBeNull();
    expect(boton('Descargar la plantilla')?.disabled).toBe(false);
  });

  it('mientras carga, el dropzone dice que está preparando — no parece roto', async () => {
    let resolver!: (v: typeof PLANTILLA) => void;
    api.plantilla.mockReturnValue(new Promise((r) => (resolver = r)));
    await pintar();

    expect(container.textContent).toContain('leyendo las columnas esperadas');
    await act(async () => resolver(PLANTILLA));
    expect(container.textContent).not.toContain('leyendo las columnas esperadas');
  });
});

describe('las cargas sin terminar que no se pudieron listar', () => {
  it('avisa el riesgo de duplicar sin frenar, y el reintento las trae', async () => {
    api.lotesAbiertos
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce([LOTE]);
    await pintar();

    const aviso = container.querySelector('[data-testid="lotes-no-verificados"]')!;
    expect(aviso).not.toBeNull();
    // Sigue sin frenar: el dropzone está habilitado (plantilla cargó bien).
    expect(boton('Descargar la plantilla')?.disabled).toBe(false);

    await clic('Reintentar');
    expect(container.querySelector('[data-testid="lotes-no-verificados"]')).toBeNull();
    expect(container.querySelector('[data-testid="lotes-abiertos"]')).not.toBeNull();
  });
});

describe('preparar', () => {
  it('un fallo de red no pierde el archivo: el botón de revisar sigue ahí', async () => {
    api.preparar.mockRejectedValue(new Error('No pudimos conectarnos al servidor.'));
    await pintar();
    await subirArchivo();
    await clic('Revisar 2 inquilinos');

    expect(container.textContent).toContain('No pudimos conectarnos al servidor.');
    // El archivo parseado y el mapeo siguen: reintentar es apretar de nuevo.
    expect(boton('Revisar 2 inquilinos')).toBeDefined();
    expect(boton('Revisar 2 inquilinos')?.disabled).toBe(false);
  });

  it('🔴 el 409 de «ya existe» ofrece retomar ESA carga en un clic', async () => {
    // El caso real: la red se cortó DESPUÉS de que el back preparó; el
    // reintento da 409 y la salida correcta es retomar, no renombrar.
    await pintar();
    await subirArchivo();

    const nombre = container.querySelector<HTMLInputElement>(
      '[data-testid="nombre-del-lote"]',
    )!.value;
    api.preparar.mockRejectedValue(
      new ApiError(409, `Ya hay una carga con el nombre «${nombre}».`, 'LOTE_YA_EXISTE'),
    );
    api.lotesAbiertos.mockResolvedValue([{ ...LOTE, lote: nombre }]);

    await clic('Revisar 2 inquilinos');
    expect(container.textContent).toContain('Ya hay una carga con el nombre');

    await clic('Retomar esa carga');
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).not.toBeNull();
  });

  it('si preparar pasó pero leer las filas falló, NO dice «no pudimos preparar»', async () => {
    // Mentir acá empuja a reintentar → 409 inexplicable.
    api.preparar.mockResolvedValue(LOTE);
    api.resumen.mockRejectedValue(new Error('timeout'));
    api.filas.mockRejectedValue(new Error('timeout'));
    await pintar();
    await subirArchivo();
    await clic('Revisar 2 inquilinos');

    // La pantalla ES la lista de trabajo (la carga existe), con la salida al lado.
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).not.toBeNull();
    expect(container.textContent).toContain('quedó preparada');
    expect(container.textContent).not.toContain('No pudimos preparar');
    expect(boton('Actualizar la lista')).toBeDefined();
  });
});

describe('la lista de trabajo', () => {
  async function abrirLista() {
    api.lotesAbiertos.mockResolvedValue([LOTE]);
    await pintar();
    await clic('Retomar');
  }

  it('cambiar de página con la red caída lo dice — no se queda muda', async () => {
    api.resumen.mockResolvedValue({ ...LOTE, requierenAtencion: 30 });
    api.filas.mockResolvedValue({
      filas: [filaPendiente(1)],
      total: 30,
      pagina: 1,
      porPagina: 25,
    });
    await abrirLista();

    api.resumen.mockRejectedValue(new Error('red caída'));
    api.filas.mockRejectedValue(new Error('red caída'));
    await clic('2'); // el botón de la página 2

    expect(container.querySelector('[data-testid="error-de-lista"]')).not.toBeNull();
    expect(boton('Actualizar la lista')).toBeDefined();
  });

  it('🔴 aplicar caído dice que lo creado quedó creado, y relee los contadores', async () => {
    await abrirLista();
    api.aplicar.mockRejectedValue(new Error('No pudimos conectarnos al servidor.'));
    const resumenAntes = api.resumen.mock.calls.length;

    await clic('Crear 2 inquilinos');

    // El hecho, no la frase: lo creado no se pierde y reintentar no duplica.
    expect(container.textContent).toContain('quedó creado');
    expect(container.textContent).toContain('sin duplicar');
    // Releyó, para que «Ya creadas» muestre lo que el back SÍ alcanzó a hacer.
    expect(api.resumen.mock.calls.length).toBeGreaterThan(resumenAntes);
  });

  it('🔴 si el corte fue DESPUÉS de crear algunas, dice cuántas', async () => {
    /*
     * «Lo que alcanzó a crearse quedó creado» sobre 100 fichas ya creadas es
     * verdad pero no sirve: el número es lo que deja a la persona reintentar
     * tranquila en vez de ir a contar a mano.
     */
    await abrirLista();
    api.aplicar
      .mockResolvedValueOnce({
        lote: 'inquilinos-x',
        intentadas: 100,
        aplicadas: 100,
        fallidas: 0,
        invitados: 100,
        resultados: [],
        restantes: 40,
      })
      .mockRejectedValueOnce(new Error('No pudimos conectarnos al servidor.'));

    await clic('Crear 2 inquilinos');

    expect(container.textContent).toContain('Alcanzaron a crearse 100');
    expect(container.textContent).toContain('sin duplicar');
  });

  it('una fila aplicada con advertencia (la cuenta ya tenía otro documento) la muestra, sin contarla como fallo', async () => {
    await abrirLista();
    api.aplicar.mockResolvedValueOnce({
      lote: 'inquilinos-x',
      intentadas: 2,
      aplicadas: 2,
      fallidas: 0,
      invitados: 0,
      resultados: [
        { id: 'f-1', fila: 1, estado: 'aplicado', userId: 'u-1', invitado: false },
        {
          id: 'f-2',
          fila: 2,
          estado: 'aplicado',
          userId: 'u-2',
          invitado: false,
          advertencia:
            'La cuenta de ana@correo.co ya tiene otro documento registrado (99887766); se vinculó igual y se dejó el de la cuenta.',
        },
      ],
      restantes: 0,
    });

    await clic('Crear 2 inquilinos');

    const advertencias = container.querySelector('[data-testid="advertencias-aplicacion"]');
    expect(advertencias?.textContent).toContain('99887766');
    expect(advertencias?.querySelectorAll('li')).toHaveLength(1);
  });

  it('la creación por tandas sigue llamando hasta que no queden', async () => {
    await abrirLista();
    api.aplicar
      .mockResolvedValueOnce({
        lote: 'inquilinos-x',
        intentadas: 100,
        aplicadas: 100,
        fallidas: 0,
        invitados: 100,
        resultados: [],
        restantes: 20,
      })
      .mockResolvedValueOnce({
        lote: 'inquilinos-x',
        intentadas: 20,
        aplicadas: 20,
        fallidas: 0,
        invitados: 20,
        resultados: [],
        restantes: 0,
      });

    await clic('Crear 2 inquilinos');

    expect(api.aplicar).toHaveBeenCalledTimes(2);
    // El informe suma las dos tandas, no muestra sólo la última.
    expect(container.querySelector('[data-testid="informe-aplicacion"]')?.textContent).toContain(
      '120',
    );
  });

  it('una masiva parcial deja seleccionadas las fallidas y nombra CADA motivo', async () => {
    await abrirLista();

    // Seleccionar las 2 de la página.
    const marcarTodo = container.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-labelledby="seleccionar-pagina"]',
    )!;
    await act(async () => marcarTodo.click());
    await act(async () => {});
    expect(container.textContent).toContain('2 filas seleccionadas');

    api.resolverMasivo.mockResolvedValue({
      pedidas: 2,
      aplicadas: 0,
      fallidas: [
        { id: 'f-1', fila: 1, motivo: 'el correo no es válido' },
        { id: 'f-2', fila: 2, motivo: 'esa fila ya se aplicó' },
      ],
    });
    await clic('No traer ninguna de estas');

    const errorCaja = container.querySelector('[data-testid="error-de-lista"]')!;
    expect(errorCaja.textContent).toContain('el correo no es válido');
    expect(errorCaja.textContent).toContain('esa fila ya se aplicó');
    // Las fallidas siguen seleccionadas: reintentar no arranca de cero.
    expect(container.textContent).toContain('2 filas seleccionadas');
  });
});

describe('resumenDeFallidas', () => {
  it('agrupa por motivo con sus filas y anuncia que quedaron seleccionadas', () => {
    const texto = resumenDeFallidas({
      pedidas: 5,
      aplicadas: 2,
      fallidas: [
        { id: 'a', fila: 3, motivo: 'sin correo' },
        { id: 'b', fila: 7, motivo: 'sin correo' },
        { id: 'c', fila: null, motivo: 'ya aplicada' },
      ],
    });
    expect(texto).toContain('2 de 5');
    expect(texto).toContain('sin correo (filas 3, 7)');
    expect(texto).toContain('ya aplicada');
    expect(texto).toContain('seleccionadas');
  });

  it('en singular habla en singular', () => {
    const texto = resumenDeFallidas({
      pedidas: 3,
      aplicadas: 2,
      fallidas: [{ id: 'a', fila: 9, motivo: 'sin correo' }],
    });
    expect(texto).toContain('La que no se pudo quedó seleccionada');
    expect(texto).toContain('fila 9');
  });
});

describe('dos pestañas sobre la misma fila', () => {
  async function abrirLista() {
    api.lotesAbiertos.mockResolvedValue([LOTE]);
    await pintar();
    await clic('Retomar');
  }

  it('la corrección viaja con la versión que la fila tenía en pantalla', async () => {
    await abrirLista();

    const campo = container.querySelector<HTMLInputElement>('[data-testid="campo-correo"]')!;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    await act(async () => {
      setter.call(campo, 'nuevo@correo.co');
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clic('Guardar');

    expect(api.corregir).toHaveBeenCalledWith('f-1', {
      campos: { correo: 'nuevo@correo.co' },
      version: 3,
    });
  });

  it('🔴 si otra pestaña guardó primero: se dice, se relee, y lo tecleado NO se pierde', async () => {
    const { ApiError } = await import('@/lib/api/client');
    await abrirLista();
    api.corregir.mockRejectedValue(
      new ApiError(
        409,
        'Alguien más cambió esta fila mientras la editabas.',
        'FILA_DESACTUALIZADA',
      ),
    );
    const filasAntes = api.filas.mock.calls.length;

    const campo = container.querySelector<HTMLInputElement>('[data-testid="campo-correo"]')!;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    await act(async () => {
      setter.call(campo, 'nuevo@correo.co');
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clic('Guardar');

    // Lo dice, con el mensaje del back.
    expect(container.textContent).toContain('Alguien más cambió esta fila');
    // Releyó: lo que hay en pantalla vuelve a ser lo que hay en la base.
    expect(api.filas.mock.calls.length).toBeGreaterThan(filasAntes);
    // Y lo tecleado sigue ahí: no hay que volver a escribirlo.
    expect(
      container.querySelector<HTMLInputElement>('[data-testid="campo-correo"]')!.value,
    ).toBe('nuevo@correo.co');
  });
});
