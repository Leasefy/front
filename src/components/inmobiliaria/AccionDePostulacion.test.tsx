/**
 * 02-10-2026 · Aprobar, rechazar o pedir información cuando el back dice que
 * no. Antes se pintaba `err.message` crudo: un 500 decía «Internal server
 * error» y sin respuesta «Failed to fetch».
 *
 *   · lo que el back rechaza del texto (`reason`/`message`) sale DEBAJO del
 *     campo y el campo recibe el foco;
 *   · un 5xx dice que es nuestro, con la referencia;
 *   · sin respuesta, la conexión;
 *   · un 409 dice lo que mandó el back, y el modal sigue abierto.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/providers/SmoothScroll', () => ({ useLenis: () => null }));
// El portal del diálogo montaría el modal fuera del contenedor de la prueba.
vi.mock('@/components/ui/responsive-dialog', () => {
  const Pasa = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children);
  return {
    ResponsiveDialog: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { role: 'dialog' }, children),
    ResponsiveDialogContent: Pasa,
    ResponsiveDialogHeader: Pasa,
    ResponsiveDialogTitle: Pasa,
    ResponsiveDialogDescription: Pasa,
    ResponsiveDialogFooter: Pasa,
  };
});

import { AccionDePostulacion, MAX_LARGO_DEL_TEXTO_AL_CANDIDATO, type ActionType } from './AccionDePostulacion';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const $ = <T extends Element>(sel: string) => container.querySelector(sel) as T | null;

async function confirmarCon(error: unknown, tipo: ActionType = 'reject') {
  const onClose = vi.fn();
  const onConfirm = vi.fn(() => Promise.reject(error));
  await act(async () => {
    root.render(
      <AccionDePostulacion type={tipo} candidateName="Ana Restrepo" onConfirm={onConfirm} onClose={onClose} />,
    );
  });
  const area = $<HTMLTextAreaElement>('#accion-postulacion-texto')!;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(area, 'No cumple con los ingresos que pide el inmueble.');
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  return { onClose, onConfirm, area };
}

const quinientos = (referencia: string) =>
  new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Internal server error',
    referencia,
  });

describe('AccionDePostulacion — cuando el back dice que no', () => {
  it('🔴 un 400 con campos pinta la frase bajo el texto y le da el foco', async () => {
    const frase = 'El motivo puede tener hasta 1000 caracteres.';
    const { onClose, area } = await confirmarCon(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'reason', regla: 'longitud_maxima', mensaje: frase }],
      }),
    );
    expect($('#accion-postulacion-texto-error')?.textContent).toBe(frase);
    expect(area.getAttribute('aria-invalid')).toBe('true');
    expect(area.getAttribute('aria-describedby')).toBe('accion-postulacion-texto-error');
    expect(document.activeElement).toBe(area);
    // No se repite al pie, y el modal no se cierra.
    expect($('#accion-postulacion-error')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice que es nuestro, con la referencia, y no el texto crudo', async () => {
    await confirmarCon(quinientos('deadbeef'), 'approve');
    const texto = $('#accion-postulacion-error')?.textContent ?? '';
    expect(texto).toContain('aprobar al candidato');
    expect(texto).toContain('de nuestro lado');
    expect(texto).toContain('deadbeef');
    expect(texto).not.toContain('Internal server error');
    expect(texto.toLowerCase()).not.toContain('conexión');
  });

  it('🔴 sin respuesta (status 0), la conexión', async () => {
    await confirmarCon(new ApiError(0, 'Failed to fetch'), 'request-info');
    const texto = $('#accion-postulacion-error')?.textContent ?? '';
    expect(texto.toLowerCase()).toContain('conexión');
    expect(texto).not.toContain('Failed to fetch');
  });

  it('un 409 dice lo que mandó el back y el modal sigue abierto', async () => {
    const { onClose } = await confirmarCon(new ApiError(409, 'Esta postulación ya fue rechazada.'));
    expect($('#accion-postulacion-error')?.textContent).toBe('Esta postulación ya fue rechazada.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('el texto no deja escribir más de lo que acepta el back (1000)', async () => {
    await act(async () => {
      root.render(
        <AccionDePostulacion type="reject" candidateName="Ana" onConfirm={() => Promise.resolve()} onClose={() => {}} />,
      );
    });
    expect($<HTMLTextAreaElement>('#accion-postulacion-texto')!.maxLength).toBe(MAX_LARGO_DEL_TEXTO_AL_CANDIDATO);
  });
});
