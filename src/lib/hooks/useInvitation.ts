'use client';

import { useState, useEffect } from 'react';
import type { InvitationInfo } from '@/lib/types/inmobiliaria';

export type { InvitationInfo };

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

export type InvitationStatus = 'loading' | 'valid' | 'expired' | 'invalid';

export interface UseInvitationResult {
  invitation: InvitationInfo | null;
  status: InvitationStatus;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useInvitation
 *
 * Fetches invitation details for a given token.
 * Used by the public /invitacion/[token] page.
 *
 * Status transitions:
 *   loading → valid    (200 response with invitation data)
 *   loading → expired  (400 response — token expired)
 *   loading → invalid  (404 response or network error)
 */
export function useInvitation(token: string): UseInvitationResult {
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [status, setStatus] = useState<InvitationStatus>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    let cancelled = false;

    fetch(`${BACKEND_URL}/inmobiliaria/agency/invitations/${token}`)
      .then((r) => {
        if (cancelled) return;
        if (r.status === 404) {
          setStatus('invalid');
          return;
        }
        if (r.status === 400 || r.status === 410) {
          setStatus('expired');
          return;
        }
        if (!r.ok) {
          setStatus('invalid');
          return;
        }
        return r.json().then((d: InvitationInfo) => {
          if (!cancelled) {
            setInvitation(d);
            setStatus('valid');
          }
        });
      })
      .catch(() => {
        if (!cancelled) setStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return { invitation, status };
}
