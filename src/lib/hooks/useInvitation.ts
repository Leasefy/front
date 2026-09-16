'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiClient } from '@/lib/api/client';
import type { InvitationInfo } from '@/lib/types/inmobiliaria';

export type { InvitationInfo };

// ============================================================================
// Types
// ============================================================================

/**
 * `error` NO es `invalid` (A1).
 *
 * Antes un 500 o una red caída terminaban en «Invitación no encontrada» sin
 * forma de reintentar: la persona pedía otra invitación por algo que se
 * arreglaba solo en un minuto. Un fallo del servidor no dice nada sobre la
 * invitación, así que ahora se dice que falló y se deja volver a preguntar.
 */
export type InvitationStatus = 'loading' | 'valid' | 'expired' | 'invalid' | 'error';

export interface UseInvitationResult {
  invitation: InvitationInfo | null;
  status: InvitationStatus;
  /** Lo que tiró la consulta cuando `status === 'error'`, para decir qué pasó. */
  error: unknown;
  /** Vuelve a preguntar por la invitación. */
  reintentar: () => void;
}

/**
 * Qué dice un fallo sobre la invitación. Sólo los que el back usa para eso:
 *   - 404 → no existe o ya se usó (`invalid`);
 *   - 400 / 410 → venció (`expired`).
 * Todo lo demás —500, red caída, un límite de ritmo— es `error`: no dice nada
 * de la invitación y se puede reintentar.
 */
export function estadoPorFallo(err: unknown): 'invalid' | 'expired' | 'error' {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'invalid';
    if (err.status === 400 || err.status === 410) return 'expired';
  }
  return 'error';
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useInvitation — los datos de una invitación por su token, para la página
 * pública /invitacion/[token].
 *
 * 🔴 Por `apiClient`, no por `fetch` a mano (A2). Armaba la URL con
 * `NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'`: donde esa variable no
 * llegue al bundle, la página le pregunta al localhost de quien la abre. Es el
 * mismo bug que ya se arregló en aceptar y rechazar de esa página.
 */
export function useInvitation(token: string): UseInvitationResult {
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [error, setError] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setError(null);

    apiClient
      .get<InvitationInfo>(`/inmobiliaria/agency/invitations/${token}`)
      .then((datos) => {
        if (cancelled) return;
        setInvitation(datos);
        setStatus('valid');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setInvitation(null);
        setError(err);
        setStatus(estadoPorFallo(err));
      });

    return () => {
      cancelled = true;
    };
  }, [token, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  return { invitation, status, error, reintentar };
}
