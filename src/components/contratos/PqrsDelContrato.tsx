'use client'

/**
 * El seguimiento de las PQRS DENTRO del contrato.
 *
 * Nico (2026-09-12): «Dentro del contrato debe quedar ese registro de PQRs, si
 * ya se solucionaron, cuáles fueron, como para llevar el control de algo
 * importante. Agregar dentro de los contratos el seguimiento de los PQRs
 * completo, con estados, detalles, etc.»
 *
 * ── De dónde sale la lista ──────────────────────────────────────────────────
 * `Pqrs` no tiene `contractId`: una solicitud se radica contra una
 * CONSIGNACIÓN —el inmueble—, nunca contra un contrato. El back la ata por las
 * dos cosas que sí son datos: el inmueble del contrato y la ventana en que el
 * contrato estuvo vivo. Esa regla vuelve en `relacion` y la sección LA DICE en
 * una línea, en vez de presentar la lista como si fuera un vínculo directo.
 *
 * ── Lo que el modelo NO guarda ──────────────────────────────────────────────
 * No hay texto de la solución: `Pqrs` guarda `resueltaAt` / `cerradaAt` (el
 * cuándo) y `asignadoAUserId` (el quién), y nada más. Así que acá se muestra
 * el cuándo y el quién, y el detalle de lo que pasó vive en la solicitud, a un
 * clic. Inventar un «se solucionó así» que nadie escribió sería mentir en la
 * pantalla; agregar la columna es una migración, y lo conservador para una
 * lectura es no tocar el modelo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowSquareOut, Lifebuoy } from '@phosphor-icons/react'

import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { Button } from '@/components/ui/button'
import { TablePagination } from '@/components/ui/pagination'
import { pqrsApi } from '@/lib/api/pqrs-agencia.service'
import type {
  Pqrs,
  PqrsDelContratoResponse,
  PqrsEstado,
} from '@/lib/api/pqrs-agencia.types'
import {
  ESTADOS_TERMINALES,
  ESTADO_BADGE,
  ESTADO_LABEL,
  SOLICITANTE_LABEL,
  TIPO_LABEL,
  textoSla,
} from '@/components/inmobiliaria/pqrs/pqrs-reglas'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { conRegreso } from '@/lib/nav/ruta-de-regreso'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  contractId: string
}

const SOLICITUDES = '/panel/inmobiliaria/solicitudes'

/**
 * Desde cuántas filas la sección deja de ser una lista corta y necesita
 * herramientas: filtro por estado y pie de paginación.
 */
const DESDE_CUANTAS_HAY_FILTRO = 5

/**
 * Un `YYYY-MM-DD` leído como día LOCAL. `new Date('2026-01-01')` se interpreta
 * como medianoche UTC y en Bogotá cae al 31 de diciembre: la ventana del
 * contrato se mostraría corrida un día.
 */
