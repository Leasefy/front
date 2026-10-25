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
import { Cell, Pie, PieChart } from 'recharts'
import { enterTransition, Stagger, StaggerItem, usePrefersReducedMotion } from '@leasefy/cadence'

import { AIRE_DE_SECCION, TITULO_DE_SECCION } from '@/components/property/ficha/PiezasDeLaFicha'

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

/**
 * Ronda 30 (diseño nuevo): los cinco tonos de la página de muestra —el voltaje
 * para el canon y cuatro chispas cálidas para los servicios— y la ceniza para
 * la administración. Antes: cielo, ámbar, lila y menta de Tailwind.
 */
const COLORES = {
  canon: 'hsl(var(--primary))',
  administracion: '#706B64',
  acueducto: '#EB6834',
  energia: '#1BAF7A',
  gas: '#EDA100',
  internet: '#E87BA4',
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
      className={AIRE_DE_SECCION}
      data-testid="cuanto-cuesta-vivir-aqui"
    >
      <h2 className={TITULO_DE_SECCION}>Cuánto cuesta vivir aquí</h2>
      <div className="mt-[18px] grid items-center gap-[clamp(24px,4vw,48px)] rounded-[28px] border border-border-faint bg-surface p-[clamp(20px,3vw,32px)] min-[641px]:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div className="relative mx-auto h-60 w-60">
          {/* El aro mide siempre 240 × 240 (h-60 w-60): con tamaño fijo no hay que
              medirlo y recharts no avisa «width(-1) and height(-1)» antes de pintarlo. */}
          <PieChart width={240} height={240}>
              <Pie
                data={porciones}
                dataKey="valor"
                nameKey="nombre"
                innerRadius="78%"
                outerRadius="100%"
                paddingAngle={porciones.length > 1 ? 1.5 : 0}
                cornerRadius={2}
                stroke="none"
                isAnimationActive={!reducido}
                animationDuration={900}
              >
                {porciones.map((p) => (
                  <Cell key={p.clave} fill={p.color} />
                ))}
              </Pie>
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[13px] text-fg-subtle">valor aprox. al mes</span>
            <span className="mt-0.5 font-mono text-[20px] font-normal tabular-nums text-fg" data-testid="costo-total">
              {formatCurrency(costo.totalCop)}
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <Stagger className="grid grid-cols-2 gap-x-6 gap-y-4">
            {porciones.map((p) => (
              <StaggerItem key={p.clave} className="flex min-w-0 items-start gap-2.5">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[13.5px] leading-[1.35] text-fg-muted">{p.nombre}</span>
                  <span className="mt-0.5 block font-mono text-[16px] font-normal tabular-nums text-fg">{formatCurrency(p.valor)}</span>
                </span>
              </StaggerItem>
            ))}
          </Stagger>
          {costo.servicios ? (
            <p className="mt-5 flex items-start gap-2 text-[13px] leading-normal text-fg-muted">
              {/* Ronda 30: el cuadrito de voltaje, no la chispa de «IA». */}
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-[2px] bg-primary" aria-hidden="true" />
              <span>
                {costo.fuente === 'ia'
                  ? 'Los servicios los estimó la IA de Leasefy según la ciudad, el estrato y el área. '
                  : 'Los servicios son una referencia según el estrato y el área. '}
                Cambian con el consumo de cada hogar.
              </span>
            </p>
          ) : costo.motivo ? (
            <p className="mt-5 text-[13px] text-fg-muted">{costo.motivo}</p>
          ) : null}
        </div>
      </div>
    </motion.section>
  )
}
