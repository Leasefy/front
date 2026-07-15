/**
 * AddressAutocomplete.test.tsx — combobox a11y wiring + selection mapping.
 *
 * The debounce/abort hook is unit-tested separately
 * (src/lib/hooks/use-address-autocomplete.test.ts); here we mock it so the
 * component tests are deterministic and independent of timers.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

const mockHookState = {
  suggestions: [] as Array<{ label: string; lat: number; lon: number; placeId: string; city?: string; neighborhood?: string; road?: string }>,
  isLoading: false,
  error: null as string | null,
};

vi.mock('@/lib/hooks/use-address-autocomplete', () => ({
  useAddressAutocomplete: () => mockHookState,
}));

import { AddressAutocomplete } from './AddressAutocomplete';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockHookState.suggestions = [];
  mockHookState.isLoading = false;
  mockHookState.error = null;
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

function render(props: Partial<React.ComponentProps<typeof AddressAutocomplete>> = {}) {
  const onChangeText = props.onChangeText ?? vi.fn();
  const onSelect = props.onSelect ?? vi.fn();
  act(() => {
    root.render(
      <AddressAutocomplete
        value={props.value ?? ''}
        onChangeText={onChangeText}
        onSelect={onSelect}
        {...props}
      />,
    );
  });
  return { onChangeText, onSelect };
}

describe('<AddressAutocomplete>', () => {
  it('renders a combobox input, collapsed by default', () => {
    render({ value: '' });
    const input = container.querySelector('input')!;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('opens the listbox and lists suggestions as options once focused with a 3+ char value', () => {
    mockHookState.suggestions = [
      { label: 'Calle 123, Bogotá', lat: 4.6, lon: -74.0, placeId: '1', city: 'Bogotá', road: 'Calle 123' },
      { label: 'Calle 124, Bogotá', lat: 4.7, lon: -74.1, placeId: '2' },
    ];
    render({ value: 'Calle 12' });
    const input = container.querySelector('input')!;

    act(() => {
      input.focus();
    });

    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('Calle 123, Bogotá');
  });

  it('does not open the listbox for queries under 3 characters even when focused', () => {
    mockHookState.suggestions = [{ label: 'Calle 1', lat: 1, lon: 2, placeId: '1' }];
    render({ value: 'Ca' });
    const input = container.querySelector('input')!;

    act(() => {
      input.focus();
    });

    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('shows a loading state inside the listbox', () => {
    mockHookState.isLoading = true;
    render({ value: 'Calle 12' });
    const input = container.querySelector('input')!;
    act(() => { input.focus(); });

    expect(container.textContent).toContain('Buscando direcciones');
  });

  it('shows a fail-open error message but keeps the input usable as free text', () => {
    mockHookState.error = 'geocoding_upstream_error';
    render({ value: 'Calle 12' });
    const input = container.querySelector('input')!;
    act(() => { input.focus(); });

    expect(container.textContent).toContain('escribiendo la dirección manualmente');
    expect((input as HTMLInputElement).disabled).toBe(false);
  });

  it('ArrowDown then Enter selects the active suggestion, mapping fields for onSelect', () => {
    mockHookState.suggestions = [
      { label: 'Calle 123, Bogotá', lat: 4.6, lon: -74.0, placeId: '1', city: 'Bogotá', neighborhood: 'Chapinero', road: 'Calle 123' },
    ];
    const { onChangeText, onSelect } = render({ value: 'Calle 12' });
    const input = container.querySelector('input') as HTMLInputElement;

    act(() => { input.focus(); });
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });

    expect(onSelect).toHaveBeenCalledWith({
      address: 'Calle 123',
      city: 'Bogotá',
      neighborhood: 'Chapinero',
      latitude: 4.6,
      longitude: -74.0,
      placeId: '1',
    });
    expect(onChangeText).toHaveBeenCalledWith('Calle 123');
    // Selecting closes the listbox.
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('falls back to the display label as address when the suggestion has no road', () => {
    mockHookState.suggestions = [
      { label: 'Barrio Genérico, Cali', lat: 3.4, lon: -76.5, placeId: '9' },
    ];
    const { onSelect } = render({ value: 'Barrio Gen' });
    const input = container.querySelector('input') as HTMLInputElement;

    act(() => { input.focus(); });
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'Barrio Genérico, Cali', city: '', neighborhood: '' }),
    );
  });

  it('Escape closes the listbox without selecting', () => {
    mockHookState.suggestions = [{ label: 'Calle 1', lat: 1, lon: 2, placeId: '1' }];
    const { onSelect } = render({ value: 'Calle 12' });
    const input = container.querySelector('input')!;

    act(() => { input.focus(); });
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();

    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });

    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clicking an option (mousedown+click) selects it even though the input loses focus', () => {
    mockHookState.suggestions = [
      { label: 'Calle 123, Bogotá', lat: 4.6, lon: -74.0, placeId: '1', road: 'Calle 123' },
    ];
    const { onSelect } = render({ value: 'Calle 12' });
    const input = container.querySelector('input')!;
    act(() => { input.focus(); });

    const option = container.querySelector('[role="option"]') as HTMLButtonElement;
    act(() => {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'Calle 123', placeId: '1' }),
    );
  });
});
