'use client'

/**
 * DebtorPicker — elegir un deudor por nombre o cédula.
 *
 * POR QUÉ EXISTE: el modal de «Abrir controversia» pedía el UUID del deudor
 * escrito a mano, con la ayuda «Lo encuentras en el detalle de cada deudor».
 * Eso era literalmente imposible: el UUID sólo vive en la barra de direcciones,
 * no se muestra en ninguna pantalla. El CTA principal de Controversias no se
 * podía usar.
 *
 * Reusa el MISMO contrato y la MISMA mecánica de búsqueda que la lista de
 * Deudores (`useDebtorList`), incluida la ruta de cédula: un número se busca por
 * prefijo hasheado (`HEX:`), nunca mandando la cédula en claro a la query.
 *
 * Refs: DeudoresListClient.tsx:88-118 (debounce + ruta numérica/nombre),
 * docs/DESIGN.md §4 (inputs, listas), memoria: Lenis rompe el scroll de
 * cualquier contenedor con `max-h` dentro de un modal → `data-lenis-prevent`.
 */

import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass, User, X } from '@phosphor-icons/react'

import { Input } from '@/components/ui'
import { Spinner } from '@/components/ui/spinner'
import { hashCedulaPrefix } from '@/lib/cobranza/hash-cedula-prefix'
import { useDebtorList } from '@/lib/hooks/cobranza/use-debtor-list'

/** Lo mínimo que el llamador necesita saber del deudor elegido. */
export interface PickedDebtor {
  id: string
  fullName: string
  cedulaMasked: string
}

export interface DebtorPickerProps {
  value: PickedDebtor | null
  onChange: (debtor: PickedDebtor | null) => void
  /** id del input, para enlazar con su <label>. */
  inputId?: string
}

/** Mismo umbral que la lista de Deudores: menos de 4 dígitos no busca. */
const CEDULA_MIN_DIGITS = 4
const DEBOUNCE_MS = 250
/** Cuántos resultados se ofrecen antes de pedir que afine la búsqueda. */
const MAX_VISIBLE = 8

export function DebtorPicker({ value, onChange, inputId }: DebtorPickerProps) {
  const [query, setQuery] = useState('')
  const [payload, setPayload] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  // Debounce + ruta numérica (cédula por prefijo hasheado) / ruta nombre.
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setHint(null)
      const id = setTimeout(() => setPayload(''), DEBOUNCE_MS)
      return () => clearTimeout(id)
    }
    if (/^\d+$/.test(trimmed)) {
      if (trimmed.length < CEDULA_MIN_DIGITS) {
        setHint(`Escribe al menos ${CEDULA_MIN_DIGITS} dígitos de la cédula.`)
        return
      }
      setHint(null)
      const id = setTimeout(() => {
        void hashCedulaPrefix(trimmed)
          .then((hex) => setPayload(`HEX:${hex}`))
          .catch(() => setPayload(''))
      }, DEBOUNCE_MS)
      return () => clearTimeout(id)
    }
    setHint(null)
    const id = setTimeout(() => setPayload(trimmed), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  const filters = useMemo(
    () => ({ search: payload || undefined }),
    [payload],
  )
  const { pages, isLoading, error } = useDebtorList(filters)

  const visibles = pages.slice(0, MAX_VISIBLE)
  const sobrantes = pages.length - visibles.length

  // Ya hay un deudor elegido: se muestra la selección, no el buscador.
  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <User
            className="w-4 h-4 shrink-0 text-fg-muted"
            weight="duotone"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg truncate">
              {value.fullName}
            </p>
            <p className="text-xs text-fg-muted font-mono tabular-nums">
              {value.cedulaMasked}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setQuery('')
          }}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-fg-muted hover:text-fg hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <MagnifyingGlass
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por nombre o cédula"
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {hint && <p className="text-xs text-fg-muted">{hint}</p>}

      {error && (
        <p className="text-xs text-danger">
          No pudimos cargar los deudores. {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 px-1 py-3 text-xs text-fg-muted">
          <Spinner size="sm" variant="default" />
          Buscando…
        </div>
      ) : pages.length === 0 && !error ? (
        <p className="px-1 py-3 text-xs text-fg-muted">
          {payload
            ? 'Ningún deudor coincide con esa búsqueda.'
            : 'Aún no hay deudores en la cartera.'}
        </p>
      ) : (
        <>
          {/* `data-lenis-prevent`: sin esto Lenis se traga la rueda del ratón y
              la lista no scrollea dentro del modal. */}
          <ul
            data-lenis-prevent
            className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border"
            aria-label="Resultados de deudores"
          >
            {visibles.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      id: d.id,
                      fullName: d.fullName,
                      cedulaMasked: d.cedulaMasked,
                    })
                  }
                  className="w-full text-left px-3 py-2 hover:bg-surface-muted focus-visible:outline-none focus-visible:bg-surface-muted"
                >
                  <span className="block text-sm text-fg truncate">
                    {d.fullName}
                  </span>
                  <span className="block text-xs text-fg-muted font-mono tabular-nums">
                    {d.cedulaMasked}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {sobrantes > 0 && (
            <p className="text-xs text-fg-muted tabular-nums">
              {sobrantes} resultado{sobrantes === 1 ? '' : 's'} más — afina la
              búsqueda.
            </p>
          )}
        </>
      )}
    </div>
  )
}
