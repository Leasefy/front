'use client';

/**
 * Todas las notificaciones de la inmobiliaria (QA 04-10, NO-07/NO-08): «Ver
 * todas» de la campana llevaba al Inicio. Aquí: filtros por categoría y
 * leídas, «Marcar todas como leídas», los repetidos agrupados y «Ver más».
 * Cualquier miembro activo entra: son SUS avisos.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Gear } from '@phosphor-icons/react';
import { Chip, CrossFade, IconButton, Stagger, StaggerItem } from '@leasefy/cadence';
import { Button } from '@/components/ui';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { FilaDelAviso } from '@/components/notificaciones/FilaDelAviso';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useAvisosAgrupados } from '@/lib/hooks/use-avisos-agrupados';
import type { GrupoDeAvisos } from '@/lib/api/avisos-agrupados.service';
import { FILTROS_DE_CATEGORIA } from '@/lib/notificaciones/aviso';

export default function NotificacionesDeLaInmobiliariaPage() {
  const router = useRouter();
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const [categoria, setCategoria] = useState<string | undefined>(undefined);
  const bandeja = useAvisosAgrupados({ porPagina: 30, soloSinLeer, categoria });
  // Revisora r24 (Notificaciones #1): con algo sin leer, la pantalla abre en «Sin leer» (lo que pide atención primero).
  // Sólo la primera vez: lo que la persona elija después se respeta.
  const yaElegida = useRef(false);
  useEffect(() => {
    if (yaElegida.current || bandeja.cargando) return;
    yaElegida.current = true;
    if (bandeja.unreadCount > 0) setSoloSinLeer(true);
  }, [bandeja.cargando, bandeja.unreadCount]);

  const fallo = (accion: string) => (e: unknown) =>
    toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo actualizar la notificación.', accion }));

  const abrir = (a: GrupoDeAvisos) => {
    if (!a.read) bandeja.marcarLeido(a).catch(fallo('marcar la notificación como leída'));
    if (a.actionUrl) router.push(a.actionUrl);
  };

  const vacio = !bandeja.cargando && !bandeja.error && bandeja.grupos.length === 0;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* GLOW UP 22-10 (UX): el contenedor y el encabezado de las demás pantallas del panel (antes otro
          ancho, otro margen y un título en negrilla); el conteo de sin leer es su línea. Los filtros van
          DENTRO de la lista, como en Deuda del mes: «Todas» y «Sin leer» en pestañas con su conteo, y las
          categorías al lado. */}
      <EncabezadoDePantalla
        titulo="Notificaciones"
        // Revisora r24 (Notificaciones #1): UNA línea de para qué es; los conteos, sólo en las pestañas.
        descripcion={<span data-testid="notificaciones-resumen">Lo que pasa en tu inmobiliaria y lo que te pide algo.</span>}
        acciones={
          <>
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
              size="sm"
              icon={<Gear className="h-4 w-4" />}
              aria-label="Qué me llega por correo"
              title="Qué me llega por correo"
              onClick={() => router.push('/panel/inmobiliaria/configuracion/notificaciones')}
            />
          </>
        }
      />

      {/* Revisora r25: a todo el ancho, como el encabezado (antes max-w-4xl: 240 px vacíos a 1440). */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <PestanasDeEstado
            etiqueta="Leídas y sin leer"
            valor={soloSinLeer ? 'sin-leer' : 'todas'}
            onCambio={(v) => setSoloSinLeer(v === 'sin-leer')}
            pestanas={[
              { valor: 'sin-leer', etiqueta: 'Sin leer', cuantos: bandeja.cargando ? null : bandeja.unreadCount, fija: true, tono: 'aviso', testid: 'notificaciones-sin-leer' },
              // Con todo sin leer, «Todas 33» repetía «Sin leer 33»: sin número cuando es igual.
              { valor: 'todas', etiqueta: 'Todas', cuantos: bandeja.cargando || bandeja.total === bandeja.unreadCount ? null : bandeja.total, fija: true, testid: 'notificaciones-todas' },
            ]}
          />
          <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Filtrar por categoría">
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
        </div>
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

        {/* «Ver más» en el pie de la MISMA lista, no suelto debajo. */}
        {bandeja.hayMas && (
          <div className="flex justify-center border-t border-border px-4 py-3">
            <Button variant="secondary" size="sm" disabled={bandeja.cargandoMas} onClick={() => void bandeja.cargarMas()}>
              {bandeja.cargandoMas ? 'Cargando…' : 'Ver más'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
