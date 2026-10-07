/**
 * Lo que está mal en la resolución, AL LADO DEL CAMPO.
 *
 * 🔴 F5 (auditoría del 13-09): el formulario mandaba cualquier cosa y el back
 * contestaba con un `toast` rojo. El toast se va solo a los cinco segundos, no
 * señala qué campo está mal y desaparece justo cuando la persona baja la vista
 * al formulario para arreglarlo. Con cuatro reglas que se pueden comprobar sin
 * salir del navegador, mandar el viaje para recibir un aviso que se borra es
 * la peor de las dos opciones.
 *
 * Las reglas son LAS MISMAS de `erroresDeLaResolucion` en
 * `back-erp/src/inmobiliaria/facturacion/resolucion-de-facturacion.ts`, y el
 * back las sigue aplicando: esto no lo reemplaza, lo adelanta. El back es
 * quien manda —hay clientes que no son esta pantalla— y su mensaje se sigue
 * mostrando si algo se escapa (02-10-2026: el back ahora lo manda con su campo,
 * y el cajón lo pone debajo de él).
 *
 * 02-10-2026 · Los topes del DTO, con las MISMAS frases
 * (`limites-de-la-facturacion.ts`, espejo del back): el rango y el último
 * número usado hasta 1.000.000.000 (`int4`), las tres fechas entre el año
 * 2000 y el 2100 (`@db.Date`) y el último número usado dentro del rango.
 */

import {
  fechaDeFacturacionEnRango,
  MENSAJES_DE_LA_FACTURACION,
  NUMERO_MAXIMO_DE_LA_RESOLUCION,
} from './limites-de-la-facturacion'

export type CampoDeLaResolucion =
  | 'fechaResolucion'
  | 'desde'
  | 'hasta'
  | 'vigenteDesde'
  | 'vigenteHasta'
  | 'ultimoNumeroUsado'

export interface FormularioDeLaResolucion {
  desde: string
  hasta: string
  vigenteDesde: string
  vigenteHasta: string
  /** Opcional para quien sólo valida el rango y la vigencia. */
  fechaResolucion?: string
  /** Vacío = el rango arranca sin consumir. */
  ultimoNumeroUsado?: string
}

export type ErroresDeLaResolucion = Partial<
  Record<CampoDeLaResolucion, string>
>

/** Un entero de dígitos (sin signo, sin «1e3», sin coma). `null` si no lo es. */
function entero(texto: string): number | null {
  if (!/^\d+$/.test(texto.trim())) return null
  const n = Number(texto.trim())
  return Number.isSafeInteger(n) ? n : null
}

/**
 * Un entero mayor que cero. `Number('')` es 0 y `Number('1e3')` es 1000: las
 * dos cosas pasarían un `> 0` a secas, así que se mira el texto.
 */
function enteroPositivo(texto: string): number | null {
  const n = entero(texto)
  return n !== null && n >= 1 ? n : null
}

/**
 * Qué está mal, por campo. Un objeto vacío = se puede mandar.
 *
 * Un campo TODAVÍA VACÍO no es un error: no se le grita a alguien por no haber
 * terminado de escribir. Lo vacío lo frena el botón, que sigue pidiendo los
 * seis campos.
 */
export function erroresDeLaResolucion(
  form: FormularioDeLaResolucion,
): ErroresDeLaResolucion {
  const errores: ErroresDeLaResolucion = {}

  const desde = form.desde.trim() === '' ? null : enteroPositivo(form.desde)
  const hasta = form.hasta.trim() === '' ? null : enteroPositivo(form.hasta)

  if (form.desde.trim() !== '' && desde === null) {
    errores.desde = 'El número inicial del rango es un entero mayor que cero.'
  } else if (desde !== null && desde > NUMERO_MAXIMO_DE_LA_RESOLUCION) {
    errores.desde = MENSAJES_DE_LA_FACTURACION.desdeMaximo
  }
  if (form.hasta.trim() !== '' && hasta === null) {
    errores.hasta = 'El número final del rango es un entero mayor que cero.'
  } else if (hasta !== null && hasta > NUMERO_MAXIMO_DE_LA_RESOLUCION) {
    errores.hasta = MENSAJES_DE_LA_FACTURACION.hastaMaximo
  }
  if (
    desde !== null &&
    hasta !== null &&
    hasta < desde &&
    errores.hasta === undefined
  ) {
    errores.hasta = `El rango termina antes de empezar: «hasta» no puede ser menor que ${desde.toLocaleString('es-CO')}.`
  }

  const ultimoTexto = (form.ultimoNumeroUsado ?? '').trim()
  if (ultimoTexto !== '') {
    const ultimo = entero(ultimoTexto)
    if (ultimo === null) {
      errores.ultimoNumeroUsado = 'El último número usado es un entero, sin puntos ni comas.'
    } else if (ultimo > NUMERO_MAXIMO_DE_LA_RESOLUCION) {
      errores.ultimoNumeroUsado = MENSAJES_DE_LA_FACTURACION.ultimoNumeroUsadoMaximo
    } else if (
      desde !== null &&
      hasta !== null &&
      hasta >= desde &&
      (ultimo < desde - 1 || ultimo > hasta)
    ) {
      // La MISMA frase del back (`problemasDeLaResolucion`).
      errores.ultimoNumeroUsado = `El último número usado (${ultimo}) tiene que estar entre ${desde - 1} y ${hasta}.`
    }
  }

  if (form.fechaResolucion !== undefined && !fechaDeFacturacionEnRango(form.fechaResolucion)) {
    errores.fechaResolucion = MENSAJES_DE_LA_FACTURACION.fechaDeLaResolucionFueraDeRango
  }
  if (!fechaDeFacturacionEnRango(form.vigenteDesde)) {
    errores.vigenteDesde = MENSAJES_DE_LA_FACTURACION.vigenteDesdeFueraDeRango
  }
  if (!fechaDeFacturacionEnRango(form.vigenteHasta)) {
    errores.vigenteHasta = MENSAJES_DE_LA_FACTURACION.vigenteHastaFueraDeRango
  } else if (
    form.vigenteDesde !== '' &&
    form.vigenteHasta !== '' &&
    // Comparación de texto `YYYY-MM-DD`: ordena igual que la fecha y no
    // construye un `Date`, que en Bogotá (UTC−5) se corre un día.
    form.vigenteHasta < form.vigenteDesde
  ) {
    errores.vigenteHasta = 'La vigencia termina antes de empezar.'
  }

  return errores
}

export function hayErrores(errores: ErroresDeLaResolucion): boolean {
  return Object.keys(errores).length > 0
}
