'use client'

/**
 * /admin/exogena — los conceptos de exógena y el tope de cuantías menores que
 * Leasefy carga por año y las inmobiliarias heredan (contrato del 19-09, §2).
 *
 * ── 🔴 Publicar es un acto aparte, y ése es todo el punto ──────────────────
 *
 * Un año sin publicar NO lo hereda nadie. Cargar y soltar no pueden ser el
 * mismo clic: sin esa separación, media carga a medio hacer estaría corriendo
 * en 300 inmobiliarias, y un código de concepto equivocado no se ve — pasa el
 * prevalidador y llega mal a la DIAN. Por eso «Guardar» y «Sembrar» nunca
 * publican, y «Publicar» pide confirmación en la misma fila.
 *
 * ── 🔴 El preset es de uso corriente, no la resolución ─────────────────────
 *
 * Sembrar rellena con lo que el código propone. El back devuelve además los
 * que NADIE puede proponer (`sinSugerencia`): ésos hay que leerlos en la
 * resolución del año. Se listan enteros y el aviso del back va tal cual.
 *
 * ── Un `null` no se pinta como cero ────────────────────────────────────────
 *
 * Un año sin tope de cuantías menores dice «sin tope — no se agrupa nada», que
 * es lo correcto: agrupar con un tope inventado esconde terceros que había que
 * declarar uno por uno.
 */

import { useCallback, useState } from 'react'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { ApiError } from '@/lib/admin/api'
import { fmtCOP, fmtDateTime } from '@/lib/admin/format'
import { useApiQuery } from '@/lib/admin/use-api-query'
import {
  guardarAnio,
  listarAnios,
  publicarAnio,
  sembrarConceptos,
  type AnioEnLaLista,
  type ListaDeAnios,
  type ResultadoDeLaSemilla,
} from '@/lib/admin/exogena'

/** El formulario del año. Todo texto: un campo vacío es `undefined`, no `0`. */
interface Formulario {
  anio: string
  resolucion: string
  tope: string
  nit: string
  notas: string
}

const VACIO: Formulario = { anio: '', resolucion: '', tope: '', nit: '', notas: '' }

function formularioDe(fila: AnioEnLaLista): Formulario {
  return {
    anio: String(fila.anio),
    resolucion: fila.resolucion ?? '',
    // 🔴 `null` → campo vacío, nunca «0».
    tope: fila.topeCuantiasMenoresCop === null ? '' : String(fila.topeCuantiasMenoresCop),
    nit: fila.nitCuantiasMenores ?? '',
    notas: fila.notas ?? '',
  }
}

/** `null` = el campo está vacío y no se manda. `'INVALIDO'` frena el guardado. */
function enteroDe(texto: string): number | null | 'INVALIDO' {
  const limpio = texto.trim()
  if (limpio === '') return null
  if (!/^\d+$/.test(limpio)) return 'INVALIDO'
  const n = Number(limpio)
  return Number.isSafeInteger(n) && n > 0 ? n : 'INVALIDO'
}

