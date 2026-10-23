'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime, fmtFecha, fmtNumero } from '@/lib/admin/format'
import { estadoDelPlan } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { CifraHeroe, type TramoDeLaCifra } from '@/components/pantalla/CifraHeroe'
import { PestanasDeLaFicha } from '@/components/pantalla/PestanasDeLaFicha'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'
import {
  dioElPaso,
  loQueLeFalta,
  PASOS,
  type Paso,
  type RecorridoDeLaInmobiliaria,
} from '@/lib/admin/recorrido-de-la-inmobiliaria'

// ── Lo que manda `GET /api/v1/admin/onboarding` ───────────────────────────────

/** Un registro que empezó el asistente y no lo terminó (`agent.onboarding_sessions`). */
interface RegistroAMedias {
  id: string
  created_at: string
  expires_at: string
  legal_name: string | null
}

/** La cobranza por voz de una inmobiliaria: cuándo llamó y cobró Mori por primera vez. */
interface ArranqueDeLaCobranza {
  tenant_id: string
  legal_name: string
  created_at: string
  first_call: string | null
  first_payment: string | null
}

interface RespuestaDelOnboarding {
  inFlight: RegistroAMedias[]
  liveAgencies: ArranqueDeLaCobranza[]
  /** `null`: no se pudo leer la plataforma. Un back anterior no lo manda. */
  plataforma?: RecorridoDeLaInmobiliaria[] | null
}

const ASISTENTE: Record<string, { nombre: string; tono: PillTone }> = {
  ACTIVE: { nombre: 'Abierto', tono: 'ok' },
  PENDING: { nombre: 'Sin abrir', tono: 'warn' },
  FAILED: { nombre: 'No se pudo abrir', tono: 'bad' },
}

const FILTRO_DE_PASO = [
  ...PASOS.map((p) => ({ valor: p.paso, nombre: `Les falta: ${p.falta.toLowerCase()}` })),
  { valor: 'listas', nombre: 'Ya hicieron todo' },
]


const fecha = (iso: string | null) =>
  iso ? (
    <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtFecha(iso)}</span>
  ) : (
    <span className="text-caption text-fg-subtle">Todavía no</span>
  )

// ── La pantalla ───────────────────────────────────────────────────────────────

