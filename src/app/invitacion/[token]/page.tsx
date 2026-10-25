'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  AvisoDelEnlace,
  CargandoElEnlace,
  DatoDelEnlace,
  MarcoDelEnlace,
  TituloDelEnlace,
} from '@/components/enlace-publico/MarcoDelEnlace';
import { useAuth } from '@/lib/auth/use-auth';
import { useInvitation } from '@/lib/hooks/useInvitation';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { getSupabase } from '@/lib/supabase/client';
import { mensajeDeSupabase } from '@/lib/auth/errores-de-supabase';

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
    // «17 oct 2026», la fecha de la casa (antes «17 de octubre de 2026»).
    return new Date(isoDate)
      .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      .replace(/\./g, '')
      .replace(/ de /g, ' ');
  } catch {
    return isoDate;
  }
}

// ============================================================================
// State Views (el marco común de las pantallas por enlace)
// ============================================================================

/** Token not found */
function InvalidView() {
  return (
    <AvisoDelEnlace tono="invalido" titulo="Invitación no encontrada">
      <p>Este enlace no es válido o ya fue usado. Pídele una invitación nueva a tu inmobiliaria.</p>
      <div className="pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </AvisoDelEnlace>
  );
}

/** Token expired */
function ExpiredView() {
  return (
    <AvisoDelEnlace tono="vencido" titulo="Esta invitación venció">
      <p>
        El enlace ya no está vigente. Pídele al administrador de la inmobiliaria que te mande una
        invitación nueva: te llega al mismo correo.
      </p>
      <div className="pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </AvisoDelEnlace>
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
 *   loading  → la carga con la marca, dentro del marco del enlace
 *   invalid  → not found message + go home (sólo el 404)
 *   error    → no se pudo validar (500, red caída) + reintentar
 *   expired  → alert with re-invite suggestion
 *   valid, not logged in  → login/register buttons
 *   valid, logged in      → accept/decline buttons
 */
export default function InvitacionPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const router = useRouter();
  const { user, isLoading: authLoading, needsOnboarding } = useAuth();
  const { invitation, status, error: invitationError, reintentar } = useInvitation(token);

  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  /** «Crear mi contraseña»: la cuenta existe y nunca entró (21-10-2026). */
  const [pidiendoEnlace, setPidiendoEnlace] = useState(false);
  const [enlaceEnviado, setEnlaceEnviado] = useState(false);

  // After the user logs in and returns to this page, accept the invite
  // if they were redirected here post-login.
  // (No auto-accept — user must click the button explicitly.)

  // ---- Redirect helpers ----
  // AuthForm reads `returnUrl` (not `redirect`); after login it sends the user
  // back here, where the invitation flow (accept / complete-registration) lives.
  const loginUrl = `/auth?returnUrl=${encodeURIComponent(`/invitacion/${token}`)}`;
  // New users go through /registro which creates backend profile (AGENCY type) + accepts invitation.
  // The generic /auth flow only creates a Supabase account and leaves needsOnboarding: true.
  const registerUrl = `/registro?invitationToken=${token}`;

  /*
   * 🔴 21-10-2026 (Portofino, Laura): la invitación iba a una cuenta que la
   * migración creó y que nunca tuvo contraseña. «Iniciar sesión» no tenía con
   * qué, «Crear cuenta nueva» chocaba con el correo y «¿Olvidaste tu
   * contraseña?» la dejaba en «Nueva contraseña» con el enlace vencido. Ahora
   * se le manda un enlace para CREARLA que vuelve aquí a aceptar.
   */
  async function pedirEnlaceParaCrearContrasena() {
    const correo = invitation?.invitedEmail?.trim();
    const sb = getSupabase();
    if (!correo || !sb) return;
    setPidiendoEnlace(true);
    setActionError(null);
    try {
      const vuelta = `/auth/update-password?nuevo=1&next=${encodeURIComponent(`/invitacion/${token}`)}`;
      const { error } = await sb.auth.resetPasswordForEmail(correo, {
        redirectTo: `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(vuelta)}`,
      });
      if (error) throw error;
      setEnlaceEnviado(true);
    } catch (err) {
      setActionError(
        mensajeDeSupabase(err, {
          porDefecto: 'No pudimos mandarte el enlace. Prueba de nuevo en un momento.',
          accion: 'mandarte el enlace',
        }),
      );
    } finally {
      setPidiendoEnlace(false);
    }
  }

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
      /*
       * 🔴 Por `apiClient`, no por `fetch` a mano.
       *
       * Hasta el 2026-09-05 estas dos llamadas armaban la URL con
       * `process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'`: en un
       * despliegue donde esa variable no llegue al bundle, aceptar una
       * invitación en producción apunta al localhost de quien abre la página.
       * `apiClient` además trae la sesión, el reintento del 401 que acaba de
       * vencer y el mensaje de error del back ya desempaquetado.
       */
      await apiClient.post(`/inmobiliaria/agency/invitations/${token}/accept`);

      // Navegación dura para que el contexto de auth vuelva a arrancar con el
      // rol nuevo que escribió el back.
      window.location.replace('/panel/inmobiliaria');
    } catch (err) {
      // 02-10-2026: con la regla de oro del traductor (antes, `err.message`
      // crudo: un 5xx decía «Error interno del servidor.»; la red, «Failed to fetch»).
      setActionError(
        mensajeParaLaPersona(err, {
          accion: 'aceptar la invitación',
          porDefecto: 'No pudimos aceptar la invitación. Prueba de nuevo en un momento.',
        }),
      );
      setAccepting(false);
    }
  }

  // ---- Decline ----
  async function handleDecline() {
    setDeclining(true);
    setActionError(null);
    try {
      // Mismo criterio que aceptar: la URL del back la resuelve `apiClient`.
      await apiClient.post(`/inmobiliaria/agency/invitations/${token}/decline`);
    } catch (err) {
      /*
       * A5: antes se tragaba el fallo y se iba al inicio igual, así que la
       * persona creía haber rechazado una invitación que seguía viva. Se dice
       * con el motivo, y se queda para poder reintentar.
       */
      toast.error('No se pudo rechazar la invitación', {
        description: mensajeParaLaPersona(err, {
          accion: 'rechazar la invitación',
          porDefecto: 'Reintenta en un momento.',
        }),
      });
      setDeclining(false);
      return;
    }
    router.push('/');
  }

  const rol = ROLE_LABELS[invitation?.role ?? ''] ?? invitation?.role;

  // ---- Loading state (while auth or token are resolving) ----
  if (authLoading || status === 'loading') {
    return (
      <MarcoDelEnlace vista="cargando">
        <CargandoElEnlace texto="Validando invitación…" />
      </MarcoDelEnlace>
    );
  }

  // ---- Error states ----
  // A1: un 500 o la red caída no dicen nada de la invitación. Se dice que no
  // se pudo validar y se deja reintentar; «no encontrada» es sólo el 404.
  if (status === 'error') {
    return (
      <MarcoDelEnlace vista="fallo">
        <FalloDeCarga
          error={invitationError}
          queEs="la invitación"
          onReintentar={reintentar}
          enmarcado={false}
        />
      </MarcoDelEnlace>
    );
  }

  if (status === 'invalid') {
    return (
      <MarcoDelEnlace vista="invalida">
        <InvalidView />
      </MarcoDelEnlace>
    );
  }

  if (status === 'expired') {
    return (
      <MarcoDelEnlace vista="vencida">
        <ExpiredView />
      </MarcoDelEnlace>
    );
  }

  // ---- Valid invitation ----
  // Glow up 22-10: el marco común del enlace (logo + «De parte de»), arriba LA
  // RESPUESTA —a qué inmobiliaria y con qué rol— y la ficha de la invitación;
  // un solo botón azul (antes el ícono en una caja azul, el rol en otra caja
  // azul y los botones pintados a mano con hex).
  const nombre = user ? user.firstName || user.name : null;
  return (
    <MarcoDelEnlace de={invitation?.agencyName} vista="invitacion">
      <TituloDelEnlace
        rotulo="Invitación al equipo"
        titulo={`Te invitaron a ${invitation?.agencyName ?? 'una inmobiliaria'}`}
        descripcion={
          user
            ? `${nombre ? `Hola ${nombre}: ` : ''}entras como ${rol}. Acepta para empezar a trabajar en el panel de la inmobiliaria.`
            : invitation?.cuentaSinEstrenar && !needsOnboarding
              ? `Entras como ${rol}. Primero crea tu contraseña: te mandamos el enlace al correo de la invitación.`
              : `Entras como ${rol}. Inicia sesión con el correo de la invitación para aceptarla.`
        }
      />

      <dl className="grid gap-4 border-t border-border-faint pt-5 sm:grid-cols-2">
        <DatoDelEnlace rotulo="Inmobiliaria">
          {invitation?.agencyName}
          {invitation?.agencyCity ? <span className="text-fg-muted"> · {invitation.agencyCity}</span> : null}
        </DatoDelEnlace>
        <DatoDelEnlace rotulo="Rol asignado">{rol}</DatoDelEnlace>
        {invitation?.invitedEmail ? (
          <DatoDelEnlace rotulo="Invitación para">{invitation.invitedEmail}</DatoDelEnlace>
        ) : null}
        {invitation?.expiresAt ? (
          <DatoDelEnlace rotulo="Válida hasta">{formatExpiry(invitation.expiresAt)}</DatoDelEnlace>
        ) : null}
      </dl>

      {/* Error message */}
      {actionError && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3">
          <p className="text-sm text-danger">{actionError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {user ? (
          // Logged in with full profile: accept / decline
          <>
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={accepting || declining}
              isLoading={accepting}
            >
              {accepting ? 'Aceptando…' : 'Aceptar invitación'}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-danger hover:text-danger"
              onClick={handleDecline}
              disabled={accepting || declining}
              isLoading={declining}
            >
              {declining ? 'Rechazando…' : 'Rechazar invitación'}
            </Button>
          </>
        ) : needsOnboarding ? (
          // Supabase session exists but no backend profile yet → complete registration
          <>
            <Button asChild className="w-full">
              <Link href={registerUrl}>Completar registro para unirme</Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full text-danger hover:text-danger"
              onClick={handleDecline}
              disabled={declining}
              isLoading={declining}
            >
              {declining ? 'Rechazando…' : 'Rechazar invitación'}
            </Button>
          </>
        ) : invitation?.cuentaSinEstrenar ? (
          // La cuenta existe pero nunca entró: primero su contraseña (Portofino 21-10).
          enlaceEnviado ? (
            <div
              role="status"
              data-testid="enlace-para-crear-contrasena"
              className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-body-sm text-fg"
            >
              <p className="font-medium">Revisa tu correo</p>
              <p className="mt-1 text-fg-muted">
                Te mandamos a {invitation?.invitedEmail} un enlace para crear tu contraseña. Ábrelo en este
                mismo navegador; después vuelves aquí a aceptar la invitación.
              </p>
            </div>
          ) : (
            <>
              <Button
                className="w-full"
                onClick={() => void pedirEnlaceParaCrearContrasena()}
                disabled={pidiendoEnlace}
                isLoading={pidiendoEnlace}
                data-testid="crear-mi-contrasena"
              >
                {pidiendoEnlace ? 'Enviando el enlace…' : 'Crear mi contraseña'}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={loginUrl}>Ya tengo contraseña: iniciar sesión</Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full text-danger hover:text-danger"
                onClick={handleDecline}
                disabled={declining}
                isLoading={declining}
              >
                {declining ? 'Rechazando…' : 'Rechazar invitación'}
              </Button>
            </>
          )
        ) : (
          // Not logged in: login / register / decline
          <>
            <Button asChild className="w-full">
              <Link href={loginUrl}>Iniciar sesión para aceptar</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={registerUrl}>Crear una cuenta nueva</Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full text-danger hover:text-danger"
              onClick={handleDecline}
              disabled={declining}
              isLoading={declining}
            >
              {declining ? 'Rechazando…' : 'Rechazar invitación'}
            </Button>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-caption text-fg-subtle">
        ¿Necesitas ayuda?{' '}
        <Link href="/ayuda" className="underline hover:text-fg-muted">
          Visita el centro de ayuda
        </Link>
      </p>
    </MarcoDelEnlace>
  );
}
