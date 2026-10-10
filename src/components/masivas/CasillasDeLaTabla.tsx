'use client'

/**
 * Las dos casillas de una tabla con acciones masivas (Nico, 10-10-2026): la
 * de arriba (las de esta página) y la de cada fila. Iguales en todas las
 * tablas para que marcar se aprenda una vez.
 *
 * La de la fila corta el clic: las filas abren su ficha al tocarlas, y marcar
 * no es abrir.
 */

import { Checkbox } from '@/components/ui/checkbox'
import { casillaDeLaPagina } from '@/lib/hooks/use-filas-marcadas'

export function CasillaDeLaPagina({
  ids,
  marcadas,
  onMarcar,
  queSon,
}: {
  /** Las filas de ESTA página que se pueden marcar. */
  ids: readonly string[]
  marcadas: ReadonlySet<string>
  onMarcar: (ids: readonly string[], si: boolean) => void
  /** «propietarios», para el lector de pantalla. */
  queSon: string
}) {
  if (ids.length === 0) return null
  const estado = casillaDeLaPagina(ids, marcadas)
  return (
    <Checkbox
      checked={estado}
      onCheckedChange={() => onMarcar(ids, estado !== true)}
      aria-label={`Marcar los ${queSon} de esta página`}
      data-testid="marcar-la-pagina"
    />
  )
}

export function CasillaDeLaFila({
  id,
  nombre,
  marcadas,
  onMarcar,
}: {
  id: string
  nombre: string
  marcadas: ReadonlySet<string>
  onMarcar: (ids: readonly string[], si: boolean) => void
}) {
  return (
    <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={marcadas.has(id)}
        onCheckedChange={(v) => onMarcar([id], v === true)}
        aria-label={`Marcar ${nombre}`}
        data-testid="marcar-fila"
      />
    </span>
  )
}
