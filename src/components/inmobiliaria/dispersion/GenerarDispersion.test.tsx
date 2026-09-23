/**
 * @vitest-environment happy-dom
 *
 * Generar la dispersión del mes, en UNA pantalla.
 *
 * Este archivo reemplaza a los tres de `DispersionWizard` (el general con D7, el
 * de tardías y el de la base del canon). Las pruebas que importaban **no se
 * borraron, se mudaron**: lo que desapareció son los cuatro pasos intermedios
 * que no pedían ninguna decisión, no las lecciones que se pagaron caras.
 *
 * Lo que cuida, en orden de lo que más cuesta si se rompe:
 *
 *  1. 🔴 no se confirma sobre un número que no vino del back;
 *  2. 🔴 destildar un inmueble llega HASTA el `generate` (antes ni existía);
 *  3. el motivo del back cuando no liquida, con el inmueble y su enlace (D7);
 *  4. las cuotas que llegaron tarde viajan aunque su dueño ya tenga liquidación;
 *  5. el canon dice con qué base salió: `CAUSADO` no es plata recaudada;
 *  6. una cuenta bancaria que falta se dice, no se inventa;
 *  7. la pregunta del flujo —a quién— está al ABRIR, sin apretar «Siguiente».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_t, tag: string) =>
        ({
          children,
          whileHover,
          whileTap,
          initial,
          animate,
          exit,
          transition,
          layout,
          ...rest
        }: Record<string, unknown> & { children?: React.ReactNode }) => {
          void whileHover; void whileTap; void initial; void animate; void exit;
          void transition; void layout;
          return React.createElement(tag, rest, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  toast: Object.assign(vi.fn(), {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    info: vi.fn(),
    loading: vi.fn(),
  }),
}));

const preview = vi.fn();
const previewDeLaSeleccion = vi.fn();
const generate = vi.fn();
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: {
    preview: (m: string) => preview(m),
    previewDeLaSeleccion: (m: string, s: unknown) => previewDeLaSeleccion(m, s),
    generate: (m: string, ids?: string[], props?: string[]) => generate(m, ids, props),
  },
}));

import { GenerarDispersion } from './GenerarDispersion';

const INMUEBLE_ROTO = '7c1d2b8e-0000-4000-8000-000000000001';

/** Un renglón de la previa, con lo que la pantalla lee. */
function renglon({
  propertyId,
  titulo,
  canon,
  comision,
}: {
  propertyId: string | null;
  titulo: string;
  canon: number;
  comision: number;
}) {
  return {
    cobroId: null,
    cuotaId: `cuota-${propertyId ?? titulo}`,
    propertyId,
    propertyTitle: titulo,
    rentCollected: canon,
    commissionPercent: 10,
    commissionAmount: comision,
    netAmount: canon - comision,
    conceptosAFavor: 0,
    conceptosACargo: 0,
    deTerceros: 0,
  };
}

function propietario({
  id,
  nombre,
  inmuebles,
  cuenta = '123456',
  banco = 'Bancolombia',
  yaExiste = false,
}: {
  id: string;
  nombre: string;
  inmuebles: { propertyId: string | null; titulo: string; canon: number; comision: number }[];
  cuenta?: string | null;
  banco?: string | null;
  yaExiste?: boolean;
}) {
  const items = inmuebles.map(renglon);
  return {
    propietarioId: id,
    propietarioName: nombre,
    propietarioBankName: banco,
    propietarioBankAccount: cuenta,
    yaExiste,
    totalCollected: items.reduce((s, i) => s + i.rentCollected, 0),
    totalCommission: items.reduce((s, i) => s + i.commissionAmount, 0),
    totalConceptosAFavor: 0,
    totalConceptosACargo: 0,
    totalDeTerceros: 0,
    netToPropietario: items.reduce((s, i) => s + i.netAmount, 0),
    items,
  };
}

const JORGE = propietario({
  id: 'p-jorge',
  nombre: 'Jorge Restrepo',
  inmuebles: [
    { propertyId: 'inm-laureles', titulo: 'Laureles 101', canon: 1_000_000, comision: 100_000 },
    { propertyId: 'inm-poblado', titulo: 'Poblado 202', canon: 3_000_000, comision: 300_000 },
  ],
});

