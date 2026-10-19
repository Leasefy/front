'use client'

/**
 * AnilloDelMaestro — el centro del Laboratorio (Nico, 19-10-2026, el «Paper Lab»: «quiero que al final el maestro sea así
 * de crack»). TODO lo que se dibuja sale de la noche, nada es decorativo:
 *   - el ANILLO: cada inmobiliaria es un tramo, agrupadas por tamaño; dentro, un bloque por agente (más claro cuanto más
 *     hizo en 30 días; rojo si mucho de eso salió mal);
 *   - las RAYAS de afuera: las preguntas al chat de cada inmobiliaria;
 *   - el CENTRO: los seis del maestro (lector, pensador, verificador, revisor, medidor, archivista); se enciende el que
 *     está trabajando;
 *   - los TRAZOS: lo que pasa en cada paso de la bitácora (un diario que entra, un ensayo que sale a cada inmobiliaria con
 *     su veredicto, el revisor que tumba).
 * Con movimiento reducido no hay trazos: sólo el anillo y lo encendido.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import type { InmobiliariaDelLaboratorio, PasoDelMaestro, RolDelMaestro, VeredictoDelEnsayo } from '@/lib/admin/agent-api'
import { ROLES } from '@/lib/admin/laboratorio'

const FONDO = '#08090b'
const ROJO = '232, 72, 85'
const BLANCO = '255, 255, 255'
const ORDEN_DE_TAMANO = ['pequena', 'mediana', 'grande', 'sin'] as const
const NOMBRE_DEL_TAMANO: Record<string, string> = { pequena: 'PEQUEÑAS', mediana: 'MEDIANAS', grande: 'GRANDES', sin: 'SIN TAMAÑO' }

interface Tramo {
  readonly inm: InmobiliariaDelLaboratorio
  readonly desde: number
  readonly hasta: number
  readonly grupo: string
}

interface Trazo {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
  t: number
  v: number
  color: string
  ancho: number
  cola: Array<[number, number]>
}

interface Pulso {
  x: number
  y: number
  r: number
  color: string
  vida: number
}

export interface AnilloProps {
  readonly inmobiliarias: readonly InmobiliariaDelLaboratorio[]
  /** El último paso que se mostró (dispara sus trazos). */
  readonly paso: PasoDelMaestro | null
  readonly rolActivo: RolDelMaestro | null
  readonly reducido: boolean
  /** Las inmobiliarias de un ensayo, por alias y veredicto (de la propuesta del paso). */
  readonly ensayoDe: (huella: string) => ReadonlyArray<{ alias: string; veredicto: VeredictoDelEnsayo }> | null
  readonly alto: number
}

function tramos(inmobiliarias: readonly InmobiliariaDelLaboratorio[]): Tramo[] {
  const grupos = ORDEN_DE_TAMANO.map((g) => ({ g, lista: inmobiliarias.filter((i) => (i.categorias?.tamano ?? 'sin') === g) })).filter((x) => x.lista.length > 0)
  const n = inmobiliarias.length
  if (n === 0) return []
  const huecoDeGrupo = grupos.length > 1 ? 0.07 : 0
  const huecoDeTramo = Math.min(0.02, 0.6 / n)
  const util = Math.PI * 2 - huecoDeGrupo * grupos.length - huecoDeTramo * n
  const cada = util / n
  const out: Tramo[] = []
  let a = -Math.PI / 2 + huecoDeGrupo / 2
  for (const { g, lista } of grupos) {
    for (const inm of lista) {
      out.push({ inm, desde: a, hasta: a + cada, grupo: g })
      a += cada + huecoDeTramo
    }
    a += huecoDeGrupo
  }
  return out
}

