/**
 * AsientoDeApertura.test.tsx — la pantalla no afirma un hecho que no ocurrió.
 *
 * 🔴 AP-IDEM. `POST /asientos` responde el MISMO 201 con el MISMO cuerpo en dos
 * situaciones distintas: cuando acaba de escribir el asiento, y cuando la llave
 * del intento ya tenía uno y devuelve ESE sin escribir nada. El cartel decía
 * «Asiento N.º 7 registrado con fecha …» en los dos casos, así que anunciaba un
 * registro que no había pasado — y quien migra saldos iniciales necesita
 * exactamente esa distinción para no contarlos dos veces.
 *
 * Lo que este archivo congela:
 *
 *  1. Con `yaExistia: true` el cartel dice «ya estaba registrado» y NO dice
 *     «registrado con fecha».
 *  2. Con `yaExistia: false` sigue diciendo lo de siempre (el arreglo no puede
 *     ser volver todo tibio: cuando sí se creó, se dice que se creó).
 *  3. El monto sale del asiento GUARDADO, no de las filas que hay en pantalla.
 *  4. «Registrar otro asiento» estrena llave del intento. Con la vieja, el back
 *     devolvía el asiento anterior y el segundo no se escribía nunca — que es
 *     cómo se llega a AP-IDEM sin cortar un solo cable de red.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { AsientoRegistrado, CuentaPuc } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

/*
 * Los dos primitivos del formulario que jsdom no sabe manejar: el `Select` de
 * Radix (necesita PointerEvent y capture de puntero) y el `CurrencyInput` de
 * cadence (formatea mientras se escribe). Se reemplazan por sus equivalentes
 * nativos para poder LLENAR el asiento de verdad — el botón «Registrar» está
 * `disabled` por props hasta que cuadre, y React no despacha el click de un
 * elemento deshabilitado por más que se le quite el atributo en el DOM.
 *
 * Lo que se prueba sigue siendo el camino real: `puedeEnviarApertura`,
 * `enviar()` y el cartel del final.
 */
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@leasefy/cadence', async () => {
  const actual = await vi.importActual<typeof import('@leasefy/cadence')>('@leasefy/cadence');
  return {
    ...actual,
    CurrencyInput: ({
      value,
      onChange,
      invalid: _invalid,
      ...resto
    }: {
      value?: number;
      onChange: (v: number) => void;
      invalid?: boolean;
      [k: string]: unknown;
    }) => (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        {...resto}
      />
    ),
  };
});

