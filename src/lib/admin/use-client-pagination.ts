'use client'

import { useMemo } from 'react'
import { useUrlFilters } from './use-url-filters'

/**
 * Paginado en CLIENTE para pantallas del backoffice cuyo endpoint devuelve el
 * arreglo entero.
 *
 * El patrón canónico del admin es del SERVIDOR: `page` viaja como query param y
 * la respuesta trae `total` (`Paginated<T>` en `./types`) — así lo hacen
 * `/payments`, `/audits`, `/calls`, `/opt-outs` y `/cartera/[stage]`. Cuando el
 * back todavía expone un arreglo pelado (sin `page`/`limit`, sin `total`), el
 * recorte se hace acá para que la tabla siga siendo navegable.
 *
 * ⚠️ Esto NO alivia la red: el payload sigue viniendo completo. Es un arreglo de
 * presentación mientras el endpoint no tenga contrato paginado.
 *
 * La página efectiva se DERIVA (`min(pedida, última)`), no se corrige con un
 * efecto — misma razón que en `useTablePagination` del panel: si un refresh trae
 * menos filas que la página pedida, o alguien entra con `?page=9` a mano,
 * recortar sin clamp deja la tabla vacía y se lee como «no hay nada» cuando sí
 * hay datos.
 *
 * Se mantiene la página en la URL (`useUrlFilters`) para no romper la promesa
 * del backoffice de que toda tabla es enlazable/marcable.
 */
export function useClientPagination<T>(rows: T[] | undefined, pageSize: number) {
  const { page: requestedPage, setPage } = useUrlFilters()

  const total = rows?.length ?? 0
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1)
  const page = Math.min(Math.max(requestedPage, 0), lastPage)

  const pageRows = useMemo(
    () => (rows ? rows.slice(page * pageSize, page * pageSize + pageSize) : undefined),
    [rows, page, pageSize],
  )

  return { page, setPage, total, pageRows }
}
