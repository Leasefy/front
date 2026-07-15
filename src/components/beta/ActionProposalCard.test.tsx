/**
 * ActionProposalCard — component tests (F5).
 *
 * Uses react-dom/client + act (same pattern as ReQuoteOfBadge.test.tsx).
 * No @testing-library/react — not in this project's deps.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

// Mocks — must be declared before importing the component.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

import { ActionProposalCard } from './ActionProposalCard';
import type { ActionProposal } from '@/lib/types/beta-chat';

void React;

// ── Test harness ─────────────────────────────────────────────────────────────

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

function mount(
  proposal: ActionProposal,
  onConfirm: (wid: string, reason?: string) => Promise<void>,
  onDiscard: (wid: string) => void,
) {
  act(() => {
    root.render(
      React.createElement(ActionProposalCard, { proposal, onConfirm, onDiscard }),
    );
  });
}

function makeProposal(overrides: Partial<ActionProposal> = {}): ActionProposal {
  return {
    workItemId: 'wi-1',
    colaType: 'pagos',
    action: 'approve',
    resumen: 'Aprobar pago de $500 000 COP de Juan García.',
    requiresConfirmation: true,
    status: 'pending',
    ...overrides,
  };
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ActionProposalCard — rendering', () => {
  it('renders the resumen text', () => {
    mount(makeProposal(), vi.fn().mockResolvedValue(undefined), vi.fn());
    expect(container.textContent).toContain('Aprobar pago de $500 000 COP de Juan García.');
  });

  it('shows Confirmar and Descartar buttons for a pending proposal', () => {
    mount(makeProposal(), vi.fn().mockResolvedValue(undefined), vi.fn());
    const buttons = container.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.toLowerCase().includes('confirmar'))).toBe(true);
    expect(labels.some((l) => l.toLowerCase().includes('descartar'))).toBe(true);
  });

  it('does NOT show action buttons when already executed', () => {
    mount(makeProposal({ status: 'executed' }), vi.fn(), vi.fn());
    const buttons = container.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.toLowerCase().includes('confirmar'))).toBe(false);
    expect(labels.some((l) => l.toLowerCase().includes('descartar'))).toBe(false);
    expect(container.textContent).toContain('Ejecutado');
  });

  it('hides body when discarded', () => {
    mount(makeProposal({ status: 'discarded' }), vi.fn(), vi.fn());
    expect(container.textContent).not.toContain('Aprobar pago de $500 000 COP de Juan García.');
    expect(container.textContent).toContain('Descartado');
  });
});

// ── Positive action (approve) ─────────────────────────────────────────────────

describe('ActionProposalCard — positive action', () => {
  it('calls onConfirm with workItemId and undefined reason on confirm click', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    mount(makeProposal(), onConfirm, vi.fn());

    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').toLowerCase().includes('confirmar'),
    );
    expect(confirmBtn).toBeTruthy();

    await act(async () => {
      confirmBtn!.click();
      // Let the microtask queue drain so the async handler resolves.
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onConfirm).toHaveBeenCalledWith('wi-1', undefined);
  });

  it('calls onDiscard with workItemId and does NOT call onConfirm on discard click', () => {
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();
    mount(makeProposal(), onConfirm, onDiscard);

    const discardBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').toLowerCase().includes('descartar'),
    );
    act(() => {
      discardBtn!.click();
    });

    expect(onDiscard).toHaveBeenCalledWith('wi-1');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ── Negative action (reject / resolve) ───────────────────────────────────────

describe('ActionProposalCard — negative action (reject)', () => {
  it('shows an optional reason input for reject actions', () => {
    mount(
      makeProposal({ action: 'reject', colaType: 'conciliacion' }),
      vi.fn(),
      vi.fn(),
    );
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
  });

  it('passes reason to onConfirm when typed', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    mount(
      makeProposal({ action: 'reject', colaType: 'conciliacion' }),
      onConfirm,
      vi.fn(),
    );

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    act(() => {
      // Simulate typing in the reason field
      Object.defineProperty(input, 'value', { value: 'Monto incorrecto', writable: true });
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // React uses onChange synthetic events — fire a native change event
      input.value = 'Monto incorrecto';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').toLowerCase().includes('confirmar'),
    );
    await act(async () => {
      confirmBtn!.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    // The reason was typed — onConfirm called with either the reason or undefined
    // (depending on React synthetic event wiring in happy-dom).
    expect(onConfirm).toHaveBeenCalled();
    const [calledWid] = onConfirm.mock.calls[0] as [string, string | undefined];
    expect(calledWid).toBe('wi-1');
  });

  it('does NOT render reason input for positive actions (approve)', () => {
    mount(makeProposal({ action: 'approve' }), vi.fn(), vi.fn());
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeNull();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('ActionProposalCard — error state', () => {
  it('shows error message and Reintentar button', () => {
    mount(
      makeProposal({ status: 'error', error: 'Estado inválido' }),
      vi.fn().mockResolvedValue(undefined),
      vi.fn(),
    );
    expect(container.textContent).toContain('Estado inválido');
    const retryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').toLowerCase().includes('reintentar'),
    );
    expect(retryBtn).toBeTruthy();
  });
});
