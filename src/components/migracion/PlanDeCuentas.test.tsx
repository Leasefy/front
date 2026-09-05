/**
 * PlanDeCuentas.test.tsx — el paso 4 de la migración.
 *
 * Lo que se congela: que sin cuentas hay UN botón claro para cargar el plan
 * base; que después de sembrar el árbol aparece y, bien visible, la lista de
 * lo que el contador tiene que confirmar; y que el paso 5 se ofrece recién
 * cuando hay cuentas.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CuentaEnArbol } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

const { pucMock } = vi.hoisted(() => ({
  pucMock: {
    arbol: vi.fn(),
    semillaPendientes: vi.fn(),
    sembrar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    listar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

/*
 * El mapeo contable se monta adentro del paso (2026-09-02); es un componente
 * con su propia carga y sus propios tests. Acá sólo importa que esté.
 */
vi.mock('@/components/contabilidad/mapeo/MapeoContable', () => ({
  MapeoContable: () => <div data-testid="mapeo-contable-embebido" />,
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, puc: pucMock } };
});

import { PlanDeCuentas } from './PlanDeCuentas';

function cuenta(
  codigo: string,
  nombre: string,
  extra: Partial<CuentaEnArbol> = {},
  hijas: CuentaEnArbol[] = [],
): CuentaEnArbol {
  return {
    id: `id-${codigo}`,
    agencyId: 'ag-1',
    codigo,
    nombre,
    naturaleza: 'DEBITO',
    padreId: null,
    imputable: hijas.length === 0,
    activa: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    hijas,
    ...extra,
  };
}

/** Lo que devuelve `GET /puc/arbol` después de sembrar (recortado). */
const ARBOL_SEMBRADO: CuentaEnArbol[] = [
  cuenta('1', 'Activo', {}, [
    cuenta('11', 'Disponible', {}, [cuenta('1105', 'Caja', {}, [cuenta('110505', 'Caja general')])]),
  ]),
  cuenta('5', 'Gastos', {}, [
    cuenta('51', 'Operacionales de administración', {}, [
      cuenta('5115', 'Impuestos', {}, [cuenta('511580', 'Gravamen a los movimientos financieros')]),
    ]),
  ]),
];

const PENDIENTES = {
  total: 1,
  cuentas: [
    {
      codigo: '511580',
      nombre: 'Gravamen a los movimientos financieros',
      naturaleza: 'DEBITO' as const,
      imputable: true,
      fuente: 'PENDIENTE_DE_CONFIRMAR' as const,
      nota: 'El 4x1000. Confirmá con tu contador si lo lleva en 511580 o en otra subcuenta.',
    },
  ],
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<PlanDeCuentas />);
  });
  await act(async () => {});
}

function q(testid: string) {
  return container.querySelector(`[data-testid="${testid}"]`);
}

async function click(testid: string) {
  const el = q(testid);
  if (!el) throw new Error(`no hay ${testid}`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  pucMock.arbol.mockReset();
  pucMock.semillaPendientes.mockReset();
  pucMock.sembrar.mockReset();
  pucMock.semillaPendientes.mockResolvedValue(PENDIENTES);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
});

describe('sin plan de cuentas', () => {
  it('ofrece UN botón claro para cargar el plan base y no muestra árbol ni pendientes', async () => {
    pucMock.arbol.mockResolvedValue([]);

    await pintar();

    expect(q('puc-vacio')).not.toBeNull();
    expect(q('puc-sembrar')).not.toBeNull();
    expect(q('puc-arbol')).toBeNull();
    // Sin cuentas no hay nada que confirmar: la lista no se muestra todavía.
    expect(q('puc-pendientes')).toBeNull();
    expect(q('puc-continuar')).toBeNull();
  });

  it('🔴 al elegir «Subir mi plan de cuentas», el vacío se va: no conviven «todavía no hay plan» y la revisión', async () => {
    // Auditoría 2026-09-05: mientras se revisaba el archivo, el bloque
    // «Todavía no hay plan de cuentas» con sus tres botones seguía pintado
    // ARRIBA de «Así va a quedar». Dos estados contradictorios a la vez.
    pucMock.arbol.mockResolvedValue([]);

    await pintar();
    expect(q('puc-vacio')).not.toBeNull();

    await click('puc-vacio-subir-archivo');
    expect(q('puc-vacio')).toBeNull();
  });

  it('lo mismo al elegir «Crear las cuentas a mano»', async () => {
    pucMock.arbol.mockResolvedValue([]);

    await pintar();
    await click('puc-vacio-a-mano');

    expect(q('puc-vacio')).toBeNull();
    expect(q('puc-formulario')).not.toBeNull();
  });
});

