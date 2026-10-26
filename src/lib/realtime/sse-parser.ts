/**
 * Incremental SSE frame parser (T-0183).
 *
 * The two existing precedents are not reusable as-is: `use-quote-stream.ts`
 * inlines its parser inside a hook and `ai-hub-chat.ts#splitSSEEvents` drops the
 * `id:` field, which the realtime stream needs for `Last-Event-ID` resume. This
 * is the same line-based algorithm (`event:` / `data:` / `id:`, comments
 * ignored, blank line ends a frame) extracted as a pure, testable unit.
 */

export interface SseFrame {
  event: string
  data: string
  id: string
}

export interface SseParser {
  push(chunk: string): void
}

export function createSseParser(onFrame: (frame: SseFrame) => void): SseParser {
  let buffer = ''
  let event = 'message'
  let dataLines: string[] = []
  let id = ''

  function line(raw: string) {
    if (raw === '') {
      if (dataLines.length > 0) onFrame({ event, data: dataLines.join('\n'), id })
      event = 'message'
      dataLines = []
      id = ''
      return
    }
    if (raw.startsWith(':')) return // comment / heartbeat
    const colon = raw.indexOf(':')
    const field = colon === -1 ? raw : raw.slice(0, colon)
    let value = colon === -1 ? '' : raw.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value.trim() || 'message'
    else if (field === 'data') dataLines.push(value)
    else if (field === 'id') id = value.trim()
  }

  return {
    push(chunk: string) {
      buffer += chunk
      let nl: number
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const raw = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        line(raw.endsWith('\r') ? raw.slice(0, -1) : raw)
      }
    },
  }
}
