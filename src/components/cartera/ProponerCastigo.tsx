'use client'

/**
 * Proponer un castigo de cartera.
 *
 * ── El camino, y por qué ese ──────────────────────────────────────────────
 *
 * Castigar es una decisión sobre la cartera de UN contrato, así que el primer
 * paso es elegir de quién. La lista NO es un buscador de contratos: son los
 * contratos que HOY tienen cartera, tomados del mismo informe que pinta la
 * pantalla de al lado, con lo que deben y con los días de la deuda más vieja.
 * Pedir un identificador de contrato a mano es como se fabrica un castigo
 * sobre la persona equivocada.
 *
 * Elegido el contrato, el back dice qué cuotas se pueden castigar **y por qué
 * no las demás** (`GET .../castigo/candidatas/:contractId`). Las que no entran
 * se ven igual, en gris y con su motivo: una lista más corta sin explicación
 * es un misterio, y el motivo suele ser accionable («todavía no pasó el plazo
 * del contrato»).
 *
 * 🔴 El monto se CONGELA al proponer y las dos firmas aprueban ese número. Por
 * eso la pantalla muestra el total mientras se eligen cuotas: es lo que dos
 * personas van a firmar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CaretRight, Scales } from '@phosphor-icons/react'
import { Collapse } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { castigoApi } from '@/lib/api/castigo.service'
import { reportesApi } from '@/lib/api/inmobiliaria.service'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { nombreDelMes } from '@/lib/utils/mes'
import type { CandidatasACastigo } from '@/lib/types/castigo'
import type { CarteraItem } from '@/lib/types/inmobiliaria'
import { cn } from '@/lib/utils'

/** Un contrato con cartera, armado desde el informe. */
interface ContratoConCartera {
  contractId: string
  inquilino: string
  inmueble: string
  carteraCop: number
  cuotas: number
  diasDeLaMasVieja: number
}

/** Los contratos con cartera, del más viejo al más nuevo. */
export function contratosConCartera(
  items: readonly CarteraItem[],
): ContratoConCartera[] {
  const porContrato = new Map<string, ContratoConCartera>()
  for (const i of items) {
    // Sólo lo que YA es cartera: lo que no venció no se castiga.
    if (i.cajon !== 'CARTERA') continue
    const ya = porContrato.get(i.contractId)
    if (ya) {
      ya.carteraCop += i.pendingAmount
      ya.cuotas += 1
      ya.diasDeLaMasVieja = Math.max(ya.diasDeLaMasVieja, i.diasDeMora)
      continue
    }
    porContrato.set(i.contractId, {
      contractId: i.contractId,
      inquilino: i.tenantName ?? 'Sin inquilino',
      inmueble: i.propertyAddress ?? i.propertyTitle,
      carteraCop: i.pendingAmount,
      cuotas: 1,
      diasDeLaMasVieja: i.diasDeMora,
    })
  }
  return [...porContrato.values()].sort(
    (a, b) => b.diasDeLaMasVieja - a.diasDeLaMasVieja || b.carteraCop - a.carteraCop,
  )
}

