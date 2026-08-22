/**
 * use-reverse-geocode.test.ts — debounce (350ms) + AbortController
 * cancellation for the map-click/drag reverse-geocode hook. Same
 * debounce/abort shape as use-address-autocomplete.test.ts, but the trigger
 * is an imperative call (`reverseGeocode(lat, lng)`) instead of a reactive
 * query prop, since it's driven by map interactions, not typing.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

vi.mock('@/lib/api/geocode.service', () => ({
  geocodeApi: { reverse: vi.fn() },
}));

import { geocodeApi, type GeocodeSuggestion } from '@/lib/api/geocode.service';
import { useReverseGeocode } from './use-reverse-geocode';

const reverseMock = geocodeApi.reverse as unknown as ReturnType<typeof vi.fn>;

type OnResult = (result: GeocodeSuggestion | null, coords: { lat: number; lng: number }) => void;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  reverseMock.mockReset();
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

function TestHarness({
  onResult,
  onHook,
}: {
  onResult: OnResult;
  onHook: (r: ReturnType<typeof useReverseGeocode>) => void;
}) {
  const hook = useReverseGeocode(onResult);
  onHook(hook);
  return null;
}

function renderHook(onResultMock: OnResult) {
  let latest!: ReturnType<typeof useReverseGeocode>;
  act(() => {
    root.render(React.createElement(TestHarness, { onResult: onResultMock, onHook: (r) => { latest = r; } }));
  });
  return {
    get current() {
      return latest;
    },
  };
}

describe('useReverseGeocode', () => {
  it('does not call the geocode API until the debounce settles', () => {
    reverseMock.mockResolvedValue(null);
    const onResult = vi.fn();
    const hook = renderHook(onResult);

    act(() => { hook.current.reverseGeocode(4.6, -74.0); });
    act(() => { vi.advanceTimersByTime(349); });
    expect(reverseMock).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(reverseMock).toHaveBeenCalledTimes(1);
    expect(reverseMock).toHaveBeenCalledWith(4.6, -74.0, expect.any(AbortSignal));
  });

  it('debounces rapid successive calls (e.g. two quick clicks) into a single request', () => {
    reverseMock.mockResolvedValue(null);
    const onResult = vi.fn();
    const hook = renderHook(onResult);

    act(() => { hook.current.reverseGeocode(1, 1); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { hook.current.reverseGeocode(2, 2); });
    act(() => { vi.advanceTimersByTime(350); });

    expect(reverseMock).toHaveBeenCalledTimes(1);
    expect(reverseMock).toHaveBeenCalledWith(2, 2, expect.any(AbortSignal));
  });

  it('calls onResult with the resolved suggestion and the ORIGINAL coords echoed back', async () => {
    const suggestion = { label: 'Calle 123', lat: 4.6, lon: -74.0, placeId: '1' };
    reverseMock.mockResolvedValue(suggestion);
    const onResult = vi.fn();
    const hook = renderHook(onResult);

    act(() => { hook.current.reverseGeocode(4.6, -74.0); });
    act(() => { vi.advanceTimersByTime(350); });
    await act(async () => { await Promise.resolve(); });

    expect(onResult).toHaveBeenCalledWith(suggestion, { lat: 4.6, lng: -74.0 });
  });

  it('calls onResult with null when LocationIQ has no address for these coordinates', async () => {
    reverseMock.mockResolvedValue(null);
    const onResult = vi.fn();
    const hook = renderHook(onResult);

    act(() => { hook.current.reverseGeocode(0, 0); });
    act(() => { vi.advanceTimersByTime(350); });
    await act(async () => { await Promise.resolve(); });

    expect(onResult).toHaveBeenCalledWith(null, { lat: 0, lng: 0 });
  });

  it('aborts the in-flight request when a new call arrives before it resolves', () => {
    reverseMock.mockResolvedValue(null);
    const onResult = vi.fn();
    const hook = renderHook(onResult);

    act(() => { hook.current.reverseGeocode(1, 1); });
    act(() => { vi.advanceTimersByTime(350); });
    const firstSignal = reverseMock.mock.calls[0][2] as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    act(() => { hook.current.reverseGeocode(2, 2); });
    act(() => { vi.advanceTimersByTime(350); });

    expect(firstSignal.aborted).toBe(true);
    expect(reverseMock).toHaveBeenCalledTimes(2);
  });

  it('swallows a non-abort failure — never calls onResult, fail-closed', async () => {
    reverseMock.mockRejectedValue(new Error('geocoding_upstream_error'));
    const onResult = vi.fn();
    const hook = renderHook(onResult);

    act(() => { hook.current.reverseGeocode(4.6, -74.0); });
    act(() => { vi.advanceTimersByTime(350); });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onResult).not.toHaveBeenCalled();
  });

  it('does not call onResult for an aborted request', async () => {
    reverseMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    reverseMock.mockResolvedValueOnce({ label: 'X', lat: 2, lon: 2, placeId: '2' });
    const onResult = vi.fn();
    const hook = renderHook(onResult);

    act(() => { hook.current.reverseGeocode(1, 1); });
    act(() => { vi.advanceTimersByTime(350); });
    act(() => { hook.current.reverseGeocode(2, 2); });
    act(() => { vi.advanceTimersByTime(350); });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ label: 'X', lat: 2, lon: 2, placeId: '2' }, { lat: 2, lng: 2 });
  });
});
