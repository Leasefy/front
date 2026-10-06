/**
 * `MotivoDialog`: el motivo demasiado largo y el rechazo del back se dicen
 * BAJO el campo (con `ErrorDelCampo`), nunca en un toast (Nico, 02-10-2026).
 *
 *   · más largo que `maximo`: la frase del back, el campo marcado y el botón
 *     que no manda;
 *   · `error` (lo que respondió el back): bajo el campo, el diálogo abierto
 *     con lo escrito, y se borra apenas se edita el texto;
 *   · `mensajeDelRechazoDelMotivo`: la frase del campo si el back la trae; si
 *     no, el traductor (un 5xx de nuestro lado con la referencia; la conexión
 *     sólo sin respuesta); un 401 no dice nada.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ toast: { error: toastError, success: vi.fn(), info: vi.fn() } }));

// Radix monta en un portal: acá interesa el contenido y la lógica, que es la real.
vi.mock('@/components/ui/alert-dialog', () => {
  const Pasa = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    AlertDialog: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    AlertDialogContent: ({
      children,
      variant: _v,
      icon: _i,
      ...rest
    }: React.ComponentProps<'div'> & { variant?: string; icon?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
    AlertDialogHeader: Pasa,
    AlertDialogFooter: Pasa,
    AlertDialogTitle: Pasa,
    AlertDialogDescription: Pasa,
    AlertDialogAction: ({ loading: _l, ...props }: React.ComponentProps<'button'> & { loading?: boolean }) => (
      <button {...props} />
    ),
    AlertDialogCancel: (props: React.ComponentProps<'button'>) => <button {...props} />,
  };
});

import { MotivoDialog, mensajeDelRechazoDelMotivo, fraseDelMotivoLargo } from './MotivoDialog';
import { ApiError } from '@/lib/api/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  toastError.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function pintar(props: Partial<React.ComponentProps<typeof MotivoDialog>> = {}) {
  const onConfirmar = vi.fn();
  act(() => {
    root.render(
      <MotivoDialog
        abierto
        titulo="¿Marcar como perdido?"
        descripcion="Sale del embudo."
        etiquetaConfirmar="Marcar como perdido"
        ayuda="Se guarda en el candidato."
        ejemplo="Cuenta por qué se cayó."
        onCerrar={() => {}}
        onConfirmar={onConfirmar}
        {...props}
      />,
    );
  });
  return { onConfirmar };
}

const campo = () => container.querySelector<HTMLTextAreaElement>('[data-testid="motivo-texto"]')!;
const confirmar = () => container.querySelector<HTMLButtonElement>('[data-testid="motivo-confirmar"]')!;
const errorBajoElCampo = () => document.getElementById('motivo-de-la-agenda-error');

async function escribir(texto: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo(), texto);
    campo().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('MotivoDialog — el motivo demasiado largo', () => {
  it('🔴 más largo que `maximo` se dice bajo el campo, con la frase del back, y no manda', async () => {
    const { onConfirmar } = pintar({ maximo: 20 });
    await escribir('Se fue con otra inmobiliaria');

    expect(errorBajoElCampo()?.textContent).toBe(fraseDelMotivoLargo(20));
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(campo().getAttribute('aria-describedby')).toBe('motivo-de-la-agenda-error');
    expect(confirmar().disabled).toBe(true);

    await act(async () => {
      confirmar().click();
    });
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('por defecto el tope es el de la columna (500) y pegar más no se corta en silencio', async () => {
    pintar();
    // Sin `maxLength`: lo pegado queda entero y se dice qué sobra.
    expect(campo().hasAttribute('maxlength')).toBe(false);
    await escribir('m'.repeat(501));
    expect(campo().value).toHaveLength(501);
    expect(errorBajoElCampo()?.textContent).toBe('El motivo puede tener hasta 500 caracteres.');
  });

  it('dentro del tope no hay error y manda el motivo sin espacios de más', async () => {
    const { onConfirmar } = pintar();
    await escribir('  Se fue con otra inmobiliaria  ');

    expect(campo().getAttribute('aria-invalid')).toBeNull();
    await act(async () => {
      confirmar().click();
    });
    expect(onConfirmar).toHaveBeenCalledWith('Se fue con otra inmobiliaria');
  });
});

/**
 * 🔴 Nico (02-10-2026): la ayuda decía SIEMPRE «…queda en el historial de la
 * visita», también al marcar perdido a un candidato. Ahora la pone quien llama.
 */
