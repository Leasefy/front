import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const props: Record<string, unknown>[] = [];
vi.mock('@leasefy/cadence', () => ({
  Toaster: (p: Record<string, unknown>) => {
    props.push(p);
    return null;
  },
}));

import { Toaster } from './toast';

describe('Toaster shim', () => {
  it('keeps phone toasts below the sticky 4rem header so they never cover its controls', () => {
    renderToStaticMarkup(<Toaster />);
    const p = props[props.length - 1];
    const mobile = p.mobileOffset as { top: string };
    expect(mobile.top).toContain('4rem');
    expect(mobile.top).toContain('safe-area-inset-top');
  });

  it('lets a caller override the mobile offset', () => {
    renderToStaticMarkup(<Toaster mobileOffset={{ top: 10 }} />);
    expect((props[props.length - 1].mobileOffset as { top: number }).top).toBe(10);
  });

  it('keeps desktop toasts below the sticky header so they never cover the right cluster', () => {
    renderToStaticMarkup(<Toaster />);
    const offset = props[props.length - 1].offset as { top: string };
    expect(offset.top).toContain('4rem');
  });

  it('lets a caller override the desktop offset', () => {
    renderToStaticMarkup(<Toaster offset={{ top: 10 }} />);
    expect((props[props.length - 1].offset as { top: number }).top).toBe(10);
  });
});
