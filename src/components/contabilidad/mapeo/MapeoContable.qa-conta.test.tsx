/**
 * Mapeo contable, QA de Contabilidad (CB-05, 03-10-2026). El armado es el de
 * `MapeoContable.test.tsx`.
 *
 *   · la columna «Propuesta» ya no repite la cuenta elegida: sólo se dice
 *     cuando difiere (o no hay cuenta);
 *   · la explicación del evento va en una línea pero se puede leer entera.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, cuentasMock, escrituraMock } = vi.hoisted(() => ({
  api: {
    mapeo: { obtener: vi.fn(), guardar: vi.fn(), sembrar: vi.fn(), rubros: vi.fn() },
    asientos: { faltantes: vi.fn(), reprocesar: vi.fn() },
  },
  cuentasMock: { cuentas: [] as unknown[], cargando: false },
  /*
   * El gate de escritura se mockea porque lee dos contextos (permisos y auth) y
   * este test monta el componente suelto. El hook real ya no LANZA sin ellos
   * —devuelve «no pudimos leer tu rol»—, pero eso dejaría todos los controles
   * deshabilitados y estos tests prueban justamente que asignar una cuenta
   * funciona. Se mockea en «sí puede», que es el caso de un ADMIN o un CONTADOR.
   */
  escrituraMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: api };
});
vi.mock('../use-cuentas', async () => {
  const actual = await vi.importActual<typeof import('../use-cuentas')>('../use-cuentas');
  return { ...actual, useCuentas: () => cuentasMock };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return { ...actual, usePuedeEscribir: () => escrituraMock };
});
// CB-28: el selector de cuenta (un Combobox) como un <select> nativo, para poder ELEGIR.
vi.mock('../SelectorDeCuenta', () => ({
  SelectorDeCuenta: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select data-testid="selector-de-cuenta" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      <option value="c-415505">415505</option>
      <option value="c-415510">415510</option>
    </select>
  ),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { MapeoContable } from './MapeoContable';

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.mapeo.obtener.mockReset();
  api.asientos.faltantes.mockReset().mockResolvedValue({ total: 0, cobros: 0, recibos: 0, lotes: 0, mapeoCompleto: true });
  cuentasMock.cuentas = [];
  cuentasMock.cargando = false;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MapeoContable />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}


const LARGA =
  'Al emitirse el cobro del mes se causa lo que el inquilino debe: canon, administración y los conceptos del contrato.';

describe('<MapeoContable> · CB-05', () => {
  it('🔴 la propuesta igual a la elegida no se repite; la distinta sí, con «Usar»', async () => {
    api.mapeo.obtener.mockResolvedValue({
      completo: false,
      faltantes: ['b'],
      eventos: [
        {
          evento: 'a',
          nombre: 'Lo que debe el arrendatario',
          explicacion: LARGA,
          lado: 'DEBE',
          cuenta: { id: 'c-130505', codigo: '130505', nombre: 'Nacionales' },
          propuesta: { id: 'c-130505', codigo: '130505', nombre: 'Nacionales', activa: true, imputable: true },
          codigoPropuesto: '130505',
        },
        {
          evento: 'b',
          nombre: 'Entró plata en efectivo',
          explicacion: 'Un recibo de caja cuyo medio es efectivo.',
          lado: 'DEBE',
          cuenta: null,
          propuesta: { id: 'c-110505', codigo: '110505', nombre: 'Caja general', activa: true, imputable: true },
          codigoPropuesto: '110505',
        },
      ],
    });
    await pintar();
    const fila = q('evento-a')!;
    expect(q('propuesta-igual-a')).not.toBeNull();
    // El código de la propuesta ya no sale dos veces en la fila (la elegida va en el selector).
    expect(fila.querySelectorAll('td')[3].textContent).not.toContain('130505');
    const otra = q('evento-b')!;
    expect(otra.textContent).toContain('110505 · Caja general');
    expect(otra.textContent).toContain('Usar');
  });

  it('🔴 la explicación se lee entera con «Leer completo» y se cierra con «Ver menos»', async () => {
    api.mapeo.obtener.mockResolvedValue({
      completo: true,
      faltantes: [],
      eventos: [
        {
          evento: 'a',
          nombre: 'Lo que debe el arrendatario',
          explicacion: LARGA,
          lado: 'DEBE',
          cuenta: { id: 'c-130505', codigo: '130505', nombre: 'Nacionales' },
          propuesta: null,
          codigoPropuesto: '130505',
        },
      ],
    });
    await pintar();
    const caja = q('explicacion-a')!;
    const leer = Array.from(caja.querySelectorAll('button')).find((b) => b.textContent === 'Leer completo')!;
    expect(leer.getAttribute('aria-expanded')).toBe('false');
    await act(async () => {
      leer.click();
    });
    const abierta = q('explicacion-a')!;
    expect(abierta.querySelector('p')!.className).not.toContain('truncate');
    expect(abierta.textContent).toContain(LARGA);
    const menos = Array.from(abierta.querySelectorAll('button')).find((b) => b.textContent === 'Ver menos')!;
    expect(menos.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('<MapeoContable> · CB-28, cambiar la cuenta se confirma', () => {
  const evento = (cuenta: { id: string; codigo: string; nombre: string } | null, extra = {}) => ({
    evento: 'INGRESO_COMISION',
    nombre: 'Comisión de la inmobiliaria',
    explicacion: 'El ingreso propio.',
    lado: 'HABER',
    cuenta: cuenta ? { ...cuenta, activa: true, imputable: true } : null,
    propuesta: null,
    codigoPropuesto: '415510',
    ...extra,
  });
  beforeEach(() => {
    cuentasMock.cuentas = [
      { id: 'c-415505', codigo: '415505', nombre: 'Comisiones' },
      { id: 'c-415510', codigo: '415510', nombre: 'Inmobiliarias por retribución o contrata' },
    ];
  });
  async function elegir(valor: string) {
    await act(async () => {
      const sel = document.querySelector<HTMLSelectElement>('[data-testid="selector-de-cuenta"]')!;
      sel.value = valor;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
  }

  it('🔴 cambiar una cuenta ya asignada pide confirmación diciendo qué cambia, y no guarda antes', async () => {
    api.mapeo.obtener.mockResolvedValue({
      completo: true,
      faltantes: [],
      eventos: [evento({ id: 'c-415505', codigo: '415505', nombre: 'Comisiones' })],
    });
    api.mapeo.guardar.mockResolvedValue({ completo: true, faltantes: [], eventos: [] });
    await pintar();
    await elegir('c-415510');
    expect(api.mapeo.guardar).not.toHaveBeenCalled();
    const dialogo = document.querySelector('[data-testid="confirmar-cambio-de-cuenta"]')!.textContent ?? '';
    expect(dialogo).toContain('415510 · Inmobiliarias por retribución o contrata');
    expect(dialogo).toContain('Hasta hoy iba a 415505 · Comisiones');
    expect(dialogo).toContain('no se mueve');
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-testid="confirmar-cambio"]')!.click();
      await Promise.resolve();
    });
    expect(api.mapeo.guardar).toHaveBeenCalledWith([{ evento: 'INGRESO_COMISION', cuentaId: 'c-415510' }]);
  });

  it('la primera cuenta de un evento (sin cuenta, nunca asentó) se guarda sin preguntar', async () => {
    api.mapeo.obtener.mockResolvedValue({ completo: false, faltantes: ['INGRESO_COMISION'], eventos: [evento(null)] });
    api.mapeo.guardar.mockResolvedValue({ completo: true, faltantes: [], eventos: [] });
    await pintar();
    await elegir('c-415510');
    expect(document.querySelector('[data-testid="confirmar-cambio-de-cuenta"]')).toBeNull();
    expect(api.mapeo.guardar).toHaveBeenCalledTimes(1);
  });

  it('🔴 el rechazo del back queda bajo su fila', async () => {
    const { ApiError } = await import('@/lib/api/client');
    api.mapeo.obtener.mockResolvedValue({ completo: false, faltantes: ['INGRESO_COMISION'], eventos: [evento(null)] });
    api.mapeo.guardar.mockRejectedValue(
      new ApiError(400, 'La comisión es un ingreso: va en una cuenta de la clase 4.', 'CLASE_NO_CUADRA', {
        statusCode: 400,
        code: 'CLASE_NO_CUADRA',
        message: 'La comisión es un ingreso: va en una cuenta de la clase 4.',
      }),
    );
    await pintar();
    await elegir('c-415510');
    expect(document.getElementById('mapeo-INGRESO_COMISION-error')?.textContent).toContain('clase 4');
  });
});
