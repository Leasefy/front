'use client'

/**
 * El cartel de «no se pudo cargar», que decide solo qué decir.
 *
 * Reemplaza el patrón `<ErrorState description={error} onRetry={fetch} />`,
 * que mostraba el mensaje crudo del backend —en inglés— y ofrecía reintentar
 * incluso sobre un 404.
 *
 * Ver src/lib/errores/clasificar.ts para la tabla de los cuatro estados.
 * El estado vacío NO va acá: eso es <EmptyState>.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwise,
  MagnifyingGlass,
  Lock,
  WifiSlash,
  WarningOctagon,
  ArrowLeft,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { clasificarFallo, type Contexto, type TipoDeFallo } from '@/lib/errores/clasificar'
import { cn } from '@/lib/utils'

const ICONO: Record<TipoDeFallo, Icon> = {
  noExiste: MagnifyingGlass,
  sinPermiso: Lock,
  sinSesion: Lock,
  red: WifiSlash,
  servidor: WarningOctagon,
}

export interface FalloDeCargaProps {
  /** Lo que tiró el catch. */
  error: unknown
  /** Qué se estaba cargando: «la propiedad», «el contrato»… */
  queEs?: Contexto['queEs']
  /**
   * Sólo se usa si el fallo es de los que pueden cambiar al reintentar.
   *
   * Si devuelve una promesa, el botón la espera: queda deshabilitado y dice
   * «Intentando…» mientras tanto.
   *
   * ⚠️ En la mayoría de las pantallas eso NO se llega a ver, y está bien: el
   * reintento prende la bandera de carga del hook, el padre cambia al
   * esqueleto y este cartel se desmonta. Medido en Propietarios: el spinner
   * aparece a los 2 ms. Donde sí importa es en los carteles que quedan
   * montados dentro de un formulario de pago, porque ahí `onReintentar`
   * inicia un cobro y si la función que dispara no corta cuando ya está
   * enviando, dos clics rápidos son dos intentos de cobro.
   */
  onReintentar?: () => void | Promise<unknown>
  /** A dónde volver cuando reintentar no tiene sentido. */
  volverA?: { label: string; href: string }
  /**
   * ¿Pinta su propia tarjeta?
   *
   * `true` (por defecto) cuando el cartel ES la pantalla: reemplaza todo el
   * cuerpo y el borde le da presencia sobre el fondo.
   *
   * `false` cuando va DENTRO de algo que ya tiene borde —el cuerpo de una
   * tabla, un `<Card>`, un diálogo—. Ahí su gemelo `<SinDatos>` va sin marco,
   * así que un fallo enmarcado se veía como un borde adentro de otro borde:
   * dos rectángulos redondeados concéntricos. Sin marco los dos quedan
   * idénticos (`px-6 py-16 text-center`), que es lo que corresponde: son el
   * mismo hueco de la pantalla en dos estados distintos.
   */
  enmarcado?: boolean
  className?: string
}

export function FalloDeCarga({
  error,
  queEs,
  onReintentar,
  volverA,
  enmarcado = true,
  className,
}: FalloDeCargaProps) {
  const fallo = clasificarFallo(error, { queEs })
  const Icono = ICONO[fallo.tipo]
  // Para volver a donde estaba después de entrar de nuevo.
  const rutaActual =
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'

  // El botón de reintentar aparece SÓLO si volver a pedirlo puede dar otro
  // resultado. Sobre un 404 o un 403 sería mentir.
  const mostrarReintentar = fallo.sePuedeReintentar && Boolean(onReintentar)

  // ── Un reintento a la vez ──────────────────────────────────────────────
  // El piso de tiempo es para que el cambio se alcance a ver cuando el cartel
  // no se desmonta; el `disabled` es lo que de verdad importa, porque hay un
  // `onReintentar` que inicia un cobro.
  const PISO_VISIBLE_MS = 400
  const [reintentando, setReintentando] = useState(false)

  // ── La referencia que el copy promete ──────────────────────────────────
  // La descripcion dice «escribinos con la referencia de abajo» y no habia
  // ninguna: se le pedia a la persona un dato que nunca le mostramos. Esto es
  // lo que le sirve a soporte para encontrar el evento en los logs —status y
  // hora—, sin filtrar el mensaje crudo del backend, que sigue viviendo solo
  // en el nodo `sr-only` de diagnostico.
  //
  // Se calcula UNA vez al montar (inicializador de useState, no en el cuerpo):
  // si se recomputara en cada render, la referencia cambiaria mientras la
  // persona la esta copiando.
  const [referencia] = useState(() => {
    const ahora = new Date()
    const hhmm =
      String(ahora.getHours()).padStart(2, '0') +
      String(ahora.getMinutes()).padStart(2, '0')
    return `${fallo.status ?? fallo.tipo.toUpperCase().slice(0, 3)}-${hhmm}`
  })
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  const reintentar = useCallback(async () => {
    if (!onReintentar || reintentando) return
    setReintentando(true)
    const empezo = Date.now()
    try {
      await onReintentar()
    } finally {
      const falta = PISO_VISIBLE_MS - (Date.now() - empezo)
      if (falta > 0) await new Promise((r) => setTimeout(r, falta))
      // El componente puede haberse desmontado si el reintento salió bien.
      if (vivo.current) setReintentando(false)
    }
  }, [onReintentar, reintentando])

  return (
    <div
      className={cn(
        'px-6 py-16 text-center',
        enmarcado && 'rounded-lg border border-border bg-card',
        className,
      )}
      role="alert"
      data-testid="fallo-de-carga"
      data-tipo={fallo.tipo}
      data-enmarcado={enmarcado ? 'si' : 'no'}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
        <Icono weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-[15px] font-semibold text-fg">{fallo.titulo}</p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
          {fallo.descripcion}
        </p>
        <p className="text-xs text-fg-subtle">
          Referencia: <span className="font-mono tabular-nums">{referencia}</span>
        </p>
      </div>

      {(mostrarReintentar || volverA || fallo.tipo === 'sinSesion') && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {mostrarReintentar && (
            <Button
              onClick={() => void reintentar()}
              disabled={reintentando}
              aria-busy={reintentando}
              variant="outline"
              className="gap-2"
              data-testid="reintentar"
              data-reintentando={reintentando ? 'si' : 'no'}
            >
              <ArrowsClockwise
                className={cn('h-4 w-4', reintentando && 'animate-spin')}
                aria-hidden="true"
              />
              {reintentando ? 'Intentando…' : 'Intentar de nuevo'}
            </Button>
          )}
          {fallo.tipo === 'sinSesion' && (
            <Button asChild>
              {/* `/auth`, no `/auth/login` — esa ruta no existe y el botón caía
                  en el 404. Con returnUrl para volver donde estaba, igual que
                  ProtectedRoute. */}
              <Link href={`/auth?returnUrl=${encodeURIComponent(rutaActual)}`}>
                Volver a entrar
              </Link>
            </Button>
          )}
          {volverA && (
            <Button asChild variant={mostrarReintentar ? 'ghost' : 'outline'} className="gap-2">
              <Link href={volverA.href}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {volverA.label}
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* El mensaje del backend sirve para diagnosticar, no para leer: queda en
          el DOM pero no en pantalla. */}
      {fallo.mensajeOriginal && (
        <span className="sr-only" data-testid="fallo-detalle-tecnico">
          {fallo.mensajeOriginal}
        </span>
      )}
    </div>
  )
}
