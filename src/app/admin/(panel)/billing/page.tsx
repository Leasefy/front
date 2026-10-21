'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChartLineUp } from '@phosphor-icons/react'
import { Alert, FranjaDeCifras } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtFecha } from '@/lib/admin/format'
import { estadoDelPlan } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'

/** `GET /api/v1/admin/billing` (20-10-2026). */
interface IngresoDeLaInmobiliaria {
  tenant_id: string
  nombre: string
  plan: { tier: string; nombre: string | null; estado: string; modo: 'FLAT' | 'USAGE_CANON' } | null
  mensualidadCop: number | null
  cobradoEsteMesCop: number
  cobradoMesPasadoCop: number
  pendienteCop: number
  cobrosFallidosEsteMes: number
  ultimoPago: string | null
  proximoCobro: string | null
  voz: {
    modelo: string
    recuperadoEsteMesCop: number
    recuperadoMesPasadoCop: number
    deudoresConLlamada: number
    estimadoCop: number
    enElMinimo: boolean
    minimoCop: number
  } | null
}

interface RespuestaDeIngresos {
  mes: string
  inmobiliarias: IngresoDeLaInmobiliaria[]
  totales: {
    mensualidadesCop: number
    cobradoEsteMesCop: number
    cobradoMesPasadoCop: number
    pendienteCop: number
    cobrosFallidosEsteMes: number
    recuperadoPorVozEsteMesCop: number
    estimadoPorVozCop: number
  }
  vozDisponible: boolean
}

const SEGMENTOS: Segmento<IngresoDeLaInmobiliaria>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  { valor: 'al-dia', nombre: 'Plan al día', cumple: (f) => f.plan?.estado === 'ACTIVE' },
  { valor: 'mora', nombre: 'En mora', cumple: (f) => f.plan?.estado === 'PAST_DUE' || f.cobrosFallidosEsteMes > 0 },
  { valor: 'sin-plan', nombre: 'Sin plan', cumple: (f) => !f.plan },
  { valor: 'voz', nombre: 'Con cobranza por voz', cumple: (f) => f.voz !== null },
]

const nombreDelMes = (clave: string) => {
  const [y, m] = clave.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long' })
}

/**
 * /admin/billing — lo que Leasefy cobra, por inmobiliaria (20-10-2026).
 *
 * 🔴 Antes sumaba todo lo que la cobranza por voz RECUPERÓ para la
 * inmobiliaria y lo llamaba «MRR»: no era ingreso de Leasefy (en el lab, el
 * Resumen decía $2.997.000 al mes y esta pantalla $0). Ahora son las dos
 * fuentes de ingreso: la mensualidad del plan con sus cobros, y lo que se le
 * cobra por la cobranza por voz (estimado con la fórmula de su factura).
 */
