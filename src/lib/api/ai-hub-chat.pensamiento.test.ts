/**
 * El evento SSE `pensamiento` (aditivo, 02-10-2026): el cliente del chat lo lee
 * y lo entrega; mal formado, lo ignora sin romper el stream.
 */
import { describe, expect, it, vi } from 'vitest';

import { handleSSEEvent } from './ai-hub-chat';

const evento = (nombre: string, data: unknown) => `event: ${nombre}\ndata: ${JSON.stringify(data)}`;

describe('handleSSEEvent — pensamiento', () => {
  it('entrega el paso leído', () => {
    const onPensamiento = vi.fn();
    handleSSEEvent(
      evento('pensamiento', {
        type: 'pensamiento',
        id: 'despacho-d-1',
        fase: 'despacho',
        texto: 'Le pido al especialista de reportes: “Contratos que vencen en noviembre de 2026”…',
        estado: 'en_curso',
        agente: 'reportes',
        dispatchId: 'd-1',
        ms: 3580,
      }),
      { onPensamiento }
    );
    expect(onPensamiento).toHaveBeenCalledWith({
      id: 'despacho-d-1',
      fase: 'despacho',
      texto: 'Le pido al especialista de reportes: “Contratos que vencen en noviembre de 2026”…',
      estado: 'en_curso',
      agente: 'reportes',
      dispatchId: 'd-1',
      ms: 3580,
    });
  });

  it('mal formado no llega (y no rompe nada)', () => {
    const onPensamiento = vi.fn();
    handleSSEEvent(evento('pensamiento', { id: 'x' }), { onPensamiento });
    handleSSEEvent('event: pensamiento\ndata: {no es json', { onPensamiento });
    expect(onPensamiento).not.toHaveBeenCalled();
  });

  it('un panel sin el manejador lo ignora, como cualquier evento que no conoce', () => {
    expect(() => handleSSEEvent(evento('pensamiento', { id: 'a', texto: 'b', estado: 'listo' }), {})).not.toThrow();
  });
});
