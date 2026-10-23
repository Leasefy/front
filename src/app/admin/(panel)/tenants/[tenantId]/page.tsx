'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Buildings, PhoneCall, UsersThree } from '@phosphor-icons/react'
import { Alert, Cifra, FranjaDeCifras, KeyValueList } from '@leasefy/cadence'
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
import { CifraHeroe, type TramoDeLaCifra } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { PestanasDeLaFicha } from '@/components/pantalla/PestanasDeLaFicha'
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

/** El tono de cada estado del contrato en la barra: lo vigente en verde, lo que espera una firma en ámbar. */
const TONO_DEL_CONTRATO: Record<string, TramoDeLaCifra['tono']> = {
  ACTIVE: 'exito',
  SIGNED: 'exito',
  PENDING_TENANT_SIGNATURE: 'aviso',
  PENDING_LANDLORD_SIGNATURE: 'aviso',
  REJECTED_PENDING_MODIFICATIONS: 'aviso',
}

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
        <ErrorBlock
          error={error}
          onReintentar={refetch}
          titulo="No pudimos abrir esta inmobiliaria"
          volverA={{ label: 'Volver a inmobiliarias', href: '/admin/tenants' }}
        />
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
      cell: (r) => <span className="font-mono tabular-nums text-fg-muted">{fmtDuration(r.duration_seconds)}</span>,
    },
    {
      header: 'Cuándo',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.initiated_at)}</span>
      ),
    },
  ]

  const eventColumns: Column<RecentEvent>[] = [
    { header: 'Evento', cell: (r) => <span className="text-fg">{legible(r.event_type)}</span> },
    {
      header: 'Cuándo',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.timestamp)}</span>
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
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">
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

  const contador = (clave: string) => {
    const c = data.counters.find((x) => x.label === clave)
    return c ? Number(c.value) || 0 : null
  }
  const CONTADORES_A_LA_VISTA = new Set([
    'paid_total',
    'debtors_count',
    'calls_30d',
    'calls_count',
    'open_promises_count',
    'open_escalations_count',
    'cartera_atrasada_count',
  ])
  const otrosContadores = data.counters.filter((c) => !CONTADORES_A_LA_VISTA.has(c.label))

  const tramosDeLosContratos: TramoDeLaCifra[] = p
    ? ORDEN_DE_LOS_CONTRATOS.map((e) => ({
        clave: e,
        etiqueta: ESTADO_DEL_CONTRATO[e] ?? legible(e),
        monto: p.conteos.contratos_por_estado[e] ?? 0,
        tono: TONO_DEL_CONTRATO[e] ?? 'neutro',
        cifra: fmtNumero(p.conteos.contratos_por_estado[e] ?? 0),
      }))
    : []

  const resumen = p ? (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <CifraHeroe
          rotulo="Contratos vigentes"
          cifra={fmtNumero(p.conteos.contratos_activos)}
          contexto={
            p.conteos.contratos > 0
              ? `de ${fmtNumero(p.conteos.contratos)} ${p.conteos.contratos === 1 ? 'contrato' : 'contratos'} en Leasefy`
              : 'todavía no tiene contratos en Leasefy'
          }
          tramos={tramosDeLosContratos}
          total={p.conteos.contratos}
          data-testid="ficha-inmobiliaria-contratos"
        />
      </div>
      <FranjaDeCifras fila="md" columnas={3} aria-label="La inmobiliaria en Leasefy">
        <Cifra etiqueta="Inmuebles" valor={p.conteos.inmuebles} />
        <Cifra etiqueta="Propietarios" valor={p.conteos.propietarios} />
        <Cifra
          etiqueta="Equipo activo"
          valor={p.conteos.equipo_activo}
          detalle={
            p.equipo.length !== p.conteos.equipo_activo
              ? `${fmtNumero(p.equipo.length)} con invitados y desactivados`
              : undefined
          }
        />
      </FranjaDeCifras>
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
    </div>
  ) : null

  const planDeLaInmobiliaria = p ? (
    <div className="space-y-6">
      <Tarjeta
        titulo={plan ? `Plan ${plan.nombre ?? plan.tier}` : 'Sin plan'}
        descripcion={
          plan ? undefined : 'No tiene suscripción: todavía no eligió un plan o se registró antes de los planes.'
        }
        acciones={
          plan ? (
            <Pill tone={estadoPlan.tono} dot>
              {estadoPlan.nombre}
            </Pill>
          ) : null
        }
      >
        {plan ? (
          <KeyValueList
            items={[
              { label: 'Cobro', value: MODO_DE_COBRO_DEL_PLAN[plan.modo] ?? legible(plan.modo) },
              {
                label: 'Precio',
                value:
                  plan.precio_mensual != null ? (
                    <span>
                      <span className="font-mono tabular-nums">{fmtCOP(plan.precio_mensual)}</span> al mes
                    </span>
                  ) : (
                    'Sin precio en el catálogo'
                  ),
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
        <div className={plan ? 'mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border-faint pt-4' : 'flex flex-wrap gap-x-4 gap-y-2'}>
          <span className="text-caption text-fg-muted">Ver también:</span>
          <Link href="/admin/modulos-pagos" className="text-caption text-fg underline-offset-4 hover:underline">
            Módulos
          </Link>
          <Link href="/admin/piloto" className="text-caption text-fg underline-offset-4 hover:underline">
            Piloto automático
          </Link>
          <Link href="/admin/plans" className="text-caption text-fg underline-offset-4 hover:underline">
            Catálogo de planes
          </Link>
        </div>
      </Tarjeta>
    </div>
  ) : null

  const equipo = p ? (
    <DataTable
      columns={equipoColumns}
      rows={p.equipo}
      getKey={(m) => m.id}
      queSon={['persona', 'personas']}
      buscar="Nombre o correo"
      textoExtra={(m) => [m.nombre, m.correo, m.cargo].filter(Boolean).join(' ')}
      emptyTitle="Sin equipo"
      emptyHint="Nadie de esta inmobiliaria tiene cuenta todavía."
      emptyIcon={<UsersThree weight="duotone" />}
      aria-label="Equipo de la inmobiliaria"
    />
  ) : null

  const facturacion = p ? (
    <div className="space-y-6">
      {/* El NIT del back (la fuente) y su corrección. */}
      <NitDeLaInmobiliaria tenantId={tenantId} />
      <FacturadorFeelDeLaInmobiliaria tenantId={tenantId} />
    </div>
  ) : null

  const pagado = contador('paid_total') ?? 0
  const deudores = contador('debtors_count')
  const llamadas30 = contador('calls_30d')
  const escalacionesAbiertas = contador('open_escalations_count')
  const cobranza =
    data.en_cobranza_por_voz === null ? (
      <EmptyBlock
        icono={<PhoneCall weight="duotone" />}
        tono="neutro"
        title="No pudimos leer la cobranza por voz"
        hint="La base del asistente no respondió. Lo demás de la ficha es de la plataforma y está al día."
        accion={
          <Button variant="outline" size="sm" hideArrow onClick={refetch}>
            Intentar de nuevo
          </Button>
        }
      />
    ) : !conVoz ? (
      <EmptyBlock
        icono={<PhoneCall weight="duotone" />}
        tono="neutro"
        title="No tiene la cobranza por voz"
        hint="Esta inmobiliaria no está conectada al asistente de cobranza (Mori): no tiene deudores ni llamadas."
      />
    ) : sinMovimientoEnLaVoz ? (
      // Conectada pero sin nada: ocho tarjetas en cero y dos tablas vacías no dicen más que esto.
      <EmptyBlock
        icono={<PhoneCall weight="duotone" />}
        title="Conectada, todavía sin deudores"
        hint="La inmobiliaria está en la cobranza por voz (Mori), pero no tiene deudores cargados ni llamadas. Cuando empiece, aquí salen sus cifras."
      />
    ) : (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Recaudado por Mori"
            cifra={fmtCOP(pagado)}
            contexto={[
              deudores != null ? `${fmtNumero(deudores)} ${deudores === 1 ? 'deudor' : 'deudores'}` : null,
              llamadas30 != null ? `${fmtNumero(llamadas30)} ${llamadas30 === 1 ? 'llamada' : 'llamadas'} en 30 días` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            pie={
              data.agency.billing_model
                ? `Cobro ${
                    (NOMBRE_DEL_MODELO as Record<string, string>)[data.agency.billing_model]?.toLowerCase() ??
                    legible(data.agency.billing_model).toLowerCase()
                  }.`
                : undefined
            }
            data-testid="ficha-inmobiliaria-cobranza"
          />
        </div>
        <FranjaDeCifras fila="md" aria-label="La cobranza por voz en cifras">
          <Cifra etiqueta="Llamadas en total" valor={contador('calls_count') ?? '—'} />
          <Cifra etiqueta="Promesas abiertas" valor={contador('open_promises_count') ?? '—'} />
          <Cifra
            etiqueta="Escalaciones abiertas"
            valor={escalacionesAbiertas ?? '—'}
            tono={escalacionesAbiertas ? 'aviso' : undefined}
          />
          <Cifra etiqueta="Cartera atrasada" valor={contador('cartera_atrasada_count') ?? '—'} />
        </FranjaDeCifras>
        <section className="space-y-3" aria-label="Últimas llamadas">
          <h2 className="text-subtitle font-medium text-fg">Últimas llamadas</h2>
          <DataTable
            id="llamadas"
            columns={callColumns}
            rows={data.recentCalls}
            getKey={(r) => r.id}
            paginar={false}
            emptyTitle="Todavía no hay llamadas"
            aria-label="Últimas llamadas"
          />
        </section>
        <MasDetalles etiqueta="Ver los eventos de cumplimiento" etiquetaAbierto="Ocultar los eventos de cumplimiento">
          <div className="space-y-4">
            {otrosContadores.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                {otrosContadores.map((c) => (
                  <div key={c.label} className="space-y-0.5">
                    <dt className="text-caption text-fg-muted">{metricaDeLaInmobiliaria(c.label)}</dt>
                    <dd className="font-mono text-body tabular-nums text-fg">
                      {MONEY_COUNTERS.has(c.label) ? fmtCOP(Number(c.value)) : fmtNumero(Number(c.value))}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <DataTable
              id="eventos"
              columns={eventColumns}
              rows={data.recentEvents}
              getKey={(r) => r.id}
              paginar={false}
              emptyTitle="Sin eventos todavía"
              aria-label="Eventos de cumplimiento"
            />
          </div>
        </MasDetalles>
      </div>
    )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/tenants" label="Volver a inmobiliarias" />
      <PageHeader
        title={nombre}
        description={
          // El NIT vive en su tarjeta (la de Leasefy y la del micro): acá quedaría
          // viejo después de corregirlo.
          [
            p?.datos.razon_social && p.datos.razon_social !== nombre ? p.datos.razon_social : null,
            p?.datos.ciudad ? [p.datos.ciudad, p.datos.departamento].filter(Boolean).join(', ') : null,
            migracion?.nombre ?? null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        junto={
          <span className="flex flex-wrap items-center gap-1.5">
            {p ? (
              <Pill tone={estadoPlan.tono} dot>
                {plan ? `${plan.nombre ?? plan.tier} · ${estadoPlan.nombre}` : 'Sin plan'}
              </Pill>
            ) : (
              <Pill tone="warn">Sólo existe en la cobranza por voz</Pill>
            )}
            {p && !p.datos.activa ? <Pill tone="muted">Inactiva</Pill> : null}
          </span>
        }
        acciones={
          p ? (
            <>
              <Button asChild size="sm" variant="outline" hideArrow>
                <Link href={`/admin/inmuebles?agencyId=${tenantId}`}>Ver sus inmuebles</Link>
              </Button>
              <AccionesDelPlan
                tenantId={tenantId}
                nombre={nombre}
                estado={plan?.estado ?? null}
                planActual={plan?.tier ?? null}
                alTerminar={refetch}
              />
            </>
          ) : undefined
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

      {/* Glow up 22-10: la ficha por tarea, en pestañas (como las fichas del panel): lo que se consulta
          (Resumen), lo que se administra (Plan, Equipo, Facturación) y la cobranza por voz. Antes era una
          sola columna larga con 12 cifras del mismo peso. */}
      {p ? (
        <PestanasDeLaFicha
          etiqueta="Secciones de la inmobiliaria"
          pestanas={[
            { id: 'resumen', etiqueta: 'Resumen', contenido: resumen },
            { id: 'plan', etiqueta: 'Plan', contenido: planDeLaInmobiliaria },
            { id: 'equipo', etiqueta: 'Equipo', cuenta: p.equipo.length, contenido: equipo },
            { id: 'facturacion', etiqueta: 'NIT y facturación', contenido: facturacion },
            { id: 'cobranza', etiqueta: 'Cobranza por voz', contenido: cobranza },
          ]}
        />
      ) : (
        cobranza
      )}

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
