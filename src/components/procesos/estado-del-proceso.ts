/**
 * Cómo se dice cada cosa de un proceso, en UN lugar: el botón del header, la
 * página del centro y el detalle del lote pintan lo mismo con las mismas
 * palabras.
 */

import type { EstadoDeProceso, Proceso } from '@/lib/api/procesos.types'

export const NOMBRE_DEL_TIPO: Record<string, string> = {
  REPROCESAR_ASIENTOS: 'Reprocesar asientos',
  ARCHIVO_DEL_LOTE: 'Archivo del lote al banco',
  EMISION_DE_FACTURAS: 'Emisión de facturas',
  MIGRACION_CONTRATOS: 'Carga de contratos',
  MIGRACION_INMUEBLES: 'Carga de inmuebles',
  EXPORTACION: 'Exportación',
  ENVIO_A_WOMPI: 'Lote en Wompi · Pagos a terceros',
}

export const NOMBRE_DEL_ESTADO: Record<EstadoDeProceso, string> = {
  EN_COLA: 'En cola',
  CORRIENDO: 'En curso',
  TERMINADO: 'Listo',
  FALLO: 'Falló',
  CANCELADO: 'Cancelado',
}

/** El tono del estado: el mismo par `-soft` / texto de los cuatro tonos del DESIGN.md. */
export const TONO_DEL_ESTADO: Record<EstadoDeProceso, string> = {
  EN_COLA: 'bg-surface-muted text-fg-muted',
  CORRIENDO: 'bg-primary-soft text-primary',
  TERMINADO: 'bg-success-soft text-success',
  FALLO: 'bg-danger-soft text-danger',
  CANCELADO: 'bg-surface-muted text-fg-muted',
}

const ROL: Record<string, string> = {
  ADMIN: 'administrador',
  CONTADOR: 'contador',
  AGENTE: 'asesor',
  VIEWER: 'consulta',
  COORDINADOR: 'coordinador',
  AUXILIAR_CARTERA: 'auxiliar de cartera',
  ABOGADO_EXTERNO: 'abogado externo',
}

export function estaActivo(p: Pick<Proceso, 'estado'>): boolean {
  return p.estado === 'EN_COLA' || p.estado === 'CORRIENDO'
}

/** «Tú», «Ana Pérez · contador», o «El sistema» si nadie lo lanzó a mano. */
export function quienLoLanzo(p: Pick<Proceso, 'lanzadoPor' | 'esMio'>): string {
  if (p.esMio) return 'Tú'
  if (!p.lanzadoPor) return 'El sistema'
  const nombre = p.lanzadoPor.nombre ?? 'Alguien del equipo'
  const rol = p.lanzadoPor.rol ? ROL[p.lanzadoPor.rol] : null
  return rol ? `${nombre} · ${rol}` : nombre
}

/** «120 de 800» cuando se sabe el total; nada cuando no. */
export function avanceEnPalabras(p: Pick<Proceso, 'hechos' | 'total' | 'estado'>): string | null {
  if (p.total == null || p.total <= 0) return null
  const n = (x: number) => x.toLocaleString('es-CO')
  return `${n(Math.min(p.hechos, p.total))} de ${n(p.total)}`
}

/** «hace 3 min», «hace 2 h», «ayer», o la fecha. */
export function haceCuanto(iso: string, ahora: number = Date.now()): string {
  const ms = ahora - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} días`
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Bogota',
  })
}

/** `1234567` → «1,2 MB». */
export function tamanoDelArchivo(bytes: number | null): string | null {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('es-CO', { maximumFractionDigits: 0 })} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`
}

// ══ Etapa, resultado y reintento (22-09) ═════════════════════════════════════

const PREFIJO_DE_ETAPA = 'Etapa: '

/**
 * La etapa viaja al comienzo del mensaje («Etapa: Armando el ZIP. 1 factura
 * emitida.») mientras el back no tenga columna. Acá se separa.
 */
export function etapaYMensaje(p: Pick<Proceso, 'mensaje'>): { etapa: string | null; mensaje: string | null } {
  const m = p.mensaje
  if (!m || !m.startsWith(PREFIJO_DE_ETAPA)) return { etapa: null, mensaje: m }
  const resto = m.slice(PREFIJO_DE_ETAPA.length)
  const punto = resto.indexOf('. ')
  if (punto < 0) return { etapa: resto.replace(/\.$/, ''), mensaje: null }
  return { etapa: resto.slice(0, punto), mensaje: resto.slice(punto + 2) || null }
}

/** A qué pantalla lleva «Ver resultado», o `null` si no hay una. */
export function resultadoDe(p: Pick<Proceso, 'tipo' | 'recurso'>): { href: string; texto: string } | null {
  switch (p.tipo) {
    case 'EMISION_DE_FACTURAS':
      return { href: '/panel/inmobiliaria/facturacion', texto: 'Ver en Facturación' }
    case 'ARCHIVO_DEL_LOTE':
      return p.recurso?.id
        ? { href: `/panel/inmobiliaria/pagos/dispersiones/lotes/${p.recurso.id}`, texto: 'Ver el lote' }
        : null
    case 'REPROCESAR_ASIENTOS':
      return { href: '/panel/inmobiliaria/contabilidad/asientos', texto: 'Ver el libro' }
    case 'MIGRACION_CONTRATOS':
      return { href: '/panel/inmobiliaria/contratos/migrar', texto: 'Ver la migración' }
    case 'MIGRACION_INMUEBLES':
      return { href: '/panel/inmobiliaria/inmuebles/importar', texto: 'Ver la importación' }
    default:
      return null
  }
}

/** Duración si terminó («tardó 12 s»), o lo que falta si corre («faltan ~2 min»). */
export function tiempoDelProceso(
  p: Pick<Proceso, 'estado' | 'hechos' | 'total' | 'iniciadoAt' | 'createdAt' | 'terminadoAt'>,
  ahora: number = Date.now(),
): string | null {
  const inicio = new Date(p.iniciadoAt ?? p.createdAt).getTime()
  const enPalabras = (ms: number) => {
    const s = Math.max(1, Math.round(ms / 1000))
    if (s < 60) return `${s} s`
    const m = Math.round(s / 60)
    return m < 60 ? `${m} min` : `${Math.round(m / 60)} h`
  }
  if (p.terminadoAt) return `tardó ${enPalabras(new Date(p.terminadoAt).getTime() - inicio)}`
  if (p.estado === 'CORRIENDO' && p.total && p.hechos > 0 && p.hechos < p.total) {
    const falta = ((ahora - inicio) / p.hechos) * (p.total - p.hechos)
    return `faltan ~${enPalabras(falta)}`
  }
  return null
}