export default function ExogenaAdminPage() {
  const { data, isLoading, error, refetch } = useApiQuery<ListaDeAnios>(
    (signal) => listarAnios(signal),
    [],
  )

  const [form, setForm] = useState<Formulario>(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [accionError, setAccionError] = useState<string | null>(null)
  const [semilla, setSemilla] = useState<{ anio: number; r: ResultadoDeLaSemilla } | null>(null)

  const anios = data?.anios ?? []
  const noHayTablas = data !== undefined && !data.disponible

  const cambiar = useCallback((cambio: Partial<Formulario>) => {
    setForm((f) => ({ ...f, ...cambio }))
  }, [])

  const anioValido = /^\d{4}$/.test(form.anio.trim()) && Number(form.anio) >= 2000 && Number(form.anio) <= 2100
  const topeParseado = enteroDe(form.tope)
  const problema = !anioValido
    ? 'El año gravable va en cuatro dígitos, entre 2000 y 2100.'
    : topeParseado === 'INVALIDO'
      ? 'El tope va en pesos enteros y mayor que cero. Dejalo vacío si la resolución del año no fija ninguno: sin tope NO se agrupa nada, que es lo correcto.'
      : null

  async function onGuardar() {
    if (problema) return
    setGuardando(true)
    setAccionError(null)
    try {
      await guardarAnio({
        anio: Number(form.anio),
        // Los vacíos se mandan como cadena vacía a propósito: el back los
        // normaliza a `null` (`dto.resolucion?.trim() || null`), que es cómo se
        // BORRA un dato cargado por error. Omitirlos dejaría el anterior.
        resolucion: form.resolucion.trim(),
        nitCuantiasMenores: form.nit.trim(),
        notas: form.notas.trim(),
        ...(topeParseado === null ? {} : { topeCuantiasMenoresCop: topeParseado as number }),
      })
      refetch()
    } catch (err) {
      setAccionError(err instanceof ApiError ? err.message : 'No se pudo guardar el año.')
    } finally {
      setGuardando(false)
    }
  }

  async function onSembrar(anio: number) {
    setOcupado(anio)
    setAccionError(null)
    setSemilla(null)
    try {
      const r = await sembrarConceptos(anio)
      setSemilla({ anio, r })
      refetch()
    } catch (err) {
      setAccionError(err instanceof ApiError ? err.message : 'No se pudo sembrar el preset.')
    } finally {
      setOcupado(null)
    }
  }

  async function onPublicar(anio: number, publicado: boolean) {
    setOcupado(anio)
    setAccionError(null)
    try {
      await publicarAnio(anio, publicado)
      setConfirmando(null)
      refetch()
    } catch (err) {
      setAccionError(err instanceof ApiError ? err.message : 'No se pudo cambiar la publicación.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl" data-testid="admin-exogena">
      <PageHeader
        label="34 · exógena"
        title="Exógena por año"
        description="Los códigos de concepto y el tope de cuantías menores que Leasefy carga por año. Las inmobiliarias los heredan, con opción de sobrescribir — pero SÓLO lo publicado se hereda."
      />

      {/* 🔴 El aviso que hace que publicar sea una decisión, no un clic más. */}
      <div className="card p-4 border-l-4 border-l-warn mb-6" data-testid="aviso-del-preset">
        <p className="text-sm text-fg">
          El preset del código es una <strong>sugerencia de uso corriente, no la resolución</strong>.
          Confirmalo contra la resolución del año antes de publicar: un concepto equivocado no se ve
          — pasa el prevalidador y llega mal a la DIAN. Un año sin publicar no lo hereda nadie.
        </p>
      </div>

      {noHayTablas && (
        <div className="card p-5 border-l-4 border-l-warn mb-6" data-testid="sin-migracion">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-warn">
            migración pendiente
          </span>
          <p className="text-sm text-fg mt-2">
            La base todavía no tiene las tablas de exógena de plataforma (migración{' '}
            <code className="font-mono">20260919001000_exogena_de_plataforma</code>). La aplica
            Víctor. Mientras tanto cada inmobiliaria usa el preset del código, marcado «pendiente de
            confirmar», que es lo de hoy — y cargar un año acá responde 503.
          </p>
        </div>
      )}

      {error && <div className="mb-6"><ErrorBlock error={error} /></div>}
      {accionError && (
        <div className="card p-4 border-l-4 border-l-bad mb-6" data-testid="accion-error">
          <p className="text-sm text-bad">{accionError}</p>
        </div>
      )}

      {/* ── El resultado de sembrar ──────────────────────────────────────── */}
      {semilla && (
        <div className="card p-5 mb-6" data-testid="resultado-de-la-semilla">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            semilla · {semilla.anio}
          </div>
          <p className="text-sm text-fg mt-2">
            {semilla.r.sembrados} conceptos sembrados. {semilla.r.aviso}
          </p>
          {semilla.r.sinSugerencia.length > 0 ? (
            <>
              <p className="text-[13px] text-fg-muted mt-3">
                Estos {semilla.r.sinSugerencia.length} el preset NO los puede proponer: hay que
                leerlos en la resolución y cargarlos a mano.
              </p>
              <ul className="mt-2 space-y-1" data-testid="sin-sugerencia">
                {semilla.r.sinSugerencia.map((s) => (
                  <li key={`${s.formato ?? '—'}-${s.codigoPuc}`} className="text-[13px] text-fg">
                    <span className="font-mono text-fg-subtle">
                      {s.formato ?? 'sin formato'} · {s.codigoPuc}
                    </span>{' '}
                    {s.nombre}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[13px] text-fg-muted mt-3">
              El preset propuso un concepto para cada cuenta. Revisalos igual contra la resolución.
            </p>
          )}
        </div>
      )}

      {/* ── La tabla de años ─────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingBlock label="cargando años" />
      ) : anios.length === 0 ? (
        <EmptyBlock
          title="Ningún año cargado"
          hint="Cargá el año gravable abajo y después sembrá el preset. Publicar es un paso aparte."
        />
      ) : (
        <div className="space-y-px" data-testid="anios">
          {anios.map((a) => (
            <div key={a.anio} className="card p-5" data-testid={`anio-${a.anio}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-fg">{a.anio}</span>
                    <Pill tone={a.publicado ? 'ok' : 'muted'}>
                      {a.publicado ? 'publicado' : 'borrador'}
                    </Pill>
                    <span className="font-mono text-[10px] text-fg-subtle">
                      {a.conceptos} conceptos
                    </span>
                  </div>
                  <p className="text-[13px] text-fg-muted mt-1">
                    {a.resolucion ?? 'sin resolución cargada'}
                  </p>
                  <p className="text-[13px] text-fg-muted">
                    {/* 🔴 `null` NO es cero. */}
                    Tope:{' '}
                    {a.topeCuantiasMenoresCop === null
                      ? 'sin tope — no se agrupa nada'
                      : fmtCOP(a.topeCuantiasMenoresCop)}
                    {' · '}
                    NIT: {a.nitCuantiasMenores ?? '—'}
                  </p>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mt-2">
                    {a.publicado ? `publicado: ${fmtDateTime(a.publicadoAt)}` : 'nadie lo hereda'}
                    {a.actualizadoPor ? ` · ${a.actualizadoPor}` : ''}
                  </div>
                  {a.notas ? <p className="text-[13px] text-fg-muted mt-2">{a.notas}</p> : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn"
                    disabled={ocupado === a.anio}
                    onClick={() => setForm(formularioDe(a))}
                    data-testid={`corregir-${a.anio}`}
                  >
                    Corregir
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={ocupado === a.anio}
                    onClick={() => void onSembrar(a.anio)}
                    data-testid={`sembrar-${a.anio}`}
                  >
                    Sembrar el preset
                  </button>
                  {a.publicado ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={ocupado === a.anio}
                      onClick={() => void onPublicar(a.anio, false)}
                      data-testid={`despublicar-${a.anio}`}
                    >
                      Despublicar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={ocupado === a.anio || a.conceptos === 0}
                      title={
                        a.conceptos === 0
                          ? 'El año no tiene ningún concepto: publicarlo vacío haría que las inmobiliarias hereden nada y crean que sí.'
                          : undefined
                      }
                      onClick={() => setConfirmando(a.anio)}
                      data-testid={`publicar-${a.anio}`}
                    >
                      Publicar
                    </button>
                  )}
                </div>
              </div>

              {a.conceptos === 0 && !a.publicado ? (
                <p className="text-[13px] text-warn mt-3" data-testid={`sin-conceptos-${a.anio}`}>
                  Sin conceptos cargados no se puede publicar: las inmobiliarias heredarían nada y
                  creerían que sí.
                </p>
              ) : null}

              {/* 🔴 La confirmación es nuestra, en la fila. Nada de `confirm()`. */}
              {confirmando === a.anio ? (
                <div
                  className="card p-4 mt-4 border-l-4 border-l-brand"
                  data-testid={`confirmar-publicar-${a.anio}`}
                >
                  <p className="text-sm text-fg">
                    Publicar {a.anio} hace que TODAS las inmobiliarias hereden estos{' '}
                    {a.conceptos} conceptos y este tope. ¿Ya los confirmaste contra la resolución?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={ocupado === a.anio}
                      onClick={() => void onPublicar(a.anio, true)}
                      data-testid={`confirmar-publicar-si-${a.anio}`}
                    >
                      Sí, publicar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={ocupado === a.anio}
                      onClick={() => setConfirmando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* ── Cargar o corregir un año ─────────────────────────────────────── */}
      <div className="card p-5 mt-6" data-testid="formulario-de-anio">
        <div className="section-label">cargar / corregir el año</div>
        <p className="text-[13px] text-fg-muted mt-2">
          Esto <strong>no publica</strong>. Un año existente se sobrescribe con lo que haya acá.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              año gravable
            </span>
            <input
              className="input mt-1"
              value={form.anio}
              inputMode="numeric"
              placeholder="2026"
              onChange={(e) => cambiar({ anio: e.target.value })}
              data-testid="campo-anio"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              resolución
            </span>
            <input
              className="input mt-1"
              value={form.resolucion}
              placeholder="Resolución 000162 de 2023"
              onChange={(e) => cambiar({ resolucion: e.target.value })}
              data-testid="campo-resolucion"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              tope de cuantías menores (pesos)
            </span>
            <input
              className="input mt-1"
              value={form.tope}
              inputMode="numeric"
              placeholder="Vacío = no se agrupa nada"
              onChange={(e) => cambiar({ tope: e.target.value })}
              data-testid="campo-tope"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              NIT de cuantías menores
            </span>
            <input
              className="input mt-1"
              value={form.nit}
              placeholder="222222222"
              onChange={(e) => cambiar({ nit: e.target.value })}
              data-testid="campo-nit"
            />
          </label>
        </div>

        <label className="block mt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            notas
          </span>
          <textarea
            className="textarea mt-1"
            rows={2}
            value={form.notas}
            onChange={(e) => cambiar({ notas: e.target.value })}
            data-testid="campo-notas"
          />
        </label>

        {problema && form.anio !== '' ? (
          <p className="text-[13px] text-bad mt-3" data-testid="problema-del-anio">
            {problema}
          </p>
        ) : null}

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            className="btn btn-primary"
            disabled={guardando || problema !== null}
            onClick={() => void onGuardar()}
            data-testid="guardar-anio"
          >
            {guardando ? 'Guardando…' : 'Guardar el año'}
          </button>
          {form.anio !== '' ? (
            <button type="button" className="btn btn-ghost" onClick={() => setForm(VACIO)}>
              Limpiar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
