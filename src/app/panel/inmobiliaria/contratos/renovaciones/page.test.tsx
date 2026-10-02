/**
 * /contratos/renovaciones — lo que la página le promete al cajón.
 *
 * El cajón suelta el botón y NO avanza cuando el handler rechaza; avisar es
 * trabajo de la página. Dos handlers no cumplían:
 *   - C28: subir el documento firmado no tenía try/catch → fallaba en
 *     silencio: el spinner se apagaba y nada;
 *   - C29: «No renovar» avisaba pero NO relanzaba → el cajón cerraba el
 *     diálogo como si hubiera salido.
 * Y N3: el aviso del IPC que falta vive arriba de la tabla.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { Renovacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  uploadDocument: vi.fn(),
  updateStage: vi.fn(),
  addNote: vi.fn(),
  refetch: vi.fn(),
  tabla: { props: null as null | Record<string, unknown> },
  cajon: { props: null as null | Record<string, unknown> },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { error: h.toastError, success: h.toastSuccess },
}));
vi.mock('@leasefy/cadence', () => ({
  Eyebrow: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
}));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useRenovaciones: () => ({ renovaciones: [], isLoading: false, errorCrudo: null, refetch: h.refetch }),
  renovacionesApi: { uploadDocument: h.uploadDocument, updateStage: h.updateStage, addNote: h.addNote },
}));
vi.mock('@/components/inmobiliaria', () => ({
  RenovacionesTable: (props: Record<string, unknown>) => {
    h.tabla.props = props;
    return null;
  },
  RenovacionWorkflow: (props: Record<string, unknown>) => {
    h.cajon.props = props;
    return null;
  },
}));
vi.mock('@/components/inmobiliaria/AvisoIpcQueFalta', () => ({
  AvisoIpcQueFalta: () => React.createElement('div', { 'data-testid': 'aviso-ipc-que-falta-montado' }),
}));
vi.mock('@/components/contratos/BandejaDeCartasDelIncremento', () => ({
  BandejaDeCartasDelIncremento: ({ puedeEditar }: { puedeEditar: boolean }) =>
    React.createElement('div', { 'data-testid': 'bandeja-de-cartas-montada', 'data-editable': String(puedeEditar) }),
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true }),
}));

import RenovacionesPage from './page';

const RENOVACION = { id: 'renov-1', propertyTitle: 'Apartamento en El Golf', status: 'signed' } as unknown as Renovacion;

interface PropsDelCajon {
  open: boolean;
  onUploadDocument: (file: File) => Promise<void>;
  onTerminate: (motivo: string) => Promise<void>;
  onSendNotification: (mensaje: string, canon?: number, admin?: number, ipc?: number) => Promise<void>;
  onSaveDraft: (b: { proposedRent: number; negotiatedAdminFee?: number; ipcRate?: number }) => Promise<void>;
  onNoteAdd: (nota: string) => Promise<void>;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  for (const fn of [h.toastError, h.toastSuccess, h.uploadDocument, h.updateStage, h.addNote, h.refetch]) {
    fn.mockReset();
  }
  h.refetch.mockResolvedValue([RENOVACION]);
  h.tabla.props = null;
  h.cajon.props = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function montarConElCajonAbierto(): Promise<PropsDelCajon> {
  await act(async () => {
    root.render(React.createElement(RenovacionesPage));
  });
  // 🔴 Era `onStartRenewal`, una de las CINCO props que la página cableaba
  // al mismo `openWorkflow`. Desde el 19-09 hay una sola: `onAbrir`.
  const abrir = h.tabla.props?.onAbrir as (r: Renovacion) => void;
  await act(async () => {
    abrir(RENOVACION);
  });
  return h.cajon.props as unknown as PropsDelCajon;
}

async function rechazoDe(promesa: Promise<unknown>): Promise<unknown> {
  let rechazo: unknown = null;
  await act(async () => {
    await promesa.catch((e: unknown) => {
      rechazo = e;
    });
  });
  return rechazo;
}

describe('Renovaciones — C28: subir el documento firmado', () => {
  it('🔴 si falla, avisa con el motivo del back y RECHAZA para que el cajón no avance', async () => {
    const fallo = new ApiError(413, 'El archivo supera los 10 MB');
    h.uploadDocument.mockRejectedValue(fallo);
    const cajon = await montarConElCajonAbierto();

    const archivo = new File(['pdf'], 'firmado.pdf', { type: 'application/pdf' });
    expect(await rechazoDe(cajon.onUploadDocument(archivo))).toBe(fallo);

    expect(h.toastError).toHaveBeenCalledWith('No se pudo subir el documento firmado', {
      description: 'El archivo supera los 10 MB',
    });
    expect(h.toastSuccess).not.toHaveBeenCalled();
    expect(h.refetch).not.toHaveBeenCalled();
  });

  it('si sale, relee la lista y lo confirma', async () => {
    h.uploadDocument.mockResolvedValue({ documentName: 'firmado.pdf', documentPath: 'x' });
    const cajon = await montarConElCajonAbierto();
    await act(async () => {
      await cajon.onUploadDocument(new File(['pdf'], 'firmado.pdf'));
    });
    expect(h.refetch).toHaveBeenCalledTimes(1);
    expect(h.toastSuccess).toHaveBeenCalledWith('Documento de renovación subido');
  });
});

describe('Renovaciones — C29: no renovar', () => {
  it('🔴 si falla, RECHAZA (el diálogo no se cierra), avisa con el motivo y el cajón sigue abierto', async () => {
    const fallo = new ApiError(403, 'No tienes permiso para realizar esta acción');
    h.updateStage.mockRejectedValue(fallo);
    const cajon = await montarConElCajonAbierto();

    expect(await rechazoDe(cajon.onTerminate('Se muda en diciembre.'))).toBe(fallo);

    expect(h.toastError).toHaveBeenCalledWith('No se pudo cerrar la renovación', {
      description: 'No tienes permiso para realizar esta acción',
    });
    expect(h.toastSuccess).not.toHaveBeenCalled();
    expect((h.cajon.props as unknown as PropsDelCajon).open).toBe(true);
  });

  it('si sale, cierra el cajón y lo confirma', async () => {
    h.updateStage.mockResolvedValue(undefined);
    const cajon = await montarConElCajonAbierto();
    await act(async () => {
      await cajon.onTerminate('Se muda en diciembre.');
    });
    expect(h.updateStage).toHaveBeenCalledWith('renov-1', {
      status: 'terminated',
      historyNote: 'Se muda en diciembre.',
    });
    expect((h.cajon.props as unknown as PropsDelCajon).open).toBe(false);
    expect(h.toastSuccess).toHaveBeenCalled();
  });
});

describe('Renovaciones — N3', () => {
  it('monta el aviso del IPC que falta', async () => {
    await act(async () => {
      root.render(React.createElement(RenovacionesPage));
    });
    expect(container.querySelector('[data-testid="aviso-ipc-que-falta-montado"]')).not.toBeNull();
    // D6 (17-09): la bandeja de cartas del incremento vive en la misma pantalla.
    expect(container.querySelector('[data-testid="bandeja-de-cartas-montada"]')).not.toBeNull();
  });
});

/**
 * 02-10-2026 · Sistema de errores. Enviar la propuesta, guardar el borrador y
 * agregar una nota decían «Reintenta» ante CUALQUIER fallo, también ante un
 * dato que el back rechazaba. Ahora el valor se revisa antes con el tope del
 * back, y lo que falla pasa por el traductor.
 */
