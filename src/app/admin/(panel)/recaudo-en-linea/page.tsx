'use client'

/**
 * /admin/recaudo-en-linea — el reporte de Wompi y las liquidaciones de
 * Leasefy (Nico, C2-AGREGADOR Q3/Q4, ola E).
 *
 * Leasefy recauda los pagos en línea en SU cuenta de Wompi (agregador) y le
 * gira a cada inmobiliaria con una LIQUIDACIÓN que dice qué pagos incluye y
 * qué se descontó. Aquí el equipo de Leasefy:
 *   · sube el reporte de Wompi (vista previa, filas frenadas con su frase,
 *     idempotente);
 *   · ve las liquidaciones por inmobiliaria y fecha con su estado (generada,
 *     girada, conciliada en el banco de la inmobiliaria), las descarga en PDF
 *     o Excel y las marca giradas;
 *   · genera a mano las de un rango de fechas — 🔴 la frecuencia del giro está
 *     POR DEFINIR y se dice en pantalla;
 *   · cuadra Wompi → la cuenta de Leasefy, con las diferencias marcadas.
 *
 * Sólo el equipo de Leasefy (el layout del panel valida la lista de admins).
 * Las tarifas son modelo de negocio: nada se calcula aquí.
 */

import { useId, useState } from 'react'
import { CrossFade, MotionIndicator } from '@leasefy/cadence'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { FRECUENCIA_POR_DEFINIR } from '@/lib/admin/documento-de-la-liquidacion'
import { resumenDelRecaudo } from '@/lib/admin/recaudo-en-linea'
import { ReporteDeWompi } from './ReporteDeWompi'
import { Liquidaciones } from './Liquidaciones'
import { CuadreDelRecaudo } from './CuadreDelRecaudo'

type Pestana = 'liquidaciones' | 'reporte' | 'cuadre'

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'liquidaciones', nombre: 'Liquidaciones' },
  { id: 'reporte', nombre: 'Reporte de Wompi' },
  { id: 'cuadre', nombre: 'Cuadre Wompi → Leasefy' },
]

export default function RecaudoEnLineaAdminPage() {
  const id = useId()
  const [pestana, setPestana] = useState<Pestana>('liquidaciones')
  // Sube cuando se importa un reporte: las liquidaciones y el cuadre se vuelven a leer.
  const [version, setVersion] = useState(0)
  const { data: resumen, isLoading, error } = useApiQuery((signal) => resumenDelRecaudo(signal), [version])

  return (
    <div className="p-6 lg:p-8 max-w-6xl" data-testid="admin-recaudo-en-linea">
      <PageHeader
        label="35 · recaudo en línea"
        title="Recaudo en línea y liquidaciones"
        description="Leasefy recauda los pagos en línea en su cuenta de Wompi y le gira a cada inmobiliaria con una liquidación: qué pagos incluye y qué se descontó, tal como viene. Aquí no se calcula ninguna tarifa."
        right={
          <div className="card p-3 border-l-4 border-l-warn" data-testid="frecuencia-del-giro">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">giro a las inmobiliarias</div>
            <div className="text-sm text-fg mt-0.5">
              {resumen?.frecuenciaDelGiro.definida ? `Frecuencia del giro: ${resumen.frecuenciaDelGiro.texto}` : FRECUENCIA_POR_DEFINIR}
            </div>
            <div className="text-[13px] text-fg-muted">Se generan a mano, por rango de fechas.</div>
          </div>
        }
      />

      {isLoading && !resumen ? (
        <LoadingBlock label="cargando" />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : resumen && !resumen.disponible ? (
        <div className="card p-5 border-l-4 border-l-warn" data-testid="sin-migracion">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-warn">migración pendiente</span>
          <p className="text-sm text-fg mt-2">
            La base todavía no tiene las tablas del recaudo en línea (migración{' '}
            <code className="font-mono">{resumen.migraciones.agregador}</code>). La aplica Víctor. Mientras
            tanto no hay reportes ni liquidaciones que mostrar.
          </p>
        </div>
      ) : resumen ? (
        <>
          {!resumen.giroDisponible ? (
            <div className="card p-4 border-l-4 border-l-warn mb-4" data-testid="sin-migracion-del-giro">
              <p className="text-[13px] text-fg">
                Falta la migración <code className="font-mono">{resumen.migraciones.giro}</code>: se puede
                todo menos marcar una liquidación como girada. La aplica Víctor.
              </p>
            </div>
          ) : null}
          {resumen.ultimoReporte ? (
            <p className="text-[13px] text-fg-muted mb-4" data-testid="ultimo-reporte">
              Último reporte de Wompi: {resumen.ultimoReporte.archivo} ({resumen.ultimoReporte.transacciones}{' '}
              transacciones), {fmtDateTime(resumen.ultimoReporte.at)} · {resumen.ultimoReporte.subidoPor}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1 border-b border-bg-border mb-5" role="tablist" aria-label="Secciones del recaudo en línea">
            {PESTANAS.map((p) => {
              const activa = pestana === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  className={`relative isolate px-4 py-2.5 text-sm transition-colors ${activa ? 'text-fg' : 'text-fg-muted hover:text-fg'}`}
                  onClick={() => setPestana(p.id)}
                  data-testid={`pestana-${p.id}`}
                >
                  {activa ? <MotionIndicator layoutId={`${id}-pestana`} className="inset-x-0 -bottom-px h-0.5 bg-brand" /> : null}
                  {p.nombre}
                </button>
              )
            })}
          </div>

          <CrossFade swapKey={pestana}>
            {pestana === 'liquidaciones' ? (
              <Liquidaciones inmobiliarias={resumen.inmobiliarias} giroDisponible={resumen.giroDisponible} version={version} />
            ) : pestana === 'reporte' ? (
              <ReporteDeWompi alImportar={() => setVersion((v) => v + 1)} />
            ) : (
              <CuadreDelRecaudo version={version} />
            )}
          </CrossFade>
        </>
      ) : null}
    </div>
  )
}
