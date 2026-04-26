'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Buildings,
  CheckCircle,
  XCircle,
  Warning,
  SpinnerGap,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/use-auth';
import { useInvitation } from '@/lib/hooks/useInvitation';
import { getAccessToken } from '@/lib/api/client';

// ============================================================================
// Helpers
// ============================================================================

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENTE: 'Agente',
  CONTADOR: 'Contador',
  VIEWER: 'Observador',
};

function formatExpiry(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

// ============================================================================
// State Views
// ============================================================================

/** Spinner while validating token */
function LoadingView() {
  return (
    <div className="flex flex-col items-center gap-4">
      <SpinnerGap className="h-10 w-10 text-indigo-500 animate-spin" />
      <p className="text-neutral-500 dark:text-neutral-400 text-sm">Validando invitación…</p>
    </div>
  );
}

/** Token not found */
function InvalidView() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-2xl bg-red-100 dark:bg-red-900/30 p-4">
        <XCircle weight="duotone" className="h-10 w-10 text-red-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Invitación no encontrada
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Este enlace no es válido o ya fue usado. Solicita una nueva invitación a tu agencia.
        </p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-xl bg-neutral-900 dark:bg-white px-6 py-2.5 text-sm font-medium text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
      >
        Ir al inicio
      </Link>
    </div>
  );
}

/** Token expired */
function ExpiredView() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-2xl bg-amber-100 dark:bg-amber-900/30 p-4">
        <Warning weight="duotone" className="h-10 w-10 text-amber-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Invitación expirada
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Este enlace de invitación ya no está vigente. Pide al administrador de la agencia que te
          envíe una nueva invitación.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

/**
 * /invitacion/[token]
 *
 * Public page — anyone with the link can view agency info.
 * Login is required to accept the invitation.
 *
 * States:
 *   loading  → spinner
 *   invalid  → not found message + go home
 *   expired  → alert with re-invite suggestion
 *   valid, not logged in  → login/register buttons
 *   valid, logged in      → accept/decline buttons
 */
export default function InvitacionPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const router = useRouter();
  const { user, isLoading: authLoading, needsOnboarding } = useAuth();
  const { invitation, status } = useInvitation(token);

  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // After the user logs in and returns to this page, accept the invite
  // if they were redirected here post-login.
  // (No auto-accept — user must click the button explicitly.)

  // ---- Redirect helpers ----
  const loginUrl = `/auth?redirect=/invitacion/${token}`;
  // New users go through /registro which creates backend profile (AGENCY type) + accepts invitation.
  // The generic /auth flow only creates a Supabase account and leaves needsOnboarding: true.
  const registerUrl = `/registro?invitationToken=${token}`;

  // ---- Accept ----
  async function handleAccept() {
    // User authenticated in Supabase but has no backend profile yet → complete registration first
    if (needsOnboarding) {
      router.push(`/registro?invitationToken=${token}`);
      return;
    }

    setAccepting(true);
    setActionError(null);
    try {
      const accessToken = getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/inmobiliaria/agency/invitations/${token}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'No se pudo aceptar la invitación');
      }

      // Hard navigation so auth context reinitializes with the updated role from backend
      window.location.replace('/panel/inmobiliaria');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al aceptar la invitación');
      setAccepting(false);
    }
  }

  // ---- Decline ----
  async function handleDecline() {
    setDeclining(true);
    setActionError(null);
    try {
      const accessToken = getAccessToken();
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/inmobiliaria/agency/invitations/${token}/decline`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      ).catch(() => {
        // Ignore network errors on decline — navigate away anyway
      });

      router.push('/');
    } catch {
      // Navigate away even if the call fails
      router.push('/');
    }
  }

  // ---- Loading state (while auth or token are resolving) ----
  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#111113] p-4">
        <LoadingView />
      </div>
    );
  }

  // ---- Error states ----
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#111113] p-4">
        <div className="w-full max-w-md">
          <InvalidView />
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#111113] p-4">
        <div className="w-full max-w-md">
          <ExpiredView />
        </div>
      </div>
    );
  }

  // ---- Valid invitation ----
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#111113] p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 p-4">
            <Buildings weight="duotone" className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {invitation?.agencyName}
            </h1>
            {invitation?.agencyCity && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {invitation.agencyCity}
              </p>
            )}
          </div>
        </div>

        {/* Invitation Info Card */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
          {user ? (
            // Logged in state
            <>
              <div className="flex items-center gap-3">
                <CheckCircle weight="fill" className="h-5 w-5 text-emerald-500 shrink-0" />
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Hola <span className="font-medium">{user.firstName || user.name}</span>, te han
                  invitado a unirte como
                </p>
              </div>
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 text-center">
                <p className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
                  {ROLE_LABELS[invitation?.role ?? ''] ?? invitation?.role}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  en {invitation?.agencyName}
                </p>
              </div>
            </>
          ) : (
            // Not logged in state
            <>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wide text-xs mb-1">
                  Rol asignado
                </p>
                <p className="text-base font-semibold text-neutral-900 dark:text-white">
                  {ROLE_LABELS[invitation?.role ?? ''] ?? invitation?.role}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wide text-xs mb-1">
                  Invitado como
                </p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {invitation?.invitedEmail}
                </p>
              </div>
            </>
          )}

          {/* Expiry date */}
          {invitation?.expiresAt && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-700 pt-3">
              Válida hasta el {formatExpiry(invitation.expiresAt)}
            </p>
          )}
        </div>

        {/* Error message */}
        {actionError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {user ? (
            // Logged in with full profile: accept / decline
            <>
              <button
                onClick={handleAccept}
                disabled={accepting || declining}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 text-sm font-medium text-white transition-colors"
              >
                {accepting && <SpinnerGap className="h-4 w-4 animate-spin" />}
                {accepting ? 'Aceptando…' : 'Aceptar invitación'}
              </button>
              <button
                onClick={handleDecline}
                disabled={accepting || declining}
                className="w-full rounded-xl border border-red-200 dark:border-red-900/50 px-6 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {declining ? 'Rechazando…' : 'Rechazar invitación'}
              </button>
            </>
          ) : needsOnboarding ? (
            // Supabase session exists but no backend profile yet → complete registration
            <>
              <Link
                href={registerUrl}
                className="block w-full text-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-sm font-medium text-white transition-colors"
              >
                Completar registro para unirme
              </Link>
              <button
                onClick={handleDecline}
                disabled={declining}
                className="w-full text-center text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-60 py-1 transition-colors"
              >
                {declining ? 'Rechazando…' : 'Rechazar invitación'}
              </button>
            </>
          ) : (
            // Not logged in: login / register / decline
            <>
              <Link
                href={loginUrl}
                className="block w-full text-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-sm font-medium text-white transition-colors"
              >
                Iniciar sesión para aceptar
              </Link>
              <Link
                href={registerUrl}
                className="block w-full text-center rounded-xl border border-neutral-300 dark:border-neutral-600 px-6 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Crear cuenta nueva
              </Link>
              <button
                onClick={handleDecline}
                disabled={declining}
                className="w-full text-center text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-60 py-1 transition-colors"
              >
                {declining ? 'Rechazando…' : 'Rechazar invitación'}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
          Necesitas ayuda?{' '}
          <Link href="/ayuda" className="underline hover:text-neutral-600 dark:hover:text-neutral-300">
            Visita el centro de ayuda
          </Link>
        </p>
      </div>
    </div>
  );
}
