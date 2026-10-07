'use client';

/**
 * El contenido de la campana en el panel de la inmobiliaria (QA 04-10):
 * - NO-01: «Todas» dice el total REAL de avisos (antes, el tamaño de la página:
 *   «Todas 50 · Sin leer 136»).
 * - NO-05: los repetidos agrupados.
 * - NO-07/NO-08: «Ver todas» abre `/panel/inmobiliaria/notificaciones` (antes
 *   llevaba al Inicio) y hay «Marcar todas como leídas».
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CrossFade, SegmentedControl, Stagger, StaggerItem } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useAvisosAgrupados } from '@/lib/hooks/use-avisos-agrupados';
import type { GrupoDeAvisos } from '@/lib/api/avisos-agrupados.service';
import { FilaDelAviso } from './FilaDelAviso';

export const RUTA_DE_LAS_NOTIFICACIONES = '/panel/inmobiliaria/notificaciones';

function Cuenta({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 rounded-full bg-[#1A40FF] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white tabular-nums">
      {n > 999 ? '999+' : n}
    </span>
  );
}

export function CampanaDeLaInmobiliaria({
  onCerrar,
  onCambio,
}: {
  onCerrar: () => void;
  /** Para que el punto de la campana se ponga al día. */
  onCambio?: () => void;
}) {
  const router = useRouter();
  const [pestana, setPestana] = useState<'all' | 'unread'>('all');
  const bandeja = useAvisosAgrupados({ porPagina: 20, soloSinLeer: pestana === 'unread' });

  const fallo = (accion: string) => (e: unknown) =>
    toast.error(
      mensajeParaLaPersona(e, {
        porDefecto: 'No se pudo actualizar la notificación. Prueba de nuevo.',
        accion,
      }),
    );

  const abrir = (a: GrupoDeAvisos) => {
    if (!a.read) bandeja.marcarLeido(a).then(onCambio).catch(fallo('marcar la notificación como leída'));
    onCerrar();
    router.push(a.actionUrl ?? RUTA_DE_LAS_NOTIFICACIONES);
  };

  const vacio = !bandeja.cargando && bandeja.grupos.length === 0;

  return (
    <>
      <div className="border-b border-border-faint px-5 py-3">
        <SegmentedControl
          value={pestana}
          onChange={(v) => setPestana(v as 'all' | 'unread')}
          aria-label="Filtrar notificaciones"
          options={[
            {
              value: 'all',
              label: (
                <span className="inline-flex items-center" data-testid="campana-todas">
                  Todas
                  <Cuenta n={bandeja.total} />
                </span>
              ),
            },
            {
              value: 'unread',
              label: (
                <span className="inline-flex items-center" data-testid="campana-sin-leer">
                  Sin leer
                  <Cuenta n={bandeja.unreadCount} />
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto" data-lenis-prevent>
        <CrossFade
          swapKey={bandeja.cargando ? 'cargando' : vacio ? `vacio-${pestana}` : `lista-${pestana}`}
        >
          {bandeja.cargando ? (
            <div className="px-5 py-8 text-center text-[13px] text-plan-muted">Cargando notificaciones…</div>
          ) : bandeja.error && bandeja.grupos.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-plan-muted">
              {mensajeParaLaPersona(bandeja.error, {
                porDefecto: 'No pudimos cargar las notificaciones.',
                accion: 'cargar las notificaciones',
              })}
            </div>
          ) : vacio ? (
            <div className="px-5 py-8 text-center text-[13px] text-plan-muted">
              {pestana === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
            </div>
          ) : (
            <Stagger>
              {bandeja.grupos.map((a) => (
                <StaggerItem key={a.clave}>
                  <FilaDelAviso
                    aviso={a}
                    compacta
                    onAbrir={abrir}
                    onMarcarLeido={(x) =>
                      bandeja.marcarLeido(x).then(onCambio).catch(fallo('marcar la notificación como leída'))
                    }
                    onQuitar={(x) => bandeja.quitar(x).then(onCambio).catch(fallo('quitar la notificación'))}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </CrossFade>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border-faint bg-surface-muted px-5 py-3">
        <button
          type="button"
          disabled={bandeja.unreadCount === 0}
          onClick={() =>
            bandeja
              .marcarTodasLeidas()
              .then(onCambio)
              .catch(fallo('marcar las notificaciones como leídas'))
          }
          className="text-[13px] font-medium text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          Marcar todas como leídas
        </button>
        <button
          type="button"
          data-testid="campana-ver-todas"
          onClick={() => {
            onCerrar();
            router.push(RUTA_DE_LAS_NOTIFICACIONES);
          }}
          className="text-[13px] font-medium text-[#1A40FF] transition-colors hover:text-[#1A40FF] dark:text-[#5570FF]"
        >
          Ver todas
        </button>
      </div>
    </>
  );
}
