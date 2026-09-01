/**
 * FilaDeTercero.test.tsx — la tarjeta donde se arregla una fila.
 *
 * Tres cosas que se congelan acá:
 *
 * 1. **Un duplicado se pregunta.** Las tres salidas existen y ninguna es el
 *    default. Fusionar solas dos filas con el mismo documento crea una ficha
 *    que mezcla a dos dueños y le gira la plata al equivocado.
 * 2. **Por defecto sólo se ofrecen las celdas que fallan.** Dieciséis campos
 *    en cada una de 200 tarjetas es un formulario infinito, no una lista de
 *    trabajo.
 * 3. **Los sí/no vuelven al vocabulario de la plantilla.** El back normaliza a
 *    booleano; un `<input value={false}>` pinta «false».
 *
 * Y de yapa: cualquier `console.error` de React —anidamiento de HTML
 * inválido, prop desconocida, key faltante— falla el test. Un `<div>` dentro
 * de un `<p>` no rompe `tsc` ni el linter, pero el navegador cierra el párrafo
 * antes de tiempo y la fila se parte en dos.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { FilaDeTercero, valorEditable } from './FilaDeTercero';
import type {
  ColumnaDePlantilla,
  FilaDeStaging,
} from '@/lib/api/migracion-terceros.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLUMNAS: ColumnaDePlantilla[] = [
  {
    campo: 'tipoDocumento',
    titulo: 'Tipo de documento',
    obligatoria: true,
    ejemplo: 'CC',
    opciones: ['CC', 'CE', 'NIT'],
    alias: [],
    ayuda: 'No se asume: NIT define el perfil tributario.',
  },
  { campo: 'documento', titulo: 'Número de documento', obligatoria: true, ejemplo: '102030', alias: [] },
  { campo: 'nombre', titulo: 'Nombre completo', obligatoria: true, ejemplo: 'Jorge', alias: [] },
  {
    campo: 'responsableIva',
    titulo: 'Responsable de IVA',
    obligatoria: false,
    ejemplo: 'No',
    opciones: ['Sí', 'No'],
    alias: [],
  },
];

function fila(over: Partial<FilaDeStaging> = {}): FilaDeStaging {
  return {
    id: 'f-1',
    lote: 'lote-1',
    tipo: 'PROPIETARIO',
    estado: 'REQUIERE_ATENCION',
    datos: { _fila: 12, nombre: 'Jorge Restrepo', documento: '1020304050' },
    errores: [],
    propietarioId: null,
    userId: null,
    aplicadoAt: null,
    createdAt: '2026-08-31T10:00:00.000Z',
    updatedAt: '2026-08-31T10:00:00.000Z',
    ...over,
  };
}

let container: HTMLDivElement;
let root: Root | null = null;
let errores: unknown[][] = [];

async function pintar(props: Partial<Parameters<typeof FilaDeTercero>[0]> = {}) {
  const cb = {
    onCorregir: vi.fn(),
    onVincular: vi.fn(),
    onDescartar: vi.fn(),
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <FilaDeTercero
        fila={fila()}
        columnas={COLUMNAS}
        guardando={false}
        {...cb}
        {...props}
      />,
    );
  });
  return cb;
}

/** Los botones visibles, por su texto. */
function boton(texto: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(texto),
  ) as HTMLButtonElement | undefined;
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  errores = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    errores.push(args);
  });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  // React avisa el HTML inválido por acá y por ningún otro lado.
  expect(errores, `React se quejó: ${JSON.stringify(errores[0] ?? '')}`).toEqual([]);
  vi.restoreAllMocks();
});

