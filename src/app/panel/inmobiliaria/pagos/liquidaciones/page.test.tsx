/**
 * page.test.tsx — Liquidaciones.
 *
 * Era una vitrina: una constante `EJEMPLO` con $2.500.000 escritos a mano, la
 * fórmula pintada sobre esa constante con un badge «Ejemplo», y la tabla de
 * egresos con un vacío permanente. Cero `fetch`, mientras el back ya calculaba
 * el neto por propietario en `GET /inmobiliaria/dispersiones/preview`.
 *
 * Lo que muerde acá: que la pantalla PIDA los datos, que pinte los del back
 * —no los del ejemplo—, que un fallo sea UN estado (no «error + no hay nada +
 * $0 verde» a la vez), que el mes se pueda cambiar, y que el 400 de un
 * inmueble con copropietarios diga cuál y lleve a su ficha.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

// El Select de Radix no abre en happy-dom: un par de botones con el mismo contrato.
vi.mock('@/components/ui/select', async () => {
  const R = await import('react');
  const Ctx = R.createContext<(v: string) => void>(() => undefined);
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (v: string) => void;
      children?: React.ReactNode;
    }) =>
      R.createElement(
        Ctx.Provider,
        { value: onValueChange },
        R.createElement('div', { 'data-select': value }, children),
      ),
    SelectTrigger: ({ children }: { children?: React.ReactNode }) =>
      R.createElement('div', null, children),
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children),
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => {
      const elegir = R.useContext(Ctx);
      return R.createElement(
        'button',
        { type: 'button', 'data-opcion': value, onClick: () => elegir(value) },
        children,
      );
    },
  };
});

const preview = vi.fn();
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: { preview: (m: string) => preview(m) },
}));

import LiquidacionesPage from './page';

const PID = '7c1d2b8e-0000-4000-8000-000000000001';

function vistaPrevia(overrides: Record<string, unknown> = {}) {
  return {
    month: '2026-02',
    totalPropietarios: 2,
    yaGenerados: 1,
    totalAGirar: 540_000,
    totalComisiones: 100_000,
    propietarios: [
      {
        propietarioId: 'p-1',
        propietarioName: 'Jorge Restrepo',
        propietarioBankName: 'Bancolombia',
        propietarioBankAccount: '123456',
        yaExiste: false,
        totalCollected: 600_000,
        totalCommission: 60_000,
        totalConceptosAFavor: 0,
        totalConceptosACargo: 0,
        totalDeTerceros: 0,
        netToPropietario: 540_000,
        items: [],
      },
      {
        propietarioId: 'p-2',
        propietarioName: 'Marcela Ochoa',
        propietarioBankName: null,
        propietarioBankAccount: null,
        yaExiste: true,
        totalCollected: 400_000,
        totalCommission: 40_000,
        totalConceptosAFavor: 0,
        totalConceptosACargo: 0,
        totalDeTerceros: 0,
        netToPropietario: 360_000,
        items: [],
      },
    ],
    ...overrides,
  };
}

let host: HTMLDivElement;
let root: Root;

async function asentar() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<LiquidacionesPage />);
  });
  // Deja correr el `await` del fetch simulado.
  await asentar();
}

beforeEach(() => {
  preview.mockReset();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

const texto = () => host.textContent ?? '';
const filas = () =>
  Array.from(host.querySelectorAll('[data-testid="tesoreria-fila"]'));
const q = (testid: string) => host.querySelector(`[data-testid="${testid}"]`);

function mesActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

describe('Liquidaciones pide y pinta la plata real del mes', () => {
  it('llama a la vista previa del back con el mes en curso', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview.mock.calls[0][0]).toBe(mesActual());
  });

  it('pinta una fila por propietario, con su neto', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    expect(filas()).toHaveLength(2);
    expect(texto()).toContain('Jorge Restrepo');
    expect(texto()).toContain('Marcela Ochoa');
  });

  it('AL REVÉS: el canon de ejemplo ($2.500.000) ya no aparece en ninguna parte', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    expect(texto()).not.toContain('2.500.000');
    expect(texto()).not.toContain('inmobiliaria.tesoreria.ejemplo');
  });

  it('el total del mes es la suma de los netos del back, no una fórmula inventada', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    const total = q('tesoreria-neto-total');
    // 540.000 + 360.000
    expect(total?.textContent).toContain('900.000');
    expect(total?.className).toContain('text-success');
  });

  it('sin propietarios muestra el vacío, sin un neto de $0 al lado', async () => {
    preview.mockResolvedValue(
      vistaPrevia({ propietarios: [], totalPropietarios: 0, totalAGirar: 0 }),
    );
    await montar();

    expect(filas()).toHaveLength(0);
    expect(texto()).toContain('inmobiliaria.tesoreria.emptyTitle');
    expect(q('tesoreria-neto-total')).toBeNull();
  });
});

describe('L1 — un solo estado a la vez', () => {
  it('con el back caído: el fallo con reintento, y NI «no hay nada» NI un neto de $0', async () => {
    preview.mockRejectedValueOnce(new ApiError(500, 'Internal server error'));
    await montar();

    expect(q('fallo-de-carga')).not.toBeNull();
    expect(texto()).not.toContain('inmobiliaria.tesoreria.emptyTitle');
    expect(q('tesoreria-neto-total')).toBeNull();
    expect(filas()).toHaveLength(0);

    preview.mockResolvedValue(vistaPrevia());
    const reintentar = q('reintentar') as HTMLButtonElement | null;
    expect(reintentar).not.toBeNull();
    await act(async () => {
      reintentar!.click();
      // El botón espera un piso visible de 400 ms antes de soltarse.
      await new Promise((r) => setTimeout(r, 450));
    });

    expect(preview).toHaveBeenCalledTimes(2);
    expect(q('fallo-de-carga')).toBeNull();
    expect(filas()).toHaveLength(2);
  });

  it('un propietario que queda debiendo NO se pinta en verde, y se dice', async () => {
    const base = vistaPrevia();
    const propietarios = base.propietarios as Array<Record<string, unknown>>;
    preview.mockResolvedValue(
      vistaPrevia({
        propietarios: [
          propietarios[0],
          {
            ...propietarios[1],
            totalCollected: 0,
            totalCommission: 0,
            totalConceptosACargo: 900_000,
            netToPropietario: -900_000,
          },
        ],
      }),
    );
    await montar();

    const netos = Array.from(host.querySelectorAll('[data-testid="tesoreria-neto-fila"]'));
    expect(netos[0].className).toContain('text-success');
    expect(netos[1].className).toContain('text-danger');
    expect(netos[1].className).not.toContain('text-success');
    expect(netos[1].textContent).toContain('Queda debiendo');

    // 540.000 − 900.000 = −360.000: el total también va en rojo.
    const total = q('tesoreria-neto-total');
    expect(total?.className).toContain('text-danger');
    expect(q('tesoreria-quedan-debiendo')?.textContent).toContain('1 propietario queda debiendo');
  });
});

describe('L2 — el mes se elige', () => {
  it('ofrece los últimos 12 meses empezando por el corriente, sin meses futuros', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    const opciones = Array.from(host.querySelectorAll('[data-opcion]')).map(
      (b) => b.getAttribute('data-opcion'),
    );
    expect(opciones).toHaveLength(12);
    expect(opciones[0]).toBe(mesActual());
    expect(opciones.every((m) => (m as string) <= mesActual())).toBe(true);
  });

  it('elegir el mes anterior vuelve a pedir la liquidación de ESE mes', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    const anterior = host.querySelectorAll('[data-opcion]')[1] as HTMLButtonElement;
    const mes = anterior.getAttribute('data-opcion');
    await act(async () => {
      anterior.click();
    });
    await asentar();

    expect(preview).toHaveBeenCalledTimes(2);
    expect(preview.mock.calls[1][0]).toBe(mes);
  });
});

describe('L3 — el 400 de copropietarios dice cuál inmueble y a dónde ir', () => {
  it('participaciones ≠ 100: aviso con el motivo, enlace a la ficha y SIN «Reintentar»', async () => {
    preview.mockRejectedValue(
      new ApiError(
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
      ),
    );
    await montar();

    const aviso = q('liquidacion-frenada');
    expect(aviso).not.toBeNull();
    expect(aviso?.textContent).toContain('suman 9000 y no 10000');
    expect(aviso?.textContent).toContain('Arregla las participaciones en la ficha del inmueble');
    const enlace = aviso?.querySelector('a');
    expect(enlace?.getAttribute('href')).toBe(`/panel/inmobiliaria/inmuebles/${PID}`);
    expect(enlace?.textContent).toContain('Apto 101');

    expect(q('reintentar')).toBeNull();
    expect(texto()).not.toContain('inmobiliaria.tesoreria.emptyTitle');
    expect(q('tesoreria-neto-total')).toBeNull();
  });

  it('copropietarios con impuestos: el mensaje del back tal cual y la lista de inmuebles', async () => {
    const msg =
      '«Casa 5» tiene 2 copropietarios y el cobro de 2026-08 lleva impuestos liquidados para un solo perfil tributario (IVA y retenciones del canon). No se puede repartir sin decidir a nombre de quién queda cada retención: liquida este inmueble por fuera de la corrida del mes.';
    preview.mockRejectedValue(new ApiError(400, msg, 'COPROPIETARIOS_CON_IMPUESTOS'));
    await montar();

    const aviso = q('liquidacion-frenada');
    expect(aviso?.getAttribute('data-code')).toBe('COPROPIETARIOS_CON_IMPUESTOS');
    expect(aviso?.textContent).toContain(msg);
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles');
    expect(q('reintentar')).toBeNull();
  });
});

/**
 * Deducciones (Nico y Juan Camilo, 2026-09-16): la liquidación es lo que el
 * contrato cobra MENOS sus deducciones. El back manda el bloque con la regla
 * única; la pantalla pinta lo que se descuenta y lo que se gira, entero o $0.
 */
