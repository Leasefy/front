/**
 * seguimiento.test.tsx — la ficha del propietario con lo que el back ya manda
 * (SEGUIMIENTO-FRONT, 03-10-2026; back 5731a4e2). La preparación es la de
 * `page.test.tsx`, copiada para no tocar ese archivo.
 *
 *  · «Editar» abre el CAJÓN de «Nuevo propietario», no un modal (Nico, 03-10).
 *  · `?cambiarCuenta=1` abre «Cambiar cuenta» (P-14), y «Cambiar cuenta» desde
 *    el cajón también.
 *  · P-06: el NIT con su dígito de verificación.
 *  · P-02: en copropiedad, cada tarjeta dice SU parte del canon del contrato.
 *
 * (Lo que sigue es la cabecera de `page.test.tsx`.)
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
import { ApiError } from '@/lib/api/client';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { push, refetch, api, exportar, toast, nav, replace } = vi.hoisted(() => ({
  push: vi.fn(),
  refetch: vi.fn(async () => undefined),
  // `extractosDe`: la ficha ahora lista las huellas del extracto (sección propia, probada aparte).
  api: { update: vi.fn(), delete: vi.fn(), extractosDe: vi.fn(async () => []) },
  exportar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  nav: { volver: null as string | null, cambiarCuenta: null as string | null },
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'p1' }),
  useRouter: () => ({ push, back: vi.fn(), replace }),
  useSearchParams: () => ({
    get: (k: string) => (k === 'volver' ? nav.volver : k === 'cambiarCuenta' ? nav.cambiarCuenta : null),
    toString: () =>
      [nav.volver ? `volver=${encodeURIComponent(nav.volver)}` : null, nav.cambiarCuenta ? `cambiarCuenta=${nav.cambiarCuenta}` : null]
        .filter(Boolean)
        .join('&'),
  }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

/* Todo permitido salvo lo que el test niegue (`propietarios:edit`, …). */
const permisos = vi.hoisted(() => ({ negadas: new Set<string>() }));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isLoading: false,
    canAccess: (m: string, a: string) => !permisos.negadas.has(`${m}:${a}`),
  }),
}));

/*
 * El aviso de invitar se prueba aparte (`InvitarAlPortal.test.tsx`). Acá sólo
 * importa CUÁNDO se monta, con qué datos, y qué pasa en la ficha al invitar:
 * el doble invita con un clic. El botón de mensaje y el interruptor de
 * WhatsApp publican a quién apuntan.
 */
