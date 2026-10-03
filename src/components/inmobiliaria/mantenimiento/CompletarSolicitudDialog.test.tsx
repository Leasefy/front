/**
 * «Subir fotos del trabajo» al cerrar una solicitud (Nico, 02-10-2026).
 *
 * Se prueba desde el detalle (`MantenimientoViewer` → «Marcar como
 * completada»), que es donde la persona cierra. La subida es la de siempre
 * (`mantenimientoApi.subirFoto` → `POST :id/fotos`) y el cierre
 * `mantenimientoApi.completar` (`PUT :id/complete`) con las rutas en
 * `completionPhotoUrls`. Dobles: ninguna subida real.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  subirFoto: vi.fn(),
  completar: vi.fn(),
  borrarFoto: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatDate: (d: string) => d }),
}));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  mantenimientoApi: { subirFoto: h.subirFoto, completar: h.completar, borrarFoto: h.borrarFoto },
}));

import { MantenimientoViewer } from '../MantenimientoViewer';
import { ApiError } from '@/lib/api/client';
import { MAX_FOTOS_DEL_MANTENIMIENTO, MENSAJES_DEL_MANTENIMIENTO } from '@/lib/mantenimiento/limites-del-mantenimiento';

const SOLICITUD = {
  id: 'sol-7',
  consignacionId: 'cons-1',
  propertyId: 'prop-1',
  propertyTitle: 'Apto 402 — Laureles',
  propertyAddress: 'Cra 76 #34-12',
  type: 'plumbing',
  priority: 'medium',
  status: 'in_progress',
  title: 'Gotera en el baño',
  description: 'El sifón del lavamanos gotea',
  photoUrls: [],
  quotes: [],
  paidBy: 'owner',
  createdAt: '2026-09-12T10:00:00.000Z',
  updatedAt: '2026-09-12T10:00:00.000Z',
} as unknown as SolicitudMantenimiento;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.subirFoto.mockReset().mockImplementation(async (_id: string, f: File) => ({
    ruta: `agencia/sol-7/${f.name}`,
    photoUrls: [],
  }));
  h.borrarFoto.mockReset().mockImplementation(async (_id: string, ruta: string) => ({
    ruta,
    completionPhotoUrls: [],
  }));
  h.completar.mockReset().mockImplementation(async (id: string, cierre: object) => ({
    ...SOLICITUD,
    id,
    status: 'completed',
    ...cierre,
  }));
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
  URL.revokeObjectURL = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const enDocumento = <T extends Element>(sel: string) => document.body.querySelector(sel) as T | null;
const todos = (sel: string) => Array.from(document.body.querySelectorAll(sel));
const foto = (nombre: string, tipo = 'image/jpeg', peso = 2048) =>
  new File([new Uint8Array(peso)], nombre, { type: tipo });

function montar(props: Partial<React.ComponentProps<typeof MantenimientoViewer>> = {}) {
  const onCompletada = vi.fn();
  const onStatusChange = vi.fn();
  act(() => {
    root.render(
      <MantenimientoViewer
        solicitud={SOLICITUD}
        isOpen
        onClose={() => {}}
        onStatusChange={onStatusChange}
        onCompletada={onCompletada}
        {...props}
      />,
    );
  });
  const boton = todos('button').find((b) => b.textContent?.includes('inmobiliaria.mantenimiento.markCompleted'));
  act(() => (boton as HTMLButtonElement).click());
  return { onCompletada, onStatusChange };
}

async function elegir(...archivos: File[]) {
  const input = enDocumento<HTMLInputElement>('[data-testid="fotos-del-trabajo-input"]')!;
  Object.defineProperty(input, 'files', { configurable: true, value: archivos });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function confirmar() {
  await act(async () => {
    enDocumento<HTMLButtonElement>('[data-testid="completar-confirmar"]')!.click();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const errorBajoLasFotos = () => enDocumento('#mantenimiento-fotos-del-trabajo-error')?.textContent ?? '';

describe('Marcar como completada — «Subir fotos del trabajo»', () => {
  it('el cierre ofrece «Subir fotos del trabajo»', () => {
    montar();
    const dialogo = enDocumento('[data-testid="completar-solicitud"]');
    expect(dialogo).not.toBeNull();
    expect(dialogo!.textContent).toContain('Subir fotos del trabajo');
    expect(enDocumento('[data-testid="fotos-del-trabajo-input"]')).not.toBeNull();
  });

  it('🔴 sube cada foto de verdad (POST :id/fotos) y cierra con sus rutas en `completionPhotoUrls`', async () => {
    const { onCompletada, onStatusChange } = montar();
    await elegir(foto('antes-de-pintar.jpg'), foto('pintado.png', 'image/png'));
    expect(todos('[data-testid="foto-del-trabajo"]')).toHaveLength(2);
    await confirmar();

    // 🔴 Las del trabajo suben con `destino: 'trabajo'` (directo a `completionPhotoUrls`).
    expect(h.subirFoto.mock.calls.map(([id, f, destino]) => [id, (f as File).name, destino])).toEqual([
      ['sol-7', 'antes-de-pintar.jpg', 'trabajo'],
      ['sol-7', 'pintado.png', 'trabajo'],
    ]);
    expect(h.completar).toHaveBeenCalledWith('sol-7', {
      completionPhotoUrls: ['agencia/sol-7/antes-de-pintar.jpg', 'agencia/sol-7/pintado.png'],
    });
    expect(onCompletada).toHaveBeenCalledTimes(1);
    expect(onCompletada.mock.calls[0]![0]).toMatchObject({ id: 'sol-7', status: 'completed' });
    // Ya no pasa por el cambio de estado sin fotos.
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it(`acepta hasta ${MAX_FOTOS_DEL_MANTENIMIENTO} fotos (el tope del back) y lo dice bajo las fotos`, async () => {
    montar();
    await elegir(...Array.from({ length: MAX_FOTOS_DEL_MANTENIMIENTO + 1 }, (_, i) => foto(`t${i}.jpg`)));
    expect(todos('[data-testid="foto-del-trabajo"]')).toHaveLength(30);
    expect(errorBajoLasFotos()).toContain(MENSAJES_DEL_MANTENIMIENTO.fotosMaximas);
    expect(enDocumento('[data-testid="fotos-del-trabajo-input"]')).toBeNull();
  });

  it('una foto que no sirve no entra, con la frase del back bajo las fotos', async () => {
    montar();
    await elegir(foto('plano.pdf', 'application/pdf'), foto('bien.jpg'));
    expect(todos('[data-testid="foto-del-trabajo"]')).toHaveLength(1);
    expect(errorBajoLasFotos()).toContain(`«plano.pdf»: ${MENSAJES_DEL_MANTENIMIENTO.fotoTipo}`);
  });

  it('🔴 una foto que no sube NO cierra: dice cuál y por qué, y al reintentar sólo sube la que faltaba', async () => {
    const { onCompletada } = montar();
    h.subirFoto.mockImplementation(async (_id: string, f: File) => {
      if (f.name === 'b.jpg') {
        throw new ApiError(503, 'No se pudo guardar la foto.', 'FOTO_NO_GUARDADA', {
          statusCode: 503,
          code: 'FOTO_NO_GUARDADA',
          message: 'No se pudo guardar la foto. La solicitud quedó como estaba: vuelve a intentarlo en un momento.',
        });
      }
      return { ruta: `agencia/sol-7/${f.name}`, photoUrls: [] };
    });
    await elegir(foto('a.jpg'), foto('b.jpg'));
    await confirmar();

    expect(h.completar).not.toHaveBeenCalled();
    expect(onCompletada).not.toHaveBeenCalled();
    const error = errorBajoLasFotos();
    expect(error).toContain('Una foto no se subió y la solicitud sigue abierta');
    expect(error).toContain('«b.jpg»');
    // El diálogo sigue abierto con lo elegido.
    expect(todos('[data-testid="foto-del-trabajo"]')).toHaveLength(2);

    h.subirFoto.mockClear().mockImplementation(async (_id: string, f: File) => ({
      ruta: `agencia/sol-7/${f.name}`,
      photoUrls: [],
    }));
    await confirmar();
    expect(h.subirFoto).toHaveBeenCalledTimes(1);
    expect((h.subirFoto.mock.calls[0]![1] as File).name).toBe('b.jpg');
    expect(h.completar).toHaveBeenCalledWith('sol-7', {
      completionPhotoUrls: ['agencia/sol-7/a.jpg', 'agencia/sol-7/b.jpg'],
    });
    expect(onCompletada).toHaveBeenCalledTimes(1);
  });

  it('🔴 el 400 del tope del trabajo al SUBIR (`completionPhotoUrls`) va bajo las fotos, con la frase del back, y no cierra', async () => {
    const { onCompletada } = montar();
    const frase = 'Puedes adjuntar hasta 30 fotos.';
    h.subirFoto.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'completionPhotoUrls', regla: 'lista_maxima', mensaje: frase }],
      }),
    );
    await elegir(foto('a.jpg'));
    await confirmar();
    expect(errorBajoLasFotos()).toContain(frase);
    expect(errorBajoLasFotos()).toContain('La solicitud sigue abierta');
    expect(enDocumento('[data-testid="fotos-del-trabajo-input"]')!.getAttribute('aria-invalid')).toBe('true');
    expect(h.completar).not.toHaveBeenCalled();
    expect(onCompletada).not.toHaveBeenCalled();
  });

  it('un 400 del cierre con `campos` de las fotos va bajo las fotos, con la frase del back', async () => {
    montar();
    h.completar.mockRejectedValue(
      new ApiError(400, 'Puedes adjuntar hasta 30 fotos.', 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['Puedes adjuntar hasta 30 fotos.'],
        campos: [{ campo: 'completionPhotoUrls', regla: 'lista_maxima', mensaje: 'Puedes adjuntar hasta 30 fotos.' }],
      }),
    );
    await elegir(foto('a.jpg'));
    await confirmar();
    expect(errorBajoLasFotos()).toBe('Puedes adjuntar hasta 30 fotos.');
  });

  it('🔴 un 5xx del cierre dice que falló de nuestro lado, con la referencia, sin culpar a la conexión', async () => {
    const { onCompletada } = montar();
    h.completar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'c0ffee12',
      }),
    );
    await confirmar();
    const error = errorBajoLasFotos();
    expect(error).toContain('de nuestro lado');
    expect(error).toContain('c0ffee12');
    expect(error).not.toMatch(/conexi[oó]n/i);
    expect(onCompletada).not.toHaveBeenCalled();
  });

  it('sin respuesta (status 0) habla de la conexión', async () => {
    montar();
    h.completar.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await confirmar();
    expect(errorBajoLasFotos()).toMatch(/conexi[oó]n/i);
  });

  it('sin `onCompletada` queda el cierre de siempre, sin fotos (`onStatusChange`)', () => {
    const onStatusChange = vi.fn();
    montar({ onCompletada: undefined, onStatusChange });
    expect(enDocumento('[data-testid="completar-solicitud"]')).toBeNull();
    const confirmarDeSiempre = todos('button').find((b) =>
      b.textContent?.includes('inmobiliaria.mantenimiento.confirmCompleted'),
    ) as HTMLButtonElement;
    act(() => confirmarDeSiempre.click());
    expect(onStatusChange).toHaveBeenCalledWith('sol-7', 'completed');
  });
});

/**
 * 🔴 Cancelar el cierre borra las fotos del trabajo que subió ESE intento
 * (Nico, 02-10-2026). Antes, si una foto fallaba y la persona cancelaba, las
 * que SÍ subieron se quedaban en «Fotos de después» y ocupaban cupo.
 */
