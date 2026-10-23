'use client'

/**
 * /panel/inmobiliaria/inmuebles/avaluos/cola — «Mis solicitudes de avalúo».
 *
 * QA de los agentes (19-10-2026): esta pestaña leía la cola transversal de los
 * agentes (`?agente=avaluos`), y el micro la devuelve SIEMPRE vacía para
 * avalúos (no tiene una tabla propia de dónde leerlos). En producción decía
 * «0 Activas · Aún no tienes solicitudes» aunque la inmobiliaria tuviera
 * avalúos. Nico eligió «que lea los de verdad»: la MISMA lista del Resumen
 * (`GET /inmobiliaria/avaluos`, el servicio de avalúos), pero como seguimiento:
 * cada avalúo con sus pasos (lo pidió → revisión → firmado → entregado), cuándo
 * se pidió y cuándo se firmó; el certificado si ya está, y si no, su página de
 * estado. Sin el servicio dice que no se pueden ver: nunca «0».
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Stagger,
  StaggerItem,
  motionDuration,
  motionEase,
  usePrefersReducedMotion,
} from '@leasefy/cadence'
import { ArrowSquareOut, FileMagnifyingGlass } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { Badge } from '@/components/ui/badge'
import { TablePagination } from '@/components/ui/pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { useAgencyAvaluos } from '@/lib/hooks/useInmobiliaria'
import { AVALUO_WIZARD_ORIGIN } from '@/lib/avaluo/wizard-url'
import type { AgencyAvaluoItem } from '@/lib/api/inmobiliaria.service'
import { ApiError } from '@/lib/api/client'
import { formatCurrency, formatDate } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { DescargarCertificado, tieneCertificado } from '../DescargarCertificado'
import { PASOS_DEL_AVALUO, avanceDelAvaluo } from './pasos-del-avaluo'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

const NS = 'inmobiliaria.ai.workspace.pages.avaluos'

type BadgeVariant = React.ComponentProps<typeof Badge>['variant']

/** El estado del micro → su píldora (las mismas del Resumen). */
const ESTADO: Record<string, { clave: string; variant: BadgeVariant }> = {
  borrador: { clave: 'borrador', variant: 'secondary' },
  'en_revisión': { clave: 'enRevision', variant: 'warning' },
  firmado: { clave: 'firmado', variant: 'success' },
  rechazado: { clave: 'rechazado', variant: 'destructive' },
  entregado: { clave: 'entregado', variant: 'default' },
}

