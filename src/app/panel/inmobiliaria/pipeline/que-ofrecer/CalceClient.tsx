'use client'

/**
 * «Qué ofrecer» — qué le mando a este interesado, y a quién le sirve este
 * inmueble que se liberó.
 *
 * ── El nombre (Nico, 21-09-2026) ───────────────────────────────────────────
 *
 * Se llamaba «Calce». Tres problemas: no dice qué se puede hacer acá, se
 * confunde con «Matching» —que está en el menú de al lado y es otra cosa: el
 * agente que estudia a un candidato para una postulación— y «calce» en
 * Colombia se usa más para una cuña que para un encaje. «Qué ofrecer» es la
 * pregunta que el asesor tiene en la cabeza cuando abre esta pantalla.
 *
 * ── El rediseño ────────────────────────────────────────────────────────────
 *
 * Antes eran tres tarjetas apiladas: una de «cómo se decide» ocupando el lugar
 * más valioso de la pantalla, y dos con un `select` cada una, las dos vacías
 * hasta que alguien eligiera algo. Se veía sin terminar y no se entendía qué
 * se podía hacer bien.
 *
 * Ahora:
 *   · **una sola pregunta a la vez**, con las dos direcciones en un control de
 *     dos posiciones. Son la misma pregunta mirada desde los dos lados, no dos
 *     funciones;
 *   · **el resultado se puede USAR**: cada fila trae el botón «Copiar el
 *     mensaje», que arma el texto para mandarle al interesado con el porqué que
 *     calculó el back. El comentario de esta pantalla decía desde el 18-09 que
 *     «el producto no es el puntaje, es el mensaje» — y el mensaje había que
 *     reescribirlo a mano;
 *   · **el puntaje se ve como lo que es**: una barra con su número, al lado de
 *     las razones que lo explican, y NUNCA dentro del mensaje al cliente
 *     (`el-mensaje-para-el-interesado.ts`);
 *   · «cómo se decide» baja al pie, que es donde se consulta una vez y no
 *     cada vez.
 *
 * Lo que NO cambió, porque era lo bueno que ya tenía: un requisito que falta se
 * muestra como una puerta cerrada con su llave y no como «sin resultados»; los
 * pesos se ven y no se editan acá; y se elige por nombre, nunca por UUID.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { ArrowRight, Copy, MagicWand, Users, House } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/cadence'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { usePipelineItems } from '@/lib/hooks/useInmobiliaria'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Label,
} from '@/components/ui'
import { toast } from '@/components/ui/toast'
import { matchingApi } from '@/lib/api/crm.service'
import { useCrm } from '@/lib/hooks/use-crm'
import { mensajeDeUnaOpcion } from '@/lib/matching/el-mensaje-para-el-interesado'

type Direccion = 'interesado' | 'inmueble'

function pesos(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : `$${n.toLocaleString('es-CO')}`
}

/** La barra del puntaje. Acompaña a las razones; nunca las reemplaza. */
function Puntaje({ valor }: { valor: number }) {
  const acotado = Math.max(0, Math.min(100, Math.round(valor)))
  return (
    <span className="flex items-center gap-2" aria-label={`Calce del ${acotado} por ciento`}>
      <span className="bg-surface-muted h-1.5 w-16 overflow-hidden rounded-full" aria-hidden="true">
        <span
          className="bg-primary block h-full rounded-full"
          style={{ width: `${acotado}%` }}
        />
      </span>
      <span className="text-fg-muted font-mono text-xs tabular-nums">{acotado}%</span>
    </span>
  )
}

/** Las razones, como fichas: se leen de un vistazo y se copian con el mensaje. */
function Razones({ porQue }: { porQue: readonly string[] }) {
  if (porQue.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {porQue.map((r) => (
        <Badge key={r} variant="secondary" className="font-normal">
          {r}
        </Badge>
      ))}
    </div>
  )
}

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    toast.success('Mensaje copiado', {
      description: 'Pégalo en tu WhatsApp o en el correo.',
    })
  } catch {
    // El portapapeles se niega en contextos no seguros y cuando el permiso
    // está cortado. Decirlo es mejor que un botón que no hace nada.
    toast.error('No pudimos copiarlo', {
      description: 'Tu navegador no nos dejó usar el portapapeles.',
    })
  }
}

