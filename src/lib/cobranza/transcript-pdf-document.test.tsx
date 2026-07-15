// Phase 38 plan 38-07 task 38-07-01 — type-check tests for TranscriptPdf component.
//
// We don't render the React-PDF document tree in Node (it requires the
// @react-pdf/renderer reconciler + pdf().toBlob() lives in browser-PDF land).
// Per plan: smoke-test that the component is a function and the props
// interface accepts the expected shape.

import { describe, it, expect } from 'vitest'
import { TranscriptPdf, type TranscriptPdfProps, type RedactedTurn } from './transcript-pdf-document'

describe('TranscriptPdf', () => {
  it('exports the TranscriptPdf component as a function', () => {
    expect(typeof TranscriptPdf).toBe('function')
  })

  it('accepts a fully-typed TranscriptPdfProps object with 2 turns (agent + debtor)', () => {
    const props: TranscriptPdfProps = {
      callId: 'b81a3c9d-0e8f-4f2a-9c5b-3d1e2f0a4b6c',
      debtorNameRedacted: 'Juan •••',
      generatedAt: '2026-05-31T10:00:00.000Z',
      turns: [
        {
          speaker: 'agent',
          text: 'Buenos días, le habla Leasefy.',
          timestamp: '00:01',
        },
        {
          speaker: 'debtor',
          text: 'Mi cédula es 12•••90 y mi celular es 30•••89.',
          timestamp: '00:08',
        },
      ],
    }
    // Type-check passes; constructing the element verifies the JSX shape too.
    const element = TranscriptPdf(props)
    expect(element).toBeTruthy()
  })

  it('RedactedTurn type accepts both agent and debtor speakers', () => {
    const agentTurn: RedactedTurn = { speaker: 'agent', text: 'hi', timestamp: '00:00' }
    const debtorTurn: RedactedTurn = { speaker: 'debtor', text: 'hi', timestamp: '00:01' }
    expect(agentTurn.speaker).toBe('agent')
    expect(debtorTurn.speaker).toBe('debtor')
  })

  it('accepts an empty turns array (zero-turn transcript)', () => {
    const props: TranscriptPdfProps = {
      callId: 'aaaa-bbbb',
      debtorNameRedacted: 'Anon •••',
      generatedAt: new Date().toISOString(),
      turns: [],
    }
    const element = TranscriptPdf(props)
    expect(element).toBeTruthy()
  })
})
