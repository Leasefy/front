/**
 * Lo que se le dice a quien aprieta «Invitar».
 *
 * 🔴 La distinción que importa: la cuenta puede quedar CREADA y el correo NO
 * salir. Decir «listo» ahí deja a una persona esperando un enlace que nunca
 * llegó — es el mismo agujero que dejó 1.446 invitaciones invisibles el 8 de
 * septiembre.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { invitarAlPortal, toastMock } = vi.hoisted(() => ({
  invitarAlPortal: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { invitarAlPortal },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { InvitarAlPortal, porQueNoSalioLaInvitacion } from './InvitarAlPortal';

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

async function pintar(correo: string | null = 'ana@example.co') {
  const onInvitado = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <InvitarAlPortal propietarioId="p-1" correo={correo} onInvitado={onInvitado} />,
    );
  });
  return onInvitado;
}

async function invitar() {
  await act(async () => {
    (q('invitar-propietario') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  invitarAlPortal.mockReset();
  Object.values(toastMock).forEach((f) => f.mockClear());
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

describe('<InvitarAlPortal>', () => {
  it('cuando sale, lo dice con el correo al que llegó', async () => {
    invitarAlPortal.mockResolvedValue({ cuentaDePortalId: 'u-1', enviada: true });
    const onInvitado = await pintar('ana@correo.co');

    await invitar();

    expect(onInvitado).toHaveBeenCalledWith('u-1');
    const [titulo, opciones] = toastMock.success.mock.calls[0];
    expect(titulo).toBe('Invitación enviada');
    expect(opciones.description).toContain('ana@correo.co');
  });

  /*
   * 🔴 La cuenta quedó creada —el mensaje ya funciona— pero el correo no
   * salió. Son dos hechos distintos y se dicen los dos.
   */
  it('si el correo no sale, avisa sin decir que está listo', async () => {
    invitarAlPortal.mockResolvedValue({
      cuentaDePortalId: 'u-1',
      enviada: false,
      motivo: 'ENVIO_FALLIDO',
    });
    const onInvitado = await pintar();

    await invitar();

    // La cuenta sirve igual: la ficha ya puede ofrecer el mensaje.
    expect(onInvitado).toHaveBeenCalledWith('u-1');
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.warning.mock.calls[0][0]).toContain('el correo no salió');
  });

  it('un correo que no existe como dominio se explica, no se repite', async () => {
    invitarAlPortal.mockResolvedValue({
      cuentaDePortalId: 'u-1',
      enviada: false,
      motivo: 'DOMINIO_NO_ENTREGABLE',
    });
    await pintar();

    await invitar();

    expect(toastMock.warning.mock.calls[0][1].description).toContain('Corrígelo en su ficha');
  });

  it('un reenvío demasiado seguido dice que espere', async () => {
    invitarAlPortal.mockResolvedValue({
      cuentaDePortalId: 'u-1',
      enviada: false,
      motivo: 'RECIEN_ENVIADA',
    });
    await pintar();

    await invitar();

    expect(toastMock.warning.mock.calls[0][1].description).toContain('Espera unos minutos');
  });

  it('si el servidor falla no se inventa una cuenta', async () => {
    invitarAlPortal.mockRejectedValue(new Error('500'));
    const onInvitado = await pintar();

    await invitar();

    expect(onInvitado).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
    // Y el botón vuelve: se puede reintentar.
    expect((q('invitar-propietario') as HTMLButtonElement).disabled).toBe(false);
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, y no culpa a la conexión', async () => {
    const { ApiError } = await import('@/lib/api/client');
    invitarAlPortal.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    );
    await pintar();
    await invitar();
    const texto = String(toastMock.error.mock.calls[0][0]);
    expect(texto).toMatch(/^No pudimos invitarlo al portal: algo falló de nuestro lado/);
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/conexi[oó]n|Intenta de nuevo/);
  });

  it('un 400 dice lo que el back no aceptó, por sus campos', async () => {
    const { ApiError } = await import('@/lib/api/client');
    invitarAlPortal.mockRejectedValue(
      new ApiError(400, 'El correo del propietario no es válido.', 'DATOS_INVALIDOS', {
        campos: [{ campo: 'email', regla: 'formato', mensaje: 'El correo del propietario no es válido.' }],
      }),
    );
    await pintar();
    await invitar();
    expect(toastMock.error.mock.calls[0][0]).toBe('El correo del propietario no es válido.');
  });

  it('sin respuesta (la red), ahí sí se habla de la conexión', async () => {
    invitarAlPortal.mockRejectedValue(new TypeError('Failed to fetch'));
    await pintar();
    await invitar();
    expect(String(toastMock.error.mock.calls[0][0])).toMatch(/conexión/);
  });

  it('sin correo el botón no se puede apretar', async () => {
    await pintar(null);

    expect((q('invitar-propietario') as HTMLButtonElement).disabled).toBe(true);
    expect(q('propietario-sin-cuenta')?.textContent).toContain('Agrega su correo');
  });
});

