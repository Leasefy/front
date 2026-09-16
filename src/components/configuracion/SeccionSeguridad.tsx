'use client';

/**
 * Seguridad de tu cuenta: doble factor, cambio de contraseña y sesiones
 * activas — las tres haciendo algo de verdad.
 *
 * Las dos últimas eran toasts que repetían su propio subtítulo: «Se enviará un
 * enlace a tu correo» (sin enviar nada) y «1 dispositivo conectado» (sin decir
 * cuál). Ahora abren, respectivamente, un modal que manda el enlace y explica
 * por qué se hace por correo, y un cajón con el dispositivo que tiene la
 * sesión, desde cuándo y su última señal.
 */

import { useState } from 'react';
import { CaretRight, Lock, Monitor } from '@phosphor-icons/react';

import { Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import { CambiarContrasenaModal } from '@/components/settings/CambiarContrasenaModal';
import { SesionesActivasDrawer } from '@/components/settings/SesionesActivasDrawer';

const NS = 'inmobiliaria.config.security';

function Fila({
  icono,
  titulo,
  descripcion,
  onClick,
  testId,
}: {
  icono: React.ReactNode;
  titulo: string;
  descripcion: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button
      variant="ghost"
      hideArrow
      onClick={onClick}
      data-testid={testId}
      className="flex h-auto w-full items-center justify-between rounded-none px-4 py-4 text-left hover:bg-surface-muted/60 sm:px-5"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
          {icono}
        </span>
        <span className="min-w-0 text-left">
          <span className="block text-sm font-medium text-fg">{titulo}</span>
          <span className="block text-sm text-fg-muted">{descripcion}</span>
        </span>
      </span>
      <CaretRight className="h-4 w-4 shrink-0 text-fg-muted" />
    </Button>
  );
}

export function SeccionSeguridad() {
  const { t } = useI18n();
  const [contrasenaAbierta, setContrasenaAbierta] = useState(false);
  const [sesionesAbiertas, setSesionesAbiertas] = useState(false);

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="divide-y divide-border">
          <MfaSetupSection />

          <Fila
            testId="abrir-cambiar-contrasena"
            icono={<Lock className="h-[18px] w-[18px] text-fg-muted" />}
            titulo={t(`${NS}.changePassword`)}
            descripcion={t(`${NS}.changePasswordDesc`)}
            onClick={() => setContrasenaAbierta(true)}
          />

          <Fila
            testId="abrir-sesiones-activas"
            icono={<Monitor className="h-[18px] w-[18px] text-fg-muted" />}
            titulo={t(`${NS}.activeSessions`)}
            descripcion={t(`${NS}.activeSessionsDesc`)}
            onClick={() => setSesionesAbiertas(true)}
          />
        </div>
      </section>

      <CambiarContrasenaModal
        abierto={contrasenaAbierta}
        onCerrar={() => setContrasenaAbierta(false)}
      />
      <SesionesActivasDrawer
        abierto={sesionesAbiertas}
        onCerrar={() => setSesionesAbiertas(false)}
      />
    </>
  );
}
