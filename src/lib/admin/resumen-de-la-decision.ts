/**
 * Lo que propone una decisión de la cola de Aprobaciones, en una línea y con su
 * plata aparte (ronda 26, revisora r25: «Ábrela para ver lo que propone» en las
 * 63 filas obligaba a abrir cada una para saber qué se decidía).
 *
 * Sólo se lee lo que YA trae `decision_payload` (lo escribe el micro:
 * `cartera/retener-para-aprobacion.ts`). Si un dato no viene, no se inventa: la
 * frase se acorta y la plata queda en `null` («—» en la tabla).
 */
import { fmtFecha } from './format'

export interface ResumenDeLaDecision {
  /** Qué propone, en palabras. */
  texto: string
  /** La plata en juego, si el payload la trae. */
  montoCop: number | null
  /** El nombre de la persona, si el payload lo trae (el cobro retenido no tiene deudor del micro). */
  persona: string | null
}

type Payload = Record<string, unknown> | null | undefined

const objeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

const numero = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  return null
}

/** «5 oct 2026» de «2026-10-05» o de un instante; `null` si no se lee. */
function dia(v: unknown): string | null {
  const t = texto(v)
  if (!t) return null
  const f = fmtFecha(t)
  return f === '—' ? null : f
}

const CANALES: Record<string, string> = {
  voice: 'Llamada',
  call: 'Llamada',
  whatsapp: 'WhatsApp',
  email: 'Correo',
  sms: 'Mensaje de texto',
}

/** El cobro con enlace de pago que el Piloto retuvo (Manual / Copiloto). */
function cobroRetenido(p: Record<string, unknown>): ResumenDeLaDecision {
  const cobro = objeto(p.cobro)
  const cuota = objeto(p.agentContext)
  const deudor = objeto(p.debtor)
  const vence = dia(cuota?.fechaDeVencimiento)
  const yaVencio = cuota?.hito === 'despues'
  const partes = [
    cuota?.hito === 'a_pedido'
      ? 'Enlace de pago pedido a mano'
      : vence
        ? `Enlace de pago de la cuota que ${yaVencio ? 'venció' : 'vence'} el ${vence}`
        : 'Enlace de pago de la cuota',
    texto(cuota?.inmueble),
  ].filter(Boolean)
  return {
    texto: partes.join(' · '),
    montoCop: numero(cobro?.amountCop),
    persona: texto(deudor?.name),
  }
}

export function resumenDeLaDecision(tipo: string, payload: Payload): ResumenDeLaDecision {
  const p = objeto(payload) ?? {}
  switch (tipo) {
    case 'pagos_cobro_retenido':
      return cobroRetenido(p)
    case 'pre_judicial_letter':
      return { texto: 'Carta prejurídica lista para enviar', montoCop: numero(p.debt_amount_cop), persona: null }
    case 'siniestro_filing':
      return {
        texto: texto(p.insurer) ? `Reclamo a ${texto(p.insurer)}` : 'Reclamo a la aseguradora',
        montoCop: numero(p.debt_amount_cop),
        persona: null,
      }
    case 'legal_escalation':
      return {
        texto: [texto(p.target) ? `Pasarlo a ${texto(p.target)}` : 'Pasarlo a jurídico', texto(p.reason)]
          .filter(Boolean)
          .join(' · '),
        montoCop: null,
        persona: null,
      }
    case 'precall_contact': {
      const canal = CANALES[String(p.channel ?? '').toLowerCase()] ?? 'Contacto'
      const cuando = dia(p.scheduledAt)
      return { texto: cuando ? `${canal} para el ${cuando}` : `${canal} retenido`, montoCop: null, persona: null }
    }
    case 'acuerdo_incumplido_por_decidir': {
      const cuotas = numero(p.cuotasVencidas)
      const dias = numero(p.diasDeAtraso)
      const partes = [
        cuotas != null ? `${cuotas} ${cuotas === 1 ? 'cuota vencida' : 'cuotas vencidas'}` : 'Cuotas vencidas',
        dias != null ? `${dias} ${dias === 1 ? 'día' : 'días'} de atraso` : null,
      ].filter(Boolean)
      return { texto: partes.join(' · '), montoCop: numero(p.montoVencidoCop), persona: null }
    }
    default:
      // Nunca el JSON crudo en pantalla: el detalle completo está en la decisión.
      return { texto: 'Lo que propone está en el detalle', montoCop: null, persona: null }
  }
}
