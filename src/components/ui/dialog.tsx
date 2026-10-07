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
  DialogHeader as DSDialogHeader,
  type DialogHeaderProps as DSDialogHeaderProps,
  DialogBody as DSDialogBody,
  DialogSection as DSDialogSection,
  DialogFooter as DSDialogFooter,
  DialogTitle as DSDialogTitle,
  DialogDescription as DSDialogDescription,
  DialogIcon,
  DialogReference,
  type DialogVariant,
  type DialogSize,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"
import { ASPA_DE_CIERRE } from "./aspa-de-cierre"

/**
 * ADAPTER sobre el Dialog de @leasefy/cadence.
 *
 * ══ UN SOLO MODAL PARA TODA LA PLATAFORMA (Nico, 02-10-2026) ════════════════
 *
 * «Quiero algo hermoso, que cada modal se sienta bello.» El dibujo vive en
 * Cadence (`DialogContent` / `DialogHeader` / `DialogBody` / `DialogFooter`):
 *
 *     ┌────────────────────────────────────────────┐
 *     │  (◎)                                  (✕)  │  medallón opcional (variant)
 *     │  Título grande (20/28)                     │  + subtítulo apagado
 *     │  Subtítulo                                 │
 *     ├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤  filete sólo si el cuerpo scrollea
 *     │  cuerpo — lo ÚNICO que scrollea            │
 *     ├────────────────────────────────────────────┤
 *     │  pie con fondo suave      Cancelar  [Sí]   │
 *     └────────────────────────────────────────────┘
 *
 * Esquinas de 24px, velo con desenfoque, ✕ en un círculo con borde, y en el
 * celular sube como hoja desde abajo. Ver DESIGN.md §17.
 *
 * Este adaptador sólo agrega lo del producto:
 *
 * 1. **Reparto de hijos** (para no tocar 90 call sites): el `<DialogHeader>`
 *    va arriba, el `<DialogFooter>` abajo y todo lo demás a un cuerpo con
 *    scroll propio (`grid gap-4`). Si el call site ya usa `<DialogBody>`, se
 *    respeta tal cual.
 * 2. **La ✕ del producto** (`AspaDeCierre`, con su `data-testid`), que Cadence
 *    ubica en su lugar y para la que la cabecera reserva espacio.
 * 3. **z-[300]**, por encima de los headers fijos del panel.
 * 4. `onWheel` stopPropagation (la rueda no se escapa a la página).
 *
 * Lenis lo frena `SmoothScroll` observando `[role=dialog][data-state=open]`:
 * no hace falta nada acá ni en cada pantalla.
 */

// Scroll locking lo hace Radix (react-remove-scroll).
const Dialog = DSDialog

const DialogTrigger = DSDialogTrigger

const DialogPortal = DSDialogPortal

const DialogClose = DSDialogClose

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DSDialogOverlay>,
  React.ComponentPropsWithoutRef<typeof DSDialogOverlay>
>(({ className, ...props }, ref) => (
  <DSDialogOverlay ref={ref} className={cn("z-[300]", className)} {...props} />
))
DialogOverlay.displayName = "DialogOverlay"

// ── La ✕ ────────────────────────────────────────────────────────────────────

/**
 * La ÚNICA aspa del producto: círculo con borde fino.
 *
 * El DIBUJO vive en `aspa-de-cierre.ts`, no acá: las pantallas que cierran sin
 * ser un modal —la de acceso, por ejemplo— lo necesitan sin arrastrar Radix.
 * La usan también los cajones (`sheet.tsx`): es un `DialogClose`, que cierra
 * el Dialog o el Sheet que la contenga.
 */
export const AspaDeCierre = ({ className }: { className?: string }) => (
  <DialogClose
    aria-label="Cerrar"
    data-testid="dialog-close"
    className={cn(ASPA_DE_CIERRE, className)}
  >
    <X size={16} weight="bold" aria-hidden="true" />
  </DialogClose>
)

// ── Reparto de hijos ────────────────────────────────────────────────────────

/**
 * En qué banda del modal va un hijo de `DialogContent`.
 *
 * Va como marca en el componente y NO como comparación de identidad
 * (`hijo.type === DialogHeader`): la identidad falla apenas alguien envuelve
 * la cabecera (`ResponsiveDialogHeader` renderiza un `DialogHeader` adentro
 * pero ES otro componente), y la cabecera caía al cuerpo con scroll. Con la
 * marca, cualquier envoltorio la declara y hereda el reparto.
 */
type BandaDeModal = "cabecera" | "cuerpo" | "pie"

export interface ComponenteDeBanda {
  bandaDeModal?: BandaDeModal
}

function bandaDe(hijo: React.ReactNode): BandaDeModal | null {
  if (!React.isValidElement(hijo)) return null
  if (typeof hijo.type === "string") return null
  return (hijo.type as ComponenteDeBanda).bandaDeModal ?? null
}

