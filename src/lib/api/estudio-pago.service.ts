/**
 * Paso 3 del recorrido: el inquilino paga su estudio.
 *
 * ⚠️ Estado real al 2026-08-09: **el backend todavía no expone esto.** Se
 * verificó contra el back y contra el contrato generado del agente
 * (`src/lib/api/generated/agent.ts`): no hay ninguna ruta de cobro del estudio
 * para el inquilino. Lo único que existe es la compra de créditos de la
 * inmobiliaria (`/agent-credits/purchase`) y el pago del canon
 * (`/leases/:id/pse/checkout`).
 *
 * Por qué existe igual este archivo: la pantalla de pago **sí** es trabajo de
 * front, y dejarla sin escribir sólo mueve el problema. Lo que no se hace es
 * fingir el cobro. `consultarEstadoDePago` distingue tres cosas:
 *
 *   - hay que pagar y **se puede** → se muestra el formulario
 *   - ya está pagado           → se sigue de largo
 *   - el cobro **no existe todavía** (404 del endpoint) → se dice tal cual,
 *     con una salida, en vez de un formulario que no va a cobrar nada
 *
 * El día que el endpoint esté, la pantalla funciona sin tocar una línea.
 *
 * Endpoints que hacen falta:
 *   GET  /tenant/estudio/pago          → EstadoDePagoDelEstudio
 *   POST /tenant/estudio/pago/checkout → InicioDePago
 */

import { apiClient, ApiError } from '@/lib/api/client'
import type { DatosDePagoPSE } from '@/lib/pago/pse'

export interface EstadoDePagoDelEstudio {
  /** ¿Ya está pagado? */
  pagado: boolean
  /** Precio en COP. */
  precioCop: number
  /** Qué incluye, para que el precio se entienda. */
  incluye: string[]
  /** Cuándo se pagó, si ya se pagó. */
  pagadoEl?: string
}

export interface InicioDePago {
  /** A dónde mandar a la persona para que pague. */
  urlDePago: string
  referencia: string
}

/** El cobro todavía no existe del lado del backend. */
export class CobroNoDisponible extends Error {
  constructor() {
    super('El cobro del estudio todavía no está disponible')
    this.name = 'CobroNoDisponible'
  }
}

function esRutaInexistente(e: unknown): boolean {
  // 404 sobre la ruta misma = el backend no la implementó todavía. Es distinto
  // de un 404 sobre un recurso, que sí sería «eso no existe».
  return e instanceof ApiError && (e.status === 404 || e.status === 501)
}

export const estudioPagoApi = {
  /**
   * Lanza `CobroNoDisponible` si el backend todavía no tiene la ruta, para
   * que la pantalla pueda decirlo en vez de mostrar un formulario muerto.
   */
  async consultarEstado(): Promise<EstadoDePagoDelEstudio> {
    try {
      return await apiClient.get<EstadoDePagoDelEstudio>('/tenant/estudio/pago')
    } catch (e) {
      if (esRutaInexistente(e)) throw new CobroNoDisponible()
      throw e
    }
  },

  async iniciarPago(datos: DatosDePagoPSE): Promise<InicioDePago> {
    try {
      // Las claves van como las nombra PSE, no como las nombramos acá.
      return await apiClient.post<InicioDePago>('/tenant/estudio/pago/checkout', {
        psePaymentData: {
          personType: datos.tipoDePersona === 'juridica' ? 'JURIDICA' : 'NATURAL',
          documentType: datos.tipoDeDocumento,
          documentNumber: datos.numeroDeDocumento.trim(),
          holderName: datos.titular.trim(),
          email: datos.correo.trim(),
          bankCode: datos.banco,
        },
      })
    } catch (e) {
      if (esRutaInexistente(e)) throw new CobroNoDisponible()
      throw e
    }
  },
}