const TOPE_DEL_CANON = 'El canon negociado no puede pasar de $2.000.000.000. Revisa que no sobren ceros.';

describe('Renovaciones — enviar la propuesta', () => {
  it('🔴 un canon con ceros de más se dice antes de mandar, con la frase del back, y el cajón no avanza', async () => {
    const cajon = await montarConElCajonAbierto();
    const rechazo = await rechazoDe(cajon.onSendNotification('Hola', 2_000_000_001));
    expect(rechazo).toBeInstanceOf(Error);
    expect(h.updateStage).not.toHaveBeenCalled();
    expect(h.toastError).toHaveBeenCalledWith('No se pudo enviar la propuesta', { description: TOPE_DEL_CANON });
  });

  it('🔴 un 400 con campos dice la frase del back, no «Reintenta»', async () => {
    h.updateStage.mockRejectedValue(
      new ApiError(400, [TOPE_DEL_CANON], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [TOPE_DEL_CANON],
        campos: [{ campo: 'negotiatedRent', regla: 'maximo', mensaje: TOPE_DEL_CANON }],
      }),
    );
    const cajon = await montarConElCajonAbierto();
    await rechazoDe(cajon.onSendNotification('Hola', 2_100_000));
    expect(h.toastError).toHaveBeenCalledWith('No se pudo enviar la propuesta', { description: TOPE_DEL_CANON });
  });

  it('🔴 un 5xx dice que es nuestro, con la referencia', async () => {
    h.updateStage.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'c0ffee12',
      }),
    );
    const cajon = await montarConElCajonAbierto();
    await rechazoDe(cajon.onSendNotification('Hola', 2_100_000));
    const { description } = h.toastError.mock.calls[0][1] as { description: string };
    expect(description).toContain('de nuestro lado');
    expect(description).toContain('c0ffee12');
    expect(description.toLowerCase()).not.toContain('conexión');
  });

  it('🔴 sin respuesta (status 0), la conexión', async () => {
    h.updateStage.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    const cajon = await montarConElCajonAbierto();
    await rechazoDe(cajon.onSendNotification('Hola', 2_100_000));
    const { description } = h.toastError.mock.calls[0][1] as { description: string };
    expect(description.toLowerCase()).toContain('conexión');
  });
});

describe('Renovaciones — guardar el borrador y agregar una nota', () => {
  it('el borrador con un canon propuesto que no cabe no se manda', async () => {
    const cajon = await montarConElCajonAbierto();
    await rechazoDe(cajon.onSaveDraft({ proposedRent: 30_000_000_000 }));
    expect(h.updateStage).not.toHaveBeenCalled();
    expect(h.toastError).toHaveBeenCalledWith('No se pudo guardar el borrador', {
      description: 'El canon propuesto no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
    });
  });

  it('una nota que el back rechaza dice por qué (antes: «Error al agregar nota»)', async () => {
    h.addNote.mockRejectedValue(
      new ApiError(400, ['Escribe la nota antes de agregarla.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['Escribe la nota antes de agregarla.'],
        campos: [{ campo: 'note', regla: 'requerido', mensaje: 'Escribe la nota antes de agregarla.' }],
      }),
    );
    const cajon = await montarConElCajonAbierto();
    await act(async () => {
      await cajon.onNoteAdd('   ');
    });
    expect(h.toastError).toHaveBeenCalledWith('No se pudo agregar la nota', {
      description: 'Escribe la nota antes de agregarla.',
    });
  });
});
