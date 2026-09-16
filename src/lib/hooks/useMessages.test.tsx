/**
 * @vitest-environment happy-dom
 */
/**
 * X1 — `useThreadMessages` separa el fallo de CARGA del fallo de ENVÍO.
 *
 * Con un solo `error`, un GET caído (o el poll de 5 s) se pintaba en la
 * pantalla como «No se pudo enviar», sin que nadie hubiera enviado nada.
 */
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: {
    getConversationMessages: vi.fn(),
    sendConversationMessage: vi.fn(),
    markConversationAsRead: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1', name: 'Yo' } }),
}));

vi.mock('@/lib/api/messages.service', () => ({
  messagesApi: api,
}));

import { ApiError } from '@/lib/api/client';
import { useChat } from './useMessages';

let root: Root;
let contenedor: HTMLDivElement;
const ref: { current: ReturnType<typeof useChat> | null } = { current: null };

function Sonda() {
  ref.current = useChat('conv-1');
  return null;
}

async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root.render(<Sonda />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  api.getConversationMessages.mockReset();
  api.sendConversationMessage.mockReset();
  api.markConversationAsRead.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
  vi.useRealTimers();
});

describe('useChat — carga y envío son dos errores', () => {
  it('un GET caído llena `errorDeCarga` (crudo) y NO `errorDeEnvio`', async () => {
    const fallo = new ApiError(500, 'Internal server error');
    api.getConversationMessages.mockRejectedValue(fallo);

    await montar();

    expect(ref.current!.errorDeCarga).toBe(fallo);
    expect(ref.current!.errorDeEnvio).toBeNull();
  });

  it('el poll de 5 s que falla tampoco dice «no se pudo enviar»', async () => {
    vi.useFakeTimers();
    api.getConversationMessages.mockResolvedValueOnce({ messages: [] });
    await montar();
    expect(ref.current!.errorDeCarga).toBeNull();

    api.getConversationMessages.mockRejectedValue(new ApiError(503, 'unavailable'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(ref.current!.errorDeCarga).toBeInstanceOf(ApiError);
    expect(ref.current!.errorDeEnvio).toBeNull();
  });

  it('un POST caído llena `errorDeEnvio` y devuelve false', async () => {
    api.getConversationMessages.mockResolvedValue({ messages: [] });
    api.sendConversationMessage.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await montar();

    let ok: boolean | undefined;
    await act(async () => {
      ok = await ref.current!.sendMessage('Hola');
    });

    expect(ok).toBe(false);
    expect(ref.current!.errorDeEnvio).toBe('Failed to fetch');
    expect(ref.current!.errorDeCarga).toBeNull();
  });

  it('reintentar la carga limpia el fallo cuando el GET vuelve', async () => {
    api.getConversationMessages.mockRejectedValueOnce(new ApiError(500, 'x'));
    await montar();
    expect(ref.current!.errorDeCarga).not.toBeNull();

    api.getConversationMessages.mockResolvedValue({ messages: [] });
    await act(async () => {
      await ref.current!.reintentarCarga();
    });

    expect(ref.current!.errorDeCarga).toBeNull();
  });
});
