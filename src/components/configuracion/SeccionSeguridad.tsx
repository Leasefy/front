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
import { Lock, Monitor } from '@phosphor-icons/react';

import { useI18n } from '@/lib/i18n';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import { CambiarContrasenaModal } from '@/components/settings/CambiarContrasenaModal';
import { SesionesActivasDrawer } from '@/components/settings/SesionesActivasDrawer';
import { FilaQueAbre, TarjetaDeAjustes } from './piezas';

const NS = 'inmobiliaria.config.security';

export function SeccionSeguridad() {
  const { t } = useI18n();
  const [contrasenaAbierta, setContrasenaAbierta] = useState(false);
  const [sesionesAbiertas, setSesionesAbiertas] = useState(false);

  return (
    <>
      {/* La misma tarjeta y las mismas filas que Notificaciones y Preferencias
          (glow up r26): el ícono suelto, sin la caja gris. */}
      <TarjetaDeAjustes>
        <MfaSetupSection />

        <FilaQueAbre
          testId="abrir-cambiar-contrasena"
          icono={Lock}
          titulo={t(`${NS}.changePassword`)}
          descripcion={t(`${NS}.changePasswordDesc`)}
          onClick={() => setContrasenaAbierta(true)}
        />

        <FilaQueAbre
          testId="abrir-sesiones-activas"
          icono={Monitor}
          titulo={t(`${NS}.activeSessions`)}
          descripcion={t(`${NS}.activeSessionsDesc`)}
          onClick={() => setSesionesAbiertas(true)}
        />
      </TarjetaDeAjustes>

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