const { api } = vi.hoisted(() => ({
  api: { asientos: { crear: vi.fn() } },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return {
    ...actual,
    contabilidadApi: {
      ...actual.contabilidadApi,
      asientos: { ...actual.contabilidadApi.asientos, ...api.asientos },
    },
  };
});

import { AsientoDeApertura } from './AsientoDeApertura';

const CUENTAS: CuentaPuc[] = [
  {
    id: 'c-1',
    agencyId: 'ag-1',
    codigo: '110505',
    nombre: 'Caja general',
    naturaleza: 'DEBITO',
    padreId: null,
    imputable: true,
    activa: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c-2',
    agencyId: 'ag-1',
    codigo: '310505',
    nombre: 'Capital social',
    naturaleza: 'CREDITO',
    padreId: null,
    imputable: true,
    activa: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

/**
 * El asiento que el back devuelve: 2 líneas por `montoCop`.
 *
 * El monto se parametriza a propósito: en el caso «ya estaba» tiene que poder
 * ser DISTINTO al que hay en el formulario, que es justo lo que destapa que el
 * cartel estaba leyendo los totales de la pantalla en vez del asiento guardado.
 */
function asientoDelBack(yaExistia: boolean, montoCop = 1_000_000): AsientoRegistrado {
  return {
    id: 'as-1',
    agencyId: 'ag-1',
    numero: 7,
    fecha: '2026-02-05',
    descripcion: 'Saldos iniciales al 2026-02-05',
    origen: 'MANUAL',
    origenId: null,
    cerrado: false,
    creadoPorUserId: 'u-1',
    createdAt: '2026-02-05T10:00:00Z',
    yaExistia,
    movimientos: [
      {
        id: 'm-1',
        asientoId: 'as-1',
        cuentaId: 'c-1',
        debitoCop: montoCop,
        creditoCop: 0,
        terceroTipo: null,
        terceroId: null,
        descripcion: null,
        orden: 0,
      },
      {
        id: 'm-2',
        asientoId: 'as-1',
        cuentaId: 'c-2',
        debitoCop: 0,
        creditoCop: montoCop,
        terceroTipo: null,
        terceroId: null,
        descripcion: null,
        orden: 1,
      },
    ],
  };
}

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<AsientoDeApertura cuentas={CUENTAS} onCreado={() => {}} enElMuro />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

async function click(el: Element | null) {
  if (!el) throw new Error('no está el elemento a clickear');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** Cambia el valor de un control nativo pasando por el setter de React. */
async function escribir(el: Element | null, valor: string) {
  if (!el) throw new Error('no está el control a llenar');
  const proto =
    el instanceof HTMLSelectElement
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  await act(async () => {
    setter?.call(el, valor);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Deja el asiento cuadrado: caja al débito, capital al crédito, $1.000.000. */
async function llenarUnAsientoQueCuadra() {
  const selects = container.querySelectorAll('select');
  await escribir(selects[0] ?? null, 'c-1');
  await escribir(selects[1] ?? null, 'c-2');
  await escribir(q('apertura-debito-0'), '1000000');
  await escribir(q('apertura-credito-1'), '1000000');
}

/** Llena, responde `respuesta` desde el back y toca «Registrar». */
async function registrar(respuesta: AsientoRegistrado) {
  api.asientos.crear.mockResolvedValue(respuesta);
  await llenarUnAsientoQueCuadra();
  const boton = q('apertura-enviar') as HTMLButtonElement | null;
  if (!boton) throw new Error('no está el botón de registrar');
  if (boton.disabled) throw new Error('el asiento no quedó cuadrado: el botón sigue apagado');
  await click(boton);
  await act(async () => {});
}

beforeEach(() => {
  api.asientos.crear.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

describe('AsientoDeApertura — el cartel del final', () => {
  it('cuando el back dice que YA EXISTÍA, no anuncia un registro', async () => {
    await pintar();
    // El formulario tiene $1.000.000; el asiento que ya estaba guardado son
    // $4.500.000. Distintos a propósito: es lo que hay en la base lo que vale.
    await registrar(asientoDelBack(true, 4_500_000));

    const cartel = q('apertura-creado');
    expect(cartel).not.toBeNull();
    const texto = cartel!.textContent ?? '';

    // Lo que NO puede decir: que esta llamada lo registró.
    expect(texto).not.toContain('registrado con fecha');
    // Lo que sí tiene que decir, y el número del asiento que ya estaba.
    expect(texto).toContain('ya estaba registrado');
    expect(texto).toContain('7');
    expect(texto).toContain('No se creó ninguno nuevo');
    expect(cartel!.getAttribute('data-ya-existia')).toBe('si');
    // El monto es el del asiento GUARDADO, no el de las filas en pantalla.
    expect(texto).toContain('4.500.000');
    expect(texto).not.toContain('1.000.000');
  });

  it('cuando el back dice que lo creó, lo anuncia como siempre', async () => {
    await pintar();
    await registrar(asientoDelBack(false));

    const texto = q('apertura-creado')!.textContent ?? '';
    expect(texto).toContain('Asiento N.º 7 registrado con fecha 2026-02-05');
    expect(texto).not.toContain('ya estaba registrado');
    // Y el monto sale del asiento guardado, no de las filas vacías del form.
    expect(texto).toContain('1.000.000');
  });

  it('«Registrar otro asiento» estrena llave: el segundo no reusa la del primero', async () => {
    await pintar();
    await registrar(asientoDelBack(false));

    const primera = api.asientos.crear.mock.calls[0]![0].claveIdempotencia;
    expect(primera).toBeTruthy();

    const otro = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Registrar otro asiento'),
    );
    await click(otro ?? null);
    await registrar(asientoDelBack(false));

    const segunda = api.asientos.crear.mock.calls[1]![0].claveIdempotencia;
    expect(segunda).toBeTruthy();
    // Con la MISMA llave el back devuelve el asiento anterior y el segundo no
    // se escribe jamás — la forma más común de llegar a AP-IDEM.
    expect(segunda).not.toBe(primera);
  });
});
