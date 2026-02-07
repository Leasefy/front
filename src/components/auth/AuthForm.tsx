'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth/use-auth';
import { AuthInput } from './AuthInput';
import { cn } from '@/lib/utils';
import { House, Buildings, SpinnerGap, ArrowLeft, Envelope, CheckCircle } from '@phosphor-icons/react';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-sent';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  role: 'tenant' | 'landlord';
  terms: boolean;
}

interface ForgotPasswordFormData {
  email: string;
}

interface AuthFormProps {
  className?: string;
  onSuccess?: () => void;
}

// Google Icon - Official colors
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Premium Auth form with login/register tabs
 * Social login + email/password
 * Form validation with react-hook-form
 */
export function AuthForm({ className, onSuccess }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, loginWithGoogle } = useAuth();

  const [mode, setMode] = React.useState<AuthMode>('login');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetEmail, setResetEmail] = React.useState<string>('');

  // Get return URL and role from query params
  const returnUrl = searchParams.get('returnUrl') || '/';
  const preselectedRole = searchParams.get('role') as 'tenant' | 'landlord' | null;
  const initialMode = searchParams.get('mode') as AuthMode | null;

  const loginForm = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: preselectedRole || 'tenant',
      terms: false,
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: '',
    },
  });

  // Auto-switch mode based on URL params
  React.useEffect(() => {
    if (initialMode === 'register' || preselectedRole) {
      setMode('register');
    }
  }, [initialMode, preselectedRole]);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    loginForm.reset();
    registerForm.reset();
    forgotPasswordForm.reset();
  };

  const getRedirectUrl = (role: 'tenant' | 'landlord', isNewUser: boolean = false) => {
    if (returnUrl && returnUrl !== '/') {
      return decodeURIComponent(returnUrl);
    }
    if (role === 'landlord') {
      // New landlords go to onboarding
      if (isNewUser) {
        return '/onboarding/propietario';
      }
      return '/panel';
    }
    // Tenants
    if (isNewUser) {
      return '/onboarding/inquilino';
    }
    return '/inquilino';
  };

  const handleLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(data.email, data.password);

      if (result.success && result.user) {
        onSuccess?.();
        // Check if user needs to complete onboarding
        const needsOnboarding = result.user.onboardingCompleted === false;
        router.push(getRedirectUrl(result.user.role, needsOnboarding));
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await register(data.name, data.email, data.password, data.role);

      if (result.success && result.user) {
        onSuccess?.();
        // New users get redirected to onboarding
        router.push(getRedirectUrl(result.user.role, true));
      } else {
        setError(result.error || 'Error al registrarse');
      }
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      onSuccess?.();
      router.push('/inquilino');
    } catch {
      setError('Error con el inicio de sesión social');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call - In production, this would call your password reset endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Store the email to show in the success message
      setResetEmail(data.email);
      setMode('reset-sent');
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = registerForm.watch('role');

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        {/* Back button for forgot password flows */}
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

        {/* Success icon for reset-sent */}
        {mode === 'reset-sent' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center"
          >
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </motion.div>
        )}

        {/* Envelope icon for forgot password */}
        {mode === 'forgot-password' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Envelope className="w-8 h-8 text-primary" />
          </motion.div>
        )}

        <h1 className="text-2xl font-heading font-semibold text-foreground tracking-tight">
          {mode === 'login' && 'Bienvenido de vuelta'}
          {mode === 'register' && 'Crea tu cuenta'}
          {mode === 'forgot-password' && 'Recupera tu contraseña'}
          {mode === 'reset-sent' && '¡Revisa tu correo!'}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          {mode === 'login' && 'Ingresa a tu cuenta para continuar'}
          {mode === 'register' && 'Únete a miles de usuarios que confían en Leasefy'}
          {mode === 'forgot-password' && 'Te enviaremos un enlace para restablecer tu contraseña'}
          {mode === 'reset-sent' && (
            <>
              Enviamos un enlace de recuperación a<br />
              <span className="font-medium text-foreground">{resetEmail}</span>
            </>
          )}
        </p>
      </div>

      {/* Tab switcher - Premium pill style - Only for login/register */}
      {(mode === 'login' || mode === 'register') && (
        <>
          <div className="relative p-1 bg-muted rounded-xl mb-8">
            <div className="relative flex">
              {/* Animated background pill */}
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

          {/* Google button */}
          <button
            type="button"
            onClick={handleSocialLogin}
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon className="w-5 h-5" />
            <span className="text-[14px] font-medium text-foreground">Continuar con Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground">o continúa con email</span>
            </div>
          </div>
        </>
      )}

      {/* Forms with AnimatePresence */}
      <AnimatePresence mode="wait">
        {mode === 'login' && (
          <motion.form
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
            className="space-y-4"
          >
            <AuthInput
              label="Email"
              type="email"
              icon="email"
              placeholder="tu@email.com"
              {...loginForm.register('email', {
                required: 'El email es requerido',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Ingresa un email válido',
                },
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
                minLength: {
                  value: 6,
                  message: 'Mínimo 6 caracteres',
                },
              })}
              error={loginForm.formState.errors.password?.message}
            />

            {/* Forgot password link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => handleModeSwitch('forgot-password')}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20"
              >
                <p className="text-[13px] text-destructive">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full h-12 text-[14px] rounded-xl"
            >
              {isLoading ? (
                <>
                  <SpinnerGap className="w-4 h-4 mr-2 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>

            {/* Demo credentials */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                <span className="font-medium text-foreground">Demo:</span> landlord@example.com / tenant@example.com
                <br />
                Contraseña: password123
              </p>
            </div>
          </motion.form>
        )}

        {mode === 'register' && (
          <motion.form
            key="register"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
            className="space-y-4"
          >
            <AuthInput
              label="Nombre completo"
              type="text"
              icon="user"
              placeholder="Tu nombre"
              {...registerForm.register('name', {
                required: 'El nombre es requerido',
                minLength: {
                  value: 2,
                  message: 'Mínimo 2 caracteres',
                },
              })}
              error={registerForm.formState.errors.name?.message}
            />

            <AuthInput
              label="Email"
              type="email"
              icon="email"
              placeholder="tu@email.com"
              {...registerForm.register('email', {
                required: 'El email es requerido',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Ingresa un email válido',
                },
              })}
              error={registerForm.formState.errors.email?.message}
            />

            <AuthInput
              label="Contraseña"
              type="password"
              icon="password"
              placeholder="Mínimo 8 caracteres"
              isNewPassword
              {...registerForm.register('password', {
                required: 'La contraseña es requerida',
                minLength: {
                  value: 8,
                  message: 'Mínimo 8 caracteres',
                },
              })}
              error={registerForm.formState.errors.password?.message}
            />

            {/* Role selection - Premium cards */}
            <div className="space-y-3">
              <label className="text-[13px] font-medium text-foreground">¿Qué tipo de cuenta necesitas?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => registerForm.setValue('role', 'tenant')}
                  className={cn(
                    'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                    selectedRole === 'tenant'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-foreground/20 bg-background'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors',
                    selectedRole === 'tenant' ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <House className={cn(
                      'w-5 h-5 transition-colors',
                      selectedRole === 'tenant' ? 'text-primary' : 'text-muted-foreground'
                    )} strokeWidth={1.5} />
                  </div>
                  <p className={cn(
                    'text-[14px] font-medium transition-colors',
                    selectedRole === 'tenant' ? 'text-foreground' : 'text-foreground/80'
                  )}>
                    Inquilino
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Busco un lugar para vivir
                  </p>
                  {/* Selection indicator */}
                  {selectedRole === 'tenant' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => registerForm.setValue('role', 'landlord')}
                  className={cn(
                    'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                    selectedRole === 'landlord'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-foreground/20 bg-background'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors',
                    selectedRole === 'landlord' ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Buildings className={cn(
                      'w-5 h-5 transition-colors',
                      selectedRole === 'landlord' ? 'text-primary' : 'text-muted-foreground'
                    )} strokeWidth={1.5} />
                  </div>
                  <p className={cn(
                    'text-[14px] font-medium transition-colors',
                    selectedRole === 'landlord' ? 'text-foreground' : 'text-foreground/80'
                  )}>
                    Propietario
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Quiero arrendar mi propiedad
                  </p>
                  {/* Selection indicator */}
                  {selectedRole === 'landlord' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="terms"
                checked={registerForm.watch('terms')}
                onCheckedChange={(checked) =>
                  registerForm.setValue('terms', checked === true)
                }
                className="mt-0.5"
              />
              <label
                htmlFor="terms"
                className="text-[12px] text-muted-foreground leading-relaxed cursor-pointer"
              >
                Acepto los{' '}
                <button
                  type="button"
                  className="text-foreground hover:underline"
                >
                  Términos de Servicio
                </button>{' '}
                y la{' '}
                <button
                  type="button"
                  className="text-foreground hover:underline"
                >
                  Política de Privacidad
                </button>
              </label>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20"
              >
                <p className="text-[13px] text-destructive">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !registerForm.formState.isValid}
              className="w-full h-12 text-[14px] rounded-xl"
            >
              {isLoading ? (
                <>
                  <SpinnerGap className="w-4 h-4 mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta'
              )}
            </Button>
          </motion.form>
        )}

        {/* Forgot Password Form */}
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
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Ingresa un email válido',
                },
              })}
              error={forgotPasswordForm.formState.errors.email?.message}
            />

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20"
              >
                <p className="text-[13px] text-destructive">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full h-12 text-[14px] rounded-xl"
            >
              {isLoading ? (
                <>
                  <SpinnerGap className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </Button>

            {/* Help text */}
            <p className="text-[12px] text-muted-foreground text-center">
              Ingresa el email asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </motion.form>
        )}

        {/* Reset Email Sent Success */}
        {mode === 'reset-sent' && (
          <motion.div
            key="reset-sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Instructions */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <h3 className="text-[13px] font-medium text-foreground">Próximos pasos:</h3>
              <ol className="text-[12px] text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Revisa tu bandeja de entrada (y spam)</li>
                <li>Haz clic en el enlace del correo</li>
                <li>Crea tu nueva contraseña</li>
              </ol>
            </div>

            {/* Resend button */}
            <div className="text-center space-y-3">
              <p className="text-[12px] text-muted-foreground">
                ¿No recibiste el correo?
              </p>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleModeSwitch('forgot-password')}
                className="w-full h-12 text-[14px] rounded-xl"
              >
                Reenviar enlace
              </Button>
            </div>

            {/* Back to login */}
            <Button
              type="button"
              size="lg"
              onClick={() => handleModeSwitch('login')}
              className="w-full h-12 text-[14px] rounded-xl"
            >
              Volver al inicio de sesión
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