describe('la semilla', () => {
  it('llama POST /puc/semilla, pinta el árbol y muestra sus pendientes de confirmar', async () => {
    pucMock.arbol.mockResolvedValueOnce([]).mockResolvedValue(ARBOL_SEMBRADO);
    pucMock.sembrar.mockResolvedValue({
      creadas: 99,
      existentes: 0,
      total: 99,
      codigosCreados: [],
    });

    await pintar();
    await click('puc-sembrar');

    expect(pucMock.sembrar).toHaveBeenCalledTimes(1);
    expect(q('puc-semilla-resultado')?.textContent).toContain('99');

    // El árbol, con la cuenta pendiente adentro.
    expect(q('puc-arbol')).not.toBeNull();
    expect(q('puc-nodo-1')).not.toBeNull();
    expect(q('puc-nodo-511580')).not.toBeNull();
    expect(q('puc-resumen')?.textContent).toContain('8 cuentas');

    // Y los pendientes, bien visibles, con lo que hay que hacer.
    const pendientes = q('puc-pendientes');
    expect(pendientes).not.toBeNull();
    expect(pendientes?.textContent).toContain('confirmar con tu contador');
    const fila = q('puc-pendiente-511580');
    expect(fila?.textContent).toContain('511580');
    expect(fila?.textContent).toContain('Gravamen a los movimientos financieros');
    expect(fila?.textContent).toContain('4x1000');
    expect(fila?.textContent).toContain('Editar');
    expect(fila?.textContent).toContain('Desactivar');

    // Con cuentas, se puede seguir al paso 5.
    expect(q('puc-continuar')?.getAttribute('href')).toBe('/panel/inmobiliaria/migracion/contables');

    // Y el mapeo de los asientos automáticos vive en este mismo paso.
    expect(q('puc-mapeo')).not.toBeNull();
    expect(q('mapeo-contable-embebido')).not.toBeNull();
  });

  it('dice qué pasó con el mapeo que se sembró junto con el plan', async () => {
    pucMock.arbol.mockResolvedValueOnce([]).mockResolvedValue(ARBOL_SEMBRADO);
    pucMock.sembrar.mockResolvedValue({
      creadas: 99,
      existentes: 0,
      total: 99,
      codigosCreados: [],
      mapeo: {
        asignados: ['RECIBO_BANCOS'],
        yaEstaban: [],
        sinCuenta: [{ evento: 'IVA_GENERADO', codigo: '240805' }, { evento: 'INGRESO_COMISION', codigo: '415510' }],
        mapeo: { eventos: [], completo: false, faltantes: ['IVA_GENERADO', 'INGRESO_COMISION'] },
      },
    });

    await pintar();
    await click('puc-sembrar');

    expect(q('puc-semilla-resultado')?.textContent).toContain('Faltan cuentas para 2 asientos automáticos');
  });

  it('sembrar dos veces no asusta: dice que ya estaba y no rompe nada', async () => {
    pucMock.arbol.mockResolvedValue(ARBOL_SEMBRADO);
    pucMock.sembrar.mockResolvedValue({ creadas: 0, existentes: 99, total: 99, codigosCreados: [] });

    await pintar();
    // Con cuentas ya no está el botón de sembrar: el plan existe.
    expect(q('puc-sembrar')).toBeNull();
    expect(q('puc-arbol')).not.toBeNull();
  });

  it('si la semilla falla, lo dice y deja el botón para reintentar', async () => {
    pucMock.arbol.mockResolvedValue([]);
    pucMock.sembrar.mockRejectedValue(new Error('Sólo el administrador o el contador pueden mover la contabilidad.'));

    await pintar();
    await click('puc-sembrar');

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('contador');
    expect(q('puc-sembrar')).not.toBeNull();
  });
});

