/**
 * PropertyLocationField.test.tsx — wiring between AddressAutocomplete and
 * LocationPicker. Both children are mocked so this test only exercises the
 * composition logic (which fields change on select/type/drag).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

const addressAutocompleteMock = vi.fn();
const locationPickerMock = vi.fn();

vi.mock('./AddressAutocomplete', () => ({
  AddressAutocomplete: (props: any) => {
    addressAutocompleteMock(props);
    return (
      <div data-testid="mock-address-autocomplete">
        <button
          type="button"
          data-testid="fire-change-text"
          onClick={() => props.onChangeText('Nueva dirección escrita')}
        />
        <button
          type="button"
          data-testid="fire-select"
          onClick={() =>
            props.onSelect({
              address: 'Calle 123',
              city: 'Bogotá',
              neighborhood: 'Chapinero',
              latitude: 4.6,
              longitude: -74.0,
              placeId: 'abc-1',
            })
          }
        />
      </div>
    );
  },
}));

// La vuelta de «¿qué dirección es este punto?»: la prueba decide qué contesta.
const geocodificacion = vi.hoisted(() => ({ resultado: null as null | { road?: string; label?: string; placeId?: string } }))
vi.mock('@/lib/hooks/use-reverse-geocode', () => ({
  useReverseGeocode: (alResolver: (r: unknown, c: { lat: number; lng: number }) => void) => ({
    reverseGeocode: (lat: number, lng: number) => alResolver(geocodificacion.resultado, { lat, lng }),
  }),
}))

vi.mock('@/components/map/LocationPicker', () => ({
  LocationPicker: (props: any) => {
    locationPickerMock(props);
    return (
      <button
        type="button"
        data-testid="fire-pin-drag"
        onClick={() => props.onChange({ lat: 5.1, lng: -75.2 })}
      />
    );
  },
}));

import { PropertyLocationField, type PropertyLocationValue } from './PropertyLocationField';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  addressAutocompleteMock.mockClear();
  locationPickerMock.mockClear();
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

function render(props: Partial<React.ComponentProps<typeof PropertyLocationField>> = {}) {
  const onChange = (props.onChange ?? vi.fn()) as ReturnType<typeof vi.fn<(partial: PropertyLocationValue) => void>>;
  act(() => {
    root.render(
      <PropertyLocationField
        address={props.address ?? ''}
        onChange={onChange}
        {...props}
      />,
    );
  });
  return { onChange };
}

describe('<PropertyLocationField>', () => {
  it('passes value/city down to LocationPicker as null when there are no coordinates', () => {
    render({ address: '', city: 'Medellín' });
    expect(locationPickerMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: null, city: 'Medellín' }),
    );
  });

  it('passes the current coordinates down to LocationPicker as a value object', () => {
    render({ address: 'Calle 1', latitude: 4.6, longitude: -74.0 });
    expect(locationPickerMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: { lat: 4.6, lng: -74.0 } }),
    );
  });

  it('selecting an autocomplete suggestion sets address + coords with coordsSource geocoded', () => {
    const { onChange } = render({ address: '' });
    const fireSelect = container.querySelector('[data-testid="fire-select"]') as HTMLButtonElement;
    act(() => {
      fireSelect.click();
    });
    expect(onChange).toHaveBeenCalledWith({
      address: 'Calle 123',
      latitude: 4.6,
      longitude: -74.0,
      geocodePlaceId: 'abc-1',
      coordsSource: 'geocoded',
    });
  });

  it('typing free text resets any previously geocoded coordinates', () => {
    const { onChange } = render({ address: 'Calle 1', latitude: 4.6, longitude: -74.0 });
    const fireChangeText = container.querySelector('[data-testid="fire-change-text"]') as HTMLButtonElement;
    act(() => {
      fireChangeText.click();
    });
    expect(onChange).toHaveBeenCalledWith({
      address: 'Nueva dirección escrita',
      latitude: undefined,
      longitude: undefined,
      geocodePlaceId: undefined,
      coordsSource: undefined,
    });
  });

  it('dragging the pin updates coordinates and sets coordsSource geocoded, without touching the address', () => {
    const { onChange } = render({ address: 'Calle 1' });
    const firePinDrag = container.querySelector('[data-testid="fire-pin-drag"]') as HTMLButtonElement;
    act(() => {
      firePinDrag.click();
    });
    expect(onChange).toHaveBeenCalledWith({
      latitude: 5.1,
      longitude: -75.2,
      coordsSource: 'geocoded',
    });
  });

  // 🔴 27-10-2026: escribir la ciudad centra el mapa; la dirección de ese punto pisaba la escrita (o la borraba).
  it('la dirección del punto en el mapa NO pisa la que ya se escribió; sólo mueve las coordenadas', () => {
    geocodificacion.resultado = { road: 'Calle 52', label: 'Calle 52, Medellín', placeId: 'p-1' }
    const { onChange } = render({ address: 'Carrera 76 # 33-20' })
    act(() => {
      ;(container.querySelector('[data-testid="fire-pin-drag"]') as HTMLButtonElement).click()
    })
    const ultima = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(ultima).not.toHaveProperty('address')
    expect(ultima).toMatchObject({ latitude: 5.1, longitude: -75.2, geocodePlaceId: 'p-1' })
  })

  it('con la dirección vacía, el punto del mapa la llena; una respuesta sin calle nunca la deja en blanco', () => {
    geocodificacion.resultado = { road: 'Calle 52', label: 'Calle 52, Medellín', placeId: 'p-1' }
    const { onChange } = render({ address: '' })
    act(() => {
      ;(container.querySelector('[data-testid="fire-pin-drag"]') as HTMLButtonElement).click()
    })
    expect(onChange.mock.calls[onChange.mock.calls.length - 1][0]).toMatchObject({ address: 'Calle 52' })

    geocodificacion.resultado = { road: '', label: '' }
    const otra = render({ address: '' }).onChange
    act(() => {
      ;(container.querySelector('[data-testid="fire-pin-drag"]') as HTMLButtonElement).click()
    })
    expect(otra.mock.calls[otra.mock.calls.length - 1][0]).not.toHaveProperty('address')
  })
});
