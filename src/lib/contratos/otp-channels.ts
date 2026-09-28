/**
 * T-0109 contract.md §3.0.1 / §3.2 — cómo describir en español el detalle
 * por canal (`SendOtpResponse.channels`, `*Signature.otpChannels`) sin
 * asumir nunca WhatsApp cuando el back no lo manda, y sin reventar ante un
 * `reason` que este front todavía no conoce (§3.2, última fila: "Front
 * mapea valores de enum desconocidos a 'Desconocido' — nunca un switch
 * exhaustivo que lance").
 *
 * Vive fuera de `OTPVerification.tsx` a propósito: es lógica pura, así que
 * se prueba sin montar el modal.
 */
import type { OtpChannel, OtpChannelResult, OtpDeliveryReason } from '@/lib/api/contracts.types';

const NOMBRE_DEL_CANAL: Record<OtpChannel, string> = {
  EMAIL: 'correo',
  WHATSAPP: 'WhatsApp',
};

const RAZON_LEGIBLE: Partial<Record<OtpDeliveryReason, string>> = {
  CHANNEL_DISABLED: 'canal deshabilitado',
  PROVIDER_NOT_CONFIGURED: 'no disponible por ahora',
  NO_PHONE: 'no tiene celular registrado',
  PHONE_AMBIGUOUS: 'el celular registrado es ambiguo',
  PHONE_INVALID: 'el celular registrado no es válido',
  PHONE_NOT_COLOMBIAN_MOBILE: 'el celular registrado no es colombiano',
  PROVIDER_ERROR: 'falló el proveedor',
  NO_EMAIL: 'no tiene correo registrado',
  SEND_ERROR: 'no se pudo enviar',
};

export interface LineaDeCanal {
  channel: OtpChannel;
  /** «correo» · «WhatsApp» — nunca el enum crudo. */
  etiqueta: string;
  /** `true` sólo cuando el código de verdad salió por este canal. */
  enviado: boolean;
  /** Frase completa lista para mostrar. */
  detalle: string;
}

/**
 * `channels` → una línea por canal, en el MISMO orden que manda el back
 * (correo primero, WhatsApp después — contract.md §3.0.1). Ausente/vacío →
 * `[]`, y quien llama se cae al texto genérico con `sentTo`.
 */
export function describirCanales(channels: OtpChannelResult[] | undefined): LineaDeCanal[] {
  if (!channels?.length) return [];
  return channels.map((c) => {
    const etiqueta = NOMBRE_DEL_CANAL[c.channel] ?? c.channel;

    if (c.status === 'SENT') {
      return {
        channel: c.channel,
        etiqueta,
        enviado: true,
        detalle: c.destination ? `Enviado por ${etiqueta} a ${c.destination}.` : `Enviado por ${etiqueta}.`,
      };
    }

    // SUPPRESSED (kill switch T-0090): el back respondió 200 igual, pero
    // este canal en particular NO entregó nada. No es un fallo del canal
    // en sí — se dice distinto de FAILED/SKIPPED.
    if (c.status === 'SUPPRESSED') {
      return {
        channel: c.channel,
        etiqueta,
        enviado: false,
        detalle: `${etiqueta.charAt(0).toUpperCase()}${etiqueta.slice(1)} suspendido temporalmente.`,
      };
    }

    const razon = c.reason ? (RAZON_LEGIBLE[c.reason] ?? 'no se pudo enviar') : 'no se pudo enviar';
    return {
      channel: c.channel,
      etiqueta,
      enviado: false,
      detalle: `${etiqueta.charAt(0).toUpperCase()}${etiqueta.slice(1)}: ${razon}.`,
    };
  });
}