describe('cuando la lectura falla', () => {
  it('🔴 no se disfraza de «no hay plan»: cartel con reintentar, sin invitación a sembrar', async () => {
    // Una caída de red acá NO puede pintar «Todavía no hay plan de cuentas»:
    // eso invita a sembrar (y a crear a mano) a alguien que quizás ya tiene
    // trescientas cuentas con movimientos que simplemente no pudimos leer.
    pucMock.arbol.mockRejectedValue(new Error('No pudimos conectarnos al servidor.'));

    await pintar();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('servidor');
    expect(q('puc-reintentar')).not.toBeNull();
    expect(q('puc-vacio')).toBeNull();
    expect(q('puc-sembrar')).toBeNull();
    expect(q('puc-continuar')).toBeNull();
  });

  it('reintentar relee y, con respuesta, pinta el árbol y limpia el cartel', async () => {
    pucMock.arbol
      .mockRejectedValueOnce(new Error('se cayó'))
      .mockResolvedValue(ARBOL_SEMBRADO);

    await pintar();
    await click('puc-reintentar');

    expect(q('puc-arbol')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(q('puc-reintentar')).toBeNull();
  });

  it('el reintento que vuelve a fallar no es un callejón: el botón sigue ahí', async () => {
    pucMock.arbol.mockRejectedValue(new Error('sigue caído'));

    await pintar();
    await click('puc-reintentar');

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('sigue caído');
    expect(q('puc-reintentar')).not.toBeNull();
    expect(q('puc-vacio')).toBeNull();
  });
});

describe('un pendiente que ya no está activo', () => {
  it('se muestra como desactivado, sin botones', async () => {
    const arbol = [
      cuenta('5', 'Gastos', {}, [
        cuenta('511580', 'Gravamen a los movimientos financieros', { activa: false }),
      ]),
    ];
    pucMock.arbol.mockResolvedValue(arbol);

    await pintar();

    const fila = q('puc-pendiente-511580');
    expect(fila?.textContent).toContain('Desactivada');
    expect(fila?.querySelectorAll('button')).toHaveLength(0);
  });
});

describe('editar dos cuentas seguidas', () => {
  it('🔴 abrir «Editar» en B con el formulario ya abierto en A NO manda los datos de A a B', async () => {
    // Auditoría 2026-09-01: el formulario se montaba sin `key` y sus useState
    // se inicializaban una sola vez; con A abierta, «Editar» en B cambiaba el
    // título pero el PATCH iba a B con nombre/naturaleza/activa de A.
    pucMock.arbol.mockResolvedValue(ARBOL_SEMBRADO);
    pucMock.semillaPendientes.mockResolvedValue({ total: 0, cuentas: [] });
    pucMock.actualizar.mockImplementation(async (id: string, cambios: Record<string, unknown>) => ({
      id, ...cambios,
    }));
    await pintar();

    const editar = (codigo: string) =>
      Array.from(container.querySelectorAll('button')).find((b) =>
        b.getAttribute('aria-label')?.startsWith(`Editar ${codigo} `),
      ) as HTMLButtonElement;

    await act(async () => editar('110505').click());
    expect((q('puc-nombre') as HTMLInputElement).value).toBe('Caja general');

    await act(async () => editar('511580').click());
    expect((q('puc-nombre') as HTMLInputElement).value).toBe('Gravamen a los movimientos financieros');

    // Un cambio en B guarda SOBRE B con los datos de B.
    const nombre = q('puc-nombre') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(nombre, 'GMF 4x1000');
      nombre.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => (q('puc-guardar') as HTMLButtonElement).click());

    expect(pucMock.actualizar).toHaveBeenCalledTimes(1);
    const [id, cambios] = pucMock.actualizar.mock.calls[0] as [string, { nombre?: string }];
    expect(id).toBe(ARBOL_SEMBRADO[1].hijas[0].hijas[0].hijas[0].id);
    expect(cambios.nombre).toBe('GMF 4x1000');
  });
});
