'use client'

/**
 * P-7 — el riesgo de Vinci DENTRO de la propuesta de renovación.
 *
 * P-7 (definición del CEO): «la renovación se propone 3 meses antes del fin,
 * con aviso a la inmobiliaria del riesgo de que se vaya». Nico, 26-09-2026:
 * «a 3 meses del fin, el riesgo de Vinci va en la propuesta de renovación».
 *
 * Lo trae el back en cada renovación abierta de la ventana de 90 días
 * (`riesgoDeRetencion`): el puntaje del inquilino y el de su propietario, qué
 * señal sumó cuánto y la oferta que sugiere Vinci. `null` = no se pudo medir
 * (Vinci apagado o sin respuesta): se dice, no se inventa.
 */
import Link from 'next/link'
import { DesgloseDelPuntaje, PuntajeDeVinci, fechaYHora } from '@/components/retencion/vinci'
import type { CasoEnLaRenovacion, RiesgoDeRetencion } from '@/lib/types/retencion'

function Caso({ titulo, caso }: { titulo: string; caso: CasoEnLaRenovacion | null }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-fg">{titulo}</p>
        {caso ? <PuntajeDeVinci puntaje={caso.puntaje} enRiesgo={caso.enRiesgo} /> : null}
      </div>
      {caso ? (
        <>
          <DesgloseDelPuntaje senales={caso.senales} puntaje={caso.puntaje} />
          {caso.ofertaSugerida ? (
            <p className="text-sm text-fg">
              Vinci sugiere: <span className="font-medium">{caso.ofertaSugerida.nombre.toLowerCase()}</span>
              {caso.ofertaSugerida.quienAprueba ? <span className="text-fg-muted"> ({caso.ofertaSugerida.quienAprueba})</span> : null}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-fg-muted">Sin señales de que se vaya.</p>
      )}
    </div>
  )
}

export function RiesgoEnLaRenovacion({
  riesgo,
  contractId,
}: {
  /** `undefined` = back anterior (no lo trae); `null` = no se pudo medir. */
  riesgo: RiesgoDeRetencion | null | undefined
  contractId?: string | null
}) {
  if (riesgo === undefined) return null
  return (
    <section
      aria-label="Riesgo de que se vaya (Vinci)"
      className="space-y-4 rounded-lg border border-border bg-surface-muted/40 px-4 py-4"
      data-testid="renovacion-riesgo-vinci"
    >
      <div>
        <p className="text-sm font-semibold text-fg">Riesgo de que se vaya · Vinci</p>
        <p className="text-caption text-fg-muted">
          {riesgo
            ? `Con las señales del ERP (mora de las cuotas, PQRS, mantenimientos, fin, incremento, giros). En riesgo desde ${riesgo.umbral}/100${riesgo.medidoEn ? `; medido ${fechaYHora(riesgo.medidoEn)}` : ''}.`
            : 'No se pudo medir ahora (Vinci apagado o sin respuesta). La renovación sigue igual.'}
        </p>
      </div>
      {riesgo ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Caso titulo="El inquilino (¿renueva?)" caso={riesgo.inquilino} />
          <Caso titulo="El propietario (¿saca el inmueble?)" caso={riesgo.propietario} />
        </div>
      ) : null}
      {riesgo && contractId && riesgo.inquilino ? (
        <Link
          href={`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(`inquilino:${contractId}`)}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver el caso en Retención
        </Link>
      ) : null}
    </section>
  )
}
