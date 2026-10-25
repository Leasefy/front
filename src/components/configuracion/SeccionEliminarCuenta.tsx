'use client';

/**
 * Eliminar la cuenta: el mismo borrado suave de siempre (`DELETE
 * /users/me/account`, 30 días para arrepentirse entrando de nuevo), con el copy
 * canónico de `accountDeletionCopy` y la tarjeta de Configuración.
 *
 * `bloqueo`: si hay algo que impide borrar (el propietario con arriendos
 * activos), se dice qué y el botón queda apagado.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrashSimple, Warning } from '@phosphor-icons/react';

import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { settingsApi } from '@/lib/api/settings.service';
import { accountDeletionCopy } from '@/lib/account-deletion/copy';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

export function SeccionEliminarCuenta({
  bloqueo,
  salidaDelBloqueo,
}: {
  bloqueo?: string | null;
  /** A dónde ir a resolver el bloqueo (p. ej. «Ver mis arriendos»). */
  salidaDelBloqueo?: { href: string; etiqueta: string };
}) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { locale } = useI18n();
  const copy = accountDeletionCopy(locale);

  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [borrando, setBorrando] = useState(false);

  const cerrar = () => {
    setAbierto(false);
    setConfirmacion('');
  };

  const eliminar = async () => {
    if (confirmacion !== copy.confirmWord) {
      toast.error(copy.confirmInstruction);
      return;
    }
    setBorrando(true);
    try {
      await settingsApi.deleteAccount();
      cerrar();
      toast.success(copy.successToast);
      // Que alcance a leer el aviso; después se cierra la sesión y sale.
      setTimeout(() => {
        void signOut();
        router.push('/');
      }, 2000);
    } catch (err) {
      toast.error(mensajeParaLaPersona(err, { porDefecto: copy.errorFallback, accion: 'eliminar tu cuenta' }));
    } finally {
      setBorrando(false);
    }
  };

  return (
    <>
      {/* Glow up r26: sin repetir «Eliminar cuenta» (ya es el título de la
          sección), el aviso suelto y el botón de borde rojo, como «Desactivar»
          del segundo factor; el rojo lleno queda para la confirmación. */}
      <section className="rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Warning className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-fg">
                {locale === 'es' ? 'Qué pasa si la eliminas' : 'What happens if you delete it'}
              </p>
              <p className="text-sm text-fg-muted">{copy.warningBody}</p>
            </div>
          </div>
          <Button
            variant="outline"
            hideArrow
            size="sm"
            disabled={Boolean(bloqueo)}
            onClick={() => setAbierto(true)}
            data-testid="abrir-eliminar-cuenta"
            className="shrink-0 self-start border-danger/30 text-danger hover:bg-danger-soft"
          >
            {copy.deleteButton}
          </Button>
        </div>
        {bloqueo && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border pt-4">
            <p data-testid="bloqueo-eliminar-cuenta" className="text-sm text-fg">
              {bloqueo}
            </p>
            {salidaDelBloqueo && (
              <Link href={salidaDelBloqueo.href} className="text-sm font-medium text-fg underline underline-offset-4 hover:text-fg-muted">
                {salidaDelBloqueo.etiqueta}
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Destructiva: el título pregunta QUÉ y el subtítulo es el canónico de
          la baja (`recovery`): 30 días para recuperarla entrando de nuevo; es
          el mismo subtítulo que los perfiles de inquilino, propietario e
          inmobiliaria. Lo que pasa (el back sólo desactiva la cuenta y cierra
          sus sesiones; no borra nada) ya lo dijo la tarjeta de arriba con
          `warningBody`. Mientras borra no se cierra: el borrado ya salió. */}
      <SettingsModal
        open={abierto}
        onClose={() => {
          if (!borrando) cerrar();
        }}
        title={copy.warningTitle}
        description={copy.recovery}
        variant="destructive"
        footer={
          <>
            <Button variant="outline" hideArrow onClick={cerrar} disabled={borrando}>
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              hideArrow
              isLoading={borrando}
              onClick={eliminar}
              disabled={borrando || confirmacion !== copy.confirmWord}
            >
              {!borrando && <TrashSimple className="h-4 w-4" />}
              {borrando ? copy.deleting : copy.deleteButton}
            </Button>
          </>
        }
      >
        <div>
          <label htmlFor="confirmar-eliminar-cuenta" className="mb-2 block text-sm font-medium text-fg">
            {copy.confirmShortPrefix} <span className="font-mono font-medium text-fg">{copy.confirmWord}</span>{' '}
            {copy.confirmShortSuffix}
          </label>
          <Input
            id="confirmar-eliminar-cuenta"
            type="text"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            placeholder={copy.inputPlaceholder}
            disabled={borrando}
            autoComplete="off"
            autoCapitalize="characters"
          />
        </div>
      </SettingsModal>
    </>
  );
}
