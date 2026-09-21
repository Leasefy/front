'use client'

/**
 * Los cuatro estados de una pantalla con datos, en un solo lugar y en el
 * orden correcto.
 *
 * El orden importa y es fácil de equivocar: si el estado vacío se evalúa antes
 * que el de carga, la pantalla afirma «no hay nada» durante el medio segundo
 * en que todavía no sabe. Eso enseña a desconfiar de la pantalla. Acá el orden
 * es parte del componente, no de quien lo llama.
 *
 *   1. cargando  → esqueleto (si se conoce la forma) o spinner
 *   2. falló     → <FalloDeCarga>, que decide si se puede reintentar
 *   3. vacío     → el estado vacío que le pases
 *   4. hay datos → los hijos
 *
 * Excepción deliberada — el refresco de fondo: si YA se mostró contenido, un
 * fallo posterior no debe borrarlo. Pasa `conservarContenido` para eso.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { Spinner } from '@/components/ui'
import { FalloDeCarga } from './FalloDeCarga'
import { clasificarFallo } from '@/lib/errores/clasificar'
import { useAccesoDeLaPantalla } from '@/components/auth/acceso-de-la-pantalla'

export interface EstadoDeDatosProps {
  cargando: boolean
  /** El error entero, no su mensaje. `null` si no falló. */
  error?: unknown
  /** ¿La respuesta llegó bien y no trajo nada? */
  vacio?: boolean
  /**
   * Qué mostrar mientras carga. Un esqueleto sólo sirve si la forma del
   * resultado se conoce de antemano (una tabla, una grilla de tarjetas). Si
   * no se conoce, un spinner es más honesto que un esqueleto que miente
   * sobre la forma.
   */
  esqueleto?: ReactNode
  /** El <EmptyState> de esta pantalla. */
  cuandoVacio?: ReactNode
  /** Qué se estaba cargando: «las postulaciones», «el contrato»… */
  queEs?: string
  onReintentar?: () => void
  volverA?: { label: string; href: string }
  /** Si ya se mostró contenido, un fallo de refresco no lo borra. */
  conservarContenido?: boolean
  /**
   * 🔴 ¿Éste es el dato PRINCIPAL de la pantalla — el que, si no se puede
   * leer, deja sin sentido a todo lo demás?
   *
   * Marcarlo cambia una sola cosa, y es la que Nico pidió el 21-09: si el
   * servidor NIEGA este dato, no se apaga sólo este hueco, se apaga la
   * pantalla entera. Sin eso quedaba un «No tienes acceso a esto» en el centro
   * y, alrededor, el buscador, los filtros y un «+ Nuevo lead» vivos.
   *
   * Va sólo en UNO por pantalla. Una sección secundaria que se niega —los
   * daños del portal del propietario, por ejemplo— degrada sola y no tiene por
   * qué tumbar lo que sí funciona.
   */
  principal?: boolean
  children: ReactNode
}

export function EstadoDeDatos({
  cargando,
  error,
  vacio = false,
  esqueleto,
  cuandoVacio,
  queEs,
  onReintentar,
  volverA,
  conservarContenido = false,
  principal = false,
  children,
}: EstadoDeDatosProps) {
  /**
   * ¿Esta instancia llegó alguna vez a pintar sus datos? Un `useRef` y no un
   * `useState` a propósito: no tiene que provocar un render, sólo recordar.
   */
  const yaHuboContenido = useRef(false)

  /*
   * Si este es el dato principal y el servidor lo NEGÓ, se avisa hacia arriba:
   * `PageGuard` cambia la pantalla entera por el cartel. Los dos tipos que
   * cuentan como «negado» son los dos que no se arreglan reintentando —no
   * tienes el permiso, o te falta el segundo factor—; un 500 o una red caída
   * NO apagan la pantalla, porque ahí los controles sí pueden volver a servir
   * en cuanto el servidor conteste.
   */
  const acceso = useAccesoDeLaPantalla()
  const denegar = acceso?.denegar
  const yaDenegado = Boolean(acceso?.denegado)
  useEffect(() => {
    if (!principal || !error || !denegar || yaDenegado) return
    const fallo = clasificarFallo(error, { queEs })
    if (fallo.tipo === 'sinPermiso' || fallo.tipo === 'sinSegundoFactor') {
      denegar({ error, queEs })
    }
  }, [principal, error, denegar, yaDenegado, queEs])

  if (cargando) {
    return (
      <>
        {esqueleto ?? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="md" variant="muted" />
          </div>
        )}
      </>
    )
  }

  // 🔴 `conservarContenido` conserva lo que YA se mostró — no la primera vez
  // (18-09-2026). Sin este `yaHuboContenido`, la bandera se tragaba el error
  // SIEMPRE, incluso en la primera carga, cuando no hay nada que conservar: la
  // pantalla pintaba `children` con la lista vacía y el resultado era una
  // tarjeta en blanco, sin mensaje y sin «Intentar de nuevo». Nico lo describió
  // exacto —«¿esto realmente sí está conectado?»—: un fallo que se ve idéntico
  // a «no hay nada» es peor que un error, porque nadie lo reporta.
  //
  // Son 20 pantallas con la bandera puesta, así que el arreglo va acá y no en
  // cada una.
  if (error && !(conservarContenido && yaHuboContenido.current)) {
    return (
      // Sin marco: esto NO es la pantalla, es el hueco de contenido que la
      // página ya envolvió —las tres pantallas que lo usan lo ponen dentro de
      // `rounded-lg border bg-card`—. Enmarcado quedaba un borde redondeado
      // adentro de otro, y encima distinto de `cuandoVacio`, que ocupa
      // exactamente el mismo lugar sin marco.
      <FalloDeCarga
        error={error}
        queEs={queEs}
        onReintentar={onReintentar}
        volverA={volverA}
        enmarcado={false}
      />
    )
  }

  if (vacio && cuandoVacio) return <>{cuandoVacio}</>

  // Desde acá sí hubo contenido: el próximo fallo de refresco puede conservarlo.
  yaHuboContenido.current = true
  return <>{children}</>
}