function comoDiaLegible(dia: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (!partes) return dia
  const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`
}

/** «4 PQRS · 3 resueltas · 1 abierta» — sólo las partes que no son cero. */
export function lineaDeResumen(resumen: {
  total: number
  resueltas: number
  cerradas: number
}): string {
  const abiertas = resumen.total - resumen.resueltas - resumen.cerradas
  const partes = [`${resumen.total} PQRS`]
  if (resumen.resueltas > 0) partes.push(plural(resumen.resueltas, 'resuelta', 'resueltas'))
  if (resumen.cerradas > 0) partes.push(plural(resumen.cerradas, 'cerrada', 'cerradas'))
  if (abiertas > 0) partes.push(plural(abiertas, 'abierta', 'abiertas'))
  return partes.join(' · ')
}

/** «Del inmueble del contrato, entre el 1 ene 2026 y hoy.» */
export function lineaDeRelacion(relacion: {
  desde: string | null
  hasta: string
  sinFin: boolean
}): string {
  const hasta = relacion.sinFin ? 'hoy' : `el ${comoDiaLegible(relacion.hasta)}`
  if (!relacion.desde) return `Radicadas contra el inmueble del contrato, hasta ${hasta}.`
  return `Radicadas contra el inmueble del contrato, entre el ${comoDiaLegible(relacion.desde)} y ${hasta}.`
}

export function PqrsDelContrato({ contractId }: Props) {
  const [datos, setDatos] = useState<PqrsDelContratoResponse | null>(null)
  // El error ENTERO: `FalloDeCarga` lo clasifica y no muestra el inglés del back.
  const [error, setError] = useState<unknown>(null)
  const [filtro, setFiltro] = useState<PqrsEstado | null>(null)

  // La solicitud devuelve a quien llegó desde acá a ESTE contrato y no a la
  // lista de solicitudes. Fuera del App Router `usePathname()` viene null y el
  // enlace va sin `volver`.
  const pathname = usePathname()
  const conVuelta = useCallback(
    (destino: string) => (pathname ? conRegreso(destino, pathname) : destino),
    [pathname],
  )

  const cargar = useCallback(async () => {
    setError(null)
    setDatos(null)
    try {
      setDatos(await pqrsApi.deContrato(contractId))
    } catch (e) {
      // Un fallo NO se pinta como «este contrato no tiene PQRS»: son cosas
      // distintas, y confundirlas hace creer que no hay historia cuando lo
      // que hay es una petición caída.
      setError(e)
    }
  }, [contractId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const solicitudes = useMemo(() => datos?.solicitudes ?? [], [datos])
  const hayHerramientas = solicitudes.length > DESDE_CUANTAS_HAY_FILTRO

  // Sólo los estados que de verdad aparecen: un filtro con opciones que nunca
  // devuelven nada es una promesa vacía.
  const estadosPresentes = useMemo(() => {
    const vistos = new Set<PqrsEstado>()
    for (const p of solicitudes) vistos.add(p.estado)
    return Array.from(vistos)
  }, [solicitudes])

  const filtradas = useMemo(
    () => (filtro ? solicitudes.filter((p) => p.estado === filtro) : solicitudes),
    [solicitudes, filtro],
  )

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filtradas, { resetKey: filtro ?? 'todas' })

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 space-y-4"
      data-testid="pqrs-del-contrato"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lifebuoy className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">PQRS</h3>
        </div>
        <Button asChild variant="outline" size="sm" hideArrow>
          <Link href={conVuelta(SOLICITUDES)}>
            <ArrowSquareOut className="h-4 w-4" />
            Ver todas
          </Link>
        </Button>
      </div>

      {datos === null && error === null ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : error !== null ? (
        <FalloDeCarga
          error={error}
          queEs="las PQRS de este contrato"
          onReintentar={cargar}
          enmarcado={false}
        />
      ) : datos !== null && datos.relacion.propertyId === null ? (
        // Sin inmueble no hay con qué atar una PQRS, y decirlo es distinto de
        // decir «no tiene»: acá falta el vínculo, no la historia.
        <p className="text-sm text-muted-foreground" data-testid="pqrs-del-contrato-sin-inmueble">
          Este contrato todavía no tiene inmueble asociado, así que no hay con
          qué atarle una PQRS.
        </p>
      ) : solicitudes.length === 0 ? (
        <div className="space-y-1" data-testid="pqrs-del-contrato-vacio">
          <p className="text-sm text-muted-foreground">Este contrato no tiene PQRS.</p>
          <p className="text-caption text-muted-foreground">{lineaDeRelacion(datos!.relacion)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <p
              className="text-sm font-medium text-foreground tabular-nums"
              data-testid="pqrs-del-contrato-resumen"
            >
              {lineaDeResumen(datos!.resumen)}
            </p>
            <p className="text-caption text-muted-foreground">{lineaDeRelacion(datos!.relacion)}</p>
          </div>

          {hayHerramientas && (
            <div className="flex flex-wrap gap-2" data-testid="pqrs-del-contrato-filtro">
              <FiltroChip activo={filtro === null} onClick={() => setFiltro(null)}>
                Todas
              </FiltroChip>
              {estadosPresentes.map((estado) => (
                <FiltroChip
                  key={estado}
                  activo={filtro === estado}
                  onClick={() => setFiltro(estado)}
                >
                  {ESTADO_LABEL[estado]}
                </FiltroChip>
              ))}
            </div>
          )}

          <ul className="divide-y divide-border border-t border-border">
            {pageItems.map((p) => (
              <FilaDePqrs key={p.id} pqrs={p} href={conVuelta(`${SOLICITUDES}?pqrs=${p.id}`)} />
            ))}
          </ul>

          {hayHerramientas && shouldPaginate && (
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}
    </section>
  )
}

function FiltroChip({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'rounded-full border px-3 py-1 text-caption font-medium transition-colors',
        activo
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-border text-muted-foreground hover:bg-surface-muted',
      )}
    >
      {children}
    </button>
  )
}

function FilaDePqrs({ pqrs, href }: { pqrs: Pqrs; href: string }) {
  const resuelta = ESTADOS_TERMINALES.includes(pqrs.estado)
  const sla = textoSla(pqrs.slaVenceAt, pqrs.estado)
  // `cerradaAt` gana sobre `resueltaAt` porque cerrar es el último movimiento:
  // es la fecha en que la solicitud dejó de estar sobre la mesa.
  const cerroEl = pqrs.cerradaAt ?? pqrs.resueltaAt

  return (
    <li className="py-3 space-y-1.5" data-testid="pqrs-del-contrato-fila">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-caption text-muted-foreground">{pqrs.radicado}</span>
        <span className="text-caption text-muted-foreground">{TIPO_LABEL[pqrs.tipo]}</span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
            ESTADO_BADGE[pqrs.estado],
          )}
        >
          {ESTADO_LABEL[pqrs.estado]}
        </span>
        <span className="text-caption text-muted-foreground tabular-nums">
          Radicada el {formatDate(pqrs.createdAt)}
        </span>
        {!resuelta && sla.texto !== '—' && (
          <span
            className={cn(
              'text-caption tabular-nums',
              sla.vencido ? 'font-medium text-destructive' : 'text-muted-foreground',
            )}
          >
            {sla.vencido ? sla.texto : `Vence en ${sla.texto}`}
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-foreground">{pqrs.asunto}</p>
      {pqrs.descripcion && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{pqrs.descripcion}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground tabular-nums">
          {/* La presentó: el tipo de solicitante es un dato del modelo; el
              nombre es texto libre y va tal cual se escribió. */}
          {SOLICITANTE_LABEL[pqrs.solicitanteTipo]} · {pqrs.solicitanteNombre}
          {cerroEl !== null && (
            <>
              {' · '}
              {pqrs.estado === 'CERRADA' ? 'Cerrada' : 'Resuelta'} el {formatDate(cerroEl)}
            </>
          )}
          {pqrs.asignadoANombre !== null && (
            <>
              {' · '}
              {resuelta ? 'Atendió' : 'Atiende'} {pqrs.asignadoANombre}
            </>
          )}
        </p>
        <Link
          href={href}
          className="text-caption font-medium text-primary hover:underline"
          data-testid="pqrs-del-contrato-enlace"
        >
          Ver la solicitud
        </Link>
      </div>
    </li>
  )
}
