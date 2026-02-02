'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth/use-auth';
import { AuthInput } from './AuthInput';
import { SocialButtons } from './SocialButtons';
import { Divider } from './Divider';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

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

interface AuthFormProps {
  className?: string;
  onSuccess?: () => void;
}

/**
 * Auth form with login/register tabs
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

  // Get return URL from query params
  const returnUrl = searchParams.get('returnUrl') || '/';

  const loginForm = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'tenant',
      terms: false,
    },
  });

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    loginForm.reset();
    registerForm.reset();
  };

  const getRedirectUrl = (role: 'tenant' | 'landlord') => {
    // If there's a specific returnUrl, use it
    if (returnUrl && returnUrl !== '/') {
      return decodeURIComponent(returnUrl);
    }
    // Otherwise redirect based on role
    return role === 'landlord' ? '/panel' : '/inquilino';
  };

  const handleLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(data.email, data.password);

      if (result.success && result.user) {
        onSuccess?.();
        router.push(getRedirectUrl(result.user.role));
      } else {
        setError(result.error || 'Error al iniciar sesion');
      }
    } catch {
      setError('Ocurrio un error. Intenta de nuevo.');
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
        router.push(getRedirectUrl(result.user.role));
      } else {
        setError(result.error || 'Error al registrarse');
      }
    } catch {
      setError('Ocurrio un error. Intenta de nuevo.');
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
      // Google login returns a tenant user (mock)
      router.push('/inquilino');
    } catch {
      setError('Error con el inicio de sesion social');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-md', className)}>
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-h2 font-semibold text-foreground">
          Arriendo Facil
        </h1>
        <p className="text-body-sm text-muted-foreground mt-2">
          {mode === 'login'
            ? 'Bienvenido de vuelta'
            : 'Crea tu cuenta gratuita'}
        </p>
      </div>

      {/* Tab buttons */}
      <div className="flex mb-6 border-b border-border">
        <button
          type="button"
          onClick={() => handleModeSwitch('login')}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-colors relative',
            mode === 'login'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Iniciar Sesion
          {mode === 'login' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('register')}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-colors relative',
            mode === 'register'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Registrarse
          {mode === 'register' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Social buttons */}
      <SocialButtons
        onGoogleClick={handleSocialLogin}
        isLoading={isLoading}
        className="mb-6"
      />

      {/* Divider */}
      <Divider className="mb-6" />

      {/* Login form */}
      {mode === 'login' && (
        <form
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
                message: 'Ingresa un email valido',
              },
            })}
            error={loginForm.formState.errors.email?.message}
          />

          <AuthInput
            label="Contrasena"
            type="password"
            icon="password"
            placeholder="Tu contrasena"
            {...loginForm.register('password', {
              required: 'La contrasena es requerida',
              minLength: {
                value: 6,
                message: 'Minimo 6 caracteres',
              },
            })}
            error={loginForm.formState.errors.password?.message}
          />

          {/* Forgot password link */}
          <div className="text-right">
            <button
              type="button"
              className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
              Olvidaste tu contrasena?
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-sm bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full h-11 text-sm"
          >
            {isLoading ? 'Ingresando...' : 'Iniciar Sesion'}
          </Button>

          {/* Demo credentials hint */}
          <div className="p-3 rounded-sm bg-muted border border-border">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Demo:</strong> landlord@example.com / tenant@example.com
              <br />
              Contrasena: password123
            </p>
          </div>
        </form>
      )}

      {/* Register form */}
      {mode === 'register' && (
        <form
          onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
          className="space-y-4"
        >
          <AuthInput
            label="Nombre"
            type="text"
            icon="user"
            placeholder="Tu nombre completo"
            {...registerForm.register('name', {
              required: 'El nombre es requerido',
              minLength: {
                value: 2,
                message: 'Minimo 2 caracteres',
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
                message: 'Ingresa un email valido',
              },
            })}
            error={registerForm.formState.errors.email?.message}
          />

          <AuthInput
            label="Contrasena"
            type="password"
            icon="password"
            placeholder="Minimo 8 caracteres"
            isNewPassword
            {...registerForm.register('password', {
              required: 'La contrasena es requerida',
              minLength: {
                value: 8,
                message: 'Minimo 8 caracteres',
              },
            })}
            error={registerForm.formState.errors.password?.message}
          />

          {/* Role selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo de cuenta</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => registerForm.setValue('role', 'tenant')}
                className={cn(
                  'p-3 rounded-sm border text-sm font-medium transition-colors',
                  registerForm.watch('role') === 'tenant'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/20'
                )}
              >
                Inquilino
              </button>
              <button
                type="button"
                onClick={() => registerForm.setValue('role', 'landlord')}
                className={cn(
                  'p-3 rounded-sm border text-sm font-medium transition-colors',
                  registerForm.watch('role') === 'landlord'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/20'
                )}
              >
                Propietario
              </button>
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-2">
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
              className="text-caption text-muted-foreground leading-relaxed cursor-pointer"
            >
              Acepto los{' '}
              <button
                type="button"
                className="text-primary hover:underline"
              >
                Terminos de Servicio
              </button>{' '}
              y la{' '}
              <button
                type="button"
                className="text-primary hover:underline"
              >
                Politica de Privacidad
              </button>
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-sm bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !registerForm.watch('terms')}
            className="w-full h-11 text-sm"
          >
            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>
      )}
    </div>
  );
}
