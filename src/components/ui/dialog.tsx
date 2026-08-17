"use client"

import * as React from "react"
import { X } from "@phosphor-icons/react"
import {
  Dialog as DSDialog,
  DialogTrigger as DSDialogTrigger,
  DialogPortal as DSDialogPortal,
  DialogClose as DSDialogClose,
  DialogOverlay as DSDialogOverlay,
  DialogContent as DSDialogContent,
  type DialogContentProps as DSDialogContentProps,
  DialogTitle as DSDialogTitle,
  DialogDescription as DSDialogDescription,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER sobre el Dialog de @leasefy/cadence.
 *
 * ══ UNA SOLA CABECERA PARA TODA LA PLATAFORMA ═══════════════════════════════
 *
 * Todo modal del producto tiene la misma anatomía, y la impone esta primitiva
 * —no cada pantalla—, que es la única forma de que 40 modales escritos por
 * gente distinta en momentos distintos se vean igual:
 *
 *     ┌──────────────────────────────────────┐
 *     │  Título                         (✕)  │  cabecera fija, filete abajo
 *     ├──────────────────────────────────────┤
 *     │  cuerpo (lo único que scrollea)      │
 *     ├──────────────────────────────────────┤
 *     │                  Cancelar  Confirmar │  pie fijo, filete arriba
 *     └──────────────────────────────────────┘
 *
 * `DialogContent` REPARTE a sus hijos: el `<DialogHeader>` va arriba, el
 * `<DialogFooter>` abajo, y todo lo demás queda en un cuerpo con scroll propio.
 * Los call sites no cambian una línea — siguen escribiendo header, cuerpo
 * suelto y footer como hermanos.
 *
 * ── Qué arregla, en concreto ───────────────────────────────────────────────
 *
 * 1. **El título se iba de la pantalla.** Antes scrolleaba el Content entero,
 *    así que en un modal alto el título, la descripción y la ✕ se perdían
 *    arriba y los botones abajo: quedabas dentro de un formulario sin saber de
 *    qué era, sin cómo salir y sin cómo confirmar. Ahora scrollea SÓLO el
 *    cuerpo.
 *
 * 2. **La ✕ del DS también se iba**, porque va `absolute` dentro del
 *    contenedor que scrollea. Acá vive DENTRO de la cabecera, y es un chip
 *    redondo gris idéntico en todos lados.
 *
 * 3. **El título del DS es `text-h2` (22px), tamaño de encabezado de PÁGINA.**
 *    Dentro de un modal se lee enorme. La cabecera lo baja a 16px con un
 *    selector de descendiente (`[&_h2]`), que gana por especificidad: pasarle
 *    `className="text-base"` NO alcanza, porque `text-h2` no es un tamaño que
 *    tailwind-merge reconozca — las dos clases sobreviven y decide el orden del
 *    CSS, que no controlamos.
 *
 * ── Lo que se conserva del adapter viejo ───────────────────────────────────
 *
 * z-[300] sobre headers fijos, overlay `bg-black/60`, `onWheel` stopPropagation,
 * la animación legacy (tailwindcss-animate in/out) en vez del `animate-scale-in`
 * del DS, y el `gap-4` entre los hijos sueltos del cuerpo.
 */

// Scroll locking is handled by Radix (modal by default via react-remove-scroll),
// which the DS Dialog re-exports. The previous manual body-overflow effect only
// worked for controlled usage (keyed off props.open) and caused scrollbar
// layout shift — removed.
const Dialog = DSDialog

const DialogTrigger = DSDialogTrigger

const DialogPortal = DSDialogPortal

const DialogClose = DSDialogClose

// Overlay legacy del mvp: z sobre headers fijos + fade in/out simétrico.
// `data-[state=closed]:opacity-100` neutraliza el snap a opacity-0 del DS
// para que el fade-out de tailwindcss-animate sea visible.
const dialogOverlayClasses =
  "z-[300] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:opacity-100"

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DSDialogOverlay>,
  React.ComponentPropsWithoutRef<typeof DSDialogOverlay>
>(({ className, ...props }, ref) => (
  <DSDialogOverlay
    ref={ref}
    className={cn(dialogOverlayClasses, className)}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

/**
 * Frena Lenis mientras hay un modal abierto.
 *
 * El bloqueo de scroll de Radix (react-remove-scroll) tapa el scroll NATIVO del
 * body, pero Lenis no scrollea por ahí: escucha la rueda en `window` y mueve la
 * página por su cuenta. Resultado: con el modal abierto, la rueda scrolleaba el
 * fondo. Va en el adaptador y no en cada pantalla porque le pasa a los 40
 * diálogos del panel.
 */
function useFrenarLenisMientrasAbierto() {
  // Ya no hace nada acá: frenar Lenis al MONTARSE era falso. En el panel de
  // inmobiliaria este Content se monta cerrado al cargar la pantalla, llamaba
  // `stop()` y nadie llamaba `start()` — la página quedaba con
  // `overflow: hidden` para siempre, sin modal a la vista y sin ningún error.
  //
  // Ahora lo decide `SmoothScroll` observando `data-state="open"` en el DOM,
  // que es el estado REAL del modal y no una suposición sobre el montaje.
}

// ── La ✕ ────────────────────────────────────────────────────────────────────

/**
 * La ÚNICA aspa del producto: chip redondo gris.
 *
 * La del DS va `absolute` y sin fondo, y queda apagada SIEMPRE (ver
 * `DialogContent`), así que ésta es la única que un modal puede mostrar.
 * Vive en un solo lugar para que no vuelva a haber dos dibujos distintos.
 */
export const AspaDeCierre = ({ className }: { className?: string }) => (
  <DialogClose
    aria-label="Cerrar"
    data-testid="dialog-close"
    className={cn(
      "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
      "bg-surface-muted text-fg-muted transition-colors",
      "hover:bg-border hover:text-fg",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      className
    )}
  >
    <X size={16} weight="bold" aria-hidden="true" />
  </DialogClose>
)

// ── Reparto de hijos ────────────────────────────────────────────────────────

/**
 * En qué banda del modal va un hijo de `DialogContent`.
 *
 * Va como marca en el componente y NO como comparación de identidad
 * (`hijo.type === DialogHeader`). La identidad falla apenas alguien envuelve
 * la cabecera: `ResponsiveDialogHeader` renderiza un `DialogHeader` adentro
 * pero ES otro componente, así que la comparación daba falso, la cabecera se
 * iba al cuerpo con scroll y el Content dejaba encendida la ✕ del DS. Ese fue
 * exactamente el modal «Agendar una cita» con dos aspas: la pelada del DS en
 * la esquina y, unos píxeles más abajo, el chip gris de la cabecera.
 *
 * Con la marca, cualquier envoltorio la declara y hereda el reparto.
 */
type BandaDeModal = "cabecera" | "pie"

export interface ComponenteDeBanda {
  bandaDeModal?: BandaDeModal
}

function bandaDe(hijo: React.ReactNode): BandaDeModal | null {
  if (!React.isValidElement(hijo)) return null
  if (typeof hijo.type === "string") return null
  return (hijo.type as ComponenteDeBanda).bandaDeModal ?? null
}

interface RepartoDeHijos {
  cabecera: React.ReactNode
  cuerpo: React.ReactNode[]
  pie: React.ReactNode
  /** La cabecera pinta la ✕ ⇒ el Content no debe pintar la suya o salen dos. */
  cabeceraTraeCierre: boolean
}

function repartirHijos(children: React.ReactNode): RepartoDeHijos {
  let cabecera: React.ReactNode = null
  let pie: React.ReactNode = null
  let cabeceraTraeCierre = false
  const cuerpo: React.ReactNode[] = []

  React.Children.forEach(children, (hijo) => {
    const banda = bandaDe(hijo)
    if (banda === "cabecera" && !cabecera) {
      cabecera = hijo
      cabeceraTraeCierre =
        ((hijo as React.ReactElement).props as DialogHeaderProps).hideClose !== true
      return
    }
    if (banda === "pie" && !pie) {
      pie = hijo
      return
    }
    cuerpo.push(hijo)
  })

  return { cabecera, cuerpo, pie, cabeceraTraeCierre }
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DSDialogContent>,
  DSDialogContentProps
>(({ className, overlayClassName, children, hideClose, ...props }, ref) => {
  useFrenarLenisMientrasAbierto()
  const { cabecera, cuerpo, pie, cabeceraTraeCierre } = repartirHijos(children)

  return (
    <DSDialogContent
      ref={ref}
      overlayClassName={cn(dialogOverlayClasses, overlayClassName)}
      onWheel={(e) => e.stopPropagation()}
      // La ✕ del DS —pelada, sin fondo— NUNCA se pinta. Cuando hace falta un
      // aspa y la cabecera no la trae, la pone este Content con el mismo chip
      // gris de siempre (ver `aspaFlotante` abajo).
      hideClose
      className={cn(
        // Columna: cabecera / cuerpo con scroll / pie. El padding vive en cada
        // banda, no acá — por eso `p-0`. `overflow-hidden` recorta a los 20px
        // de radio del DS y deja el scroll al cuerpo, no al contenedor.
        "z-[300] flex flex-col w-[calc(100%-2rem)] max-w-lg max-h-[min(640px,90dvh)] overflow-hidden p-0",
        // animación legacy del mvp (in/out). `animate-none` apaga el
        // animate-scale-in base del DS; los modifiers data-[state] ganan.
        "animate-none duration-[var(--duration-normal)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      {/* Sin cabecera que la aloje (o con una que la apagó a propósito), el
          aspa flota arriba a la derecha —donde iba la del DS— pero con el chip
          gris del producto. `hideClose` en el Content sigue queriendo decir
          «este modal no se cierra con una ✕». */}
      {!hideClose && !cabeceraTraeCierre && (
        <AspaDeCierre className="absolute right-4 top-4 z-10" />
      )}
      {cabecera}
      {/* El cuerpo es lo ÚNICO que scrollea. `min-h-0` es obligatorio: sin él
          un hijo flex no baja de su altura de contenido y el scroll se lo come
          el contenedor, que es justo lo que estábamos arreglando. */}
      <div
        className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-6"
        data-lenis-prevent
      >
        {cuerpo}
      </div>
      {pie}
    </DSDialogContent>
  )
})
DialogContent.displayName = "DialogContent"

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * No pintar la ✕ DENTRO de la cabecera.
   *
   * Dos usos legítimos: una cabecera `sr-only` que sólo existe para darle
   * título accesible al diálogo —ahí el aspa no puede ir adentro, porque
   * nacería `sr-only` también, y el Content la pinta flotando—, y un modal que
   * el usuario no debe abandonar a medias —una firma, un pago en curso—, donde
   * la salida tiene que ser una decisión explícita del pie: eso se pide con
   * `hideClose` en el `DialogContent`, que apaga el aspa entera.
   */
  hideClose?: boolean
}

const DialogHeader = ({ className, children, hideClose, ...props }: DialogHeaderProps) => (
  <div
    className={cn(
      "shrink-0 border-b border-border bg-surface px-6 py-4",
      // Título + descripción a la izquierda, ✕ a la derecha, alineados arriba:
      // una descripción larga no debe descentrar el aspa.
      "flex items-start justify-between gap-4 text-left",
      // El título del DS es text-h2 (22px). Acá manda 16px, por especificidad
      // de descendiente para que no dependa del orden del CSS (ver arriba).
      "[&_h2]:text-base [&_h2]:leading-6 [&_h2]:font-semibold [&_h2]:tracking-[-0.005em] [&_h2]:pr-0",
      className
    )}
    {...props}
  >
    <div className="flex min-w-0 flex-col gap-1">{children}</div>
    {!hideClose && <AspaDeCierre className="mt-0.5" />}
  </div>
)
DialogHeader.displayName = "DialogHeader"
DialogHeader.bandaDeModal = "cabecera" as const

/**
 * Banda inferior, simétrica a la cabecera. Fija: sin esto, en un modal alto los
 * botones se van con el scroll y no hay cómo confirmar.
 */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 border-t border-border bg-surface px-6 py-4",
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"
DialogFooter.bandaDeModal = "pie" as const

const DialogTitle = DSDialogTitle

const DialogDescription = DSDialogDescription

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