export function CalceClient() {
  const [direccion, setDireccion] = useState<Direccion>('interesado')
  const [leadId, setLeadId] = useState('')
  const [propertyId, setPropertyId] = useState('')

  /*
   * Los leads del tablero, para poder elegir por NOMBRE en vez de por UUID.
   * Si la consulta falla, la lista queda vacía y el selector lo dice: no se
   * vuelve a caer en pedir un id a mano.
   */
  const { pipelineItems } = usePipelineItems()
  const leadsDelTablero = pipelineItems ?? []
  const inmuebles = useMemo(
    () =>
      Array.from(
        new Map(
          leadsDelTablero
            .filter((l) => l.propertyId)
            .map((l) => [
              l.propertyId,
              { id: l.propertyId, titulo: l.propertyTitle || l.propertyAddress },
            ]),
        ).values(),
      ),
    [leadsDelTablero],
  )

  const config = useCrm(() => matchingApi.pesos(), [], [])
  const delLead = useCrm(
    () => (leadId.trim() ? matchingApi.paraElLead(leadId.trim()) : Promise.resolve(null)),
    [leadId],
    [],
  )
  const delInmueble = useCrm(
    () =>
      propertyId.trim() ? matchingApi.paraElInmueble(propertyId.trim()) : Promise.resolve(null),
    [propertyId],
    [],
  )

  const opciones = delLead.datos?.opciones ?? []
  const leads = delInmueble.datos?.leads ?? []
  const nombreDelInteresado = delLead.datos?.lead.nombre ?? ''

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Qué ofrecer</h1>
        <p className="text-fg-muted text-sm">
          A un interesado, los inmuebles que le sirven. A un inmueble que se libera, los
          interesados a los que les sirve — con el porqué listo para mandar.
        </p>
      </header>

      {/* Las dos direcciones son la MISMA pregunta mirada desde los dos lados. */}
      <SegmentedControl<Direccion>
        aria-label="Desde dónde quieres buscar"
        value={direccion}
        onChange={setDireccion}
        options={[
          {
            value: 'interesado',
            label: (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Tengo un interesado
              </span>
            ),
            ariaLabel: 'Tengo un interesado',
          },
          {
            value: 'inmueble',
            label: (
              <span className="flex items-center gap-2">
                <House className="h-4 w-4" />
                Se liberó un inmueble
              </span>
            ),
            ariaLabel: 'Se liberó un inmueble',
          },
        ]}
      />

      {direccion === 'interesado' ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="lead-id">¿A quién le vas a ofrecer?</Label>
              <select
                id="lead-id"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                data-testid="input-lead"
                disabled={leadsDelTablero.length === 0}
                className="border-border bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="">
                  {leadsDelTablero.length === 0
                    ? 'Todavía no hay leads en el tablero'
                    : 'Elige un interesado…'}
                </option>
                {leadsDelTablero.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.candidateName}
                    {l.propertyTitle ? ` · ${l.propertyTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {leadsDelTablero.length === 0 ? (
              /* Un vacío con salida: de acá se va a crear el primer lead. */
              <EmptyState
                icon={Users}
                title="Todavía no hay a quién ofrecerle"
                description="Cuando entre un interesado al tablero, acá te digo qué inmuebles le sirven."
                action={{
                  label: 'Ir al pipeline',
                  href: '/panel/inmobiliaria/pipeline',
                }}
              />
            ) : !leadId.trim() ? (
              <p className="text-fg-muted text-sm">
                Elige un interesado y te muestro qué inmuebles le calzan, y por qué.
              </p>
            ) : delLead.noHabilitado ? (
              <p className="text-fg-muted text-sm" data-testid="calce-no-habilitado">
                {motivoEnCristiano(delLead.noHabilitado)}
              </p>
            ) : (
              <EstadoDeDatos
                principal
                cargando={delLead.cargando}
                error={delLead.errorCrudo}
                queEs="el calce del lead"
                onReintentar={delLead.refetch}
                conservarContenido
                esqueleto={<EsqueletoTabla filas={3} columnas={2} />}
              >
                {delLead.datos ? (
                  <div className="space-y-4">
                    {/* Qué busca, que es lo que explica el resto de la pantalla. */}
                    <div className="border-border-faint bg-surface-muted/40 rounded-lg border px-4 py-3">
                      <p className="text-sm">
                        <strong>{delLead.datos.lead.nombre}</strong> · presupuesto{' '}
                        {pesos(delLead.datos.busca.presupuestoCop)}{' '}
                        {delLead.datos.presupuestoDicho ? (
                          <Badge variant="secondary">lo dijo él</Badge>
                        ) : (
                          <Badge variant="outline">deducido del inmueble</Badge>
                        )}{' '}
                        · tope asegurable {pesos(delLead.datos.busca.topeAsegurableCop)}
                      </p>
                    </div>

                    {/* 🔴 Un requisito que falta NO es «sin resultados». */}
                    {delLead.datos.falta ? (
                      <div className="border-warning/40 bg-warning-soft/30 rounded-lg border p-4" data-testid="falta-requisito">
                        <p className="text-sm font-medium">Todavía no se le puede mandar nada</p>
                        <p className="text-fg-muted mt-1 text-sm">
                          {delLead.datos.falta.message}
                        </p>
                      </div>
                    ) : opciones.length === 0 ? (
                      <EmptyState
                        icon={MagicWand}
                        title="Ningún inmueble le calza hoy"
                        description="Con su presupuesto y su tope, nada del portafolio pasa los requisitos. Cuando se libere uno que sí, aparece acá."
                      />
                    ) : (
                      <ul className="divide-border-faint divide-y" data-testid="opciones">
                        {opciones.map((o) => (
                          <li
                            key={o.propertyId}
                            className="flex flex-wrap items-start justify-between gap-3 py-3"
                            data-testid={`opcion-${o.propertyId}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">
                                {o.inmueble?.title ?? o.propertyId}
                                <span className="text-fg-muted ml-2 text-sm font-normal">
                                  {[o.inmueble?.neighborhood, o.inmueble?.city]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              </p>
                              <p className="text-fg-muted text-sm">
                                {pesos(o.inmueble?.monthlyRent ?? null)}
                                {o.inmueble?.adminFee
                                  ? ` + ${pesos(o.inmueble.adminFee)} de administración`
                                  : ''}
                              </p>
                              <Razones porQue={o.porQue} />
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <Puntaje valor={o.puntaje} />
                              <Button
                                size="sm"
                                variant="outline"
                                hideArrow
                                className="gap-1.5"
                                data-testid={`copiar-${o.propertyId}`}
                                onClick={() =>
                                  void copiar(
                                    mensajeDeUnaOpcion(nombreDelInteresado, {
                                      titulo: o.inmueble?.title ?? 'el inmueble',
                                      barrio: o.inmueble?.neighborhood ?? null,
                                      ciudad: o.inmueble?.city ?? null,
                                      canonCop: o.inmueble?.monthlyRent ?? null,
                                      administracionCop: o.inmueble?.adminFee ?? null,
                                      habitaciones: o.inmueble?.bedrooms ?? null,
                                      porQue: o.porQue,
                                    }),
                                  )
                                }
                              >
                                <Copy className="h-4 w-4" />
                                Copiar el mensaje
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </EstadoDeDatos>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="property-id">¿Cuál inmueble se liberó?</Label>
              <select
                id="property-id"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                data-testid="input-inmueble"
                disabled={inmuebles.length === 0}
                className="border-border bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="">
                  {inmuebles.length === 0
                    ? 'Todavía no hay inmuebles en el tablero'
                    : 'Elige un inmueble…'}
                </option>
                {inmuebles.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.titulo}
                  </option>
                ))}
              </select>
            </div>

            {inmuebles.length === 0 ? (
              <EmptyState
                icon={House}
                title="Todavía no hay inmuebles en el tablero"
                description="Los inmuebles de esta lista salen de los leads del pipeline: son los que alguien está mirando."
                action={{ label: 'Ir al pipeline', href: '/panel/inmobiliaria/pipeline' }}
              />
            ) : !propertyId.trim() ? (
              <p className="text-fg-muted text-sm">
                Elige un inmueble y te muestro a qué interesados abiertos les sirve.
              </p>
            ) : (
              <EstadoDeDatos
                cargando={delInmueble.cargando}
                error={delInmueble.errorCrudo}
                queEs="los leads que calzan"
                onReintentar={delInmueble.refetch}
                conservarContenido
                esqueleto={<EsqueletoTabla filas={3} columnas={2} />}
              >
                {delInmueble.datos ? (
                  !delInmueble.datos.ofrecible ? (
                    <div
                      className="border-warning/40 bg-warning-soft/30 rounded-lg border p-4"
                      data-testid="no-ofrecible"
                    >
                      <p className="text-sm">{delInmueble.datos.motivo}</p>
                    </div>
                  ) : leads.length === 0 ? (
                    <EmptyState
                      icon={MagicWand}
                      title="A ningún lead abierto le calza"
                      description="Ninguno de los interesados abiertos pasa los requisitos para este inmueble."
                    />
                  ) : (
                    <ul className="divide-border-faint divide-y" data-testid="leads-que-calzan">
                      {leads.map((l) => (
                        <li
                          key={l.pipelineItemId}
                          className="flex flex-wrap items-start justify-between gap-3 py-3"
                          data-testid={`lead-${l.pipelineItemId}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {l.nombre}
                              {l.correo ? (
                                <span className="text-fg-muted ml-2 text-sm font-normal">
                                  {l.correo}
                                </span>
                              ) : null}
                            </p>
                            <Razones porQue={l.porQue} />
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <Puntaje valor={l.puntaje} />
                            {/* Desde acá se salta al otro lado de la misma
                                pregunta, que es donde está el mensaje armado. */}
                            <Button
                              size="sm"
                              variant="ghost"
                              hideArrow
                              className="gap-1"
                              onClick={() => {
                                setLeadId(l.pipelineItemId)
                                setDireccion('interesado')
                              }}
                            >
                              Ver qué ofrecerle
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
              </EstadoDeDatos>
            )}
          </CardContent>
        </Card>
      )}

      {/* 🔴 Cómo se decide un calce: se consulta una vez, no cada vez que se
          abre la pantalla. Era un `<details>` al pie —y abierto empujaba las
          opciones hacia abajo, que es justo lo que la persona vino a mirar—;
          desde el 21-09 se abre encima con `ParaEntenderMas` y la devuelve
          intacta al cerrarla. */}
      <ParaEntenderMas
        etiqueta="Cómo se decide"
        titulo="Cómo se decide un calce"
        descripcion="Dos cosas distintas: lo que un inmueble tiene que cumplir para aparecer, y cuánto pesa cada coincidencia en el orden."
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Requisitos (no se configuran)</p>
            <ul className="text-fg-muted list-disc pl-5 text-sm">
              {(config.datos?.requisitos ?? []).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          {config.datos?.pesos ? (
            <div>
              <p className="text-sm font-medium">
                Pesos {config.datos.configurados ? '' : '(los de por defecto)'}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {Object.entries(config.datos.pesos).map(([k, v]) => (
                  <Badge key={k} variant="secondary">
                    {k}: {v}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-fg-muted text-xs">
            Los pesos se cambian en la configuración de la inmobiliaria, no acá: moverlos desde
            la pantalla de trabajo invita a ajustarlos hasta que salga el inmueble que uno
            quería vender.{' '}
            <Link href="/panel/inmobiliaria/configuracion" className="text-primary underline">
              Ir a configuración
            </Link>
          </p>
        </div>
      </ParaEntenderMas>
    </div>
  )
}
