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
import { Button } from '@/components/ui/button'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { MasDetalles } from '@/components/pantalla/MasDetalles'

type Pestana = 'liquidaciones' | 'reporte' | 'cuadre'

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'liquidaciones', nombre: 'Liquidaciones' },
  { id: 'reporte', nombre: 'Reporte de Wompi' },
  { id: 'cuadre', nombre: 'Cuadre Wompi → Leasefy' },
]

export default function RecaudoEnLineaAdminPage() {
  const id = useId()
  const [pestana, setPestana] = useState<Pestana>('liquidaciones')
  // «Generar liquidaciones» (la acción principal) abre el formulario en la pestaña de liquidaciones.
  const [generando, setGenerando] = useState(false)
  // Sube cuando se importa un reporte: las liquidaciones y el cuadre se vuelven a leer.
  const [version, setVersion] = useState(0)
  const { data: resumen, isLoading, error, refetch } = useApiQuery((signal) => resumenDelRecaudo(signal), [version])
  const sePuedeGenerar = Boolean(resumen?.disponible)

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="admin-recaudo-en-linea">
      <PageHeader
        title="Recaudo en línea"
        description="Lo que Leasefy recauda por Wompi y lo que le gira a cada inmobiliaria en su liquidación."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo funciona" titulo="El recaudo en línea" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                Leasefy recauda los pagos en línea en su cuenta de Wompi y le gira a cada inmobiliaria con una
                liquidación: qué pagos incluye y qué se descontó, tal como viene del reporte. Aquí no se calcula
                ninguna tarifa.
              </p>
              <p>
                1. Sube el reporte de Wompi (se puede subir dos veces: lo repetido no entra). 2. Genera las
                liquidaciones de un rango de fechas. 3. Gira desde el banco y márcala como girada con su comprobante.
                4. El cuadre dice si lo de Wompi y lo liquidado coinciden.
              </p>
            </div>
          </ParaEntenderMas>
        }
        principal={
          sePuedeGenerar ? (
            <Button
              size="sm"
              hideArrow
              type="button"
              onClick={() => {
                setPestana('liquidaciones')
                setGenerando((g) => !g)
              }}
              aria-expanded={generando}
              data-testid="abrir-generar"
            >
              {generando ? 'Cerrar' : 'Generar liquidaciones'}
            </Button>
          ) : undefined
        }
      />

      {/* 🔴 Nico (C2-AGREGADOR Q3): la frecuencia del giro está POR DEFINIR y se dice siempre. */}
      <p className="-mt-2 text-body-sm text-fg-muted" data-testid="frecuencia-del-giro">
        <span className="text-fg">
          {resumen?.frecuenciaDelGiro.definida ? `Frecuencia del giro: ${resumen.frecuenciaDelGiro.texto}` : FRECUENCIA_POR_DEFINIR}
        </span>{' '}
        · Se generan a mano, por rango de fechas.
        {resumen?.ultimoReporte ? (
          <span className="block text-caption" data-testid="ultimo-reporte">
            Último reporte de Wompi: {resumen.ultimoReporte.archivo} ({resumen.ultimoReporte.transacciones}{' '}
            transacciones), {fmtDateTime(resumen.ultimoReporte.at)} · {resumen.ultimoReporte.subidoPor}
          </span>
        ) : null}
      </p>

      {isLoading && !resumen ? (
        <LoadingBlock label="Cargando el recaudo en línea" />
      ) : error ? (
        <ErrorBlock error={error} onReintentar={refetch} />
      ) : resumen && !resumen.disponible ? (
        <div className="rounded-lg border border-border bg-surface p-5" data-testid="sin-migracion">
          <p className="text-body-sm font-medium text-fg">Falta preparar la base del recaudo en línea</p>
          <p className="mt-1 text-body-sm text-fg-muted">
            La base todavía no tiene las tablas del recaudo en línea; la prepara Víctor. Mientras tanto no hay
            reportes ni liquidaciones que mostrar.
          </p>
          <MasDetalles etiqueta="Ver el nombre de la migración" etiquetaAbierto="Ocultar el nombre" montadoSiempre className="mt-3">
            <code className="font-mono text-caption text-fg-muted">{resumen.migraciones.agregador}</code>
          </MasDetalles>
        </div>
      ) : resumen ? (
        <>
          {!resumen.giroDisponible ? (
            <div className="rounded-lg border border-border bg-surface p-4" data-testid="sin-migracion-del-giro">
              <p className="text-body-sm text-fg">
                Se puede todo menos marcar una liquidación como girada: falta preparar esa parte de la base (la
                prepara Víctor).
              </p>
              <MasDetalles etiqueta="Ver el nombre de la migración" etiquetaAbierto="Ocultar el nombre" montadoSiempre className="mt-2">
                <code className="font-mono text-caption text-fg-muted">{resumen.migraciones.giro}</code>
              </MasDetalles>
            </div>
          ) : null}

          <div className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]" role="tablist" aria-label="Secciones del recaudo en línea">
            {PESTANAS.map((p) => {
              const activa = pestana === p.id
              return (
                // allowlist: pestaña con el indicador animado de Cadence (MotionIndicator).
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  className={`relative isolate shrink-0 whitespace-nowrap px-4 py-2.5 text-[15px] transition-colors ${activa ? 'text-fg' : 'text-fg-muted hover:text-fg'}`}
                  onClick={() => setPestana(p.id)}
                  data-testid={`pestana-${p.id}`}
                >
                  {activa ? <MotionIndicator layoutId={`${id}-pestana`} className="inset-x-0 -bottom-px h-0.5 bg-primary" /> : null}
                  {p.nombre}
                </button>
              )
            })}
          </div>

          <CrossFade swapKey={pestana}>
            {pestana === 'liquidaciones' ? (
              <Liquidaciones
                inmobiliarias={resumen.inmobiliarias}
                giroDisponible={resumen.giroDisponible}
                version={version}
                generando={generando}
                alPedirGenerar={() => setGenerando(true)}
              />
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
