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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

/**
 * ResponsiveDialog — renders a centered Dialog on >=md viewports and a
 * bottom-sheet Drawer (vaul) on <md viewports.
 *
 * The compound API mirrors Dialog 1:1 (Trigger/Content/Header/Title/
 * Description/Footer/Close), so consumers can migrate with an import swap:
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
  const Root = isMobile ? Drawer : Dialog

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
  const Trigger = isMobile ? DrawerTrigger : DialogTrigger
  return <Trigger ref={ref} {...props} />
})
ResponsiveDialogTrigger.displayName = "ResponsiveDialogTrigger"

const ResponsiveDialogClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Close = isMobile ? DrawerClose : DialogClose
  return <Close ref={ref} {...props} />
})
ResponsiveDialogClose.displayName = "ResponsiveDialogClose"

const ResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Content = isMobile ? DrawerContent : DialogContent
  return <Content ref={ref} {...props} />
})
ResponsiveDialogContent.displayName = "ResponsiveDialogContent"

const ResponsiveDialogHeader = (
  props: React.HTMLAttributes<HTMLDivElement>
) => {
  const { isMobile } = useResponsiveDialog()
  const Header = isMobile ? DrawerHeader : DialogHeader
  return <Header {...props} />
}
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader"

const ResponsiveDialogFooter = (
  props: React.HTMLAttributes<HTMLDivElement>
) => {
  const { isMobile } = useResponsiveDialog()
  const Footer = isMobile ? DrawerFooter : DialogFooter
  return <Footer {...props} />
}
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter"

const ResponsiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Title = isMobile ? DrawerTitle : DialogTitle
  return <Title ref={ref} {...props} />
})
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle"

const ResponsiveDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Description = isMobile ? DrawerDescription : DialogDescription
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