describe('FilaDeTercero', () => {
  it('muestra el número de fila del archivo, sin sumarle nada', async () => {
    // El back ya lo guarda 1-based en `_fila`. Sumarle 2 —como hace la
    // migración de contratos, cuyo `fila` es 0-based— señalaría la línea
    // equivocada del Excel.
    await pintar();
    expect(container.textContent).toContain('Fila 12');
  });

  it('por defecto sólo ofrece las celdas que fallan', async () => {
    await pintar({
      fila: fila({
        errores: [{ codigo: 'FALTA_TIPO_DOCUMENTO', campo: 'tipoDocumento', mensaje: 'Falta el tipo.' }],
      }),
    });

    expect(container.querySelector('[data-testid="campo-tipoDocumento"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="campo-nombre"]')).toBeNull();
    expect(container.textContent).toContain('Falta el tipo.');
  });

  it('«Ver todos los campos» abre el resto sin perder lo demás', async () => {
    // Existe porque el error de una celda a veces se arregla tocando OTRA:
    // cambiar el tipo de documento a NIT cambia la regla del número.
    await pintar({
      fila: fila({
        errores: [{ codigo: 'DOCUMENTO_INVALIDO', campo: 'documento', mensaje: 'No es válido.' }],
      }),
    });

    expect(container.querySelector('[data-testid="campo-nombre"]')).toBeNull();
    await click(boton('Ver todos los campos')!);
    expect(container.querySelector('[data-testid="campo-nombre"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="campo-documento"]')).not.toBeNull();
  });

  it('no manda nada hasta que se toca algo, y manda SÓLO lo tocado', async () => {
    /*
     * El back mezcla `{...loQueHabía, ...campos}`. Mandar las dieciséis claves
     * en cada guardado reescribiría con el valor de pantalla campos que nadie
     * tocó — y, peor, los pisaría con `''` si estaban vacíos.
     */
    const cb = await pintar({
      fila: fila({
        // Sin documento, que es lo que significa `FALTA_DOCUMENTO`. Con la
        // celda ya llena, «tipear» el mismo valor no dispara el `onChange`:
        // el rastreador de React compara contra el último valor y descarta el
        // evento. La fixture tiene que ser la de verdad.
        datos: { _fila: 12, nombre: 'Jorge Restrepo' },
        errores: [{ codigo: 'FALTA_DOCUMENTO', campo: 'documento', mensaje: 'Falta.' }],
      }),
    });

    expect(boton('Guardar')?.disabled).toBe(true);

    const input = container.querySelector<HTMLInputElement>('[data-testid="campo-documento"]')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, '1020304050');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(boton('Guardar')?.disabled).toBe(false);
    await click(boton('Guardar')!);

    expect(cb.onCorregir).toHaveBeenCalledTimes(1);
    expect(cb.onCorregir).toHaveBeenCalledWith({ documento: '1020304050' });
  });

  describe('cuando la fila choca con una ficha que ya existe', () => {
    const duplicada = fila({
      errores: [
        {
          codigo: 'YA_EXISTE_EN_LA_AGENCIA',
          campo: 'documento',
          mensaje: 'Ya hay un propietario con este documento.',
          referencia: { id: 'p-9', nombre: 'Jorge Restrepo Vélez' },
        },
      ],
    });

    it('nombra a la ficha con la que choca', async () => {
      // Sin el nombre, «es la misma persona» es una apuesta a ciegas.
      await pintar({ fila: duplicada });
      expect(container.textContent).toContain('Jorge Restrepo Vélez');
    });

    it('ofrece las tres salidas y ninguna se dispara sola', async () => {
      const cb = await pintar({ fila: duplicada });

      expect(boton('Es la misma persona')).toBeDefined();
      expect(boton('Es otra persona')).toBeDefined();
      expect(boton('No traer esta fila')).toBeDefined();

      // Nada se decidió por su cuenta al pintar.
      expect(cb.onVincular).not.toHaveBeenCalled();
      expect(cb.onDescartar).not.toHaveBeenCalled();
      expect(cb.onCorregir).not.toHaveBeenCalled();
    });

    it('«es la misma persona» vincula; «es otra» abre los campos, no vincula', async () => {
      const cb = await pintar({ fila: duplicada });

      await click(boton('Es otra persona')!);
      // Abre el formulario para corregir el documento — NO toma la decisión.
      expect(cb.onVincular).not.toHaveBeenCalled();
      expect(container.querySelector('[data-testid="campo-documento"]')).not.toBeNull();

      await click(boton('Es la misma persona')!);
      expect(cb.onVincular).toHaveBeenCalledTimes(1);
    });

    it('avisa que la ficha existente NO se sobrescribe', async () => {
      // Es la pregunta que se hace cualquiera antes de apretar: el back hace
      // `upsert` con `update: {}`, así que la ficha no se toca. Decirlo es lo
      // que hace que alguien se anime a usar el botón.
      await pintar({ fila: duplicada });
      expect(container.textContent).toContain('no le pisa ni un dato');
    });
  });

  it('descartar no dice «borrar»: la fila queda con su rastro', async () => {
    const cb = await pintar();
    await click(boton('No traer esta fila')!);
    expect(cb.onDescartar).toHaveBeenCalledTimes(1);
  });

  it('mientras guarda, no se puede disparar la acción dos veces', async () => {
    await pintar({ guardando: true });
    expect(boton('No traer esta fila')?.disabled).toBe(true);
  });
});

describe('valorEditable', () => {
  it('traduce el booleano del back al vocabulario de la plantilla', () => {
    // El back normaliza «Sí»/«No» a booleano. Un `<input value={false}>`
    // pinta «false», que no es una opción de la plantilla y que al guardar
    // volvería como texto basura.
    expect(valorEditable(true)).toBe('Sí');
    expect(valorEditable(false)).toBe('No');
  });

  it('vacío es vacío: `null` no es «no»', () => {
    // `null` significa «no lo sabemos» y `false` significa «afirmamos que no».
    // Pintar `null` como «No» convertiría un vacío en una afirmación que nadie
    // hizo — y de ahí salen las retenciones que no se practicaron.
    expect(valorEditable(null)).toBe('');
    expect(valorEditable(undefined)).toBe('');
  });

  it('un número del Excel se muestra como texto', () => {
    expect(valorEditable(1020304050)).toBe('1020304050');
  });
});
