/**
 * ReglasDeMora — la pantalla contra el API mockeado.
 *
 * Lo que fija:
 *  - lo creado va en la TABLA de la casa, en orden de aplicación, con una
 *    columna por dato de la regla, y con paginación cuando pasa de diez,
 *  - una plantilla NO es una regla: no cuenta en el conteo, no entra a la
 *    tabla y vive en su propia zona de sugerencias,
 *  - el estado vacío ofrece las dos plantillas y «Usar esta regla» manda el
 *    cuerpo EXACTO de la plantilla al back,
 *  - el switch de una fila manda `{ activa: false }` y la fila lo refleja,
 *  - un 400 del back al crear desde el editor se ve, tal cual, adentro del modal,
 *  - un 400 al usar una plantilla sale por toast con el mensaje del back,
 *  - las validaciones locales frenan el envío antes de la red.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { ReglaDeMora } from '@/lib/api/reglas-de-mora.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { listarMock, crearMock, actualizarMock, toastMock, permisos } = vi.hoisted(() => ({
  listarMock: vi.fn(),
  crearMock: vi.fn(),
  actualizarMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  permisos: { canAccess: vi.fn((_modulo: string, _accion: string) => true), isLoading: false },
}));

vi.mock('@/lib/api/reglas-de-mora.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/reglas-de-mora.service')>();
  return {
    ...actual,
    reglasDeMoraApi: {
      listar: (...args: unknown[]) => listarMock(...args),
      crear: (...args: unknown[]) => crearMock(...args),
      actualizar: (...args: unknown[]) => actualizarMock(...args),
      obtener: vi.fn(),
      desactivar: vi.fn(),
    },
  };
});

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

let motorDeCobrosV2: boolean | undefined = true;
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useInmobiliariaConfig: () => ({ config: motorDeCobrosV2 === undefined ? null : { agency: { motorDeCobrosV2 } } }),
}));

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => permisos,
}));

// FalloDeCarga arrastra next/link y el clasificador; acá sólo importa que se
// pinte. Lo usa <EstadoDeDatos> por dentro, así que el mock vale igual.
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo-de-carga">{error instanceof Error ? error.message : 'fallo'}</div>
  ),
}));

// El stub resuelve las claves contra el es.json REAL: los literales que se
// afirman más abajo siguen siendo los que ve una persona en español.
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { ReglasDeMora } from './ReglasDeMora';
import { PLANTILLAS } from './esquema';

function regla(sobre: Partial<ReglaDeMora> = {}): ReglaDeMora {
  return {
    id: 'r-1',
    agencyId: 'a-1',
    nombre: 'Interés de mora',
    concepto: 'INTERES_DE_MORA',
    disparador: 'DIAS_DE_MORA',
    disparadorDia: 1,
    formula: 'INTERES_DIARIO',
    valor: 0.0667,
    base: 'CANON',
    topeCop: null,
    activa: true,
    orden: 0,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...sobre,
  };
}

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;

async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<ReglasDeMora />);
  });
  await esperar();
}

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

function botonConTexto(texto: string, dentro: ParentNode = document): HTMLButtonElement {
  const boton = Array.from(dentro.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(texto),
  );
  if (!boton) throw new Error(`No hay botón con «${texto}»`);
  return boton;
}

/** Escribe como lo haría una persona: setter nativo + evento `input` (React escucha ese). */
function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
}

beforeEach(() => {
  listarMock.mockReset();
  crearMock.mockReset();
  actualizarMock.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  permisos.canAccess.mockReset();
  permisos.canAccess.mockReturnValue(true);
  permisos.isLoading = false;
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  contenedor?.remove();
  contenedor = null;
  document.body.innerHTML = '';
});

