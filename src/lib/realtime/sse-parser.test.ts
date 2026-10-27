import { describe, it, expect } from 'vitest'
import { createSseParser, type SseFrame } from './sse-parser'

function collect() {
  const frames: SseFrame[] = []
  const parser = createSseParser((f) => frames.push(f))
  return { frames, parser }
}

describe('createSseParser', () => {
  it('parses a complete frame with event, id and data', () => {
    const { frames, parser } = collect()
    parser.push('id: 2026-10-25T10:00:00.000Z_abc\nevent: notification.created\ndata: {"id":"n1"}\n\n')
    expect(frames).toEqual([
      { event: 'notification.created', data: '{"id":"n1"}', id: '2026-10-25T10:00:00.000Z_abc' },
    ])
  })

  it('defaults the event name to "message"', () => {
    const { frames, parser } = collect()
    parser.push('data: hi\n\n')
    expect(frames[0]).toMatchObject({ event: 'message', data: 'hi', id: '' })
  })

  it('reassembles a frame split across chunks, even mid-line', () => {
    const { frames, parser } = collect()
    parser.push('event: rea')
    parser.push('dy\ndata: {"connectionId":')
    parser.push('"c1"}\n')
    expect(frames).toHaveLength(0)
    parser.push('\n')
    expect(frames).toEqual([{ event: 'ready', data: '{"connectionId":"c1"}', id: '' }])
  })

  it('handles CRLF line endings, including a CR/LF split across chunks', () => {
    const { frames, parser } = collect()
    parser.push('event: resync\r\ndata: {}\r')
    parser.push('\n\r\n')
    expect(frames).toEqual([{ event: 'resync', data: '{}', id: '' }])
  })

  it('ignores comment lines such as ": ping"', () => {
    const { frames, parser } = collect()
    parser.push(': ping\n\n')
    parser.push(': ping\nevent: reauth\ndata: {}\n\n')
    expect(frames).toEqual([{ event: 'reauth', data: '{}', id: '' }])
  })

  it('joins multi-line data with a newline and strips one leading space', () => {
    const { frames, parser } = collect()
    parser.push('data: a\ndata:  b\n\n')
    expect(frames[0].data).toBe('a\n b')
  })

  it('does not emit a frame without data lines', () => {
    const { frames, parser } = collect()
    parser.push('event: ready\n\n')
    expect(frames).toHaveLength(0)
  })

  it('resets event name and id between frames', () => {
    const { frames, parser } = collect()
    parser.push('id: 1\nevent: a\ndata: x\n\ndata: y\n\n')
    expect(frames[1]).toEqual({ event: 'message', data: 'y', id: '' })
  })
})
