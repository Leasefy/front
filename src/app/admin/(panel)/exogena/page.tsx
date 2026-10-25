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

import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { useCallback, useState } from 'react'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
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
import { Alert, Card, MonoLabel } from '@leasefy/cadence'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
  const problema = form.anio.trim() === ''
    ? 'Escribe el año gravable.'
    : !anioValido
    ? 'El año gravable va en cuatro dígitos, entre 2000 y 2100.'
    : topeParseado === 'INVALIDO'
      ? 'El tope va en pesos enteros y mayor que cero. Déjalo vacío si la resolución del año no fija ninguno: sin tope NO se agrupa nada, que es lo correcto.'
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
      setAccionError(mensajeDelAdmin(err, { accion: 'guardar el año', porDefecto: 'No se pudo guardar el año.' }))
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
      setAccionError(mensajeDelAdmin(err, { accion: 'cargar los conceptos sugeridos', porDefecto: 'No se pudieron cargar los conceptos sugeridos.' }))
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
      setAccionError(mensajeDelAdmin(err, { accion: 'cambiar la publicación', porDefecto: 'No se pudo cambiar la publicación.' }))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="admin-exogena">
      <PageHeader
        title="Exógena"
        description="Los conceptos y el tope de cuantías menores que Leasefy carga cada año."
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="La exógena de Leasefy" variante="secundario">
            <p className="text-body-sm text-fg-muted">Las inmobiliarias heredan sólo lo publicado y lo pueden sobrescribir.</p>
          </ParaEntenderMas>
        }
      />

      {/* 🔴 El aviso que hace que publicar sea una decisión, no un clic más. Ronda 28 (revisora r27): sólo
          cuando hay un año con conceptos por publicar (sin año eran tres bloques para una tarea) y sin negritas. */}
      {anios.some((a) => !a.publicado && a.conceptos > 0) ? (
        <Alert variant="warning" title="Antes de publicar, confírmalo contra la resolución" data-testid="aviso-del-preset">
          <p className="text-body-sm">
            Los conceptos sugeridos por Leasefy son una sugerencia de uso corriente, no la resolución. Confírmalo
            contra la resolución del año antes de publicar: un concepto equivocado pasa el prevalidador y llega mal a
            la DIAN. Un año sin publicar no lo hereda nadie.
          </p>
        </Alert>
      ) : null}

      {noHayTablas && (
        <Card className="p-5  mb-6" data-testid="sin-migracion">
          <p className="text-body-sm font-medium text-fg">Falta preparar la base de la exógena</p>
          <p className="text-body-sm text-fg-muted mt-1">
            La base todavía no tiene las tablas de exógena de plataforma. La aplica el equipo técnico. Mientras tanto cada
            inmobiliaria usa los conceptos sugeridos, marcados «pendiente de confirmar», que es lo de hoy, y cargar un año
            aquí todavía no se puede.
          </p>
          <MasDetalles etiqueta="Ver el nombre de la migración" etiquetaAbierto="Ocultar el nombre" montadoSiempre className="mt-3">
            <code className="font-mono text-caption text-fg-muted">20260919001000_exogena_de_plataforma</code>
          </MasDetalles>
        </Card>
      )}

      {error && <div className="mb-6"><ErrorBlock error={error} onReintentar={refetch} /></div>}
      {accionError && (
        <Card className="p-4  mb-6" data-testid="accion-error">
          <p className="text-body-sm text-danger">{accionError}</p>
        </Card>
      )}

      {/* ── El resultado de sembrar ──────────────────────────────────────── */}
      {semilla && (
        <Card className="p-5 mb-6" data-testid="resultado-de-la-semilla">
          <MonoLabel className="block">
            semilla · {semilla.anio}
          </MonoLabel>
          <p className="text-body-sm text-fg mt-2">
            {semilla.r.sembrados} conceptos cargados. Son una sugerencia de uso corriente, no la resolución.
          </p>
          {semilla.r.sinSugerencia.length > 0 ? (
            <>
              <p className="text-caption text-fg-muted mt-3">
                Estos {semilla.r.sinSugerencia.length} la sugerencia NO los puede proponer: hay que
                leerlos en la resolución y cargarlos a mano.
              </p>
              <ul className="mt-2 space-y-1" data-testid="sin-sugerencia">
                {semilla.r.sinSugerencia.map((s) => (
                  <li key={`${s.formato ?? '—'}-${s.codigoPuc}`} className="text-caption text-fg">
                    <span className="font-mono text-fg-subtle">
                      {s.formato ?? 'sin formato'} · {s.codigoPuc}
                    </span>{' '}
                    {s.nombre}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-caption text-fg-muted mt-3">
              La sugerencia propuso un concepto para cada cuenta. Revísalos igual contra la resolución.
            </p>
          )}
        </Card>
      )}

      {/* ── La tabla de años ─────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingBlock label="cargando años" />
      ) : anios.length === 0 ? (
        // Ronda 28 (revisora r27): sin año, el formulario de abajo ES el vacío (antes un vacío que decía
        // «Carga el año… abajo» y el formulario debajo).
        null
      ) : (
        <div className="space-y-px" data-testid="anios">
          {anios.map((a) => (
            <Card className="p-5" key={a.anio}  data-testid={`anio-${a.anio}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-subtitle tabular-nums text-fg">{a.anio}</span>
                    <Pill tone={a.publicado ? 'ok' : 'muted'}>
                      {a.publicado ? 'Publicado' : 'Borrador'}
                    </Pill>
                    <span className="text-caption text-fg-muted">
                      <span className="font-mono tabular-nums">{a.conceptos}</span> conceptos
                    </span>
                  </div>
                  <p className="text-caption text-fg-muted mt-1">
                    {a.resolucion ?? 'sin resolución cargada'}
                  </p>
                  <p className="text-caption text-fg-muted">
                    {/* 🔴 `null` NO es cero. */}
                    Tope:{' '}
                    {a.topeCuantiasMenoresCop === null
                      ? 'sin tope — no se agrupa nada'
                      : fmtCOP(a.topeCuantiasMenoresCop)}
                    {' · '}
                    NIT: {a.nitCuantiasMenores ?? '—'}
                  </p>
                  <MonoLabel className="block mt-2">
                    {a.publicado ? `publicado: ${fmtDateTime(a.publicadoAt)}` : 'nadie lo hereda'}
                    {a.actualizadoPor ? ` · ${a.actualizadoPor}` : ''}
                  </MonoLabel>
                  {a.notas ? <p className="text-caption text-fg-muted mt-2">{a.notas}</p> : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline" size="sm" hideArrow type="button"
                    disabled={ocupado === a.anio}
                    onClick={() => setForm(formularioDe(a))}
                    data-testid={`corregir-${a.anio}`}
                  >
                    Corregir
                  </Button>
                  <Button variant="outline" size="sm" hideArrow type="button"
                    disabled={ocupado === a.anio}
                    onClick={() => void onSembrar(a.anio)}
                    data-testid={`sembrar-${a.anio}`}
                  >
                    Cargar los conceptos sugeridos
                  </Button>
                  {a.publicado ? (
                    <Button variant="outline" size="sm" hideArrow type="button"
                      disabled={ocupado === a.anio}
                      onClick={() => void onPublicar(a.anio, false)}
                      data-testid={`despublicar-${a.anio}`}
                    >
                      Despublicar
                    </Button>
                  ) : (
                    <Button hideArrow type="button"
                      
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
                    </Button>
                  )}
                </div>
              </div>

              {a.conceptos === 0 && !a.publicado ? (
                <p className="text-caption text-warning mt-3" data-testid={`sin-conceptos-${a.anio}`}>
                  Sin conceptos cargados no se puede publicar: las inmobiliarias heredarían nada y
                  creerían que sí.
                </p>
              ) : null}

              {/* 🔴 La confirmación es nuestra, en la fila. Nada de `confirm()`. */}
              {confirmando === a.anio ? (
                <Card className="p-4 mt-4 " data-testid={`confirmar-publicar-${a.anio}`}>
                  <p className="text-body-sm text-fg">
                    Publicar {a.anio} hace que TODAS las inmobiliarias hereden estos{' '}
                    {a.conceptos} conceptos y este tope. ¿Ya los confirmaste contra la resolución?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button hideArrow type="button"
                      
                      disabled={ocupado === a.anio}
                      onClick={() => void onPublicar(a.anio, true)}
                      data-testid={`confirmar-publicar-si-${a.anio}`}
                    >
                      Sí, publicar
                    </Button>
                    <Button variant="ghost" hideArrow type="button"
                      
                      disabled={ocupado === a.anio}
                      onClick={() => setConfirmando(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </Card>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {/* ── Cargar o corregir un año ─────────────────────────────────────── */}
      <Card className="p-5" data-testid="formulario-de-anio">
        <h2 className="text-body font-medium text-fg">
          {anios.length === 0 && !isLoading ? 'Carga el primer año gravable' : 'Cargar o corregir un año'}
        </h2>
        <p className="text-caption text-fg-muted mt-1">
          {anios.length === 0 && !isLoading
            ? 'Todavía no hay ninguno. Después se cargan los conceptos sugeridos; publicar es un paso aparte.'
            : 'Esto no publica. Un año que ya existe se sobrescribe con lo que haya aquí.'}
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <label className="block">
            <span className="text-caption text-fg-muted">Año gravable</span>
            <Input
              className="mt-1"
              value={form.anio}
              inputMode="numeric"
              placeholder="p. ej. 2026"
              onChange={(e) => cambiar({ anio: e.target.value })}
              data-testid="campo-anio"
            />
          </label>
          <label className="block">
            <span className="text-caption text-fg-muted">Resolución</span>
            <Input
              className="mt-1"
              value={form.resolucion}
              placeholder="p. ej. Resolución 000162 de 2023"
              onChange={(e) => cambiar({ resolucion: e.target.value })}
              data-testid="campo-resolucion"
            />
          </label>
          <label className="block">
            <span className="text-caption text-fg-muted">Tope de cuantías menores (pesos)</span>
            <Input
              className="mt-1"
              value={form.tope}
              inputMode="numeric"
              placeholder="p. ej. 1.000.000"
              onChange={(e) => cambiar({ tope: e.target.value })}
              data-testid="campo-tope"
            />
            <span className="mt-1 block text-caption text-fg-subtle">Vacío, no se agrupa nada.</span>
          </label>
          <label className="block">
            <span className="text-caption text-fg-muted">NIT de cuantías menores</span>
            <Input
              className="mt-1"
              value={form.nit}
              placeholder="p. ej. 222222222"
              onChange={(e) => cambiar({ nit: e.target.value })}
              data-testid="campo-nit"
            />
          </label>
        </div>

        <label className="block mt-4">
          <span className="text-caption text-fg-muted">Notas</span>
          <Textarea
            className="mt-1"
            rows={2}
            value={form.notas}
            onChange={(e) => cambiar({ notas: e.target.value })}
            data-testid="campo-notas"
          />
        </label>

        {problema && form.anio !== '' ? (
          <p className="text-caption text-danger mt-3" data-testid="problema-del-anio">
            {problema}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button hideArrow type="button"
            
            disabled={guardando || problema !== null}
            onClick={() => void onGuardar()}
            data-testid="guardar-anio"
          >
            {guardando ? 'Guardando…' : 'Guardar el año'}
          </Button>
          {form.anio !== '' ? (
            <Button variant="ghost" hideArrow type="button"  onClick={() => setForm(VACIO)}>
              Limpiar
            </Button>
          ) : (
            // Ronda 28 (revisora r27, 5b): el botón apagado dice qué falta (antes nada con el campo vacío).
            <span className="text-caption text-fg-muted" data-testid="falta-el-anio">
              Escribe el año gravable.
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
