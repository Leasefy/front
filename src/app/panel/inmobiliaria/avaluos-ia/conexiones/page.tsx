'use client'

/**
 * /panel/inmobiliaria/avaluos-ia/conexiones — How Avalúos IA connects (§20).
 *
 * Avalúos IA no trabaja solo: ENTRA con datos del portafolio/propietarios/
 * mercado (Nicolás, Laura) y SALE activando publicaciones, contratos, cobranza,
 * estudio del inquilino, pipeline y reportes. Esta pantalla lo hace explícito:
 *   • Hero ink — el flujo entradas → Gabriela → salidas (el ancla de marca).
 *   • Entra — de dónde saca los datos.
 *   • Sale — qué activa cuando decides.
 *
 * Mock/illustrative — renders standalone for review.
 */

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  House,
  UserCircle,
  Globe,
  Megaphone,
  FilePlus,
  ChatCircleText,
  ShieldCheck,
  Kanban,
  ChartLine,
  Lightning,
  CursorClick,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { BrandContour, Eyebrow, StatusBadge } from '@leasefy/cadence'

const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'

type ConTipo = 'auto' | 'click'

interface Conexion {
  icon: Icon
  modulo: string
  ejemplo: string
  tipo: ConTipo
  href?: string
}

const ENTRADAS: Conexion[] = [
  { icon: House, modulo: 'Portafolio', ejemplo: 'Nicolás trae la ficha del inmueble: área, estrato, habitaciones y fotos.', tipo: 'auto', href: '/panel/inmobiliaria/propiedades' },
  { icon: UserCircle, modulo: 'Propietarios', ejemplo: 'Carga el contacto y la expectativa del dueño, sin volver a digitar.', tipo: 'auto', href: '/panel/inmobiliaria/propietarios' },
  { icon: Globe, modulo: 'Mercado', ejemplo: 'Laura cruza con publicaciones activas y cierres recientes de la zona.', tipo: 'auto' },
]

const SALIDAS: Conexion[] = [
  { icon: Megaphone, modulo: 'Publicaciones', ejemplo: 'Publicar al precio recomendado crea el aviso en tu portafolio.', tipo: 'click', href: '/panel/inmobiliaria/propiedades' },
  { icon: FilePlus, modulo: 'Contratos', ejemplo: 'El canon acordado pre-llena el contrato de arrendamiento.', tipo: 'click', href: '/panel/inmobiliaria/contratos' },
  { icon: ChatCircleText, modulo: 'Cobranza IA', ejemplo: 'Al arrendarse, el canon entra al recaudo mensual de cobranza.', tipo: 'auto', href: '/panel/inmobiliaria/ai/cobranza' },
  { icon: ShieldCheck, modulo: 'Estudio del inquilino IA', ejemplo: 'Pasas al interesado a estudio con un clic, sin redigitar nada.', tipo: 'click', href: '/panel/inmobiliaria/ai/estudio' },
  { icon: Kanban, modulo: 'Pipeline', ejemplo: 'Cada solicitud de avalúo entra como oportunidad en tu pipeline.', tipo: 'auto', href: '/panel/inmobiliaria/pipeline' },
  { icon: ChartLine, modulo: 'Reportes y analítica', ejemplo: 'Tus avalúos alimentan las métricas de la inmobiliaria.', tipo: 'auto', href: '/panel/inmobiliaria/reportes' },
]

// Compact module pills for the hero flow band.
const FLOW_IN = [House, UserCircle, Globe]
const FLOW_OUT = [Megaphone, FilePlus, ChatCircleText]

function TipoChip({ tipo }: { tipo: ConTipo }) {
  const meta = tipo === 'auto'
    ? { icon: Lightning, label: 'Automático' }
    : { icon: CursorClick, label: 'Con un clic' }
  const ChipIcon = meta.icon
  return (
    <StatusBadge tone="neutral" dot={false} className="text-[10px]">
      <ChipIcon className="w-3 h-3" weight="bold" />
      {meta.label}
    </StatusBadge>
  )
}

function ConexionCard({ c }: { c: Conexion }) {
  const CIcon = c.icon
  const inner = (
    <>
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface-muted text-fg-muted shrink-0">
          <CIcon className="w-5 h-5" weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold text-fg">{c.modulo}</span>
            {c.href && (
              <ArrowRight className="w-3.5 h-3.5 text-fg-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all" weight="bold" />
            )}
          </div>
          <p className="mt-1 text-[12.5px] text-fg-muted leading-snug">{c.ejemplo}</p>
        </div>
      </div>
      <div className="mt-3.5">
        <TipoChip tipo={c.tipo} />
      </div>
    </>
  )

  const cls = 'group block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong'
  return c.href ? (
    <Link href={c.href} className={cls}>{inner}</Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

export default function ConexionesPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-7">
        {/* Header */}
        <Link
          href="/panel/inmobiliaria/avaluos-ia"
          className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Avalúos IA
        </Link>

        {/* ── Hero (ink anchor) — el flujo ─────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-2xl px-7 py-8"
          style={{ background: INK_GRADIENT, boxShadow: '0 26px 64px -28px rgba(20, 19, 15,0.55)' }}
        >
          <div className="pointer-events-none absolute -inset-x-2 top-[52%] h-[42%] text-white/[0.10]">
            <BrandContour />
          </div>

          <div className="relative max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-[2px]" style={{ background: '#8FA3FF' }} />
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/55">
                Conexiones
              </span>
            </div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-white leading-tight">
              Avalúos IA está conectado con todo tu Leasefy
            </h1>
            <p className="text-[14.5px] leading-relaxed text-white/65">
              Cada avalúo conversa con el resto de la plataforma: entra con los datos que ya
              tienes y sale activando publicaciones, contratos y cobranza — sin redigitar nada.
            </p>
          </div>

          {/* Flow band: entradas → Gabriela → salidas */}
          <div className="relative mt-7 flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
            <div className="flex -space-x-1.5">
              {FLOW_IN.map((Ic, i) => (
                <span key={i} className="inline-flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <Ic className="w-4 h-4 text-white/70" weight="bold" />
                </span>
              ))}
            </div>
            <ArrowRight className="w-5 h-5 text-white/35" weight="bold" />
            <span
              className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-white shrink-0"
              style={{ width: 48, height: 48, background: BLUE, boxShadow: '0 0 0 4px rgba(26,64,255,0.18)' }}
            >
              G
            </span>
            <ArrowRight className="w-5 h-5 text-white/35" weight="bold" />
            <div className="flex -space-x-1.5">
              {FLOW_OUT.map((Ic, i) => (
                <span key={i} className="inline-flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <Ic className="w-4 h-4 text-white/70" weight="bold" />
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Entra ─────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <Eyebrow>Entra · de dónde saca los datos</Eyebrow>
            <p className="mt-1.5 text-[13px] text-fg-muted">
              El equipo arranca con lo que ya está en tu Leasefy — cero formularios repetidos.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ENTRADAS.map((c) => (
              <ConexionCard key={c.modulo} c={c} />
            ))}
          </div>
        </section>

        {/* ── Sale ──────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <Eyebrow accent>Sale · qué activa cuando decides</Eyebrow>
            <p className="mt-1.5 text-[13px] text-fg-muted">
              Cuando aceptas un avalúo, Gabriela mueve el resto de la operación por ti.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SALIDAS.map((c) => (
              <ConexionCard key={c.modulo} c={c} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
