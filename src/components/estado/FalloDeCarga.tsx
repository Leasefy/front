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
   * montados dentro de un formulario —`/inquilino/aprobacion/pago`—, porque
   * ahí `onReintentar` inicia un pago PSE y `pagar()` no corta si ya está
   * enviando: dos clics rápidos eran dos intentos de cobro.
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
        // La base va SIN marco y es idéntica a la de `<SinDatos>`: son el mismo
        // hueco de la pantalla en dos estados, y `FalloDeCarga.test.tsx` clava
        // la cadena exacta (`px-6 py-16 text-center`) cuando `enmarcado={false}`.
        // Por eso el ancho/alto de develop (`py-12 sm:px-10`) no puede subir
        // acá: entra sólo en la rama enmarcada, junto con su redondeo nuevo.
        'px-6 py-16 text-center',
        enmarcado &&
          'relative overflow-hidden rounded-2xl border border-border bg-card sm:px-10',
        className,
      )}
      role="alert"
      data-testid="fallo-de-carga"
      data-tipo={fallo.tipo}
      data-enmarcado={enmarcado ? 'si' : 'no'}
    >
      {/* Un halo apenas perceptible detrás del ícono: da un centro visual sin
          agregar un color de estado. Un cartel de error no tiene que gritar.

          Va sólo enmarcado: es `absolute`, y la base sin marco no lleva
          `relative` (el test clava esa cadena exacta para que el cartel quede
          idéntico a su gemelo `<SinDatos>`), así que suelto se posicionaría
          contra un ancestro ajeno. Y además el halo existe para dar presencia
          sobre el fondo, que es justo lo que hace el marco. */}
      {enmarcado && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-muted/70 blur-2xl"
        />
      )}

      <div className="relative mx-auto flex max-w-sm flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted">
          <Icono weight="duotone" className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
        </div>

        <h2 className="mt-5 text-base font-semibold tracking-tight text-fg">
          {fallo.titulo}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {fallo.descripcion}
        </p>

        {(mostrarReintentar || volverA || fallo.tipo === 'sinSesion') && (
          <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-2">
            {mostrarReintentar && (
              // Pasa por `reintentar` (no por `onReintentar` pelado) para que el
              // botón se deshabilite, gire y diga «Intentando…» con un piso
              // visible: un reintento que resuelve en 20 ms no daba ninguna
              // señal de haber ocurrido. `FalloDeCarga.test.tsx` clava
              // `data-reintentando="si"` y el texto «Intentando».
              <Button
                onClick={() => void reintentar()}
                disabled={reintentando}
                aria-busy={reintentando}
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
                {/* `/auth`, no `/auth/login` — esa ruta no existe y el botón
                    caía en el 404. Con returnUrl para volver donde estaba. */}
                <Link href={`/auth?returnUrl=${encodeURIComponent(rutaActual)}`}>
                  Volver a entrar
                </Link>
              </Button>
            )}
            {volverA && (
              <Button
                asChild
                variant={mostrarReintentar || fallo.tipo === 'sinSesion' ? 'ghost' : 'default'}
                className="gap-2"
              >
                <Link href={volverA.href}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {volverA.label}
                </Link>
              </Button>
            )}
          </div>
        )}

        {/*
          La referencia, visible.
          El copy dice «escribinos con la referencia» y no había ninguna en
          pantalla: pedirle a alguien un dato que no le mostramos es mandarlo a
          buscar lo que no existe. El mensaje crudo del backend sigue oculto —
          sirve para diagnosticar, no para leer.
        */}
        {fallo.status ? (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            Referencia {fallo.tipo}-{fallo.status}
          </p>
        ) : null}

        {fallo.mensajeOriginal && (
          <span className="sr-only" data-testid="fallo-detalle-tecnico">
            {fallo.mensajeOriginal}
          </span>
        )}
      </div>
    </div>
  )
}
