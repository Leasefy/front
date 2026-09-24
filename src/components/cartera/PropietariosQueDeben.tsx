'use client'

/**
 * Los propietarios que le DEBEN a la inmobiliaria, en la cartera de propietarios.
 *
 * La cartera por pagar dice cuánto le debe la inmobiliaria a cada propietario;
 * esto es el otro sentido. Nico y Juan Camilo (2026-09-16): el propietario con
 * deducciones o saldo en contra que ya no tiene más liquidaciones «se le cobra»,
 * y aparece como deuda en la cartera. Cuándo es deuda lo decide el back
 * (`GET /inmobiliaria/deudas-de-propietarios`); acá se pinta.
 *
 * ── 🔴 El informe POR EDADES (21-09-2026) ───────────────────────────────────
 *
 * Nico, 17-09: la deuda del propietario «tiene su cartera propia — informe por
 * edades, cuenta de cobro, recordatorios y descuento desde la liquidación de
 * cualquiera de sus otros inmuebles». Esta tabla decía cuánto debía cada uno y
 * desde qué mes, pero no en qué tramo estaba la plata: sin tramos no hay a
 * quién llamar primero, que es para lo único que sirve una cartera.
 *
 * Los tramos los reparte el back con el MISMO corte que la cartera del
 * inquilino (0-30 · 31-60 · 61-90 · +90) y los cuatro suman exactamente lo que
 * se debe — el pie de la tabla lo muestra columna por columna, para que no
 * haya que creerlo. Los nombres salen de `NOMBRE_DE_EDAD`, los mismos de la
 * otra cartera.
 *
 * Sin nadie que deba, la sección no aparece: no es una tabla vacía más que leer.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Receipt } from '@phosphor-icons/react'

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { rutaDeLaCuentaDeCobro } from '@/components/inmobiliaria/deducciones/DeudaDelPropietario'
import { deduccionesApi } from '@/lib/api/deducciones.service'
import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import type { DeudasDePropietarios } from '@/lib/types/deducciones'
import { EDADES, NOMBRE_DE_EDAD, type Edad } from '@/lib/cartera/edades'
import { enElTramo, renglonesEnElTramo } from '@/lib/cartera/edades-de-la-deuda'
import { cn } from '@/lib/utils'

/**
 * El color dice gravedad, con la misma escala que la cartera del inquilino: a
 * los 90 días el problema deja de ser de cobranza.
 */
const TONO: Record<Edad, string> = {
  '0-30': 'text-fg',
  '31-60': 'text-warning',
  '61-90': 'text-warning',
  '90+': 'text-danger',
}

