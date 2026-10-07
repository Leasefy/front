/**
 * QA-INQ-95 (04-10-2026) · En un acuerdo que ya no está vivo (la deuda se pagó
 * por fuera y quedó «Completado»), las cuotas que no se pagaron por el acuerdo
 * decían «Pendiente»: se leía como plata que todavía se debe.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { CuotaPlanTable } from './CuotaPlanTable';
import { I18nProvider } from '@/lib/i18n';
import { acuerdoEstaCerrado, acuerdoStatusToLabel } from '@/lib/types/tenant-case';

const CUOTAS = [
  { number: 0, dueDate: '2026-10-03', amountCop: 1_815_000, status: 'pending', paidAt: null },
  { number: 1, dueDate: '2026-11-03', amountCop: 1_411_666, status: 'paid', paidAt: '2026-10-03T10:29:11.599Z' },
];

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('cuotas de un acuerdo cerrado', () => {
  it('lo que no se pagó por el acuerdo dice «Sin cobrar», no «Pendiente»', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <CuotaPlanTable installments={CUOTAS} locale="es" acuerdoCerrado />
        </I18nProvider>,
      );
    });
    const texto = host.textContent ?? '';
    expect(texto).toContain('Sin cobrar');
    expect(texto).not.toContain('Pendiente');
    expect(texto).toContain('Pagada');
  });

  it('en un acuerdo vivo sigue diciendo «Pendiente»', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <CuotaPlanTable installments={CUOTAS} locale="es" />
        </I18nProvider>,
      );
    });
    expect(host.textContent ?? '').toContain('Pendiente');
  });

  it('qué acuerdos están cerrados y cómo se nombran', () => {
    expect(acuerdoEstaCerrado('completed')).toBe(true);
    expect(acuerdoEstaCerrado('cancelled')).toBe(true);
    expect(acuerdoEstaCerrado('defaulted')).toBe(true);
    expect(acuerdoEstaCerrado('active')).toBe(false);
    expect(acuerdoEstaCerrado('accepted')).toBe(false);
    expect(acuerdoEstaCerrado('offered')).toBe(false);
    expect(acuerdoStatusToLabel('defaulted')).toBe('Incumplido');
    expect(acuerdoStatusToLabel('accepted')).toBe('Aceptado');
  });
});
