/**
 * cajon-y-plata.test.tsx — la lista de Propietarios, QA de Propietarios (03-10-2026).
 *
 * Nico (03-10): «la experiencia de nuevo propietario debería ser en un drawer y
 * no en un modal… y el de crear con IA sigue en modal». Nuevo, Crear con IA y
 * Editar van en el CAJÓN; Eliminar sigue siendo un diálogo (es una
 * confirmación).
 * P-12 · el pie («Cancelar / Crear propietario») va FUERA del cuerpo que se
 *        desplaza: siempre se ve entero.
 * P-21 · los KPI de plata no dicen «$0» ni «Al día» a quien no la ve.
 * P-08 · «1 propietario». P-26 · «1 inmueble consignado».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { estado, api, toast, tabla } = vi.hoisted(() => ({
  estado: { lista: [] as Propietario[] },
  api: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), getById: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  tabla: { plataOculta: undefined as boolean | undefined },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
    formatCurrency: (n: number) => String(n),
  }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ isLoading: false, canAccess: () => true }),
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({ propietarios: estado.lista, isLoading: false, errorCrudo: null, refetch: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({ useMigracionConDeuda: () => null }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: api }));
vi.mock('@/lib/propietarios/exportar-datos', () => ({ descargarListaDePropietarios: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/components/ui/toast', () => ({ toast }));
vi.mock('@/components/inmobiliaria/TerceroIACapture', () => ({
  TerceroIACapture: () => <p data-testid="captura-con-ia" />,
}));

const DATOS: PropietarioFormData = {
  name: 'Ana Gómez',
  email: '',
  phone: '',
  documentType: 'CC',
  documentNumber: '1020304050',
  bankCode: '',
  accountType: '',
  accountNumber: '',
  accountHolder: '',
};

/*
 * El formulario se reduce a lo que importa acá: DÓNDE queda (en el cuerpo del
 * cajón), con qué `id` (el que nombra el botón del pie) y si trae botones.
 */
vi.mock('@/components/inmobiliaria', () => ({
  PropietarioCard: () => null,
  PropietarioTable: ({
    propietarios,
    onEdit,
    onDelete,
    plataOculta,
  }: {
    propietarios: Propietario[];
    onEdit: (p: Propietario) => void;
    onDelete: (p: Propietario) => void;
    plataOculta?: boolean;
  }) => {
    tabla.plataOculta = plataOculta;
    return (
      <div>
        {propietarios.map((p) => (
          <span key={p.id}>
            <button data-testid={`editar-${p.id}`} onClick={() => onEdit(p)} />
            <button data-testid={`eliminar-${p.id}`} onClick={() => onDelete(p)} />
          </span>
        ))}
      </div>
    );
  },
  PropietarioForm: ({
    mode,
    onSubmit,
    accionesAfuera,
    idDelFormulario,
  }: {
    mode: string;
    onSubmit: (d: PropietarioFormData) => Promise<void>;
    accionesAfuera?: boolean;
    idDelFormulario?: string;
  }) => (
    <form
      id={idDelFormulario}
      data-testid={`form-${mode}`}
      data-acciones-afuera={String(Boolean(accionesAfuera))}
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(DATOS).catch(() => undefined);
      }}
    />
  ),
}));

import PropietariosPage from './page';

function unPropietario(over: Partial<Propietario> = {}): Propietario {
  return {
    id: 'p1',
    name: 'Ana Gómez',
    email: 'ana@ejemplo.co',
    phone: '3001234567',
    documentType: 'CC',
    documentNumber: '1020304050',
    propertyCount: 0,
    activeLeases: 0,
    totalMonthlyRent: 2_000_000,
    pendingBalance: 0,
    cuentaDePortalId: null,
    bankAccount: { bank: '', accountType: 'savings', accountNumber: '', accountHolder: '' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as Propietario;
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<PropietariosPage />);
  });
}

const $ = (testId: string) => document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

async function clic(el: HTMLElement | null) {
  if (!el) throw new Error('no está el elemento');
  await act(async () => {
    el.click();
  });
}

function botonConTexto(texto: string) {
  return (
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === texto) ??
    null
  );
}