export function PropietariosQueDeben() {
  const { t } = useI18n()
  const k = (s: string) => `inmobiliaria.deducciones.cartera.${s}`
  /** «1 concepto» y «3 conceptos»: el singular no se arma pegando una «s». */
  const conceptos = (cuantos: number) =>
    cuantos === 1 ? t(k('conceptoUno')) : t(k('conceptos'), { cuantos })
  const enDias = (dias: number) =>
    dias === 1 ? t(k('diaUno')) : t(k('dias'), { dias })
  const [deudas, setDeudas] = useState<DeudasDePropietarios | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDeudas(await deduccionesApi.deudasDeLaAgencia())
    } catch (e) {
      setError(e)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (cargando && !deudas) return null
  if (!error && (!deudas || deudas.propietarios.length === 0)) return null

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-surface"
      data-testid="propietarios-que-deben"
    >
      <div className="space-y-1 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
          <Receipt className="h-4 w-4 text-warning" aria-hidden="true" />
          {t(k('titulo'))}
        </h2>
        <p className="max-w-2xl text-xs text-fg-muted">{t(k('descripcion'))}</p>
      </div>
      <EstadoDeDatos cargando={false} error={error} queEs={t(k('queSon'))} onReintentar={cargar}>
        {deudas && (
          <>
            {/* ── La edad de TODA la cartera de propietarios ─────────────── */}
            <div
              className="grid grid-cols-2 gap-3 border-b border-border p-4 lg:grid-cols-4"
              role="group"
              aria-label={t(k('edadDeLaCartera'))}
              data-testid="edades-de-la-cartera-de-propietarios"
            >
              {EDADES.map((edad) => (
                <div
                  key={edad}
                  className="rounded-lg border border-border bg-bg p-3"
                  data-testid={`tramo-propietarios-${edad}`}
                >
                  <p className="text-xs text-fg-muted">{NOMBRE_DE_EDAD[edad]}</p>
                  <p
                    className={cn(
                      'mt-1 font-mono text-lg font-semibold tabular-nums',
                      TONO[edad],
                    )}
                  >
                    {formatCurrency(enElTramo(deudas.porEdades, edad))}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {conceptos(renglonesEnElTramo(deudas.porEdades, edad))}
                  </p>
                </div>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(k('colPropietario'))}</TableHead>
                  <TableHead className="text-right">{t(k('colDebe'))}</TableHead>
                  {EDADES.map((edad) => (
                    <TableHead key={edad} className="whitespace-nowrap text-right">
                      {NOMBRE_DE_EDAD[edad]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">{t(k('colMasViejo'))}</TableHead>
                  <TableHead>{t(k('colCuenta'))}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deudas.propietarios.map((p) => (
                  <TableRow key={p.propietarioId} data-testid="propietario-que-debe">
                    <TableCell>
                      <Link
                        href={`/panel/inmobiliaria/propietarios/${p.propietarioId}`}
                        className="font-medium text-fg underline-offset-4 hover:underline"
                      >
                        {p.nombre || '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-fg">
                      {formatCurrency(p.debeCop)}
                    </TableCell>
                    {EDADES.map((edad) => {
                      const cop = enElTramo(p.porEdades, edad)
                      return (
                        <TableCell
                          key={edad}
                          data-testid={`fila-tramo-${edad}`}
                          className={cn(
                            'text-right font-mono tabular-nums',
                            cop > 0 ? TONO[edad] : 'text-fg-subtle',
                          )}
                        >
                          {formatCurrency(cop)}
                        </TableCell>
                      )
                    })}
                    <TableCell className="whitespace-nowrap text-right text-xs text-fg-muted">
                      {enDias(p.porEdades?.diasDelMasViejo ?? 0)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.ultimaCuentaDeCobro ? (
                        <Link
                          href={rutaDeLaCuentaDeCobro(p.propietarioId, p.ultimaCuentaDeCobro.id)}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {t(k('cuenta'), { numero: p.ultimaCuentaDeCobro.numero })}
                        </Link>
                      ) : (
                        <span className="text-fg-muted">{t(k('sinCuenta'))}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                {/* 🔴 El pie repite los cuatro tramos para que se VEA que suman
                    el total: un total que no cuadra con sus partes esconde una
                    categoría sin nombre, y acá la plata es de un tercero. */}
                <TableRow data-testid="total-que-deben">
                  <TableCell className="font-medium text-fg">{t(k('total'))}</TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums text-fg">
                    {formatCurrency(deudas.totalCop)}
                  </TableCell>
                  {EDADES.map((edad) => (
                    <TableCell
                      key={edad}
                      data-testid={`total-tramo-${edad}`}
                      className="text-right font-mono font-semibold tabular-nums text-fg"
                    >
                      {formatCurrency(enElTramo(deudas.porEdades, edad))}
                    </TableCell>
                  ))}
                  <TableCell className="whitespace-nowrap text-right text-xs text-fg-muted">
                    {conceptos(
                      EDADES.reduce(
                        (s, edad) => s + renglonesEnElTramo(deudas.porEdades, edad),
                        0,
                      ),
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </>
        )}
      </EstadoDeDatos>
    </section>
  )
}