vi.mock('@/components/inmobiliaria/InvitarAlPortal', () => ({
  InvitarAlPortal: ({
    propietarioId,
    correo,
    onInvitado,
    sinEntregar,
    onSinEntregar,
  }: {
    propietarioId: string;
    correo?: string | null;
    onInvitado: (cuenta: string) => void;
    sinEntregar?: { motivo?: string } | null;
    onSinEntregar?: (s: { motivo?: string } | null) => void;
  }) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement('button', {
        'data-testid': 'invitar-al-portal',
        'data-propietario': propietarioId,
        'data-correo': correo ?? '',
        'data-sin-entregar': sinEntregar?.motivo ?? '',
        onClick: () => onInvitado('user-nuevo'),
      }),
      // P-24: el back crea la cuenta pero el correo no sale.
      React.createElement('button', {
        'data-testid': 'invitar-sin-entregar',
        onClick: () => {
          onInvitado('user-nuevo');
          onSinEntregar?.({ motivo: 'DOMINIO_NO_ENTREGABLE' });
        },
      }),
    ),
}));
vi.mock('@/components/messages/BotonEnviarMensaje', () => ({
  BotonEnviarMensaje: ({ counterpartId }: { counterpartId: string }) =>
    React.createElement('div', { 'data-testid': 'enviar-mensaje', 'data-para': counterpartId }),
}));
vi.mock('@/components/messages/InterruptorDeWhatsapp', () => ({
  InterruptorDeWhatsapp: () => null,
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

// La ficha del propietario ahora incluye el cambio de cuenta bancaria, que usa
// los diálogos de Cadence: el mock parcial tenía que dejar pasar el resto del
// paquete o la pantalla entera se caía al importar `ui/dialog`.
vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
  // Sin `onEdit` la tarjeta real no dibuja el botón: el doble tampoco.
  PropietarioBankInfo: ({ onEdit }: { onEdit?: () => void }) =>
    onEdit ? React.createElement('button', { 'data-testid': 'editar-banco', onClick: onEdit }) : null,
  // Publica el error por campo que recibió (`serverError`) y TODOS (`serverErrors`).
  PropietarioForm: ({ onSubmit, serverError, serverErrors, onCambiarCuenta, accionesAfuera, idDelFormulario }: { onSubmit: (d: unknown) => void; serverError?: { field: string; message: string } | null; serverErrors?: Record<string, string> | null; onCambiarCuenta?: () => void; accionesAfuera?: boolean; idDelFormulario?: string }) =>
    React.createElement(React.Fragment, null,
    onCambiarCuenta ? React.createElement('button', { 'data-testid': 'form-cambiar-cuenta', onClick: onCambiarCuenta }, 'cambiar cuenta') : null,
    React.createElement('span', { 'data-testid': 'form-props', 'data-acciones-afuera': String(Boolean(accionesAfuera)), 'data-id': idDelFormulario ?? '' }),
    React.createElement('button', { 'data-testid': 'form-guardar', 'data-error-campo': serverError?.field ?? '', 'data-error-mensaje': serverError?.message ?? '', 'data-errores': JSON.stringify(serverErrors ?? {}), onClick: () => onSubmit({ name: 'Nuevo nombre', email: 'x@y.z', phone: '1', documentType: 'CC', documentNumber: '9', bankCode: '', accountType: '', accountNumber: '', accountHolder: '' }) }, 'guardar')),
}));
// La sección tiene sus propias pruebas; acá sólo importa qué recibe.
vi.mock('@/components/inmobiliaria/deducciones/DeduccionesDelPropietario', () => ({
  DeduccionesDelPropietario: ({ propietarioId, inmuebles }: { propietarioId: string; inmuebles: { consignacionId: string; titulo: string }[] }) =>
    React.createElement('div', { 'data-testid': 'seccion-deducciones', 'data-propietario': propietarioId }, inmuebles.map((i) => `${i.consignacionId}:${i.titulo}`).join('|')),
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
vi.mock('@/components/inmobiliaria/mandato/CambioDeCuentaBancaria', () => ({
  CambioDeCuentaBancaria: ({ pedirCambio }: { pedirCambio?: number }) =>
    React.createElement('div', { 'data-testid': 'cambio-de-cuenta', 'data-pedidos': String(pedirCambio ?? 0) }),
}));
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
  nav.cambiarCuenta = null;
  permisos.negadas.clear();
  api.update.mockResolvedValue({ ...PROPIETARIO, name: 'Nuevo nombre' });
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

function botonEditar() {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent === 'inmobiliaria.propietarios.edit',
  );
}

const pedidosDeCambio = () =>
  Number(document.querySelector('[data-testid="cambio-de-cuenta"]')?.getAttribute('data-pedidos') ?? '-1');

describe('«Editar» de la ficha — el cajón de «Nuevo propietario», no un modal (Nico, 03-10)', () => {
  it('🔴 abre el cajón del propietario con el formulario adentro y el pie que lo manda', async () => {
    await render();
    await act(async () => {
      botonEditar()!.click();
    });
    const cajon = document.querySelector('[data-testid="cajon-del-propietario"]');
    expect(cajon).not.toBeNull();
    expect(cajon!.querySelector('[data-testid="form-guardar"]')).not.toBeNull();
    // El formulario va sin su fila de botones: los pone el pie fijo del cajón.
    const props = cajon!.querySelector('[data-testid="form-props"]')!;
    expect(props.getAttribute('data-acciones-afuera')).toBe('true');
    const guardar = cajon!.querySelector('[data-testid="guardar-propietario"]')!;
    expect(guardar.getAttribute('form')).toBe(props.getAttribute('data-id'));
  });

  it('«Cambiar cuenta» desde el cajón cierra la edición y pide el cambio controlado aquí mismo', async () => {
    await render();
    expect(pedidosDeCambio()).toBe(0);
    await act(async () => {
      botonEditar()!.click();
    });
    await act(async () => {
      document.querySelector<HTMLElement>('[data-testid="form-cambiar-cuenta"]')!.click();
    });
    expect(pedidosDeCambio()).toBe(1);
  });
});

describe('`?cambiarCuenta=1` (P-14)', () => {
  it('🔴 abre «Cambiar cuenta» una vez y quita el parámetro de la URL', async () => {
    nav.cambiarCuenta = '1';
    nav.volver = '/panel/inmobiliaria/propietarios';
    await render();
    expect(pedidosDeCambio()).toBe(1);
    expect(replace).toHaveBeenCalledWith(
      '/panel/inmobiliaria/propietarios/p1?volver=%2Fpanel%2Finmobiliaria%2Fpropietarios',
      { scroll: false },
    );
  });

  it('sin `propietarios:edit` no pide nada (el back lo negaría), pero igual limpia la URL', async () => {
    nav.cambiarCuenta = '1';
    permisos.negadas.add('propietarios:edit');
    await render();
    expect(pedidosDeCambio()).toBe(0);
    expect(replace).toHaveBeenCalledWith('/panel/inmobiliaria/propietarios/p1', { scroll: false });
  });

  it('sin el parámetro no abre nada', async () => {
    await render();
    expect(pedidosDeCambio()).toBe(0);
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('P-06 — el NIT con su dígito de verificación', () => {
  it('🔴 «NIT 900555006-0», con el DV que calcula el back', async () => {
    datos.propietario = { ...PROPIETARIO, documentType: 'NIT', documentNumber: '900555006', digitoDeVerificacion: 0 };
    await render();
    expect(container.querySelector('[data-testid="propietario-chips"]')!.textContent).toContain('NIT 900555006-0');
  });

  it('una cédula sigue igual', async () => {
    await render();
    expect(container.querySelector('[data-testid="propietario-chips"]')!.textContent).toContain('CC 1036656397');
  });
});

describe('P-02 — en copropiedad, cada tarjeta dice SU parte', () => {
  const consignacion = {
    id: 'c1',
    propertyTitle: 'Calle 7 # 39-215',
    propertyAddress: 'Calle 7 # 39-215',
    availability: 'rented',
    listingType: 'rent',
    monthlyRent: 2_650_000,
    commissionPercent: 10,
    copropietarios: [
      { propietarioId: 'p1', participacionBps: 5000 },
      { propietarioId: 'p2', participacionBps: 5000 },
    ],
  };

  it('🔴 «$1.325.000 · su parte de $2.650.000», no el canon entero', async () => {
    datos.consignaciones = [consignacion];
    datos.propietario = {
      ...PROPIETARIO,
      inmuebles: [
        {
          consignacionId: 'c1',
          propertyId: 'x',
          propertyTitle: 'Calle 7 # 39-215',
          propertyAddress: 'Calle 7 # 39-215',
          esPrincipal: false,
          participacionBps: 5000,
          arrendado: true,
          contratoId: 'k1',
          canonDelContratoCop: 2_650_000,
          comisionPorcentaje: 10,
          canonCop: 1_325_000,
          comisionCop: 132_500,
          netoCop: 1_192_500,
        },
      ],
    };
    await render();
    const parte = container.querySelector('[data-testid="su-parte-del-canon"]')!;
    expect(parte).not.toBeNull();
    expect(parte.textContent).toContain('$1.325.000');
    expect(parte.textContent).toContain('inmobiliaria.propietarios.detail.suParteDe($2.650.000)');
  });

  it('sin `inmuebles` (un back anterior) queda el canon del mandato, como antes', async () => {
    datos.consignaciones = [consignacion];
    await render();
    expect(container.querySelector('[data-testid="su-parte-del-canon"]')).toBeNull();
    expect(container.textContent).toContain('$2.650.000');
  });
});
