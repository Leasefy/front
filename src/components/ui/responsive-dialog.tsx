"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  type DialogHeaderProps,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * ResponsiveDialog — renders a centered Cadence Dialog (warm card, r24) on
 * >=md viewports and a Cadence bottom Sheet on <md viewports.
 *
 * Both sides are now Cadence: the desktop Dialog and the mobile Sheet
 * (`side="bottom"`) come from the @leasefy/cadence-backed adapters. The compound
 * API mirrors Dialog 1:1 (Trigger/Content/Header/Title/Description/Footer/
 * Close), so consumers can migrate with an import swap:
 *
 *   import {
 *     ResponsiveDialog as Dialog,
 *     ResponsiveDialogTrigger as DialogTrigger,
 *     ResponsiveDialogContent as DialogContent,
 *     ...
 *   } from "@/components/ui/responsive-dialog"
 */

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
})

const useResponsiveDialog = () => React.useContext(ResponsiveDialogContext)

type ResponsiveDialogProps = DialogPrimitive.DialogProps

const ResponsiveDialog = ({ children, ...props }: ResponsiveDialogProps) => {
  const isMobile = useIsMobile()
  const Root = isMobile ? Sheet : Dialog

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      <Root {...props}>{children}</Root>
    </ResponsiveDialogContext.Provider>
  )
}
ResponsiveDialog.displayName = "ResponsiveDialog"

const ResponsiveDialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Trigger = isMobile ? SheetTrigger : DialogTrigger
  return <Trigger ref={ref} {...props} />
})
ResponsiveDialogTrigger.displayName = "ResponsiveDialogTrigger"

const ResponsiveDialogClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Close = isMobile ? SheetClose : DialogClose
  return <Close ref={ref} {...props} />
})
ResponsiveDialogClose.displayName = "ResponsiveDialogClose"

const ResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  if (isMobile) {
    return <SheetContent ref={ref} side="bottom" {...props} />
  }
  return <DialogContent ref={ref} {...props} />
})
ResponsiveDialogContent.displayName = "ResponsiveDialogContent"

/**
 * ⚠️ `bandaDeModal` no es decorativo.
 *
 * `DialogContent` reparte a sus hijos —cabecera arriba y fija, cuerpo con
 * scroll, pie abajo y fijo— y lo hace leyendo esa marca. Antes comparaba la
 * identidad del componente, y estos envoltorios NO son `DialogHeader`: la
 * cabecera caía al cuerpo, el pie dejaba de estar fijo y el Content, creyendo
 * que nadie ponía ✕, encendía la del DS encima de la del chip. De ahí las dos
 * aspas de «Agendar una cita». Si aparece otro envoltorio de estas bandas,
 * tiene que declarar la marca igual que éstos.
 */
const ResponsiveDialogHeader = (props: DialogHeaderProps) => {
  const { isMobile } = useResponsiveDialog()
  const Header = isMobile ? SheetHeader : DialogHeader
  return <Header {...props} />
}
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader"
ResponsiveDialogHeader.bandaDeModal = "cabecera" as const

const ResponsiveDialogFooter = (
  props: React.HTMLAttributes<HTMLDivElement>
) => {
  const { isMobile } = useResponsiveDialog()
  const Footer = isMobile ? SheetFooter : DialogFooter
  return <Footer {...props} />
}
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter"
ResponsiveDialogFooter.bandaDeModal = "pie" as const

const ResponsiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Title = isMobile ? SheetTitle : DialogTitle
  return <Title ref={ref} {...props} />
})
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle"

const ResponsiveDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Description = isMobile ? SheetDescription : DialogDescription
  return <Description ref={ref} {...props} />
})
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription"

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}
