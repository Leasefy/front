/**
 * CONTR-3 (QA de agentes 17-10): la Bandeja de Portofino traía 286 decisiones
 * y 285 caían en un solo chip, «Retenidos» (calidad 187, pagos 63,
 * inspección 28…). La prórroga de un contrato quedó en la página 29 de 29 sin
 * forma de encontrarla. Dos arreglos:
 *
 *   · lo retenido se agrupa por el AGENTE que lo propuso (Niti, Cobri, Vidi,
 *     Contratos…), con la misma llave que la fuente del micro cuando es el
 *     mismo agente: «calidad» retenida y la fuente «calidad» son un solo chip;
 *   · una búsqueda por texto (inquilino, contrato, inmueble…), sin tildes ni
 *     mayúsculas, que exige todas las palabras.
 */
import type { InboxItem } from '@/lib/api/piloto'
import {
  AGENTE_GOBERNADO,
  EQUIPO_DE_PAGOS,
  especialistaDelProceso,
  type Especialista,
} from '@/lib/pagos/equipo-de-pagos'

const PREFIJO_DEL_EQUIPO = `${AGENTE_GOBERNADO}:`

/**
 * El chip de la fila: lo retenido va con su agente; lo demás, con su tipo.
 * BANDEJA-AG (QA 19-10): dentro del equipo de pagos, con quien la propuso
 * (`pagos:reti`, `pagos:cuenti`): el agente `pagos` es Cobri y no hizo eso.
 */
export function grupoDeLaFila(item: Pick<InboxItem, 'fuente' | 'agente' | 'proceso'>): string {
  const agente = item.agente?.trim()
  if (item.fuente === 'retenido' && agente) {
    const especialista = agente === AGENTE_GOBERNADO ? especialistaDelProceso(item.proceso) : null
    return especialista ? `${PREFIJO_DEL_EQUIPO}${especialista.id}` : agente
  }
  return item.fuente
}

/** El especialista del equipo de pagos de un chip (`pagos:reti` → Reti), o null. */
export function especialistaDelGrupo(grupo: string): Especialista | null {
  if (!grupo.startsWith(PREFIJO_DEL_EQUIPO)) return null
  const id = grupo.slice(PREFIJO_DEL_EQUIPO.length)
  return EQUIPO_DE_PAGOS.find((e) => e.id === id) ?? null
}

function plano(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim()
}

/** ¿La fila tiene TODAS las palabras buscadas? Vacío = sí. */
export function coincideConLaBusqueda(
  item: Pick<InboxItem, 'titulo' | 'resumen'> & { motivo?: string },
  busqueda: string,
): boolean {
  const palabras = plano(busqueda).split(' ').filter(Boolean)
  if (palabras.length === 0) return true
  const texto = ` ${plano(`${item.titulo} ${item.resumen} ${item.motivo ?? ''}`)} `
  return palabras.every((p) => texto.includes(p))
}
