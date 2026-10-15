/**
 * formato.ts — la ÚNICA forma de escribir un corte y un valor suelto de Naira (Fase 13, plan 13-01; D13-8, UI-02).
 *
 * Corte: la zona es FIJA (America/Bogota). La del navegador o la de la máquina no cuenta: `formatDate` de
 * i18n-context.tsx usa la del navegador y `formatDateTime` de src/lib/format.ts no fija zona. Un `asOf` inválido,
 * imposible (30 de febrero) o sin zona ⇒ `null`, y la vista no pinta el número (fail-closed, UI-SPEC §6.1). Esto NO
 * decide si un dato está rancio (eso lo declara el agente): solo da la fecha y la edad para que la persona juzgue.
 * El reloj entra por `ahora`; el formateador se arma en cada llamada (no se congela la zona al cargar el módulo).
 *
 * Valor: la misma fórmula del agente (09-03-PLAN.md:531-535; 10-04-PLAN.md:981), sin `parseFloat` ni `Number` sobre
 * enteros (un COP grande no pierde precisión: se formatea el BigInt). `pct` llega en PUNTOS porcentuales (`'12.5'`) y se
 * formatea como el agente lo hace por bps (`'12.5'` ⇒ 1250 bps ⇒ `Number(bps) / 10000` ⇒ «12,5%», P10). `days` repite la
 * gramática del agente (entero + « días»). Si el ítem trae `valorRenderizado` (E13-13, D13-23) la vista usa ESE texto y
 * esto es solo el respaldo. Cualquier otra forma ⇒ `null`.
 */

export const ZONA_DE_NAIRA = 'America/Bogota'

/** ISO-8601 con fecha, hora y zona obligatoria (Z u offset). */
const ISO_CON_ZONA = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/
const ENTERO = /^-?\d+$/
const PUNTOS_PORCENTUALES = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

export function formatearCorte(asOf: string, ahora: Date): { readonly absoluto: string; readonly edadMs: number } | null {
  const partes = ISO_CON_ZONA.exec(asOf)
  if (partes === null) return null
  const t = Date.parse(asOf)
  if (Number.isNaN(t)) return null
  // Date.parse acepta días imposibles y los corre al mes siguiente: el día literal tiene que existir.
  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  if (mes < 1 || mes > 12) return null
  if (new Date(Date.UTC(anio, mes - 1, dia)).getUTCDate() !== dia) return null
  const absoluto = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: ZONA_DE_NAIRA,
  }).format(t)
  return { absoluto, edadMs: Math.max(0, ahora.getTime() - t) }
}

function entero(valor: string): bigint | null {
  return ENTERO.test(valor) ? BigInt(valor) : null
}

export function formatearValorDeNaira(valor: string, unidad: 'pct' | 'cop' | 'count' | 'days'): string | null {
  switch (unidad) {
    case 'cop': {
      const n = entero(valor)
      if (n === null) return null
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
    }
    case 'count': {
      const n = entero(valor)
      if (n === null) return null
      return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
    }
    case 'days': {
      const n = entero(valor)
      if (n === null) return null
      return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) + ' días'
    }
    case 'pct': {
      const p = PUNTOS_PORCENTUALES.exec(valor)
      if (p === null) return null
      const decimales = (p[3] ?? '').padEnd(2, '0')
      const bps = BigInt(p[1] + p[2] + decimales)
      return new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 }).format(Number(bps) / 10000)
    }
    default:
      return null
  }
}
