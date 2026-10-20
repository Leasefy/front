'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Buildings,
  ChatCircleText,
  CurrencyCircleDollar,
  FileText,
  HandCoins,
  HouseLine,
  IdentificationCard,
  PhoneCall,
  ShieldCheck,
  UserSwitch,
  Users,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react'
import { Alert, KeyValueList, MonoLabel } from '@leasefy/cadence'
import { adminApi, ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { NOMBRE_DEL_MODELO } from '@/lib/admin/modelo-de-cobro'
import { fmtCOP, fmtDateTime, fmtDuration, fmtFecha, fmtNumero } from '@/lib/admin/format'
import {
  ESTADO_DEL_CONTRATO,
  ESTADO_DEL_MIEMBRO,
  MIGRACION_DE_LA_INMOBILIARIA,
  MODO_DE_COBRO_DEL_PLAN,
  ROL_DEL_EQUIPO,
  estadoDelPlan,
  legible,
  metricaDeLaInmobiliaria,
  resultadoDeLaLlamada,
  tonoDelResultado,
} from '@/lib/admin/textos-del-admin'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { Pill } from '@/components/admin/Pill'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'
import { NitDeLaInmobiliaria } from '@/components/admin/NitDeLaInmobiliaria'
// DIAN-FEEL (04-10-2026): la inmobiliaria como facturador de la cuenta de FEEL de Leasefy.
import { FacturadorFeelDeLaInmobiliaria } from '@/components/admin/FacturadorFeelDeLaInmobiliaria'
import { RestablecerSegundoFactor } from '@/components/admin/RestablecerSegundoFactor'
import { AccionesDelPlan } from '@/components/admin/AccionesDelPlan'

// ---------- Types ----------

interface CounterRow {
  label: string
  value: string
}

interface RecentCall {
  id: string
  initiated_at: string
  outcome: string | null
  duration_seconds: number | null
  debtor_name: string
}

interface RecentEvent {
  id: string
  event_type: string
  timestamp: string
}

interface TenantAgency {
  agency_id: string
  tenant_id: string
  legal_name: string
  nit: string
  billing_model: string | null
  primary_contact_email: string | null
  primary_contact_phone?: string | null
  created_at: string
}

interface Miembro {
  id: string
  user_id: string | null
  nombre: string
  correo: string | null
  rol: string
  estado: string
  cargo: string | null
  desde: string
  ultima_entrada: string | null
}

/** Lo de la plataforma (back 19-10-2026). Un back anterior no lo manda. */
interface Plataforma {
  datos: {
    nombre: string
    razon_social: string | null
    nit: string | null
    ciudad: string | null
    departamento: string | null
    direccion: string | null
    telefono: string | null
    whatsapp: string | null
    correo: string | null
    correo_de_soporte: string | null
    sitio_web: string | null
    representante_legal: string | null
    matricula: string | null
    activa: boolean
    creada: string
    aprovisionamiento: string
    error_del_asistente?: string | null
    intentos_del_asistente?: number
    migracion: 'completada' | 'omitida' | 'pendiente'
    migracion_fecha: string | null
  }
  suscripcion: {
    tier: string
    nombre: string | null
    precio_mensual: number | null
    estado: string
    modo: string
    inicio_del_periodo: string | null
    fin_del_periodo: string | null
    proximo_cobro: string | null
    gracia_hasta: string | null
    cambio_pendiente: { tier: string | null; modo: string | null; desde: string | null } | null
  } | null
  conteos: {
    contratos: number
    contratos_activos: number
    contratos_por_estado: Record<string, number>
    inmuebles: number
    propietarios: number
    equipo_activo: number
  }
  equipo: Miembro[]
}

interface TenantDetail {
  agency: TenantAgency
  counters: CounterRow[]
  recentCalls: RecentCall[]
  recentEvents: RecentEvent[]
  plataforma?: Plataforma | null
  en_cobranza_por_voz?: boolean | null
}

/** Counters whose value is a COP amount (the rest are plain counts). */
const MONEY_COUNTERS = new Set(['paid_total'])

/** El ícono de cada métrica (neutro: son cifras, no botones). */
const ICONO_DE_LA_METRICA: Record<string, React.ReactNode> = {
  debtors_count: <Users />,
  calls_count: <PhoneCall />,
  calls_30d: <ChatCircleText />,
  open_promises_count: <HandCoins />,
  paid_total: <CurrencyCircleDollar />,
  open_escalations_count: <UserSwitch />,
  compliance_events_count: <ShieldCheck />,
  cartera_atrasada_count: <Wallet />,
}

/** El orden en que se cuentan los contratos. */
const ORDEN_DE_LOS_CONTRATOS = [
  'ACTIVE',
  'SIGNED',
  'PENDING_TENANT_SIGNATURE',
  'PENDING_LANDLORD_SIGNATURE',
  'REJECTED_PENDING_MODIFICATIONS',
  'DRAFT',
  'EXPIRED',
  'CANCELLED',
]

const valor = (v: React.ReactNode) => v ?? <span className="text-fg-subtle">Sin registrar</span>

/**
 * La inmobiliaria se registró pero su asistente (el micro) no se abrió: el dueño
 * vio «No pudimos abrir tu registro». Lo mismo que la lista ofrece en
 * «registros que no abrieron el asistente», aquí en su ficha (19-10-2026).
 */
function AsistenteSinAbrir({
  tenantId,
  fallo,
  motivo,
  intentos,
  alTerminar,
}: {
  tenantId: string
  fallo: boolean
  motivo: string | null
  intentos: number
  alTerminar: () => void
}) {
  const [enCurso, setEnCurso] = useState(false)
  const [respuesta, setRespuesta] = useState<{ ok: boolean; texto: string } | null>(null)

  const reintentar = async () => {
    setEnCurso(true)
    setRespuesta(null)
    try {
      await adminApi(`/tenants/${tenantId}/resend-invitation`, { method: 'POST' })
      setRespuesta({ ok: true, texto: 'El asistente respondió bien: le llegó la invitación a la inmobiliaria.' })
      alTerminar()
    } catch (e) {
      setRespuesta({
        ok: false,
        texto: e instanceof ApiError ? `El asistente volvió a fallar: ${e.message}` : 'No se pudo reintentar.',
      })
    } finally {
      setEnCurso(false)
    }
  }

  return (
    <Alert
      variant={fallo ? 'danger' : 'warning'}
      title={fallo ? 'Su asistente no se pudo abrir' : 'Su asistente todavía no se abre'}
      role="region"
      aria-label="El asistente de la inmobiliaria"
      data-testid="asistente-sin-abrir"
      className="[&_.alert-title]:text-fg"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl space-y-1 text-fg-muted">
          <p>
            El dueño vio «No pudimos abrir tu registro». «Reintentar» lo vuelve a pedir y, si funciona, le manda la
            invitación por correo.
          </p>
          <p className="text-caption">
            {motivo ? `Motivo: ${motivo}` : 'No quedó registrado el motivo.'}
            {intentos > 0 ? ` · ${intentos === 1 ? '1 intento' : `${fmtNumero(intentos)} intentos`}` : ''}
          </p>
          {respuesta ? (
            <p role="status" className={respuesta.ok ? 'text-success' : 'text-danger'}>
              {respuesta.texto}
            </p>
          ) : null}
        </div>
        <Button size="sm" variant="outline" hideArrow onClick={reintentar} disabled={enCurso}>
          {enCurso ? 'Reintentando…' : 'Reintentar'}
        </Button>
      </div>
    </Alert>
  )
}

// ---------- Page ----------

/**
 * /admin/tenants/:tenantId — la ficha de una inmobiliaria.
 *
 * 🔴 19-10-2026 (Nico: «que sí tengamos el poder de un admin para toda la
 * plataforma»). Antes era la ficha de la cobranza por voz y daba 404 para toda
 * inmobiliaria que no pasó por el agente. Ahora: sus datos, su plan, cuánto
 * maneja, su equipo (con «restablecer segundo factor» por persona), su NIT y su
 * facturación electrónica, y la cobranza por voz si la tiene.
 */
export default function TenantDetailPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params.tenantId
  const [cuentaDeSoporte, setCuentaDeSoporte] = useState<Miembro | null>(null)

  const { data, isLoading, error, refetch } = useApiQuery<TenantDetail>(
    (signal) => adminApi(`/tenants/${tenantId}`, { signal }),
    [tenantId],
  )

  if (isLoading)
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <LoadingBlock filas={8} label="Cargando la inmobiliaria" />
      </div>
    )

  // 404 — la inmobiliaria no existe
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <BackButton href="/admin/tenants" label="Volver a inmobiliarias" />
        <EmptyBlock
          icono={<Buildings weight="bold" />}
          title="No encontramos esta inmobiliaria"
          hint="Puede que el enlace esté mal copiado. Búscala en la lista."
        />
      </div>
    )
  }

  if (error)
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <ErrorBlock error={error} onReintentar={refetch} />
      </div>
    )
  if (!data) return null

  const p = data.plataforma ?? null
  const plan = p?.suscripcion ?? null
  const estadoPlan = estadoDelPlan(plan?.estado)
  const migracion = p ? MIGRACION_DE_LA_INMOBILIARIA[p.datos.migracion] : null
  const nombre = p?.datos.nombre ?? data.agency.legal_name
  const conVoz = data.en_cobranza_por_voz ?? data.counters.length > 0
  const sinMovimientoEnLaVoz =
    data.counters.every((c) => !Number(c.value)) && data.recentCalls.length === 0 && data.recentEvents.length === 0

  const callColumns: Column<RecentCall>[] = [
    {
      header: 'Deudor',
      cell: (r) => (
        <Link
          href={`/admin/calls/${r.id}`}
          className="font-medium text-fg underline-offset-4 transition-colors hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {r.debtor_name}
        </Link>
      ),
    },
    {
      header: 'Resultado',
      cell: (r) => <Pill tone={tonoDelResultado(r.outcome)}>{resultadoDeLaLlamada(r.outcome)}</Pill>,
    },
    {
      header: 'Duración',
      align: 'right',
      cell: (r) => <span className="tabular-nums text-fg-muted">{fmtDuration(r.duration_seconds)}</span>,
    },
    {
      header: 'Cuándo',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap text-caption tabular-nums text-fg-subtle">{fmtDateTime(r.initiated_at)}</span>
      ),
    },
  ]

  const eventColumns: Column<RecentEvent>[] = [
    { header: 'Evento', cell: (r) => <span className="text-fg">{legible(r.event_type)}</span> },
    {
      header: 'Cuándo',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap text-caption tabular-nums text-fg-subtle">{fmtDateTime(r.timestamp)}</span>
      ),
    },
  ]

  const equipoColumns: Column<Miembro>[] = [
    {
      header: 'Persona',
      className: 'min-w-[200px]',
      cell: (m) => (
        <div className="min-w-0">
          <div className="font-medium text-fg">{m.nombre}</div>
          <div className="truncate text-caption text-fg-subtle">{m.correo ?? 'Sin correo'}</div>
        </div>
      ),
    },
    {
      header: 'Rol',
      cell: (m) => (
        <div>
          <span className="text-body-sm text-fg">{ROL_DEL_EQUIPO[m.rol] ?? legible(m.rol)}</span>
          {m.cargo ? <div className="text-caption text-fg-subtle">{m.cargo}</div> : null}
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (m) => {
        const e = ESTADO_DEL_MIEMBRO[m.estado] ?? { nombre: legible(m.estado), tono: 'muted' as const }
        return <Pill tone={e.tono}>{e.nombre}</Pill>
      },
    },
    {
      header: 'Última entrada',
      align: 'right',
      cell: (m) => (
        <span className="whitespace-nowrap text-caption tabular-nums text-fg-muted">
          {m.ultima_entrada ? fmtDateTime(m.ultima_entrada) : m.user_id ? 'Nunca' : 'Sin cuenta todavía'}
        </span>
      ),
    },
    {
      header: '',
      align: 'right',
      cell: (m) =>
        m.user_id && m.correo ? (
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            onClick={(e) => {
              e.stopPropagation()
              setCuentaDeSoporte(m)
            }}
            aria-label={`Segundo factor de ${m.nombre}`}
          >
            Segundo factor
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/tenants" label="Volver a inmobiliarias" />
      <PageHeader
        title={nombre}
        description={
          // El NIT vive en su tarjeta (la de Leasefy y la del micro): acá quedaría
          // viejo después de corregirlo.
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {p?.datos.razon_social && p.datos.razon_social !== nombre ? <span>{p.datos.razon_social}</span> : null}
            {p?.datos.ciudad ? <span>{[p.datos.ciudad, p.datos.departamento].filter(Boolean).join(', ')}</span> : null}
            {p ? (
              <Pill tone={estadoPlan.tono} dot>
                {plan ? `${plan.nombre ?? plan.tier} · ${estadoPlan.nombre}` : 'Sin plan'}
              </Pill>
            ) : null}
            {migracion ? <Pill tone={migracion.tono}>{migracion.nombre}</Pill> : null}
            {p && !p.datos.activa ? <Pill tone="muted">Inactiva</Pill> : null}
            {!p ? <Pill tone="warn">Sólo existe en la cobranza por voz</Pill> : null}
          </span>
        }
      />

      {p && p.datos.aprovisionamiento !== 'ACTIVE' ? (
        <AsistenteSinAbrir
          tenantId={tenantId}
          fallo={p.datos.aprovisionamiento === 'FAILED'}
          motivo={p.datos.error_del_asistente ?? null}
          intentos={p.datos.intentos_del_asistente ?? 0}
          alTerminar={refetch}
        />
      ) : null}

      {p ? (
        <>
          {/* Lo que maneja en la plataforma. */}
          <section aria-label="La inmobiliaria en Leasefy" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard
              label="Contratos vigentes"
              value={p.conteos.contratos_activos}
              hint={p.conteos.contratos ? `de ${fmtNumero(p.conteos.contratos)} en total` : undefined}
              icon={<FileText />}
            />
            <KpiCard label="Inmuebles" value={p.conteos.inmuebles} icon={<HouseLine />} />
            <KpiCard label="Propietarios" value={p.conteos.propietarios} icon={<IdentificationCard />} />
            <KpiCard
              label="Equipo activo"
              value={p.conteos.equipo_activo}
              hint={
                p.equipo.length !== p.conteos.equipo_activo
                  ? `${fmtNumero(p.equipo.length)} con invitados y desactivados`
                  : undefined
              }
              icon={<UsersThree />}
            />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Tarjeta titulo="Datos de la inmobiliaria">
              <KeyValueList
                items={[
                  { label: 'Razón social', value: valor(p.datos.razon_social) },
                  { label: 'Correo', value: valor(p.datos.correo) },
                  { label: 'Correo de soporte', value: valor(p.datos.correo_de_soporte) },
                  { label: 'Teléfono', value: valor(p.datos.telefono) },
                  { label: 'WhatsApp', value: valor(p.datos.whatsapp) },
                  { label: 'Dirección', value: valor(p.datos.direccion) },
                  { label: 'Representante legal', value: valor(p.datos.representante_legal) },
                  { label: 'Matrícula', value: valor(p.datos.matricula) },
                  { label: 'Sitio web', value: valor(p.datos.sitio_web) },
                  { label: 'Se registró', value: fmtFecha(p.datos.creada) },
                  {
                    label: 'Migración',
                    value: p.datos.migracion_fecha
                      ? `${migracion?.nombre} · ${fmtFecha(p.datos.migracion_fecha)}`
                      : migracion?.nombre,
                  },
                ]}
              />
            </Tarjeta>

            <Tarjeta
              titulo="Plan"
              descripcion={
                plan ? undefined : 'No tiene suscripción: todavía no eligió un plan o se registró antes de los planes.'
              }
            >
              {plan ? (
                <KeyValueList
                  items={[
                    { label: 'Plan', value: plan.nombre ?? plan.tier },
                    {
                      label: 'Estado',
                      value: (
                        <Pill tone={estadoPlan.tono} dot>
                          {estadoPlan.nombre}
                        </Pill>
                      ),
                    },
                    { label: 'Cobro', value: MODO_DE_COBRO_DEL_PLAN[plan.modo] ?? legible(plan.modo) },
                    {
                      label: 'Precio',
                      value: plan.precio_mensual != null ? `${fmtCOP(plan.precio_mensual)} al mes` : 'Sin precio en el catálogo',
                    },
                    {
                      label: 'Período actual',
                      value:
                        plan.inicio_del_periodo || plan.fin_del_periodo
                          ? `${fmtFecha(plan.inicio_del_periodo)} al ${fmtFecha(plan.fin_del_periodo)}`
                          : valor(null),
                    },
                    { label: 'Próximo cobro', value: valor(plan.proximo_cobro ? fmtFecha(plan.proximo_cobro) : null) },
                    ...(plan.gracia_hasta ? [{ label: 'Gracia hasta', value: fmtFecha(plan.gracia_hasta) }] : []),
                    ...(plan.cambio_pendiente
                      ? [
                          {
                            label: 'Cambio programado',
                            value: [
                              plan.cambio_pendiente.tier ? `Plan ${plan.cambio_pendiente.tier}` : null,
                              plan.cambio_pendiente.modo ? MODO_DE_COBRO_DEL_PLAN[plan.cambio_pendiente.modo] : null,
                              plan.cambio_pendiente.desde ? `desde ${fmtFecha(plan.cambio_pendiente.desde)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · '),
                          },
                        ]
                      : []),
                  ]}
                />
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border-faint pt-4">
                <AccionesDelPlan
                  tenantId={tenantId}
                  nombre={nombre}
                  estado={plan?.estado ?? null}
                  planActual={plan?.tier ?? null}
                  alTerminar={refetch}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="ghost" hideArrow>
                  <Link href={`/admin/inmuebles?agencyId=${tenantId}`}>Ver sus inmuebles</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" hideArrow>
                  <Link href="/admin/modulos-pagos">Módulos</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" hideArrow>
                  <Link href="/admin/piloto">Piloto automático</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" hideArrow>
                  <Link href="/admin/plans">Catálogo de planes</Link>
                </Button>
              </div>
            </Tarjeta>
          </div>

          {p.conteos.contratos > 0 ? (
            <Tarjeta titulo="Contratos" descripcion="Todos los contratos de la inmobiliaria, por estado.">
              <ul className="flex flex-wrap gap-2" aria-label="Contratos por estado">
                {ORDEN_DE_LOS_CONTRATOS.filter((e) => p.conteos.contratos_por_estado[e]).map((e) => (
                  <li
                    key={e}
                    className="flex items-baseline gap-2 rounded-full border border-border bg-bg px-3.5 py-1.5 text-body-sm"
                  >
                    <span className="text-fg-muted">{ESTADO_DEL_CONTRATO[e] ?? legible(e)}</span>
                    <span className="font-medium tabular-nums text-fg">
                      {fmtNumero(p.conteos.contratos_por_estado[e])}
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          ) : null}

          <section className="space-y-3" aria-label="Equipo">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-subtitle font-semibold text-fg">Equipo</h2>
              <MonoLabel>{fmtNumero(p.equipo.length)} personas</MonoLabel>
            </div>
            <DataTable
              columns={equipoColumns}
              rows={p.equipo}
              getKey={(m) => m.id}
              emptyTitle="Sin equipo"
              emptyHint="Nadie de esta inmobiliaria tiene cuenta todavía."
              emptyIcon={<UsersThree weight="bold" />}
              aria-label="Equipo de la inmobiliaria"
            />
          </section>
        </>
      ) : null}

      {/* El NIT del back (la fuente) y su corrección. */}
      {p ? <NitDeLaInmobiliaria tenantId={tenantId} /> : null}

      {p ? <FacturadorFeelDeLaInmobiliaria tenantId={tenantId} /> : null}

      {/* La cobranza por voz, si la tiene. */}
      <section className="space-y-4" aria-label="Cobranza por voz">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-subtitle font-semibold text-fg">Cobranza por voz</h2>
          {conVoz && data.agency.billing_model ? (
            <Pill tone="neutral">
              Cobro{' '}
              {(NOMBRE_DEL_MODELO as Record<string, string>)[data.agency.billing_model]?.toLowerCase() ??
                legible(data.agency.billing_model)}
            </Pill>
          ) : null}
        </div>
        {data.en_cobranza_por_voz === null ? (
          <EmptyBlock
            icono={<PhoneCall weight="bold" />}
            title="No pudimos leer la cobranza por voz"
            hint="La base del asistente no respondió. Lo demás de la ficha es de la plataforma y está al día."
          />
        ) : !conVoz ? (
          <EmptyBlock
            icono={<PhoneCall weight="bold" />}
            title="No tiene la cobranza por voz"
            hint="Esta inmobiliaria no está conectada al asistente de cobranza (Mori): no tiene deudores ni llamadas."
          />
        ) : sinMovimientoEnLaVoz ? (
          // Conectada pero sin nada: ocho tarjetas en cero y dos tablas vacías no dicen más que esto.
          <EmptyBlock
            icono={<PhoneCall weight="bold" />}
            title="Conectada, todavía sin deudores"
            hint="La inmobiliaria está en la cobranza por voz (Mori), pero no tiene deudores cargados ni llamadas. Cuando empiece, acá salen sus cifras."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.counters.map((c) => (
                <KpiCard
                  key={c.label}
                  label={metricaDeLaInmobiliaria(c.label)}
                  value={MONEY_COUNTERS.has(c.label) ? fmtCOP(Number(c.value)) : Number(c.value)}
                  icon={ICONO_DE_LA_METRICA[c.label]}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="space-y-3">
                <MonoLabel className="block">Últimas llamadas</MonoLabel>
                <DataTable
                  columns={callColumns}
                  rows={data.recentCalls}
                  getKey={(r) => r.id}
                  emptyTitle="Todavía no hay llamadas"
                  aria-label="Últimas llamadas"
                />
              </section>
              <section className="space-y-3">
                <MonoLabel className="block">Eventos de cumplimiento recientes</MonoLabel>
                <DataTable
                  columns={eventColumns}
                  rows={data.recentEvents}
                  getKey={(r) => r.id}
                  emptyTitle="Sin eventos todavía"
                  aria-label="Eventos de cumplimiento"
                />
              </section>
            </div>
          </>
        )}
      </section>

      <Cajon abierto={cuentaDeSoporte !== null} onOpenChange={(a) => (a ? null : setCuentaDeSoporte(null))}>
        <CajonCabecera
          titulo={cuentaDeSoporte ? `Segundo factor de ${cuentaDeSoporte.nombre}` : 'Segundo factor'}
          descripcion="Para quien perdió su app de autenticación y tampoco puede usar el código por correo del login."
        />
        <CajonCuerpo>
          {cuentaDeSoporte?.correo ? (
            <RestablecerSegundoFactor key={cuentaDeSoporte.id} correoInicial={cuentaDeSoporte.correo} sinTarjeta />
          ) : null}
        </CajonCuerpo>
      </Cajon>
    </div>
  )
}