describe('Marcar como completada — cancelar borra lo que subió este intento', () => {
  /** Sube `a.jpg` y deja fallar `b.jpg`: la solicitud sigue abierta. */
  async function intentoConUnaFotoQueFalla() {
    h.subirFoto.mockImplementation(async (_id: string, f: File) => {
      if (f.name === 'b.jpg') throw new ApiError(503, 'No se pudo guardar la foto.', 'FOTO_NO_GUARDADA');
      return { ruta: `agencia/sol-7/${f.name}`, completionPhotoUrls: [] };
    });
    await elegir(foto('a.jpg'), foto('b.jpg'));
    await confirmar();
    expect(h.completar).not.toHaveBeenCalled();
  }

  async function cancelar() {
    // Por su texto dentro del diálogo (el botón «Cancelar» de siempre).
    const dialogo = enDocumento('[data-testid="completar-solicitud"]')!;
    const boton = Array.from(dialogo.querySelectorAll('button')).find(
      (b) => b.textContent === 'inmobiliaria.mantenimiento.cancel',
    ) as HTMLButtonElement;
    await act(async () => {
      boton.click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('🔴 «Cancelar» borra SÓLO las que subieron en este intento (DELETE con destino «trabajo») y cierra el diálogo', async () => {
    // La solicitud ya traía una foto del trabajo: ésa no se toca.
    montar({
      solicitud: { ...SOLICITUD, completionPhotoUrls: ['agencia/sol-7/de-antes.jpg'] } as SolicitudMantenimiento,
    });
    await intentoConUnaFotoQueFalla();

    await cancelar();

    expect(h.borrarFoto.mock.calls).toEqual([['sol-7', 'agencia/sol-7/a.jpg', 'trabajo']]);
    expect(enDocumento('[data-testid="completar-solicitud"]')).toBeNull();
    expect(h.completar).not.toHaveBeenCalled();
  });

  it('🔴 un borrado que falla no frena el cierre del diálogo y queda escrito en el log', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      montar();
      await intentoConUnaFotoQueFalla();
      h.borrarFoto.mockRejectedValue(new ApiError(503, 'No pudimos borrar el archivo.', 'FOTO_NO_BORRADA'));

      await cancelar();

      expect(enDocumento('[data-testid="completar-solicitud"]')).toBeNull();
      expect(h.borrarFoto).toHaveBeenCalledWith('sol-7', 'agencia/sol-7/a.jpg', 'trabajo');
      const escrito = aviso.mock.calls.map((c) => c.map(String).join(' ')).join('\n');
      expect(escrito).toContain('agencia/sol-7/a.jpg');
      expect(escrito).toContain('al cancelar el cierre');
    } finally {
      aviso.mockRestore();
    }
  });

  it('cancelar sin haber subido nada no borra nada', async () => {
    montar();
    await elegir(foto('a.jpg'));
    await cancelar();
    expect(h.borrarFoto).not.toHaveBeenCalled();
    expect(enDocumento('[data-testid="completar-solicitud"]')).toBeNull();
  });

  it('Escape cierra igual que «Cancelar»: también borra lo de este intento', async () => {
    montar();
    await intentoConUnaFotoQueFalla();
    await act(async () => {
      enDocumento('[data-testid="completar-solicitud"]')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(enDocumento('[data-testid="completar-solicitud"]')).toBeNull();
    expect(h.borrarFoto).toHaveBeenCalledWith('sol-7', 'agencia/sol-7/a.jpg', 'trabajo');
  });

  it('🔴 un cierre que SÍ se hizo no borra nada: sus fotos ya son las del trabajo terminado', async () => {
    const { onCompletada } = montar();
    await elegir(foto('a.jpg'));
    await confirmar();
    expect(onCompletada).toHaveBeenCalledTimes(1);
    expect(h.borrarFoto).not.toHaveBeenCalled();
  });

  it('volver a abrir después de cancelar empieza de cero: no vuelve a borrar lo del intento anterior', async () => {
    montar();
    await intentoConUnaFotoQueFalla();
    await cancelar();
    expect(h.borrarFoto).toHaveBeenCalledTimes(1);

    const boton = todos('button').find((b) => b.textContent?.includes('inmobiliaria.mantenimiento.markCompleted'));
    act(() => (boton as HTMLButtonElement).click());
    await cancelar();
    expect(h.borrarFoto).toHaveBeenCalledTimes(1);
  });
});
