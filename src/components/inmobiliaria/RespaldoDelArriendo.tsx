'use client'

/**
 * Paso 11: registrar qué aseguradora aprobó y con qué número.
 *
 * Las opciones no se escriben a mano si ya las sabemos: el análisis del
 * inquilino trae `protection_options`, la lista de aseguradoras consultadas
 * con el resultado de cada una. Acá se muestran **sólo las que aprobaron** —
 * ofrecer una que rechazó sería ofrecer un camino que no existe.
 *
 * Cuando el análisis no trajo opciones (evaluaciones viejas, o el agente no
 * respondió), se puede escribir la aseguradora a mano. Que no la sepamos no
 * puede impedir armar el contrato.
 */

import { useMemo } from 'react'
import { ShieldCheck, Info } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import type { Respaldo, ErroresDeRespaldo } from '@/lib/inmobiliaria/respaldo'
import type { ProtectionOption } from '@/lib/api/applications.types'

const OTRA = '__otra__'

function moneda(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

export interface RespaldoDelArriendoProps {
  valor: Partial<Respaldo>
  onCambio: (valor: Partial<Respaldo>) => void
  /** Del análisis del inquilino. Puede no venir: se tolera en silencio. */
  opciones?: ProtectionOption[]
  errores?: ErroresDeRespaldo
  className?: string
}

export function RespaldoDelArriendo({
  valor,
  onCambio,
  opciones,
  errores = {},
  className,
}: RespaldoDelArriendoProps) {
  const aprobadas = useMemo(
    () => (opciones ?? []).filter((o) => o.status === 'available'),
    [opciones],
  )

  // «Otra» queda seleccionada si hay un nombre escrito que no está en la lista.
  const esOtra =
    Boolean(valor.aseguradora) && !aprobadas.some((o) => o.carrier === valor.aseguradora)

  const elegir = (o: ProtectionOption) =>
    onCambio({ ...valor, aseguradora: o.carrier, tipo: o.productType })

  return (
    <section className={cn('space-y-4', className)} data-testid="respaldo-del-arriendo">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" weight="duotone" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-fg">Respaldo del arriendo</h3>
          <p className="mt-0.5 text-sm text-fg-muted">
            Queda en el contrato. Sin el número de la póliza no hay a quién
            reclamarle si algo pasa.
          </p>
        </div>
      </div>

      {aprobadas.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="sr-only">Aseguradora que aprobó</legend>
          {aprobadas.map((o) => {
            const elegida = valor.aseguradora === o.carrier
            return (
              <label
                key={`${o.carrier}-${o.productType}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors',
                  elegida
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:bg-surface-muted',
                )}
              >
                <input
                  type="radio"
                  name="aseguradora"
                  className="mt-1"
                  checked={elegida}
                  onChange={() => elegir(o)}
                  data-testid={`aseguradora-${o.carrier}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-fg">{o.carrier}</span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-muted">
                      {o.productType === 'fianza' ? 'Fianza' : 'Seguro'}
                    </span>
                    {o.isDemo && (
                      // Si el precio es de mentira hay que decirlo donde se lee,
                      // no en un comentario del código.
                      <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                        Precio de ejemplo
                      </span>
                    )}
                  </span>
                  {o.monthlyPremiumCop !== null && (
                    <span className="mt-0.5 block font-mono text-xs text-fg-subtle">
                      {moneda(o.monthlyPremiumCop)} / mes
                    </span>
                  )}
                </span>
              </label>
            )
          })}

          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 transition-colors',
              esOtra ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-muted',
            )}
          >
            <input
              type="radio"
              name="aseguradora"
              checked={esOtra}
              onChange={() => onCambio({ ...valor, aseguradora: '' })}
              data-testid="aseguradora-otra"
            />
            <span className="text-sm text-fg">Otra aseguradora</span>
          </label>
        </fieldset>
      ) : (
        <p className="flex items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2.5 text-sm text-fg-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          El análisis de este inquilino no trajo la lista de aseguradoras.
          Escribí a mano cuál aprobó.
        </p>
      )}

      {(esOtra || aprobadas.length === 0) && (
        <Campo
          id="respaldo-aseguradora"
          etiqueta="Aseguradora"
          error={errores.aseguradora}
          valor={valor.aseguradora ?? ''}
          onCambio={(v) => onCambio({ ...valor, aseguradora: v })}
          placeholder="Seguros Bolívar, Sura, Fianly…"
        />
      )}

      <Campo
        id="respaldo-identificador"
        etiqueta="Número de póliza o radicado"
        error={errores.identificador}
        valor={valor.identificador ?? ''}
        onCambio={(v) => onCambio({ ...valor, identificador: v })}
        placeholder="POL-2026-004512"
        ayuda="El que te dio la aseguradora al aprobar."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="respaldo-desde"
          etiqueta="Vigencia desde"
          tipo="date"
          opcional
          valor={valor.vigenciaDesde ?? ''}
          onCambio={(v) => onCambio({ ...valor, vigenciaDesde: v || undefined })}
        />
        <Campo
          id="respaldo-hasta"
          etiqueta="Vigencia hasta"
          tipo="date"
          opcional
          error={errores.vigencia}
          valor={valor.vigenciaHasta ?? ''}
          onCambio={(v) => onCambio({ ...valor, vigenciaHasta: v || undefined })}
        />
      </div>
    </section>
  )
}

function Campo({
  id,
  etiqueta,
  valor,
  onCambio,
  error,
  placeholder,
  ayuda,
  tipo = 'text',
  opcional = false,
}: {
  id: string
  etiqueta: string
  valor: string
  onCambio: (v: string) => void
  error?: string
  placeholder?: string
  ayuda?: string
  tipo?: string
  opcional?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-fg">
        {etiqueta}
        {opcional && <span className="ml-1 font-normal text-fg-subtle">(opcional)</span>}
      </label>
      <Input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className={cn(error && 'border-danger')}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="text-xs text-fg-subtle">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}
