/**
 * CHAT-95 (04-10-2026): el 429 del tope de IA del micro trae `motivo`. Cuando
 * lo que se acabó es el cupo DIARIO de la inmobiliaria, la burbuja lo dice
 * (vuelve mañana) en vez de «Espera un momento», que hacía reintentar en vano.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ user: null, session: null }) }));

import { ApiError } from '@/lib/api/client';
import { mensajeDeFalloDelChat } from './useBetaChat';

describe('mensajeDeFalloDelChat y el tope de IA', () => {
  it('el cupo del día de la inmobiliaria: «vuelve mañana», nunca «espera un momento»', () => {
    const error = new ApiError(429, 'Tu inmobiliaria llegó al límite…', 'tope_de_ia', {
      code: 'tope_de_ia',
      motivo: 'inmobiliaria',
      reintentarEnSegundos: 9000,
    });
    const texto = mensajeDeFalloDelChat(error);
    expect(texto).toBe(
      'Tu inmobiliaria llegó al límite de uso de la IA por hoy. Vuelve a intentarlo mañana o escríbenos si necesitas más.',
    );
    expect(texto).not.toMatch(/demasiadas solicitudes|Espera/);
  });

  it('el tope por minuto de la persona sigue con la frase de siempre y el plazo', () => {
    const error = new ApiError(429, 'Vas muy rápido.', 'tope_de_ia', {
      code: 'tope_de_ia',
      motivo: 'usuario',
      reintentarEnSegundos: 42,
    });
    expect(mensajeDeFalloDelChat(error)).toBe(
      'Hiciste demasiadas solicitudes seguidas. Espera 42 segundos y vuelve a intentar.',
    );
  });
});