/** Los cuatro pasos, con una línea que se llena hasta el último hecho. */
function PasosDelAvaluo({ estado }: { estado: string }) {
  const { t } = useI18n()
  const reducido = usePrefersReducedMotion()
  const { hechos, actual, rechazado } = avanceDelAvaluo(estado)
  const llenado = Math.max(0, (hechos - 1) / (PASOS_DEL_AVALUO.length - 1))
  const pasoDeAhora = rechazado ? t(`${NS}.colaPasos.rechazado`) : t(`${NS}.colaPasos.${actual ?? 'entregado'}`)
  return (
    <div className="relative" role="group" aria-label={t(`${NS}.colaPasosAria`, { paso: pasoDeAhora })} data-testid="avaluo-pasos">
      {/* La línea va de la primera a la última bolita (centros al 12,5 % y 87,5 %). */}
      <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[5px] h-0.5 rounded-full bg-border">
        <motion.div
          className="absolute inset-0 origin-left rounded-full bg-primary"
          initial={reducido ? false : { scaleX: 0 }}
          animate={{ scaleX: llenado }}
          transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
        />
      </div>
      <ol className="relative grid grid-cols-4">
        {PASOS_DEL_AVALUO.map((p, i) => {
          const hecho = i < hechos
          const esAhora = p === actual
          return (
            <li key={p} className="flex flex-col items-center gap-1.5" aria-current={esAhora ? 'step' : undefined}>
              <span
                aria-hidden
                className={cn(
                  'size-3 rounded-full border-2',
                  hecho
                    ? 'border-primary bg-primary'
                    : esAhora
                      ? rechazado
                        ? 'border-danger bg-danger'
                        : 'border-primary bg-surface'
                      : 'border-border bg-surface',
                )}
              />
              <span
                className={cn(
                  'text-center text-caption leading-tight',
                  hecho ? 'text-fg' : esAhora ? (rechazado ? 'font-medium text-danger' : 'font-medium text-fg') : 'text-fg-subtle',
                )}
              >
                {rechazado && esAhora ? t(`${NS}.colaPasos.rechazado`) : t(`${NS}.colaPasos.${p}`)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function SolicitudDeAvaluo({ item }: { item: AgencyAvaluoItem }) {
  const { t, locale } = useI18n()
  const meta = ESTADO[item.state]
  const propietario = item.ownerName?.trim() || t(`${NS}.sinNombre`)
  const detalle = [item.city, item.method && item.method !== '—' ? item.method : null].filter(Boolean).join(' · ')
  const fechas = [
    t(`${NS}.colaPedidoEl`, { fecha: formatDate(item.createdAt, locale) }),
    item.signedAt ? t(`${NS}.colaFirmadoEl`, { fecha: formatDate(item.signedAt, locale) }) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <StaggerItem as="li" className="space-y-4 px-4 py-4" data-testid="avaluo-solicitud">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant={meta?.variant ?? 'secondary'}>{meta ? t(`${NS}.estados.${meta.clave}`) : item.state}</Badge>
            <p className="truncate text-sm font-medium text-fg">{propietario}</p>
          </div>
          {detalle && <p className="truncate text-caption text-fg-muted">{detalle}</p>}
        </div>
        {/* A 390 baja de renglón: a la izquierda, con el nombre; desde `sm`, a la derecha. */}
        <div className="sm:text-right">
          <p className="font-mono text-sm tabular-nums text-fg">{item.valueCop == null ? '—' : formatCurrency(item.valueCop)}</p>
          <p className="text-caption tabular-nums text-fg-muted">{fechas}</p>
        </div>
      </div>
      <PasosDelAvaluo estado={item.state} />
      {tieneCertificado(item.state) ? (
        <div className="flex justify-end">
          <DescargarCertificado id={item.id} propietario={propietario} />
        </div>
      ) : item.submissionId ? (
        <div className="flex justify-end">
          <a
            href={`/avaluo/estado/${encodeURIComponent(item.submissionId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-caption font-medium text-primary underline-offset-4 hover:underline"
          >
            {t(`${NS}.colaVerEstado`)}
            <ArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </StaggerItem>
  )
}

function AvaluosCola() {
  const { t } = useI18n()
  const [page, setPage] = useState(0)
  const { avaluos, total, pageSize, isLoading, errorCrudo, refetch } = useAgencyAvaluos({ page })
  // «Activas» se cuenta en el servicio (por estado), no en la página que se ve.
  const borradores = useAgencyAvaluos({ state: 'borrador' })
  const enRevision = useAgencyAvaluos({ state: 'en_revisión' })

  // Sin el origen del asistente no se puede pedir un avalúo (el botón del Resumen está apagado).
  const servicioConfigurado = AVALUO_WIZARD_ORIGIN !== ''
  // El back responde 502 cuando el servicio de avalúos no está conectado o no contesta.
  const servicioCaido = errorCrudo instanceof ApiError && errorCrudo.status === 502
  const activasSeSaben =
    !servicioCaido && !borradores.isLoading && !enRevision.isLoading && !borradores.errorCrudo && !enRevision.errorCrudo

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Glow up 22-10: el encabezado común; las activas junto al título (antes, una caja de KPI aparte). */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.nav.secAgentes')}
        titulo={t(`${NS}.colaTitle`)}
        descripcion={t(`${NS}.colaDesc`)}
        junto={
          <span className="text-caption text-fg-muted" data-testid="avaluos-activas">
            <span className="font-mono tabular-nums text-fg">{activasSeSaben ? borradores.total + enRevision.total : '—'}</span>{' '}
            {t(`${NS}.colaKpiLabel`).toLowerCase()}
          </span>
        }
      />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <EstadoDeDatos
          cargando={isLoading}
          error={servicioCaido ? null : errorCrudo}
          vacio={servicioCaido || avaluos.length === 0}
          queEs={t(`${NS}.queEs`)}
          onReintentar={refetch}
          cuandoVacio={
            servicioCaido ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground" data-testid="avaluos-cola-sin-servicio">
                {t(`${NS}.colaSinServicio`)}
              </p>
            ) : (
              <SinDatos
                hayFiltros={false}
                queSon={t(`${NS}.queSon`)}
                icono={FileMagnifyingGlass}
                titulo={t(`${NS}.colaEmptyTitle`)}
                descripcion={servicioConfigurado ? t(`${NS}.colaEmptyHint`) : t(`${NS}.solicitarUnavailable`)}
                // Pedir el primero lleva al Resumen; sin el asistente conectado ese
                // botón allá está apagado, así que aquí no se ofrece (una puerta cerrada).
                crear={servicioConfigurado ? { label: t(`${NS}.solicitarCta`), href: '/panel/inmobiliaria/inmuebles/avaluos' } : undefined}
              />
            )
          }
        >
          <Stagger as="ul" layout={false} role="list" className="divide-y divide-border">
            {avaluos.map((item) => (
              <SolicitudDeAvaluo key={item.id} item={item} />
            ))}
          </Stagger>
          {total > pageSize && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination total={total} page={page + 1} pageSize={pageSize} onPageChange={(p) => setPage(Math.max(0, p - 1))} />
            </div>
          )}
        </EstadoDeDatos>
      </div>
    </div>
  )
}

export default function AvaluosColaPage() {
  return (
    <PageGuard module="avaluos">
      <AvaluosCola />
    </PageGuard>
  )
}
