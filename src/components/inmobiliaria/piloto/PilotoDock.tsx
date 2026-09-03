'use client'

/**
 * PilotoDock.tsx — el tray de procesos, abajo a la derecha.
 *
 * Nico (2026-09-02): «la vista de procesos normalmente es un menú flotante
 * en la parte inferior derecha que se abre a demanda y ver todo lo que hay
 * dentro». Como el panel de subidas de Drive: un botón fijo con lo que está
 * pasando (una llamada en curso, tres depósitos esperándote), y al abrirlo,
 * la lista de procesos con sus pasos, sin salir de la pantalla en la que
 * estás. La página `/piloto/procesos` sigue existiendo para «ver todos».
 *
 * Costo: cerrado NO consulta procesos — el contador del botón sale de la
 * lectura de la flota que el header ya hace (`PilotoFlotaProvider`). Abierto,
 * el hook de procesos polea (15 s con algo vivo, 60 s quieto). Se recuerda
 * abierto/cerrado en localStorage (una conveniencia por navegador).
 *
 * Se esconde en la propia página de procesos (sería la misma lista dos veces)
 * y en móvil sube por encima de la barra de navegación inferior.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AirTrafficControl, ArrowUpRight, X } from '@phosphor-icons/react'
import { Chip } from '@leasefy/cadence'

import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context'
import { usePilotoProcesos } from '@/lib/hooks/piloto/use-piloto-procesos'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { TipoDeProceso } from '@/lib/api/piloto'
import { PilotoCajon, type PilotoApertura } from './PilotoCajon'
import { ProcesoFila } from './ProcesoCard'
import { RUTA_PROCESOS } from './PilotoModoHeader'

const CLAVE_ABIERTO = 'piloto-dock-abierto'
const TIPOS: Array<TipoDeProceso | 'todos'> = ['todos', 'deposito', 'llamada', 'whatsapp']
/** Cuántas filas caben sin que el tray se vuelva la página. */
const TOPE = 25

function leerAbierto(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_ABIERTO) === '1'
  } catch {
    return false
  }
}

function guardarAbierto(v: boolean): void {
  try {
    window.localStorage.setItem(CLAVE_ABIERTO, v ? '1' : '0')
  } catch {
    // sin localStorage no se recuerda: no pasa nada
  }
}

