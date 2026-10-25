import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Switch } from './switch';
import { Checkbox } from './checkbox';

// T-0173 WU-6: touch targets of the small form controls. jsdom has no layout,
// so these check the contract: on coarse pointers the control carries the
// `hit-area-44` utility (a 44 px ::after hit area; the drawn control keeps its
// size), and the utility exists in globals.css and is touch-only.
describe('small form controls expose a 44 px hit area on touch', () => {
  it('Switch', () => {
    const html = renderToStaticMarkup(<Switch aria-label="x" />);
    expect(html).toContain('hit-area-44');
    expect(html).toMatch(/class="[^"]*relative/);
  });

  it('Checkbox', () => {
    const html = renderToStaticMarkup(<Checkbox aria-label="x" />);
    expect(html).toContain('hit-area-44');
    expect(html).toMatch(/class="[^"]*relative/);
  });

  it('the utility is defined inside a coarse-pointer media query', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const i = css.indexOf('.hit-area-44');
    expect(i).toBeGreaterThan(-1);
    const before = css.slice(Math.max(0, i - 200), i);
    expect(before).toContain('@media (pointer: coarse)');
  });
});

// Cadence Chip and Tabs triggers are not editable from front, so globals.css
// raises them on coarse pointers only. Chip is a `role=checkbox` button that,
// unlike the Radix Checkbox, has no `data-state`.
describe('cadence chips and tabs get a 44 px height on touch via globals.css', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
  const rule = (selector: string) => {
    const i = css.indexOf(selector);
    expect(i, `${selector} missing`).toBeGreaterThan(-1);
    expect(css.slice(Math.max(0, i - 400), i)).toContain('@media (pointer: coarse)');
    expect(css.slice(i, i + 200)).toContain('min-height: 44px');
  };

  it('Chip (role=checkbox without data-state)', () => {
    rule('button[role="checkbox"][aria-checked]:not([data-state])');
  });

  it('underline Tabs triggers', () => {
    rule('[role="tab"][data-variant="underline"]');
  });
});

// T-0173 WU-12: an edge-anchored control must never grow its hit area OUTWARD.
// The tab-strip scroll chevrons are 26 px wide, 4 px from the viewport edge;
// a centred 44 px ::after stuck out 7 px and widened the page to 366 px on a
// 360 px phone. They use the inward-only variants instead.
describe('edge-anchored hit areas grow inward only', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
  const bar = readFileSync(join(process.cwd(), 'src/components/inmobiliaria/BarraDePestanas.tsx'), 'utf8');

  it('defines inward variants anchored to one edge, inside the coarse query', () => {
    expect(css).toMatch(/\.hit-area-44-start::after\s*\{[^}]*left:\s*0/);
    expect(css).toMatch(/\.hit-area-44-end::after\s*\{[^}]*right:\s*0/);
    const first = css.indexOf('.hit-area-44-start::after');
    expect(css.slice(Math.max(0, first - 400), first)).toContain('@media (pointer: coarse)');
  });

  it('the strip chevrons use them and never the centred utility', () => {
    expect(bar).toContain('hit-area-44-start');
    expect(bar).toContain('hit-area-44-end');
    expect(bar).not.toMatch(/hit-area-44(?![-\w])/);
  });
});
