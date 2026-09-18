'use client'

/**
 * CalceClient — qué se le manda a un lead, y a qué leads les calza un inmueble.
 *
 * ── G-02 (18-09-2026) ──────────────────────────────────────────────────────
 *
 * «Presupuesto y tope asegurable son REQUISITO; zona y fecha PESAN; la
 * inmobiliaria ajusta los pesos, NO los requisitos.»
 *
 * ── Las dos decisiones de presentación ─────────────────────────────────────
 *
 *   1. 🔴 **los requisitos se muestran como lo que son: una puerta cerrada, con
 *      su llave**. Cuando falta el presupuesto o el tope, la pantalla no dice
 *      «no hay resultados» —que suena a que no hay inmuebles— sino QUÉ falta y
 *      qué hacer. Es la diferencia entre un asesor que consigue el dato y uno
 *      que cierra la pestaña.
 *   2. **cada opción viene con su PORQUÉ**, porque el producto no es el
 *      puntaje: es el mensaje que el asesor le manda al interesado. Un 87 % sin
 *      explicación no se puede copiar a un WhatsApp.
 *
 * Los pesos se muestran, no se editan acá: quien los mueve es quien configura
 * la inmobiliaria, y moverlos desde la pantalla de trabajo diario invita a
 * ajustarlos hasta que salga el inmueble que uno quería vender.
 */

import { useState } from 'react'
import { MagicWand } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { usePipelineItems } from '@/lib/hooks/useInmobiliaria'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
} from '@/components/ui'
import { matchingApi } from '@/lib/api/crm.service'
import { useCrm } from '@/lib/hooks/use-crm'

function pesos(n: number | null | undefined): string {
  return n === null || n === undefined
    ? '—'
    : `$${n.toLocaleString('es-CO')}`
}