/**
 * 🔴 P-24 (QA-PROP, 03-10): el back responde `{ enviada: false, motivo:
 * "DOMINIO_NO_ENTREGABLE" }` y la cuenta queda creada; la ficha dejaba de
 * montar el bloque y la pantalla no decía nada que durara. El bloque se queda
 * en «Invitación sin entregar», con el motivo en palabras y «Reintentar».
 */
describe('<InvitarAlPortal> — la invitación que no salió (P-24)', () => {
  /** Como la ficha: guarda `sinEntregar` y se lo devuelve al bloque. */
  function ConLaFicha({ correo }: { correo: string }) {
    const [sinEntregar, setSinEntregar] = React.useState<{ motivo?: string } | null>(null);
    return (
      <InvitarAlPortal
        propietarioId="p-1"
        correo={correo}
        onInvitado={() => {}}
        sinEntregar={sinEntregar}
        onSinEntregar={setSinEntregar}
      />
    );
  }

  async function pintarConLaFicha(correo = 'ruben.mejia@example.test') {
    container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<ConLaFicha correo={correo} />);
    });
  }

  it('🔴 si no salió, el bloque dice «Invitación sin entregar», por qué en palabras (nunca el código) y ofrece reintentar', async () => {
    invitarAlPortal.mockResolvedValue({ cuentaDePortalId: 'u-1', enviada: false, motivo: 'DOMINIO_NO_ENTREGABLE' });
    await pintarConLaFicha();
    await invitar();

    const bloque = q('invitacion-sin-entregar');
    expect(bloque).not.toBeNull();
    expect(bloque!.textContent).toContain('Invitación sin entregar');
    expect(q('motivo-de-la-invitacion')!.textContent).toContain('ruben.mejia@example.test');
    expect(q('motivo-de-la-invitacion')!.textContent).toContain('Corrígelo con «Editar»');
    expect(bloque!.textContent).not.toContain('DOMINIO_NO_ENTREGABLE');
    expect(q('invitar-propietario')!.textContent).toContain('Reintentar');
  });

  it('reintentar y que salga: el bloque deja de decir «sin entregar»', async () => {
    invitarAlPortal.mockResolvedValueOnce({ cuentaDePortalId: 'u-1', enviada: false, motivo: 'ENVIO_FALLIDO' });
    await pintarConLaFicha('ana@correo.co');
    await invitar();
    expect(q('invitacion-sin-entregar')).not.toBeNull();

    invitarAlPortal.mockResolvedValueOnce({ cuentaDePortalId: 'u-1', enviada: true });
    await invitar();
    expect(q('invitacion-sin-entregar')).toBeNull();
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('cada motivo se dice en palabras; uno desconocido, lo general', () => {
    for (const motivo of ['DOMINIO_NO_ENTREGABLE', 'RECIEN_ENVIADA', 'CORREO_NO_CONFIGURADO', 'ENVIO_FALLIDO', 'ERROR', 'OTRO']) {
      const frase = porQueNoSalioLaInvitacion(motivo, 'a@b.test');
      expect(frase).not.toContain(motivo);
      expect(frase.length).toBeGreaterThan(20);
    }
  });
});