const MARCELA = propietario({
  id: 'p-marcela',
  nombre: 'Marcela Ochoa',
  inmuebles: [
    { propertyId: 'inm-envigado', titulo: 'Envigado 303', canon: 2_000_000, comision: 200_000 },
  ],
});

function previaCon(propietarios: ReturnType<typeof propietario>[], extra = {}) {
  const porGenerar = propietarios.filter((p) => !p.yaExiste);
  return {
    month: '2026-08',
    totalPropietarios: propietarios.length,
    yaGenerados: propietarios.length - porGenerar.length,
    totalAGirar: porGenerar.reduce((s, p) => s + p.netToPropietario, 0),
    totalComisiones: porGenerar.reduce((s, p) => s + p.totalCommission, 0),
    propietarios,
    ...extra,
  };
}

let host: HTMLDivElement;
let root: Root;
const onComplete = vi.fn();

async function asentar() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<GenerarDispersion initialMonth="2026-08" onComplete={onComplete} />);
  });
  await asentar();
}

const q = (testid: string) => host.querySelector(`[data-testid="${testid}"]`);
const todos = (testid: string) =>
  Array.from(host.querySelectorAll(`[data-testid="${testid}"]`));

function casilla(aria: string): HTMLButtonElement {
  const c = host.querySelector(`[role="checkbox"][aria-label="${aria}"]`);
  if (!c) throw new Error(`No hay casilla «${aria}»`);
  return c as HTMLButtonElement;
}

async function clic(el: Element) {
  await act(async () => {
    (el as HTMLElement).click();
  });
  await asentar();
}

/**
 * Escribe en un input como lo haría una persona. Asignar `.value` a mano no
 * alcanza: React compara contra su propio rastro del valor y descarta el evento,
 * así que la prueba pasaría sin que el filtro se haya ejecutado nunca.
 */
async function escribir(testId: string, texto: string) {
  const input = q(testId) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await asentar();
}

/** Deja pasar la espera del recálculo y su respuesta. */
async function esperarElRecalculo() {
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  await asentar();
}

beforeEach(() => {
  preview.mockReset();
  previewDeLaSeleccion.mockReset();
  generate.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  onComplete.mockReset();
  generate.mockResolvedValue({
    month: '2026-08',
    totalPropietarios: 2,
    created: 2,
    skipped: 0,
    noElegidos: 0,
  });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
  vi.useRealTimers();
});

describe('la pregunta del flujo está al abrir', () => {
  it('🔴 la lista de propietarios se ve sin apretar ni un «Siguiente»', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    await montar();

    expect(q('a-quien')).not.toBeNull();
    expect(todos('fila-propietario')).toHaveLength(2);
    expect(host.textContent).toContain('Jorge Restrepo');
    expect(host.textContent).toContain('Marcela Ochoa');
    // Y confirmar también: la decisión y el botón viven en la misma pantalla.
    expect(q('confirmar')).not.toBeNull();
    expect(host.textContent).not.toContain('Siguiente');
  });

  it('vienen todos marcados', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    await montar();

    expect(casilla('Girarle a Jorge Restrepo').getAttribute('data-state')).toBe('checked');
    expect(casilla('Girarle a Marcela Ochoa').getAttribute('data-state')).toBe('checked');
    expect(q('cuantos-seleccionados')?.textContent).toContain('2 de 2');
  });

  it('con un solo inmueble no se pregunta nada; con varios sí', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    await montar();

    const filas = todos('fila-propietario');
    const deJorge = filas.find((f) => f.getAttribute('data-propietario') === 'p-jorge')!;
    const deMarcela = filas.find((f) => f.getAttribute('data-propietario') === 'p-marcela')!;

    expect(deJorge.querySelector('[data-testid="abrir-inmuebles"]')).not.toBeNull();
    expect(deMarcela.querySelector('[data-testid="abrir-inmuebles"]')).toBeNull();
    // El de Marcela igual dice cuál es su inmueble, sin pedir un clic.
    expect(deMarcela.textContent).toContain('Envigado 303');
  });

  it('el total de cada propietario y su comisión se ven en su fila', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    await montar();

    const deJorge = todos('fila-propietario').find(
      (f) => f.getAttribute('data-propietario') === 'p-jorge',
    )!;
    // 4.000.000 de canon − 400.000 de comisión.
    expect(deJorge.querySelector('[data-testid="neto-del-propietario"]')?.textContent)
      .toContain('3.600.000');
    expect(deJorge.textContent).toContain('400.000');
  });

  it('una cuenta bancaria que falta se DICE, no se inventa', async () => {
    preview.mockResolvedValue(
      previaCon([propietario({
        id: 'p-sin-cuenta',
        nombre: 'Ana Gómez',
        cuenta: null,
        banco: null,
        inmuebles: [{ propertyId: 'inm-1', titulo: 'Casa 1', canon: 1_000_000, comision: 100_000 }],
      })]),
    );
    await montar();

    expect(host.textContent).toContain('Sin cuenta registrada');
    expect(host.textContent).not.toContain('****0000');
  });
});