export function CalceClient() {
  const [leadId, setLeadId] = useState('')
  // Los leads del tablero, para poder elegir por NOMBRE en vez de por UUID.
  // Si la consulta falla, la lista queda vacía y el selector lo dice: no se
  // vuelve a caer en pedir un id a mano.
  const { pipelineItems } = usePipelineItems()
  const leadsDelTablero = pipelineItems ?? []
  // Los inmuebles salen de los mismos items, sin repetir: es lo que la
  // inmobiliaria tiene en el tablero, que es de donde se libera uno.
  const inmuebles = Array.from(
    new Map(
      leadsDelTablero
        .filter((l) => l.propertyId)
        .map((l) => [l.propertyId, { id: l.propertyId, titulo: l.propertyTitle || l.propertyAddress }]),
    ).values(),
  )
  const [propertyId, setPropertyId] = useState('')

  const config = useCrm(() => matchingApi.pesos(), [], [])
  const delLead = useCrm(
    () =>
      leadId.trim()
        ? matchingApi.paraElLead(leadId.trim())
        : Promise.resolve(null),
    [leadId],
    [],
  )
  const delInmueble = useCrm(
    () =>
      propertyId.trim()
        ? matchingApi.paraElInmueble(propertyId.trim())
        : Promise.resolve(null),
    [propertyId],
    [],
  )

  const opciones = delLead.datos?.opciones ?? []
  const leads = delInmueble.datos?.leads ?? []

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Calce</h1>
        <p className="text-muted-foreground text-sm">
          Las opciones que le calzan a un interesado, y los interesados a los que
          les calza un inmueble que se libera.
        </p>
      </header>

      {/* 🔴 Los requisitos NO se configuran, y la pantalla lo dice. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo se decide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">Requisitos (no se configuran)</p>
            <ul className="text-muted-foreground list-disc pl-5 text-sm">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Qué le mando a este lead</CardTitle>
          {/*
            🔴 Antes esto era un campo de texto que decía «pega el id de la
            tarjeta del tablero». Nadie tiene a la mano el UUID de un lead: para
            usarlo había que abrir el tablero, abrir la tarjeta, sacar el id de
            la URL y volver. Eso no es una pantalla, es un endpoint con un
            formulario encima. Ahora se elige por NOMBRE, que es como una
            persona piensa en un lead.
          */}
          <div className="space-y-1">
            <Label htmlFor="lead-id">¿De quién?</Label>
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
        </CardHeader>
        <CardContent>
          {!leadId.trim() ? (
            <p className="text-muted-foreground text-sm">
              Elige un interesado y te muestro qué inmuebles le calzan, y por qué.
            </p>
          ) : delLead.noHabilitado ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="calce-no-habilitado"
            >
              Próximamente: {delLead.noHabilitado}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={delLead.cargando}
              error={delLead.errorCrudo}
              queEs="el calce del lead"
              onReintentar={delLead.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={3} columnas={2} />}
            >
              {delLead.datos ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    <strong>{delLead.datos.lead.nombre}</strong> · presupuesto{' '}
                    {pesos(delLead.datos.busca.presupuestoCop)}{' '}
                    {delLead.datos.presupuestoDicho ? (
                      <Badge variant="secondary">lo dijo él</Badge>
                    ) : (
                      <Badge variant="outline">deducido del inmueble</Badge>
                    )}{' '}
                    · tope asegurable{' '}
                    {pesos(delLead.datos.busca.topeAsegurableCop)}
                  </p>

                  {/* 🔴 Un requisito que falta NO es «sin resultados». */}
                  {delLead.datos.falta ? (
                    <div
                      className="rounded-lg border p-4"
                      data-testid="falta-requisito"
                    >
                      <p className="text-sm font-medium">
                        Todavía no se le puede mandar nada
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
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
                    <ul className="divide-y" data-testid="opciones">
                      {opciones.map((o) => (
                        <li
                          key={o.propertyId}
                          className="space-y-1 py-3"
                          data-testid={`opcion-${o.propertyId}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">
                              {o.inmueble?.title ?? o.propertyId}
                              <span className="text-muted-foreground ml-2 text-sm font-normal">
                                {[o.inmueble?.neighborhood, o.inmueble?.city]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            </p>
                            <Badge>{o.puntaje} %</Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {pesos(o.inmueble?.monthlyRent ?? null)}
                            {o.inmueble?.adminFee
                              ? ` + ${pesos(o.inmueble.adminFee)} de administración`
                              : ''}
                          </p>
                          {/* El porqué: es lo que el asesor copia al mensaje. */}
                          {o.porQue.length > 0 ? (
                            <p className="text-sm">{o.porQue.join(' · ')}</p>
                          ) : null}
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

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">
            Se liberó este inmueble: ¿a quién le sirve?
          </CardTitle>
          <div className="space-y-1">
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
        </CardHeader>
        <CardContent>
          {!propertyId.trim() ? (
            <p className="text-muted-foreground text-sm">
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
                  <p className="text-sm" data-testid="no-ofrecible">
                    {delInmueble.datos.motivo}
                  </p>
                ) : leads.length === 0 ? (
                  <EmptyState
                    icon={MagicWand}
                    title="A ningún lead abierto le calza"
                    description="Ninguno de los interesados abiertos pasa los requisitos para este inmueble."
                  />
                ) : (
                  <ul className="divide-y" data-testid="leads-que-calzan">
                    {leads.map((l) => (
                      <li
                        key={l.pipelineItemId}
                        className="space-y-1 py-3"
                        data-testid={`lead-${l.pipelineItemId}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">
                            {l.nombre}
                            {l.correo ? (
                              <span className="text-muted-foreground ml-2 text-sm font-normal">
                                {l.correo}
                              </span>
                            ) : null}
                          </p>
                          <Badge>{l.puntaje} %</Badge>
                        </div>
                        {l.porQue.length > 0 ? (
                          <p className="text-sm">{l.porQue.join(' · ')}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
