/**
 * ConsignacionHeader.test.tsx — property thumbnail.
 *
 * T-0022 WU-1: `consignacion.propertyThumbnail` is never populated by the
 * back (see ledger §2.1) — the real photos live on the `Property` entity and
 * reach this component through a new `propertyThumbnailUrl` prop, resolved
 * by the page from `useProperty(consignacion.propertyId)`. These tests lock
 * the three honest states (has photo / zero photos / prop not passed yet).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    formatDate: (d: string) => d,
  }),
}));

import { ConsignacionHeader } from './ConsignacionHeader';

const BASE_CONSIGNACION: Consignacion = {
  id: 'c1',
  propertyId: 'prop-1',
  propietarioId: 'own-1',
  agenteId: 'agent-1',
  propertyTitle: 'Apto Chapinero',
  propertyAddress: 'Cra 1 # 2-3',
  propertyCity: 'Bogotá',
  propertyZone: 'Chapinero',
  propertyType: 'apartment',
  monthlyRent: 2000000,
  commissionPercent: 10,
  contractDate: '2026-01-01',
  status: 'active',
  availability: 'available',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
  vi.restoreAllMocks();
});

function render(props: Partial<React.ComponentProps<typeof ConsignacionHeader>> = {}) {
  act(() => {
    root.render(<ConsignacionHeader consignacion={BASE_CONSIGNACION} {...props} />);
  });
}

describe('<ConsignacionHeader> — property thumbnail', () => {
  it('shows the placeholder icon when no photo is available yet', () => {
    render();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the property photo when propertyThumbnailUrl is provided', () => {
    render({ propertyThumbnailUrl: 'https://cdn.test/foto.jpg' });
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://cdn.test/foto.jpg');
  });

  it('falls back to the placeholder when the property has zero photos', () => {
    render({ propertyThumbnailUrl: '' });
    expect(container.querySelector('img')).toBeNull();
  });
});