export function ProponerCastigo({ onListo }: { onListo: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [contratos, setContratos] = useState<ContratoConCartera[] | null>(null)
  const [elegido, setElegido] = useState<ContratoConCartera | null>(null)
  const [candidatas, setCandidatas] = useState<CandidatasACastigo | null>(null)
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [motivo, setMotivo] = useState('')
  /** El error del motivo que mandó el back (`campos[].motivo`). */
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  /**
   * 🔴 (02-10-2026) Si la cartera no se pudo leer se DICE. Antes el fallo se
   * tragaba y la lista quedaba vacía: «No hay cartera: no hay nada que
   * castigar», una afirmación que nadie podía hacer.
   */
  const [falloDeLaCartera, setFalloDeLaCartera] = useState<unknown>(null)

  const cargarContratos = useCallback(async () => {
    setFalloDeLaCartera(null)
    try {
      const informe = await reportesApi.getCartera()
      setContratos(contratosConCartera(informe.items))
    } catch (e) {
      setFalloDeLaCartera(e)
      setContratos([])
    }
  }, [])

  useEffect(() => {
    if (abierto && contratos === null) void cargarContratos()
  }, [abierto, contratos, cargarContratos])

  const elegir = async (contrato: ContratoConCartera) => {
    setElegido(contrato)
    setCandidatas(null)
    setMarcadas(new Set())
    try {
      const r = await castigoApi.candidatas(contrato.contractId)
      setCandidatas(r)
      // Vienen marcadas las que se pueden castigar: es lo que se propone.
      setMarcadas(
        new Set(r.cuotas.filter((c) => c.porQueNo === null).map((c) => c.cuotaId)),
      )
    } catch (e) {
      toast.error('No se pudieron leer las cuotas del contrato', {
        description: mensajeParaLaPersona(e, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: 'leer las cuotas del contrato',
        }),
      })
    }
  }

  const total = useMemo(() => {
    if (!candidatas) return { capitalCop: 0, cuotas: 0 }
    const elegidas = candidatas.cuotas.filter((c) => marcadas.has(c.cuotaId))
    return {
      capitalCop: elegidas.reduce((s, c) => s + c.capitalCop, 0),
      cuotas: elegidas.length,
    }
  }, [candidatas, marcadas])

  const proponer = async () => {
    if (!elegido || total.cuotas === 0 || motivo.trim().length === 0) return
    setGuardando(true)
    setErrorDelMotivo(null)
    try {
      const propuesto = await castigoApi.proponer({
        contractId: elegido.contractId,
        cuotaIds: [...marcadas],
        motivo: motivo.trim(),
      })
      /*
       * 🔴 P-4 aclarado (Nico, 24-09): lo que propone el ADMINISTRADOR vuelve
       * del back ya castigado, con su firma por los dos lados. No se le dice
       * «ahora lo firman…» ni se le deja un pendiente que nunca llega.
       */
      toast.success(
        propuesto?.estado === 'CASTIGADA'
          ? 'Castigada por ti como administrador: tu firma valió por los dos lados. Sale de la cartera activa y de la cobranza.'
          : 'Propuesto. Ahora lo firman el administrador y el contador.',
      )
      setElegido(null)
      setCandidatas(null)
      setMarcadas(new Set())
      setMotivo('')
      setAbierto(false)
      setContratos(null)
      onListo()
    } catch (e) {
      // Un 400 del motivo va debajo del motivo; lo demás, al aviso.
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['motivo'] as const,
        porDefecto: 'Prueba de nuevo en un momento.',
        accion: 'proponer el castigo',
      })
      if (porCampo.motivo) {
        setErrorDelMotivo(porCampo.motivo)
        document.getElementById('motivo-de-la-propuesta')?.focus()
      }
      if (sueltos.length > 0) {
        toast.error('No se pudo proponer el castigo', { description: sueltos.join(' · ') })
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="p-0" data-testid="proponer-castigo">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        data-testid="abrir-proponer-castigo"
      >
        {/* Un solo caret que gira con la curva de los paneles. */}
        <CaretRight
          className={cn(
            'h-4 w-4 text-fg-muted transition-transform duration-slow ease-emphasis',
            abierto && 'rotate-90',
        )}
          aria-hidden="true"
        />
        <Scales className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        <span className="text-sm font-medium text-fg">Proponer un castigo</span>
        <span className="text-xs text-fg-muted">
          Lo aprueban el administrador y el contador, dos personas distintas.
        </span>
      </button>

      {/* Se abre y se cierra con `Collapse` (altura + fundido). */}
      <Collapse open={abierto}>
        <div className="space-y-4 border-t border-border p-4">
          {/* ── 1. De quién ──────────────────────────────────────────── */}
          {!elegido && (
            <div className="space-y-2">
              <p className="text-xs text-fg-muted">
                Los contratos que hoy tienen cartera, del atraso más viejo al más
                reciente.
              </p>
              {contratos === null ? (
                <p className="text-sm text-fg-muted">Leyendo la cartera…</p>
              ) : falloDeLaCartera ? (
                <div className="space-y-2" data-testid="cartera-sin-leer">
                  <p className="text-sm text-fg">
                    No pudimos leer la cartera.{' '}
                    {mensajeParaLaPersona(falloDeLaCartera, {
                      porDefecto: 'Prueba de nuevo en un momento.',
                    })}
                  </p>
                  <Button hideArrow size="sm" variant="secondary" onClick={() => void cargarContratos()}>
                    Intentar de nuevo
                  </Button>
                </div>
              ) : contratos.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  No hay cartera: no hay nada que castigar.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {contratos.slice(0, 30).map((c) => (
                    <li key={c.contractId}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left hover:bg-surface-hover"
                        onClick={() => void elegir(c)}
                        data-testid="contrato-con-cartera"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-fg">
                            {c.inquilino}
                          </span>
                          <span className="block truncate text-xs text-fg-muted">
                            {c.inmueble}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-right">
                          <span className="block font-mono text-sm tabular-nums text-fg">
                            {formatCurrency(c.carteraCop)}
                          </span>
                          <span className="block text-xs text-fg-muted">
                            {c.diasDeLaMasVieja === 1
                              ? '1 día de mora'
                              : `${c.diasDeLaMasVieja} días de mora`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── 2. Qué cuotas ────────────────────────────────────────── */}
          {elegido && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-fg">
                  {candidatas?.inquilino ?? elegido.inquilino}
                  <span className="ml-2 text-xs text-fg-muted">{elegido.inmueble}</span>
                </p>
                <Button
                  hideArrow
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setElegido(null)
                    setCandidatas(null)
                  }}
                >
                  Elegir otro contrato
                </Button>
              </div>

              {candidatas === null ? (
                <p className="text-sm text-fg-muted">Leyendo sus cuotas…</p>
              ) : (
                <>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {candidatas.cuotas.map((c) => {
                      const sePuede = c.porQueNo === null
                      return (
                        <li
                          key={c.cuotaId}
                          className={cn(
                            'flex items-start gap-3 px-3 py-2',
                            !sePuede && 'opacity-60',
                          )}
                          data-testid="cuota-candidata"
                        >
                          <Checkbox
                            className="mt-0.5"
                            disabled={!sePuede}
                            checked={marcadas.has(c.cuotaId)}
                            onCheckedChange={(v) => {
                              setMarcadas((antes) => {
                                const ahora = new Set(antes)
                                if (v === true) ahora.add(c.cuotaId)
                                else ahora.delete(c.cuotaId)
                                return ahora
                              })
                            }}
                            aria-label={`Castigar la cuota de ${nombreDelMes(c.mes)}`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-fg">
                              {nombreDelMes(c.mes)}
                              <span className="ml-2 font-mono text-sm tabular-nums">
                                {formatCurrency(c.capitalCop)}
                              </span>
                            </span>
                            <span className="block text-xs text-fg-muted">
                              {c.diasDeMora === 1
                                ? '1 día de mora'
                                : `${c.diasDeMora} días de mora`}
                              {c.interesCop > 0
                                ? ` · ${formatCurrency(c.interesCop)} de intereses`
                                : ''}
                            </span>
                            {/* 🔴 El motivo, no la ausencia. */}
                            {c.porQueNo && (
                              <span
                                className="block text-xs text-warning"
                                data-testid="por-que-no-se-castiga"
                              >
                                {c.porQueNo}
                              </span>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>

                  <div>
                    <Textarea
                      id="motivo-de-la-propuesta"
                      value={motivo}
                      onChange={(e) => {
                        setMotivo(e.target.value)
                        setErrorDelMotivo(null)
                      }}
                      rows={2}
                      maxLength={500}
                      placeholder="Por qué esta cartera es incobrable. Es lo que van a leer las dos personas que la firman."
                      aria-label="Motivo del castigo"
                      aria-invalid={errorDelMotivo ? true : undefined}
                      aria-describedby={errorDelMotivo ? 'motivo-de-la-propuesta-error' : undefined}
                      data-testid="motivo-de-la-propuesta"
                    />
                    <ErrorDelCampo id="motivo-de-la-propuesta-error" mensaje={errorDelMotivo} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-fg-muted">
                      Se congelan{' '}
                      <span className="font-mono tabular-nums text-fg">
                        {formatCurrency(total.capitalCop)}
                      </span>{' '}
                      en {total.cuotas === 1 ? '1 cuota' : `${total.cuotas} cuotas`}.
                    </p>
                    <Button
                      hideArrow
                      size="sm"
                      disabled={total.cuotas === 0 || motivo.trim().length === 0}
                      isLoading={guardando}
                      onClick={() => void proponer()}
                      data-testid="confirmar-propuesta"
                    >
                      Proponer el castigo
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Collapse>
    </Card>
  )
}
