/**
 * QA-MIGRACION-95 (IN-01, 06-10-2026): en «Desde software» cada sistema (SIMI,
 * Daytona…) abre sus instrucciones de exportación, pero la tarjeta era un
 * `<div onClick>`: con el teclado no se llegaba a ella ni se abría, y el lector
 * de pantalla no sabía que se despliega (visto en el navegador: Tab saltaba
 * las tarjetas).
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

import { StepSoftwareMigration } from './StepSoftwareMigration';
import type { ImportWizardState } from '../lib/importTypes';

let container: HTMLDivElement;
let root: Root | null = null;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
});

describe('IN-01: las tarjetas de «Desde software» se abren con el teclado', () => {
  it('cada sistema es un botón con aria-expanded que abre sus instrucciones; el enlace queda fuera del botón', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(
        <StepSoftwareMigration state={{} as ImportWizardState} updateState={vi.fn()} />,
      );
    });
    const simi = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('SIMI CRM'),
    );
    expect(simi).toBeTruthy();
    expect(simi?.getAttribute('aria-expanded')).toBe('false');
    await act(async () => {
      simi!.click();
    });
    expect(simi?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Instrucciones de exportación');
    // El enlace al sitio del sistema no puede vivir adentro del botón (interactivo anidado).
    const sitio = [...container.querySelectorAll('a')].find((a) => (a.textContent ?? '').includes('SIMI CRM'));
    if (sitio) expect(simi?.contains(sitio)).toBe(false);
  });
});
