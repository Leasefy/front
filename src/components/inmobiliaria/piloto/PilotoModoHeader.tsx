'use client'

/**
 * PilotoModoHeader.tsx — la píldora del header: «Piloto · Copiloto».
 *
 * Nico (2026-09-02): «en el header demos visibilidad de que el piloto está
 * activo y está en sombra, copiloto o automático, y se pueda cambiar súper
 * fácil». Vive en el `actions` del `PlanHeader`, a la izquierda de la
 * campana, en TODAS las pantallas del panel.
 *
 * Qué muestra: un punto de color + el modo de la FLOTA (el que comparten los
 * agentes que corren; `mixto` si no comparten uno) y, si el Piloto está
 * haciendo algo ahora, un contador vivo («1 llamada»). Al abrirla, los tres
 * modos con lo que hace cada uno HOY y un solo clic para mover la flota
 * entera (OWNER/ADMIN; el resto la ve, no la mueve).
 *
 * Pasar a automático pide una confirmación en línea: es el único cambio que
 * hace que el Piloto llame, escriba y emita recibos sin preguntar. Bajar de
 * autonomía es un clic, siempre.
 *
 * Honestidad: si `PILOTO_ENABLED` está apagado en el micro, la píldora dice
 * «apagado» y los modos se ven pero no se ofrecen — elegir un modo para una
 * flota que no corre sería teatro.
 */

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AirTrafficControl,
  CaretDown,
  Check,
  Handshake,
  Moon,
  Phone,
  Rocket,
  Bank,
  SlidersHorizontal,
  Waveform,
} from '@phosphor-icons/react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { usePilotoFlota } from '@/lib/hooks/piloto/use-piloto-flota'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { AutonomiaModo, ModoDeLaFlota } from '@/lib/api/piloto'

const MODOS: AutonomiaModo[] = ['sombra', 'copiloto', 'autonomo']

const ICONO: Record<AutonomiaModo, typeof Moon> = {
  sombra: Moon,
  copiloto: Handshake,
  autonomo: Rocket,
}

/** El punto de la píldora, por modo. Semántico, no decorativo: el verde es «se mueve solo». */
const PUNTO: Record<ModoDeLaFlota, string> = {
  sombra: 'bg-fg-muted',
  copiloto: 'bg-primary',
  autonomo: 'bg-success',
  mixto: 'bg-warning',
}

export const RUTA_PROCESOS = '/panel/inmobiliaria/piloto/procesos'
export const RUTA_PILOTO = '/panel/inmobiliaria/piloto'

