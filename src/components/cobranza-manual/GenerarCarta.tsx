'use client'

/**
 * «Generar carta» a mano desde el deudor (COBRANZA-MANUAL, 04-10-2026).
 *
 * Encargo: hoy «Sin cartas: la IA aún no ha generado» y sin botón. La carta
 * prejurídica sale con los datos REALES (sin ciudad, firma ni notificación
 * inventadas; si falta un dato, se pide). Sin enviar: se descarga en PDF.
 *
 * Flujo: al abrir se le pregunta al micro qué sabe y qué falta; lo que falta
 * se pide (con lo que Leasefy sabe del contrato ya escrito, para corregir).
 * «Descargar la carta» la genera y la baja. No queda una carta «por aprobar»
 * (aprobarla es enviarla): queda una nota en el historial del deudor.
 */
import * as React from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CrossFade } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { descargarBlob } from '@/lib/reportes/exportables'
import { cobranzaManualApi, generarCartaAMano, revisarCartaAMano } from '@/lib/api/cobranza-manual.service'
import type { CampoDeLaCarta, DatosDeLaCarta } from '@/lib/api/cobranza-manual.types'

const ETIQUETAS: Readonly<Record<CampoDeLaCarta, string>> = {
  ciudad: 'Ciudad desde la que se escribe la carta',
  numContrato: 'Número del contrato de arrendamiento',
  direccionInmueble: 'Dirección del inmueble',
  nombreInmobiliaria: 'Razón social de la inmobiliaria',
}

type Etapa = 'leyendo' | 'datos' | 'error'