describe('MotivoDialog — la ayuda y el ejemplo los pone quien llama', () => {
  it('con el motivo suficiente, la ayuda es la de quien llama; nunca «el historial de la visita»', async () => {
    pintar({ ayuda: 'Se guarda en el candidato y se ve en su ficha.', ejemplo: 'Cuenta por qué se cayó.' });
    await escribir('Tomó otro apartamento más cerca');
    expect(container.textContent).toContain('Se guarda en el candidato y se ve en su ficha.');
    expect(container.textContent).not.toContain('historial de la visita');
  });

  it('el ejemplo del campo vacío es el de quien llama', () => {
    pintar({ ejemplo: 'Cuenta por qué no se puede hacer esta visita.' });
    expect(campo().getAttribute('placeholder')).toBe('Cuenta por qué no se puede hacer esta visita.');
    expect(campo().getAttribute('placeholder')).not.toContain('Lo va a leer');
  });

  it('mientras falta texto, la ayuda dice cuánto falta (no dónde se guarda)', async () => {
    pintar({ ayuda: 'Se guarda en la visita.' });
    await escribir('corto');
    expect(container.textContent).toContain('Escribe 5 caracteres más.');
    expect(container.textContent).not.toContain('Se guarda en la visita.');
  });
});

describe('MotivoDialog — el rechazo del back', () => {
  it('🔴 `error` sale bajo el campo y el diálogo sigue abierto con lo escrito', async () => {
    pintar();
    await escribir('El propietario pidió reprogramar');
    await act(async () => {
      root.render(
        <MotivoDialog
          abierto
          titulo="¿Cancelar esta visita?"
          descripcion="La visita se cancela."
          etiquetaConfirmar="Cancelar la visita"
          ayuda="Se guarda en la visita."
          ejemplo="Cuenta qué pasó."
          error="Esta visita ya estaba cancelada."
          onCerrar={() => {}}
          onConfirmar={() => {}}
        />,
      );
    });
    // La ayuda sale y el error entra (cruce de `ErrorDelCampo`).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(errorBajoElCampo()?.textContent).toBe('Esta visita ya estaba cancelada.');
    expect(campo().value).toBe('El propietario pidió reprogramar');
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('al editar el texto, el error del back se borra (lo nuevo no es lo rechazado)', async () => {
    pintar({ error: 'Esta visita ya estaba cancelada.' });
    expect(errorBajoElCampo()?.textContent).toBe('Esta visita ya estaba cancelada.');

    await escribir('Otro motivo, ahora sí con detalle');
    expect(campo().getAttribute('aria-invalid')).toBeNull();
    expect(container.textContent).not.toContain('Esta visita ya estaba cancelada.');
  });
});

describe('mensajeDelRechazoDelMotivo', () => {
  const opciones = {
    campo: 'lostReason',
    porDefecto: 'No se pudo marcar como perdido.',
    accion: 'marcar el lead como perdido',
  };

  it('🔴 si el back trae el campo del motivo, va SU frase', () => {
    const frase = 'El motivo puede tener hasta 500 caracteres.';
    const error = new ApiError(400, [frase, 'Otra cosa'], 'DATOS_INVALIDOS', {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: [frase, 'Otra cosa'],
      campos: [
        { campo: 'stage', regla: 'opcion', mensaje: 'Otra cosa' },
        { campo: 'lostReason', regla: 'longitud_maxima', mensaje: frase },
      ],
    });
    expect(mensajeDelRechazoDelMotivo(error, opciones)).toBe(frase);
  });

  it('un 409 sin campos dice lo que mandó el back', () => {
    const error = new ApiError(409, 'Esta oportunidad ya está cerrada.');
    expect(mensajeDelRechazoDelMotivo(error, opciones)).toBe('Esta oportunidad ya está cerrada.');
  });

  it('🔴 un 5xx dice que fue de nuestro lado, con la referencia, sin culpar a la conexión', () => {
    const texto = mensajeDelRechazoDelMotivo(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
      opciones,
    )!;
    expect(texto).toContain('de nuestro lado');
    expect(texto).toContain('ab12cd34');
    expect(texto.toLowerCase()).not.toContain('conexión');
  });

  it('sin respuesta (status 0) habla de la conexión', () => {
    expect(mensajeDelRechazoDelMotivo(new ApiError(0, 'Failed to fetch'), opciones)?.toLowerCase()).toContain(
      'conexión',
    );
  });

  it('un 401 no dice nada: el cliente ya está cerrando la sesión', () => {
    expect(mensajeDelRechazoDelMotivo(new ApiError(401, 'Unauthorized'), opciones)).toBeNull();
  });
});
