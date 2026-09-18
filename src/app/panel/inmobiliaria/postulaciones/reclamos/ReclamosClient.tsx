'use client'

/**
 * ReclamosClient — el canal del candidato rechazado (F-07).
 *
 * «Al rechazado se le da un motivo general y un canal para pedir detalle o
 * corregir datos; NUNCA el puntaje ni datos de centrales.»
 *
 * ── 🔴 Lo que esta pantalla impide ─────────────────────────────────────────
 *
 * Que la respuesta lleve el puntaje. El back tiene el colador y devuelve 400
 * con lo que encontró; acá ese 400 se muestra **al lado del campo, antes de
 * mandar nada**, y con las palabras que delató. No se «limpia» el texto: quien
 * escribe tiene que enterarse de que ese camino no existe.
 *
 * Y el recordatorio de qué SÍ se puede decir está escrito arriba del campo, no
 * en un tooltip: la mitad de las veces el puntaje se filtra por no saber qué
 * poner en su lugar.
 */

import { useState } from 'react'
import { ChatCircleDots } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Textarea,
} from '@/components/ui'
import { ApiError } from '@/lib/api/client'
import { postulacionesApi, type ReclamoDelEstudio } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'

const ROTULO: Record<
  ReclamoDelEstudio['estado'],
  { texto: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  ABIERTO: { texto: 'Abierto', variant: 'default' },
  EN_REVISION: { texto: 'En revisión', variant: 'outline' },
  RESUELTO: { texto: 'Resuelto', variant: 'secondary' },
}

export function ReclamosClient() {
  const { canAccess } = usePermissions()
  const puedeResponder = canAccess('pipeline', 'edit')

  const datos = useCrm(() => postulacionesApi.reclamos(), [], ['postulaciones'])
  const [abierto, setAbierto] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [fuga, setFuga] = useState<string | null>(null)

  const reclamos = datos.datos?.reclamos ?? []

  async function responder(id: string) {
    setEnviando(true)
    setFuga(null)
    try {
      await postulacionesApi.responderReclamo(id, texto)
      setAbierto(null)
      setTexto('')
      invalidar('postulaciones')
    } catch (e) {
      // 🔴 El 400 del colador: se muestra tal cual, con lo que encontró.
      if (e instanceof ApiError && e.status === 400) {
        setFuga(e.messages?.[0] ?? e.message)
      } else {
        setFuga('No se pudo responder. Vuelve a intentar.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reclamos de candidatos
        </h1>
        <p className="text-muted-foreground text-sm">
          Quien no pasó puede pedir detalle o avisar que un dato está mal. Se le
          responde sin decirle su puntaje ni lo que dicen las centrales.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Los reclamos</CardTitle>
        </CardHeader>
        <CardContent>
          {datos.noHabilitado ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="reclamos-no-habilitados"
            >
              Próximamente: {datos.noHabilitado}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={datos.cargando}
              error={datos.errorCrudo}
              vacio={reclamos.length === 0}
              queEs="los reclamos"
              onReintentar={datos.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={4} columnas={3} />}
              cuandoVacio={
                <EmptyState
                  icon={ChatCircleDots}
                  title="Ningún reclamo todavía"
                  description="Al candidato rechazado se le ofrece este canal junto con el motivo. Cuando alguien lo use, aparece acá."
                />
              }
            >
              <ul className="divide-y" data-testid="lista-de-reclamos">
                {reclamos.map((r) => {
                  const rotulo = ROTULO[r.estado]
                  return (
                    <li
                      key={r.id}
                      className="space-y-2 py-4"
                      data-testid={`reclamo-${r.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {r.solicitanteNombre}
                          <span className="text-muted-foreground ml-2 text-sm font-normal">
                            {r.solicitanteCorreo}
                          </span>
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">
                            {r.tipo === 'DETALLE'
                              ? 'Pide detalle'
                              : 'Corrige un dato'}
                          </Badge>
                          <Badge variant={rotulo.variant}>{rotulo.texto}</Badge>
                        </div>
                      </div>
                      <p className="text-sm">{r.mensaje}</p>

                      {r.respuesta ? (
                        <p className="text-muted-foreground border-l-2 pl-3 text-sm">
                          {r.respuesta}
                        </p>
                      ) : puedeResponder ? (
                        abierto === r.id ? (
                          <div className="space-y-2">
                            <p className="text-muted-foreground text-xs">
                              Puedes decirle qué documento volver a mandar, que
                              se presente con codeudor, o que vuelva a
                              intentarlo. No su puntaje, ni lo que dicen las
                              centrales.
                            </p>
                            <Textarea
                              value={texto}
                              onChange={(e) => setTexto(e.target.value)}
                              rows={3}
                              placeholder="La aseguradora no aprobó con las condiciones actuales. Puedes presentarte con un codeudor…"
                              data-testid={`respuesta-${r.id}`}
                            />
                            {fuga ? (
                              <p
                                className="text-destructive text-sm"
                                role="alert"
                                data-testid="fuga-detectada"
                              >
                                {fuga}
                              </p>
                            ) : null}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={enviando || texto.trim().length < 5}
                                onClick={() => void responder(r.id)}
                                data-testid={`enviar-${r.id}`}
                              >
                                {enviando ? 'Enviando…' : 'Responder'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAbierto(null)
                                  setFuga(null)
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAbierto(r.id)
                              setTexto('')
                              setFuga(null)
                            }}
                            data-testid={`responder-${r.id}`}
                          >
                            Responder
                          </Button>
                        )
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
