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

export function SeccionEliminarCuenta({ bloqueo }: { bloqueo?: string | null }) {
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
      toast.error(err instanceof Error && err.message ? err.message : copy.errorFallback);
    } finally {
      setBorrando(false);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-danger/30 bg-surface">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-danger-soft">
              <Warning className="h-[18px] w-[18px] text-danger" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{copy.modalTitle}</p>
              <p className="text-sm text-fg-muted">{copy.warningBody}</p>
            </div>
          </div>
          <Button
            variant="destructive"
            hideArrow
            size="sm"
            disabled={Boolean(bloqueo)}
            onClick={() => setAbierto(true)}
            data-testid="abrir-eliminar-cuenta"
            className="shrink-0"
          >
            {copy.deleteButton}
          </Button>
        </div>
        {bloqueo && (
          <p data-testid="bloqueo-eliminar-cuenta" className="border-t border-border bg-warning-soft px-4 py-3 text-sm text-warning sm:px-5">
            {bloqueo}
          </p>
        )}
      </section>

      <SettingsModal open={abierto} onClose={cerrar} title={copy.modalTitle}>
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
            <Warning className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-medium text-danger">{copy.warningTitle}</p>
              <p className="mt-1 text-sm text-danger">{copy.warningBody}</p>
            </div>
          </div>
          <div>
            <label htmlFor="confirmar-eliminar-cuenta" className="mb-2 block text-sm font-medium text-fg">
              {copy.confirmShortPrefix} <span className="font-bold text-danger">{copy.confirmWord}</span>{' '}
              {copy.confirmShortSuffix}
            </label>
            <Input
              id="confirmar-eliminar-cuenta"
              type="text"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder={copy.inputPlaceholder}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" hideArrow onClick={cerrar} className="flex-1">
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              hideArrow
              isLoading={borrando}
              onClick={eliminar}
              disabled={borrando || confirmacion !== copy.confirmWord}
              className="flex-1"
            >
              {!borrando && <TrashSimple className="h-4 w-4" />}
              {borrando ? copy.deleting : copy.deleteButton}
            </Button>
          </div>
        </div>
      </SettingsModal>
    </>
  );
}
