'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Buildings, User, CheckCircle, WarningCircle, SpinnerGap, Envelope, Key, ArrowRight, Phone } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/lib/auth/use-auth';
import { getSupabase } from '@/lib/supabase/client';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { apiClient } from '@/lib/api/client';
import type { InvitationInfo } from '@/lib/types/inmobiliaria';

const PENDING_INVITATION_KEY = 'pending-invitation-token';
const PENDING_NAME_KEY = 'pending-invitation-name';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENT: 'Agente',
  AGENTE: 'Agente',
  CONTADOR: 'Contador',
  VIEWER: 'Observador',
};

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone?: string;
}

function RegistroContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('invitationToken') ?? '';
  const codeFromUrl = searchParams.get('code') ?? '';

  // token starts as null (unresolved), gets resolved from URL or localStorage on mount
  const [token, setToken] = useState<string | null>(null);

  const { signUpWithEmail, signInWithEmail, signOut, user, isAuthenticated, needsOnboarding, isLoading } = useAuth();
  const codeExchangedRef = useRef(false);

  // Persist/recover invitation token
  useEffect(() => {
    if (tokenFromUrl) {
      localStorage.setItem(PENDING_INVITATION_KEY, tokenFromUrl);
      setToken(tokenFromUrl);
    } else {
      const stored = localStorage.getItem(PENDING_INVITATION_KEY) ?? '';
      setToken(stored);
    }
  }, [tokenFromUrl]);

  // When Supabase redirects back with ?code=, exchange it client-side for a session.
  // IMPORTANT: wait for isLoading=false (INITIAL_SESSION done) and sign out any existing
  // session first. If another user (e.g. admin) is logged in the same browser, their
  // session refresh competes for the same Supabase Web Lock → AbortError.
  // The ref prevents double-execution: after signOut, isAuthenticated changes and would
  // otherwise re-trigger this effect.
  useEffect(() => {
    if (!codeFromUrl || isLoading || codeExchangedRef.current) return;
    const supabase = getSupabase();
    if (!supabase) return;

    codeExchangedRef.current = true;

    const doExchange = async () => {
      if (isAuthenticated) {
        await signOut();
      }
      await supabase.auth.exchangeCodeForSession(codeFromUrl);
    };

    doExchange().catch(() => { codeExchangedRef.current = false; });
  }, [codeFromUrl, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  // True while silently auto-completing onboarding after email confirmation click
  const [autoCompleting, setAutoCompleting] = useState(false);

  const authForm = useForm<RegisterFormData>();
  const profileForm = useForm<ProfileFormData>();

  // Fetch invitation details once token is resolved from URL or localStorage
  useEffect(() => {
    if (token === null) return; // still resolving
    if (!token) {
      setInvitationError('Token de invitación inválido o faltante.');
      setLoadingInvitation(false);
      return;
    }
    agencyApi.getInvitation(token)
      .then((data) => {
        setInvitation(data);
        if (data.invitedEmail || data.email) {
          authForm.setValue('email', data.invitedEmail ?? data.email ?? '');
        }
      })
      .catch(() => setInvitationError('La invitación no existe o ya expiró.'))
      .finally(() => setLoadingInvitation(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-accept / auto-complete ─────────────────────────────────────────
  // Fires whenever the user is authenticated and has an invitation token loaded.
  // Covers two cases:
  //   A) codeFromUrl present  → user just confirmed email, may exist as TENANT via trigger
  //   B) no codeFromUrl       → user was already logged in, just needs to accept
  // In both cases we ensure role = AGENT via onboarding before accepting.
  useEffect(() => {
    if (!isAuthenticated || !token || !invitation) return;
    // needsOnboarding: true  → user has no DB record (no trigger)
    // needsOnboarding: false + user exists → Supabase trigger created them as TENANT
    // Both paths need onboarding with AGENT role before accepting.
    if (!needsOnboarding && !user) return; // still loading

    setAutoCompleting(true);

    const savedRaw = localStorage.getItem(PENDING_NAME_KEY);
    const saved = savedRaw ? JSON.parse(savedRaw) as { firstName: string; lastName: string } : null;

    const doComplete = async () => {
      // Only update role if not already AGENT/INMOBILIARIA
      if (user?.role !== 'agency') {
        await apiClient.post('/users/me/onboarding', {
          firstName: saved?.firstName || user?.firstName || '',
          lastName: saved?.lastName || user?.lastName || '',
          userType: 'AGENT',
        });
      }
      await agencyApi.acceptInvitation(token);
      localStorage.removeItem(PENDING_INVITATION_KEY);
      localStorage.removeItem(PENDING_NAME_KEY);
      window.location.replace('/panel/inmobiliaria');
    };

    doComplete().catch(() => {
      setAutoCompleting(false);
      setFormError('No se pudo completar el registro. Intentá de nuevo.');
    });
  }, [isAuthenticated, needsOnboarding, user, token, invitation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Register new account ─────────────────────────────────────────────────
  const handleRegister = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      // Save name so we can auto-complete onboarding after email confirmation
      localStorage.setItem(PENDING_NAME_KEY, JSON.stringify({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      }));
      // Redirect back to this same page so the ?code= exchange happens client-side
      // and the invitationToken stays in the URL for the auto-accept effect.
      const redirectTo = window.location.href;
      const result = await signUpWithEmail(data.email, data.password, redirectTo);
      if (result?.requiresConfirmation) {
        setConfirmed(true);
        return;
      }
      await signInWithEmail(data.email, data.password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setFormError('Este email ya tiene una cuenta. Usá "Ya tengo cuenta" para ingresar.');
      } else {
        setFormError('Error al crear la cuenta. Intentá de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  // ─── Complete profile (agent invited, Supabase session exists but no backend profile) ──
  const handleCompleteProfile = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post('/users/me/onboarding', {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || undefined,
        userType: 'AGENT',
      });
      await agencyApi.acceptInvitation(token ?? '');
      localStorage.removeItem(PENDING_INVITATION_KEY);
      localStorage.removeItem(PENDING_NAME_KEY);
      // Hard navigation so ProtectedRoute reads the updated role from backend fresh
      window.location.replace('/panel/inmobiliaria');
    } catch {
      setFormError('No se pudo completar el registro. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Auto-completing after email confirmation ────────────────────────────
  if (autoCompleting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4 text-center">
          <SpinnerGap className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Configurando tu cuenta…</p>
        </div>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (token === null || loadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <SpinnerGap className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Invalid token ────────────────────────────────────────────────────────
  if (invitationError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="max-w-sm w-full bg-white dark:bg-card rounded-2xl border border-border p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <WarningCircle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Invitación inválida</h1>
          <p className="text-sm text-muted-foreground">{invitationError}</p>
        </div>
      </div>
    );
  }

  const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">

        {/* Invitation card */}
        <div className="bg-white dark:bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <Buildings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Invitación de</p>
              <p className="text-[17px] font-semibold text-foreground">{invitation.agencyName ?? 'una inmobiliaria'}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-foreground">
                Fuiste invitado como <span className="font-semibold">{ROLE_LABELS[invitation.role] ?? invitation.role}</span>
              </p>
              {invitation.invitedBy && (
                <p className="text-xs text-muted-foreground">por {invitation.invitedBy}</p>
              )}
            </div>
            {!isExpired && <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />}
          </div>

          {isExpired && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2">
              <WarningCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">Esta invitación expiró. Pedile al administrador que la reenvíe.</p>
            </div>
          )}
        </div>

        {!isExpired && (
          <div className="bg-white dark:bg-card rounded-2xl border border-border p-6">

            {/* ── Step: Complete profile (Supabase session exists, no backend profile) ── */}
            {needsOnboarding ? (
              <>
                <div className="mb-6">
                  <h2 className="text-[16px] font-semibold text-foreground">Completá tu perfil</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Tu cuenta fue creada. Solo necesitamos tus datos para unirte a <strong>{invitation.agencyName}</strong>.
                  </p>
                </div>

                <form onSubmit={profileForm.handleSubmit(handleCompleteProfile)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-foreground mb-1.5">Nombre</label>
                      <input
                        {...profileForm.register('firstName', { required: 'Requerido' })}
                        placeholder="Tu nombre"
                        className="w-full h-11 px-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                      {profileForm.formState.errors.firstName && (
                        <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-foreground mb-1.5">Apellido</label>
                      <input
                        {...profileForm.register('lastName', { required: 'Requerido' })}
                        placeholder="Tu apellido"
                        className="w-full h-11 px-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                      {profileForm.formState.errors.lastName && (
                        <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">
                      Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        {...profileForm.register('phone')}
                        placeholder="3001234567"
                        type="tel"
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                      <WarningCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-[13px] text-destructive">{formError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-[14px] font-semibold disabled:opacity-60 transition-opacity"
                  >
                    {isSubmitting ? (
                      <SpinnerGap className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Unirme a {invitation.agencyName}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* ── Step: Auth (register) ── */
              <>
                {confirmed ? (
                  /* Email confirmation pending — user just needs to click the link */
                  <div className="py-4 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                      <Envelope className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-foreground">Revisá tu email</p>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        Te enviamos un link de confirmación. Hacé clic en él y te vamos a redirigir automáticamente al panel.
                      </p>
                    </div>
                    <p className="text-[12px] text-muted-foreground">Podés cerrar esta pestaña.</p>
                  </div>
                ) : (
                  <form onSubmit={authForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="mb-5">
                      <h2 className="text-[16px] font-semibold text-foreground">Crear cuenta</h2>
                      <p className="text-[13px] text-muted-foreground mt-1">Completá tus datos para unirte a <strong>{invitation?.agencyName}</strong>.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-medium text-foreground mb-1.5">Nombre</label>
                        <input
                          {...authForm.register('firstName', { required: 'Requerido' })}
                          placeholder="Tu nombre"
                          className="w-full h-11 px-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        />
                        {authForm.formState.errors.firstName && (
                          <p className="text-xs text-destructive mt-1">{authForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-foreground mb-1.5">Apellido</label>
                        <input
                          {...authForm.register('lastName', { required: 'Requerido' })}
                          placeholder="Tu apellido"
                          className="w-full h-11 px-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        />
                        {authForm.formState.errors.lastName && (
                          <p className="text-xs text-destructive mt-1">{authForm.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-foreground mb-1.5">Email</label>
                      <div className="relative">
                        <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          {...authForm.register('email', { required: 'Requerido', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' } })}
                          type="email"
                          placeholder="tu@email.com"
                          className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        />
                      </div>
                      {authForm.formState.errors.email && (
                        <p className="text-xs text-destructive mt-1">{authForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-foreground mb-1.5">Contraseña</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          {...authForm.register('password', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        />
                      </div>
                      {authForm.formState.errors.password && (
                        <p className="text-xs text-destructive mt-1">{authForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    {formError && (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                        <WarningCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-[13px] text-destructive">{formError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-[14px] font-semibold disabled:opacity-60 transition-opacity"
                    >
                      {isSubmitting ? (
                        <SpinnerGap className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Crear cuenta y unirme
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <SpinnerGap className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <RegistroContent />
    </Suspense>
  );
}
