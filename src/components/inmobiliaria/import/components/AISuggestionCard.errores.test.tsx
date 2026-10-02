/**
 * «Completa esto para poder crearlo»: el campo que falta dice POR QUÉ, con el
 * error de la casa (02-10-2026). La ayuda gris y el error se cruzan con la
 * entrada suave de Cadence (`ErrorDelCampo` con `pista`) y el input los nombra
 * en `aria-describedby`: un lector de pantalla oye la regla, no sólo «inválido».
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ImportProperty } from '../lib/importTypes';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }));

import { AISuggestionCard } from './AISuggestionCard';

let container: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function montar(p: Partial<ImportProperty>) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <AISuggestionCard
        property={
          {
            _rowIndex: 0,
            propertyTitle: 'Casa',
            propertyAddress: '',
            propertyCity: 'Medellín',
            propertyType: 'house',
            monthlyRent: 1_500_000,
            selected: false,
            hasErrors: true,
            errorMessages: [],
            suggestions: [],
            ...p,
          } as ImportProperty
        }
        index={0}
        onToggleSelect={() => {}}
        onAcceptSuggestion={() => {}}
        onRejectSuggestion={() => {}}
        onAcceptAll={() => {}}
        onEditField={() => {}}
      />,
    );
  });
}

describe('AISuggestionCard — el error del campo que falta', () => {
  it('el input apunta a su error, que dice la regla, con el rol de alerta', () => {
    montar({ propertyAddress: '' });
    const input = container.querySelector<HTMLInputElement>('[data-testid="falta-propertyAddress-0"]')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const idDelError = input.getAttribute('aria-describedby');
    expect(idDelError).toBeTruthy();
    const error = container.ownerDocument.getElementById(idDelError!);
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toBe('Sin dirección el inmueble no se puede crear.');
  });

  it('el input tiene su etiqueta (antes el `<label>` envolvía también la ayuda)', () => {
    montar({ propertyAddress: '' });
    const input = container.querySelector<HTMLInputElement>('[data-testid="falta-propertyAddress-0"]')!;
    const label = container.querySelector(`label[for="${input.id}"]`);
    expect(label?.textContent).toBe('Dirección');
  });
});
