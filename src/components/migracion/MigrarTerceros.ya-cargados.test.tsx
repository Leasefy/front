/**
 * MigrarTerceros.ya-cargados.test.tsx — lo que ya subiste, a la vista.
 *
 * Nico, 01-10: «si yo ya subí el archivo y pasé a inquilinos y me quiero
 * devolver a propietarios, ¿por qué no me muestra esa información que ya subí?
 * E igual la opción de subir archivo, porque pues ya los subí: debería poder
 * verlos, quizás en una tabla con paginación, y hasta poder editarlos si
 * quiero y ver su información completa».
 *
 * Lo que se congela:
 *  1. Con personas ya creadas el paso abre con ELLAS, no con la subida.
 *  2. Subir otro archivo sigue a un clic, y se puede cancelar.
 *  3. Sin nadie, o sin poder leer la lista, la subida va abierta como siempre.
 *  4. El buscador mira la lista entera, no la página.
 *  5. Una fila abre la ficha completa; «Editar» usa el formulario de Propietarios.
 *  6. En inquilinos la fila abre el cajón de la pantalla Inquilinos (sin edición:
 *     el back todavía no la tiene).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Propietario } from '@/lib/types/inmobiliaria';
import type { Inquilino } from '@/lib/api/inquilinos.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, propietariosApi, estado, toast } = vi.hoisted(() => ({
  api: {
    plantilla: vi.fn(),
    lotesAbiertos: vi.fn(),
  },
  propietariosApi: {
    getById: vi.fn(),
    update: vi.fn(),
  },
  estado: {
    propietarios: [] as Propietario[],
    cargandoPropietarios: false,
    errorPropietarios: null as unknown,
    inquilinos: [] as Inquilino[],
    errorInquilinos: null as unknown,
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/ui/toast', () => ({ toast }));

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/migracion-terceros.service')>(
    '@/lib/api/migracion-terceros.service',
  );
  return { ...actual, migracionTercerosApi: api };
});

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmobiliaria.service')>(
    '@/lib/api/inmobiliaria.service',
  );
  return { ...actual, propietariosApi };
});

vi.mock('@/lib/hooks/useInmobiliaria', async () => {
  const actual = await vi.importActual<typeof import('@/lib/hooks/useInmobiliaria')>(
    '@/lib/hooks/useInmobiliaria',
  );
  return {
    ...actual,
    usePropietarios: () => ({
      propietarios: estado.propietarios,
      isLoading: estado.cargandoPropietarios,
      errorCrudo: estado.errorPropietarios,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

vi.mock('@/lib/hooks/use-inquilinos', () => ({
  useInquilinos: ({ buscar }: { buscar: string }) => ({
    // El back busca por nombre, correo y teléfono; acá basta el nombre.
    inquilinos: estado.inquilinos.filter((p) =>
      p.nombre.toLowerCase().includes(buscar.trim().toLowerCase()),
    ),
    cargando: false,
    error: estado.errorInquilinos,
    refrescar: vi.fn(),
    conteos: null,
  }),
}));

// El formulario y el cajón de inquilinos tienen sus propias pruebas: acá
// importa QUE se usen, no cómo se ven por dentro.
vi.mock('@/components/inmobiliaria/PropietarioForm', () => ({
  PropietarioForm: ({
    initialData,
    onSubmit,
  }: {
    initialData: Propietario;
    onSubmit: (d: unknown) => Promise<void>;
  }) => (
    <div data-testid="formulario-de-propietarios">
      editando a {initialData.name}
      <button type="button" onClick={() => void onSubmit({ name: 'Ana María Pérez' }).catch(() => {})}>
        Guardar
      </button>
    </div>
  ),
}));
vi.mock('@/components/inmobiliaria/PropietarioBankInfo', () => ({
  PropietarioBankInfo: () => <div data-testid="cuenta-del-propietario" />,
}));
vi.mock('@/components/inmobiliaria/InquilinoDrawer', async () => {
  const actual = await vi.importActual<typeof import('@/components/inmobiliaria/InquilinoDrawer')>(
    '@/components/inmobiliaria/InquilinoDrawer',
  );
  return {
    ...actual,
    InquilinoDrawer: ({ persona }: { persona: Inquilino | null }) =>
      persona ? <div data-testid="inquilino-cajon">{persona.nombre}</div> : null,
  };
});

import { MigrarTerceros } from './MigrarTerceros';

const PLANTILLA = {
  tipo: 'PROPIETARIO' as const,
  columnas: [{ campo: 'nombre', titulo: 'Nombre', obligatoria: true, ejemplo: 'Ana', alias: [] }],
};

function propietario(over: Partial<Propietario> = {}): Propietario {
  return {
    id: 'p-1',
    name: 'Ana Pérez',
    email: 'ana@correo.co',
    phone: '3001234567',
    documentType: 'CC',
    documentNumber: '80123456',
    bankAccount: {
      bank: 'BANCOLOMBIA',
      accountType: 'savings',
      accountNumber: '',
      accountHolder: 'Ana Pérez',
      ultimos4: '4321',
    },
    propertyCount: 2,
    activeLeases: 1,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    externalId: '050',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...over,
  } as Propietario;
}

function inquilino(over: Partial<Inquilino> = {}): Inquilino {
  return {
    tenantId: 't-1',
    nombre: 'John Jaime Mesa Cano',
    email: 'john@correo.co',
    telefono: '3013491000',
    documento: '48',
    arriendos: [],
    ...over,
  };
}

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  api.plantilla.mockResolvedValue(PLANTILLA);
  api.lotesAbiertos.mockResolvedValue([]);
  estado.propietarios = [];
  estado.cargandoPropietarios = false;
  estado.errorPropietarios = null;
  estado.inquilinos = [];
  estado.errorInquilinos = null;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  document.body.innerHTML = '';
});

async function pintar(tipo: 'PROPIETARIO' | 'INQUILINO' = 'PROPIETARIO') {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarTerceros tipoFijo={tipo} />);
  });
  await act(async () => {});
}

const q = (testid: string) => document.body.querySelector(`[data-testid="${testid}"]`);
const filas = () => [...document.body.querySelectorAll('[data-testid="ya-cargados-fila"]')];

async function clic(el: Element | null | undefined) {
  if (!el) throw new Error('no está el elemento a clickear');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

async function escribir(input: Element | null, texto: string) {
  if (!(input instanceof HTMLInputElement)) throw new Error('no está el campo');
  const asignar = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    asignar.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function boton(texto: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(texto),
  ) as HTMLButtonElement | undefined;
}

describe('propietarios ya cargados', () => {
  it('🔴 con personas ya creadas, el paso abre con ellas y no con la subida', async () => {
    estado.propietarios = [propietario(), propietario({ id: 'p-2', name: 'Beto Ríos', externalId: null })];
    await pintar();

    expect(q('ya-cargados')).not.toBeNull();
    expect(q('ya-cargados-resumen')?.textContent).toContain('2 propietarios');
    expect(filas().map((f) => f.textContent)).toEqual([
      expect.stringContaining('Ana Pérez'),
      expect.stringContaining('Beto Ríos'),
    ]);
    // Lo que trajo el archivo se ve en la fila: el código de su sistema y la cuenta.
    expect(filas()[0].textContent).toContain('050');
    expect(filas()[0].textContent).toContain('···4321');
    // Y lo que falta se dice igual en toda la tabla.
    expect(filas()[1].textContent).toContain('Sin registrar');

    expect(q('subida-de-terceros')).toBeNull();
    expect(q('dropzone-terceros')).toBeNull();
  });

  it('«Subir otro archivo» abre la subida, y «Cancelar» la vuelve a cerrar', async () => {
    estado.propietarios = [propietario()];
    await pintar();

    await clic(q('subir-otro-archivo'));
    expect(q('subida-de-terceros')).not.toBeNull();
    expect(q('subida-de-terceros')?.textContent).toContain('Otro archivo de propietarios');
    expect(q('dropzone-terceros')).not.toBeNull();
    // Con la subida abierta, el botón sobra.
    expect(q('subir-otro-archivo')).toBeNull();

    await clic(q('cancelar-subida'));
    expect(q('subida-de-terceros')).toBeNull();
    expect(q('subir-otro-archivo')).not.toBeNull();
  });

  it('sin nadie cargado, el paso abre en la subida como siempre', async () => {
    await pintar();

    expect(q('ya-cargados')).toBeNull();
    expect(q('dropzone-terceros')).not.toBeNull();
    expect(q('subida-de-terceros')?.textContent).toContain('El archivo de propietarios');
    expect(q('cancelar-subida')).toBeNull();
  });

  it('🔴 si la lista no se pudo leer, la subida NO se esconde', async () => {
    estado.errorPropietarios = new Error('sin red');
    await pintar();

    expect(q('subida-de-terceros')).not.toBeNull();
    expect(q('fallo-de-carga')).not.toBeNull();
  });

  it('el buscador mira la lista entera, no la página que se ve', async () => {
    estado.propietarios = Array.from({ length: 12 }, (_, i) =>
      propietario({ id: `p-${i}`, name: `Propietario ${String(i).padStart(2, '0')}` }),
    );
    estado.propietarios.push(propietario({ id: 'p-z', name: 'Zuleta Gómez' }));
    await pintar();

    // 13 personas, 10 por página: Zuleta queda en la segunda.
    expect(filas()).toHaveLength(10);
    expect(filas().some((f) => f.textContent?.includes('Zuleta'))).toBe(false);

    await escribir(q('ya-cargados-buscar')?.querySelector('input') ?? q('ya-cargados-buscar'), 'zuleta');
    expect(filas()).toHaveLength(1);
    expect(filas()[0].textContent).toContain('Zuleta Gómez');
  });

  it('las fichas que nacieron incompletas se cuentan arriba y se marcan en su fila', async () => {
    estado.propietarios = [
      propietario({ documentNumber: null, documentType: null, datosPendientes: ['documento', 'tipoDocumento'] }),
      propietario({ id: 'p-2', name: 'Beto Ríos' }),
    ];
    await pintar();

    expect(q('ya-cargados-resumen')?.textContent).toContain('1 con datos por completar');
    expect(filas()[0].querySelector('[data-testid="datos-por-completar"]')).not.toBeNull();
  });

  it('🔴 una fila abre la ficha COMPLETA, y «Editar» usa el formulario de Propietarios', async () => {
    estado.propietarios = [propietario()];
    // La ficha (`GET :id`) trae lo que la lista no: la nota del archivo, el perfil tributario.
    propietariosApi.getById.mockResolvedValue(
      propietario({ notes: 'Otro teléfono: 604 444 5555', responsableIva: true }),
    );
    propietariosApi.update.mockResolvedValue(propietario({ name: 'Ana María Pérez' }));
    await pintar();

    await clic(filas()[0]);
    expect(propietariosApi.getById).toHaveBeenCalledWith('p-1');
    const ficha = q('ficha-lectura');
    expect(ficha?.textContent).toContain('Código en tu sistema');
    expect(ficha?.textContent).toContain('050');
    expect(ficha?.textContent).toContain('Otro teléfono: 604 444 5555');
    expect(ficha?.textContent).toContain('Cédula de ciudadanía');

    await clic(q('ficha-editar'));
    expect(q('formulario-de-propietarios')?.textContent).toContain('editando a Ana Pérez');

    await clic(boton('Guardar'));
    expect(propietariosApi.update).toHaveBeenCalledWith('p-1', { name: 'Ana María Pérez' });
    expect(toast.success).toHaveBeenCalled();
    // Guardado, vuelve a la lectura con la ficha pedida de nuevo.
    expect(q('formulario-de-propietarios')).toBeNull();
    expect(propietariosApi.getById).toHaveBeenCalledTimes(2);
  });
});

describe('inquilinos ya cargados', () => {
  it('🔴 la fila abre el mismo cajón de la pantalla Inquilinos', async () => {
    estado.inquilinos = [inquilino()];
    await pintar('INQUILINO');

    expect(q('subida-de-terceros')).toBeNull();
    expect(q('ya-cargados-resumen')?.textContent).toContain('1 inquilino');
    // Sin edición en el back, no se promete.
    expect(q('ya-cargados-resumen')?.textContent).not.toContain('editarla');
    expect(filas()[0].textContent).toContain('Sin contrato');

    await clic(filas()[0]);
    expect(q('inquilino-cajon')?.textContent).toContain('John Jaime Mesa Cano');
  });

  it('buscar sin resultados no esconde la tabla ni abre la subida', async () => {
    estado.inquilinos = [inquilino()];
    await pintar('INQUILINO');

    await escribir(q('ya-cargados-buscar')?.querySelector('input') ?? q('ya-cargados-buscar'), 'nadie');
    expect(q('ya-cargados')).not.toBeNull();
    expect(q('ya-cargados-sin-coincidencias')?.textContent).toContain('«nadie»');
    expect(q('subida-de-terceros')).toBeNull();
  });
});
