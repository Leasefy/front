'use client';

/**
 * CambiarContrasenaModal — explica cómo se cambia la contraseña y manda el
 * enlace de verdad.
 *
 * Antes esta fila sólo tiraba un toast que decía «Se enviará un enlace a tu
 * correo» — en futuro, y sin haber enviado nada. Quien lo leía se iba a
 * revisar un correo que no existía.
 *
 * Ahora el modal explica las tres cosas que hacen falta para no quedarse
 * esperando: a QUÉ correo llega, POR QUÉ se hace por correo y no acá mismo, y
 * CUÁNTO dura el enlace. El envío ocurre al confirmar, no al abrir: abrir para
 * leer no debería disparar un correo.
 */

import { useState } from 'react';
import { CheckCircle, Envelope, Info, Warning } from '@phosphor-icons/react';

import { SettingsModal } from './SettingsModal';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth/use-auth';

const NS = 'inmobiliaria.config.security';

export interface CambiarContrasenaModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

type Estado = 'listo' | 'enviando' | 'enviado' | 'error';

function Punto({ icono, children }: { icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden>
        {icono}
      </span>
      <span className="text-body-sm text-fg-muted">{children}</span>
    </li>
  );
}

export function CambiarContrasenaModal({ abierto, onCerrar }: CambiarContrasenaModalProps) {
  const { t } = useI18n();
  const { user, sendPasswordReset } = useAuth();
  const [estado, setEstado] = useState<Estado>('listo');

  const correo = user?.email ?? '';

  const enviar = async () => {
    if (!correo) return;
    setEstado('enviando');
    try {
      await sendPasswordReset(correo);
      setEstado('enviado');
    } catch {
      setEstado('error');
    }
  };

  const cerrar = () => {
    onCerrar();
    // Se reinicia al cerrar para que la próxima vez no arranque en «enviado»,
    // que haría creer que ya salió un correo nuevo.
    setEstado('listo');
  };

  return (
    <SettingsModal open={abierto} onClose={cerrar} title={t(`${NS}.passwordModalTitle`)}>
      {estado === 'enviado' ? (
        <div className="space-y-4" data-testid="contrasena-enviado">
          <div className="flex gap-3 rounded-lg border border-border bg-success-soft p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-success">
                {t(`${NS}.passwordModalSent`, { email: correo })}
              </p>
              <p className="mt-1 text-body-sm text-fg-muted">
                {t(`${NS}.passwordModalSentBody`)}
              </p>
            </div>
          </div>
          <p className="text-body-sm text-fg-muted">{t(`${NS}.passwordModalSpam`)}</p>
          <Button hideArrow onClick={cerrar} className="w-full">
            {t(`${NS}.passwordModalClose`)}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-body-sm text-fg">
            {t(`${NS}.passwordModalLead`, { email: correo })}
          </p>

          <ul className="space-y-3 rounded-lg border border-border bg-surface-muted/50 p-4">
            <Punto icono={<Info className="h-[18px] w-[18px]" />}>
              {t(`${NS}.passwordModalWhy`)}
            </Punto>
            <Punto icono={<Envelope className="h-[18px] w-[18px]" />}>
              {t(`${NS}.passwordModalExpiry`)}
            </Punto>
          </ul>

          {estado === 'error' && (
            <div className="flex gap-3 rounded-lg border border-border bg-danger-soft p-3">
              <Warning className="h-5 w-5 shrink-0 text-danger" weight="fill" aria-hidden />
              <p className="text-body-sm text-danger">{t(`${NS}.passwordModalError`)}</p>
            </div>
          )}

          <Button
            hideArrow
            onClick={enviar}
            disabled={estado === 'enviando' || !correo}
            className="w-full"
            data-testid="enviar-enlace-contrasena"
          >
            {estado === 'enviando'
              ? t(`${NS}.passwordModalSending`)
              : t(`${NS}.passwordModalSend`)}
          </Button>
        </div>
      )}
    </SettingsModal>
  );
}