/**
 * 🔴 EL REPARTO MIRA SÓLO A LOS HIJOS **DIRECTOS** DEL `DialogContent`.
 *
 * Si entre el `DialogContent` y su `DialogHeader` se interpone un componente
 * —cosa que pasa al extraer el cuerpo a `<CuerpoDeAlgo />`— la cabecera cae
 * al cuerpo con scroll. Cuando el cuerpo se extrae a un componente, el
 * `DialogContent` va ADENTRO de ese componente, no envolviéndolo. Lo fija
 * `CompletarMandatoDialog.test.tsx` («una sola ✕, y el título va en la
 * cabecera»).
 */
interface RepartoDeHijos {
  cabecera: React.ReactNode
  cuerpo: React.ReactNode[]
  pie: React.ReactNode
  /** El call site ya trae su `<DialogBody>`: no se envuelve otra vez. */
  cuerpoPropio: boolean
}

function repartirHijos(children: React.ReactNode): RepartoDeHijos {
  let cabecera: React.ReactNode = null
  let pie: React.ReactNode = null
  let cuerpoPropio = false
  const cuerpo: React.ReactNode[] = []

  React.Children.forEach(children, (hijo) => {
    if (hijo === null || hijo === undefined || typeof hijo === "boolean") return
    const banda = bandaDe(hijo)
    if (banda === "cabecera" && !cabecera) {
      cabecera = hijo
      return
    }
    if (banda === "pie" && !pie) {
      pie = hijo
      return
    }
    if (banda === "cuerpo") cuerpoPropio = true
    cuerpo.push(hijo)
  })

  return { cabecera, cuerpo, pie, cuerpoPropio }
}

export type DialogContentProps = DSDialogContentProps

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DSDialogContent>,
  DialogContentProps
>(({ className, overlayClassName, children, ...props }, ref) => {
  const { cabecera, cuerpo, pie, cuerpoPropio } = repartirHijos(children)

  return (
    <DSDialogContent
      ref={ref}
      overlayClassName={cn("z-[300]", overlayClassName)}
      onWheel={(e) => e.stopPropagation()}
      // La ✕ del producto, en el lugar que Cadence le da (arriba a la derecha,
      // fuera del cuerpo que scrollea: nunca se va con el contenido).
      closeButton={<AspaDeCierre />}
      className={cn("z-[300]", className)}
      {...props}
    >
      {cabecera}
      {cuerpoPropio ? (
        cuerpo
      ) : cuerpo.length > 0 ? (
        // `grid-cols-[minmax(0,1fr)]`: la columna `1fr` a secas es
        // `minmax(auto,1fr)`, y un hijo ancho (una tabla sin corte) la estira
        // más allá del diálogo (el modo «uno por uno» de los mandatos).
        <DSDialogBody
          className={cn(
            "grid grid-cols-[minmax(0,1fr)] content-start gap-4",
            // Sin cabecera el cuerpo arranca arriba del todo: necesita su aire.
            !cabecera && "pt-6 sm:pt-7"
          )}
        >
          {cuerpo}
        </DSDialogBody>
      ) : null}
      {pie}
    </DSDialogContent>
  )
})
DialogContent.displayName = "DialogContent"

export interface DialogHeaderProps extends DSDialogHeaderProps {
  /**
   * Compatibilidad: antes apagaba la ✕ DENTRO de la cabecera (para las
   * cabeceras `sr-only`). Hoy la ✕ vive en el Content, nunca en la cabecera,
   * así que no hace nada. Para un modal sin ✕, `hideClose` en el Content.
   */
  hideClose?: boolean
}

/**
 * Cabecera: medallón (si el Content o la cabecera traen `variant`/`icon`),
 * título y subtítulo. El tamaño del título lo fija Cadence (20/28): ningún
 * call site lo cambia (lo vigila `modales-alineados.test.ts`).
 */
const DialogHeader = ({ hideClose: _sinUso, ...props }: DialogHeaderProps) => (
  <DSDialogHeader {...props} />
)
DialogHeader.displayName = "DialogHeader"
DialogHeader.bandaDeModal = "cabecera" as const

/** Cuerpo con scroll propio, para quien quiera armarlo a mano (`className` libre). */
const DialogBody = (props: React.ComponentPropsWithoutRef<typeof DSDialogBody>) => (
  <DSDialogBody {...props} />
)
DialogBody.displayName = "DialogBody"
DialogBody.bandaDeModal = "cuerpo" as const

/**
 * Pie fijo con fondo suave y las acciones a la derecha (en el celular, a todo
 * el ancho y el principal arriba). Sin esto, en un modal alto los botones se
 * van con el scroll y no hay cómo confirmar.
 */
const DialogFooter = (props: React.HTMLAttributes<HTMLDivElement>) => <DSDialogFooter {...props} />
DialogFooter.displayName = "DialogFooter"
DialogFooter.bandaDeModal = "pie" as const

/** Bloque con borde fino dentro del cuerpo. */
const DialogSection = DSDialogSection

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
  DialogBody,
  DialogSection,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogIcon,
  DialogReference,
  type DialogVariant,
  type DialogSize,
}
