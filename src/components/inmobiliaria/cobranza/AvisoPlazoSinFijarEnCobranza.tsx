'use client'

/**
 * Aviso de Cobranza cuando la inmobiliaria no ha fijado sus días de plazo
 * (QA-IA-B, 04-10-2026; regla de Nico, CR-31).
 *
 * Sin días de plazo fijados no corre interés y la cuota vencida NO entra a la
 * cartera en mora ni a la cobranza. En el laboratorio, con el plazo sin fijar,
 * Cobranza quedaba vacía (o con casos viejos) y nada decía por qué: quien
 * busca a sus deudores no encontraba a nadie y no sabía qué hacer. Mismo
 * camino para fijarlo que la ficha del contrato.
 */
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { usePlazoSinFijar } from '@/lib/hooks/use-plazo-sin-fijar'
import { FIJAR_EL_PLAZO_HREF } from '@/lib/api/cobranza-secuencia.types'

export function AvisoPlazoSinFijarEnCobranza() {
  const sinFijar = usePlazoSinFijar()
  if (!sinFijar) return null
  return (
    <AlertaAccionable
      severidad="warning"
      titulo="Tu inmobiliaria no ha fijado sus días de plazo: las cuotas vencidas no entran a la cobranza hasta fijarlos."
      accion={{ label: 'Fijar los días de plazo', href: FIJAR_EL_PLAZO_HREF }}
      data-testid="cobranza-plazo-sin-fijar"
    >
      Son los días después del vencimiento en los que todavía no corre la mora (el sugerido es 5). Mientras no
      los fijes, no se cobra interés y el agente no gestiona esas cuotas.
    </AlertaAccionable>
  )
}