export function GenerarCarta({
  abierto,
  onCerrar,
  debtorId,
  debtorName,
  onGenerada,
}: {
  abierto: boolean
  onCerrar: () => void
  debtorId: string
  debtorName: string
  onGenerada?: () => void
}) {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? ''
  const [etapa, setEtapa] = useState<Etapa>('leyendo')
  const [faltan, setFaltan] = useState<CampoDeLaCarta[]>([])
  const [conocidos, setConocidos] = useState<Partial<Record<CampoDeLaCarta, string>>>({})
  const [datos, setDatos] = useState<DatosDeLaCarta>({})
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)

  // Al abrir: qué sabe el sistema y qué falta. Lo que Leasefy sabe del contrato
  // de la persona (su número y dirección) se propone, para revisar.
  useEffect(() => {
    if (!abierto) return
    let vivo = true
    setEtapa('leyendo')
    setError(null)
    setDatos({})
    async function leer() {
      if (!agencyId || !agentUrl) {
        setError('El servicio de agentes no está conectado a este panel. Avísale al equipo de Leasefy.')
        setEtapa('error')
        return
      }
      try {
        const [carta, persona] = await Promise.all([
          revisarCartaAMano({ agentUrl, agencyId, debtorId }),
          cobranzaManualApi.historial({ deudorId: debtorId }).catch(() => null),
        ])
        if (!vivo) return
        const contrato =
          persona?.persona.contratos.find((c) => c.vigente) ?? persona?.persona.contratos[0] ?? null
        setFaltan(carta.faltan.map((f) => f.campo))
        setConocidos(carta.conocidos)
        setDatos({
          ...(contrato?.numero ? { numContrato: contrato.numero } : {}),
          ...(contrato?.direccion && !carta.conocidos.direccionInmueble
            ? { direccionInmueble: contrato.direccion }
            : {}),
        })
        setEtapa('datos')
      } catch (err) {
        if (!vivo) return
        setError(mensajeParaLaPersona(err, { porDefecto: 'No pudimos preparar la carta.' }))
        setEtapa('error')
      }
    }
    void leer()
    return () => {
      vivo = false
    }
  }, [abierto, agencyId, agentUrl, debtorId])

  const vacios = faltan.filter((c) => !(datos[c] ?? '').trim())

  async function descargar() {
    if (!agencyId || vacios.length > 0) return
    setGenerando(true)
    setError(null)
    try {
      const r = await generarCartaAMano({ agentUrl, agencyId, debtorId, datos })
      if (r.tipo === 'faltan-datos') {
        setFaltan(r.faltan.map((f) => f.campo))
        setConocidos(r.conocidos)
        setError('Todavía falta algún dato para la carta.')
        return
      }
      descargarBlob(r.archivo, r.nombre)
      toast.success('Carta descargada. No se le envió a nadie.')
      onGenerada?.()
      onCerrar()
    } catch (err) {
      setError(mensajeParaLaPersona(err, { porDefecto: 'No pudimos generar la carta.', accion: 'generar la carta' }))
    } finally {
      setGenerando(false)
    }
  }

  const poner = (campo: keyof DatosDeLaCarta) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((d) => ({ ...d, [campo]: e.target.value }))

  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o && !generando) onCerrar() }}>
      <DialogContent size="md" data-testid="generar-carta">
        <DialogHeader>
          <DialogTitle>Generar carta prejurídica</DialogTitle>
          <DialogDescription>
            {debtorName ? `${debtorName} · ` : ''}Con la deuda y los datos reales. Se descarga en PDF: no se le
            envía a nadie.
          </DialogDescription>
        </DialogHeader>

        <CrossFade swapKey={etapa}>
          {etapa === 'leyendo' ? (
            <div className="flex items-center gap-2 py-6 text-sm text-fg-muted">
              <Spinner size="sm" /> Revisando los datos de la carta…
            </div>
          ) : etapa === 'error' ? (
            <p className="py-4 text-sm text-danger" role="alert" data-testid="carta-error">
              {error}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.keys(conocidos).length > 0 ? (
                <dl className="grid grid-cols-1 gap-2 rounded-md border border-border bg-surface p-3 text-sm sm:grid-cols-2">
                  {(Object.keys(conocidos) as CampoDeLaCarta[]).map((c) => (
                    <div key={c}>
                      <dt className="text-caption text-fg-muted">{ETIQUETAS[c]}</dt>
                      <dd className="text-fg">{conocidos[c]}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {faltan.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-fg">
                    {faltan.length === 1 ? 'Falta un dato para la carta:' : 'Faltan estos datos para la carta:'}
                  </p>
                  {faltan.map((c) => (
                    <div key={c} className="space-y-1.5">
                      <label htmlFor={`carta-${c}`} className="text-sm font-medium text-fg">
                        {ETIQUETAS[c]}
                      </label>
                      <Input
                        id={`carta-${c}`}
                        value={datos[c] ?? ''}
                        maxLength={c === 'numContrato' ? 60 : 200}
                        onChange={poner(c)}
                        data-testid={`carta-${c}`}
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="carta-firmante" className="text-sm font-medium text-fg">
                    Quién firma (opcional)
                  </label>
                  <Input id="carta-firmante" value={datos.firmante ?? ''} maxLength={120} onChange={poner('firmante')} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="carta-cargo" className="text-sm font-medium text-fg">
                    Su cargo (opcional)
                  </label>
                  <Input id="carta-cargo" value={datos.cargoDelFirmante ?? ''} maxLength={120} onChange={poner('cargoDelFirmante')} />
                </div>
              </div>
              <p className="text-caption text-fg-muted">
                La fecha de la notificación previa sale de la que de verdad se envió; si no se envió ninguna, la carta
                cita lo que exige la Ley 1266 sin afirmar un envío.
              </p>
              {error ? (
                <p className="text-sm text-danger" role="alert" data-testid="carta-error">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </CrossFade>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={generando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            isLoading={generando}
            disabled={etapa !== 'datos' || vacios.length > 0}
            title={vacios.length > 0 ? 'Completa los datos que faltan' : undefined}
            onClick={() => void descargar()}
            data-testid="carta-descargar"
          >
            Descargar la carta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

void React
