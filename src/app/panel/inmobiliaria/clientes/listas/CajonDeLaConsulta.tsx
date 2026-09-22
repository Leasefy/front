'use client'

/**
 * El cajón de una consulta en listas — y la decisión que nadie podía tomar.
 *
 * ── 🔴 La trampa que apareció al abrir esta pantalla (22-09) ───────────────
 *
 * El encabezado decía: «una coincidencia bloquea hasta que un administrador la
 * revise». Revisarla es `captacionApi.revisarConsulta`, que existía en el
 * cliente y **no la llamaba nadie**: un tercero bloqueado se quedaba bloqueado
 * para siempre, y la pantalla afirmaba lo contrario.
 *
 * Es el mismo patrón de `cargarLista`: la ruta del back hecha, el método del
 * cliente escrito, y ninguna pantalla que los use.
 *
 * ── Las dos salidas, y por qué ninguna es «quitar el bloqueo» ──────────────
 *
 * · LIBERADO — no es esa persona (un homónimo). El tercero opera normal.
 * · CONFIRMADO — sí es esa persona. Queda bloqueado y ADEMÁS anotado como
 *   confirmado, que es lo que un auditor de la UIAF viene a mirar.
 *
 * Las dos exigen motivo, y el motivo queda guardado con la consulta: esta
 * decisión es la que hay que poder defender ante una auditoría.
 */

import { useState } from 'react'
import { ShieldCheck, ShieldWarning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { toast } from '@/components/ui/toast'
import { captacionApi, type ConsultaDeListas } from '@/lib/api/crm.service'
import { errorEnCristiano } from '@/lib/errores/en-cristiano'

/** El tope del back para el motivo. */
export const MAX_MOTIVO = 500

export interface CajonDeLaConsultaProps {
  consulta: ConsultaDeListas | null
  onCerrar: () => void
  /** El back respondió: la pantalla vuelve a leer. */
  onRevisada: () => void
  /** `false` esconde las dos acciones: sólo un ADMIN decide esto. */
  puedeRevisar: boolean
  /** Cómo se lee el estado, con su tono. Lo decide la pantalla. */
  rotulo: { texto: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  /** Por qué está así, en una frase. */
  porque: string
}

export function CajonDeLaConsulta({
  consulta,
  onCerrar,
  onRevisada,
  puedeRevisar,
  rotulo,
  porque,
}: CajonDeLaConsultaProps) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState<'LIBERADO' | 'CONFIRMADO' | null>(null)

  const motivoLimpio = motivo.trim()
  // Sólo se revisa lo que está frenado: liberar algo que nunca coincidió no
  // significa nada, y volver a decidir sobre lo ya decidido tampoco.
  const seDecide = consulta?.estado === 'BLOQUEADO'

  async function decidir(decision: 'LIBERADO' | 'CONFIRMADO') {
    if (!consulta || motivoLimpio === '' || enviando) return
    setEnviando(decision)
    try {
      await captacionApi.revisarConsulta(consulta.id, decision, motivoLimpio)
      toast.success(
        decision === 'LIBERADO'
          ? `${consulta.nombre} queda liberado: puede operar.`
          : `${consulta.nombre} queda confirmado en lista y sigue bloqueado.`,
      )
      setMotivo('')
      onRevisada()
      onCerrar()
    } catch (e) {
      // El cajón queda abierto con el motivo escrito: reintentar no obliga a
      // volver a redactarlo.
      toast.error(errorEnCristiano(e, 'No se pudo guardar la revisión.'))
    } finally {
      setEnviando(null)
    }
  }

  return (
    <Cajon
      abierto={consulta !== null}
      onOpenChange={(v) => {
        if (!v && enviando) return
        if (!v) {
          setMotivo('')
          onCerrar()
        }
      }}
      ancho="sm:max-w-xl"
      data-testid="cajon-de-la-consulta"
    >
      {consulta && (
        <>
          <CajonCabecera
            titulo={consulta.nombre}
            descripcion={`${consulta.terceroTipo.toLowerCase()}${consulta.documento ? ` · ${consulta.documento}` : ''}`}
          >
            <div className="mt-2">
              <Badge variant={rotulo.variant}>{rotulo.texto}</Badge>
            </div>
          </CajonCabecera>

          <CajonCuerpo className="space-y-5">
            <p className="text-sm text-fg">{porque}</p>

            {consulta.coincidencias && consulta.coincidencias.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-caption uppercase tracking-wide text-fg-muted">
                  Con qué coincide
                </h3>
                <ul
                  className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border"
                  data-testid="coincidencias"
                >
                  {consulta.coincidencias.map((c, i) => (
                    <li
                      key={`${c.lista}-${c.nombreEnLaLista}-${i}`}
                      className="flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block text-fg">{c.nombreEnLaLista}</span>
                        <span className="block text-caption text-fg-muted">{c.lista}</span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-fg-muted">
                        {c.parecido} %
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-fg-muted">
                  El parecido es de los NOMBRES. Un homónimo puede dar 100 %:
                  compara el documento antes de decidir.
                </p>
              </section>
            )}

            {consulta.motivoDeLaRevision && (
              <section className="space-y-1" data-testid="motivo-anterior">
                <h3 className="text-caption uppercase tracking-wide text-fg-muted">
                  Lo que se decidió
                </h3>
                <p className="text-sm text-fg">{consulta.motivoDeLaRevision}</p>
              </section>
            )}

            {seDecide && puedeRevisar && (
              <div className="space-y-2">
                <Label htmlFor="motivo-de-la-revision">Por qué</Label>
                <Textarea
                  id="motivo-de-la-revision"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Comparé la cédula: es un homónimo, no la persona de la lista."
                  rows={3}
                  maxLength={MAX_MOTIVO}
                  disabled={enviando !== null}
                  data-testid="motivo-de-la-revision"
                />
                <p className="text-caption text-fg-muted">
                  Obligatorio y queda guardado con la consulta: es la decisión
                  que hay que poder defender en una auditoría.
                </p>
              </div>
            )}
          </CajonCuerpo>

          <CajonPie
            ayuda={
              !seDecide
                ? 'Sólo se revisa lo que está bloqueado.'
                : !puedeRevisar
                  ? 'Esta decisión la toma un administrador.'
                  : 'Liberar deja operar al tercero; confirmar lo deja bloqueado y anotado.'
            }
          >
            <Button
              variant="outline"
              hideArrow
              disabled={enviando !== null}
              onClick={onCerrar}
              data-testid="consulta-cerrar"
            >
              Cerrar
            </Button>
            {seDecide && puedeRevisar && (
              <>
                <Button
                  variant="outline"
                  hideArrow
                  disabled={motivoLimpio === '' || enviando !== null}
                  onClick={() => void decidir('CONFIRMADO')}
                  data-testid="confirmar-en-lista"
                >
                  <ShieldWarning className="h-4 w-4" weight="bold" />
                  {enviando === 'CONFIRMADO' ? 'Guardando…' : 'Sí es: confirmar'}
                </Button>
                <Button
                  hideArrow
                  disabled={motivoLimpio === '' || enviando !== null}
                  onClick={() => void decidir('LIBERADO')}
                  data-testid="liberar-consulta"
                >
                  <ShieldCheck className="h-4 w-4" weight="bold" />
                  {enviando === 'LIBERADO' ? 'Guardando…' : 'No es: liberar'}
                </Button>
              </>
            )}
          </CajonPie>
        </>
      )}
    </Cajon>
  )
}
