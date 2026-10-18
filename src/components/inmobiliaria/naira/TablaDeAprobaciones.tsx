'use client'

/**
 * TablaDeAprobaciones — todo lo que Naira propone en UNA tabla (Nico, 18-10-2026: «todo lo que hay que aprobar debería
 * quedar en una tabla para poder ver todo lo que Naira muestra o propone»), con el patrón de las listas del panel: tabla
 * paginada, tarjetas bajo 768 px y cada fila abre el detalle en un cajón (ahí se aprueba o se rechaza).
 *
 * Columnas: qué propone (con la consecuencia SOLO junto a sus cortes, E13-6), tipo, para quién (un ROL, nunca una
 * persona: B-5), estado y la fecha (vence, entre lo por decidir; cuándo se propuso, entre lo decidido). Abrir una fila no
 * pide nada: el detalle lo pide el cajón al montarse (D13-14). Este archivo no importa hooks de datos.
 */

import type { JSX } from 'react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { TablePagination } from '@/components/ui/pagination'
import { Table, TableBodyAnimado, TableCell, TableHead, TableHeader, TableRow, TableRowAnimada } from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { diaEnColombia, fechaCorta } from '@/lib/fechas/fecha-de-la-casa'
import { PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
import { useI18n } from '@/lib/i18n'
import { paginaDe, paraDeLaAccion, type FilaDeAprobacion } from '@/lib/naira/filas-de-aprobaciones'
import {
  CLAVE_DE_LA_CLASE_DE_CONSECUENCIA,
  CLAVE_DEL_ESTADO_DE_LA_PROPUESTA,
  CLAVE_DEL_TIPO_DE_ACCION,
  consecuenciaDelListado,
} from '@/lib/naira/vocabulario-de-aprobaciones'

import { porQueDelCambioDeModo, tituloDelCambioDeModo } from './DetalleDelCambioDeModo'
import { MarcaDeCorte } from './MarcaDeCorte'

const T = 'inmobiliaria.ai.naira.aprobaciones.tabla'

export interface TablaDeAprobacionesProps {
  readonly filas: readonly FilaDeAprobacion[]
  /** Qué fecha va en la última columna. */
  readonly fecha: 'vence' | 'propuesta'
  readonly onAbrir: (fila: FilaDeAprobacion) => void
}

interface FilaDicha {
  readonly que: string
  readonly segunda: JSX.Element | null
  readonly tipo: string
  readonly para: string
  readonly estado: string
  readonly fecha: string
  readonly datos: Record<`data-${string}`, string>
}

function useDecir(): (fila: FilaDeAprobacion, fecha: 'vence' | 'propuesta') => FilaDicha {
  const { t } = useI18n()
  return (fila, fecha): FilaDicha => {
    if (fila.kind === 'modo') {
      const c = fila.cambio
      return {
        que: tituloDelCambioDeModo(t, c),
        segunda: <p className="line-clamp-2 text-caption text-fg-muted">{porQueDelCambioDeModo(t, c)}</p>,
        tipo: t(`${T}.cambioDeModo`),
        para: c.nombre.split(' (')[0] ?? c.nombre,
        estado: t(`inmobiliaria.ai.naira.cambiosDeModo.estados.${c.estado}`),
        fecha: fechaCorta(diaEnColombia(fecha === 'vence' ? c.expiraEn : c.propuestoEn)),
        datos: { 'data-naira-fila': 'modo', 'data-naira-cambio-de-modo': c.estado },
      }
    }
    const a = fila.accion
    const consecuencia = consecuenciaDelListado(a)
    return {
      que: t(CLAVE_DEL_TIPO_DE_ACCION[a.tipo]),
      // E13-6: la consecuencia del listado va SOLO con sus cortes al lado; sin un corte válido, no sale.
      segunda:
        consecuencia.kind === 'con_corte' ? (
          <>
            <p data-naira-consecuencia-del-listado="" className="line-clamp-2 text-caption text-fg-muted">
              {consecuencia.texto}
            </p>
            <div data-naira-cortes-del-listado="" className="flex flex-wrap items-center gap-2">
              {consecuencia.asOfs.map((asOf) => (
                <MarcaDeCorte key={asOf} asOf={asOf} />
              ))}
            </div>
          </>
        ) : consecuencia.kind === 'no_reproducible' ? (
          <p data-naira-no-reproducible="" className="text-caption text-fg-muted">
            {t('inmobiliaria.ai.naira.aprobaciones.noReproducible')}
          </p>
        ) : null,
      tipo: t(CLAVE_DE_LA_CLASE_DE_CONSECUENCIA[a.clase]),
      para: paraDeLaAccion(t, a),
      estado: t(CLAVE_DEL_ESTADO_DE_LA_PROPUESTA[a.estado]),
      fecha: fechaCorta(diaEnColombia(fecha === 'vence' ? a.venceEn : a.propuestaEn)),
      datos: { 'data-naira-fila': 'accion', 'data-naira-propuesta': a.estado },
    }
  }
}

export function TablaDeAprobaciones({ filas, fecha, onAbrir }: TablaDeAprobacionesProps): JSX.Element {
  const { t } = useI18n()
  const decir = useDecir()
  const esCelular = useIsMobile()
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(PAGE_SIZE_OPTIONS[1] ?? 25)
  // Si la lista se achica (algo se decidió), no quedarse en una página vacía.
  const ultima = Math.max(1, Math.ceil(filas.length / porPagina))
  const vigente = Math.min(pagina, ultima)
  const visibles = paginaDe(filas, vigente, porPagina)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface" data-naira-tabla-de-aprobaciones={fecha}>
      {esCelular ? (
        <ul className="divide-y divide-border-faint">
          {visibles.map((fila) => {
            const d = decir(fila, fecha)
            return (
              <li key={fila.clave} {...d.datos}>
                {/* allowlist: tarjeta de la lista que abre el cajón — fila completa tocable, no un botón de acción. */}
                <button
                  type="button"
                  onClick={() => onAbrir(fila)}
                  aria-label={t(`${T}.verDetalle`, { que: d.que })}
                  className="w-full space-y-2 px-4 py-3 text-left focus-visible:bg-surface-muted focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium text-fg">{d.que}</p>
                    <Badge variant="secondary" className="shrink-0">
                      {d.estado}
                    </Badge>
                  </div>
                  {d.segunda}
                  <p className="text-caption text-fg-muted">
                    {d.tipo} · {d.para} · <span className="font-mono tabular-nums">{d.fecha}</span>
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t(`${T}.que`)}</TableHead>
              <TableHead className="whitespace-nowrap">{t(`${T}.tipo`)}</TableHead>
              <TableHead className="whitespace-nowrap">{t(`${T}.para`)}</TableHead>
              <TableHead className="whitespace-nowrap">{t(`${T}.estado`)}</TableHead>
              <TableHead className="whitespace-nowrap">{t(`${T}.${fecha}`)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBodyAnimado>
            {visibles.map((fila) => {
              const d = decir(fila, fecha)
              const abrir = () => onAbrir(fila)
              return (
                <TableRowAnimada
                  key={fila.clave}
                  className="cursor-pointer"
                  tabIndex={0}
                  aria-label={t(`${T}.verDetalle`, { que: d.que })}
                  onClick={abrir}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      abrir()
                    }
                  }}
                  {...d.datos}
                >
                  <TableCell className="max-w-[480px] space-y-1">
                    <p className="font-medium text-fg">{d.que}</p>
                    {d.segunda}
                  </TableCell>
                  <TableCell className="text-fg-muted">{d.tipo}</TableCell>
                  <TableCell className="text-fg-muted">{d.para}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="secondary">{d.estado}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg-muted">{d.fecha}</TableCell>
                </TableRowAnimada>
              )
            })}
          </TableBodyAnimado>
        </Table>
      )}
      {filas.length > (PAGE_SIZE_OPTIONS[0] ?? 10) ? (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={filas.length}
            page={vigente}
            pageSize={porPagina}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPagina}
            onPageSizeChange={(tam) => {
              setPorPagina(tam)
              setPagina(1)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
