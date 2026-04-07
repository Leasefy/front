'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeSlash, CheckCircle, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { useAuth } from '@/lib/auth';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = password === confirm;
  const isStrong = password.length >= 8;
  const canSubmit = password && confirm && passwordsMatch && isStrong;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      await updatePassword!(password);
      setSuccess(true);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ForceLightMode>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/">
              <svg viewBox="0 0 207 60" className="h-8 w-auto text-foreground" fill="none">
                <path d="M5 51L29 27L47 45V15" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M65.52 47V15.32H68.05V44.536H83.45V47H65.52Z" fill="currentColor"/>
              </svg>
            </Link>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-9 w-9 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Contraseña actualizada
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Tu contraseña fue cambiada exitosamente. Redirigiendo...
              </p>
              <Link href="/">
                <Button className="w-full">Ir al inicio</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Lock className="h-5 w-5 text-foreground" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground mb-1">
                  Nueva contraseña
                </h1>
                <p className="text-sm text-muted-foreground">
                  Elige una contraseña segura para tu cuenta
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full h-12 px-4 pr-11 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && !isStrong && (
                    <p className="text-xs text-destructive mt-1">Mínimo 8 caracteres</p>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full h-12 px-4 pr-11 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirm && !passwordsMatch && (
                    <p className="text-xs text-destructive mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-[14px]"
                  disabled={!canSubmit || isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar contraseña'}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                ¿Recordaste tu contraseña?{' '}
                <Link href="/auth" className="text-foreground hover:underline">
                  Iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </ForceLightMode>
  );
}
