/**
 * LocationPicker.test.tsx — pin position resolution logic + wiring.
 *
 * MapLibre needs a real WebGL canvas we don't have in happy-dom, so
 * `react-map-gl/maplibre` is mocked with lightweight stand-ins that expose
 * the props we care about (marker position, draggable, click/drag handlers).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

const mapMock = vi.fn();
const markerMock = vi.fn();

vi.mock('react-map-gl/maplibre', () => ({
  __esModule: true,
  default: (props: any) => {
    mapMock(props);
    return (
      <div
        data-testid="mock-map"
        onClick={() => props.onClick?.({ lngLat: { lat: 4.7, lng: -74.05 } })}
      >
        {props.children}
      </div>
    );
  },
  Marker: (props: any) => {
    markerMock(props);
    return (
      <div
        data-testid="mock-marker"
        data-lat={props.latitude}
        data-lng={props.longitude}
        data-draggable={String(props.draggable)}
        onDragEnd={() => props.onDragEnd?.({ lngLat: { lat: 5.0, lng: -75.0 } })}
      />
    );
  },
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

import { LocationPicker, resolveInitialPinPosition } from './LocationPicker';

describe('resolveInitialPinPosition', () => {
  it('prefers the given value over city/country', () => {
    expect(resolveInitialPinPosition({ lat: 1, lng: 2 }, 'Bogotá')).toEqual({ lat: 1, lng: 2 });
  });

  it('falls back to the city center when there is no value', () => {
    expect(resolveInitialPinPosition(null, 'Medellín')).toEqual({ lat: 6.2442, lng: -75.5812 });
  });

  it('falls back to the country center when there is no value nor city', () => {
    expect(resolveInitialPinPosition(null, undefined)).toEqual({ lat: 4.5709, lng: -74.2973 });
  });

  it('falls back to the country center for an unknown city', () => {
    expect(resolveInitialPinPosition(null, 'Ciudad Inexistente')).toEqual({ lat: 4.5709, lng: -74.2973 });
  });

  it('is accent-insensitive when matching the city', () => {
    expect(resolveInitialPinPosition(null, 'Bogota')).toEqual({ lat: 4.711, lng: -74.0721 });
  });
});

describe('<LocationPicker>', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mapMock.mockClear();
    markerMock.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders the marker at the resolved initial position (city center) when there is no value', () => {
    act(() => {
      root.render(<LocationPicker value={null} city="Cali" onChange={vi.fn()} />);
    });
    const marker = container.querySelector('[data-testid="mock-marker"]')!;
    expect(marker.getAttribute('data-lat')).toBe('3.4516');
    expect(marker.getAttribute('data-lng')).toBe('-76.532');
    expect(marker.getAttribute('data-draggable')).toBe('true');
  });

  it('renders the marker at the given value when present', () => {
    act(() => {
      root.render(<LocationPicker value={{ lat: 4.6, lng: -74.0 }} onChange={vi.fn()} />);
    });
    const marker = container.querySelector('[data-testid="mock-marker"]')!;
    expect(marker.getAttribute('data-lat')).toBe('4.6');
    expect(marker.getAttribute('data-lng')).toBe('-74');
  });

  it('calls onChange with the dragged coordinates', () => {
    const onChange = vi.fn();
    act(() => {
      root.render(<LocationPicker value={{ lat: 4.6, lng: -74.0 }} onChange={onChange} />);
    });
    const marker = container.querySelector('[data-testid="mock-marker"]') as HTMLElement;
    act(() => {
      marker.dispatchEvent(new Event('dragend', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith({ lat: 5.0, lng: -75.0 });
  });

  it('calls onChange with the clicked coordinates', () => {
    const onChange = vi.fn();
    act(() => {
      root.render(<LocationPicker value={null} onChange={onChange} />);
    });
    const map = container.querySelector('[data-testid="mock-map"]') as HTMLElement;
    act(() => {
      map.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith({ lat: 4.7, lng: -74.05 });
  });

  it('renders a visible textual instruction for dragging/clicking the pin', () => {
    act(() => {
      root.render(<LocationPicker value={null} onChange={vi.fn()} />);
    });
    expect(container.textContent).toContain('Arrastrá el marcador');
  });
});