describe('ReglasDeMora — la tabla', () => {
  it('pinta las reglas en la tabla, en orden de aplicación y con una columna por dato', async () => {
    listarMock.mockResolvedValueOnce([
      regla({ id: 'r-1', orden: 0 }),
      regla({
        id: 'r-2',
        orden: 1,
        nombre: 'Gasto administrativo de cobranza',
        concepto: 'GASTO_ADMINISTRATIVO',
        disparador: 'DIA_DEL_MES',
        disparadorDia: 15,
        formula: 'PORCENTAJE_DE_LA_BASE',
        valor: 10,
        topeCop: 500000,
      }),
    ]);
    await montar();

    const tabla = $('[data-testid="reglas-lista"]');
    expect(tabla.tagName).toBe('TABLE');
    expect(Array.from(tabla.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Orden',
      'Regla',
      'Cuándo se dispara',
      'Cuánto cobra',
      'Tope',
      'Estado',
      'Acciones',
    ]);

    // Las filas son <tr> DE LA TABLA, no tarjetas sueltas en la página.
    const filas = Array.from(tabla.querySelectorAll<HTMLElement>('tbody [data-testid^="regla-r-"]'));
    expect(filas.map((f) => f.getAttribute('data-testid'))).toEqual(['regla-r-1', 'regla-r-2']);
    expect(filas.every((f) => f.tagName === 'TR')).toBe(true);

    const celdas = (fila: HTMLElement) =>
      Array.from(fila.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '');

    expect(celdas(filas[0]).slice(0, 5)).toEqual([
      '#0',
      'Interés de moraInterés de mora',
      'Desde el primer día de moraDías de mora',
      '0,0667 % diario sobre el canonInterés diario',
      'Sin tope',
    ]);
    expect(celdas(filas[1]).slice(0, 5)).toEqual([
      '#1',
      'Gasto administrativo de cobranzaGasto administrativo',
      'El día 15 de cada mesDía del mes',
      '10 % del canonPorcentaje de la base',
      'Hasta $ 500.000',
    ]);

    // La frase entera no se pierde: queda en el `title` de la fila.
    expect(filas[0].getAttribute('title')).toBe(
      'Se dispara desde el primer día de mora y cobra 0,0667 % diario sobre el canon, sin tope.',
    );
    expect(filas[1].getAttribute('title')).toBe(
      'Se dispara el día 15 de cada mes y cobra 10 % del canon, hasta $ 500.000.',
    );
    expect(document.querySelector('[data-testid="reglas-vacio"]')).toBeNull();
  });

  it('con pocas reglas el pie de paginación no aparece; con once, la tabla corta en diez', async () => {
    listarMock.mockResolvedValueOnce([regla({ id: 'r-1' }), regla({ id: 'r-2', orden: 1 })]);
    await montar();
    expect(document.querySelectorAll('[data-testid^="regla-r-"]')).toHaveLength(2);
    expect(document.body.textContent).not.toContain('por página');

    await act(async () => {
      root!.unmount();
    });
    root = null;
    contenedor?.remove();
    document.body.innerHTML = '';

    listarMock.mockResolvedValueOnce(
      Array.from({ length: 11 }, (_, i) => regla({ id: `r-${i}`, orden: i })),
    );
    await montar();
    expect(document.querySelectorAll('[data-testid^="regla-r-"]')).toHaveLength(10);
    expect(document.querySelector('[data-testid="regla-r-10"]')).toBeNull();
  });

  it('la fila abre el editor con la regla cargada', async () => {
    listarMock.mockResolvedValueOnce([regla({ nombre: 'Interés de mora' })]);
    await montar();

    await clic($('[data-testid="regla-r-1"]'));

    expect(document.querySelector('[data-testid="editor-de-regla"]')).not.toBeNull();
    expect(($('#regla-nombre') as HTMLInputElement).value).toBe('Interés de mora');
  });

  it('el switch de una fila manda { activa: false } y la fila queda apagada', async () => {
    listarMock.mockResolvedValueOnce([regla()]);
    actualizarMock.mockResolvedValueOnce(regla({ activa: false }));
    await montar();

    await clic($('[data-testid="activa-r-1"]'));

    expect(actualizarMock).toHaveBeenCalledTimes(1);
    expect(actualizarMock).toHaveBeenCalledWith('r-1', { activa: false });
    expect($('[data-testid="regla-r-1"]').textContent).toContain('Apagada');
  });

  it('si el back rechaza el switch, el mensaje sale por toast y la fila no cambia', async () => {
    listarMock.mockResolvedValueOnce([regla()]);
    actualizarMock.mockRejectedValueOnce(new ApiError(403, 'No tenés permiso para editar reglas.'));
    await montar();

    await clic($('[data-testid="activa-r-1"]'));

    expect(toastMock.error).toHaveBeenCalledWith('No tenés permiso para editar reglas.');
    expect($('[data-testid="regla-r-1"]').textContent).not.toContain('Apagada');
  });

  it('sin permiso de edición, el switch y «Editar» quedan deshabilitados', async () => {
    permisos.canAccess.mockImplementation((_m: string, accion: string) => accion === 'view');
    listarMock.mockResolvedValueOnce([regla()]);
    await montar();

    expect(($('[data-testid="activa-r-1"]') as HTMLButtonElement).disabled).toBe(true);
    expect(botonConTexto('Editar').disabled).toBe(true);
    expect(document.querySelector('button[aria-label]')).not.toBeNull();
    expect(Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.includes('Nueva regla'))).toBe(false);
  });

  it('un fallo al cargar se muestra, no se traga', async () => {
    listarMock.mockRejectedValueOnce(new Error('Se cayó la red.'));
    await montar();
    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('Se cayó la red.');
  });
});

