'use client'

/**
 * «CUÁNTO CUESTA VIVIR AQUÍ» (Nico, 10-10-2026: «agrégalo dentro de cada
 * inmueble, bajo algo que una IA entregue de un aproximado, quiero algo bien
 * hermoso»; eligió «sólo en la ficha pública»).
 *
 * Canon y administración son del inmueble; acueducto, energía, gas e
 * internet los estimó la IA por ciudad, estrato y área, una vez por inmueble
 * (`GET /properties/:id/costo-de-vivir`). Se dice que es un aproximado y de
 * dónde sale. Sin respuesta, o sin canon, la sección no se pinta.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Sparkle } from '@phosphor-icons/react'
import { enterTransition, Stagger, StaggerItem, usePrefersReducedMotion } from '@leasefy/cadence'

import { apiClient } from '@/lib/api/client'
import { formatCurrency } from '@/lib/format'

interface Servicios {
  acueductoCop: number
  energiaCop: number
  gasCop: number
  internetCop: number
  supuestos: string
}

interface CostoDeVivir {
  canonCop: number | null
  administracionCop: number
  servicios: Servicios | null
  totalCop: number | null
  fuente: 'ia' | 'simulado' | null
  motivo: string | null
}

const COLORES = {
  canon: 'hsl(var(--primary))',
  administracion: '#64748b',
  acueducto: '#0ea5e9',
  energia: '#f59e0b',
  gas: '#a855f7',
  internet: '#10b981',
}

/** Las porciones de la dona, sin las que valen 0. Pura, para probarla. */
export function porcionesDelCosto(c: CostoDeVivir) {
  const s = c.servicios
  return [
    { clave: 'canon', nombre: 'Canon mensual', valor: c.canonCop ?? 0, color: COLORES.canon },
    { clave: 'administracion', nombre: 'Administración', valor: c.administracionCop, color: COLORES.administracion },
    { clave: 'acueducto', nombre: 'Acueducto, alcantarillado y aseo', valor: s?.acueductoCop ?? 0, color: COLORES.acueducto },
    { clave: 'energia', nombre: 'Energía', valor: s?.energiaCop ?? 0, color: COLORES.energia },
    { clave: 'gas', nombre: 'Gas natural', valor: s?.gasCop ?? 0, color: COLORES.gas },
    { clave: 'internet', nombre: 'Internet', valor: s?.internetCop ?? 0, color: COLORES.internet },
  ].filter((p) => p.valor > 0)
}

export function CuantoCuestaVivirAqui({ propertyId }: { propertyId: string }) {
  const reducido = usePrefersReducedMotion()
  const [costo, setCosto] = useState<CostoDeVivir | null>(null)

  useEffect(() => {
    let vivo = true
    apiClient
      .get<CostoDeVivir>(`/properties/${propertyId}/costo-de-vivir`)
      .then((c) => vivo && setCosto(c))
      .catch(() => vivo && setCosto(null))
    return () => {
      vivo = false
    }
  }, [propertyId])

  if (!costo || costo.totalCop === null || costo.canonCop === null) return null
  const porciones = porcionesDelCosto(costo)

  return (
    <motion.section
      initial={{ opacity: 0, y: reducido ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={enterTransition(reducido)}
      className="mt-12"
      data-testid="cuanto-cuesta-vivir-aqui"
    >
      <h2 className="text-h3 text-fg">Cuánto cuesta vivir aquí</h2>
      <div className="mt-6 grid items-center gap-8 rounded-2xl border border-border bg-surface p-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:p-8">
        <div className="relative mx-auto h-60 w-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={porciones}
                dataKey="valor"
                nameKey="nombre"
                innerRadius="72%"
                outerRadius="100%"
                paddingAngle={porciones.length > 1 ? 2 : 0}
                cornerRadius={8}
                stroke="none"
                isAnimationActive={!reducido}
                animationDuration={900}
              >
                {porciones.map((p) => (
                  <Cell key={p.clave} fill={p.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-caption text-fg-muted">valor aprox. al mes</span>
            <span className="font-mono text-xl font-semibold tabular-nums text-fg" data-testid="costo-total">
              {formatCurrency(costo.totalCop)}
            </span>
          </div>
        </div>
        <div className="space-y-5">
          <Stagger className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {porciones.map((p) => (
              <StaggerItem key={p.clave} className="flex items-start gap-3">
                <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                <span>
                  <span className="block text-sm text-fg-muted">{p.nombre}</span>
                  <span className="block font-mono text-base font-medium tabular-nums text-fg">{formatCurrency(p.valor)}</span>
                </span>
              </StaggerItem>
            ))}
          </Stagger>
          {costo.servicios ? (
            <p className="flex items-start gap-2 text-caption text-fg-muted">
              <Sparkle className="mt-0.5 h-4 w-4 shrink-0 text-primary" weight="fill" aria-hidden="true" />
              <span>
                {costo.fuente === 'ia'
                  ? 'Los servicios los estimó la IA de Leasefy según la ciudad, el estrato y el área. '
                  : 'Los servicios son una referencia según el estrato y el área. '}
                Cambian con el consumo de cada hogar.
              </span>
            </p>
          ) : costo.motivo ? (
            <p className="text-caption text-fg-muted">{costo.motivo}</p>
          ) : null}
        </div>
      </div>
    </motion.section>
  )
}