/**
 * /admin/onboarding — cómo arranca cada inmobiliaria.
 *
 * 🔴 19-10-2026 (QA del admin, Nico: «que sí traiga la información de cada
 * cosa»). Antes era el embudo de la cobranza por voz (primera llamada, primer
 * pago) en inglés («funnel», «stage», «configured»). Ahora es el recorrido en
 * la plataforma: se registró → abrió su asistente → eligió plan → resolvió la
 * migración → primer contrato → primer recibo. La cobranza por voz queda abajo.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { get, setFilters } = useUrlFilters()
  const paso = get('paso')

  const { data, isLoading, error, refetch } = useApiQuery<RespuestaDelOnboarding>(
    (signal) => adminApi('/onboarding', { signal }),
    [],
  )

  const recorridos = data?.plataforma ?? undefined
  const filtrar = useMemo(
    () => (r: RecorridoDeLaInmobiliaria) =>
      !paso ? true : paso === 'listas' ? loQueLeFalta(r) === null : !dioElPaso(r, paso as Paso),
    [paso],
  )

  // Dónde va cada una: el PRIMER paso que le falta (una partición: cada inmobiliaria cae en un solo tramo).
  const dondeVan = useMemo(() => {
    const filas = recorridos ?? []
    const porPaso = PASOS.map((p) => ({ ...p, cuantas: filas.filter((r) => loQueLeFalta(r)?.paso === p.paso).length }))
    return { porPaso, listas: filas.filter((r) => loQueLeFalta(r) === null).length }
  }, [recorridos])
  const registradas = recorridos?.length ?? 0

  const columnas: Column<RecorridoDeLaInmobiliaria>[] = [
    {
      header: 'Inmobiliaria',
      className: 'min-w-[200px]',
      orden: (r) => r.se_registro,
      ordenPrimero: 'desc',
      texto: (r) => r.nombre,
      cell: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-fg">{r.nombre}</div>
          <div className="text-caption text-fg-subtle">Se registró el {fmtFecha(r.se_registro)}</div>
        </div>
      ),
    },
    {
      header: 'Asistente',
      orden: (r) => r.asistente.estado,
      texto: (r) => (ASISTENTE[r.asistente.estado] ?? { nombre: 'Otro estado' }).nombre,
      cell: (r) => {
        const a = ASISTENTE[r.asistente.estado] ?? { nombre: 'Otro estado', tono: 'muted' as const }
        return (
          <div className="flex flex-col items-start gap-1">
            <Pill tone={a.tono} dot>
              {a.nombre}
            </Pill>
            {r.asistente.fecha ? fecha(r.asistente.fecha) : null}
          </div>
        )
      },
    },
    {
      header: 'Plan',
      orden: (r) => r.plan?.nombre ?? r.plan?.tier,
      texto: (r) => (r.plan ? `${r.plan.nombre ?? r.plan.tier} · ${estadoDelPlan(r.plan.estado).nombre}` : 'Sin plan'),
      cell: (r) => {
        if (!r.plan) return <Pill tone="muted">Sin plan</Pill>
        const e = estadoDelPlan(r.plan.estado)
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="text-body-sm text-fg">{r.plan.nombre ?? r.plan.tier}</span>
            <Pill tone={e.tono} dot>
              {e.nombre}
            </Pill>
          </div>
        )
      },
    },
    {
      header: 'Migración',
      orden: (r) => r.migracion?.fecha,
      texto: (r) => (r.migracion ? (r.migracion.estado === 'completada' ? 'Completa' : 'La saltó') : 'Pendiente'),
      cell: (r) =>
        r.migracion ? (
          <div className="flex flex-col items-start gap-1">
            <span className="text-body-sm text-fg">
              {r.migracion.estado === 'completada' ? 'Completa' : 'La saltó'}
            </span>
            {fecha(r.migracion.fecha)}
          </div>
        ) : (
          <span className="text-caption text-fg-subtle">Pendiente</span>
        ),
    },
    { header: 'Primer contrato', orden: (r) => r.primer_contrato, ordenPrimero: 'desc', texto: (r) => (r.primer_contrato ? fmtFecha(r.primer_contrato) : 'Todavía no'), cell: (r) => fecha(r.primer_contrato) },
    { header: 'Primer recibo', orden: (r) => r.primer_recibo, ordenPrimero: 'desc', texto: (r) => (r.primer_recibo ? fmtFecha(r.primer_recibo) : 'Todavía no'), cell: (r) => fecha(r.primer_recibo) },
    {
      header: 'Equipo',
      align: 'right',
      orden: (r) => r.equipo,
      ordenPrimero: 'desc',
      texto: (r) => r.equipo,
      cell: (r) => <span className="font-mono tabular-nums">{fmtNumero(r.equipo)}</span>,
    },
    {
      header: 'Le falta',
      orden: (r) => {
        const falta = loQueLeFalta(r)
        return falta ? PASOS.findIndex((p) => p.paso === falta.paso) : 99
      },
      texto: (r) => loQueLeFalta(r)?.falta ?? 'Todo listo',
      cell: (r) => {
        const falta = loQueLeFalta(r)
        return falta ? (
          <span className="whitespace-nowrap text-body-sm text-fg">{falta.falta}</span>
        ) : (
          <Pill tone="ok" dot>
            Todo listo
          </Pill>
        )
      },
    },
  ]

  const columnasAMedias: Column<RegistroAMedias>[] = [
    {
      header: 'Inmobiliaria',
      orden: (r) => r.legal_name,
      texto: (r) => r.legal_name ?? 'Todavía sin nombre',
      cell: (r) =>
        r.legal_name ? (
          <span className="font-medium text-fg">{r.legal_name}</span>
        ) : (
          <span className="text-fg-subtle">Todavía sin nombre</span>
        ),
    },
    { header: 'Empezó', orden: (r) => r.created_at, ordenPrimero: 'desc', texto: (r) => fmtDateTime(r.created_at), cell: (r) => <span className="font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.created_at)}</span> },
    { header: 'Se vence', orden: (r) => r.expires_at, texto: (r) => fmtDateTime(r.expires_at), cell: (r) => <span className="font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.expires_at)}</span> },
  ]

  const columnasDeLaVoz: Column<ArranqueDeLaCobranza>[] = [
    { header: 'Inmobiliaria', orden: (r) => r.legal_name, texto: (r) => r.legal_name, cell: (r) => <span className="font-medium text-fg">{r.legal_name}</span> },
    { header: 'Se conectó', orden: (r) => r.created_at, ordenPrimero: 'desc', texto: (r) => fmtFecha(r.created_at), cell: (r) => fecha(r.created_at) },
    { header: 'Primera llamada', orden: (r) => r.first_call, ordenPrimero: 'desc', texto: (r) => (r.first_call ? fmtFecha(r.first_call) : 'Todavía no'), cell: (r) => fecha(r.first_call) },
    { header: 'Primer pago', orden: (r) => r.first_payment, ordenPrimero: 'desc', texto: (r) => (r.first_payment ? fmtFecha(r.first_payment) : 'Todavía no'), cell: (r) => fecha(r.first_payment) },
    {
      header: 'Va en',
      orden: (r) => (r.first_payment ? 2 : r.first_call ? 1 : 0),
      texto: (r) => (r.first_payment ? 'Ya cobró' : r.first_call ? 'Ya llamó' : 'Conectada'),
      cell: (r) =>
        r.first_payment ? (
          <Pill tone="ok" dot>
            Ya cobró
          </Pill>
        ) : r.first_call ? (
          <Pill tone="neutral" dot>
            Ya llamó
          </Pill>
        ) : (
          <Pill tone="neutral">Conectada</Pill>
        ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Inmobiliarias nuevas"
        description="Cómo arranca cada inmobiliaria, del asistente a operar. Toca una para ver su ficha."
      />

      {data && data.plataforma === null ? (
        <Alert variant="warning" title="No pudimos leer las inmobiliarias de la plataforma">
          Abajo sale lo del asistente y la cobranza por voz, que se lee aparte.
        </Alert>
      ) : null}

      {/* Glow up 22-10: LA RESPUESTA (cuántas ya operan: dieron los cinco pasos) con la barra de dónde se quedó
          cada una; antes, 5 tarjetas del mismo peso con barras azules que repetían el filtro «Dónde van». */}
      {recorridos && registradas > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Ya operan"
            cifra={fmtNumero(dondeVan.listas)}
            contexto={`de las ${fmtNumero(registradas)} inmobiliarias más recientes`}
            tramos={[
              { clave: 'listas', etiqueta: 'Ya operan', monto: dondeVan.listas, tono: 'exito' as const, cifra: fmtNumero(dondeVan.listas), siempre: true },
              ...dondeVan.porPaso.map(
                (p): TramoDeLaCifra => ({
                  clave: p.paso,
                  etiqueta: `Les falta: ${p.falta.toLowerCase()}`,
                  monto: p.cuantas,
                  tono: p.paso === 'asistente' ? 'critico' : 'neutro',
                  cifra: fmtNumero(p.cuantas),
                }),
              ),
            ]}
            total={registradas}
            pie="Cada una cuenta en el primer paso que le falta. Filtra la tabla con «Dónde van»."
            data-testid="onboarding-terminaron"
          />
        </div>
      ) : null}

      <PestanasDeLaFicha
        etiqueta="Secciones del onboarding"
        pestanas={[
          {
            id: 'recorrido',
            etiqueta: 'En la plataforma',
            cuenta: recorridos?.length ?? null,
            contenido: (
      <DataTable
        columns={columnas}
        rows={recorridos}
        getKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle={data && data.plataforma === null ? 'No pudimos leer las inmobiliarias de la plataforma' : 'Todavía no hay inmobiliarias'}
        emptyHint={data && data.plataforma === null ? 'Prueba de nuevo en un momento; lo de arriba se lee aparte.' : 'Cuando una se registre, aparece aquí.'}
        id="recorrido"
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar inmobiliaria"
        filtrar={filtrar}
        filtrosEnLaUrl={['paso']}
        ordenInicial={{ columna: 0, sentido: 'desc' }}
        exportar="recorrido-de-las-inmobiliarias"
        emptyIcon={<Rocket weight="duotone" />}
        aria-label="Recorrido de cada inmobiliaria"
        onRowClick={(r) => router.push(`/admin/tenants/${r.id}`)}
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Dónde van">
              <Desplegable
                value={paso}
                onChange={(v) => setFilters({ paso: v, 'recorrido.page': undefined })}
                opciones={FILTRO_DE_PASO}
                todas="Todas"
                aria-label="Dónde van"
                data-testid="filtro-paso"
              />
            </Filtro>
          </BarraDeFiltros>
        }
      />
            ),
          },
          {
            id: 'a-medias',
            etiqueta: 'Registros sin terminar',
            cuenta: data?.inFlight.length ?? null,
            contenido: (
      <section className="space-y-3" aria-label="Registros sin terminar">
        <div>
          <p className="text-body-sm text-fg-muted">
            Empezaron el asistente de registro y no lo terminaron. Si se vence, tienen que empezar de nuevo.
          </p>
        </div>
        {data && data.inFlight.length === 0 ? (
          // Vacío en una línea: un bloque grande aquí empuja la cobranza por voz fuera de la vista.
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-body-sm text-fg-muted">
            Nadie tiene un registro a medias.
          </p>
        ) : (
          <DataTable
            columns={columnasAMedias}
            rows={data?.inFlight}
            getKey={(r) => r.id}
            isLoading={isLoading}
            error={error}
            emptyTitle="Nadie tiene un registro a medias"
            aria-label="Registros sin terminar"
            id="a-medias"
            queSon={['registro', 'registros']}
            filasPorPagina={10}
            ordenInicial={{ columna: 1, sentido: 'desc' }}
            exportar="registros-sin-terminar"
          />
        )}
      </section>
            ),
          },
          {
            id: 'voz',
            etiqueta: 'Cobranza por voz',
            cuenta: data?.liveAgencies.length ?? null,
            contenido: (
      <section className="space-y-3" aria-label="Arranque de la cobranza por voz">
        <div>
          <p className="text-body-sm text-fg-muted">
            Las inmobiliarias conectadas a Mori: cuándo llamó y cuándo cobró por primera vez.
          </p>
        </div>
        <DataTable
          columns={columnasDeLaVoz}
          rows={data?.liveAgencies}
          getKey={(r) => r.tenant_id}
          isLoading={isLoading}
          error={error}
          emptyTitle="Ninguna inmobiliaria conectada a la cobranza por voz"
          aria-label="Arranque de la cobranza por voz"
          onRowClick={(r) => router.push(`/admin/tenants/${r.tenant_id}`)}
          id="voz"
          queSon={['inmobiliaria', 'inmobiliarias']}
          buscar="Buscar inmobiliaria"
          filasPorPagina={10}
          ordenInicial={{ columna: 1, sentido: 'desc' }}
          exportar="arranque-cobranza-por-voz"
        />
      </section>
            ),
          },
        ]}
      />
    </div>
  )
}
