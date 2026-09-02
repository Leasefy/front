'use client'

/**
 * useTablePagination — paginado en cliente para las tablas de lista del panel.
 *
 * Es la mecánica que ya usaba a mano la pantalla de Habeas Data (`arco/page.tsx`),
 * extraída para no repetirla en cada tabla. Va con `TablePagination`
 * (`@/components/ui/pagination`), el pie de tabla del design system.
 *
 * CUÁNDO USARLO
 * Cuando el endpoint devuelve la lista completa (o una página grande) y el
 * recorte es de presentación. Si la fuente es un cursor del backend — como los
 * logs de Cumplimiento, que son append-only y crecen sin techo — el patrón
 * correcto es «Cargar más» con `nextCursor`, no esto.
 *
 * DOS DETALLES QUE IMPORTAN
 *
 * 1. Al cambiar un filtro, la página vuelve a 1. Sin esto, filtrar estando en
 *    la página 4 deja la tabla vacía sobre un resultado que sí tiene filas, y
 *    se lee como «no hay nada» cuando lo que pasa es que te fuiste del rango.
 *    Pasale una `resetKey` con lo que dependa del filtro.
 *
 * 2. Si el total encoge por debajo de la página actual (llegó un refresh con
 *    menos filas), la página se ajusta sola al último rango con datos.
 */

import { useEffect, useMemo, useState } from 'react'

/** Las filas del panel son altas; 10 llena la pantalla sin scroll hasta el pie. */
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50]

export interface UseTablePaginationOptions {
  /** Tamaño inicial de página. */
  initialPageSize?: number
  /**
   * Cambia cuando cambian los filtros → vuelve a la página 1. Serializá acá
   * todo lo que altere el conjunto de filas (p. ej. `${estado}|${canal}`).
   */
  resetKey?: string
}

export interface UseTablePaginationResult<T> {
  /** Sólo las filas de la página actual. */
  pageItems: T[]
  /** Total de filas del filtro activo (lo que cuenta el pie, no `pageItems.length`). */
  total: number
  page: number
  pageSize: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  /**
   * El pie se monta siempre que haya filas (Nico, 2026-09-02: «esta tabla
   * debe tener paginación», mirando una de tres filas). Con una sola página
   * igual dice «Mostrando 1–3 de 3» y deja elegir cuántas filas ver: es lo
   * que hace que una tabla se lea como tabla. Sin filas, no: el vacío ya lo
   * dice la pantalla.
   */
  shouldPaginate: boolean
}

export function useTablePagination<T>(
  items: T[],
  options: UseTablePaginationOptions = {},
): UseTablePaginationResult<T> {
  const { initialPageSize = DEFAULT_PAGE_SIZE, resetKey } = options

  const [requestedPage, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  /**
   * La página efectiva se DERIVA, no se corrige con un efecto.
   *
   * La primera versión usaba dos efectos —uno para volver a la página 1 al
   * cambiar de filtro, otro para reencuadrar cuando el total encogía— y se
   * pisaban: al filtrar desde la página 4, el reset ponía 1 y el reencuadre,
   * leyendo el `page` viejo, lo mandaba a 2. Derivando no hay orden que
   * negociar.
   */
  const page = Math.min(requestedPage, lastPage)

  // Filtro nuevo ⇒ volver al principio.
  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const setPageSize = (size: number) => {
    setPageSizeState(size)
    setPage(1)
  }

  return {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate: total > 0,
  }
}
