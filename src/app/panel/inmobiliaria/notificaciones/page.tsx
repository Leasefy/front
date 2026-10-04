'use client';

/**
 * Todas las notificaciones de la inmobiliaria (QA 04-10, NO-07/NO-08): «Ver
 * todas» de la campana llevaba al Inicio. Aquí: filtros por categoría y
 * leídas, «Marcar todas como leídas», los repetidos agrupados y «Ver más».
 * Cualquier miembro activo entra: son SUS avisos.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Gear } from '@phosphor-icons/react';
import { Chip, CrossFade, IconButton, Stagger, StaggerItem } from '@leasefy/cadence';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { FilaDelAviso } from '@/components/notificaciones/FilaDelAviso';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useAvisosAgrupados } from '@/lib/hooks/use-avisos-agrupados';
import type { GrupoDeAvisos } from '@/lib/api/avisos-agrupados.service';
import { FILTROS_DE_CATEGORIA } from '@/lib/notificaciones/aviso';

function plural(n: number, uno: string, varios: string) {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? uno : varios}`;
}

export default function NotificacionesDeLaInmobiliariaPage() {
  const router = useRouter();
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const [categoria, setCategoria] = useState<string | undefined>(undefined);
  const bandeja = useAvisosAgrupados({ porPagina: 30, soloSinLeer, categoria });

  const fallo = (accion: string) => (e: unknown) =>
    toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo actualizar la notificación.', accion }));

  const abrir = (a: GrupoDeAvisos) => {
    if (!a.read) bandeja.marcarLeido(a).catch(fallo('marcar la notificación como leída'));
    if (a.actionUrl) router.push(a.actionUrl);
  };

  const vacio = !bandeja.cargando && !bandeja.error && bandeja.grupos.length === 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Notificaciones</h1>
          <p className="mt-1 text-sm text-fg-muted" data-testid="notificaciones-resumen">
            {bandeja.cargando
              ? 'Cargando…'
              : bandeja.unreadCount > 0
                ? `${plural(bandeja.unreadCount, 'sin leer', 'sin leer')} de ${plural(bandeja.total, 'notificación', 'notificaciones')}`
                : bandeja.total > 0
                  ? `Leíste todas (${plural(bandeja.total, 'notificación', 'notificaciones')})`
                  : 'No tienes notificaciones'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={bandeja.unreadCount === 0}
            onClick={() => bandeja.marcarTodasLeidas().catch(fallo('marcar las notificaciones como leídas'))}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Marcar todas como leídas
          </Button>
          <IconButton
            variant="ghost"
            icon={<Gear className="h-5 w-5" />}
            aria-label="Qué me llega por correo"
            title="Qué me llega por correo"
            onClick={() => router.push('/panel/inmobiliaria/configuracion/notificaciones')}
          />
        </div>
      </div>

      <div
        className="mb-5 flex items-center gap-2 overflow-x-auto border-b border-border pb-4"
        role="group"
        aria-label="Filtrar notificaciones"
      >
        <Chip
          selected={!soloSinLeer && !categoria}
          onClick={() => { setSoloSinLeer(false); setCategoria(undefined); }}
          className="whitespace-nowrap"
        >
          Todas
        </Chip>
        <Chip selected={soloSinLeer} onClick={() => setSoloSinLeer((v) => !v)} className="whitespace-nowrap">
          Sin leer
          {bandeja.unreadCount > 0 && <span className="ml-1 tabular-nums">{bandeja.unreadCount}</span>}
        </Chip>
        <span aria-hidden="true" className="mx-1 h-5 w-px flex-shrink-0 bg-border" />
        {FILTROS_DE_CATEGORIA.map((f) => (
          <Chip
            key={f.id}
            selected={categoria === f.id}
            onClick={() => setCategoria((c) => (c === f.id ? undefined : f.id))}
            className="whitespace-nowrap"
          >
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <CrossFade
          swapKey={
            bandeja.cargando
              ? 'cargando'
              : bandeja.error && bandeja.grupos.length === 0
                ? 'error'
                : vacio
                  ? `vacio-${soloSinLeer}-${categoria ?? ''}`
                  : `lista-${soloSinLeer}-${categoria ?? ''}`
          }
        >
          {bandeja.cargando ? (
            <div className="px-5 py-10 text-center text-sm text-fg-muted">Cargando notificaciones…</div>
          ) : bandeja.error && bandeja.grupos.length === 0 ? (
            <FalloDeCarga error={bandeja.error} queEs="las notificaciones" onReintentar={bandeja.recargar} />
          ) : vacio ? (
            <EmptyState
              icon={Bell}
              title={
                soloSinLeer
                  ? 'No tienes notificaciones sin leer'
                  : categoria
                    ? 'No hay notificaciones de esta categoría'
                    : 'No tienes notificaciones'
              }
              description="Aquí te avisamos lo que pasa en tu inmobiliaria: postulaciones, pagos, contratos y lo que necesita tu atención."
              className="rounded-none border-0 bg-transparent"
            />
          ) : (
            <Stagger>
              {bandeja.grupos.map((a) => (
                <StaggerItem key={a.clave}>
                  <FilaDelAviso
                    aviso={a}
                    onAbrir={abrir}
                    onMarcarLeido={(x) => bandeja.marcarLeido(x).catch(fallo('marcar la notificación como leída'))}
                    onQuitar={(x) => bandeja.quitar(x).catch(fallo('quitar la notificación'))}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </CrossFade>
      </div>

      {bandeja.hayMas && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="sm" disabled={bandeja.cargandoMas} onClick={() => void bandeja.cargarMas()}>
            {bandeja.cargandoMas ? 'Cargando…' : 'Ver más'}
          </Button>
        </div>
      )}
    </div>
  );
}
