/**
 * El aviso de lo programado al abrir el chat (D4, pregunta 19 — Nico 30-10).
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto, leer } = vi.hoisted(() => ({
  contexto: { sendMessage: vi.fn(), isThinking: false, isStreaming: false, isAgentsRunning: false },
  leer: vi.fn(),
}));
vi.mock('@/lib/context/BetaChatContext', () => ({ useBetaChatContext: () => contexto, useBetaChatOpcional: () => contexto }));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ agency: { id: 'ag-1' } }) }));
vi.mock('@/lib/chat/programado-listo', async (original) => ({
  ...(await original<typeof import('@/lib/chat/programado-listo')>()),
  leerLoProgramadoListo: leer,
}));

import { AvisoDeLoProgramado, __olvidarLoProgramadoListo } from './AvisoDeLoProgramado';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  __olvidarLoProgramadoListo();
  contexto.sendMessage.mockReset();
  leer.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  // 🔴 Todo dentro del chat: ningún enlace; la caja no tiene scroll propio.
  expect(container.querySelector('a')).toBeNull();
  expect(container.innerHTML).not.toMatch(/overflow-y-(auto|scroll)|max-h-/);
  act(() => root.unmount());
  container.remove();
});
const pintar = async () => {
  await act(async () => {
    root.render(<AvisoDeLoProgramado />);
  });
  await act(async () => {
    await Promise.resolve();
  });
};
const q = (id: string) => container.querySelector(`[data-testid="${id}"]`);

describe('AvisoDeLoProgramado', () => {
  it('cuántas quedaron listas, la primera con su texto, y «Hacerlo ahora» manda «haz lo programado» en el hilo', async () => {
    leer.mockResolvedValue({
      listas: [
        { id: 'p1', que: 'cada día 5: mándale el recordatorio', texto: 'Tocaba «mándale el recordatorio a los que deben» (cada día 5).', desde: '2026-11-05T13:01:00Z' },
        { id: 'p2', que: 'el lunes: extractos', texto: 'Tocaba «extractos».', desde: '2026-11-03T13:01:00Z' },
      ],
      salieronSolas: [],
    });
    await pintar();
    expect(q('aviso-de-lo-programado')?.textContent).toContain('Quedó listo lo que programaste');
    expect(q('listas-de-lo-programado')?.textContent).toBe('2');
    expect(q('primera-lista')?.textContent).toContain('mándale el recordatorio a los que deben');
    expect(container.textContent).toContain('Y 1 más esperando tu clic.');
    await act(async () => (q('hacer-lo-programado') as HTMLButtonElement).click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('haz lo programado');
    expect(q('aviso-de-lo-programado')).toBeNull();
  });

  it('lo que salió solo se dice como hecho, sin «Hacerlo ahora»', async () => {
    leer.mockResolvedValue({
      listas: [],
      salieronSolas: [{ id: 'p3', que: 'cada día 5: recordatorio', texto: 'Salió sola en Automático (Mori, a nombre de Ana): «recordatorio».', en: '2026-11-05T13:01:00Z' }],
    });
    await pintar();
    expect(q('aviso-de-lo-programado')?.textContent).toContain('Ya se hizo lo que programaste');
    expect(q('salio-sola')?.textContent).toContain('Salió sola en Automático');
    expect(q('hacer-lo-programado')).toBeNull();
    await act(async () => (q('lo-programado-entendido') as HTMLButtonElement).click());
    expect(q('aviso-de-lo-programado')).toBeNull();
    expect(contexto.sendMessage).not.toHaveBeenCalled();
  });

  it('sin nada que avisar (o sin micro) no pinta nada, y «Ahora no» no vuelve a pedirlo', async () => {
    leer.mockResolvedValue(null);
    await pintar();
    expect(container.innerHTML).toBe('');
    __olvidarLoProgramadoListo();
    leer.mockResolvedValue({ listas: [{ id: 'p1', que: 'x', texto: 'Tocaba «x».', desde: '2026-11-05T13:01:00Z' }], salieronSolas: [] });
    act(() => root.unmount());
    root = createRoot(container);
    await pintar();
    await act(async () => (q('lo-programado-ahora-no') as HTMLButtonElement).click());
    expect(q('aviso-de-lo-programado')).toBeNull();
    act(() => root.unmount());
    root = createRoot(container);
    await pintar();
    expect(q('aviso-de-lo-programado')).toBeNull();
    expect(leer).toHaveBeenCalledTimes(2);
  });
});