export function AnilloDelMaestro({ inmobiliarias, paso, rolActivo, reducido, ensayoDe, alto }: AnilloProps) {
  const lienzo = useRef<HTMLCanvasElement | null>(null)
  const caja = useRef<HTMLDivElement | null>(null)
  const [ancho, setAncho] = useState(0)
  const [encima, setEncima] = useState<{ x: number; y: number; t: Tramo } | null>(null)
  const trazos = useRef<Trazo[]>([])
  const pulsos = useRef<Pulso[]>([])
  const aliasActivo = useRef<string | null>(null)
  const rolRef = useRef<RolDelMaestro | null>(rolActivo)
  rolRef.current = rolActivo

  const lista = useMemo(() => tramos(inmobiliarias), [inmobiliarias])

  // La geometría (depende del tamaño).
  const geo = useMemo(() => {
    const W = ancho
    const H = alto
    // Lo más lejos que se dibuja es el rótulo del grupo (≈ 1,6 R): el anillo cabe entero en el lienzo.
    const R = Math.max(60, Math.min(W * 0.3, (H / 2 - 18) / 1.62))
    return { W, H, cx: W / 2, cy: H / 2, R, banda: R * 0.17, nucleo: R * 0.24 }
  }, [ancho, alto])

  const nodoDe = (rol: RolDelMaestro): [number, number] => {
    const i = ROLES.findIndex((r) => r.rol === rol)
    const a = -Math.PI / 2 + (i / ROLES.length) * Math.PI * 2
    return [geo.cx + Math.cos(a) * geo.nucleo, geo.cy + Math.sin(a) * geo.nucleo]
  }
  const puntoDelTramo = (t: Tramo, radio: number): [number, number] => {
    const a = t.desde + Math.random() * (t.hasta - t.desde)
    return [geo.cx + Math.cos(a) * radio, geo.cy + Math.sin(a) * radio]
  }

  // El ancho de la caja.
  useEffect(() => {
    const el = caja.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') {
      setAncho(Math.floor(el.clientWidth))
      return
    }
    const ro = new ResizeObserver((e) => setAncho(Math.floor(e[0]?.contentRect.width ?? 0)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // La capa quieta: el anillo con sus agentes, las rayas del chat y los rótulos.
  const quieta = useMemo(() => {
    if (typeof document === 'undefined' || geo.W === 0) return null
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1
    const c = document.createElement('canvas')
    c.width = geo.W * dpr
    c.height = geo.H * dpr
    const g = c.getContext('2d')
    if (!g) return null
    g.scale(dpr, dpr)
    const { cx, cy, R, banda } = geo
    // El anillo.
    g.strokeStyle = `rgba(${BLANCO}, 0.22)`
    g.lineWidth = 1
    for (const r of [R - banda / 2, R + banda / 2]) {
      g.beginPath()
      g.arc(cx, cy, r, 0, Math.PI * 2)
      g.stroke()
    }
    const maxAcc = Math.max(1, ...lista.flatMap((t) => t.inm.agentes.map((a) => a.acciones30d)))
    const maxPreg = Math.max(1, ...lista.map((t) => t.inm.preguntas))
    for (const t of lista) {
      // Los agentes: una grilla de bloques dentro del tramo (filas hacia afuera, columnas a lo largo).
      const agentes = t.inm.agentes
      const filas = 3
      const columnas = Math.max(1, Math.ceil(agentes.length / filas))
      const da = (t.hasta - t.desde) / columnas
      const dr = banda / filas
      agentes.forEach((ag, k) => {
        const col = Math.floor(k / filas)
        const fila = k % filas
        const a0 = t.desde + col * da + da * 0.12
        const a1 = t.desde + (col + 1) * da - da * 0.12
        const r0 = R - banda / 2 + fila * dr + dr * 0.18
        const r1 = R - banda / 2 + (fila + 1) * dr - dr * 0.18
        const fuerza = ag.acciones30d === 0 ? 0.06 : 0.18 + 0.8 * (Math.log(ag.acciones30d + 1) / Math.log(maxAcc + 1))
        const mala = ag.acciones30d > 0 && ag.malas30d / ag.acciones30d > 0.2
        g.fillStyle = mala ? `rgba(${ROJO}, ${Math.min(0.95, fuerza + 0.15)})` : `rgba(${BLANCO}, ${fuerza})`
        g.beginPath()
        g.arc(cx, cy, r1, a0, a1)
        g.arc(cx, cy, r0, a1, a0, true)
        g.closePath()
        g.fill()
      })
      if (agentes.length === 0) {
        g.fillStyle = `rgba(${BLANCO}, 0.08)`
        g.beginPath()
        g.arc(cx, cy, R + banda / 2 - 2, t.desde, t.hasta)
        g.arc(cx, cy, R - banda / 2 + 2, t.hasta, t.desde, true)
        g.closePath()
        g.fill()
      }
      // Las rayas del chat: más largas y más cuantas más preguntas tuvo en 30 días.
      const largo = (Math.log(t.inm.preguntas + 1) / Math.log(maxPreg + 1)) * R * 0.42
      const rayas = Math.min(14, Math.max(t.inm.preguntas > 0 ? 2 : 0, Math.round(Math.sqrt(t.inm.preguntas) * 1.6)))
      for (let k = 0; k < rayas; k++) {
        const a = t.desde + ((k + 0.5) / rayas) * (t.hasta - t.desde)
        const l = largo
        const r0 = R + banda / 2 + 4
        g.strokeStyle = `rgba(${BLANCO}, 0.32)`
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
        g.lineTo(cx + Math.cos(a) * (r0 + l), cy + Math.sin(a) * (r0 + l))
        g.stroke()
      }
      // El alias.
      const am = (t.desde + t.hasta) / 2
      g.fillStyle = `rgba(${BLANCO}, 0.7)`
      g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(t.inm.alias, cx + Math.cos(am) * (R - banda / 2 - 16), cy + Math.sin(am) * (R - banda / 2 - 16))
    }
    // Los grupos por tamaño.
    const grupos = new Map<string, { desde: number; hasta: number; n: number }>()
    for (const t of lista) {
      const x = grupos.get(t.grupo) ?? { desde: t.desde, hasta: t.hasta, n: 0 }
      x.hasta = t.hasta
      x.n++
      grupos.set(t.grupo, x)
    }
    for (const [grupo, x] of grupos) {
      const r = R + banda / 2 + R * 0.5
      g.strokeStyle = `rgba(${BLANCO}, 0.18)`
      g.beginPath()
      g.arc(cx, cy, R + banda / 2 + R * 0.46, x.desde, x.hasta)
      g.stroke()
      const am = (x.desde + x.hasta) / 2
      g.fillStyle = `rgba(${BLANCO}, 0.55)`
      g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
      g.textAlign = Math.cos(am) >= 0 ? 'left' : 'right'
      g.fillText(`${NOMBRE_DEL_TAMANO[grupo] ?? grupo} · ${x.n}`, cx + Math.cos(am) * (r + 4), cy + Math.sin(am) * (r + 4))
    }
    // El núcleo del maestro.
    g.strokeStyle = `rgba(${BLANCO}, 0.16)`
    g.beginPath()
    g.arc(cx, cy, geo.nucleo, 0, Math.PI * 2)
    g.stroke()
    return c
  }, [geo, lista])

  // Cada paso nuevo dispara sus trazos.
  useEffect(() => {
    if (!paso) return
    const detalle = paso.detalle
    if (paso.paso === 'leyo' && typeof detalle.alias === 'string') aliasActivo.current = detalle.alias
    if (reducido || geo.W === 0) return
    const nuevo = (desde: [number, number], hasta: [number, number], color: string, cuantos: number, ancho = 1) => {
      for (let k = 0; k < cuantos; k++) {
        const [x0, y0] = desde
        const [x1, y1] = hasta
        const mx = (x0 + x1) / 2
        const my = (y0 + y1) / 2
        const nx = -(y1 - y0)
        const ny = x1 - x0
        const curva = (Math.random() - 0.5) * 0.7
        trazos.current.push({ x0, y0, x1, y1, cx: mx + nx * curva, cy: my + ny * curva, t: -Math.random() * 0.5, v: 0.012 + Math.random() * 0.014, color, ancho, cola: [] })
      }
    }
    const pulso = (p: [number, number], color: string) => pulsos.current.push({ x: p[0], y: p[1], r: 4, color, vida: 1 })
    const tramoDe = (alias: string) => lista.find((t) => t.inm.alias === alias) ?? null
    const afuera = geo.R + geo.banda / 2
    switch (paso.paso) {
      case 'leyo': {
        const t = typeof detalle.alias === 'string' ? tramoDe(detalle.alias) : null
        if (!t) break
        const cuantos = Math.min(18, 4 + Math.round(Number(detalle.diarios ?? 0) / 3))
        for (let k = 0; k < cuantos; k++) nuevo(puntoDelTramo(t, afuera), nodoDe('lector'), `rgba(${BLANCO}, 0.75)`, 1)
        break
      }
      case 'resumen':
      case 'piensa':
        nuevo(nodoDe('lector'), nodoDe('pensador'), `rgba(${BLANCO}, 0.8)`, 10)
        break
      case 'penso':
      case 'insight':
        pulso(nodoDe('pensador'), BLANCO)
        break
      case 'ensayo': {
        const lista2 = (Array.isArray(detalle.inmobiliarias) ? (detalle.inmobiliarias as Array<{ alias: string; veredicto: VeredictoDelEnsayo }>) : null) ?? (typeof detalle.huella === 'string' ? ensayoDe(detalle.huella) : null) ?? []
        nuevo(nodoDe('pensador'), nodoDe('verificador'), `rgba(${BLANCO}, 0.8)`, 4)
        for (const x of lista2) {
          const t = tramoDe(x.alias)
          if (!t) continue
          const color = x.veredicto === 'empeora' ? `rgba(${ROJO}, 0.95)` : x.veredicto === 'mejora' ? `rgba(${BLANCO}, 0.9)` : `rgba(${BLANCO}, 0.35)`
          nuevo(nodoDe('verificador'), puntoDelTramo(t, geo.R - geo.banda / 2), color, x.veredicto === 'sin_datos' ? 1 : 3, x.veredicto === 'empeora' ? 1.5 : 1)
        }
        if (detalle.veredicto === 'empeora') pulso(nodoDe('verificador'), ROJO)
        break
      }
      case 'revisa':
        nuevo(nodoDe('verificador'), nodoDe('revisor'), `rgba(${BLANCO}, 0.8)`, 8)
        break
      case 'aguanta':
        pulso(nodoDe('revisor'), BLANCO)
        break
      case 'tumba':
        pulso(nodoDe('revisor'), ROJO)
        nuevo(nodoDe('revisor'), [geo.cx, geo.cy], `rgba(${ROJO}, 0.95)`, 6, 1.5)
        break
      case 'mide':
      case 'midio':
        pulso(nodoDe('medidor'), detalle.veredicto === 'empeoro' ? ROJO : BLANCO)
        break
      case 'propone_deshacer':
        pulso(nodoDe('medidor'), ROJO)
        break
      case 'inicio':
      case 'fin':
        pulso(nodoDe('archivista'), BLANCO)
        break
    }
    // Un tope: nunca más de 500 trazos vivos.
    if (trazos.current.length > 500) trazos.current.splice(0, trazos.current.length - 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso?.orden, paso?.paso, reducido, geo.W])

  // El cuadro a cuadro.
  useEffect(() => {
    const c = lienzo.current
    if (!c || geo.W === 0) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = geo.W * dpr
    c.height = geo.H * dpr
    const g = c.getContext('2d')
    if (!g) return
    let vivo = true
    let id = 0
    const pintar = () => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.fillStyle = FONDO
      g.fillRect(0, 0, geo.W, geo.H)
      if (quieta) g.drawImage(quieta, 0, 0, geo.W, geo.H)
      // La inmobiliaria que se está leyendo.
      const alias = aliasActivo.current
      const t = alias ? lista.find((x) => x.inm.alias === alias) : null
      if (t) {
        g.strokeStyle = `rgba(${BLANCO}, 0.9)`
        g.lineWidth = 2
        g.beginPath()
        g.arc(geo.cx, geo.cy, geo.R + geo.banda / 2 + 2, t.desde, t.hasta)
        g.stroke()
        g.lineWidth = 1
      }
      // Los seis del maestro.
      for (const r of ROLES) {
        const [x, y] = nodoDe(r.rol)
        const activo = rolRef.current === r.rol
        g.fillStyle = activo ? `rgba(${BLANCO}, 1)` : `rgba(${BLANCO}, 0.28)`
        g.beginPath()
        g.arc(x, y, activo ? 4.5 : 3, 0, Math.PI * 2)
        g.fill()
        if (activo) {
          g.strokeStyle = `rgba(${BLANCO}, 0.35)`
          g.beginPath()
          g.arc(x, y, 9, 0, Math.PI * 2)
          g.stroke()
        }
        g.fillStyle = activo ? `rgba(${BLANCO}, 0.95)` : `rgba(${BLANCO}, 0.4)`
        g.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        const dy = y < geo.cy ? -13 : 13
        g.fillText(r.nombre.toUpperCase(), x, y + dy)
      }
      g.fillStyle = `rgba(${BLANCO}, 0.85)`
      g.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
      g.textAlign = 'center'
      g.fillText('MAESTRO', geo.cx, geo.cy)
      // Los trazos.
      const vivos: Trazo[] = []
      for (const z of trazos.current) {
        z.t += z.v
        if (z.t < 0) {
          vivos.push(z)
          continue
        }
        const u = Math.min(1, z.t)
        const x = (1 - u) * (1 - u) * z.x0 + 2 * (1 - u) * u * z.cx + u * u * z.x1
        const y = (1 - u) * (1 - u) * z.y0 + 2 * (1 - u) * u * z.cy + u * u * z.y1
        z.cola.push([x, y])
        if (z.cola.length > 14) z.cola.shift()
        g.strokeStyle = z.color
        g.lineWidth = z.ancho
        g.beginPath()
        z.cola.forEach(([px, py], k) => (k === 0 ? g.moveTo(px, py) : g.lineTo(px, py)))
        g.stroke()
        if (z.t < 1.25) vivos.push(z)
      }
      trazos.current = vivos
      // Los pulsos.
      const quedan: Pulso[] = []
      for (const p of pulsos.current) {
        p.r += 1.2
        p.vida -= 0.025
        if (p.vida <= 0) continue
        g.strokeStyle = `rgba(${p.color}, ${p.vida})`
        g.beginPath()
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        g.stroke()
        quedan.push(p)
      }
      pulsos.current = quedan
      if (vivo) id = requestAnimationFrame(pintar)
    }
    pintar()
    return () => {
      vivo = false
      cancelAnimationFrame(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, quieta, lista])

  const alMover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const d = Math.hypot(x - geo.cx, y - geo.cy)
    if (d < geo.R - geo.banda / 2 - 4 || d > geo.R + geo.banda / 2 + geo.R * 0.45) return setEncima(null)
    let a = Math.atan2(y - geo.cy, x - geo.cx)
    if (a < -Math.PI / 2) a += Math.PI * 2
    const t = lista.find((z) => a >= z.desde && a <= z.hasta) ?? null
    setEncima(t ? { x, y, t } : null)
  }

  return (
    <div ref={caja} className="relative w-full" style={{ height: alto }}>
      <canvas
        ref={lienzo}
        className="block w-full"
        style={{ height: alto }}
        role="img"
        aria-label={`El anillo del maestro: ${inmobiliarias.length} inmobiliaria${inmobiliarias.length === 1 ? '' : 's'} con sus agentes y sus preguntas al chat; en el centro, los seis del maestro.`}
        onMouseMove={alMover}
        onMouseLeave={() => setEncima(null)}
      />
      {inmobiliarias.length === 0 ? (
        <p className="absolute inset-x-0 top-[62%] text-center font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">Todavía no hay inmobiliarias leídas en esta noche</p>
      ) : null}
      {encima ? (
        <div
          className="pointer-events-none absolute z-10 w-64 border border-white/20 bg-[#0e1013]/95 p-3 font-mono text-[11px] text-white/85"
          style={{ left: Math.min(encima.x + 14, ancho - 270), top: Math.max(8, encima.y - 20) }}
          data-maestro-tramo={encima.t.inm.alias}
        >
          <p className="text-white">
            {encima.t.inm.alias} · {encima.t.inm.nombre}
          </p>
          <p className="mt-1 text-white/55">
            {encima.t.inm.diarios} diario{encima.t.inm.diarios === 1 ? '' : 's'} · {encima.t.inm.preguntas} pregunta{encima.t.inm.preguntas === 1 ? '' : 's'} al chat
          </p>
          <ul className="mt-2 space-y-0.5">
            {[...encima.t.inm.agentes]
              .sort((a, b) => b.acciones30d - a.acciones30d)
              .slice(0, 6)
              .map((a) => (
                <li key={a.agente} className="flex justify-between gap-2">
                  <span>{a.agente}</span>
                  <span className={a.acciones30d > 0 && a.malas30d / a.acciones30d > 0.2 ? 'text-[#e84855]' : 'text-white/55'}>
                    {a.acciones30d} · {a.malas30d} mal
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
