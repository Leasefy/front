/**
 * maestro.ts — cómo se dicen en /admin → Maestro las mejoras y los insights del maestro de Leasefy (Fase 3 de «Naira lo
 * sabe todo», Nico 19-10-2026). Puro.
 */

import type { ContenidoDeLaMejora } from '@/lib/admin/agent-api'

export const NOMBRE_DEL_MODO: Readonly<Record<string, string>> = { sombra: 'Manual', copiloto: 'Copiloto', autonomo: 'Automático' }

/** Lo que propone, en una frase. */
export function queProponeLaMejora(c: ContenidoDeLaMejora): string {
  if (c.tipo === 'leccion') return `Enseñarle a Ori: «${c.texto}»`
  if (c.tipo === 'modo') return `Poner a ${c.agente} en ${NOMBRE_DEL_MODO[c.modo] ?? c.modo}`
  return `Ajustar la regla «${c.parametro}» a ${c.valor}`
}

/** Un texto del modelo con el nombre de cada inmobiliaria donde escribió su alias («I3»). */
export function conNombres(texto: string, alias: Readonly<Record<string, string>>): string {
  return texto.replace(/\bI(\d{1,4})\b/g, (m) => alias[m] ?? m)
}
