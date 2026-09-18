'use client'

/**
 * FirmasClient — las invitaciones a firmar: lo que hay que recordar y lo que se
 * venció.
 *
 * ── A-13 (18-09-2026) ──────────────────────────────────────────────────────
 *
 * «La invitación a firmar vence a los 7 días con dos recordatorios; vuelve a
 * borrador y avisa al asesor, SIN liberar el inmueble hasta que alguien lo
 * cancele.»
 *
 * ── 🔴 La decisión que esta pantalla hace visible ──────────────────────────
 *
 * Que el inmueble **sigue reservado** después de que la invitación se venció, y
 * que liberarlo es una DECISIÓN de una persona. Por eso la fila de una vencida
 * no dice «vencida» y ya: dice qué pasó con el contrato, qué NO pasó con el
 * inmueble, y pone el botón de cancelar con la casilla de liberar **apagada**.
 *
 * Republicar solo un inmueble que está prácticamente cerrado es recibir
 * postulaciones nuevas por algo que ya no está disponible; el candidato
 * normalmente sigue interesado (no firmó porque estaba de viaje, porque le
 * faltaba un papel, porque el codeudor no contestó).
 */

import { useState } from 'react'
import { Signature } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Input,
} from '@/components/ui'
import { invitacionApi } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'

export function FirmasClient() {
  const { canAccess } = usePermissions()
  const puedeEditar = canAccess('contratos', 'edit')

  const barrido = useCrm(() => invitacionApi.barrido(), [], ['contratos'])
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [liberar, setLiberar] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

  const recordatorios = barrido.datos?.recordatorios ?? []
  const vencidas = barrido.datos?.vencidas ?? []
  const vacio = recordatorios.length === 0 && vencidas.length === 0

  async function cancelar(contractId: string) {
    setResultado(null)
    try {
      const r = await invitacionApi.cancelar(contractId, motivo, liberar)
      setResultado(
        r.inmuebleLiberado
          ? 'Invitación cancelada y el inmueble volvió a estar disponible.'
          : 'Invitación cancelada. El inmueble sigue reservado.',
      )
      setCancelando(null)
      setMotivo('')
      setLiberar(false)
      invalidar('contratos')
    } catch {
      setResultado('No se pudo cancelar. Vuelve a intentar.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invitaciones a firmar
        </h1>
        <p className="text-muted-foreground text-sm">
          La invitación vence a los 7 días con dos recordatorios. Al vencer el
          contrato vuelve a borrador; el inmueble sigue reservado hasta que
          alguien cancele.
        </p>
      </header>

      {resultado ? (
        <p className="text-sm" data-testid="resultado-cancelacion">
          {resultado}
        </p>
      ) : null}

      {barrido.noHabilitado ? (
        <Card>
          <CardContent className="py-6">
            <p
              className="text-muted-foreground text-sm"
              data-testid="firmas-no-habilitadas"
            >
              Próximamente: {barrido.noHabilitado}
            </p>
          </CardContent>
        </Card>
      ) : (
        <EstadoDeDatos
          cargando={barrido.cargando}
          error={barrido.errorCrudo}
          vacio={vacio}
          queEs="las invitaciones a firmar"
          onReintentar={barrido.refetch}
          conservarContenido
          esqueleto={<EsqueletoTabla filas={4} columnas={3} />}
          cuandoVacio={
            <EmptyState
              icon={Signature}
              title="Ninguna invitación pendiente"
              description="Cuando se mande un contrato a firmar, acá se ve qué recordatorio toca y qué se venció."
            />
          }
        >
          <div className="space-y-6">
            {vencidas.length > 0 ? (
              <Card data-testid="vencidas">
                <CardHeader>
                  <CardTitle className="text-base">
                    Se vencieron ({vencidas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {vencidas.map((v) => (
                      <li
                        key={v.contractId}
                        className="space-y-2 py-3"
                        data-testid={`vencida-${v.contractId}`}
                      >
                        <p className="text-sm">{v.aviso}</p>
                        <p className="text-muted-foreground text-xs">
                          {v.contratoVolvioABorrador
                            ? 'El contrato volvió a borrador.'
                            : 'El contrato ya no estaba esperando firma: no se tocó.'}{' '}
                          {/* 🔴 Lo que NO pasó, dicho en voz alta. */}
                          El inmueble NO se liberó.
                        </p>

                        {puedeEditar ? (
                          cancelando === v.contractId ? (
                            <div className="space-y-2">
                              <Input
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Por qué se cancela"
                                data-testid={`motivo-${v.contractId}`}
                              />
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={liberar}
                                  onCheckedChange={(c) => setLiberar(c === true)}
                                  data-testid={`liberar-${v.contractId}`}
                                />
                                Liberar el inmueble (vuelve a estar disponible)
                              </label>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={motivo.trim().length < 5}
                                  onClick={() => void cancelar(v.contractId)}
                                  data-testid={`confirmar-cancelar-${v.contractId}`}
                                >
                                  Cancelar la invitación
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setCancelando(null)}
                                >
                                  Volver
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCancelando(v.contractId)
                                setMotivo('')
                                setLiberar(false)
                              }}
                              data-testid={`cancelar-${v.contractId}`}
                            >
                              Cancelar la invitación
                            </Button>
                          )
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {recordatorios.length > 0 ? (
              <Card data-testid="recordatorios">
                <CardHeader>
                  <CardTitle className="text-base">
                    Recordatorios por mandar ({recordatorios.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3 text-sm">
                    Esta pantalla no envía: arma el texto y deja la constancia.
                  </p>
                  <ul className="divide-y">
                    {recordatorios.map((r) => (
                      <li
                        key={r.contractId}
                        className="space-y-1 py-3"
                        data-testid={`recordatorio-${r.contractId}`}
                      >
                        <p className="text-sm">{r.mensaje}</p>
                        <p className="text-muted-foreground text-xs">
                          Recordatorio {r.numero} de {r.de} ·{' '}
                          {r.correo ?? 'sin correo'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </EstadoDeDatos>
      )}
    </div>
  )
}
