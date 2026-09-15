/**
 * SubscriptionBadge.test.tsx — `AvatarSubscriptionIndicator` (the compact badge
 * shown next to the avatar in `PlanHeader`) must render for ANY tier coming
 * from the live agency catalog (contrato 29 · planes dinámicos), not just the
 * hardcoded `starter|pro|flex` keys. Style is keyed on `level`/`isDefault`,
 * never on the slug — so an admin-created tier like "pro-plus" gets a badge
 * instead of silently disappearing.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { AvatarSubscriptionIndicator } from './SubscriptionBadge';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function render(props: React.ComponentProps<typeof AvatarSubscriptionIndicator>) {
  act(() => {
    root.render(<AvatarSubscriptionIndicator {...props} />);
  });
}

describe('AvatarSubscriptionIndicator — agencyPlan (live catalog, contrato 29)', () => {
  it('renders the real plan name for an admin-created tier not in the static badge map', () => {
    render({
      variant: 'landlord',
      planId: 'pro-plus',
      agencyPlan: { name: 'Pro Plus', isDefault: false, level: 2 },
    });
    expect(container.textContent).toContain('Pro Plus');
  });

  it('renders nothing when the agency plan is the free/default plan, regardless of slug', () => {
    render({
      variant: 'landlord',
      planId: 'custom-free-slug',
      agencyPlan: { name: 'Gratis', isDefault: true, level: 0 },
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders an off-ladder (level null) plan too, e.g. a usage-based tier', () => {
    render({
      variant: 'landlord',
      planId: 'flex',
      agencyPlan: { name: 'Flex', isDefault: false, level: null },
    });
    expect(container.textContent).toContain('Flex');
  });

  it('takes priority over the static planId lookup when both are provided', () => {
    // planId 'starter' would normally hide the badge (base tier) — the live
    // catalog says otherwise (isDefault: false), so it must render.
    render({
      variant: 'landlord',
      planId: 'starter',
      agencyPlan: { name: 'Starter Plus', isDefault: false, level: 1 },
    });
    expect(container.textContent).toContain('Starter Plus');
  });
});

describe('AvatarSubscriptionIndicator — regression (no agencyPlan prop)', () => {
  it('still hides for the static starter tier', () => {
    render({ variant: 'landlord', planId: 'starter' });
    expect(container.firstChild).toBeNull();
  });

  it('still renders the static Pro badge', () => {
    render({ variant: 'landlord', planId: 'pro' });
    expect(container.textContent).toContain('Pro');
  });

  it('still renders nothing for a tenant without a pass', () => {
    render({ variant: 'tenant', tenantSubscription: 'none' });
    expect(container.firstChild).toBeNull();
  });

  it('still renders the tenant Arriendo Pass badge', () => {
    render({ variant: 'tenant', tenantSubscription: 'arriendo_pass' });
    expect(container.textContent).toContain('Pass');
  });
});
