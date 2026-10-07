"use client"

import * as React from "react"

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

/**
 * ResponsiveDialog — hoy es el mismo `Dialog` del producto.
 *
 * Antes cambiaba a un Sheet de abajo en el celular. Desde el 02-10-2026 el
 * `DialogContent` de Cadence ya ES una hoja que sube desde abajo bajo 640px
 * (y una tarjeta centrada en escritorio), así que ya no hace falta cambiar de
 * componente — y los dos lados se ven idénticos por construcción. Se conserva
 * la API (Trigger/Content/Header/Title/Description/Footer/Close) para no tocar
 * a quien lo usa.
 */

const ResponsiveDialog = Dialog
const ResponsiveDialogTrigger = DialogTrigger
const ResponsiveDialogClose = DialogClose
const ResponsiveDialogContent = DialogContent

/**
 * ⚠️ `bandaDeModal` no es decorativo.
 *
 * `DialogContent` reparte a sus hijos —cabecera arriba y fija, cuerpo con
 * scroll, pie abajo y fijo— leyendo esa marca. Un envoltorio sin la marca deja
 * la cabecera adentro del cuerpo con scroll (así vivió «Agendar una cita»).
 */
const ResponsiveDialogHeader = (props: DialogHeaderProps) => <DialogHeader {...props} />
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader"
ResponsiveDialogHeader.bandaDeModal = "cabecera" as const

const ResponsiveDialogFooter = (props: React.HTMLAttributes<HTMLDivElement>) => <DialogFooter {...props} />
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter"
ResponsiveDialogFooter.bandaDeModal = "pie" as const

const ResponsiveDialogTitle = DialogTitle
const ResponsiveDialogDescription = DialogDescription

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