describe('los inmuebles de un propietario', () => {
  it('se abren en la misma pantalla, con el monto de cada uno', async () => {
    preview.mockResolvedValue(previaCon([JORGE]));
    await montar();
    await clic(q('abrir-inmuebles')!);

    const inmuebles = todos('fila-inmueble');
    expect(inmuebles).toHaveLength(2);
    expect(inmuebles[0].textContent).toContain('Laureles 101');
    expect(inmuebles[0].querySelector('[data-testid="neto-del-inmueble"]')?.textContent)
      .toContain('900.000');
    expect(inmuebles[1].querySelector('[data-testid="neto-del-inmueble"]')?.textContent)
      .toContain('2.700.000');
  });

  it('vienen todos marcados', async () => {
    preview.mockResolvedValue(previaCon([JORGE]));
    await montar();
    await clic(q('abrir-inmuebles')!);

    expect(casilla('Girar Laureles 101').getAttribute('data-state')).toBe('checked');
    expect(casilla('Girar Poblado 202').getAttribute('data-state')).toBe('checked');
  });
});

describe('🔴 la plata la cuenta el back', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  it('destildar un inmueble apaga el botón hasta que llegue la cuenta del back', async () => {
    preview.mockResolvedValue(previaCon([JORGE]));
    previewDeLaSeleccion.mockResolvedValue(
      previaCon([
        propietario({
          id: 'p-jorge',
          nombre: 'Jorge Restrepo',
          inmuebles: [
            { propertyId: 'inm-laureles', titulo: 'Laureles 101', canon: 1_000_000, comision: 100_000 },
          ],
        }),
      ]),
    );
    await montar();
    await clic(q('abrir-inmuebles')!);

    expect((q('confirmar') as HTMLButtonElement).disabled).toBe(false);

    await clic(casilla('Girar Poblado 202'));

    // Todavía no llegó la cuenta: se dice y no se puede confirmar.
    expect(q('recalculando')).not.toBeNull();
    expect((q('confirmar') as HTMLButtonElement).disabled).toBe(true);

    await esperarElRecalculo();

    expect(q('recalculando')).toBeNull();
    expect((q('confirmar') as HTMLButtonElement).disabled).toBe(false);
    // Y el total es el que mandó el back para ESA selección.
    expect(q('total-a-girar')?.textContent).toContain('900.000');
    expect(q('total-comisiones')?.textContent).toContain('100.000');
  });

  it('le pide la cuenta al back con a quién y a qué inmuebles', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    previewDeLaSeleccion.mockResolvedValue(previaCon([MARCELA]));
    await montar();
    await clic(casilla('Girarle a Jorge Restrepo'));
    await esperarElRecalculo();

    expect(previewDeLaSeleccion).toHaveBeenCalledWith('2026-08', {
      propietarioIds: ['p-marcela'],
    });
  });

  it('si la cuenta del back falla, no se confirma — y no se muestra un número propio como suyo', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    previewDeLaSeleccion.mockRejectedValue(new Error('se cayó'));
    await montar();
    await clic(casilla('Girarle a Jorge Restrepo'));
    await esperarElRecalculo();

    expect(q('recalculando')).not.toBeNull();
    expect((q('confirmar') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('🔴 destildar llega hasta el generate', () => {
  it('destildar un propietario lo deja afuera de la llamada', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    previewDeLaSeleccion.mockResolvedValue(previaCon([MARCELA]));
    await montar();
    await clic(casilla('Girarle a Jorge Restrepo'));
    await esperarElRecalculo();
    await clic(q('confirmar')!);

    expect(generate).toHaveBeenCalledWith('2026-08', ['p-marcela'], undefined);
  });

  it('destildar un inmueble manda la lista de inmuebles', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    preview.mockResolvedValue(previaCon([JORGE]));
    previewDeLaSeleccion.mockResolvedValue(previaCon([JORGE]));
    await montar();
    await clic(q('abrir-inmuebles')!);
    await clic(casilla('Girar Poblado 202'));
    await esperarElRecalculo();
    await clic(q('confirmar')!);

    expect(generate).toHaveBeenCalledWith('2026-08', ['p-jorge'], ['inm-laureles']);
  });

  it('sin destildar nada no se manda ninguna lista: el back liquida el mes entero', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    await montar();
    await clic(q('confirmar')!);

    expect(generate).toHaveBeenCalledWith('2026-08', undefined, undefined);
    expect(previewDeLaSeleccion).not.toHaveBeenCalled();
  });

  it('un propietario al que se le destildaron TODOS sus inmuebles no se cuenta', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    previewDeLaSeleccion.mockResolvedValue(previaCon([MARCELA]));
    await montar();
    await clic(q('abrir-inmuebles')!);
    await clic(casilla('Girar Laureles 101'));
    await clic(casilla('Girar Poblado 202'));
    await esperarElRecalculo();

    expect(q('cuantos-seleccionados')?.textContent).toContain('1 de 2');
    expect(host.textContent).toContain('Generar 1 dispersión');
  });

  it('los que quedaron fuera se nombran al terminar', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    previewDeLaSeleccion.mockResolvedValue(previaCon([MARCELA]));
    generate.mockResolvedValue({
      month: '2026-08',
      totalPropietarios: 2,
      created: 1,
      skipped: 0,
      noElegidos: 1,
    });
    await montar();
    await clic(casilla('Girarle a Jorge Restrepo'));
    await esperarElRecalculo();
    await clic(q('confirmar')!);

    expect(toastSuccess.mock.calls[0][1].description).toContain(
      '1 quedaron fuera de la selección',
    );
    expect(onComplete).toHaveBeenCalledWith('2026-08');
  });
});

