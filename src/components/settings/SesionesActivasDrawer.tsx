'use client';

/**
 * SesionesActivasDrawer — qué dispositivo tiene tu sesión, desde cuándo y
 * cuándo dio su última señal.
 *
 * Antes esta fila sólo tiraba un toast que repetía su propio subtítulo («1
 * dispositivo conectado»), que no es una respuesta: no decía CUÁL dispositivo.
 *
 * La lista trae como máximo una fila porque Leasefy permite una sesión a la
 * vez. Eso NO se esconde: se dice arriba de todo, porque si no, ver un solo
 * renglón parece una lista incompleta en vez de la política que es.
 */

import { useCallback, useEffect, useState } from 'react';
import { Monitor, ShieldCheck, SignOut, Warning } from '@phosphor-icons/react';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth/use-auth';
import { getDeviceId } from '@/lib/auth/device-id';
import {
  getSesionesActivas,
  type DispositivoConSesion,
} from '@/lib/api/session.service';

const NS = 'inmobiliaria.config.security';

export interface SesionesActivasDrawerProps {
  abierto: boolean;
  onCerrar: () => void;
}

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error' }
  | { fase: 'listo'; dispositivos: DispositivoConSesion[] };

/**
 * «hace 3 horas» a partir de un ISO. Devuelve null cuando no hay fecha: una
 * sesión anterior a las columnas nuevas no sabe desde cuándo está, y eso se
 * dice, no se rellena con la fecha de hoy.
 */
export function haceCuanto(iso: string | null, ahora: number = Date.now()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;

  const minutos = Math.max(0, Math.floor((ahora - t) / 60000));
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.floor(horas / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** Fecha larga en español, para acompañar al «hace tanto». */
export function fechaLarga(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Dato({ etiqueta, iso }: { etiqueta: string; iso: string | null }) {
  const { t } = useI18n();
  const relativo = haceCuanto(iso);
  const absoluto = fechaLarga(iso);

  return (
    <div className="min-w-0">
      <p className="text-caption uppercase tracking-wide text-fg-subtle">{etiqueta}</p>
      {relativo ? (
        <>
          <p className="text-sm font-medium text-fg">{relativo}</p>
          <p className="text-caption text-fg-muted">{absoluto}</p>
        </>
      ) : (
        <p className="text-sm text-fg-muted">{t(`${NS}.sessionsUnknownTime`)}</p>
      )}
    </div>
  );
}

export function CuerpoDeSesiones({ onCerrarSesion }: { onCerrarSesion: () => void }) {
  const { t } = useI18n();
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  const cargar = useCallback(() => {
    setEstado({ fase: 'cargando' });
    getSesionesActivas(getDeviceId())
      .then((res) => setEstado({ fase: 'listo', dispositivos: res.dispositivos }))
      .catch(() => setEstado({ fase: 'error' }));
  }, []);

  useEffect(cargar, [cargar]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold text-fg">{t(`${NS}.sessionsTitle`)}</h2>
        <p className="mt-1 text-body-sm text-fg-muted">{t(`${NS}.sessionsIntro`)}</p>
      </div>

      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5"
        data-lenis-prevent
      >
        {estado.fase === 'cargando' && (
          <div className="flex items-center justify-center py-12" data-testid="sesiones-cargando">
            <Spinner />
          </div>
        )}

        {estado.fase === 'error' && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-danger-soft p-4">
            <Warning className="mt-0.5 h-5 w-5 shrink-0 text-danger" weight="fill" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-danger">{t(`${NS}.sessionsError`)}</p>
              <Button variant="outline" size="sm" hideArrow onClick={cargar} className="mt-3">
                {t(`${NS}.sessionsRetry`)}
              </Button>
            </div>
          </div>
        )}

        {estado.fase === 'listo' && estado.dispositivos.length === 0 && (
          <p className="py-10 text-center text-body-sm text-fg-muted">
            {t(`${NS}.sessionsEmpty`)}
          </p>
        )}

        {estado.fase === 'listo' &&
          estado.dispositivos.map((d, i) => (
            <article
              key={`${d.etiqueta}-${i}`}
              data-testid="sesion-activa"
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft">
                  <Monitor className="h-5 w-5 text-primary" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-fg">{d.etiqueta}</p>
                    {d.esEsteDispositivo ? (
                      <Badge variant="success">
                        <ShieldCheck className="h-3 w-3" aria-hidden />
                        {t(`${NS}.sessionsThisDevice`)}
                      </Badge>
                    ) : (
                      <Badge variant="warning">{t(`${NS}.sessionsOtherDevice`)}</Badge>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Dato etiqueta={t(`${NS}.sessionsSince`)} iso={d.desde} />
                    <Dato etiqueta={t(`${NS}.sessionsLastSeen`)} iso={d.ultimaSenal} />
                  </div>
                </div>
              </div>
            </article>
          ))}
      </div>

      {estado.fase === 'listo' && estado.dispositivos.length > 0 && (
        <div className="border-t border-border px-6 py-4">
          <Button
            variant="outline"
            hideArrow
            onClick={onCerrarSesion}
            className="w-full text-danger"
            data-testid="cerrar-sesion-desde-drawer"
          >
            <SignOut className="h-4 w-4" aria-hidden />
            {t(`${NS}.sessionsCloseAll`)}
          </Button>
          <p className="mt-2 text-caption text-fg-muted">{t(`${NS}.sessionsCloseAllHint`)}</p>
        </div>
      )}
    </div>
  );
}

export function SesionesActivasDrawer({ abierto, onCerrar }: SesionesActivasDrawerProps) {
  const { t } = useI18n();
  const { signOut } = useAuth();

  // No se desmonta al cerrar: sin contenido montado con `data-state="closed"`
  // Radix no tiene qué animar y el cajón desaparece de un tirón.
  return (
    <Sheet open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 !p-0 sm:max-w-lg"
        aria-describedby={undefined}
        data-testid="sesiones-activas-cajon"
      >
        {/* Radix exige el título accesible acá; en pantalla lo pinta el cuerpo,
            que así se puede montar en un test sin portal ni contexto. */}
        <SheetTitle className="sr-only">{t(`${NS}.sessionsTitle`)}</SheetTitle>
        <CuerpoDeSesiones onCerrarSesion={() => void signOut()} />
      </SheetContent>
    </Sheet>
  );
}
