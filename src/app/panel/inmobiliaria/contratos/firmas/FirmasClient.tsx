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
import type * as React from 'react'
import Link from 'next/link'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { Signature } from '@phosphor-icons/react'
import { Cifra, CrossFade, FranjaDeCifras, Presence, Stagger, StaggerItem } from '@leasefy/cadence'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
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
import { diaEnColombia, fechaLarga } from '@/lib/fechas/fecha-de-la-casa'

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
  const porVencer = barrido.datos?.porVencer ?? []
  // QA-CONT-95 D-10: lo que va a tiempo también es «pendiente de firmar».
  const aTiempo = barrido.datos?.aTiempo ?? []
  const vacio =
    recordatorios.length === 0 &&
    vencidas.length === 0 &&
    porVencer.length === 0 &&
    aTiempo.length === 0

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
    } catch (err) {
      // 02-10-2026: regla de oro — el motivo del back (un 409 dice por qué no),
      // un 5xx es nuestro con la referencia, y sólo la red habla de conexión.
      setResultado(
        mensajeParaLaPersona(err, {
          porDefecto: 'No se pudo cancelar la invitación.',
          accion: 'cancelar la invitación',
        }),
      )
    }
  }

  // GLOW UP (21-10-2026): la pantalla se lee por lo que te toca. Arriba, cuántas
  // hay en cada estado; abajo, primero lo que pide una decisión tuya (las
  // vencidas y los recordatorios) y después lo que corre solo (el Piloto y lo
  // que va a tiempo). Los tres estados se explican en «¿Cómo funciona?» y cada
  // grupo dice en una línea qué se espera de ti.
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Contratos"
        titulo="Invitaciones a firmar"
        descripcion="Los contratos que se mandaron a firmar y nadie ha firmado: primero lo que te toca hacer, después lo que va a tiempo."
        ayuda={
          <ParaEntenderMas
            etiqueta="¿Cómo funciona?"
            titulo="Cómo funciona: invitaciones a firmar"
            variante="secundario"
          >
            {/* 🔴 Los tres estados (Nico, 18-09-2026: «que se entienda muy bien
                qué debe hacer el usuario con los diferentes estados de esa
                pantalla»). */}
            <div className="space-y-4 text-body-sm" data-testid="los-tres-estados">
              {ESTADOS.map((e) => (
                <div key={e.que} className="space-y-0.5">
                  <p className="font-medium text-fg">{e.que}</p>
                  <p className="leading-relaxed text-fg-muted">{e.como}</p>
                </div>
              ))}
              <p className="leading-relaxed text-fg-muted">
                La invitación vence a los 7 días con dos recordatorios. Al vencerse,
                el contrato vuelve a borrador y se le avisa al asesor, pero el
                inmueble no se libera solo: liberarlo es una decisión tuya, al
                cancelar.
              </p>
            </div>
          </ParaEntenderMas>
        }
      />

      <Presence show={Boolean(resultado)} initial={false} distance="xs" as="p" className="text-sm" data-testid="resultado-cancelacion">
        {resultado}
      </Presence>

      {barrido.noHabilitado ? (
        <Card>
          <CardContent className="py-6">
            <p
              className="text-muted-foreground text-sm"
              data-testid="firmas-no-habilitadas"
            >
              {motivoEnCristiano(barrido.noHabilitado)}
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
              title="No hay nadie pendiente de firmar"
              description="Ningún contrato está esperando firma en este momento, así que no hay nada que hacer acá. Cuando mandes uno a firmar desde su ficha, aparece en esta lista con los días que le quedan."
            />
          }
        >
          <div className="space-y-6">
            <FranjaDeCifras fila="md" aria-label="Cómo van las invitaciones" data-testid="franja-firmas">
              <Cifra
                etiqueta="Se vencieron"
                valor={vencidas.length}
                detalle={vencidas.length > 0 ? 'Te toca decidir' : 'Ninguna'}
                tono={vencidas.length > 0 ? 'peligro' : undefined}
                data-testid="cifra-vencidas"
              />
              <Cifra
                etiqueta="Recordatorios"
                valor={recordatorios.length}
                detalle={recordatorios.length > 0 ? 'Por mandar' : 'Ninguno pendiente'}
                tono={recordatorios.length > 0 ? 'aviso' : undefined}
                data-testid="cifra-recordatorios"
              />
              <Cifra
                etiqueta="Se pasó el plazo"
                valor={porVencer.length}
                detalle="Las vence el Piloto"
                data-testid="cifra-por-vencer"
              />
              <Cifra
                etiqueta="A tiempo"
                valor={aTiempo.length}
                detalle="No tienes que hacer nada"
                tono={aTiempo.length > 0 ? 'exito' : undefined}
                data-testid="cifra-a-tiempo"
              />
            </FranjaDeCifras>

            {vencidas.length > 0 ? (
              <Grupo
                titulo={`Se vencieron (${vencidas.length})`}
                queHacer="Te toca: cancelar la invitación o volver a mandarla desde la ficha del contrato. El inmueble sigue reservado mientras tanto."
                teToca
                data-testid="vencidas"
              >
                {/* La que se cancela sale y las de abajo suben (`key` = el contrato). */}
                <Stagger as="ul" className="divide-y divide-border">
                  {vencidas.map((v) => (
                    <StaggerItem
                      as="li"
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
                        /* «Cancelar» se cruza con el motivo. `popLayout`: el
                           campo se monta YA y el botón se va por encima. */
                        <CrossFade
                          swapKey={cancelando === v.contractId ? 'motivo' : 'boton'}
                          mode="popLayout"
                        >
                          {cancelando === v.contractId ? (
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
                              <div className="flex flex-wrap gap-2">
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
                            <div className="flex flex-wrap gap-2">
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
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/panel/inmobiliaria/contratos/${v.contractId}`}>
                                  Abrir el contrato
                                </Link>
                              </Button>
                            </div>
                          )}
                        </CrossFade>
                      ) : null}
                    </StaggerItem>
                  ))}
                </Stagger>
              </Grupo>
            ) : null}

            {recordatorios.length > 0 ? (
              <Grupo
                titulo={`Recordatorios por mandar (${recordatorios.length})`}
                queHacer="Te toca: mandarle el recordatorio a cada uno o llamarlo. Esta pantalla no envía: arma el texto y deja la constancia."
                teToca
                data-testid="recordatorios"
              >
                <Stagger as="ul" className="divide-y divide-border">
                  {recordatorios.map((r) => (
                    <StaggerItem
                      as="li"
                      key={r.contractId}
                      className="space-y-1 py-3"
                      data-testid={`recordatorio-${r.contractId}`}
                    >
                      <p className="text-sm">{r.mensaje}</p>
                      <p className="text-muted-foreground text-xs">
                        Recordatorio {r.numero} de {r.de} ·{' '}
                        {r.correo ?? 'sin correo'}
                      </p>
                    </StaggerItem>
                  ))}
                </Stagger>
              </Grupo>
            ) : null}

            {/* 🔴 24-09-2026: abrir esta pantalla ya NO vence nada — antes la
                lectura devolvía contratos a borrador sin preguntarle al modo
                del Piloto. Lo que se quedó sin firma al cumplirse el plazo lo
                vence el Piloto según su modo; acá se ve mientras tanto. */}
            {porVencer.length > 0 ? (
              <Grupo
                titulo={`Se les pasó el plazo (${porVencer.length})`}
                queHacer="Nadie firmó a tiempo. El Piloto las vence según su modo: en Automático devuelve el contrato a borrador solo, en Copiloto te espera en la Bandeja del Piloto con un clic y en Manual te lo propone. El inmueble sigue reservado."
                data-testid="por-vencer"
              >
                <Stagger as="ul" className="divide-y divide-border">
                  {porVencer.map((p) => (
                    <StaggerItem
                      as="li"
                      key={p.invitacionId}
                      className="py-3 text-sm"
                      data-testid={`por-vencer-${p.contractId}`}
                    >
                      {p.tenantName ?? 'Contrato sin nombre del inquilino'}
                    </StaggerItem>
                  ))}
                </Stagger>
              </Grupo>
            ) : null}

            {/* 🔴 QA-CONT-95 D-10/UC-13 (04-10-2026): el primero de los tres
                estados que explica la pantalla. Antes no venía nunca y, con el
                #57 esperando firma, la pantalla decía «No hay nadie pendiente
                de firmar». */}
            {aTiempo.length > 0 ? (
              <Grupo
                titulo={`A tiempo (${aTiempo.length})`}
                queHacer="No tienes que hacer nada: el sistema manda los dos recordatorios solo."
                data-testid="a-tiempo"
              >
                <Stagger as="ul" className="divide-y divide-border">
                  {aTiempo.map((a) => (
                    <StaggerItem
                      as="li"
                      key={a.contractId}
                      className="space-y-1 py-3"
                      data-testid={`a-tiempo-${a.contractId}`}
                    >
                      <p className="text-sm">
                        <Link
                          href={`/panel/inmobiliaria/contratos/${a.contractId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {a.code != null ? `Contrato #${a.code}` : 'Contrato'}
                        </Link>
                        {' · '}
                        {a.tenantName ?? 'Sin nombre del inquilino'}
                        {' · '}
                        {a.esperaA === 'INQUILINO'
                          ? 'espera la firma del inquilino'
                          : 'el inquilino ya firmó: falta la firma de la inmobiliaria'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {lineaDelPlazo(a)}
                      </p>
                    </StaggerItem>
                  ))}
                </Stagger>
              </Grupo>
            ) : null}
          </div>
        </EstadoDeDatos>
      )}
    </div>
  )
}

const ESTADOS = [
  {
    que: 'A tiempo',
    como: 'Se mandó hace menos de 7 días. No tienes que hacer nada: el sistema manda los dos recordatorios solo.',
  },
  {
    que: 'Le toca recordatorio',
    como: 'Pasaron los días del primer o segundo aviso. Sale de acá con un clic, o puedes llamar tú.',
  },
  {
    que: 'Se venció',
    como: 'Nadie firmó en 7 días: el contrato volvió a borrador. El inmueble SIGUE reservado hasta que canceles o lo vuelvas a mandar.',
  },
]

/** Un grupo de la lista: su título, lo que se espera de ti y sus filas. */
function Grupo({
  titulo,
  queHacer,
  teToca = false,
  children,
  'data-testid': testId,
}: {
  titulo: string
  queHacer: string
  teToca?: boolean
  children: React.ReactNode
  'data-testid': string
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{titulo}</CardTitle>
          {teToca ? (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-caption font-medium text-fg">
              Te toca
            </span>
          ) : null}
        </div>
        <p className="text-body-sm text-fg-muted">{queHacer}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

type ATiempo = NonNullable<
  NonNullable<Awaited<ReturnType<typeof invitacionApi.barrido>>>['aTiempo']
>[number]

/** «Vence el 11 de octubre de 2026 (le quedan 7 días) · Próximo recordatorio: 7 de octubre de 2026». */
export function lineaDelPlazo(a: ATiempo): string {
  if (!a.venceEl) {
    return 'Se mandó a firmar antes de que existiera el vencimiento: no vence sola. «Recordar» desde su ficha le pone los días para firmar.'
  }
  const quedan =
    a.diasQueFaltan == null
      ? ''
      : a.diasQueFaltan === 1
        ? ' (le queda 1 día)'
        : ` (le quedan ${a.diasQueFaltan} días)`
  const vence = `Vence el ${fechaLarga(diaEnColombia(a.venceEl))}${quedan}`
  if (a.esperaA !== 'INQUILINO') return vence
  const proximo = a.proximoRecordatorioEl
    ? ` · Próximo recordatorio: ${fechaLarga(diaEnColombia(a.proximoRecordatorioEl))}`
    : ''
  return `${vence} · Recordatorios: ${a.recordatoriosEnviados} de ${a.de}${proximo}`
}