describe('buscar y paginar en vez de un scroll infinito', () => {
  const muchos = Array.from({ length: 12 }, (_, i) =>
    propietario({
      id: `p-${i}`,
      nombre: `Propietario ${String(i).padStart(2, '0')}`,
      inmuebles: [
        { propertyId: `inm-${i}`, titulo: `Torre ${i}`, canon: 1_000_000, comision: 100_000 },
      ],
    }),
  );

  it('con doce propietarios se ven diez y un pie de página', async () => {
    preview.mockResolvedValue(previaCon(muchos));
    await montar();

    expect(todos('fila-propietario')).toHaveLength(10);
    // El contador cuenta los doce, no los diez de la página.
    expect(q('cuantos-seleccionados')?.textContent).toContain('12 de 12');
  });

  it('el buscador encuentra por nombre de propietario', async () => {
    preview.mockResolvedValue(previaCon(muchos));
    await montar();

    await escribir('buscar-propietario', 'Propietario 07');

    expect(todos('fila-propietario')).toHaveLength(1);
    expect(host.textContent).toContain('Propietario 07');
  });

  it('el buscador encuentra por inmueble, que es como la gente los busca', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    await montar();

    await escribir('buscar-propietario', 'Envigado');

    const filas = todos('fila-propietario');
    expect(filas).toHaveLength(1);
    expect(filas[0].getAttribute('data-propietario')).toBe('p-marcela');
  });

  it('una búsqueda sin resultados lo dice, y no se lee como un mes vacío', async () => {
    preview.mockResolvedValue(previaCon([JORGE]));
    await montar();

    await escribir('buscar-propietario', 'zzz');

    expect(q('sin-resultados')).not.toBeNull();
    expect(q('asistente-mes-vacio')).toBeNull();
  });

  /*
   * 🔴 Buscar NO destilda. Filtrar es de presentación; si el filtro tocara la
   * selección, buscar «Envigado» y confirmar dejaría sin girar a los otros 517
   * sin que nadie lo pidiera.
   */
  it('buscar no cambia a quién se le gira', async () => {
    preview.mockResolvedValue(previaCon([JORGE, MARCELA]));
    await montar();

    await escribir('buscar-propietario', 'Envigado');

    expect(q('cuantos-seleccionados')?.textContent).toContain('2 de 2');
    await clic(q('confirmar')!);
    expect(generate).toHaveBeenCalledWith('2026-08', undefined, undefined);
  });
});

