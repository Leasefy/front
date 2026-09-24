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

/**
 * El porqué de un botón apagado mientras su proceso corre (23-09: el avance
 * vive en el centro; la pantalla no gira ni cuenta, sólo dice dónde mirar).
 */
export const EN_CURSO_EN_EL_CENTRO = 'Ya está en curso: lo sigues en el centro de procesos, arriba a la derecha.'

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
    case 'ENVIO_A_WOMPI':
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

// ══ El «Arrancando…» del panel (23-09) ═══════════════════════════════════════

/**
 * Lo que una pantalla anunció que lanzó, mientras el back todavía no lo
 * registró. `conocidos` son los ids que el centro ya tenía en la lista cuando
 * llegó el anuncio: un proceso que NO está ahí nació después.
 */
export interface AnuncioPendiente {
  titulo: string
  procesoId: string | null
  tipo: string | null
  conocidos: ReadonlySet<string>
  desde: number
}

/**
 * Pasado este rato, el «Arrancando…» se quita igual: la fila nace en el back
 * en el mismo request que lanza el proceso, así que si a los 30 s no apareció
 * es que no va a aparecer (un back sin centro, un POST que falló), y una línea
 * que gira para siempre es peor que ninguna.
 */
export const MS_TOPE_DEL_ANUNCIO = 30_000

/**
 * ¿El centro ya ve lo que se anunció? 🔴 Nico, 23-09: la fila decía «Facturas
 * · septiembre 2026 · Listo · tardó 21 s» y arriba seguía «Arrancando
 * "Emitiendo 1 factura"…», con el encabezado en «Nada en curso». El anuncio
 * sólo se escondía mientras hubiera algo EN CURSO y se borraba al cerrar el
 * panel: un proceso que el sondeo nunca vio corriendo —pasó de no existir a
 * «Listo» entre dos consultas— lo dejaba colgado, y además el título del
 * anuncio («Emitiendo 1 factura») no es el del proceso («Facturas ·
 * septiembre 2026»), así que no había cómo emparejarlos por nombre.
 *
 * Se empareja por lo que sí es estable: el id del proceso si el anuncio lo
 * trae; si no, cualquier proceso MÍO que no estaba en la lista al anunciar
 * (y del mismo tipo, si se sabe) — en cualquier estado, también terminado.
 */
export function anuncioResuelto(
  anuncio: AnuncioPendiente,
  procesos: readonly Pick<Proceso, 'id' | 'tipo' | 'esMio'>[],
  ahora: number = Date.now(),
): boolean {
  if (ahora - anuncio.desde >= MS_TOPE_DEL_ANUNCIO) return true
  if (anuncio.procesoId) return procesos.some((p) => p.id === anuncio.procesoId)
  return procesos.some(
    (p) => p.esMio && !anuncio.conocidos.has(p.id) && (!anuncio.tipo || p.tipo === anuncio.tipo),
  )
}