describe('ReglasDeMora — el estado vacío y las plantillas', () => {
  it('ofrece las dos plantillas y «Usar esta regla» manda el cuerpo exacto de la plantilla', async () => {
    listarMock.mockResolvedValueOnce([]);
    const interes = PLANTILLAS.find((p) => p.id === 'interes-diario')!;
    crearMock.mockResolvedValueOnce(regla({ id: 'r-nueva', nombre: interes.valores.nombre }));
    await montar();

    expect($('[data-testid="reglas-vacio"]').textContent).toContain('Todavía no hay reglas de mora');
    expect($('[data-testid="plantilla-interes-diario"]').textContent).toContain(
      'Interés diario después del plazo',
    );
    expect($('[data-testid="plantilla-gasto-administrativo"]').textContent).toContain(
      '10 % de gasto administrativo desde el 15',
    );

    // 🔴 El bug que originó el rediseño: las dos tarjetas se leían como reglas
    // ya creadas. No hay tabla, no hay filas, y la zona se anuncia como lo que
    // es —una sugerencia— con su propio encabezado y su chip en cada tarjeta.
    expect(document.querySelector('[data-testid="reglas-lista"]')).toBeNull();
    expect(document.querySelector('[data-testid^="regla-"]')).toBeNull();
    const zona = $('[data-testid="reglas-sugerencias"]');
    expect(zona.textContent).toContain('Empezá con una de estas');
    expect(zona.textContent).toContain('Todavía no existen');
    // Las dos tarjetas cuelgan de la zona de sugerencias, no de la página.
    expect(zona.querySelectorAll('[data-testid^="plantilla-"]')).toHaveLength(2);
    for (const id of ['interes-diario', 'gasto-administrativo']) {
      expect($(`[data-testid="plantilla-${id}"]`).textContent).toContain('Sugerencia');
    }

    await clic(botonConTexto('Usar esta regla', $('[data-testid="plantilla-interes-diario"]')));

    expect(crearMock).toHaveBeenCalledTimes(1);
    expect(crearMock).toHaveBeenCalledWith({
      nombre: 'Interés de mora',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 1,
      formula: 'INTERES_DIARIO',
      valor: 0.0667,
      base: 'CANON',
      orden: 0,
    });
    // La lista reemplaza al estado vacío con la regla recién creada.
    expect(document.querySelector('[data-testid="reglas-vacio"]')).toBeNull();
    expect($('[data-testid="regla-r-nueva"]').textContent).toContain('Interés de mora');
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('si el back rechaza la plantilla, el mensaje del back sale por toast y el vacío sigue', async () => {
    listarMock.mockResolvedValueOnce([]);
    crearMock.mockRejectedValueOnce(
      new ApiError(400, 'Un porcentaje mayor que 100 cobraría más que la deuda entera.'),
    );
    await montar();

    await clic(botonConTexto('Usar esta regla', $('[data-testid="plantilla-gasto-administrativo"]')));

    expect(toastMock.error).toHaveBeenCalledWith(
      'Un porcentaje mayor que 100 cobraría más que la deuda entera.',
    );
    expect(document.querySelector('[data-testid="reglas-vacio"]')).not.toBeNull();
  });

  it('sin permiso de creación no se ofrecen plantillas ni el botón de crear', async () => {
    permisos.canAccess.mockImplementation((_m: string, accion: string) => accion === 'view');
    listarMock.mockResolvedValueOnce([]);
    await montar();
    expect(document.querySelector('[data-testid="plantilla-interes-diario"]')).toBeNull();
    expect(Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.includes('Crear una regla'))).toBe(false);
  });
});

describe('ReglasDeMora — el editor', () => {
  async function abrirEditorNuevo() {
    await clic(botonConTexto('Nueva regla'));
    return $('[data-testid="editor-de-regla"]');
  }

  async function enviarFormulario() {
    const form = $('#form-regla-de-mora') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await esperar();
    await esperar();
  }

  it('crear desde el editor manda los diez campos, con el valor como número', async () => {
    listarMock.mockResolvedValueOnce([regla()]);
    crearMock.mockResolvedValueOnce(regla({ id: 'r-2', nombre: 'Interés extra', orden: 1 }));
    await montar();
    await abrirEditorNuevo();

    escribir($('#regla-nombre') as HTMLInputElement, 'Interés extra');
    escribir($('#regla-valor') as HTMLInputElement, '0.05');
    escribir($('#regla-orden') as HTMLInputElement, '1');
    await enviarFormulario();

    expect(crearMock).toHaveBeenCalledTimes(1);
    expect(crearMock).toHaveBeenCalledWith({
      nombre: 'Interés extra',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 1,
      formula: 'INTERES_DIARIO',
      valor: 0.05,
      base: 'CANON',
      topeCop: null,
      orden: 1,
      activa: true,
    });
    expect(typeof crearMock.mock.calls[0][0].valor).toBe('number');
    // El modal se cierra y la regla nueva aparece en la lista.
    expect(document.querySelector('[data-testid="editor-de-regla"]')).toBeNull();
    expect($('[data-testid="regla-r-2"]').textContent).toContain('Interés extra');
  });

  it('un 400 del back se muestra tal cual adentro del modal, y el modal sigue abierto', async () => {
    listarMock.mockResolvedValueOnce([regla()]);
    const mensaje =
      'Una tasa DIARIA de 0.5% son 15.0% al mes. Si querés esa cifra mensual, la diaria es ese número dividido 30.';
    crearMock.mockRejectedValueOnce(new ApiError(400, mensaje));
    await montar();
    await abrirEditorNuevo();

    escribir($('#regla-nombre') as HTMLInputElement, 'Interés alto');
    escribir($('#regla-valor') as HTMLInputElement, '0.5');
    await enviarFormulario();

    expect(crearMock).toHaveBeenCalledTimes(1);
    expect($('[data-testid="error-del-back"]').textContent).toContain(mensaje);
    expect(document.querySelector('[data-testid="editor-de-regla"]')).not.toBeNull();
  });

  it('las validaciones locales frenan el envío: sin nombre y sin valor no se llama al back', async () => {
    listarMock.mockResolvedValueOnce([regla()]);
    await montar();
    await abrirEditorNuevo();

    await enviarFormulario();

    expect(crearMock).not.toHaveBeenCalled();
    expect($('[data-testid="error-regla-nombre"]').textContent).toContain('El nombre necesita al menos 3 letras.');
    expect($('[data-testid="error-regla-valor"]').textContent).toContain('Poné el valor.');
  });

  it('una tasa diaria mayor que 1 % se frena localmente con el mensaje del back', async () => {
    listarMock.mockResolvedValueOnce([regla()]);
    await montar();
    await abrirEditorNuevo();

    escribir($('#regla-nombre') as HTMLInputElement, 'Interés alto');
    escribir($('#regla-valor') as HTMLInputElement, '2');
    await enviarFormulario();

    expect(crearMock).not.toHaveBeenCalled();
    expect($('[data-testid="error-regla-valor"]').textContent).toContain('Una tasa DIARIA de 2% son 60.0% al mes.');
  });

  it('editar abre el modal con la regla cargada y guarda por PUT', async () => {
    listarMock.mockResolvedValueOnce([regla({ topeCop: 500000 })]);
    actualizarMock.mockResolvedValueOnce(regla({ nombre: 'Interés de mora (nuevo)', topeCop: 500000 }));
    await montar();

    await clic(botonConTexto('Editar'));
    const nombre = $('#regla-nombre') as HTMLInputElement;
    expect(nombre.value).toBe('Interés de mora');
    expect(($('#regla-valor') as HTMLInputElement).value).toBe('0.0667');
    expect($('[data-testid="vista-previa"]').textContent).toContain(
      'Se dispara desde el primer día de mora y cobra 0,0667 % diario sobre el canon, hasta $ 500.000.',
    );

    escribir(nombre, 'Interés de mora (nuevo)');
    await enviarFormulario();

    expect(actualizarMock).toHaveBeenCalledTimes(1);
    expect(actualizarMock.mock.calls[0][0]).toBe('r-1');
    expect(actualizarMock.mock.calls[0][1]).toMatchObject({
      nombre: 'Interés de mora (nuevo)',
      valor: 0.0667,
      topeCop: 500000,
      activa: true,
    });
    expect($('[data-testid="regla-r-1"]').textContent).toContain('Interés de mora (nuevo)');
  });
});

describe('ReglasDeMora — sugerencias con reglas ya creadas y el aviso del motor', () => {
  it('con una regla creada ofrece sólo la plantilla que falta, comparando por lo que hace la regla', async () => {
    listarMock.mockResolvedValueOnce([
      regla({
        id: 'r-interes',
        nombre: 'Mi interés renombrado',
        concepto: 'INTERES_DE_MORA',
        disparador: 'DIAS_DE_MORA',
        formula: 'INTERES_DIARIO',
      }),
    ]);
    await montar();

    expect(document.querySelector('[data-testid="reglas-vacio"]')).toBeNull();
    const sugerencias = $('[data-testid="reglas-sugerencias"]');
    expect(document.querySelector('[data-testid="plantilla-interes-diario"]')).toBeNull();
    expect(sugerencias.querySelector('[data-testid="plantilla-gasto-administrativo"]')).not.toBeNull();

    // La plantilla que falta NO se cuenta como regla ni entra a la tabla: hay
    // una regla creada, y el conteo dice una.
    expect(document.body.textContent).toContain('1 regla, en el orden en que se aplica');
    expect($('[data-testid="reglas-lista"]').querySelectorAll('tbody tr')).toHaveLength(1);
    expect(sugerencias.querySelector('[data-testid^="regla-"]')).toBeNull();
    expect(sugerencias.textContent).toContain('Otras que podrías agregar');
    expect(sugerencias.textContent).toContain('No están creadas');
  });

  it('con las dos reglas creadas no queda ninguna sugerencia', async () => {
    listarMock.mockResolvedValueOnce([
      regla({ id: 'r-1', concepto: 'INTERES_DE_MORA', disparador: 'DIAS_DE_MORA', formula: 'INTERES_DIARIO' }),
      regla({ id: 'r-2', concepto: 'GASTO_ADMINISTRATIVO', disparador: 'DIA_DEL_MES', formula: 'PORCENTAJE_DE_LA_BASE', orden: 1 }),
    ]);
    await montar();
    expect(document.querySelector('[data-testid="reglas-sugerencias"]')).toBeNull();
  });

  it('con el motor prendido el aviso lo dice', async () => {
    listarMock.mockResolvedValueOnce([]);
    motorDeCobrosV2 = true;
    await montar();
    expect($('[data-testid="aviso-motor"]').textContent).toContain('prendido');
  });

  it('con el motor apagado el aviso lo dice y enlaza a configuración', async () => {
    listarMock.mockResolvedValueOnce([]);
    motorDeCobrosV2 = false;
    await montar();
    const aviso = $('[data-testid="aviso-motor"]');
    expect(aviso.textContent).toContain('apagado');
    expect(aviso.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion');
    motorDeCobrosV2 = true;
  });

  it('sin el dato del motor el aviso queda en neutro: nunca afirma que está prendido', async () => {
    listarMock.mockResolvedValueOnce([]);
    motorDeCobrosV2 = undefined;
    await montar();
    expect($('[data-testid="aviso-motor"]').textContent).toContain('Se aplican sólo con el motor');
    motorDeCobrosV2 = true;
  });
});
