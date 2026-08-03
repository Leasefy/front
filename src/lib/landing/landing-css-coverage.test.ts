/**
 * landing-css-coverage.test.ts — regression guard for incident #267
 * ("styling layer dropped between design and tasks in landing-react-port").
 *
 * Every `landing-*` BEM className emitted by any component under
 * `src/components/landing/**` must have at least one matching selector in
 * the scoped landing stylesheet, AND every rule in that stylesheet must be
 * scoped under `.landing-scope` (Next.js bundles plain CSS globally even
 * when imported from a nested layout, so `.landing-scope` is what prevents
 * leakage into the rest of the app). This test is deliberately generic over
 * the component tree — future slices (S4+) that add new `landing-*` classes
 * must extend this same stylesheet or this test will fail, which is the
 * intended forcing function.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const CSS_PATH = path.join(process.cwd(), 'src/app/(landing)/landing.css')
const COMPONENTS_ROOT = path.join(process.cwd(), 'src/components/landing')

// Non-namespaced global classes the standalone port kept verbatim (HANDOFF
// §7 collision rule) — these are NOT `landing-*` prefixed, so they are
// tracked explicitly instead of via the generic prefix scan.
const KNOWN_BARE_CLASSES = ['btn', 'primary', 'outline', 'inverse', 'lg', 'quote', 'who']

function listTsxFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listTsxFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      files.push(full)
    }
  }
  return files
}

function extractClassNameTokens(source: string): string[] {
  const tokens: string[] = []
  // Only literal className="..." attributes — passthrough props like
  // className={className} carry no literal token to extract.
  const re = /className="([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    tokens.push(...match[1].split(/\s+/).filter(Boolean))
  }
  return tokens
}

function collectRequiredClasses(): { landingClasses: Set<string>; bareClasses: Set<string> } {
  const landingClasses = new Set<string>()
  const bareClasses = new Set<string>()
  for (const file of listTsxFiles(COMPONENTS_ROOT)) {
    const source = fs.readFileSync(file, 'utf-8')
    for (const token of extractClassNameTokens(source)) {
      if (token.startsWith('landing-')) {
        landingClasses.add(token)
      } else if (KNOWN_BARE_CLASSES.includes(token)) {
        bareClasses.add(token)
      }
    }
  }
  return { landingClasses, bareClasses }
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Strips the body of at-rules whose inner selectors are exempt from the
 * `.landing-scope` prefix requirement (keyframe steps, font-face
 * declarations aren't selectors that need scoping). */
function stripExemptAtRuleBlocks(css: string): string {
  const exemptNames = ['keyframes', 'font-face', '-webkit-keyframes']
  let result = ''
  let i = 0
  while (i < css.length) {
    let nearestIdx = -1
    for (const name of exemptNames) {
      const idx = css.indexOf(`@${name}`, i)
      if (idx !== -1 && (nearestIdx === -1 || idx < nearestIdx)) nearestIdx = idx
    }
    if (nearestIdx === -1) {
      result += css.slice(i)
      break
    }
    result += css.slice(i, nearestIdx)
    const braceStart = css.indexOf('{', nearestIdx)
    let depth = 1
    let j = braceStart + 1
    while (depth > 0 && j < css.length) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    i = j
  }
  return result
}

/** Walks brace depth to collect selector text immediately before every `{`
 * at depth 0 (plain rules + at-rule preludes) and depth 1 (rules nested one
 * level inside e.g. `@media`/`@supports`). */
function collectScopableSelectors(css: string): string[] {
  const selectors: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of css) {
    if (ch === '{') {
      const text = buf.trim()
      buf = ''
      if (text && !text.startsWith('@') && (depth === 0 || depth === 1)) {
        selectors.push(text)
      }
      depth++
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1)
      buf = ''
    } else {
      buf += ch
    }
  }
  return selectors
}

describe('landing.css coverage', () => {
  it('exists as a stylesheet at src/app/(landing)/landing.css', () => {
    expect(fs.existsSync(CSS_PATH)).toBe(true)
  })

  it('defines a selector for every `landing-*` BEM class used by landing components', () => {
    const css = fs.readFileSync(CSS_PATH, 'utf-8')
    const { landingClasses } = collectRequiredClasses()
    expect(landingClasses.size).toBeGreaterThan(0)

    const missing: string[] = []
    for (const className of landingClasses) {
      const escaped = className.replace(/[-]/g, '\\-')
      const pattern = new RegExp(`\\.${escaped}(?![\\w-])`)
      if (!pattern.test(css)) missing.push(className)
    }
    expect(missing).toEqual([])
  })

  it('defines a selector for every non-namespaced global class kept verbatim (btn/quote/who variants)', () => {
    const css = fs.readFileSync(CSS_PATH, 'utf-8')
    const { bareClasses } = collectRequiredClasses()
    expect(bareClasses.size).toBeGreaterThan(0)

    const missing: string[] = []
    for (const className of bareClasses) {
      const pattern = new RegExp(`\\.${className}(?![\\w-])`)
      if (!pattern.test(css)) missing.push(className)
    }
    expect(missing).toEqual([])
  })

  it('renders visible ordered-list numbers in the blog article body (Preflight ol reset override)', () => {
    // Tailwind Preflight resets `ol { list-style: none; padding: 0 }` globally.
    // `BlogArticle`'s renderContent() relies on native <ol> counters (it
    // strips the literal "1., 2., ..." text from the source), so the scoped
    // stylesheet MUST restore list-style + indentation or the numbers never
    // render.
    const css = fs.readFileSync(CSS_PATH, 'utf-8')
    expect(css).toMatch(/\.landing-scope\s+\.landing-ba__body\s+ol\s*\{[^}]*list-style:\s*decimal/)
    expect(css).toMatch(/\.landing-scope\s+\.landing-ba__body\s+ol\s*\{[^}]*padding-left:/)
  })

  it('scopes every rule under .landing-scope (except keyframes/font-face)', () => {
    const css = fs.readFileSync(CSS_PATH, 'utf-8')
    const stripped = stripExemptAtRuleBlocks(stripComments(css))
    const selectors = collectScopableSelectors(stripped)
    expect(selectors.length).toBeGreaterThan(0)

    const unscoped = selectors.filter((selectorGroup) =>
      selectorGroup
        .split(',')
        .map((s) => s.trim())
        .some((single) => single.length > 0 && !single.startsWith('.landing-scope'))
    )
    expect(unscoped).toEqual([])
  })
})
