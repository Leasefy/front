/**
 * @vitest-environment happy-dom
 *
 * DispersionWizard — D7 de la auditoría del 2026-09-13.
 *
 * El asistente tiraba el motivo del back: la vista previa decía «No pudimos
 * calcular las dispersiones de este mes» y confirmar decía «Error al generar
 * dispersiones». El back para la corrida ENTERA por un inmueble con
 * participaciones que no suman 100 % o con varios dueños e impuestos, y lo
 * explica con un `code`. Lo que se prueba: que el motivo se vea, que diga
 * CUÁL inmueble con un enlace, y que sólo la red o el servidor ofrezcan
 * reintentar.
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
        (_target, tag: string) =>
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
          void whileHover; void whileTap; void initial; void animate; void exit; void transition; void layout;
          return React.createElement(tag, rest, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

const toastError = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  toast: Object.assign(vi.fn(), {
    error: (...a: unknown[]) => toastError(...a),
    success: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
  }),
}));

vi.mock('./ComisionDesglose', () => ({ ComisionDesglose: () => null }));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useDispersiones: () => ({ dispersiones: [] }),
}));

const preview = vi.fn();
const generate = vi.fn();
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: {
    preview: (m: string) => preview(m),
    generate: (m: string, ids?: string[]) => generate(m, ids),
  },
}));

import { DispersionWizard } from './DispersionWizard';

const PID = '7c1d2b8e-0000-4000-8000-000000000001';

function errorDeParticipaciones() {
  return new ApiError(
    400,
    `Las participaciones de los copropietarios de «Apto 101» suman 9000 y no 10000 puntos básicos (el 90 % y no el 100 %): no se puede repartir su plata. Corrige los porcentajes de los dueños en la ficha del inmueble (inmueble ${PID}).`,
    'PARTICIPACIONES_NO_SUMAN_100',
    {
      statusCode: 400,
      code: 'PARTICIPACIONES_NO_SUMAN_100',
      propertyId: PID,
      titulo: 'Apto 101',
      detalle: { propertyId: PID, titulo: 'Apto 101', sumaBps: 9000 },
    },
  );
}

const MSG_COPRO =
  '«Casa 5» tiene 2 copropietarios y el cobro de 2026-08 lleva impuestos liquidados para un solo perfil tributario (IVA y retenciones del canon). No se puede repartir sin decidir a nombre de quién queda cada retención: liquida este inmueble por fuera de la corrida del mes.';

function vistaPrevia() {
  return {
    month: '2026-08',
    totalPropietarios: 1,
    yaGenerados: 0,
    totalAGirar: 900_000,
    totalComisiones: 100_000,
    propietarios: [
      {
        propietarioId: 'p-1',
        propietarioName: 'Jorge Restrepo',
        propietarioBankName: 'Bancolombia',
        propietarioBankAccount: '123456',
        yaExiste: false,
        totalCollected: 1_000_000,
        totalCommission: 100_000,
        totalConceptosAFavor: 0,
        totalConceptosACargo: 0,
        totalDeTerceros: 0,
        netToPropietario: 900_000,
        items: [],
      },
    ],
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
    root.render(<DispersionWizard initialMonth="2026-08" onComplete={onComplete} />);
  });
  await asentar();
}

const q = (testid: string) => host.querySelector(`[data-testid="${testid}"]`);

function boton(texto: string): HTMLButtonElement {
  const b = Array.from(host.querySelectorAll('button')).find((el) =>
    el.textContent?.includes(texto),
  );
  if (!b) throw new Error(`No hay botón «${texto}»`);
  return b as HTMLButtonElement;
}

/** Avanza un paso. En el paso 4 el botón nombra lo que sigue: «Elegir a quién». */
async function siguiente() {
  const avanzar = Array.from(host.querySelectorAll('button')).find(
    (el) => el.textContent?.includes('Siguiente') || el.textContent?.includes('Elegir a quién'),
  );
  if (!avanzar) throw new Error('No hay botón para avanzar de paso');
  await act(async () => {
    (avanzar as HTMLButtonElement).click();
  });
}

beforeEach(() => {
  preview.mockReset();
  generate.mockReset();
  toastError.mockReset();
  onComplete.mockReset();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

describe('D7 — la vista previa muestra el motivo del back', () => {
  it('participaciones ≠ 100: dice cuál inmueble, enlaza a su ficha y no ofrece reintentar', async () => {
    preview.mockRejectedValue(errorDeParticipaciones());
    await montar();
    await siguiente(); // paso 2, «Cobros»

    const aviso = q('liquidacion-frenada');
    expect(aviso).not.toBeNull();
    expect(aviso?.textContent).toContain('«Apto 101»');
    expect(aviso?.textContent).toContain('suman 9000 y no 10000');
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe(
      `/panel/inmobiliaria/inmuebles/${PID}`,
    );
    expect(q('reintentar')).toBeNull();
    // Y ya no la frase fija que escondía el motivo.
    expect(host.textContent).not.toContain('No pudimos calcular las dispersiones de este mes.');
  });

  it('copropietarios con impuestos: el mensaje tal cual y la lista de inmuebles', async () => {
    preview.mockRejectedValue(new ApiError(400, MSG_COPRO, 'COPROPIETARIOS_CON_IMPUESTOS'));
    await montar();
    await siguiente();

    const aviso = q('liquidacion-frenada');
    expect(aviso?.getAttribute('data-code')).toBe('COPROPIETARIOS_CON_IMPUESTOS');
    expect(aviso?.textContent).toContain(MSG_COPRO);
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles');
  });

  it('un 400 sin código conocido muestra su motivo, no una frase genérica', async () => {
    preview.mockRejectedValue(new ApiError(400, 'El mes tiene que venir como AAAA-MM.'));
    await montar();
    await siguiente();

    expect(q('asistente-motivo')?.textContent).toContain('El mes tiene que venir como AAAA-MM.');
  });

  it('con el servidor caído sí se puede reintentar, y reintentar vuelve a pedir la vista previa', async () => {
    preview.mockRejectedValueOnce(new ApiError(500, 'Internal server error'));
    await montar();
    await siguiente();

    const reintentar = q('reintentar') as HTMLButtonElement | null;
    expect(reintentar).not.toBeNull();

    preview.mockResolvedValue(vistaPrevia());
    await act(async () => {
      reintentar!.click();
    });
    await asentar();

    expect(preview).toHaveBeenCalledTimes(2);
    expect(q('fallo-de-carga')).toBeNull();
    expect(host.textContent).toContain('Jorge Restrepo');
  });
});

describe('D7 — confirmar muestra el motivo del back', () => {
  it('si generar choca con participaciones ≠ 100: aviso con el inmueble al pie y toast con el motivo', async () => {
    preview.mockResolvedValue(vistaPrevia());
    generate.mockRejectedValue(errorDeParticipaciones());
    await montar();
    for (let paso = 1; paso < 6; paso++) {
      await siguiente();
    }

    await act(async () => {
      boton('Confirmar Dispersiones').click();
    });
    await asentar();

    expect(generate).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    const aviso = q('liquidacion-frenada');
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe(
      `/panel/inmobiliaria/inmuebles/${PID}`,
    );

    expect(toastError).toHaveBeenCalledTimes(1);
    const [titulo, opciones] = toastError.mock.calls[0] as [string, { description?: string }];
    expect(titulo).toContain('Apto 101');
    expect(opciones.description).toContain('suman 9000 y no 10000');
    expect(titulo).not.toBe('Error al generar dispersiones');
  });
});
