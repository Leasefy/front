'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChartLineUp } from '@phosphor-icons/react'
import { Alert, Cifra, FranjaDeCifras } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtFecha } from '@/lib/admin/format'
import { estadoDelPlan } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CajonDelDetalle } from '@/components/admin/screen/CajonDelDetalle'

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

/** «octubre» de «2026-10»; vacío si el back no mandó el mes (uno viejo manda `{ perTenant, totals }`). */
const nombreDelMes = (clave: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})/.exec(clave ?? '')
  if (!m) return ''
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('es-CO', { month: 'long' })
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
const FALLO_DE_LA_FORMA = new Error(
  'El servidor mandó los ingresos sin la lista de inmobiliarias: esta parte del admin todavía no está al día en el servidor.',
)

export default function IngresosPage() {
  const router = useRouter()
  const [abierta, setAbierta] = useState<IngresoDeLaInmobiliaria | null>(null)
  const ingresos = useApiQuery<RespuestaDeIngresos>((signal) => adminApi('/billing', { signal }), [])
  const d = ingresos.data
  const formaVieja = Boolean(d) && !Array.isArray(d?.inmobiliarias)
  const t = d?.totales
  const mes = d?.mes ? nombreDelMes(d.mes) : ''

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
        <div className="font-mono tabular-nums">
          <span className={f.cobradoEsteMesCop > 0 ? 'text-success' : 'text-fg-muted'}>{fmtCOP(f.cobradoEsteMesCop)}</span>
          {f.ultimoPago ? <div className="text-caption text-fg-subtle">Último pago {fmtFecha(f.ultimoPago)}</div> : null}
        </div>
      ),
    },
    {
      header: 'Por cobrar',
      align: 'right',
      orden: (f) => f.pendienteCop,
      ordenPrimero: 'desc',
      texto: (f) => f.pendienteCop,
      cell: (f) => (
        <div className="font-mono tabular-nums">
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
          <div className="font-mono tabular-nums">
            <span className="text-fg">{fmtCOP(f.voz.estimadoCop)}</span>
            <div className="text-caption text-fg-subtle">
              {f.voz.enElMinimo ? 'El mínimo del mes' : `Recuperó ${fmtCOP(f.voz.recuperadoEsteMesCop)}`}
            </div>
          </div>
        ) : (
          d?.vozDisponible === false ? (
            <span className="text-caption text-fg-subtle">No se pudo leer</span>
          ) : (
            // Ronda 26 (revisora r25): «Sin conectar» en casi todas las filas no informa; callado.
            <span className="text-fg-subtle" title="Sin conectar">
              <span aria-hidden="true">—</span>
              <span className="sr-only">Sin conectar</span>
            </span>
          )
        ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Ingresos"
        description="Lo que Leasefy le cobra a cada inmobiliaria: su plan y la cobranza por voz."
      />

      {/* Glow up 22-10: LA RESPUESTA (lo cobrado del mes, con la barra cobrado · por cobrar) y tres cifras de
          apoyo, sin tonos de color; antes, 5 tarjetas del mismo peso. */}
      {t ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <CifraHeroe
              rotulo={`Cobrado en ${mes || 'el mes'}`}
              cifra={fmtCOP(t.cobradoEsteMesCop)}
              contexto={`el mes pasado ${fmtCOP(t.cobradoMesPasadoCop)}`}
              tramos={[
                { clave: 'cobrado', etiqueta: 'Cobrado', monto: t.cobradoEsteMesCop, tono: 'exito', cifra: fmtCOP(t.cobradoEsteMesCop), siempre: true },
                { clave: 'por-cobrar', etiqueta: 'Por cobrar (planes sin pagar)', monto: t.pendienteCop, tono: 'aviso', cifra: fmtCOP(t.pendienteCop), siempre: true },
              ]}
              data-testid="ingresos-cobrado"
            />
          </div>
          <FranjaDeCifras fila="lg" columnas={3} aria-label="Lo demás de los ingresos">
            <Cifra etiqueta="Mensualidades de los planes" valor={fmtCOP(t.mensualidadesCop)} detalle="planes fijos al día o en mora" />
            <Cifra
              etiqueta="Cobros fallidos"
              valor={t.cobrosFallidosEsteMes}
              detalle={`en ${mes || 'el mes'}`}
              tono={t.cobrosFallidosEsteMes > 0 ? 'peligro' : undefined}
            />
            <Cifra etiqueta="Cobranza por voz" valor={fmtCOP(t.estimadoPorVozCop)} detalle="estimado del mes" />
          </FranjaDeCifras>
        </div>
      ) : null}

      {/* Ronda 28 (revisora r27): si la respuesta no trae la lista, es un fallo, no un vacío (antes «Todavía no
          hay inmobiliarias» con 5 registradas: el servidor mandaba la forma vieja). */}
      {d && !d.vozDisponible ? (
        <Alert variant="warning">No se pudo leer la base de los agentes: lo de la cobranza por voz no aparece (no es cero).</Alert>
      ) : null}

      <DataTable
        columns={columnas}
        rows={formaVieja ? undefined : d?.inmobiliarias}
        getKey={(f) => f.tenant_id}
        isLoading={ingresos.isLoading}
        error={ingresos.error ?? (formaVieja ? FALLO_DE_LA_FORMA : null)}
        onReintentar={ingresos.refetch}
        emptyTitle="Todavía no hay inmobiliarias"
        emptyHint="Cuando una inmobiliaria se registre, aparece aquí con lo que factura."
        emptyIcon={<ChartLineUp weight="duotone" />}
        aria-label="Ingresos por inmobiliaria"
        // Ronda 30 (K4 de Nico): la fila abre el detalle en un cajón; la ficha sigue a un clic desde su pie.
        onRowClick={(f) => setAbierta(f)}
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar inmobiliaria"
        segmentos={SEGMENTOS}
        // Ronda 26 (revisora r25): lo pendiente primero. Abre en «En mora» si hay alguna, y ordena por «Por cobrar».
        segmentoInicial={(formaVieja ? [] : d?.inmobiliarias ?? []).some((f) => SEGMENTOS[2].cumple(f)) ? 'mora' : 'todas'}
        ordenInicial={{ columna: 3, sentido: 'desc' }}
        cifraDelCelular={`Cobrado en ${mes || 'el mes'}`}
        exportar={`ingresos-${d?.mes ?? ''}`}
        masEnElExcel={[{ header: 'Cobrado el mes pasado', texto: (f) => f.cobradoMesPasadoCop }]}
      />

<CajonDelDetalle
        abierto={abierta !== null}
        onCerrar={() => setAbierta(null)}
        titulo={abierta?.nombre ?? 'Inmobiliaria'}
        descripcion={mes ? `Ingresos de ${mes}` : undefined}
        campos={abierta ? columnas.map((c) => ({ nombre: String(c.header), valor: c.cell(abierta) })) : []}
        pie={
          abierta ? (
            <Button hideArrow onClick={() => router.push(`/admin/tenants/${abierta.tenant_id}`)} data-testid="abrir-ficha-de-la-inmobiliaria">
              Abrir la ficha de la inmobiliaria
            </Button>
          ) : null
        }
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
