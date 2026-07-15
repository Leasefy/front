/**
 * Markdown system-prompt section utilities.
 *
 * The system prompt is organized as `## SECTION NAME` markdown blocks.
 * The editor surfaces each block as an editable card so we can patch a
 * subsection without nuking the whole prompt. Idempotency markers
 * (`<!-- SILENCE_V1 -->`, etc.) are surfaced as pills next to the heading.
 *
 * Ported from admin/src/lib/prompt-sections.ts — logic is identical.
 */

export interface PromptSection {
  /** Header line text, e.g. "IDENTIDAD (SEGURIDAD CRÍTICA)". */
  title: string
  /** Full block content INCLUDING the `## title` header line. */
  raw: string
  /** Character offset into the original prompt where this section begins. */
  start: number
  /** Character offset of the next section's header (or prompt length). */
  end: number
  /** Idempotency markers found in this block (e.g. SILENCE_V1). */
  markers: string[]
}

const SECTION_RE = /^## (.+)$/gm
const MARKER_RE = /<!--\s*([A-Z_][A-Z0-9_]*)\s*-->/g

export function splitSections(prompt: string): PromptSection[] {
  const matches: Array<{ idx: number; title: string }> = []
  let m: RegExpExecArray | null
  SECTION_RE.lastIndex = 0
  while ((m = SECTION_RE.exec(prompt)) !== null) {
    matches.push({ idx: m.index, title: m[1]!.trim() })
  }
  if (matches.length === 0) {
    return [{ title: '(sin sección)', raw: prompt, start: 0, end: prompt.length, markers: [] }]
  }
  const out: PromptSection[] = []
  if (matches[0]!.idx > 0) {
    out.push({
      title: '(preámbulo)',
      raw: prompt.slice(0, matches[0]!.idx),
      start: 0,
      end: matches[0]!.idx,
      markers: [],
    })
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i]!.idx
    const end = i + 1 < matches.length ? matches[i + 1]!.idx : prompt.length
    const raw = prompt.slice(start, end)
    const markers: string[] = []
    MARKER_RE.lastIndex = 0
    let mm: RegExpExecArray | null
    while ((mm = MARKER_RE.exec(raw)) !== null) {
      markers.push(mm[1]!)
    }
    out.push({ title: matches[i]!.title, raw, start, end, markers })
  }
  return out
}

/** Reassemble sections back into a single string. */
export function joinSections(sections: PromptSection[]): string {
  return sections.map((s) => s.raw).join('')
}

/** Return a new sections array with the section at `idx` replaced. */
export function replaceSection(
  sections: PromptSection[],
  idx: number,
  newRaw: string,
): PromptSection[] {
  const copy = [...sections]
  copy[idx] = { ...copy[idx]!, raw: newRaw }
  return copy
}

/** Line-level diff for UI display — added/removed/changed counts. */
export function diffStats(
  oldText: string,
  newText: string,
): { added: number; removed: number; changed: number } {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)
  let added = 0
  let removed = 0
  for (const l of newLines) if (!oldSet.has(l)) added++
  for (const l of oldLines) if (!newSet.has(l)) removed++
  return { added, removed, changed: Math.min(added, removed) }
}
