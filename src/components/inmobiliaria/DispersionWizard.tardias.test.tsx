/**
 * @vitest-environment happy-dom
 *
 * DispersionWizard — las cuotas que llegaron tarde.
 *
 * Bug del 2026-09-16: si el propietario ya tenía su dispersión del mes, sus
 * cuotas tardías (un contrato activado después, la parte de un copropietario)
 * se saltaban. El back ya las suma a la liquidación abierta, pero sólo mira a
 * los propietarios cuyo id viaja en el `generate` — y el asistente mandaba
 * únicamente los borradores NUEVOS. Lo que se prueba:
 *   · un mes sin borradores nuevos pero con tardías que se suman deja llegar a
 *     confirmar, y el `generate` lleva ese propietario;
 *   · las que no se pueden sumar se dicen con su motivo y no viajan;
 *   · con un back que no manda `tardias`, se manda lo de siempre.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

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
const toastSuccess = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  toast: Object.assign(vi.fn(), {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
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

function borrador(id: string, nombre: string) {
  return {
    propietarioId: id,
    propietarioName: nombre,
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
  };
}

const TARDIA_QUE_SE_SUMA = {
  propietarioId: 'p-copro',
  propietarioName: 'Lucía Gómez',
  dispersionId: 'd-1',
  cuotas: 1,
  netoCop: 450_000,
  seSuman: true,
  motivo: null,
};

const TARDIA_QUE_NO = {
  propietarioId: 'p-girado',
  propietarioName: 'Mario Ruiz',
  dispersionId: 'd-2',
  cuotas: 2,
  netoCop: 700_000,
  seSuman: false,
  motivo: 'Su liquidación de 2026-08 ya está en un lote armado: anula ese lote para sumarle estas cuotas.',
};

function vistaPrevia(extra: Record<string, unknown>) {
  return {
    month: '2026-08',
    totalPropietarios: 0,
    yaGenerados: 0,
    totalAGirar: 0,
    totalComisiones: 0,
    propietarios: [] as unknown[],
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

async function siguiente() {
  const avanzar = Array.from(host.querySelectorAll('button')).find(
    (el) => el.textContent?.includes('Siguiente') || el.textContent?.includes('Elegir a quién'),
  );
  if (!avanzar) throw new Error('No hay botón para avanzar de paso');
  expect((avanzar as HTMLButtonElement).disabled).toBe(false);
  await act(async () => {
    (avanzar as HTMLButtonElement).click();
  });
}

beforeEach(() => {
  preview.mockReset();
  generate.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  onComplete.mockReset();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

describe('DispersionWizard — cuotas que llegaron tarde', () => {
  it('sin borradores nuevos pero con tardías que se suman: llega a confirmar y las manda', async () => {
    preview.mockResolvedValue(
      vistaPrevia({ yaGenerados: 1, tardias: [TARDIA_QUE_SE_SUMA] }),
    );
    generate.mockResolvedValue({
      month: '2026-08',
      totalPropietarios: 1,
      created: 0,
      skipped: 1,
      noElegidos: 0,
      tardias: { sumadas: [TARDIA_QUE_SE_SUMA], sinSumar: [] },
    });
    await montar();
    await siguiente();

    expect(q('asistente-mes-vacio')).toBeNull();
    const bloque = q('cuotas-que-llegaron-tarde');
    expect(bloque?.textContent).toContain('Lucía Gómez');
    expect(bloque?.textContent).toContain('se suman al confirmar');

    for (let paso = 2; paso < 6; paso++) {
      await siguiente();
    }
    expect(q('confirmacion-tardias')?.textContent).toContain('cuotas que llegaron tarde');

    await act(async () => {
      boton('Confirmar Dispersiones').click();
    });
    await asentar();

    expect(generate).toHaveBeenCalledWith('2026-08', ['p-copro']);
    expect(toastSuccess).toHaveBeenCalledWith('Cuotas sumadas a las liquidaciones del mes', {
      description: 'Se sumó 1 cuota que llegó tarde a 1 liquidación del mes.',
    });
    expect(onComplete).toHaveBeenCalledWith([], '2026-08');
  });

  it('las que no se pueden sumar se dicen con su motivo y no viajan en el generate', async () => {
    preview.mockResolvedValue(
      vistaPrevia({
        totalPropietarios: 1,
        yaGenerados: 1,
        propietarios: [borrador('p-1', 'Jorge Restrepo')],
        tardias: [TARDIA_QUE_NO],
      }),
    );
    generate.mockResolvedValue({
      month: '2026-08',
      totalPropietarios: 2,
      created: 1,
      skipped: 0,
      noElegidos: 1,
      tardias: { sumadas: [], sinSumar: [TARDIA_QUE_NO] },
    });
    await montar();
    await siguiente();

    const fila = host.querySelector('[data-testid="cuota-tardia"][data-se-suman="no"]');
    expect(fila?.textContent).toContain('ya está en un lote armado');

    for (let paso = 2; paso < 6; paso++) {
      await siguiente();
    }
    expect(q('confirmacion-tardias')).toBeNull();
    await act(async () => {
      boton('Confirmar Dispersiones').click();
    });
    await asentar();

    expect(generate).toHaveBeenCalledWith('2026-08', ['p-1']);
    const [, opciones] = toastSuccess.mock.calls[0] as [string, { description: string }];
    expect(opciones.description).toContain('1 propietario tiene cuotas tardías que no se pudieron sumar.');
  });

  it('con un back que no manda tardías, el mes vacío sigue vacío y no se puede avanzar', async () => {
    preview.mockResolvedValue(vistaPrevia({ yaGenerados: 1 }));
    await montar();
    await siguiente();

    expect(q('asistente-mes-vacio')).not.toBeNull();
    expect(q('cuotas-que-llegaron-tarde')).toBeNull();
    const avanzar = boton('Siguiente');
    expect(avanzar.disabled).toBe(true);
  });
});
