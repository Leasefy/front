'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AuthInput } from './AuthInput';
import { Eyebrow } from '@/components/brand';
import { useAuth } from '@/lib/auth/use-auth';
import { AUTH_BOOTSTRAP_ERROR_KEY } from '@/lib/auth/auth-context';
import { getRoleHomeRoute } from '@/lib/auth/role-routes';
import { useEnabledProfiles } from '@/lib/hooks/use-enabled-profiles';
import { cn, sanitizeReturnUrl } from '@/lib/utils';
import {
  Key,
  Briefcase,
  SpinnerGap,
  ArrowLeft,
  CheckCircle,
  Check,
  MagnifyingGlass,
} from '@phosphor-icons/react';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-sent';
type RegisterStep = 'role' | 'credentials' | 'confirm-email';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ForgotPasswordFormData {
  email: string;
}

interface AuthFormProps {
  className?: string;
  onSuccess?: () => void;
  defaultMode?: AuthMode;
  defaultRole?: 'tenant' | 'landlord' | 'agency';
  returnUrl?: string;
}

const roleCards = [
  {
    id: 'tenant' as const,
    title: 'Inquilino',
    description: 'Busca propiedades, aplica y gestiona tu arriendo en un solo lugar.',
    icon: MagnifyingGlass,
    href: '/onboarding/inquilino',
  },
  {
    id: 'landlord' as const,
    title: 'Propietario',
    description: 'Publica tu propiedad, evalúa candidatos con IA y automatiza cobros.',
    icon: Key,
    href: '/onboarding/propietario',
  },
  {
    id: 'agency' as const,
    title: 'Inmobiliaria',
    description: 'Gestiona múltiples propiedades con herramientas profesionales.',
    icon: Briefcase,
    href: '/onboarding/inmobiliaria',
  },
];

const roleLabels: Record<string, string> = {
  tenant: 'Inquilino',
  landlord: 'Propietario',
  agency: 'Inmobiliaria',
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/** Hairline divider with a mono technical label — DS signature. */
function MonoDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-border" />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        {children}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Quiet Google auth button — hairline, 8px radius. */
function GoogleButton({ onClick, disabled, isLoading, children }: { onClick: () => void; disabled: boolean; isLoading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-11 flex items-center justify-center gap-2.5 rounded-full border border-border bg-surface hover:border-border-strong hover:bg-surface-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <SpinnerGap className="w-4 h-4 animate-spin text-fg-subtle" />
      ) : (
        <GoogleIcon className="w-4 h-4" />
      )}
      <span className="text-[13.5px] font-medium text-fg">{children}</span>
    </button>
  );
}

/** Brand-critical error banner. */
function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3.5 py-2.5 rounded-xl bg-danger-soft border border-danger/30"
    >
      <p className="text-[12.5px] text-danger">{children}</p>
    </motion.div>
  );
}

