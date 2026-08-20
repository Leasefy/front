/**
 * ReportBlockView.tsx — el despacho por arquetipo.
 *
 * Regla de gobierno que este archivo hace cumplir: **una sección nueva del
 * informe cuesta CERO componentes acá**; un arquetipo nuevo cuesta uno, y
 * TypeScript lo cobra — el `never` del final no compila si aparece un `kind`
 * sin caso.
 */

import type { ReportBlock, SectionId } from '@/lib/avaluo/reporte/report-model'
import { BulletListBlockView, PlaceholderBlockView, ProseBlockView } from './blocks/TextBlocks'
import {
  HeadlineBlockView,
  KeyValuesBlockView,
  StatChainBlockView,
  TableBlockView,
  VerdictBlockView,
} from './blocks/DataBlocks'
import { FigureBlockView, MediaBlockView } from './blocks/MediaBlocks'
import { SealBlockView, type SealContext } from './blocks/SealBlock'

/**
 * Lo poco que un bloque necesita saber de la vista entera. Baja por props
 * porque el árbol es de servidor (sin contexto) y porque así queda escrito
 * quién consume qué: el sello usa `seal`, el hueco restringido usa
 * `paywallHref`, el anexo usa `sample`, el veredicto usa `sectionId` para la
 * variante de insight.
 */
export interface BlockContext {
  readonly seal: SealContext
  readonly paywallHref: string | null
  readonly sample: boolean
  readonly sectionId: SectionId
  /** true ⇒ la tarjeta es la de insight sobre gradiente (texto blanco). */
  readonly insight?: boolean
  /** true ⇒ tarjeta compacta (tres por fila): prosa más chica. */
  readonly compact?: boolean
}

export function ReportBlockView({ block, ctx }: { block: ReportBlock; ctx: BlockContext }) {
  switch (block.kind) {
    case 'prose':
      return <ProseBlockView block={block} compact={ctx.compact === true} />
    case 'keyValues':
      return <KeyValuesBlockView block={block} compact={ctx.compact === true} />
    case 'bulletList':
      return <BulletListBlockView block={block} />
    case 'table':
      return <TableBlockView block={block} />
    case 'headline':
      return <HeadlineBlockView block={block} />
    case 'verdict':
      return <VerdictBlockView block={block} variant={ctx.insight === true ? 'insight' : 'default'} />
    case 'statChain':
      return <StatChainBlockView block={block} />
    case 'placeholder':
      return <PlaceholderBlockView block={block} paywallHref={ctx.paywallHref} />
    case 'media':
      return <MediaBlockView block={block} sample={ctx.sample} />
    case 'figure':
      return <FigureBlockView block={block} />
    case 'seal':
      return <SealBlockView block={block} seal={ctx.seal} />
    default: {
      const exhaustive: never = block
      return exhaustive
    }
  }
}
