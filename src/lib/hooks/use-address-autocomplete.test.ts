/**
 * use-address-autocomplete.test.ts — debounce (350ms) + min-length (3 chars)
 * gate + AbortController cancellation for the address autocomplete hook.
 *
 * Pattern mirrors use-agent-work-items.test.ts (stale-response race) and
 * useFederatedSearch (debounce + abort), both already established in the repo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

vi.mock('@/lib/api/geocode.service', () => ({
  geocodeApi: { autocomplete: vi.fn() },
}));

import { geocodeApi } from '@/lib/api/geocode.service';
import { useAddressAutocomplete } from './use-address-autocomplete';

const autocompleteMock = geocodeApi.autocomplete as unknown as ReturnType<typeof vi.fn>;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  autocompleteMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function TestHarness({ query, onResult }: { query: string; onResult: (r: ReturnType<typeof useAddressAutocomplete>) => void }) {
  const result = useAddressAutocomplete(query);
  onResult(result);
  return null;
}

function renderHook(query: string) {
  let latest!: ReturnType<typeof useAddressAutocomplete>;
  act(() => {
    root.render(React.createElement(TestHarness, { query, onResult: (r) => { latest = r; } }));
  });
  return {
    get current() {
      return latest;
    },
    rerender(nextQuery: string) {
      act(() => {
        root.render(React.createElement(TestHarness, { query: nextQuery, onResult: (r) => { latest = r; } }));
      });
    },
  };
}

describe('useAddressAutocomplete', () => {
  it('does not call the geocode API when the query is under 3 characters', () => {
    const hook = renderHook('Ca');
    act(() => { vi.advanceTimersByTime(1000); });

    expect(autocompleteMock).not.toHaveBeenCalled();
    expect(hook.current.suggestions).toEqual([]);
    expect(hook.current.isLoading).toBe(false);
  });

  it('debounces: only fires once, 350ms after the query settles', () => {
    autocompleteMock.mockResolvedValue([]);
    const hook = renderHook('Cal');

    act(() => { vi.advanceTimersByTime(100); });
    hook.rerender('Calle');
    act(() => { vi.advanceTimersByTime(100); });
    hook.rerender('Calle 1');
    act(() => { vi.advanceTimersByTime(349); });
    expect(autocompleteMock).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(autocompleteMock).toHaveBeenCalledTimes(1);
    expect(autocompleteMock).toHaveBeenCalledWith('Calle 1', expect.any(AbortSignal));
  });

  it('sets isLoading while the request is in flight and populates suggestions on success', async () => {
    let resolveFn!: (value: unknown[]) => void;
    autocompleteMock.mockReturnValue(new Promise((resolve) => { resolveFn = resolve; }));

    const hook = renderHook('Calle 123');
    act(() => { vi.advanceTimersByTime(350); });
    expect(hook.current.isLoading).toBe(true);

    const suggestions = [{ label: 'Calle 123', lat: 1, lon: 2, placeId: '1' }];
    await act(async () => {
      resolveFn(suggestions);
      await Promise.resolve();
    });

    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.suggestions).toEqual(suggestions);
    expect(hook.current.error).toBeNull();
  });

  it('aborts the in-flight request when the query changes before the debounce settles again', () => {
    autocompleteMock.mockResolvedValue([]);
    const hook = renderHook('Calle 123');
    act(() => { vi.advanceTimersByTime(350); });

    const firstSignal = autocompleteMock.mock.calls[0][1] as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    hook.rerender('Calle 1234');
    act(() => { vi.advanceTimersByTime(350); });

    expect(firstSignal.aborted).toBe(true);
    expect(autocompleteMock).toHaveBeenCalledTimes(2);
  });

  it('sets an error message when the request fails for a reason other than abort', async () => {
    autocompleteMock.mockRejectedValue(new Error('geocoding_upstream_error'));
    const hook = renderHook('Calle 123');
    act(() => { vi.advanceTimersByTime(350); });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hook.current.error).toBe('geocoding_upstream_error');
    expect(hook.current.suggestions).toEqual([]);
    expect(hook.current.isLoading).toBe(false);
  });

  it('does not surface an AbortError as an error state', async () => {
    autocompleteMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    autocompleteMock.mockResolvedValueOnce([{ label: 'Calle 1234', lat: 1, lon: 2, placeId: '2' }]);

    const hook = renderHook('Calle 123');
    act(() => { vi.advanceTimersByTime(350); });
    hook.rerender('Calle 1234');
    act(() => { vi.advanceTimersByTime(350); });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hook.current.error).toBeNull();
  });

  it('clears suggestions and aborts in-flight requests when the query drops below the minimum length', () => {
    autocompleteMock.mockResolvedValue([{ label: 'Calle 123', lat: 1, lon: 2, placeId: '1' }]);
    const hook = renderHook('Calle 123');
    act(() => { vi.advanceTimersByTime(350); });
    const firstSignal = autocompleteMock.mock.calls[0][1] as AbortSignal;

    hook.rerender('Ca');
    expect(hook.current.suggestions).toEqual([]);
    expect(firstSignal.aborted).toBe(true);
  });
});
