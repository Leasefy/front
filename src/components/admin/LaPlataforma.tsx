'use client'

import { Cifra, FranjaDeCifras } from '@leasefy/cadence'

import { CifraHeroe, type TramoDeLaCifra } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { fmtCOP, fmtNumero } from '@/lib/admin/format'
import { ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'

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

type EstadoDelPlan = keyof ResumenDeLaPlataforma['inmobiliarias']['porEstadoDelPlan']

/** Los estados del plan, en el orden en que la barra los recorre (de lo sano a lo perdido). */
const PLANES: Array<{ clave: EstadoDelPlan; nombre: string; filtro: string; tono: TramoDeLaCifra['tono'] }> = [
  { clave: 'ACTIVE', nombre: 'Al día', filtro: 'ACTIVE', tono: 'exito' },
  { clave: 'PAST_DUE', nombre: 'En mora', filtro: 'PAST_DUE', tono: 'aviso' },
  { clave: 'SUSPENDED', nombre: 'Suspendidas', filtro: 'SUSPENDED', tono: 'critico' },
  { clave: 'CANCELLED', nombre: 'Canceladas', filtro: 'CANCELLED', tono: 'neutro' },
  { clave: 'SIN_PLAN', nombre: 'Sin plan', filtro: 'sin-plan', tono: 'neutro' },
]

const enTreintaDias = (n: number, nueva: string, ninguna: string) =>
  n > 0 ? `+${fmtNumero(n)} ${nueva} en 30 días` : `${ninguna} en 30 días`

/**
 * La pestaña «Plataforma» del Resumen (glow up, 22-10-2026). LA RESPUESTA es
 * cuántas inmobiliarias hay y cómo están con su plan: una `CifraHeroe` con la
 * barra por estado (cada estado abre la lista filtrada). Debajo, sólo cuatro
 * cifras: la plata de los planes, el recaudo del mes, los contratos y los
 * inmuebles. Quiénes usan Leasefy, plegado.
 */
export function LaPlataforma({
  estado,
  onInmobiliarias,
}: {
  estado: { data?: ResumenDeLaPlataforma; isLoading: boolean; error: Error | null; refetch: () => void }
  /** Abre la lista de inmobiliarias, con el filtro del plan si se tocó uno. */
  onInmobiliarias: (plan?: string) => void
}) {
  if (estado.isLoading && !estado.data) return <LoadingBlock label="Cargando la plataforma" filas={4} />
  if (estado.error || !estado.data)
    return (
      <ErrorBlock
        error={estado.error ?? new Error('Sin datos')}
        onReintentar={estado.refetch}
        titulo="No pudimos cargar las cifras de la plataforma"
      />
    )
  const d = estado.data
  const porEstado = d.inmobiliarias.porEstadoDelPlan

  const tramos: TramoDeLaCifra[] = PLANES.map((p) => ({
    clave: p.clave,
    etiqueta: p.nombre,
    monto: porEstado[p.clave] ?? 0,
    tono: p.tono,
    siempre: p.clave === 'ACTIVE',
    'data-testid': `resumen-plan-${p.filtro}`,
    cifra: (
      // allowlist: la cifra de la leyenda abre la lista filtrada (como las cifras de Deuda del mes).
      <button
        type="button"
        onClick={() => onInmobiliarias(p.filtro)}
        className="rounded-sm text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label={`Ver las inmobiliarias: ${p.nombre.toLowerCase()} (${fmtNumero(porEstado[p.clave] ?? 0)})`}
      >
        {fmtNumero(porEstado[p.clave] ?? 0)}
      </button>
    ),
  }))

  return (
    <section aria-label="La plataforma" className="space-y-6" data-testid="resumen-plataforma">
      <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <CifraHeroe
          rotulo="Inmobiliarias en Leasefy"
          cifra={fmtNumero(d.inmobiliarias.total)}
          contexto={enTreintaDias(d.inmobiliarias.nuevas30d, 'nuevas', 'ninguna nueva')}
          tramos={tramos}
          total={d.inmobiliarias.total}
          pie="Toca un estado para ver cuáles son."
          data-testid="resumen-inmobiliarias"
        />
      </div>

      <FranjaDeCifras fila="lg" aria-label="La plata y la operación de la plataforma">
        <Cifra
          etiqueta="Ingreso mensual de los planes"
          valor={fmtCOP(d.ingresos.mrrCop)}
          detalle={
            d.ingresos.planesDePorcentaje > 0
              ? `más ${fmtNumero(d.ingresos.planesDePorcentaje)} con porcentaje del canon`
              : `cobrado este mes ${fmtCOP(d.ingresos.cobradoEsteMesCop)}`
          }
        />
        <Cifra
          etiqueta="Recaudo este mes"
          valor={fmtCOP(d.recaudo.valorEsteMesCop)}
          detalle={`${fmtNumero(d.recaudo.recibosEsteMes)} ${d.recaudo.recibosEsteMes === 1 ? 'recibo de caja' : 'recibos de caja'}`}
        />
        <Cifra
          etiqueta="Contratos vigentes"
          valor={d.contratos.vigentes}
          detalle={`de ${fmtNumero(d.contratos.total)} · ${enTreintaDias(d.contratos.nuevos30d, 'nuevos', 'ninguno nuevo')}`}
        />
        <Cifra
          etiqueta="Inmuebles"
          valor={d.inmuebles.total}
          detalle={enTreintaDias(d.inmuebles.nuevos30d, 'nuevos', 'ninguno nuevo')}
        />
      </FranjaDeCifras>

      <MasDetalles etiqueta="Ver quiénes usan Leasefy" etiquetaAbierto="Ocultar quiénes usan Leasefy">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { nombre: 'Personas con cuenta', n: d.personas.total },
            { nombre: 'Inquilinos', n: d.personas.porRol.inquilinos },
            { nombre: 'Propietarios', n: d.personas.porRol.propietarios },
            { nombre: 'De inmobiliarias', n: d.personas.porRol.inmobiliarias },
            { nombre: 'Nuevas en 30 días', n: d.personas.nuevas30d },
            { nombre: 'Entraron en 7 días', n: d.personas.entraron7d },
          ].map((x) => (
            <div key={x.nombre} className="min-w-0 space-y-0.5">
              <dt className="text-caption text-fg-muted">{x.nombre}</dt>
              <dd className="font-mono text-body tabular-nums text-fg">{fmtNumero(x.n)}</dd>
            </div>
          ))}
        </dl>
      </MasDetalles>
    </section>
  )
}
