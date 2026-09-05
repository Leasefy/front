/**
 * page.test.tsx — la ficha del propietario hace lo que dice.
 *
 * Nico (2026-09-02 13:09): «Nueva consignación» decía «Próximamente»; arriba
 * no había navegación clara ni forma de volver a donde se entró; «Generar
 * extracto» y «Exportar datos» no hacían nada. Y por debajo, Editar / Eliminar
 * / Notas iban contra un `setTimeout`: cartel verde, nada guardado.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Propietario } from '@/lib/types/inmobiliaria';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { push, refetch, api, exportar, toast, nav } = vi.hoisted(() => ({
  push: vi.fn(),
  refetch: vi.fn(async () => undefined),
  // `extractosDe`: la ficha ahora lista las huellas del extracto (sección propia, probada aparte).
  api: { update: vi.fn(), delete: vi.fn(), extractosDe: vi.fn(async () => []) },
  exportar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  nav: { volver: null as string | null },
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'p1' }),
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'volver' ? nav.volver : null) }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
    locale: 'es',
  }),
}));

vi.mock('sonner', () => ({ toast }));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  motion: {
    div: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _h, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) =>
      React.createElement('div', props, children),
  },
}));

vi.mock('@leasefy/cadence', () => ({
  SegmentedControl: ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: React.ReactNode }[] }) =>
    React.createElement(
      'div',
      null,
      options.map((o) =>
        React.createElement('button', { key: o.value, 'data-testid': `tab-${o.value}`, 'aria-pressed': value === o.value, onClick: () => onChange(o.value) }, o.label),
      ),
    ),
  IconButton: ({ icon, ...props }: Record<string, unknown> & { icon?: React.ReactNode }) => React.createElement('button', props, icon),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, size, hideArrow, asChild, isLoading, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void variant; void size; void hideArrow; void asChild; void isLoading;
    return React.createElement('button', props, children);
  },
}));
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => React.createElement('textarea', props),
}));
vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
}));
vi.mock('@/components/ui/back-button', () => ({
  BackButton: ({ href, label }: { href: string; label: string }) =>
    React.createElement('a', { href, 'data-testid': 'volver' }, label),
}));
// El menú se aplana: cada ítem es un botón que dispara `onSelect`.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownList: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  DropdownListTrigger: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  DropdownListContent: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { role: 'menu' }, children),
  DropdownListItem: ({ children, onSelect, disabled, className: _c, ...props }: Record<string, unknown> & { children?: React.ReactNode; onSelect?: () => void; disabled?: boolean }) =>
    React.createElement('button', { ...props, disabled, onClick: () => onSelect?.() }, children),
  DropdownListSeparator: () => React.createElement('hr'),
}));

/*
 * Los dos componentes de estado, aplanados. No se mockean por comodidad: el
 * de verdad importa `Spinner` desde el barril `@/components/ui`, que arrastra
 * el `Accordion` de cadence —mockeado acá al mínimo— y el archivo entero no
 * carga. El ORDEN de los cuatro estados (carga → fallo → vacío → datos) tiene
 * su propio test en `components/estado/EstadoDeDatos.test.tsx`; lo que estos
 * dobles conservan es lo único que esta pantalla decide: QUÉ le pasa a cada
 * uno.
 */
vi.mock('@/components/estado/EstadoDeDatos', () => ({
  EstadoDeDatos: ({
    cargando,
    error,
    vacio,
    cuandoVacio,
    queEs,
    onReintentar,
    children,
  }: {
    cargando?: boolean;
    error?: unknown;
    vacio?: boolean;
    cuandoVacio?: React.ReactNode;
    queEs?: string;
    onReintentar?: () => void;
    children?: React.ReactNode;
  }) => {
    if (cargando) return React.createElement('div', { 'data-testid': `cargando:${queEs}` });
    if (error)
      return React.createElement(
        'button',
        { 'data-testid': `fallo:${queEs}`, onClick: () => onReintentar?.() },
        String((error as Error)?.message ?? error),
      );
    if (vacio) return React.createElement(React.Fragment, null, cuandoVacio);
    return React.createElement(React.Fragment, null, children);
  },
}));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error, queEs }: { error: unknown; queEs?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': `fallo:${queEs}` },
      String((error as Error)?.message ?? error),
    ),
}));

vi.mock('@/components/inmobiliaria', () => ({
  PropietarioStats: () => React.createElement('div', { 'data-testid': 'stats' }),
  PropietarioBankInfo: ({ onEdit }: { onEdit?: () => void }) => React.createElement('button', { 'data-testid': 'editar-banco', onClick: onEdit }),
  PropietarioForm: ({ onSubmit }: { onSubmit: (d: unknown) => void }) =>
    React.createElement('button', { 'data-testid': 'form-guardar', onClick: () => onSubmit({ name: 'Nuevo nombre', email: 'x@y.z', phone: '1', documentType: 'CC', documentNumber: '9', bankCode: '', accountType: '', accountNumber: '', accountHolder: '' }) }, 'guardar'),
}));
vi.mock('@/components/inmobiliaria/ExtractoDelPropietarioDialog', () => ({
  ExtractoDelPropietarioDialog: ({ abierto, propietarioId }: { abierto: boolean; propietarioId: string }) =>
    abierto ? React.createElement('div', { 'data-testid': 'extracto-dialog' }, propietarioId) : null,
}));