describe('Deducciones del mes', () => {
  function bloque(p: {
    netoDelMesCop: number;
    deduccionesCop: number;
    aGirarCop: number;
    saldoEnContraCop: number;
  }) {
    return {
      ...p,
      deducciones: [],
      saldoAnteriorCop: 0,
      netoCop: p.netoDelMesCop - p.deduccionesCop,
      compensadoCop: p.netoDelMesCop - p.aGirarCop,
      renglones: [],
    };
  }

  it('la columna dice lo descontado y el neto es lo que se gira; deducciones mayores que el neto: $0 y la diferencia pasa, sin «queda debiendo»', async () => {
    const base = vistaPrevia();
    const [jorge, marcela] = base.propietarios as Array<Record<string, unknown>>;
    preview.mockResolvedValue(
      vistaPrevia({
        propietarios: [
          {
            ...jorge,
            netToPropietario: 240_000,
            conDeducciones: bloque({
              netoDelMesCop: 540_000,
              deduccionesCop: 300_000,
              aGirarCop: 240_000,
              saldoEnContraCop: 0,
            }),
          },
          {
            ...marcela,
            netToPropietario: -140_000,
            conDeducciones: bloque({
              netoDelMesCop: 360_000,
              deduccionesCop: 500_000,
              aGirarCop: 0,
              saldoEnContraCop: 140_000,
            }),
          },
        ],
      }),
    );
    await montar();

    const deducciones = Array.from(host.querySelectorAll('[data-testid="tesoreria-deducciones-fila"]'));
    expect(deducciones.map((d) => d.textContent)).toEqual([
      expect.stringContaining('300.000'),
      expect.stringContaining('500.000'),
    ]);

    const netos = Array.from(host.querySelectorAll('[data-testid="tesoreria-neto-fila"]'));
    expect(netos[0].textContent).toContain('240.000');
    expect(netos[1].textContent).toContain('0');
    expect(netos[1].className).not.toContain('text-danger');
    expect(netos[1].textContent).not.toContain('Queda debiendo');
    expect(netos[1].querySelector('[data-testid="tesoreria-en-contra-fila"]')).not.toBeNull();

    expect(q('tesoreria-deducciones-total')?.textContent).toContain('800.000');
    // Lo que sale del banco: 240.000 + 0.
    expect(q('tesoreria-a-girar-total')?.textContent).toContain('240.000');
    expect(q('tesoreria-quedan-en-cero')).not.toBeNull();
    expect(q('tesoreria-quedan-debiendo')).toBeNull();
  });
});
