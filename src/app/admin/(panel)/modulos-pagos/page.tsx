'use client'

/**
 * /admin/modulos-pagos — inmobiliarias × módulos de PAGO.
 *
 * Nico (17-09): «pantalla de administración de Leasefy con inmobiliarias ×
 * módulos comprados, prender y apagar, y registro de quién lo hizo y cuándo. Que
 * viva detrás del mismo gate de dueño».
 *
 * ── 🔴 Tres decisiones de esta pantalla ────────────────────────────────────
 *
 * 1. **Trae TODAS las inmobiliarias**, no sólo las que compraron algo: la
 *    pregunta que se hace desde acá es «¿a quién falta venderle?», y una lista
 *    que sólo muestra clientes no la contesta.
 * 2. **Pide MOTIVO para prender o apagar.** El back no lo exige; esta pantalla
 *    sí. Un entitlement de pago que nadie explicó es imposible de auditar seis
 *    meses después — y el que lo va a leer es alguien que no estaba ese día.
 * 3. **Apagar se confirma; prender no.** Prender abre una pantalla; apagar se la
 *    quita a alguien que la está usando, y eso no debería pasar por un clic
 *    distraído. (Acá sí se usa `window.confirm`: el backoffice tiene su propio
 *    sistema de diseño y no tiene modales — es la zona permitida por
 *    `sin-dialogos-del-navegador.test.ts`.)
 */

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Pill } from '@/components/admin/Pill'
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from '@/components/admin/screen/states'
import { ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import {
  fijarModulo,
  getMatrizDeModulos,
  type FilaDeLaMatriz,
  type MatrizDeModulos,
} from '@/lib/admin/modulos-pagos'

/** `2026-09-17T…` → `2026-09-17`. */
function soloFecha(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '—'
}

export default function ModulosPagosPage() {
  const [busqueda, setBusqueda] = useState('')
  const [aplicada, setAplicada] = useState('')
  const { data, isLoading, error, refetch } = useApiQuery<MatrizDeModulos>(
    (signal) => getMatrizDeModulos({ q: aplicada || undefined }, signal),
    [aplicada],
  )

  const [ocupado, setOcupado] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [soloConModulos, setSoloConModulos] = useState(false)

  const catalogo = data?.catalogo ?? []
  const agencias = useMemo(() => data?.agencias ?? [], [data])

  const conAlguno = useMemo(
    () =>
      agencias.filter((a) =>
        Object.values(a.modulos).some((m) => m.habilitado),
      ),
    [agencias],
  )
  const visibles = soloConModulos ? conAlguno : agencias

  async function alternar(
    fila: FilaDeLaMatriz,
    modulo: string,
    nombreDelModulo: string,
  ) {
    const estado = fila.modulos[modulo]
    const prender = !estado?.habilitado
    const llave = `${fila.agencyId}:${modulo}`

    // 🔴 Apagar se confirma. Prender abre una pantalla; apagar se la quita a
    // alguien que puede estar liquidando la nómina del mes.
    if (
      !prender &&
      !window.confirm(
        `¿Apagar "${nombreDelModulo}" para ${fila.nombre}?\n\n` +
          'Dejan de ver el módulo en el menú y sus rutas responden 402. ' +
          'Los datos NO se borran: si lo vuelves a prender, está todo como estaba.',
      )
    ) {
      return
    }

    const motivo = window.prompt(
      prender
        ? `¿Por qué se le prende "${nombreDelModulo}" a ${fila.nombre}?\n\n(Ej.: "contrato firmado 2026-09-17". Queda guardado con tu correo y la fecha.)`
        : `¿Por qué se le apaga "${nombreDelModulo}" a ${fila.nombre}?\n\n(Ej.: "mora de 3 meses". Queda guardado con tu correo y la fecha.)`,
      '',
    )
    // Cancelar el motivo cancela la acción: un entitlement sin explicación es
    // exactamente lo que esta pantalla existe para evitar.
    if (motivo === null || motivo.trim() === '') return

    setFallo(null)
    setOcupado(llave)
    try {
      await fijarModulo(fila.agencyId, modulo, {
        habilitado: prender,
        motivo: motivo.trim(),
      })
      refetch()
    } catch (err) {
      setFallo(
        err instanceof ApiError
          ? err.message
          : `No se pudo ${prender ? 'prender' : 'apagar'} el módulo.`,
      )
    } finally {
      setOcupado(null)
    }
  }

  return (
    <>
      <PageHeader
        label="módulos de pago"
        title="Inmobiliarias × módulos"
        description="Qué módulo de pago tiene comprado cada inmobiliaria, quién se lo prendió y cuándo. Prender o apagar desde acá es lo único que lo cambia: ninguna inmobiliaria puede activárselo sola."
      />

      {data && !data.disponible && (
        <div className="card p-4 border-l-4 border-l-warn mb-6">
          <p className="text-sm text-fg">{data.motivo}</p>
        </div>
      )}

      {fallo && (
        <div className="card p-4 border-l-4 border-l-bad mb-6">
          <p className="text-sm text-bad">{fallo}</p>
        </div>
      )}

      <form
        className="flex flex-wrap items-center gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault()
          setAplicada(busqueda.trim())
        }}
      >
        <input
          className="input"
          placeholder="Buscar por nombre o NIT"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar inmobiliaria"
        />
        <button className="btn" type="submit">
          Buscar
        </button>
        <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer select-none ml-auto">
          <input
            type="checkbox"
            className="accent-brand"
            checked={soloConModulos}
            onChange={(e) => setSoloConModulos(e.target.checked)}
          />
          Sólo las que compraron algo ({conAlguno.length})
        </label>
      </form>

      {isLoading ? (
        <LoadingBlock label="cargando inmobiliarias" />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : visibles.length === 0 ? (
        <EmptyBlock
          title={
            soloConModulos
              ? 'Ninguna inmobiliaria tiene módulos de pago'
              : 'Sin inmobiliarias'
          }
          hint={
            soloConModulos
              ? 'Desmarca el filtro para ver todas y prenderle el módulo a alguna.'
              : 'Ajusta la búsqueda.'
          }
        />
      ) : (
        <>
          <p className="text-xs text-fg-muted mb-3">
            Mostrando {visibles.length} de {agencias.length} inmobiliarias ·{' '}
            {conAlguno.length} con al menos un módulo comprado
          </p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-bg-border">
                  {['Inmobiliaria', 'NIT', ...catalogo.map((c) => c.nombre)].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle whitespace-nowrap text-left"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visibles.map((a) => (
                  <tr key={a.agencyId}>
                    <td className="px-3 py-2.5">{a.nombre}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-fg-muted">
                      {a.nit ?? '—'}
                    </td>
                    {catalogo.map((c) => {
                      const m = a.modulos[c.modulo]
                      const llave = `${a.agencyId}:${c.modulo}`
                      return (
                        <td key={c.modulo} className="px-3 py-2.5">
                          <div className="flex flex-col gap-1.5 items-start">
                            <Pill tone={m?.habilitado ? 'ok' : 'muted'}>
                              {m?.habilitado ? 'Comprado' : 'Apagado'}
                            </Pill>
                            {/* 🔴 Quién y cuándo: es lo que hace auditable la venta. */}
                            {m?.habilitadoPorEmail && (
                              <span className="text-[10px] text-fg-subtle leading-tight">
                                {m.habilitadoPorEmail} · {soloFecha(m.habilitadoAt)}
                                {m.motivo ? ` · ${m.motivo}` : ''}
                              </span>
                            )}
                            <button
                              className="btn"
                              disabled={ocupado === llave || !data?.disponible}
                              onClick={() => void alternar(a, c.modulo, c.nombre)}
                            >
                              {ocupado === llave
                                ? '…'
                                : m?.habilitado
                                  ? 'Apagar'
                                  : 'Prender'}
                            </button>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-4 mt-6">
            <p className="section-label mb-2">Qué es cada módulo</p>
            <dl className="space-y-2">
              {catalogo.map((c) => (
                <div key={c.modulo}>
                  <dt className="text-sm text-fg">{c.nombre}</dt>
                  <dd className="text-xs text-fg-muted leading-relaxed">
                    {c.descripcion}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}
    </>
  )
}
