'use client'

/**
 * Las promesas de pago que registró el EQUIPO (COBRANZA-MANUAL, 04-10-2026).
 *
 * Nico: «si llega la fecha y no entró el pago, la promesa queda "Incumplida" y
 * sale en un aviso/lista para quien cobra (sin mandar nada a nadie). Si el pago
 * entra, la promesa queda "Cumplida" sola». Ésta es la lista: primero las
 * incumplidas, después las que esperan su fecha. El estado es el de HOY (el
 * back lo calcula con los recibos de caja).
 */
import * as React from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Stagger, StaggerItem, Presence } from '@leasefy/cadence'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service'
import { cobranzaManualApi } from '@/lib/api/cobranza-manual.service'
import {
  NOMBRE_DEL_ESTADO_DE_LA_PROMESA,
  type PromesaDeLaLista,
  type PromesasDelEquipo as Respuesta,
} from '@/lib/api/cobranza-manual.types'

const ORDEN: Record<PromesaDeLaLista['estado'], number> = { INCUMPLIDA: 0, PENDIENTE: 1, CUMPLIDA: 2, REEMPLAZADA: 3 }

/** Primero las incumplidas, después las pendientes (por fecha), al final las cumplidas y las reemplazadas. */
export function ordenarPromesas(promesas: readonly PromesaDeLaLista[]): PromesaDeLaLista[] {
  return [...promesas].sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
}

export function PromesasDelEquipo() {
  const { formatCurrency } = useI18n()
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [conCumplidas, setConCumplidas] = useState(false)

  useEffect(() => {
    let vivo = true
    cobranzaManualApi
      .promesas()
      .then((r) => {
        if (vivo) setDatos(r)
      })
      .catch((e) => {
        if (vivo) setError(e)
      })
    return () => {
      vivo = false
    }
  }, [])

  if (error) {
    return (
      <p className="text-sm text-danger" role="alert">
        {mensajeParaLaPersona(error, { porDefecto: 'No pudimos cargar las promesas del equipo.' })}
      </p>
    )
  }
  if (!datos || !datos.disponible) return null

  // Las cumplidas y las reemplazadas (SO-17: la persona hizo una promesa nueva)
  // ya no esperan nada: sólo con «Ver también…».
  const cerradas = (p: PromesaDeLaLista) => p.estado === 'CUMPLIDA' || p.estado === 'REEMPLAZADA'
  const visibles = ordenarPromesas(datos.promesas).filter((p) => conCumplidas || !cerradas(p))
  const { pendientes, cumplidas, incumplidas } = datos.resumen
  const reemplazadas = datos.resumen.reemplazadas ?? 0

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4" data-testid="promesas-del-equipo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-fg">Promesas que registró tu equipo</h2>
          <p className="text-sm text-fg-muted">
            {incumplidas} {incumplidas === 1 ? 'incumplida' : 'incumplidas'} · {pendientes}{' '}
            {pendientes === 1 ? 'pendiente' : 'pendientes'} · {cumplidas} {cumplidas === 1 ? 'cumplida' : 'cumplidas'}
            {reemplazadas > 0 ? ` · ${reemplazadas} ${reemplazadas === 1 ? 'reemplazada' : 'reemplazadas'}` : ''}
          </p>
        </div>
        {cumplidas + reemplazadas > 0 ? (
          <Button size="sm" variant="ghost" hideArrow onClick={() => setConCumplidas((v) => !v)}>
            {conCumplidas
              ? 'Ocultar las cerradas'
              : reemplazadas > 0
                ? 'Ver también las cumplidas y reemplazadas'
                : 'Ver también las cumplidas'}
          </Button>
        ) : null}
      </div>

      <Presence show={visibles.length === 0} initial={false}>
        <p className="text-sm text-fg-muted">
          Ninguna promesa espera su fecha. Se registran con «Registrar gestión» en la Cartera, el estado de cuenta o
          el detalle del deudor.
        </p>
      </Presence>

      <Stagger as="ul" className="divide-y divide-border">
        {visibles.map((p) => (
          <StaggerItem key={p.id} as="li" className="flex flex-wrap items-start justify-between gap-2 py-3" data-testid="promesa-del-equipo">
            <div className="min-w-0 space-y-0.5">
              {p.documento ? (
                <Link
                  href={rutaDelEstadoDeCuenta('inquilino', p.documento)}
                  className="font-medium text-fg underline-offset-4 hover:text-primary hover:underline"
                >
                  {p.persona}
                </Link>
              ) : (
                <span className="font-medium text-fg">{p.persona}</span>
              )}
              <p className="text-sm text-fg-muted">
                Prometió <span className="font-mono tabular-nums text-fg">{formatCurrency(p.montoCop)}</span> para el{' '}
                {fechaLarga(p.fecha)}
                {p.estado === 'INCUMPLIDA'
                  ? p.abonadoCop > 0
                    ? ` · abonó ${formatCurrency(p.abonadoCop)}, faltan ${formatCurrency(p.faltaCop)}`
                    : ' · no entró ningún pago'
                  : p.estado === 'PENDIENTE' && p.abonadoCop > 0
                    ? ` · van ${formatCurrency(p.abonadoCop)}`
                    : ''}
              </p>
              <p className="text-caption text-fg-subtle">
                {p.tipoTexto} · registró {p.registradaPor}
              </p>
            </div>
            <Badge
              variant={
                p.estado === 'INCUMPLIDA'
                  ? 'destructive'
                  : p.estado === 'CUMPLIDA'
                    ? 'success'
                    : p.estado === 'REEMPLAZADA'
                      ? 'outline'
                      : 'secondary'
              }
            >
              {NOMBRE_DEL_ESTADO_DE_LA_PROMESA[p.estado]}
            </Badge>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}

void React
