'use client'

import { Buildings, FileText, HandCoins, HouseLine, Receipt, UsersThree } from '@phosphor-icons/react'

import { fmtCOP, fmtNumero } from '@/lib/admin/format'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { FranjaDeCifras } from '@leasefy/cadence'
import { ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'

/** `GET /admin/plataforma` (back 19-10-2026). */
export interface ResumenDeLaPlataforma {
  generadoEn: string
  inmobiliarias: {
    total: number
    nuevas30d: number
    porEstadoDelPlan: Record<'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' | 'SIN_PLAN', number>
  }
  contratos: { vigentes: number; total: number; nuevos30d: number }
  inmuebles: { total: number; nuevos30d: number }
  personas: {
    total: number
    porRol: { inquilinos: number; propietarios: number; inmobiliarias: number; admins: number }
    nuevas30d: number
    entraron7d: number
  }
  ingresos: { mrrCop: number; planesDePorcentaje: number; cobradoEsteMesCop: number; cobrosFallidosEsteMes: number }
  recaudo: { recibosEsteMes: number; valorEsteMesCop: number }
}

const PLANES: Array<{ clave: keyof ResumenDeLaPlataforma['inmobiliarias']['porEstadoDelPlan']; nombre: string; filtro: string; tono: string }> = [
  { clave: 'ACTIVE', nombre: 'Al día', filtro: 'ACTIVE', tono: 'bg-success' },
  { clave: 'PAST_DUE', nombre: 'En mora', filtro: 'PAST_DUE', tono: 'bg-warning' },
  { clave: 'SUSPENDED', nombre: 'Suspendidas', filtro: 'SUSPENDED', tono: 'bg-danger' },
  { clave: 'CANCELLED', nombre: 'Canceladas', filtro: 'CANCELLED', tono: 'bg-border-strong' },
  { clave: 'SIN_PLAN', nombre: 'Sin plan', filtro: 'sin-plan', tono: 'bg-border' },
]

const mas = (n: number, palabra: string) => (n > 0 ? `+${fmtNumero(n)} ${palabra} en 30 días` : `Ninguna nueva en 30 días`)

/**
 * La plataforma de un vistazo, arriba del Resumen (19-10-2026, Nico: «que sí
 * traiga la información de cada cosa»). Antes el Resumen era sólo la cobranza
 * por voz y salía en cero con miles de contratos en la base.
 */
export function LaPlataforma({
  estado,
  onInmobiliarias,
}: {
  estado: { data?: ResumenDeLaPlataforma; isLoading: boolean; error: Error | null; refetch: () => void }
  /** Abre la lista de inmobiliarias, con el filtro del plan si se tocó uno. */
  onInmobiliarias: (plan?: string) => void
}) {
  if (estado.isLoading) return <LoadingBlock label="Cargando la plataforma" filas={3} />
  if (estado.error || !estado.data)
    return (
      <ErrorBlock
        error={estado.error ?? new Error('Sin datos')}
        onReintentar={estado.refetch}
        titulo="No pudimos cargar las cifras de la plataforma"
      />
    )
  const d = estado.data
  const total = Math.max(1, d.inmobiliarias.total)

  return (
    <section aria-label="La plataforma" className="space-y-4">
      <FranjaDeCifras fila="lg">
        <KpiCard
          label="Inmobiliarias"
          value={d.inmobiliarias.total}
          hint={mas(d.inmobiliarias.nuevas30d, 'nuevas')}
          icon={<Buildings />}
        />
        <KpiCard
          label="Contratos vigentes"
          value={d.contratos.vigentes}
          hint={`de ${fmtNumero(d.contratos.total)} · ${d.contratos.nuevos30d > 0 ? `+${fmtNumero(d.contratos.nuevos30d)} en 30 días` : 'ninguno nuevo en 30 días'}`}
          icon={<FileText />}
        />
        <KpiCard
          label="Inmuebles"
          value={d.inmuebles.total}
          hint={d.inmuebles.nuevos30d > 0 ? `+${fmtNumero(d.inmuebles.nuevos30d)} en 30 días` : 'Ninguno nuevo en 30 días'}
          icon={<HouseLine />}
        />
        <KpiCard
          label="Personas"
          value={d.personas.total}
          hint={`${fmtNumero(d.personas.entraron7d)} entraron en 7 días`}
          icon={<UsersThree />}
        />
        <KpiCard
          label="Planes · ingreso mensual"
          value={fmtCOP(d.ingresos.mrrCop)}
          hint={
            d.ingresos.planesDePorcentaje > 0
              ? `Más ${fmtNumero(d.ingresos.planesDePorcentaje)} con porcentaje del canon`
              : `Cobrado este mes ${fmtCOP(d.ingresos.cobradoEsteMesCop)}`
          }
          tone="ok"
          icon={<HandCoins />}
        />
        <KpiCard
          label="Recaudo · este mes"
          value={fmtCOP(d.recaudo.valorEsteMesCop)}
          hint={`${fmtNumero(d.recaudo.recibosEsteMes)} ${d.recaudo.recibosEsteMes === 1 ? 'recibo de caja' : 'recibos de caja'}`}
          icon={<Receipt />}
        />
      </FranjaDeCifras>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Planes de las inmobiliarias"
          descripcion="Toca un estado para ver cuáles son."
        >
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            {PLANES.map((p) =>
              d.inmobiliarias.porEstadoDelPlan[p.clave] > 0 ? (
                <span
                  key={p.clave}
                  className={p.tono}
                  style={{ width: `${(d.inmobiliarias.porEstadoDelPlan[p.clave] / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PLANES.map((p) => (
              <li key={p.clave}>
                <button
                  type="button"
                  onClick={() => onInmobiliarias(p.filtro)}
                  className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <span className="flex items-center gap-1.5 text-caption text-fg-muted">
                    <span className={`inline-block size-2 rounded-full ${p.tono}`} aria-hidden="true" />
                    {p.nombre}
                  </span>
                  <span className="text-subtitle font-semibold tabular-nums text-fg">
                    {fmtNumero(d.inmobiliarias.porEstadoDelPlan[p.clave])}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {d.ingresos.cobrosFallidosEsteMes > 0 ? (
            <p className="mt-3 text-caption text-warning">
              {fmtNumero(d.ingresos.cobrosFallidosEsteMes)}{' '}
              {d.ingresos.cobrosFallidosEsteMes === 1 ? 'cobro de plan falló' : 'cobros de plan fallaron'} este mes.
            </p>
          ) : null}
        </Tarjeta>

        <Tarjeta titulo="Quiénes usan Leasefy" descripcion="Las cuentas de la plataforma, por tipo.">
          <ul className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            {[
              { nombre: 'Inquilinos', n: d.personas.porRol.inquilinos },
              { nombre: 'Propietarios', n: d.personas.porRol.propietarios },
              { nombre: 'De inmobiliarias', n: d.personas.porRol.inmobiliarias },
              { nombre: 'Nuevas en 30 días', n: d.personas.nuevas30d },
            ].map((x) => (
              <li key={x.nombre} className="rounded-md bg-bg px-3 py-2">
                <div className="text-caption text-fg-muted">{x.nombre}</div>
                <div className="text-subtitle font-semibold tabular-nums text-fg">{fmtNumero(x.n)}</div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
    </section>
  )
}
