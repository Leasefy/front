/**
 * errores-y-permisos.test.tsx — la lista de Propietarios cuando algo no sale.
 *
 * O1 · el 409 que explica («tiene 7 inmuebles consignados») se decía como
 *      «No se pudo eliminar. Intenta de nuevo.» en un toast. Reintentar da lo
 *      mismo: lo que sirve es leer el motivo, y dentro del diálogo.
 * O2 · el documento repetido y el 400 del back se perdían igual. Van al lado
 *      del campo, en castellano.
 * O3 · un CONTADOR o un VIEWER (sólo `propietarios:view`) veían «Nuevo»,
 *      «Editar» y «Eliminar», y el clic terminaba en 403.
 * O5 · «Eliminar» quedaba activo sobre quien tiene inmuebles consignados.
 * Tiles · con el back caído decían «0 propietarios · $0 · Al día».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { estado, permisos, api, toast } = vi.hoisted(() => ({
  estado: {
    lista: [] as Propietario[],
    isLoading: false,
    errorCrudo: null as unknown,
  },
  permisos: { negadas: new Set<string>(), pedidas: [] as string[] },
  api: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
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
  usePermissions: () => ({
    isLoading: false,
    canAccess: (m: string, a: string) => {
      permisos.pedidas.push(`${m}:${a}`);
      return !permisos.negadas.has(`${m}:${a}`);
    },
  }),
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({
    propietarios: estado.lista,
    isLoading: estado.isLoading,
    errorCrudo: estado.errorCrudo,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({ useMigracionConDeuda: () => null }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: api }));
vi.mock('@/lib/propietarios/exportar-datos', () => ({ descargarListaDePropietarios: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/components/ui/toast', () => ({ toast }));
vi.mock('@/components/inmobiliaria/TerceroIACapture', () => ({ TerceroIACapture: () => null }));

/*
 * La tabla expone los dos disparadores de su menú de fila; el formulario
 * publica el error por campo que recibió (`serverError`) y guarda con un clic.
 */
