/**
 * DocumentReviewQueueView.test.tsx — presentational behavior of the queue:
 * counters, grouping, per-status action buttons, permission gating, callbacks.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type {
  ReviewQueueCounts,
  ReviewQueueItem,
} from '@/lib/api/document-review.types';
import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => React.createElement('button', { onClick, disabled }, children),
  Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
  EmptyState: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' }, title),
  ErrorState: ({ title, onRetry }: { title: string; onRetry?: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'error-state' },
      title,
      onRetry
        ? React.createElement('button', { 'data-testid': 'retry', onClick: onRetry }, 'retry')
        : null,
    ),
}));

import { DocumentReviewQueueView } from './DocumentReviewQueueView';

const COUNTS: ReviewQueueCounts = {
  total: 3,
  pending: 1,
  inReview: 1,
  approved: 1,
  rejected: 0,
};

const ITEMS: ReviewQueueItem[] = [
  {
    applicationId: 'app-1',
    tenant: { id: 'ten-1', title: 'Juan Pérez' },
    documents: [
      {
        id: 'doc-pending',
        type: 'ID_DOCUMENT',
        originalName: 'cedula.pdf',
        size: 20000,
        reviewStatus: 'PENDING',
      },
      {
        id: 'doc-approved',
        type: 'BANK_STATEMENT',
        originalName: 'extracto.pdf',
        size: 40000,
        reviewStatus: 'APPROVED',
      },
    ],
  },
];

let container: HTMLDivElement;
let root: Root;

const baseProps = () => ({
  counts: COUNTS,
  items: ITEMS,
  isLoading: false,
  error: null as string | null,
  canReview: true,
  pendingDocId: null as string | null,
  onTakeToReview: vi.fn(),
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onRetry: vi.fn(),
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render(props: React.ComponentProps<typeof DocumentReviewQueueView>) {
  act(() => root.render(<DocumentReviewQueueView {...props} />));
}

function buttonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;
}

describe('<DocumentReviewQueueView>', () => {
  it('renders the five counters from counts', () => {
    render(baseProps());
    expect(container.querySelector('[data-testid="count-total"]')?.textContent).toContain('3');
    expect(container.querySelector('[data-testid="count-approved"]')?.textContent).toContain('1');
    expect(container.querySelector('[data-testid="count-rejected"]')?.textContent).toContain('0');
  });

  it('groups documents per tenant and lists each doc', () => {
    render(baseProps());
    expect(container.querySelectorAll('[data-testid="review-group"]').length).toBe(1);
    expect(container.querySelectorAll('[data-testid="review-doc"]').length).toBe(2);
    expect(container.textContent).toContain('Juan Pérez');
    expect(container.textContent).toContain('cedula.pdf');
  });

  it('shows contextual actions per status when the user can review', () => {
    render(baseProps());
    // PENDING doc → Tomar a revisión + Aprobar + Rechazar
    expect(buttonByText('Tomar a revisión')).toBeTruthy();
    // APPROVED doc → no "Aprobar" duplicate for it, but a Rechazar exists
    expect(buttonByText('Rechazar')).toBeTruthy();
  });

  it('hides all action buttons when the user cannot review', () => {
    render({ ...baseProps(), canReview: false });
    expect(buttonByText('Tomar a revisión')).toBeUndefined();
    expect(buttonByText('Aprobar')).toBeUndefined();
    expect(buttonByText('Rechazar')).toBeUndefined();
  });

  it('calls onApprove with ids when Aprobar is clicked', () => {
    const props = baseProps();
    render(props);
    act(() => buttonByText('Aprobar')!.click());
    expect(props.onApprove).toHaveBeenCalledWith('app-1', 'doc-pending');
  });

  it('calls onReject with the item + doc when Rechazar is clicked', () => {
    const props = baseProps();
    render(props);
    act(() => buttonByText('Rechazar')!.click());
    expect(props.onReject).toHaveBeenCalledTimes(1);
    const [item, doc] = props.onReject.mock.calls[0];
    expect(item.applicationId).toBe('app-1');
    expect(doc.id).toBe('doc-pending');
  });

  it('sin soportes: dice que todavía no llegó nada y ofrece dónde mirar', () => {
    // Acá no hay filtros, así que el vacío es siempre «no llegó nada», nunca
    // «buscaste mal». Y no se crea desde acá —los soportes los adjunta el
    // candidato—, así que la salida útil es ver las postulaciones.
    render({ ...baseProps(), items: [] });
    const vacio = container.querySelector('[data-testid="sin-datos"]');
    expect(vacio).toBeTruthy();
    expect(vacio?.getAttribute('data-caso')).toBe('vacio');
    expect(container.querySelector('a[href="/panel/inmobiliaria/postulaciones"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull();
  });

  it('renders the error state and wires retry', () => {
    const props = { ...baseProps(), error: new ApiError(500, 'boom') };
    render(props);
    const error = container.querySelector('[data-testid="fallo-de-carga"]');
    expect(error).toBeTruthy();
    act(() => (container.querySelector('[data-testid="reintentar"]') as HTMLButtonElement).click());
    expect(props.onRetry).toHaveBeenCalled();
  });

  it('un 404 no ofrece reintentar: el error entero llega hasta el cartel', () => {
    // Con `error: string` esto era imposible: sin el status, todo caía en
    // «fue un problema nuestro, probá de nuevo» — incluso sobre algo que no
    // existe y por más que reintentes nunca va a aparecer.
    render({ ...baseProps(), error: new ApiError(404, 'not found') });
    expect(
      container.querySelector('[data-testid="fallo-de-carga"]')?.getAttribute('data-tipo'),
    ).toBe('noExiste');
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull();
  });

  it('con la consulta caída los contadores no muestran ceros', () => {
    // Cinco tarjetas en 0 sobre un dato que nadie trajo tranquilizan con una
    // afirmación falsa: «no tenés nada pendiente».
    render({ ...baseProps(), error: new ApiError(500, 'boom') });
    expect(container.querySelector('[data-testid="count-pending"]')?.textContent).toContain('—');
  });
});