describe('D7 — el motivo del back cuando no liquida', () => {
  function errorDeParticipaciones() {
    return new ApiError(
      400,
      `Las participaciones de los copropietarios de «Apto 101» suman 9000 y no 10000 puntos básicos (el 90 % y no el 100 %): no se puede repartir su plata. Corrige los porcentajes de los dueños en la ficha del inmueble (inmueble ${INMUEBLE_ROTO}).`,
      'PARTICIPACIONES_NO_SUMAN_100',
      {
        statusCode: 400,
        code: 'PARTICIPACIONES_NO_SUMAN_100',
        propertyId: INMUEBLE_ROTO,
        titulo: 'Apto 101',
        detalle: { propertyId: INMUEBLE_ROTO, titulo: 'Apto 101', sumaBps: 9000 },
      },
    );
  }

  it('participaciones ≠ 100: dice cuál inmueble, enlaza a su ficha y no ofrece reintentar', async () => {
    preview.mockRejectedValue(errorDeParticipaciones());
    await montar();

    const aviso = q('liquidacion-frenada');
    expect(aviso).not.toBeNull();
    expect(aviso?.textContent).toContain('«Apto 101»');
    expect(aviso?.textContent).toContain('suman 9000 y no 10000');
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe(
      `/panel/inmobiliaria/inmuebles/${INMUEBLE_ROTO}`,
    );
    expect(q('reintentar')).toBeNull();
    expect(host.textContent).not.toContain(
      'No pudimos calcular las dispersiones de este mes.',
    );
  });

  it('un 400 sin código conocido muestra su motivo, no una frase genérica', async () => {
    preview.mockRejectedValue(
      new ApiError(400, 'El mes 2026-08 ya está cerrado contablemente', 'MES_CERRADO'),
    );
    await montar();

    expect(q('asistente-motivo')?.textContent).toContain('ya está cerrado contablemente');
  });

  it('con el servidor caído sí se puede reintentar, y reintentar vuelve a pedirla', async () => {
    preview.mockRejectedValue(new ApiError(500, 'Internal server error'));
    await montar();

    const reintentar = q('reintentar');
    expect(reintentar).not.toBeNull();

    preview.mockResolvedValue(previaCon([MARCELA]));
    await clic(reintentar!);

    expect(preview).toHaveBeenCalledTimes(2);
    expect(q('a-quien')).not.toBeNull();
  });

  it('si confirmar choca con el back, el aviso queda al pie con el inmueble', async () => {
    preview.mockResolvedValue(previaCon([MARCELA]));
    generate.mockRejectedValue(errorDeParticipaciones());
    await montar();
    await clic(q('confirmar')!);

    const aviso = q('liquidacion-frenada');
    expect(aviso?.textContent).toContain('«Apto 101»');
    expect(toastError).toHaveBeenCalled();
  });
});

describe('un mes sin nada que girar dice la razón que contó el back', () => {
  it('agosto con sus cuotas del sistema anterior: lo dice, y ni una palabra de cobros pagados', async () => {
    preview.mockResolvedValue(
      previaCon([], {
        vacio: {
          cuotasDelMes: 12,
          enUnaDispersion: 0,
          porGirar: 0,
          delSistemaAnterior: 12,
          contratosVigentes: 12,
        },
      }),
    );
    await montar();

    const vacio = q('asistente-mes-vacio');
    expect(vacio).not.toBeNull();
    expect(vacio?.textContent).toContain('sistema anterior');
    expect(host.textContent).not.toContain('cobros pagados');
    // Sin nada que elegir, tampoco hay lista ni botón de confirmar.
    expect(q('a-quien')).toBeNull();
    expect(q('confirmar')).toBeNull();
  });

  it('los que ya tienen liquidación del mes se dicen, no se esconden', async () => {
    const yaTiene = propietario({
      id: 'p-ya',
      nombre: 'Luis Ya',
      yaExiste: true,
      inmuebles: [{ propertyId: 'inm-ya', titulo: 'Casa Ya', canon: 1_000_000, comision: 100_000 }],
    });
    preview.mockResolvedValue(previaCon([yaTiene, MARCELA]));
    await montar();

    expect(q('ya-generados')?.textContent).toContain('1 propietario ya tiene');
    // Y no se puede destildar lo que no está en juego.
    expect(todos('fila-propietario')).toHaveLength(1);
  });
});