beforeEach(() => {
  estado.lista = [];
  tabla.plataOculta = undefined;
  Object.values(api).forEach((f) => f.mockReset());
  api.getById.mockImplementation(async (id: string) => estado.lista.find((p) => p.id === id));
  Object.values(toast).forEach((f) => f.mockReset());
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Nuevo, Crear con IA y Editar van en el CAJÓN (Nico, 03-10)', () => {
  it('🔴 «Nuevo propietario» abre un cajón con el pie FUERA del cuerpo que se desplaza (P-12)', async () => {
    await montar();
    await clic(botonConTexto('inmobiliaria.propietarios.addOwner'));

    const cajon = $('cajon-del-propietario');
    expect(cajon).not.toBeNull();
    expect(cajon!.getAttribute('role')).toBe('dialog');

    const cuerpo = cajon!.querySelector('[data-sheet-band="body"]');
    const pie = cajon!.querySelector('[data-sheet-band="footer"]');
    const form = $('form-create')!;
    // El formulario va en el cuerpo, sin sus propios botones…
    expect(cuerpo?.contains(form)).toBe(true);
    expect(form.getAttribute('data-acciones-afuera')).toBe('true');
    // …y «Crear propietario» va en el pie, que no se desplaza, y manda ESE formulario.
    const guardar = pie?.querySelector<HTMLButtonElement>('[data-testid="guardar-propietario"]');
    expect(guardar?.textContent).toContain('inmobiliaria.propietario.form.createOwner');
    expect(guardar?.getAttribute('form')).toBe(form.id);
    expect(form.id).not.toBe('');
    expect(cuerpo?.contains(guardar!)).toBe(false);
    expect(pie?.textContent).toContain('inmobiliaria.propietario.form.cancel');
  });

  it('el botón del pie guarda: crea el propietario y cierra el cajón', async () => {
    api.create.mockResolvedValueOnce({ name: 'Ana Gómez' });
    await montar();
    await clic(botonConTexto('inmobiliaria.propietarios.addOwner'));
    const form = $('form-create') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(api.create).toHaveBeenCalledWith(DATOS);
    expect(toast.success).toHaveBeenCalled();
  });

  it('🔴 «Crear con IA» también es un cajón, no un modal', async () => {
    await montar();
    await clic(botonConTexto('inmobiliaria.propietarios.addOwnerIA'));
    const cajon = $('cajon-crear-con-ia');
    expect(cajon).not.toBeNull();
    expect(cajon!.getAttribute('role')).toBe('dialog');
    expect(cajon!.contains($('captura-con-ia'))).toBe(true);
  });

  it('«Editar» usa el MISMO cajón y el mismo formulario, con «Guardar cambios» en el pie', async () => {
    estado.lista = [unPropietario()];
    await montar();
    await clic($('editar-p1'));
    const cajon = $('cajon-del-propietario');
    expect(cajon?.contains($('form-edit'))).toBe(true);
    expect(cajon?.querySelector('[data-sheet-band="footer"]')?.textContent).toContain(
      'inmobiliaria.propietario.form.saveChanges',
    );
    // El nombre de quien se edita, debajo del título.
    expect(cajon?.textContent).toContain('Ana Gómez');
  });

  it('«Eliminar» sigue siendo un diálogo de confirmación, no un cajón', async () => {
    estado.lista = [unPropietario()];
    await montar();
    await clic($('eliminar-p1'));
    expect($('confirmar-eliminar')).not.toBeNull();
    expect($('cajon-del-propietario')).toBeNull();
  });
});

describe('P-21 — los KPI de plata a quien no la ve', () => {
  const oculto = (over: Partial<Propietario> = {}) =>
    unPropietario({ totalMonthlyRent: 0, pendingBalance: 0, plataOculta: true, ...over } as Partial<Propietario>);

  it('🔴 «—» con «Sin acceso a la plata» en canon y pendiente; ni «$0» ni «Al día» ni «Sin pendientes»', async () => {
    estado.lista = [oculto(), oculto({ id: 'p2', name: 'Beto' })];
    await montar();

    const tiles = Array.from(host.querySelectorAll('[data-testid="kpi-valor"]'));
    expect(tiles.map((t) => t.getAttribute('data-estado'))).toEqual(['ok', 'ok', 'oculto', 'oculto']);
    expect(host.textContent).not.toContain('$0');
    expect(host.textContent).not.toContain('inmobiliaria.propietarios.upToDate');
    expect(host.textContent).not.toContain('inmobiliaria.propietarios.noPending');
    expect(host.textContent).toContain('Saldo pendiente');
    expect(host.textContent).toContain('inmobiliaria.propietario.table.sinAccesoALaPlata');
    // Y la tabla se entera para no pintar «$0» en cada fila.
    expect(tabla.plataOculta).toBe(true);
  });

  it('a quien sí la ve, los KPI de siempre', async () => {
    estado.lista = [unPropietario()];
    await montar();
    const tiles = Array.from(host.querySelectorAll('[data-testid="kpi-valor"]'));
    expect(tiles.every((t) => t.getAttribute('data-estado') === 'ok')).toBe(true);
    expect(tiles[2].textContent).toMatch(/2\.000\.000/);
    expect(tabla.plataOculta).toBe(false);
  });
});

describe('P-08 y P-26 — número gramatical', () => {
  it('«1 propietario», no «1 propietarios»', async () => {
    estado.lista = [unPropietario()];
    await montar();
    expect(host.textContent).toContain('inmobiliaria.propietarios.propietarioUno');
  });

  it('«tiene 1 inmueble consignado», no «inmueble(s) consignado(s)»', async () => {
    estado.lista = [unPropietario({ propertyCount: 1 })];
    await montar();
    await clic($('eliminar-p1'));
    expect($('borrar-bloqueado')?.textContent).toContain('inmobiliaria.propietarios.deleteBloqueado.tituloUno');
  });

  it('copropietario en 1 inmueble, en singular', async () => {
    estado.lista = [unPropietario({ propertyCount: 0, copropiedadesCount: 1 })];
    await montar();
    await clic($('eliminar-p1'));
    expect($('borrar-bloqueado')?.textContent).toContain(
      'inmobiliaria.propietarios.deleteBloqueado.tituloCopropietarioUno',
    );
  });
});
