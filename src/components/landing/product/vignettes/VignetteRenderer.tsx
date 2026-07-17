import type { Vignette } from '@/lib/landing/types'
import { VgCard } from './VgCard'
import { RowsVignette } from './RowsVignette'
import { ChatVignette } from './ChatVignette'
import { StepsVignette } from './StepsVignette'
import { StatVignette } from './StatVignette'
import { LedgerVignette } from './LedgerVignette'
import { DocVignette } from './DocVignette'

/**
 * Typed dispatcher mirroring the standalone's `vgOne(v)`
 * (`landing-standalone/index.html` ~L3722): wraps the correct typed body
 * renderer for `vignette.kind` inside the shared `<VgCard>` shell. This is
 * the single entry point `ProductPage` (SLICE 4b) renders for every
 * `window`/`stories[].vignette` entry.
 */
export function VignetteRenderer({ vignette }: { vignette: Vignette }) {
  return <VgCard vignette={vignette}>{renderBody(vignette)}</VgCard>
}

function renderBody(vignette: Vignette) {
  switch (vignette.kind) {
    case 'rows':
      return <RowsVignette data={vignette.data} />
    case 'chat':
      return <ChatVignette data={vignette.data} />
    case 'steps':
      return <StepsVignette data={vignette.data} />
    case 'stat':
      return <StatVignette data={vignette.data} />
    case 'ledger':
      return <LedgerVignette data={vignette.data} />
    case 'doc':
      return <DocVignette data={vignette.data} />
  }
}
