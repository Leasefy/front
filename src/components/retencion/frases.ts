/**
 * Las frases de Vinci (EL MOLDE: el resumen es una FRASE, no fichas sueltas).
 * Puras, para que la pantalla y las pruebas digan lo mismo.
 */
import { formatCurrency } from '@/lib/format'
import { fechaYHora } from '@/components/retencion/vinci'
import type { MetricasDeVinci, RiesgoDeVinci } from '@/lib/types/retencion'

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** EL MOLDE: el resumen es una FRASE, no fichas sueltas. */
export function fraseDelRiesgo(r: RiesgoDeVinci): string {
  const quienes = `${plural(r.enRiesgo.inquilinos, 'inquilino', 'inquilinos')} y ${plural(r.enRiesgo.propietarios, 'propietario', 'propietarios')}`
  const cuando = r.deLoGuardado ? `medido ${fechaYHora(r.leidoEn)} (el barrido de la mañana)` : `medido ahora (${fechaYHora(r.leidoEn)})`
  return `Vinci ve ${quienes} en riesgo (umbral ${r.umbral}/100) entre ${plural(r.contratosLeidos, 'contrato vigente', 'contratos vigentes')}; ${cuando}.`
}

export function fraseDeLasMetricas(m: MetricasDeVinci): string {
  const retenidos = m.contratosRetenidos + m.propietariosQueSeQuedaron
  if (retenidos === 0 && m.perdidos.inquilinos + m.perdidos.propietarios === 0) {
    const enGestion = m.enGestion.inquilinos + m.enGestion.propietarios
    return enGestion > 0
      ? `Todavía no se cerró ningún caso: hay ${plural(enGestion, 'plan', 'planes')} de retención en gestión.`
      : 'Todavía no hay planes de retención: cuando Vinci abra uno, acá ves si se quedó o se fue.'
  }
  const partes = [
    `Vinci retuvo ${plural(m.contratosRetenidos, 'contrato', 'contratos')} (renovaron)`,
    `${plural(m.propietariosQueSeQuedaron, 'propietario se quedó', 'propietarios se quedaron')} con ${plural(m.inmueblesRetenidos, 'inmueble', 'inmuebles')}`,
  ]
  const perdidos = m.perdidos.inquilinos + m.perdidos.propietarios
  return (
    `${partes.join(' y ')}: ${formatCurrency(m.canonConservadoCop)} de canon al mes conservado.` +
    (perdidos > 0 ? ` ${perdidos === 1 ? 'Se fue 1' : `Se fueron ${perdidos}`} (${formatCurrency(m.perdidos.canonPerdidoCop)} al mes).` : '') +
    (m.tasaDeRetencion !== null ? ` De los casos cerrados, se retuvo el ${Math.round(m.tasaDeRetencion * 100)} %.` : '')
  )
}

