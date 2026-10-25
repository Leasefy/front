'use client';

/**
 * `/cuenta/confirmar-correo?u=<cuenta>&t=<enlace>` — termina el cambio del
 * correo con que se entra (21-10-2026). Llega desde el correo NUEVO.
 *
 * Exige la sesión de ESA cuenta: sin sesión manda a entrar (con el correo de
 * siempre: hasta confirmar, ése sigue sirviendo) y vuelve aquí; con la sesión
 * de otra cuenta lo dice y no confirma nada. Al confirmar, el back cierra las
 * demás sesiones; ésta se refresca para quedar con el correo nuevo.
 */
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { WarningCircle } from '@phosphor-icons/react';
import { Ilustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui';
import { Spinner } from '@/components/ui/spinner';
import { cambioDeCorreoApi } from '@/lib/api/cambio-de-correo.service';
import { useAuth } from '@/lib/auth/use-auth';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { getSupabase } from '@/lib/supabase/client';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'otra-cuenta' }
  | { tipo: 'incompleto' }
  | { tipo: 'listo'; correo: string }
  | { tipo: 'fallo'; mensaje: string };

function Contenido() {
  const sp = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const pedido = useRef(false);
  const cuenta = sp.get('u') ?? '';
  const enlace = sp.get('t') ?? '';

  useEffect(() => {
    if (isLoading || pedido.current) return;
    if (!cuenta || !enlace) {
      setEstado({ tipo: 'incompleto' });
      return;
    }
    if (!isAuthenticated || !user) {
      const vuelta = `/cuenta/confirmar-correo?${new URLSearchParams({ u: cuenta, t: enlace }).toString()}`;
      router.replace(`/auth?returnUrl=${encodeURIComponent(vuelta)}`);
      return;
    }
    if (user.id !== cuenta) {
      setEstado({ tipo: 'otra-cuenta' });
      return;
    }
    pedido.current = true;
    cambioDeCorreoApi
      .confirmar(enlace)
      .then(async (r) => {
        // La sesión de esta pestaña sigue; se refresca para traer el correo nuevo.
        await getSupabase()?.auth.refreshSession().catch(() => undefined);
        await refreshUser().catch(() => undefined);
        setEstado({ tipo: 'listo', correo: r.correo });
      })
      .catch((e) =>
        setEstado({
          tipo: 'fallo',
          mensaje: mensajeParaLaPersona(e, {
            porDefecto: 'No pudimos confirmar el cambio. Prueba de nuevo en un momento.',
            accion: 'confirmar el cambio de correo',
          }),
        }),
      );
  }, [isLoading, isAuthenticated, user, cuenta, enlace, router, refreshUser]);

  if (estado.tipo === 'cargando') {
    return (
      <div className="flex flex-col items-center gap-3 py-16" data-testid="confirmando-correo">
        <Spinner size="md" variant="muted" label="Confirmando" />
        <p className="text-body-sm text-fg-muted">Confirmando tu correo nuevo…</p>
      </div>
    );
  }
  if (estado.tipo === 'listo') {
    return (
      <div className="space-y-4 text-center" data-testid="correo-confirmado">
        {/* Glow up 23-10: el éxito con su ilustración de Cadence (antes un chulo verde grande). */}
        <Ilustracion nombre="escudo" tono="voltaje" tamano={120} className="mx-auto" />
        <h1 className="text-h2 text-fg">Listo: tu correo cambió</h1>
        <p className="text-body-sm text-fg-muted">
          Desde ahora entras con <span className="break-words font-medium text-fg">{estado.correo}</span>. Cerramos tus otras
          sesiones abiertas.
        </p>
        <Button asChild>
          <Link href="/auth/post-login">Ir a mi panel</Link>
        </Button>
      </div>
    );
  }
  const textos = {
    'otra-cuenta': {
      titulo: 'Este enlace es de otra cuenta',
      cuerpo: 'Entraste con una cuenta distinta a la que pidió el cambio. Sal y entra con el correo de siempre de esa cuenta para terminarlo.',
    },
    incompleto: {
      titulo: 'El enlace está incompleto',
      cuerpo: 'Ábrelo de nuevo desde el correo que te mandamos, o pide el cambio otra vez desde Mi perfil.',
    },
    fallo: { titulo: 'No se pudo confirmar', cuerpo: estado.tipo === 'fallo' ? estado.mensaje : '' },
  }[estado.tipo];
  return (
    <div className="space-y-4 text-center" data-testid={`confirmar-correo-${estado.tipo}`}>
      <WarningCircle weight="duotone" className="mx-auto h-10 w-10 text-fg-subtle" aria-hidden="true" />
      <h1 className="text-h2 text-fg">{textos.titulo}</h1>
      <p className="text-body-sm text-fg-muted">{textos.cuerpo}</p>
      <Button asChild variant="outline">
        <Link href="/auth/post-login">Ir a Leasefy</Link>
      </Button>
    </div>
  );
}

export default function ConfirmarCorreoPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-xl border border-border bg-card p-6 sm:p-8">
        <Suspense fallback={null}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}
