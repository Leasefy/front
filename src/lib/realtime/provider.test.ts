import { describe, it, expect } from 'vitest'
import { resolveRealtimeProvider } from './provider'

describe('resolveRealtimeProvider', () => {
  it.each([
    [undefined, 'supabase'],
    ['', 'supabase'],
    ['   ', 'supabase'],
    ['supabase', 'supabase'],
    ['sse', 'sse'],
    [' SSE ', 'sse'],
    ['Sse\n', 'sse'],
    ['SUPABASE', 'supabase'],
  ])('maps %j to %s', (raw, expected) => {
    expect(resolveRealtimeProvider(raw)).toBe(expected)
  })

  it('falls back to supabase on an unknown value', () => {
    expect(resolveRealtimeProvider('websocket')).toBe('supabase')
  })
})