export function AuthForm({ className, onSuccess, defaultMode, defaultRole, returnUrl: returnUrlProp }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, user, isAuthenticated, isLoading: authLoading, needsOnboarding, mfaRequired, agencyRole, agencyMembershipChecked, hasActiveAgencyMembership } = useAuth();
  // Admin can switch signup profiles off (see /admin/registration-profiles).
  // Fails open: while loading or if the config backend is down, all are shown.
  const { isEnabled: isProfileEnabled } = useEnabledProfiles();
  const visibleRoleCards = roleCards.filter((card) => isProfileEnabled(card.id));

  const [mode, setMode] = React.useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = React.useState<RegisterStep>('role');
  const [selectedRole, setSelectedRole] = React.useState<'tenant' | 'landlord' | 'agency' | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetEmail, setResetEmail] = React.useState<string>('');
  // Only redirect when the user explicitly authenticated via THIS form in this session.
  // Without this guard, a pre-existing session would auto-redirect away from /auth,
  // preventing users from logging in as a different account.
  const didAuthenticateInForm = React.useRef(false);

  // Bounded fallback for the agency-membership-probe wait in the auto-redirect
  // effect below. An agency user's `agencyRole` is populated ASYNC by the probe,
  // so we hold the per-sub-role redirect until `agencyMembershipChecked` is true.
  // If the probe never settles, stop waiting after a few seconds and proceed
  // with whatever `agencyRole` is (defaulting to '/panel/inmobiliaria'). Mirrors
  // the pattern in src/app/onboarding/seleccionar-rol/page.tsx.
  const [probeWaitElapsed, setProbeWaitElapsed] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setProbeWaitElapsed(true), 4000);
    return () => clearTimeout(id);
  }, []);

  const returnUrl = sanitizeReturnUrl(returnUrlProp || searchParams.get('returnUrl'), '/');

  // A fatal auth-bootstrap error (e.g. 409: this email already belongs to
  // another account) is handed over by auth-context via sessionStorage across
  // the forced sign-out redirect — surface it in the existing error banner.
  React.useEffect(() => {
    try {
      const message = sessionStorage.getItem(AUTH_BOOTSTRAP_ERROR_KEY);
      if (message) {
        sessionStorage.removeItem(AUTH_BOOTSTRAP_ERROR_KEY);
        setError(message);
      }
    } catch {
      // sessionStorage unavailable — nothing to surface
    }
  }, []);

  // Redirigir automáticamente SOLO cuando el usuario inició sesión en este formulario
  React.useEffect(() => {
    if (!didAuthenticateInForm.current) return;
    if (authLoading) return;
    // MFA gate first (security): never bypass a pending second factor, regardless
    // of onboarding/returnUrl state (mirrors ProtectedRoute.tsx:127-130).
    if (mfaRequired) {
      window.location.href = '/auth/mfa-verify';
      return;
    }
    // Invitation flow: the /invitacion/[token] page handles needsOnboarding on its
    // own (it offers "complete registration" → /registro?invitationToken). Honor a
    // returnUrl pointing there BEFORE the generic onboarding redirect — otherwise an
    // invited user is sent to the "create agency" onboarding and the token is lost.
    if (returnUrl.startsWith('/invitacion/')) {
      window.location.href = returnUrl;
      return;
    }
    // JWT valid but backend has no user record yet → onboarding
    if (needsOnboarding) {
      window.location.href = '/onboarding/seleccionar-rol';
      return;
    }
    if (!isAuthenticated || !user) return;
    // Si el onboarding no está completo, siempre ir a seleccionar rol
    if (!user.onboardingCompleted) {
      window.location.href = '/onboarding/seleccionar-rol';
      return;
    }
    if (returnUrl && returnUrl !== '/') {
      window.location.href = returnUrl;
      return;
    }
    // No returnUrl — redirect to the correct panel based on role. For an agency
    // user, hold until the membership probe settles so `agencyRole` is resolved
    // and the per-sub-role landing route is used (otherwise it'd fall to the
    // default). The bounded `probeWaitElapsed` guarantees we never hang.
    // Non-agency users (tenant/landlord) redirect immediately as before.
    const isAgencyUser = user.role === 'agency' || hasActiveAgencyMembership;
    if (isAgencyUser && !agencyMembershipChecked && !probeWaitElapsed) return;
    window.location.href = getRoleHomeRoute(user.role, agencyRole);
  }, [isAuthenticated, user, authLoading, returnUrl, needsOnboarding, mfaRequired, agencyRole, agencyMembershipChecked, hasActiveAgencyMembership, probeWaitElapsed]);
  const preselectedRole = defaultRole || searchParams.get('role') as 'tenant' | 'landlord' | 'agency' | null;
  const initialMode = defaultMode || searchParams.get('mode') as AuthMode | null;

  const loginForm = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    defaultValues: { email: '' },
  });

  React.useEffect(() => {
    if (initialMode === 'register' || preselectedRole) {
      setMode('register');
      if (preselectedRole) {
        setSelectedRole(preselectedRole);
      }
    }
  }, [initialMode, preselectedRole]);

  // Auto-redirect when defaultRole is provided and mode is register (from publish wizard)
  React.useEffect(() => {
    if (defaultRole && selectedRole && mode === 'register' && registerStep === 'role') {
      setRegisterStep('credentials');
    }
  }, [defaultRole, selectedRole, mode, registerStep]);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setRegisterStep('role');
    setSelectedRole(null);
    setError(null);
    loginForm.reset();
    registerForm.reset();
    forgotPasswordForm.reset();
  };

  const handleRoleSelect = (role: 'tenant' | 'landlord' | 'agency') => {
    setSelectedRole(role);
  };

  const handleRoleContinue = () => {
    if (selectedRole) {
      setRegisterStep('credentials');
      setError(null);
    }
  };

  const getOnboardingHref = (role: 'tenant' | 'landlord' | 'agency') => {
    const card = roleCards.find(r => r.id === role);
    if (!card) return '/';
    return returnUrl && returnUrl !== '/'
      ? `${card.href}?returnUrl=${encodeURIComponent(returnUrl)}`
      : card.href;
  };

  // Redirect to the correct dashboard based on user role
  const redirectAfterLogin = React.useCallback((role: string | undefined) => {
    if (returnUrl && returnUrl !== '/') {
      router.push(returnUrl);
      return;
    }
    router.push(getRoleHomeRoute(role, agencyRole));
  }, [returnUrl, router, agencyRole]);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      didAuthenticateInForm.current = true;
      await signInWithGoogle();
      onSuccess?.();
    } catch {
      didAuthenticateInForm.current = false;
      setError('Error con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      didAuthenticateInForm.current = true;
      const userData = await signInWithEmail(data.email, data.password);
      if (!userData) {
        // Supabase accepted the credentials but the profile bootstrap failed
        // WITHOUT throwing (e.g. 409 duplicate identity: fetchUser stored the
        // backend message in sessionStorage and signed the session out).
        // Surface it inline here — the mount-only reader above already ran
        // before this attempt, so it cannot cover this path.
        didAuthenticateInForm.current = false;
        let message: string | null = null;
        try {
          message = sessionStorage.getItem(AUTH_BOOTSTRAP_ERROR_KEY);
          if (message) sessionStorage.removeItem(AUTH_BOOTSTRAP_ERROR_KEY);
        } catch {}
        setError(message || 'Error al iniciar sesión. Intenta de nuevo.');
        return;
      }
      onSuccess?.();
      // El useEffect de arriba se encargará de la redirección al detectar el cambio de auth
    } catch (err: unknown) {
      didAuthenticateInForm.current = false;
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Correo o contraseña incorrectos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      didAuthenticateInForm.current = true;
      await signInWithGoogle();
      onSuccess?.();
    } catch {
      didAuthenticateInForm.current = false;
      setError('Error con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!selectedRole) return;

    setIsLoading(true);
    setError(null);
    try {
      // Preserve context on the email-confirmation link so it returns through
      // /auth/callback (which exchanges the code server-side and honors returnUrl)
      // instead of Supabase's default Site URL (the root "/"), which would drop the
      // invitation/onboarding context and land the user as a bare TENANT.
      const dest = returnUrl && returnUrl !== '/' ? returnUrl : getOnboardingHref(selectedRole);
      const emailRedirectTo = `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(dest)}`;
      const { requiresConfirmation } = await signUpWithEmail(data.email, data.password, emailRedirectTo, selectedRole);
      if (requiresConfirmation) {
        setResetEmail(data.email);
        setRegisterStep('confirm-email');
      } else {
        // Auto-confirmed — go straight to onboarding
        router.push(getOnboardingHref(selectedRole));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('Este correo ya está registrado. Inicia sesión en su lugar.');
      } else if (msg.includes('Password should be')) {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Error al crear la cuenta. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordReset(data.email);
      setResetEmail(data.email);
      setMode('reset-sent');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('over_email')) {
        setError('Límite de envíos alcanzado. Espera unos minutos e intenta de nuevo.');
      } else {
        setError('Ocurrió un error. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Header copy per mode — eyebrow (mono) + Satoshi heading, left-aligned ──
  const eyebrow =
    mode === 'login' ? 'Acceso'
    : mode === 'forgot-password' ? 'Recuperación'
    : mode === 'reset-sent' ? 'Correo enviado'
    : registerStep === 'confirm-email' ? 'Correo enviado'
    : 'Crear cuenta';

  return (
    <div className={cn('w-full', className)}>
      {/* Header — left-aligned, quiet hierarchy */}
      <div className="mb-8">
        {(mode === 'forgot-password' || mode === 'reset-sent') && (
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className="inline-flex items-center gap-2 text-[13px] text-fg-subtle hover:text-fg transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </button>
        )}

        {(mode === 'reset-sent' || (mode === 'register' && registerStep === 'confirm-email')) && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-10 h-10 mb-5 rounded-xl bg-success-soft flex items-center justify-center"
          >
            <CheckCircle className="w-5 h-5 text-success" weight="fill" />
          </motion.div>
        )}

        <Eyebrow>{eyebrow}</Eyebrow>

        <h1 className="mt-3 font-heading text-[24px] font-medium text-fg tracking-[-0.01em] leading-tight">
          {mode === 'login' && 'Bienvenido de vuelta'}
          {mode === 'register' && registerStep === 'role' && '¿Cómo usarás Leasefy?'}
          {mode === 'register' && registerStep === 'credentials' && 'Crea tu cuenta'}
          {mode === 'register' && registerStep === 'confirm-email' && 'Revisa tu correo'}
          {mode === 'forgot-password' && 'Recupera tu contraseña'}
          {mode === 'reset-sent' && 'Revisa tu correo'}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-fg-subtle leading-relaxed">
          {mode === 'login' && 'Ingresa a tu cuenta para continuar.'}
          {mode === 'register' && registerStep === 'role' && 'Selecciona tu perfil para personalizar tu experiencia.'}
          {mode === 'register' && registerStep === 'credentials' && (
            <>Como <span className="font-medium text-fg-muted">{selectedRole ? roleLabels[selectedRole] : ''}</span>. Ingresa tus datos para continuar.</>
          )}
          {mode === 'register' && registerStep === 'confirm-email' && (
            <>Enviamos un enlace de confirmación a <span className="font-medium text-fg-muted">{resetEmail}</span>.</>
          )}
          {mode === 'forgot-password' && 'Te enviaremos un enlace para restablecer tu contraseña.'}
          {mode === 'reset-sent' && (
            <>Enviamos un enlace de recuperación a <span className="font-medium text-fg-muted">{resetEmail}</span>.</>
          )}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Login ─────────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <GoogleButton onClick={handleGoogleLogin} disabled={isLoading} isLoading={isLoading}>
              {isLoading ? 'Conectando...' : 'Continuar con Google'}
            </GoogleButton>

            <MonoDivider>o con email</MonoDivider>

            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <AuthInput
                label="Email"
                type="email"
                placeholder="tu@email.com"
                {...loginForm.register('email', {
                  required: 'El email es requerido',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ingresa un email válido' },
                })}
                error={loginForm.formState.errors.email?.message}
              />
              <div className="space-y-1.5">
                <AuthInput
                  label="Contraseña"
                  type="password"
                  placeholder="Tu contraseña"
                  {...loginForm.register('password', {
                    required: 'La contraseña es requerida',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                  error={loginForm.formState.errors.password?.message}
                />
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('forgot-password')}
                    className="text-[12.5px] text-fg-subtle hover:text-fg transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-full text-[14px]">
                {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Ingresando...</>) : 'Iniciar sesión'}
              </Button>
            </form>

            <p className="mt-7 text-[13px] text-fg-subtle">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                className="font-medium text-[#1A40FF] hover:underline underline-offset-2"
              >
                Crear cuenta
              </button>
            </p>
          </motion.div>
        )}

        {/* ── Register: Role selection ───────────────────────────────────── */}
        {mode === 'register' && registerStep === 'role' && (
          <motion.div
            key="register-role"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-2.5"
          >
            {defaultRole ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <SpinnerGap className="w-6 h-6 animate-spin text-fg-subtle" />
                <p className="text-sm text-fg-subtle">Configurando tu cuenta...</p>
              </div>
            ) : (
              <>
                {visibleRoleCards.map((card, index) => {
                  const Icon = card.icon;
                  const isSelected = selectedRole === card.id;

                  return (
                    <motion.button
                      key={card.id}
                      type="button"
                      onClick={() => handleRoleSelect(card.id)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'relative w-full text-left transition-colors duration-150 rounded-xl p-4 group border',
                        isSelected
                          ? 'border-ink bg-ink'
                          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-hover'
                      )}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150',
                          isSelected ? 'bg-white/10' : 'bg-surface-muted'
                        )}>
                          <Icon className={cn('w-5 h-5 transition-colors duration-150', isSelected ? 'text-ink-fg' : 'text-fg-muted')} weight={isSelected ? 'fill' : 'regular'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={cn('text-[14px] font-medium transition-colors duration-150', isSelected ? 'text-ink-fg' : 'text-fg')}>{card.title}</h3>
                          <p className={cn('text-[12.5px] mt-0.5 transition-colors duration-150 leading-snug', isSelected ? 'text-ink-fg-muted' : 'text-fg-subtle')}>{card.description}</p>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150',
                          isSelected ? 'bg-ink-fg' : 'border border-border-strong group-hover:border-fg-subtle'
                        )}>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                              <Check className="w-3 h-3 text-ink" weight="bold" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="pt-3">
                  <Button
                    type="button"
                    disabled={!selectedRole}
                    onClick={handleRoleContinue}
                    className="w-full h-11 rounded-full text-[14px]"
                  >
                    {selectedRole ? 'Continuar' : 'Selecciona una opción'}
                  </Button>
                </motion.div>

                <p className="pt-4 text-[13px] text-fg-subtle">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="font-medium text-[#1A40FF] hover:underline underline-offset-2"
                  >
                    Inicia sesión
                  </button>
                </p>
              </>
            )}
          </motion.div>
        )}

        {/* ── Register: Credentials ──────────────────────────────────────── */}
        {mode === 'register' && registerStep === 'credentials' && (
          <motion.div
            key="register-credentials"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {/* Back button */}
            {!defaultRole && (
              <button
                type="button"
                onClick={() => { setRegisterStep('role'); setError(null); registerForm.reset(); }}
                className="inline-flex items-center gap-2 text-[13px] text-fg-subtle hover:text-fg transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Cambiar perfil
              </button>
            )}

            <GoogleButton onClick={handleGoogleRegister} disabled={isLoading} isLoading={isLoading}>
              Registrarse con Google
            </GoogleButton>

            <MonoDivider>o con tu email</MonoDivider>

            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
              <AuthInput
                label="Email"
                type="email"
                placeholder="tu@email.com"
                {...registerForm.register('email', {
                  required: 'El email es requerido',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ingresa un email válido' },
                })}
                error={registerForm.formState.errors.email?.message}
              />
              <AuthInput
                label="Contraseña"
                type="password"
                isNewPassword
                placeholder="Mínimo 6 caracteres"
                {...registerForm.register('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
                error={registerForm.formState.errors.password?.message}
              />
              <AuthInput
                label="Confirmar contraseña"
                type="password"
                isNewPassword
                placeholder="Repite tu contraseña"
                {...registerForm.register('confirmPassword', {
                  required: 'Confirma tu contraseña',
                  validate: (val) => val === registerForm.watch('password') || 'Las contraseñas no coinciden',
                })}
                error={registerForm.formState.errors.confirmPassword?.message}
              />
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-full text-[14px]">
                {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Creando cuenta...</>) : 'Crear cuenta'}
              </Button>
            </form>
          </motion.div>
        )}

        {/* ── Register: Confirm email ────────────────────────────────────── */}
        {mode === 'register' && registerStep === 'confirm-email' && (
          <motion.div
            key="confirm-email"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-5"
          >
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2.5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
                Próximos pasos
              </span>
              <ol className="text-[12.5px] text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>Revisa tu bandeja de entrada (y spam)</li>
                <li>Haz clic en el enlace de confirmación</li>
                <li>Vuelve aquí e inicia sesión</li>
              </ol>
            </div>
            <Button type="button" onClick={() => handleModeSwitch('login')} className="w-full h-11 rounded-full text-[14px]">
              Ir a iniciar sesión
            </Button>
          </motion.div>
        )}

        {/* ── Forgot Password ────────────────────────────────────────────── */}
        {mode === 'forgot-password' && (
          <motion.form
            key="forgot-password"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)}
            className="space-y-4"
          >
            <AuthInput
              label="Email"
              type="email"
              placeholder="tu@email.com"
              {...forgotPasswordForm.register('email', {
                required: 'El email es requerido',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ingresa un email válido' },
              })}
              error={forgotPasswordForm.formState.errors.email?.message}
            />
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-full text-[14px]">
              {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : 'Enviar enlace de recuperación'}
            </Button>
            <p className="text-[12px] text-fg-subtle leading-relaxed">
              Ingresa el email asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </motion.form>
        )}

        {/* ── Reset Email Sent ───────────────────────────────────────────── */}
        {mode === 'reset-sent' && (
          <motion.div
            key="reset-sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-5"
          >
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2.5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
                Próximos pasos
              </span>
              <ol className="text-[12.5px] text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>Revisa tu bandeja de entrada (y spam)</li>
                <li>Haz clic en el enlace del correo</li>
                <li>Crea tu nueva contraseña</li>
              </ol>
            </div>
            <Button type="button" onClick={() => handleModeSwitch('login')} className="w-full h-11 rounded-full text-[14px]">
              Volver al inicio de sesión
            </Button>
            <p className="text-[13px] text-fg-subtle">
              ¿No recibiste el correo?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('forgot-password')}
                className="font-medium text-[#1A40FF] hover:underline underline-offset-2"
              >
                Reenviar enlace
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
