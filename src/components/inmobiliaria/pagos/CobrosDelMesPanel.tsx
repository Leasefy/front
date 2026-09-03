'use client'

/**
 * CobrosDelMesPanel — el bloque operativo del «Resumen» de Pagos IA: el mes, los
 * indicadores REALES de ese mes, la acción masiva con su alcance, y la tabla.
 *
 * ── Por qué los indicadores se calculan acá y no vienen del agente ───────────
 * La pantalla mostraba 8 KPIs y los 8 decían «—». No era falta de datos ni un
 * fallo de red: `useAgentOverview('pagos')` responde **200 con datos**, pero el
 * micro emite otros tres indicadores —`collected_30d_cop`, `approval_rate_30d`,
 * `pending_verification`— que no se cruzan con ninguno de los 8 ids que la
 * pantalla busca. Cero intersección ⇒ los 8 caen al `'—'` por defecto, y como la
 * respuesta fue exitosa `error` queda en `null` y no se avisa nada. Un «—»
 * silencioso que en realidad significaba «pregunté otra cosa».
 *
 * Peor: esos tres indicadores tampoco son de este dominio. Salen de la tabla
 * `payment` del microservicio, que sólo escriben los flujos de cobranza por voz
 * — no los cobros del ERP, que viven en `back-erp`.
 *
 * Por eso este panel NO le pregunta al agente. Lee los cobros de verdad
 * (`useCobros({ month })` → `GET /inmobiliaria/cobros`, back-erp, desplegado) y
 * deriva los cuatro números de las MISMAS filas que se ven en la tabla de
 * abajo. Son auditables a ojo: si el usuario duda de «Recaudado», suma la
 * columna. Nada se inventa y nada se trae de un dominio ajeno.
 *
 * ── Los cuatro estados ───────────────────────────────────────────────────────
 * `EstadoDeDatos` resuelve cargando / falló / vacío / datos en ese orden. El
 * vacío es `SinDatos` (y distingue «no hay cobros este mes» de «el filtro no
 * encontró nada»); el fallo es `FalloDeCarga`, que sí dice que no se pudo
 * consultar. Nunca más un «—» que signifique las dos cosas.
 */

import { useMemo, useState } from 'react'
import { Receipt, CurrencyDollar, Clock, WarningOctagon, Plus } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Button } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { TablePagination } from '@/components/ui/pagination'
import { useTablePagination } from '@/lib/hooks/use-table-pagination'
import { CobroTable } from '@/components/inmobiliaria/CobroTable'
import { GenerarCobrosDialog } from '@/components/inmobiliaria/pagos/GenerarCobrosDialog'
import { useCobros } from '@/lib/hooks/useInmobiliaria'
import type { Cobro } from '@/lib/types/inmobiliaria'
import { mesEnTitulo } from '@/lib/utils/mes'
import { useI18n } from '@/lib/i18n'

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const numberFormatter = new Intl.NumberFormat('es-CO')