export function PilotoModoHeader() {
  const { t } = useI18n()
  const { isAdmin } = usePermissionsContext()
  const flota = usePilotoFlota()
  const [abierto, setAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState<AutonomiaModo | null>(null)

  const data = flota.data
  // Sin micro, sin agencia o sin endpoint: no hay píldora. No se inventa un estado.
  if (flota.notAvailable || (!data && !flota.isLoading)) return null

  const modo: ModoDeLaFlota | null = data?.modo ?? null
  const activo = data?.activo ?? false
  const vivo = data?.enVivo ?? { llamadas: 0, conciliando: 0, esperando: 0 }
  const hayVivo = vivo.llamadas > 0 || vivo.conciliando > 0
  const puedeCambiar = isAdmin && activo && !flota.busy

  const etiquetaModo = (m: ModoDeLaFlota | null) =>
    m ? t(`inmobiliaria.piloto.flota.modo.${m}`) : '…'

  const aplicar = async (nuevo: AutonomiaModo) => {
    setConfirmando(null)
    const res = await flota.setModo(nuevo)
    if (!res.ok) {
      toast.error(t('inmobiliaria.piloto.flota.toastFail', { error: res.error ?? 'error' }))
      return
    }
    if (res.fallidos && res.fallidos.length > 0) {
      toast.warning(
        t('inmobiliaria.piloto.flota.toastParcial', {
          modo: etiquetaModo(nuevo).toLowerCase(),
          agentes: res.fallidos.join(', '),
        }),
      )
    } else {
      toast.success(t('inmobiliaria.piloto.flota.toastOk', { modo: etiquetaModo(nuevo).toLowerCase() }))
    }
  }

  const elegir = (nuevo: AutonomiaModo) => {
    if (!puedeCambiar || nuevo === modo) return
    // Subir a automático es lo único que se confirma: a partir de ahí el
    // Piloto llama, escribe y emite recibos sin preguntar.
    if (nuevo === 'autonomo') {
      setConfirmando('autonomo')
      return
    }
    void aplicar(nuevo)
  }

  return (
    <Popover
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o)
        if (!o) setConfirmando(null)
        if (o) void flota.refetch()
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="piloto-modo-header"
          data-modo={modo ?? 'cargando'}
          aria-label={t('inmobiliaria.piloto.flota.aria', { modo: etiquetaModo(modo) })}
          className={cn(
            'inline-flex h-9 max-w-[240px] items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm',
            'text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            !activo && data && 'text-fg-muted',
          )}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {hayVivo && activo && (
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', PUNTO[modo ?? 'mixto'])} />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                data ? (activo ? PUNTO[modo ?? 'mixto'] : 'bg-border-strong') : 'bg-border animate-pulse',
              )}
            />
          </span>
          <span className="hidden truncate sm:inline">
            <span className="text-fg-muted">{t('inmobiliaria.piloto.flota.piloto')}</span>
            <span className="text-fg-muted"> · </span>
            <span className="font-medium">{data ? (activo ? etiquetaModo(modo) : t('inmobiliaria.piloto.flota.apagado')) : '…'}</span>
          </span>
          <span className="truncate font-medium sm:hidden">{data ? (activo ? etiquetaModo(modo) : t('inmobiliaria.piloto.flota.apagado')) : '…'}</span>
          {hayVivo && activo && (
            <span
              data-testid="piloto-modo-vivo"
              className="hidden items-center gap-1 rounded-full bg-success-soft px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-success md:inline-flex"
            >
              {vivo.llamadas > 0 ? (
                <>
                  <Waveform weight="bold" className="h-3 w-3" aria-hidden="true" />
                  {vivo.llamadas}
                </>
              ) : (
                <>
                  <Bank weight="bold" className="h-3 w-3" aria-hidden="true" />
                  {vivo.conciliando}
                </>
              )}
            </span>
          )}
          <CaretDown className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[340px] p-0">
        <div className="flex items-start gap-3 border-b border-faint px-4 py-3">
          <AirTrafficControl weight="duotone" className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{t('inmobiliaria.piloto.titulo')}</p>
            <p className="text-caption text-fg-muted">
              {data
                ? activo
                  ? modo === 'mixto'
                    ? t('inmobiliaria.piloto.flota.mixtoHint', {
                        autonomo: String(data.resumen.autonomo),
                        copiloto: String(data.resumen.copiloto),
                        sombra: String(data.resumen.sombra),
                      })
                    : t('inmobiliaria.piloto.flota.corriendo', { n: String(data.agentes.filter((a) => a.corre).length) })
                  : t('inmobiliaria.piloto.flota.apagadoHint')
                : t('inmobiliaria.piloto.flota.cargando')}
            </p>
          </div>
        </div>

        {/* Los tres modos: qué hace cada uno HOY. El actual lleva el check. */}
        <div role="radiogroup" aria-label={t('inmobiliaria.piloto.flota.elegir')} className="p-2">
          {MODOS.map((m) => {
            const Icono = ICONO[m]
            const actual = modo === m
            const deshabilitado = !puedeCambiar
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={actual}
                disabled={deshabilitado && !actual}
                data-testid={`piloto-modo-${m}`}
                onClick={() => elegir(m)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                  actual ? 'bg-primary-soft/60' : 'hover:bg-surface-muted',
                  deshabilitado && !actual && 'cursor-not-allowed opacity-60',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    actual ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-fg-muted',
                  )}
                >
                  <Icono weight={actual ? 'fill' : 'regular'} className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                    {t(`inmobiliaria.piloto.flota.modo.${m}`)}
                    {actual && <Check weight="bold" className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                  </span>
                  <span className="block text-caption leading-snug text-fg-muted">
                    {t(`inmobiliaria.piloto.flota.que.${m}`)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {confirmando === 'autonomo' && (
          <div data-testid="piloto-modo-confirmar" className="mx-2 mb-2 rounded-lg border border-warning/50 bg-warning-soft p-3">
            <p className="text-caption text-fg">{t('inmobiliaria.piloto.flota.confirmarAutonomo')}</p>
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" hideArrow onClick={() => setConfirmando(null)}>
                {t('inmobiliaria.piloto.flota.cancelar')}
              </Button>
              <Button size="sm" hideArrow onClick={() => void aplicar('autonomo')} data-testid="piloto-modo-confirmar-si">
                {t('inmobiliaria.piloto.flota.confirmarSi')}
              </Button>
            </div>
          </div>
        )}

        {!isAdmin && activo && (
          <p className="px-4 pb-2 text-caption text-fg-subtle">{t('inmobiliaria.piloto.autonomia.soloAdmin')}</p>
        )}

        {/* Ahora mismo: solo si pasa algo. Vacío que no aporta, no se pinta. */}
        {activo && (vivo.llamadas > 0 || vivo.conciliando > 0 || vivo.esperando > 0) && (
          <div className="border-t border-faint px-4 py-2.5" data-testid="piloto-modo-ahora">
            <p className="text-label font-medium uppercase tracking-wide text-fg-subtle">
              {t('inmobiliaria.piloto.flota.ahora')}
            </p>
            <ul className="mt-1 space-y-1 text-caption text-fg">
              {vivo.llamadas > 0 && (
                <li className="flex items-center gap-1.5">
                  <Phone weight="fill" className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  {t('inmobiliaria.piloto.flota.llamadas', { n: String(vivo.llamadas) })}
                </li>
              )}
              {vivo.conciliando > 0 && (
                <li className="flex items-center gap-1.5">
                  <Bank weight="fill" className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  {t('inmobiliaria.piloto.flota.conciliando', { n: String(vivo.conciliando) })}
                </li>
              )}
              {vivo.esperando > 0 && (
                <li className="flex items-center gap-1.5">
                  <Bank weight="fill" className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                  {t('inmobiliaria.piloto.flota.esperando', { n: String(vivo.esperando) })}
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-faint px-2 py-1.5">
          <Button asChild variant="ghost" size="sm" hideArrow>
            <Link href={RUTA_PROCESOS} onClick={() => setAbierto(false)} data-testid="piloto-modo-procesos">
              {t('inmobiliaria.piloto.flota.verProcesos')}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" hideArrow>
            <Link href={RUTA_PILOTO} onClick={() => setAbierto(false)}>
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t('inmobiliaria.piloto.flota.porAgente')}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