export function PilotoDock() {
  const { t } = useI18n()
  const pathname = usePathname()
  const flota = usePilotoFlotaCompartida()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<TipoDeProceso | 'todos'>('todos')
  const [pila, setPila] = useState<PilotoApertura[]>([])

  // El estado recordado se lee DESPUÉS de montar: en el servidor no hay ventana.
  useEffect(() => {
    setAbierto(leerAbierto())
  }, [])

  const enLaPagina = pathname?.startsWith(RUTA_PROCESOS) ?? false
  const procesos = usePilotoProcesos({ tipo, limite: TOPE, activo: abierto && !enLaPagina })

  const alternar = useCallback(() => {
    setAbierto((v) => {
      guardarAbierto(!v)
      return !v
    })
  }, [])

  // Escape o un clic AFUERA cierran el tray (si no hay un cajón encima: ese
  // cierra el suyo). El clic afuera se escucha en `mousedown` para que un
  // clic que arranca adentro y termina afuera (seleccionar texto) no lo cierre.
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!abierto || pila.length > 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alternar()
    }
    const onAfuera = (e: MouseEvent) => {
      const objetivo = e.target
      if (objetivo instanceof Node && contenedorRef.current?.contains(objetivo)) return
      alternar()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onAfuera)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onAfuera)
    }
  }, [abierto, pila.length, alternar])

  const apertura = pila.length > 0 ? (pila[pila.length - 1] as PilotoApertura) : null
  const abrirItem = useCallback((id: string) => setPila((p) => [...p, { tipo: 'item', id }]), [])
  const volver = useCallback(() => setPila((p) => p.slice(0, -1)), [])
  const cerrarCajon = useCallback(() => setPila([]), [])

  const vivo = flota.data?.enVivo ?? { llamadas: 0, conciliando: 0, esperando: 0 }
  const enVivo = vivo.llamadas + vivo.conciliando
  const lista = useMemo(() => procesos.data?.procesos ?? [], [procesos.data])

  // Sin flota (sin micro, sin agencia) no hay tray: no se inventa nada.
  if (flota.notAvailable || enLaPagina) return null

  const etiquetaBoton =
    vivo.llamadas > 0
      ? t('inmobiliaria.piloto.flota.llamadas', { n: String(vivo.llamadas) })
      : vivo.conciliando > 0
        ? t('inmobiliaria.piloto.flota.conciliando', { n: String(vivo.conciliando) })
        : vivo.esperando > 0
          ? t('inmobiliaria.piloto.flota.esperando', { n: String(vivo.esperando) })
          : t('inmobiliaria.piloto.dock.boton')

  return (
    <>
      {/* bottom-24 en móvil: por encima de la barra de navegación inferior (h-16 + safe area). */}
      <div
        ref={contenedorRef}
        className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col items-end gap-2 sm:right-5 lg:bottom-5"
        data-testid="piloto-dock"
        data-abierto={abierto ? '1' : '0'}
      >
        {abierto && (
          <section
            role="dialog"
            aria-label={t('inmobiliaria.piloto.procesos.titulo')}
            className="pointer-events-auto flex w-[calc(100vw-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] motion-safe:animate-fade-in-up"
            style={{ maxHeight: 'min(72vh, 640px)' }}
            data-testid="piloto-dock-panel"
          >
            <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                {enVivo > 0 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', enVivo > 0 ? 'bg-success' : 'bg-border-strong')} />
              </span>
              <h2 className="text-body-sm font-semibold text-fg">{t('inmobiliaria.piloto.procesos.titulo')}</h2>
              {procesos.data && (
                <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  {enVivo > 0
                    ? t('inmobiliaria.piloto.dock.enVivo', { n: String(enVivo) })
                    : t('inmobiliaria.piloto.procesos.actualizado', { hace: relativeTime(procesos.data.tomadoAt, t) })}
                </span>
              )}
              <span className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={alternar}
                  aria-label={t('inmobiliaria.piloto.dock.cerrar')}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg"
                  data-testid="piloto-dock-cerrar"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            </header>

            <div className="flex flex-wrap gap-1.5 border-b border-faint px-3 py-2">
              {TIPOS.map((tp) => {
                const n = tp === 'todos'
                  ? (procesos.data ? Object.values(procesos.data.totales).reduce((a, b) => a + b, 0) : null)
                  : (procesos.data?.totales[tp] ?? null)
                return (
                  <Chip key={tp} size="sm" selected={tipo === tp} onClick={() => setTipo(tp)} data-testid={`dock-tipo-${tp}`}>
                    {t(`inmobiliaria.piloto.procesos.tipo.${tp}`)}
                    {n !== null && <span className="ml-1 tabular-nums">{n}</span>}
                  </Chip>
                )
              })}
            </div>

            {/* La lista: el único que scrollea. `data-lenis-prevent` + overscroll:
                sin eso, con Lenis activo la rueda se la come la página. */}
            <div
              className="min-h-0 flex-1 overflow-y-auto"
              data-lenis-prevent
              style={{ overscrollBehavior: 'contain' }}
              data-testid="piloto-dock-lista"
            >
              {procesos.isLoading && !procesos.data ? (
                <ul className="space-y-2 p-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="h-11 animate-pulse rounded-md bg-surface-muted" />
                  ))}
                </ul>
              ) : procesos.error ? (
                <p className="px-3 py-6 text-center text-caption text-fg-muted">
                  {t('inmobiliaria.piloto.procesos.error', { error: procesos.error })}
                </p>
              ) : lista.length === 0 ? (
                <p className="px-3 py-8 text-center text-caption text-fg-muted">
                  {t(procesos.notAvailable ? 'inmobiliaria.piloto.procesos.sinFuente' : 'inmobiliaria.piloto.dock.vacio')}
                </p>
              ) : (
                <ul>
                  {lista.map((p) => (
                    <ProcesoFila key={p.id} proceso={p} onAbrir={abrirItem} />
                  ))}
                </ul>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-border px-3 py-2">
              <Link
                href={RUTA_PROCESOS}
                onClick={alternar}
                className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
                data-testid="piloto-dock-ver-todos"
              >
                {t('inmobiliaria.piloto.dock.verTodos')}
                <ArrowUpRight weight="bold" className="h-3 w-3" aria-hidden="true" />
              </Link>
              {procesos.data && lista.length >= TOPE && (
                <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  {t('inmobiliaria.piloto.dock.tope', { n: String(TOPE) })}
                </span>
              )}
            </footer>
          </section>
        )}

        <button
          type="button"
          onClick={alternar}
          aria-expanded={abierto}
          aria-label={t('inmobiliaria.piloto.dock.aria')}
          data-testid="piloto-dock-boton"
          className={cn(
            'pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border px-3.5 text-body-sm font-medium shadow-lg transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            abierto
              ? 'border-border bg-surface text-fg hover:bg-surface-muted'
              : 'border-fg bg-fg text-bg hover:opacity-90',
          )}
        >
          <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden="true">
            <AirTrafficControl weight="duotone" className="h-5 w-5" />
            {enVivo > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            )}
          </span>
          <span className="max-w-[220px] truncate">{etiquetaBoton}</span>
          {!abierto && vivo.esperando > 0 && enVivo === 0 && (
            <span className="rounded-full bg-warning px-1.5 font-mono text-[11px] tabular-nums text-primary-fg" data-testid="piloto-dock-badge">
              {vivo.esperando}
            </span>
          )}
        </button>
      </div>

      <PilotoCajon
        apertura={apertura}
        onClose={cerrarCajon}
        {...(pila.length > 1 ? { onVolver: volver } : {})}
        onAbrirItem={abrirItem}
        onAccionEjecutada={procesos.refetch}
      />
    </>
  )
}
