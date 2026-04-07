'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AuthInput } from './AuthInput';
import { useAuth } from '@/lib/auth/use-auth';
import { cn } from '@/lib/utils';
import {
  Key,
  Briefcase,
  SpinnerGap,
  ArrowLeft,
  Envelope,
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

export function AuthForm({ className, onSuccess, defaultMode, defaultRole, returnUrl: returnUrlProp }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, user, isAuthenticated, isLoading: authLoading, needsOnboarding } = useAuth();

  const [mode, setMode] = React.useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = React.useState<RegisterStep>('role');
  const [selectedRole, setSelectedRole] = React.useState<'tenant' | 'landlord' | 'agency' | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetEmail, setResetEmail] = React.useState<string>('');

  const returnUrl = returnUrlProp || searchParams.get('returnUrl') || '/';

  // Redirigir automáticamente cuando el usuario se autentica
  React.useEffect(() => {
    if (authLoading) return;
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
    // No returnUrl — redirect to the correct panel based on role
    if (user.role === 'agency') window.location.href = '/panel/inmobiliaria';
    else if (user.role === 'landlord') window.location.href = '/panel';
    else window.location.href = '/inquilino';
  }, [isAuthenticated, user, authLoading, returnUrl, needsOnboarding]);
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
    if (role === 'landlord') router.push('/panel');
    else if (role === 'agency') router.push('/panel/inmobiliaria');
    else router.push('/inquilino'); // default: tenant
  }, [returnUrl, router]);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch {
      setError('Error con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await signInWithEmail(data.email, data.password);
      onSuccess?.();
      // El useEffect de arriba se encargará de la redirección al detectar el cambio de auth
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Correo o contraseña incorrectos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
      setIsLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch {
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
      const { requiresConfirmation } = await signUpWithEmail(data.email, data.password);
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

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        {(mode === 'forgot-password' || mode === 'reset-sent') && (
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </button>
        )}

        {mode === 'reset-sent' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center"
          >
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </motion.div>
        )}

        {mode === 'forgot-password' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-indigo-50 flex items-center justify-center"
          >
            <Envelope className="w-8 h-8 text-indigo-600" />
          </motion.div>
        )}

        <h1 className="text-2xl font-heading font-semibold text-foreground tracking-tight">
          {mode === 'login' && 'Bienvenido de vuelta'}
          {mode === 'register' && registerStep === 'role' && '¿Cómo usarás Leasefy?'}
          {mode === 'register' && registerStep === 'credentials' && `Crear cuenta como ${selectedRole ? roleLabels[selectedRole] : ''}`}
          {mode === 'register' && registerStep === 'confirm-email' && '¡Revisa tu correo!'}
          {mode === 'forgot-password' && 'Recupera tu contraseña'}
          {mode === 'reset-sent' && '¡Revisa tu correo!'}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          {mode === 'login' && 'Ingresa a tu cuenta para continuar'}
          {mode === 'register' && registerStep === 'role' && 'Selecciona tu perfil para personalizar tu experiencia'}
          {mode === 'register' && registerStep === 'credentials' && 'Ingresa tus datos para crear tu cuenta'}
          {mode === 'register' && registerStep === 'confirm-email' && (
            <>
              Enviamos un enlace de confirmación a<br />
              <span className="font-medium text-foreground">{resetEmail}</span>
            </>
          )}
          {mode === 'forgot-password' && 'Te enviaremos un enlace para restablecer tu contraseña'}
          {mode === 'reset-sent' && (
            <>
              Enviamos un enlace de recuperación a<br />
              <span className="font-medium text-foreground">{resetEmail}</span>
            </>
          )}
        </p>
      </div>

      {/* Tab switcher — only show on main login/register screens */}
      {(mode === 'login' || (mode === 'register' && registerStep === 'role')) && (
        <div className="relative p-1 bg-muted rounded-xl mb-8">
          <div className="relative flex">
            <motion.div
              className="absolute inset-y-1 rounded-lg bg-background shadow-sm"
              initial={false}
              animate={{
                x: mode === 'login' ? 4 : 'calc(100% + 4px)',
                width: 'calc(50% - 8px)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={cn(
                'relative z-10 flex-1 py-2.5 text-[13px] font-medium transition-colors rounded-lg',
                mode === 'login' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('register')}
              className={cn(
                'relative z-10 flex-1 py-2.5 text-[13px] font-medium transition-colors rounded-lg',
                mode === 'register' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Crear cuenta
            </button>
          </div>
        </div>
      )}

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
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {isLoading ? (
                <SpinnerGap className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon className="w-5 h-5" />
              )}
              <span className="text-[14px] font-medium text-foreground">
                {isLoading ? 'Conectando...' : 'Continuar con Google'}
              </span>
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-4 text-muted-foreground">o continúa con email</span>
              </div>
            </div>

            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <AuthInput
                label="Email"
                type="email"
                icon="email"
                placeholder="tu@email.com"
                {...loginForm.register('email', {
                  required: 'El email es requerido',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ingresa un email válido' },
                })}
                error={loginForm.formState.errors.email?.message}
              />
              <AuthInput
                label="Contraseña"
                type="password"
                icon="password"
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
                  className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-[13px] text-destructive">{error}</p>
                </motion.div>
              )}
              <Button type="submit" size="lg" disabled={isLoading} className="w-full h-12 text-[14px] rounded-xl">
                {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Ingresando...</>) : 'Iniciar sesión'}
              </Button>
            </form>
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
            className="space-y-3"
          >
            {defaultRole ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <SpinnerGap className="w-6 h-6 animate-spin text-neutral-400" />
                <p className="text-sm text-muted-foreground">Configurando tu cuenta...</p>
              </div>
            ) : (
              <>
                {roleCards.map((card, index) => {
                  const Icon = card.icon;
                  const isSelected = selectedRole === card.id;

                  return (
                    <motion.button
                      key={card.id}
                      type="button"
                      onClick={() => handleRoleSelect(card.id)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'relative w-full text-left transition-all duration-200 rounded-2xl p-4 group',
                        'border-2',
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900'
                          : 'border-border bg-background hover:border-neutral-300 hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
                          isSelected ? 'bg-white/10' : 'bg-muted group-hover:bg-neutral-200'
                        )}>
                          <Icon className={cn('w-6 h-6 transition-colors duration-200', isSelected ? 'text-white' : 'text-neutral-600')} weight={isSelected ? 'fill' : 'regular'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={cn('text-[15px] font-semibold transition-colors duration-200', isSelected ? 'text-white' : 'text-foreground')}>{card.title}</h3>
                          <p className={cn('text-[13px] mt-0.5 transition-colors duration-200 leading-snug', isSelected ? 'text-white/70' : 'text-muted-foreground')}>{card.description}</p>
                        </div>
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200', isSelected ? 'bg-white' : 'border-2 border-neutral-200 group-hover:border-neutral-300')}>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                              <Check className="w-4 h-4 text-neutral-900" weight="bold" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="pt-2">
                  <Button
                    type="button"
                    size="lg"
                    disabled={!selectedRole}
                    onClick={handleRoleContinue}
                    className="w-full h-12 text-[14px] font-semibold rounded-xl"
                  >
                    {selectedRole ? 'Continuar' : 'Selecciona una opción'}
                  </Button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Register: Credentials ──────────────────────────────────────── */}
        {mode === 'register' && registerStep === 'credentials' && (
          <motion.div
            key="register-credentials"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Back button */}
            {!defaultRole && (
              <button
                type="button"
                onClick={() => { setRegisterStep('role'); setError(null); registerForm.reset(); }}
                className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Cambiar perfil
              </button>
            )}

            {/* Google option */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {isLoading ? (
                <SpinnerGap className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon className="w-5 h-5" />
              )}
              <span className="text-[14px] font-medium text-foreground">
                Registrarse con Google
              </span>
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-4 text-muted-foreground">o con tu email</span>
              </div>
            </div>

            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
              <AuthInput
                label="Email"
                type="email"
                icon="email"
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
                icon="password"
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
                icon="password"
                placeholder="Repite tu contraseña"
                {...registerForm.register('confirmPassword', {
                  required: 'Confirma tu contraseña',
                  validate: (val) => val === registerForm.watch('password') || 'Las contraseñas no coinciden',
                })}
                error={registerForm.formState.errors.confirmPassword?.message}
              />
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-[13px] text-destructive">{error}</p>
                </motion.div>
              )}
              <Button type="submit" size="lg" disabled={isLoading} className="w-full h-12 text-[14px] rounded-xl">
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
            className="space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 mx-auto rounded-full bg-indigo-50 flex items-center justify-center"
            >
              <Envelope className="w-8 h-8 text-indigo-600" />
            </motion.div>
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <h3 className="text-[13px] font-medium text-foreground">Próximos pasos:</h3>
              <ol className="text-[12px] text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Revisa tu bandeja de entrada (y spam)</li>
                <li>Haz clic en el enlace de confirmación</li>
                <li>Vuelve aquí e inicia sesión</li>
              </ol>
            </div>
            <Button type="button" size="lg" onClick={() => handleModeSwitch('login')} className="w-full h-12 text-[14px] rounded-xl">
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
              icon="email"
              placeholder="tu@email.com"
              {...forgotPasswordForm.register('email', {
                required: 'El email es requerido',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ingresa un email válido' },
              })}
              error={forgotPasswordForm.formState.errors.email?.message}
            />
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-[13px] text-destructive">{error}</p>
              </motion.div>
            )}
            <Button type="submit" size="lg" disabled={isLoading} className="w-full h-12 text-[14px] rounded-xl">
              {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : 'Enviar enlace de recuperación'}
            </Button>
            <p className="text-[12px] text-muted-foreground text-center">
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
            className="space-y-6"
          >
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <h3 className="text-[13px] font-medium text-foreground">Próximos pasos:</h3>
              <ol className="text-[12px] text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Revisa tu bandeja de entrada (y spam)</li>
                <li>Haz clic en el enlace del correo</li>
                <li>Crea tu nueva contraseña</li>
              </ol>
            </div>
            <div className="text-center space-y-3">
              <p className="text-[12px] text-muted-foreground">¿No recibiste el correo?</p>
              <Button type="button" variant="outline" size="lg" onClick={() => handleModeSwitch('forgot-password')} className="w-full h-12 text-[14px] rounded-xl">
                Reenviar enlace
              </Button>
            </div>
            <Button type="button" size="lg" onClick={() => handleModeSwitch('login')} className="w-full h-12 text-[14px] rounded-xl">
              Volver al inicio de sesión
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info text */}
      {(mode === 'login' || (mode === 'register' && (registerStep === 'role' || registerStep === 'credentials'))) && (
        <p className="text-[12px] text-muted-foreground text-center mt-6 leading-relaxed">
          Al continuar, aceptas nuestros{' '}
          <button type="button" className="text-foreground hover:underline">
            Términos de Servicio
          </button>{' '}
          y{' '}
          <button type="button" className="text-foreground hover:underline">
            Política de Privacidad
          </button>
        </p>
      )}
    </div>
  );
}