const DATOS_DEL_FORM: PropietarioFormData = {
  name: 'Ana Gómez',
  email: 'ana@ejemplo.co',
  phone: '3001234567',
  documentType: 'CC',
  documentNumber: '1020304050',
  bankCode: '',
  accountType: '',
  accountNumber: '',
  accountHolder: '',
};
vi.mock('@/components/inmobiliaria', () => ({
  PropietarioCard: () => null,
  PropietarioTable: ({
    propietarios,
    onEdit,
    onDelete,
  }: {
    propietarios: Propietario[];
    onEdit: (p: Propietario) => void;
    onDelete: (p: Propietario) => void;
  }) => (
    <div>
      {propietarios.map((p) => (
        <span key={p.id}>
          <button data-testid={`editar-${p.id}`} onClick={() => onEdit(p)} />
          <button data-testid={`eliminar-${p.id}`} onClick={() => onDelete(p)} />
        </span>
      ))}
    </div>
  ),
  PropietarioForm: ({
    mode,
    onSubmit,
    serverError,
  }: {
    mode: string;
    onSubmit: (d: PropietarioFormData) => Promise<void>;
    serverError?: { field: string; message: string } | null;
  }) => (
    <button
      data-testid={`form-${mode}`}
      data-error-campo={serverError?.field ?? ''}
      data-error-mensaje={serverError?.message ?? ''}
      // El formulario real se traga el rechazo para quedarse abierto.
      onClick={() => void onSubmit(DATOS_DEL_FORM).catch(() => undefined)}
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
    totalMonthlyRent: 0,
    pendingBalance: 0,
    cuentaDePortalId: null,
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

/** Los modales van por portal a `document.body`: se busca en el documento. */
const $ = (testId: string) => document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

async function clic(el: HTMLElement | null) {
  if (!el) throw new Error('no está el elemento');
  await act(async () => {
    el.click();
  });
}

function botonConTexto(texto: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === texto,
  ) ?? null;
}

beforeEach(() => {
  estado.lista = [];
  estado.isLoading = false;
  estado.errorCrudo = null;
  permisos.negadas.clear();
  permisos.pedidas.length = 0;
  api.create.mockReset();
  api.update.mockReset();
  api.delete.mockReset();
  Object.values(toast).forEach((f) => f.mockReset());
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('O3 — sólo se ofrece lo que el back va a dejar hacer', () => {
  it('pregunta con las llaves del back: propietarios create · edit · delete', async () => {
    estado.lista = [unPropietario()];
    await montar();
    expect(new Set(permisos.pedidas)).toEqual(
      new Set(['propietarios:create', 'propietarios:edit', 'propietarios:delete']),
    );
  });

  it('con permiso de crear, «Nuevo propietario» y «Crear con IA» están en el encabezado', async () => {
    estado.lista = [unPropietario()];
    await montar();
    expect(botonConTexto('inmobiliaria.propietarios.addOwner')).not.toBeNull();
    expect(botonConTexto('inmobiliaria.propietarios.addOwnerIA')).not.toBeNull();
  });

  it('🔴 sin permiso de crear no hay botón de alta: ni arriba ni en el vacío', async () => {
    permisos.negadas.add('propietarios:create');
    estado.lista = [];
    await montar();

    expect(botonConTexto('inmobiliaria.propietarios.addOwner')).toBeNull();
    expect(botonConTexto('inmobiliaria.propietarios.addOwnerIA')).toBeNull();
    expect(host.querySelector('[data-testid="sin-datos"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Agregar propietario');
  });

  it('🔴 sin permiso de editar, el «Editar» de la fila no abre un formulario que rebota: lo dice', async () => {
    permisos.negadas.add('propietarios:edit');
    estado.lista = [unPropietario()];
    await montar();

    await clic($('editar-p1'));
    expect($('form-edit')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      'No tienes permiso para editar propietarios',
      expect.objectContaining({ description: expect.stringContaining('administrador') }),
    );
  });

  it('🔴 sin permiso de eliminar, tampoco se abre la confirmación', async () => {
    permisos.negadas.add('propietarios:delete');
    estado.lista = [unPropietario()];
    await montar();

    await clic($('eliminar-p1'));
    expect($('confirmar-eliminar')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('No tienes permiso para eliminar propietarios', expect.anything());
  });
});

describe('O1 — el motivo del back al eliminar se lee dentro del diálogo', () => {
  it('🔴 el 409 que explica se muestra tal cual, y el diálogo se queda abierto', async () => {
    const motivo = 'No se puede eliminar: tiene 1 inmueble(s) consignado(s).';
    api.delete.mockRejectedValueOnce(new ApiError(409, motivo));
    estado.lista = [unPropietario()];
    await montar();

    await clic($('eliminar-p1'));
    await clic($('confirmar-eliminar'));

    expect(api.delete).toHaveBeenCalledWith('p1');
    expect($('motivo-al-eliminar')?.textContent).toBe(motivo);
    expect($('motivo-al-eliminar')?.getAttribute('role')).toBe('alert');
    expect($('confirmar-eliminar')).not.toBeNull();
    // Nada de «Intenta de nuevo» en un toast que se va solo.
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('un fallo de red no muestra el inglés del navegador', async () => {
    api.delete.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    estado.lista = [unPropietario()];
    await montar();

    await clic($('eliminar-p1'));
    await clic($('confirmar-eliminar'));

    const aviso = $('motivo-al-eliminar')?.textContent ?? '';
    expect(aviso).toContain('No pudimos eliminar el propietario');
    expect(aviso).not.toContain('Failed to fetch');
  });
});

describe('O5 — «Eliminar» no se ofrece activo sobre lo que no se puede borrar', () => {
  it('🔴 con inmuebles consignados el botón está deshabilitado y el aviso dice qué hacer', async () => {
    estado.lista = [unPropietario({ propertyCount: 3 })];
    await montar();

    await clic($('eliminar-p1'));
    const confirmar = $('confirmar-eliminar') as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    expect($('borrar-bloqueado')?.textContent).toContain('inmobiliaria.propietarios.deleteBloqueado.titulo(3)');

    await clic(confirmar);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('sin inmuebles, el botón está activo y no hay aviso', async () => {
    estado.lista = [unPropietario({ propertyCount: 0 })];
    await montar();

    await clic($('eliminar-p1'));
    expect(($('confirmar-eliminar') as HTMLButtonElement).disabled).toBe(false);
    expect($('borrar-bloqueado')).toBeNull();
  });
});

describe('O2 — el duplicado y el 400 van al lado del campo', () => {
  it('🔴 al crear, el documento repetido dice «Ese documento ya está cargado» en el documento', async () => {
    api.create.mockRejectedValueOnce(
      new ApiError(409, 'Ya existe un propietario con el documento 1020304050 en esta agencia'),
    );
    await montar();

    await clic(botonConTexto('inmobiliaria.propietarios.addOwner'));
    await clic($('form-create'));

    const form = $('form-create')!;
    expect(form.getAttribute('data-error-campo')).toBe('documentNumber');
    expect(form.getAttribute('data-error-mensaje')).toBe('Ese documento ya está cargado');
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('al editar, un correo que el back no acepta va al correo, en castellano', async () => {
    api.update.mockRejectedValueOnce(new ApiError(400, ['email must be an email']));
    estado.lista = [unPropietario()];
    await montar();

    await clic($('editar-p1'));
    await clic($('form-edit'));

    const form = $('form-edit')!;
    expect(form.getAttribute('data-error-campo')).toBe('email');
    expect(form.getAttribute('data-error-mensaje')).toBe('Ese correo no es válido');
    expect($('aviso-en-el-dialogo')).toBeNull();
  });

  it('lo que no tiene campo (un 500) se dice arriba del formulario, dentro del diálogo', async () => {
    api.update.mockRejectedValueOnce(new ApiError(500, 'Error interno del servidor.'));
    estado.lista = [unPropietario()];
    await montar();

    await clic($('editar-p1'));
    await clic($('form-edit'));

    expect($('aviso-en-el-dialogo')?.textContent).toContain('No pudimos guardar el propietario');
    expect($('form-edit')).not.toBeNull();
  });

  it('cerrar el diálogo se lleva el error: al volver a abrir está limpio', async () => {
    api.update.mockRejectedValueOnce(new ApiError(500, 'Error interno del servidor.'));
    estado.lista = [unPropietario()];
    await montar();

    await clic($('editar-p1'));
    await clic($('form-edit'));
    await clic(document.querySelector<HTMLElement>('[aria-label="Cerrar"]'));
    await clic($('editar-p1'));

    expect($('aviso-en-el-dialogo')).toBeNull();
  });
});

describe('Tiles — nunca un «0» ni un «Al día» que nadie verificó', () => {
  const tiles = () => Array.from(host.querySelectorAll('[data-testid="kpi-valor"]'));

  it('mientras carga, los cuatro tiles muestran un hueco', async () => {
    estado.isLoading = true;
    await montar();

    expect(tiles()).toHaveLength(4);
    expect(tiles().every((t) => t.getAttribute('data-estado') === 'cargando')).toBe(true);
    expect(host.textContent).not.toContain('inmobiliaria.propietarios.upToDate');
  });

  it('🔴 si la carga falló, «—» en los cuatro y la etiqueta no dice «Sin pendientes»', async () => {
    estado.errorCrudo = new ApiError(502, 'Bad Gateway');
    await montar();

    expect(tiles().every((t) => t.getAttribute('data-estado') === 'fallo')).toBe(true);
    expect(host.textContent).not.toContain('inmobiliaria.propietarios.noPending');
    expect(host.textContent).not.toContain('inmobiliaria.propietarios.upToDate');
    expect(host.textContent).toContain('Saldo pendiente');
  });

  it('con datos, los tiles muestran los números', async () => {
    estado.lista = [unPropietario({ propertyCount: 2, totalMonthlyRent: 4_000_000 })];
    await montar();

    const valores = tiles().map((t) => t.textContent ?? '');
    expect(tiles().every((t) => t.getAttribute('data-estado') === 'ok')).toBe(true);
    // El recaudo va con el formateador de la lista (`formatCurrency` de los tipos), no el del i18n.
    expect(valores[0]).toBe('1');
    expect(valores[1]).toBe('2');
    expect(valores[2]).toMatch(/4\.000\.000/);
    expect(valores[3]).toBe('inmobiliaria.propietarios.upToDate');
  });
});
