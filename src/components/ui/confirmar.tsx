"use client"

import type * as React from "react"
import { confirmAction, showMessage, configureDialogHost } from "@leasefy/cadence"

/**
 * Preguntar y avisar desde un manejador, con el modal del sistema.
 *
 * Reemplaza a `window.confirm` / `window.alert` (que el guardián
 * `sin-dialogos-del-navegador.test.ts` prohíbe: ignoran el tema, no se pueden
 * probar y hay navegadores que los suprimen, con lo que la acción destructiva
 * pasa sin que nadie haya dicho que sí).
 *
 * ```ts
 * const ok = await confirmar({
 *   destructivo: true,
 *   titulo: "¿Eliminar a Laura Gómez del equipo?",
 *   descripcion: "Pierde el acceso al panel ya mismo. Sus gestiones y notas se conservan.",
 *   accion: "Eliminar del equipo",
 * })
 * if (!ok) return
 *
 * // Con el trabajo adentro: el botón carga hasta que termina y, si falla,
 * // el modal sigue abierto para reintentar.
 * await confirmar({ titulo: "¿Enviar el reporte a Carlos Mejía?", accion: "Enviar",
 *   alConfirmar: () => api.enviar(id) })
 *
 * await avisar({ tipo: "exito", titulo: "Pago registrado", descripcion: "…" })
 * ```
 *
 * No hace falta montar nada: el primer pedido monta un único anfitrión en
 * `document.body` (con el z del panel, por encima de los headers fijos).
 */

let anfitrionListo = false
function prepararAnfitrion() {
  if (anfitrionListo) return
  configureDialogHost({ overlayClassName: "z-[300]", className: "z-[300]" })
  anfitrionListo = true
}

export interface OpcionesDeConfirmar {
  /** La pregunta. En una destructiva, nombra QUÉ se borra. */
  titulo: React.ReactNode
  /** Qué pasa si dice que sí. En una destructiva, EXACTAMENTE qué se pierde. */
  descripcion?: React.ReactNode
  /** Contenido extra bajo la descripción (una lista, un campo). */
  detalle?: React.ReactNode
  /** Rojo sobrio, papelera. Atajo de `tipo: "destructivo"`. */
  destructivo?: boolean
  tipo?: "confirmacion" | "destructivo" | "advertencia"
  /** Texto del botón principal. Default «Confirmar». */
  accion?: React.ReactNode
  /** Texto de Cancelar. Default «Cancelar». */
  cancelar?: string
  /** Ícono propio del medallón (Phosphor, `weight="bold"`); `false` lo apaga. */
  icono?: React.ReactNode | false
  /** El trabajo: el botón carga hasta que termina; si falla, el modal sigue abierto. */
  alConfirmar?: () => unknown | Promise<unknown>
}

const VARIANTE_DE_CONFIRMAR = {
  confirmacion: "confirm",
  destructivo: "destructive",
  advertencia: "warning",
} as const

/** Pide una confirmación. `true` si la persona dijo que sí (y el trabajo, si lo hay, terminó bien). */
export function confirmar(opciones: OpcionesDeConfirmar): Promise<boolean> {
  prepararAnfitrion()
  const tipo = opciones.tipo ?? (opciones.destructivo ? "destructivo" : "confirmacion")
  return confirmAction({
    variant: VARIANTE_DE_CONFIRMAR[tipo],
    title: opciones.titulo,
    description: opciones.descripcion,
    body: opciones.detalle,
    actionLabel: opciones.accion ?? "Confirmar",
    cancelLabel: opciones.cancelar ?? "Cancelar",
    icon: opciones.icono,
    onConfirm: opciones.alConfirmar
      ? () => Promise.resolve(opciones.alConfirmar?.())
      : undefined,
  })
}

export interface OpcionesDeAvisar {
  tipo: "info" | "exito" | "advertencia" | "error"
  /** Qué pasó, en una frase. */
  titulo: React.ReactNode
  /** El porqué y qué hacer ahora. */
  descripcion?: React.ReactNode
  /** Detalle en el cuerpo (una lista, un resumen). */
  detalle?: React.ReactNode
  /** Código o referencia del error, para soporte (se puede copiar). */
  referencia?: string
  /** Texto del botón de salida. Default «Entendido». */
  entendido?: React.ReactNode
  /** Acción principal opcional (p. ej. «Reintentar»). */
  accion?: React.ReactNode
  alAccionar?: () => unknown | Promise<unknown>
}

const VARIANTE_DE_AVISAR = {
  info: "info",
  exito: "success",
  advertencia: "warning",
  error: "error",
} as const

/** Muestra un modal de estado. Resuelve cuando se cierra. */
export function avisar(opciones: OpcionesDeAvisar): Promise<void> {
  prepararAnfitrion()
  return showMessage({
    variant: VARIANTE_DE_AVISAR[opciones.tipo],
    title: opciones.titulo,
    description: opciones.descripcion,
    children: opciones.detalle,
    code: opciones.referencia,
    dismissLabel: opciones.entendido ?? "Entendido",
    actionLabel: opciones.accion,
    onAction: opciones.alAccionar
      ? () => Promise.resolve(opciones.alAccionar?.())
      : undefined,
  })
}