export default function IngresosPage() {
  const router = useRouter()
  const ingresos = useApiQuery<RespuestaDeIngresos>((signal) => adminApi('/billing', { signal }), [])
  const d = ingresos.data
  const t = d?.totales
  const mes = d ? nombreDelMes(d.mes) : ''

  const columnas: Column<IngresoDeLaInmobiliaria>[] = [
    {
      header: 'Inmobiliaria',
      className: 'min-w-[200px]',
      orden: (f) => f.nombre,
      texto: (f) => f.nombre,
      cell: (f) => {
        const estado = estadoDelPlan(f.plan?.estado)
        return (
          <div className="min-w-0">
            <div className="font-medium text-fg">{f.nombre}</div>
            {f.plan ? (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-caption text-fg-muted">{f.plan.nombre ?? f.plan.tier}</span>
                <Pill tone={estado.tono} dot>
                  {estado.nombre}
                </Pill>
              </div>
            ) : (
              <div className="mt-1 text-caption text-fg-subtle">Sin plan</div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Mensualidad',
      align: 'right',
      orden: (f) => f.mensualidadCop,
      ordenPrimero: 'desc',
      texto: (f) => f.mensualidadCop ?? (f.plan?.modo === 'USAGE_CANON' ? 'Por porcentaje del canon' : ''),
      cell: (f) =>
        f.mensualidadCop != null ? (
          <span className="tabular-nums text-fg">{fmtCOP(f.mensualidadCop)}</span>
        ) : f.plan?.modo === 'USAGE_CANON' ? (
          <span className="text-caption text-fg-muted">Por % del canon</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      header: `Cobrado en ${mes || 'el mes'}`,
      align: 'right',
      orden: (f) => f.cobradoEsteMesCop,
      ordenPrimero: 'desc',
      texto: (f) => f.cobradoEsteMesCop,
      cell: (f) => (
        <div className="tabular-nums">
          <span className={f.cobradoEsteMesCop > 0 ? 'text-success' : 'text-fg-muted'}>{fmtCOP(f.cobradoEsteMesCop)}</span>
          {f.ultimoPago ? <div className="text-caption text-fg-subtle">Último pago {fmtFecha(f.ultimoPago)}</div> : null}
        </div>
      ),
    },
    {
      header: 'Mes pasado',
      align: 'right',
      orden: (f) => f.cobradoMesPasadoCop,
      ordenPrimero: 'desc',
      texto: (f) => f.cobradoMesPasadoCop,
      cell: (f) => <span className="tabular-nums text-fg-muted">{fmtCOP(f.cobradoMesPasadoCop)}</span>,
    },
    {
      header: 'Por cobrar',
      align: 'right',
      orden: (f) => f.pendienteCop,
      ordenPrimero: 'desc',
      texto: (f) => f.pendienteCop,
      cell: (f) => (
        <div className="tabular-nums">
          <span className={f.pendienteCop > 0 ? 'text-warning' : 'text-fg-muted'}>{fmtCOP(f.pendienteCop)}</span>
          {f.cobrosFallidosEsteMes > 0 ? (
            <div className="text-caption text-danger">
              {f.cobrosFallidosEsteMes === 1 ? '1 cobro falló' : `${f.cobrosFallidosEsteMes} cobros fallaron`}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Próximo cobro',
      align: 'right',
      orden: (f) => f.proximoCobro,
      texto: (f) => (f.proximoCobro ? fmtFecha(f.proximoCobro) : ''),
      cell: (f) => <span className="whitespace-nowrap text-caption text-fg-muted">{f.proximoCobro ? fmtFecha(f.proximoCobro) : '—'}</span>,
    },
    {
      header: 'Cobranza por voz',
      align: 'right',
      orden: (f) => f.voz?.estimadoCop,
      ordenPrimero: 'desc',
      texto: (f) => (f.voz ? f.voz.estimadoCop : ''),
      cell: (f) =>
        f.voz ? (
          <div className="tabular-nums">
            <span className="text-fg">{fmtCOP(f.voz.estimadoCop)}</span>
            <div className="text-caption text-fg-subtle">
              {f.voz.enElMinimo ? 'El mínimo del mes' : `Recuperó ${fmtCOP(f.voz.recuperadoEsteMesCop)}`}
            </div>
          </div>
        ) : (
          <span className="text-caption text-fg-subtle">{d?.vozDisponible === false ? 'No se pudo leer' : 'Sin conectar'}</span>
        ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Ingresos"
        description="Lo que Leasefy cobra a cada inmobiliaria: la mensualidad de su plan y lo que se le cobra por la cobranza por voz. Toca una para ver su ficha."
      />

      <FranjaDeCifras fila="lg" aria-label="Cifras de los ingresos">
        <KpiCard label="Mensualidades de los planes" value={t ? fmtCOP(t.mensualidadesCop) : '—'} hint="Planes fijos al día o en mora" />
        <KpiCard label={`Cobrado en ${mes || 'el mes'}`} value={t ? fmtCOP(t.cobradoEsteMesCop) : '—'} tone="ok" hint={t ? `Mes pasado ${fmtCOP(t.cobradoMesPasadoCop)}` : undefined} />
        <KpiCard label="Por cobrar" value={t ? fmtCOP(t.pendienteCop) : '—'} tone={t && t.pendienteCop > 0 ? 'warn' : 'default'} hint="Cobros de planes sin pagar" />
        <KpiCard label="Cobros fallidos" value={t ? t.cobrosFallidosEsteMes : '—'} tone={t && t.cobrosFallidosEsteMes > 0 ? 'bad' : 'default'} hint={`En ${mes || 'el mes'}`} />
        <KpiCard label="Cobranza por voz" value={t ? fmtCOP(t.estimadoPorVozCop) : '—'} hint="Estimado del mes" />
      </FranjaDeCifras>

      {d && !d.vozDisponible ? (
        <Alert variant="warning">No se pudo leer la base de los agentes: lo de la cobranza por voz no aparece (no es cero).</Alert>
      ) : null}

      <DataTable
        columns={columnas}
        rows={d?.inmobiliarias}
        getKey={(f) => f.tenant_id}
        isLoading={ingresos.isLoading}
        error={ingresos.error}
        onReintentar={ingresos.refetch}
        emptyTitle="Todavía no hay inmobiliarias"
        emptyIcon={<ChartLineUp weight="bold" />}
        aria-label="Ingresos por inmobiliaria"
        onRowClick={(f) => router.push(`/admin/tenants/${f.tenant_id}`)}
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar inmobiliaria"
        segmentos={SEGMENTOS}
        ordenInicial={{ columna: 1, sentido: 'desc' }}
        exportar={`ingresos-${d?.mes ?? ''}`}
      />

      <p className="text-caption text-fg-subtle">
        La cobranza por voz se estima con la misma fórmula de su factura del mes (modelo, porcentaje y mínimo de cada inmobiliaria, en{' '}
        <Link href="/admin/pricing-config" className="underline underline-offset-2 hover:text-fg">
          Precios de la cobranza por voz
        </Link>
        ).
      </p>
    </div>
  )
}