const datos = vi.hoisted(() => ({
  propietario: null as Propietario | null,
  errorPropietario: null as unknown,
  consignaciones: [] as unknown[],
  errorConsignaciones: null as unknown,
  dispersiones: [] as unknown[],
  errorDispersiones: null as unknown,
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietario: () => ({
    propietario: datos.propietario,
    isLoading: false,
    errorCrudo: datos.errorPropietario,
    refetch,
  }),
  useConsignaciones: () => ({
    consignaciones: datos.consignaciones,
    isLoading: false,
    errorCrudo: datos.errorConsignaciones,
    refetch: vi.fn(),
  }),
  useDispersiones: () => ({
    dispersiones: datos.dispersiones,
    isLoading: false,
    errorCrudo: datos.errorDispersiones,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: api }));
vi.mock('@/lib/propietarios/exportar-datos', () => ({ descargarDatosDelPropietario: exportar }));

import PropietarioDetailPage from './page';

const PROPIETARIO: Propietario = {
  id: 'p1',
  name: 'NICOLAS EDUARDO GARCIA ARDILA',
  email: 'n@tikin.op',
  phone: '3116778899',
  documentType: 'CC',
  documentNumber: '1036656397',
  bankAccount: { bank: 'falabella', accountType: 'savings', accountNumber: '8989', accountHolder: 'NICOLAS' },
  propertyCount: 0,
  activeLeases: 0,
  totalMonthlyRent: 0,
  pendingBalance: 0,
  createdAt: '2026-09-02T18:00:00.000Z',
  updatedAt: '2026-09-02T18:00:00.000Z',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  datos.propietario = PROPIETARIO;
  datos.errorPropietario = null;
  datos.consignaciones = [];
  datos.errorConsignaciones = null;
  datos.dispersiones = [];
  datos.errorDispersiones = null;
  nav.volver = null;
  api.update.mockResolvedValue({ ...PROPIETARIO, name: 'Nuevo nombre' });
  api.delete.mockResolvedValue(undefined);
  exportar.mockResolvedValue('propietario-nicolas-2026-09-02.xlsx');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

async function render() {
  await act(async () => {
    root.render(React.createElement(PropietarioDetailPage));
  });
}

// Los modales se montan con un portal en `document.body`: se busca en el documento.
function click(testId: string) {
  const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`no está ${testId}`);
  return act(async () => {
    el.click();
  });
}

describe('Volver — a donde se entró', () => {
  it('sin ?volver lleva a la lista y lo dice', async () => {
    await render();
    const a = container.querySelector<HTMLAnchorElement>('[data-testid="volver"]')!;
    expect(a.getAttribute('href')).toBe('/panel/inmobiliaria/propietarios');
    expect(a.textContent).toBe('inmobiliaria.propietarios.detail.backTo.lista');
  });

  it('con ?volver al contrato vuelve al contrato, y lo nombra', async () => {
    nav.volver = '/panel/inmobiliaria/contratos/c1';
    await render();
    const a = container.querySelector<HTMLAnchorElement>('[data-testid="volver"]')!;
    expect(a.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/c1');
    expect(a.textContent).toBe('inmobiliaria.propietarios.detail.backTo.contrato');
  });

  it('un ?volver fuera del panel se ignora', async () => {
    nav.volver = 'https://evil.example/x';
    await render();
    expect(container.querySelector('[data-testid="volver"]')!.getAttribute('href')).toBe('/panel/inmobiliaria/propietarios');
  });
});

describe('Nueva consignación', () => {
  it('abre el asistente con este propietario ya elegido y vuelve acá al terminar', async () => {
    await render();
    await click('nueva-consignacion');
    expect(push).toHaveBeenCalledWith(
      '/panel/inmobiliaria/inmuebles/nuevo?propietarioId=p1&volver=%2Fpanel%2Finmobiliaria%2Fpropietarios%2Fp1',
    );
    expect(toast.info).not.toHaveBeenCalled();
  });
});

describe('Menú de acciones', () => {
  it('«Generar extracto» abre el extracto de este propietario', async () => {
    await render();
    expect(container.querySelector('[data-testid="extracto-dialog"]')).toBeNull();
    await click('accion-extracto');
    expect(container.querySelector('[data-testid="extracto-dialog"]')!.textContent).toBe('p1');
  });

  it('«Exportar datos» baja el Excel con lo que la ficha muestra', async () => {
    datos.consignaciones = [{ id: 'c1' }];
    datos.dispersiones = [{ id: 'd1' }];
    await render();
    await click('accion-exportar');
    expect(exportar).toHaveBeenCalledWith(PROPIETARIO, [{ id: 'c1' }], [{ id: 'd1' }]);
    expect(toast.success).toHaveBeenCalledWith(
      'inmobiliaria.propietarios.detail.exportDone',
      expect.objectContaining({ description: 'inmobiliaria.propietarios.detail.exportDoneDesc(propietario-nicolas-2026-09-02.xlsx)' }),
    );
  });

  it('si la exportación falla, lo dice y no dice «exportado»', async () => {
    exportar.mockRejectedValueOnce(new Error('sin memoria'));
    await render();
    await click('accion-exportar');
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietarios.detail.exportError', { description: 'sin memoria' });
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('Editar, notas y eliminar — contra el back, no contra un setTimeout', () => {
  it('Editar guarda por la API y vuelve a leer la ficha', async () => {
    await render();
    await click('editar-banco');
    await click('form-guardar');
    expect(api.update).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Nuevo nombre' }));
    expect(refetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('inmobiliaria.propietarios.toasts.updated');
  });

  it('si el back rechaza la edición, no dice «actualizado»', async () => {
    api.update.mockRejectedValueOnce(new Error('documento repetido'));
    await render();
    await click('editar-banco');
    await click('form-guardar');
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietarios.toasts.updateError', { description: 'documento repetido' });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('Eliminar borra por la API y vuelve a la lista', async () => {
    await render();
    await click('accion-eliminar');
    const borrar = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'inmobiliaria.common.delete' && !b.hasAttribute('data-testid'))!;
    await act(async () => {
      borrar.click();
    });
    expect(api.delete).toHaveBeenCalledWith('p1');
    expect(push).toHaveBeenCalledWith('/panel/inmobiliaria/propietarios');
  });

  it('si no se puede borrar, se queda y dice por qué', async () => {
    api.delete.mockRejectedValueOnce(new Error('tiene inmuebles consignados'));
    await render();
    await click('accion-eliminar');
    const borrar = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'inmobiliaria.common.delete' && !b.hasAttribute('data-testid'))!;
    await act(async () => {
      borrar.click();
    });
    expect(push).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietarios.toasts.deleteError', { description: 'tiene inmuebles consignados' });
  });
});

/**
 * 🔴 Fallar al leer no es lo mismo que no existir, ni que no tener nada.
 *
 * Los tres casos de abajo se veían EXACTAMENTE iguales a la verdad: la ficha
 * decía «este propietario no existe», la pestaña decía «no tiene inmuebles
 * consignados» y el Excel bajaba con la hoja Inmuebles vacía. Ninguno se caía,
 * ninguno avisaba, y los tres son afirmaciones que nadie verificó.
 */
describe('Un fallo de carga se dice, no se disfraza', () => {
  it('si la ficha no se pudo leer, NO dice «propietario no encontrado»', async () => {
    datos.propietario = null;
    datos.errorPropietario = new Error('502 Bad Gateway');
    await render();

    expect(container.querySelector('[data-testid="fallo:el propietario"]')).not.toBeNull();
    expect(container.textContent).not.toContain('inmobiliaria.propietarios.notFound');
    // El camino de vuelta sigue estando: quedarse encerrado tampoco sirve.
    expect(container.querySelector('[data-testid="volver"]')).not.toBeNull();
  });

  it('un 404 sí es «no existe», y ahí el cartel lo dice sin ofrecer reintentar', async () => {
    // `FalloDeCarga` clasifica: acá lo que se fija es que la ficha le entrega
    // el error entero en vez de tragárselo.
    datos.propietario = null;
    datos.errorPropietario = Object.assign(new Error('Not Found'), { status: 404 });
    await render();
    expect(container.querySelector('[data-testid="fallo:el propietario"]')).not.toBeNull();
  });

  it('si los inmuebles no se pudieron leer, la pestaña no dice «no tiene ninguno»', async () => {
    datos.errorConsignaciones = new Error('timeout');
    await render();

    expect(container.querySelector('[data-testid="fallo:los inmuebles de este propietario"]')).not.toBeNull();
    expect(container.textContent).not.toContain('inmobiliaria.propietarios.detail.noProperties');
  });

  it('el contador de la pestaña no muestra 0 sobre una lectura que falló', async () => {
    datos.errorConsignaciones = new Error('timeout');
    datos.errorDispersiones = new Error('timeout');
    await render();

    const inmuebles = container.querySelector('[data-testid="tab-properties"]')!;
    const giros = container.querySelector('[data-testid="tab-payments"]')!;
    expect(inmuebles.textContent).toBe('inmobiliaria.propietarios.detail.properties');
    expect(giros.textContent).toBe('inmobiliaria.propietarios.detail.payments');
  });

  it('si los giros no se pudieron leer, la pestaña de pagos lo dice', async () => {
    datos.errorDispersiones = new Error('500');
    await render();
    await click('tab-payments');
    expect(container.querySelector('[data-testid="fallo:los giros a este propietario"]')).not.toBeNull();
    expect(container.textContent).not.toContain('inmobiliaria.propietarios.detail.noPayments');
  });

  it('no exporta un Excel al que le falta una hoja entera', async () => {
    datos.consignaciones = [{ id: 'c1' }];
    datos.errorDispersiones = new Error('500');
    await render();
    await click('accion-exportar');

    expect(exportar).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietarios.detail.exportError', {
      description: 'inmobiliaria.propietarios.detail.exportIncompleto',
    });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
