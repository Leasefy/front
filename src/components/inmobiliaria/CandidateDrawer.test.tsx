/**
 * PreScoringStudyPanel — T-0024 (prescoring-result-reuse), WU-2
 *
 * Contract: `.orchestration/tasks/T-0024-prescoring-result-reuse/contract.md` §3.2.
 * Four states, none of which may render a blank panel:
 *  1. `preScoringStudy` is null/absent → an honest "no study" state.
 *  2. Full result → ceiling + per-carrier rows.
 *  3. Ceiling only (`carriers: []`) → ceiling renders clearly, NOT the "no study" state.
 *  4. `status: 'EXPIRED'` → still shown, labeled, not treated as void.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { PreScoringStudyPanel } from './CandidateDrawer';
import type { PreScoringStudy } from '@/lib/api/applications.types';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function render(study: PreScoringStudy | null | undefined) {
  act(() => {
    root.render(<PreScoringStudyPanel study={study} />);
  });
}

describe('<PreScoringStudyPanel>', () => {
  it('renders an honest "no study" state when preScoringStudy is null', () => {
    render(null);
    expect(container.querySelector('[data-testid="prescoring-panel-empty"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="prescoring-panel-full"]')).toBeFalsy();
  });

  it('renders an honest "no study" state when preScoringStudy is undefined (older backend)', () => {
    render(undefined);
    expect(container.querySelector('[data-testid="prescoring-panel-empty"]')).toBeTruthy();
  });

  it('renders the ceiling, carriers and completion date for a full result', () => {
    render({
      status: 'COMPLETED',
      completedAt: '2026-08-01T00:00:00.000Z',
      maxAsegurableCop: 3_000_000,
      carriers: [
        { name: 'Sura', maxAsegurableCop: 3_000_000, viable: true },
        { name: 'Bolivar', maxAsegurableCop: 2_000_000, viable: false },
      ],
    });
    const panel = container.querySelector('[data-testid="prescoring-panel-full"]');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain('3.000.000');
    const rows = container.querySelectorAll('[data-testid="prescoring-carrier-row"]');
    expect(rows.length).toBe(2);
    expect(container.querySelector('[data-testid="prescoring-ceiling-only-note"]')).toBeFalsy();
    // Color must not be the only signal for viability — text pairs with it.
    expect(panel?.textContent).toContain('Viable');
    expect(panel?.textContent).toContain('No viable');
  });

  it('renders the ceiling alone, without the "no study" empty state, when carriers is empty', () => {
    render({
      status: 'COMPLETED',
      completedAt: null,
      maxAsegurableCop: 4_500_000,
      carriers: [],
    });
    expect(container.querySelector('[data-testid="prescoring-panel-empty"]')).toBeFalsy();
    const panel = container.querySelector('[data-testid="prescoring-panel-full"]');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain('4.500.000');
    expect(container.querySelector('[data-testid="prescoring-ceiling-only-note"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="prescoring-carrier-row"]').length).toBe(0);
  });

  it('still renders the result for an EXPIRED study, labeled as still valid — never blank', () => {
    render({
      status: 'EXPIRED',
      completedAt: '2026-01-01T00:00:00.000Z',
      maxAsegurableCop: 2_800_000,
      carriers: [{ name: 'Sura', maxAsegurableCop: 2_800_000, viable: true }],
    });
    const badge = container.querySelector('[data-testid="prescoring-expired-badge"]');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toMatch(/venci/i);
    // Still shows the actual result, not a blank/void panel
    expect(container.querySelector('[data-testid="prescoring-panel-empty"]')).toBeFalsy();
    expect(container.querySelectorAll('[data-testid="prescoring-carrier-row"]').length).toBe(1);
    expect(container.querySelector('[data-testid="prescoring-panel-full"]')?.textContent).toContain('2.800.000');
  });

  it('never renders "$0" for a carrier with a null ceiling — reads as no coverage instead', () => {
    render({
      status: 'COMPLETED',
      completedAt: '2026-08-01T00:00:00.000Z',
      maxAsegurableCop: 3_000_000,
      carriers: [
        { name: 'Sura', maxAsegurableCop: 3_000_000, viable: true },
        // The back legitimately emits null for a carrier that will not back
        // the tenant (contract §3.1/§9 amendment 2) — never a real 0.
        { name: 'Bolivar', maxAsegurableCop: null, viable: false },
      ],
    });
    const panel = container.querySelector('[data-testid="prescoring-panel-full"]');
    expect(panel).toBeTruthy();

    const rows = container.querySelectorAll('[data-testid="prescoring-carrier-row"]');
    expect(rows.length).toBe(2);

    // Nowhere in the panel does the null ceiling render as a currency figure.
    expect(panel?.textContent).not.toContain('$ 0');
    expect(panel?.textContent).not.toContain('$0');

    const noCover = container.querySelector('[data-testid="prescoring-carrier-no-cover"]');
    expect(noCover).toBeTruthy();
    expect(noCover?.textContent).toMatch(/sin cobertura/i);

    // The carrier WITH a real ceiling still renders its currency figure normally.
    expect(panel?.textContent).toContain('3.000.000');
  });
});
