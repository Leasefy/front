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
import { mesEnTitulo } from '@/lib/utils/mes'

export function PropietariosQueDeben() {
  const { t, locale } = useI18n()
  const k = (s: string) => `inmobiliaria.deducciones.cartera.${s}`
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

  const idioma = locale === 'en' ? 'en' : 'es'

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(k('colPropietario'))}</TableHead>
                <TableHead className="text-right">{t(k('colDebe'))}</TableHead>
                <TableHead>{t(k('colDesde'))}</TableHead>
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
                  <TableCell className="whitespace-nowrap text-xs text-fg-muted">
                    {p.desde ? mesEnTitulo(p.desde, idioma) : '—'}
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
              <TableRow data-testid="total-que-deben">
                <TableCell className="font-medium text-fg">{t(k('total'))}</TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums text-fg">
                  {formatCurrency(deudas.totalCop)}
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </EstadoDeDatos>
    </section>
  )
}
