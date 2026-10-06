'use client'

/**
 * La entrada de un estado nuevo de `EstadoDeDatos` (cargando → contenido,
 * contenido → falló, vacío → contenido…), con el sistema de movimiento de
 * Cadence: fundido y 4 px de subida (`motionDistance.xs`) en `base` con la
 * curva de entrar; con movimiento reducido, sólo el fundido corto.
 *
 * ── Por qué no un `CrossFade` alrededor ─────────────────────────────────
 * `EstadoDeDatos` devolvía sus hijos SIN envoltura, y 117 pantallas cuentan
 * con eso: 33 le pasan varios hijos sueltos dentro de un padre con
 * `space-y-*`, `gap-*` o una grilla. Una `<div>` alrededor los juntaba en un
 * solo bloque y les quitaba el espacio entre ellos. Por eso acá NO se agrega
 * ningún nodo cuando se puede:
 *
 *   · un hijo que es una etiqueta (`<div>`, `<ul>`, `<section>`, `<tr>`…) se
 *     pinta como esa misma etiqueta de framer (`motion.div`, `motion.ul`…),
 *     con sus mismas props: el DOM queda idéntico;
 *   · si el contenido es UN solo componente (`<Table>`, `<TablaDeFacturas>`),
 *     va en una `motion.div` (como haría un `CrossFade`). Si no pinta nada en
 *     su lugar (devuelve `null`, o es un cajón que vive en un portal), la caja
 *     queda vacía y `empty:hidden` la esconde: no deja un margen ni un borde
 *     de más en un `space-y`/`divide-y`;
 *   · un componente ENTRE varios hijos queda como está, sin entrada: una caja
 *     alrededor cambiaría su padre (pruebas que buscan el `parentElement`, un
 *     `flex-1` o un `last:` que dejan de aplicar). Sus hermanos que son
 *     etiquetas sí entran;
 *   · un texto suelto queda como está.
 *
 * Lo que sale (el esqueleto, el aviso) no espera a irse: se va al instante y
 * lo nuevo entra. Con `AnimatePresence` en modo «wait» habría que envolver
 * todo en un solo nodo; con «sync» los dos ocuparían lugar a la vez y la
 * pantalla saltaría. La regla del sistema es la misma: nadie espera a que
 * algo termine de irse.
 *
 * Una etiqueta que ya tiene su propio `transform` (clases `translate-*`,
 * `rotate-*`, `scale-*` o `style.transform`) entra sólo con el fundido: el
 * `transform` en línea de framer le pisaría el suyo.
 */

import {
  Children,
  Fragment,
  createContext,
  createElement,
  isValidElement,
  useContext,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from 'react'
import { motion } from 'framer-motion'
import { enterTransition, motionDistance, usePrefersReducedMotion } from '@leasefy/cadence'

/**
 * `true` dentro de algo que YA entra animado por `conEntrada`: un vacío que
 * vive ahí no agrega su propia entrada (serían dos fundidos y 12 px).
 */
const YaEntraAnimado = createContext(false)

const CON_TRANSFORM_PROPIO = /(^|\s)!?-?(translate-|rotate-|scale-|skew-|transform(\s|$))/

interface PropsConClase {
  className?: unknown
  style?: { transform?: unknown } | undefined
  children?: ReactNode
}

/** Los hijos en una lista plana, sin fragmentos, con una clave única por nodo. */
function aplanar(nodos: ReactNode, prefijo: string): Array<{ clave: string; nodo: ReactNode }> {
  const salida: Array<{ clave: string; nodo: ReactNode }> = []
  Children.toArray(nodos).forEach((nodo, i) => {
    const propia = isValidElement(nodo) && nodo.key != null ? String(nodo.key) : String(i)
    const clave = `${prefijo}${propia}`
    if (isValidElement(nodo) && nodo.type === Fragment) {
      salida.push(...aplanar((nodo.props as PropsConClase).children, `${clave}/`))
    } else {
      salida.push({ clave, nodo })
    }
  })
  return salida
}

function tieneTransformPropio(props: PropsConClase): boolean {
  const clase = typeof props.className === 'string' ? props.className : ''
  return CON_TRANSFORM_PROPIO.test(clase) || props.style?.transform != null
}

/**
 * Los hijos de un estado, con su entrada si `animar` (el estado cambió
 * después de montarse). Sin `animar` devuelve los hijos tal cual.
 *
 * `estado` va en la clave: así el contenido de un estado nuevo se monta de
 * nuevo (y entra) aunque tenga la misma forma que el del estado anterior.
 */
export function conEntrada(
  hijos: ReactNode,
  { estado, animar, reducido }: { estado: string; animar: boolean; reducido: boolean },
): ReactNode {
  if (!animar) return hijos

  const transition = enterTransition(reducido)
  const sube = { initial: { opacity: 0, y: motionDistance.xs }, animate: { opacity: 1, y: 0 } }
  const funde = { initial: { opacity: 0 }, animate: { opacity: 1 } }

  const lista = aplanar(hijos, `${estado}:`)
  const unoSolo = lista.length === 1
  const animados = lista.map(({ clave, nodo }) => {
    if (!isValidElement(nodo)) {
      // Un texto o un número sueltos: no hay caja que animar sin agregar una.
      return <Fragment key={clave}>{nodo}</Fragment>
    }
    const props = nodo.props as PropsConClase & Record<string, unknown>
    if (typeof nodo.type === 'string') {
      const Etiqueta = (motion as unknown as Record<string, ElementType>)[nodo.type]
      if (Etiqueta) {
        const coreografia = tieneTransformPropio(props) ? funde : sube
        return createElement(Etiqueta, { ...props, key: clave, ...coreografia, transition })
      }
    }
    if (!unoSolo) return <Fragment key={clave}>{nodo}</Fragment>
    return (
      <motion.div
        key={clave}
        {...sube}
        transition={transition}
        className="empty:hidden"
        data-entrada-del-estado=""
      >
        {nodo as ReactElement}
      </motion.div>
    )
  })
  return <YaEntraAnimado.Provider value>{animados}</YaEntraAnimado.Provider>
}

/**
 * La caja de un estado vacío (`EmptyState`, `SinDatos`): entra con `Appear`
 * de Cadence (fundido y 8 px; con movimiento reducido, sólo el fundido). El
 * vacío casi siempre aparece DESPUÉS de cargar, así que su entrada es un
 * cambio, no la entrada de la página.
 *
 * Es un componente de cliente aparte para que `ui/empty-state.tsx` siga
 * pudiendo pintarse desde un componente de servidor (recibe un ícono, que es
 * una función, y eso no cruza al cliente): acá sólo llegan textos y los hijos
 * ya pintados. Dentro de un `EstadoDeDatos` que ya lo anima, es una `<div>`
 * quieta.
 */
export function CajaQueEntra(props: ComponentPropsWithoutRef<'div'>) {
  const yaEntra = useContext(YaEntraAnimado)
  const reducido = usePrefersReducedMotion()
  if (yaEntra) return <div {...props} />
  const {
    onAnimationStart: _a,
    onAnimationEnd: _b,
    onAnimationIteration: _c,
    onDrag: _d,
    onDragStart: _e,
    onDragEnd: _f,
    ...resto
  } = props
  return (
    <motion.div
      initial={{ opacity: 0, y: motionDistance.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={enterTransition(reducido)}
      {...resto}
    />
  )
}