/** El mes corriente en 'YYYY-MM', en hora LOCAL (no UTC: ver lib/utils/mes). */
export function mesActual(hoy: Date = new Date()): string {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

/** Los últimos `cantidad` meses hasta hoy, del más reciente al más viejo. */
export function mesesRecientes(cantidad = 12, hoy: Date = new Date()): string[] {
  const meses: string[] = []
  for (let i = 0; i < cantidad; i += 1) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

export interface ResumenDeCobros {
  total: number
  recaudado: number
  pendiente: number
  enMora: number
}

/**
 * Los cuatro números, derivados de las filas que se están mostrando.
 *
 * `late` y `defaulted` son los dos estados de mora del enum `CobroStatus`; se
 * cuentan juntos porque para el operador son la misma pregunta («¿a quién le
 * tengo que caer?»). Exportada y pura para poder fijarla en un test.
 */
export function resumirCobros(cobros: readonly Cobro[]): ResumenDeCobros {
  return cobros.reduce<ResumenDeCobros>(
    (acc, c) => ({
      total: acc.total + 1,
      recaudado: acc.recaudado + (c.paidAmount ?? 0),
      pendiente: acc.pendiente + (c.pendingAmount ?? 0),
      enMora: acc.enMora + (c.status === 'late' || c.status === 'defaulted' ? 1 : 0),
    }),
    { total: 0, recaudado: 0, pendiente: 0, enMora: 0 },
  )
}

function Indicador({
  label,
  valor,
  icono: Icono,
  tono,
}: {
  label: string
  valor: string
  icono: Icon
  tono?: 'danger'
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid="pagos-indicador">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs leading-tight text-fg-muted">{label}</p>
        <span
          className={
            tono === 'danger'
              ? 'grid size-8 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger'
              : 'grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted'
          }
        >
          <Icono className="h-4 w-4" weight="duotone" aria-hidden="true" />
        </span>
      </div>
      <p
        className="mt-2 text-xl font-semibold tabular-nums text-fg"
        data-testid="pagos-indicador-valor"
      >
        {valor}
      </p>
    </div>
  )
}

export interface CobrosDelMesPanelProps {
  /** Inyectable para los tests; por defecto, el mes corriente. */
  mesInicial?: string
}

export function CobrosDelMesPanel({ mesInicial }: CobrosDelMesPanelProps) {
  const { t } = useI18n()
  const [mes, setMes] = useState(() => mesInicial ?? mesActual())
  const [generarAbierto, setGenerarAbierto] = useState(false)

  // `params` se memoiza: useCobros lo usa como dependencia por `params?.month`,
  // pero un objeto nuevo en cada render igual hace ruido en las dependencias.
  const params = useMemo(() => ({ month: mes }), [mes])
  const { cobros, isLoading, errorCrudo, refetch } = useCobros(params)

  const filas = cobros as Cobro[]
  const resumen = useMemo(() => resumirCobros(filas), [filas])

  const { pageItems, total, page, pageSize, setPage, setPageSize } = useTablePagination(filas, {
    initialPageSize: 10,
    // Cambiar de mes vuelve a la página 1: quedarse en la 4 de un mes que tiene
    // 2 páginas mostraría una tabla vacía sin explicar por qué.
    resetKey: mes,
  })

  const opciones = useMemo(() => mesesRecientes(12), [])
  const titulo = mesEnTitulo(mes)

  return (
    <section className="space-y-4" aria-label={t('inmobiliaria.ai.pagos_home.resumen.cobros.aria')}>
      {/* Encabezado del bloque: el mes y la acción masiva, JUNTOS. El alcance de
          «generar» es el mes que se está viendo, así que el selector tiene que
          estar al lado del botón — no en otra franja de la pantalla. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-fg">
            {t('inmobiliaria.ai.pagos_home.resumen.cobros.titulo')}
          </h2>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-[190px]" aria-label={t('inmobiliaria.ai.pagos_home.resumen.cobros.mesAria')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((m) => (
                <SelectItem key={m} value={m}>
                  {mesEnTitulo(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button hideArrow onClick={() => setGenerarAbierto(true)} data-testid="abrir-generar-cobros">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('inmobiliaria.ai.pagos_home.resumen.cobros.generarCta', { mes: titulo })}
        </Button>
      </div>

      <EstadoDeDatos
        cargando={isLoading}
        error={errorCrudo}
        queEs={t('inmobiliaria.ai.pagos_home.resumen.cobros.queEs')}
        onReintentar={refetch}
        esqueleto={<EsqueletoTabla columnas={6} filas={6} />}
      >
        {/* Indicadores REALES del mes, derivados de las filas de abajo. */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Indicador
            label={t('inmobiliaria.ai.pagos_home.resumen.kpi.cobrosDelMes')}
            valor={numberFormatter.format(resumen.total)}
            icono={Receipt}
          />
          <Indicador
            label={t('inmobiliaria.ai.pagos_home.resumen.kpi.recaudado')}
            valor={copFormatter.format(resumen.recaudado)}
            icono={CurrencyDollar}
          />
          <Indicador
            label={t('inmobiliaria.ai.pagos_home.resumen.kpi.pendiente')}
            valor={copFormatter.format(resumen.pendiente)}
            icono={Clock}
          />
          <Indicador
            label={t('inmobiliaria.ai.pagos_home.resumen.kpi.enMora')}
            valor={numberFormatter.format(resumen.enMora)}
            icono={WarningOctagon}
            tono={resumen.enMora > 0 ? 'danger' : undefined}
          />
        </div>

        {filas.length === 0 ? (
          <SinDatos
            queSon={t('inmobiliaria.ai.pagos_home.resumen.cobros.queSon')}
            icono={Receipt}
            titulo={t('inmobiliaria.ai.pagos_home.resumen.cobros.vacioTitulo', { mes: titulo })}
            descripcion={t('inmobiliaria.ai.pagos_home.resumen.cobros.vacioDescripcion', {
              mes: titulo,
            })}
            accion={
              <Button hideArrow onClick={() => setGenerarAbierto(true)}>
                {t('inmobiliaria.ai.pagos_home.resumen.cobros.generarCta', { mes: titulo })}
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <CobroTable cobros={pageItems} />
            {/* El pie sólo si hay más de una página: un paginador sobre 3 filas
                es ruido. Mismo criterio que la tabla de inquilinos. */}
            {total > pageSize && (
              <div
                className="border-t border-border bg-muted/10 px-4 py-3"
                data-testid="pagos-cobros-pie"
              >
                <TablePagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 20, 50]}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        )}
      </EstadoDeDatos>

      <GenerarCobrosDialog
        open={generarAbierto}
        onOpenChange={setGenerarAbierto}
        mes={mes}
        yaGenerados={filas.length}
        onGenerado={refetch}
      />
    </section>
  )
}
