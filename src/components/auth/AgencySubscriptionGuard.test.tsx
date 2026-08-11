/**
 * AgencySubscriptionGuard.test.tsx — contrato 29 · planes dinámicos.
 *
 * Access is governed by CAPS, not paid-vs-free: any agency with an active plan
 * (INCLUDING the free/default plan) is admitted (hasPanelAccess=true →
 * passthrough); only a SUSPENDED/CANCELLED subscription is bounced to /upgrade.
 * The guard stays fail-OPEN on any indeterminate state.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

const mockUseAgencySubscription = vi.fn();
const mockUseAuth = vi.fn();
const mockReplace = vi.fn();
let mockPathname = '/panel/inmobiliaria/dashboard';

vi.mock('@/lib/hooks/useAgencySubscription', () => ({
  useAgencySubscription: () => mockUseAgencySubscription(),
}));
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

import { AgencySubscriptionGuard } from './AgencySubscriptionGuard';

let container: HTMLDivElement;
let root: Root;

function render() {
  act(() => {
    root.render(
      React.createElement(
        AgencySubscriptionGuard,
        null,
        React.createElement('div', { 'data-testid': 'child' }, 'panel'),
      ),
    );
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  mockPathname = '/panel/inmobiliaria/dashboard';
  mockUseAuth.mockReturnValue({ agencyRole: 'ADMIN' });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe('<AgencySubscriptionGuard>', () => {
  it('admits an ACTIVE agency on the free/default plan (no redirect)', () => {
    mockUseAgencySubscription.mockReturnValue({ hasPanelAccess: true, indeterminate: false });
    render();
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('bounces a suspended/cancelled admin to /upgrade', () => {
    mockUseAgencySubscription.mockReturnValue({ hasPanelAccess: false, indeterminate: false });
    render();
    expect(container.querySelector('[data-testid="child"]')).toBeFalsy();
    expect(mockReplace).toHaveBeenCalledWith('/panel/inmobiliaria/upgrade');
  });

  it('fails OPEN while the verdict is indeterminate (loading/error)', () => {
    mockUseAgencySubscription.mockReturnValue({ hasPanelAccess: false, indeterminate: true });
    render();
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect on exempt routes even when blocked', () => {
    mockPathname = '/panel/inmobiliaria/upgrade';
    mockUseAgencySubscription.mockReturnValue({ hasPanelAccess: false, indeterminate: false });
    render();
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