describe('el canon dice con qué base salió', () => {
  it('🔴 con base CAUSADO no se habla de plata recaudada', async () => {
    preview.mockResolvedValue(previaCon([JORGE], { base: 'CAUSADO' }));
    await montar();

    expect(q('rotulo-de-la-base')?.textContent).toContain('Canon causado');
    expect(host.textContent?.toLowerCase()).not.toContain('recaudado');
    expect(host.textContent).toContain('no depende de que el inquilino haya pagado');
  });

  it('sin `base` en la previa es la del back por defecto: CAUSADO', async () => {
    preview.mockResolvedValue(previaCon([JORGE]));
    await montar();

    expect(q('rotulo-de-la-base')?.textContent).toContain('Canon causado');
  });

  it('con base RECAUDADO lo dice, y no promete que no depende del pago', async () => {
    preview.mockResolvedValue(previaCon([JORGE], { base: 'RECAUDADO' }));
    await montar();

    expect(q('rotulo-de-la-base')?.textContent).toContain('Canon recaudado');
    expect(host.textContent).not.toContain('no depende de que el inquilino haya pagado');
  });
});

describe('las cuotas que llegaron tarde', () => {
  const tardia = {
    propietarioId: 'p-ya',
    propietarioName: 'Luis Ya',
    cuotas: 2,
    montoCop: 1_800_000,
    seSuman: true as const,
    motivo: null,
  };

  it('sin borradores nuevos pero con tardías que se suman, se puede confirmar', async () => {
    preview.mockResolvedValue(
      previaCon(
        [propietario({
          id: 'p-ya',
          nombre: 'Luis Ya',
          yaExiste: true,
          inmuebles: [{ propertyId: 'inm-ya', titulo: 'Casa Ya', canon: 900_000, comision: 0 }],
        })],
        { tardias: [tardia] },
      ),
    );
    await montar();

    expect(q('confirmacion-tardias')?.textContent).toContain('las cuotas que llegaron tarde');
    expect((q('confirmar') as HTMLButtonElement).disabled).toBe(false);
  });

  /*
   * 🔴 Sin su id, el back no mira a ese propietario y esas cuotas no se giran
   * NUNCA. Sólo hace falta nombrarlo cuando se manda lista; sin lista el back ya
   * las mira todas.
   */
  it('viajan en el generate cuando hay una lista, aunque su dueño ya tenga liquidación', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    preview.mockResolvedValue(
      previaCon([JORGE, MARCELA, propietario({
        id: 'p-ya',
        nombre: 'Luis Ya',
        yaExiste: true,
        inmuebles: [{ propertyId: 'inm-ya', titulo: 'Casa Ya', canon: 900_000, comision: 0 }],
      })], { tardias: [tardia] }),
    );
    previewDeLaSeleccion.mockResolvedValue(previaCon([MARCELA], { tardias: [tardia] }));
    await montar();
    await clic(casilla('Girarle a Jorge Restrepo'));
    await esperarElRecalculo();
    await clic(q('confirmar')!);

    expect(generate).toHaveBeenCalledWith('2026-08', ['p-marcela', 'p-ya'], undefined);
  });

  it('las que no se pueden sumar se dicen con su motivo y no viajan', async () => {
    preview.mockResolvedValue(
      previaCon([MARCELA], {
        tardias: [
          {
            ...tardia,
            seSuman: false,
            motivo: 'La liquidación de Luis ya se giró: sus cuotas entran el mes que viene.',
          },
        ],
      }),
    );
    await montar();
    await clic(q('confirmar')!);

    expect(host.textContent).toContain('sus cuotas entran el mes que viene');
    expect(generate).toHaveBeenCalledWith('2026-08', undefined, undefined);
  });
});
