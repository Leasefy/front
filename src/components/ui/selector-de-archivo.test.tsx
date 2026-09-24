/**
 * SelectorDeArchivo — 🔴 23-09, QA: el `<input type="file">` desnudo decía
 * «Choose File» (el idioma del navegador) en el cambio de cuenta. El input
 * queda escondido y lo que se ve es nuestro, en español.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => {
  const es = (await import('@/lib/i18n/locales/es.json')).default as Record<string, unknown>;
  const t = (clave: string, params: Record<string, string | number> = {}) => {
    const valor = clave.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], es);
    if (typeof valor !== 'string') return clave;
    return valor.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params[k] ?? ''));
  };
  return { useI18n: () => ({ t, locale: 'es' }) };
});

import { SelectorDeArchivo } from './selector-de-archivo';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Controlado({ onElegir }: { onElegir: (f: File | null) => void }) {
  const [archivo, setArchivo] = React.useState<File | null>(null);
  return (
    <>
      <label htmlFor="cert">Certificación</label>
      <SelectorDeArchivo
        id="cert"
        accept="application/pdf"
        archivo={archivo}
        onElegir={(f) => {
          setArchivo(f);
          onElegir(f);
        }}
        testid="cert"
      />
    </>
  );
}

it('sin archivo: «Elegir archivo» en español y el input nativo escondido', () => {
  act(() => root.render(<Controlado onElegir={() => {}} />));
  const input = container.querySelector<HTMLInputElement>('[data-testid="cert"]')!;
  expect(input.type).toBe('file');
  expect(input.className).toContain('sr-only');
  // La etiqueta de afuera sigue apuntando al input.
  expect(container.querySelector('label')?.getAttribute('for')).toBe(input.id);
  expect(container.textContent).toContain('Elegir archivo');
  expect(container.textContent).toContain('Ningún archivo elegido');
});

it('el botón abre el selector del sistema', () => {
  act(() => root.render(<Controlado onElegir={() => {}} />));
  const input = container.querySelector<HTMLInputElement>('[data-testid="cert"]')!;
  const abrir = vi.spyOn(input, 'click').mockImplementation(() => {});
  const boton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Elegir archivo'))!;
  act(() => boton.click());
  expect(abrir).toHaveBeenCalledTimes(1);
});

it('elegido: muestra el nombre, y «Quitar» lo suelta', () => {
  const onElegir = vi.fn();
  act(() => root.render(<Controlado onElegir={onElegir} />));
  const input = container.querySelector<HTMLInputElement>('[data-testid="cert"]')!;
  const archivo = new File(['%PDF'], 'certificacion-bbva.pdf', { type: 'application/pdf' });
  act(() => {
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(onElegir).toHaveBeenLastCalledWith(archivo);
  expect(container.textContent).toContain('certificacion-bbva.pdf');
  expect(container.textContent).toContain('Elegir otro');

  const quitar = container.querySelector<HTMLButtonElement>('[aria-label="Quitar certificacion-bbva.pdf"]')!;
  act(() => quitar.click());
  expect(onElegir).toHaveBeenLastCalledWith(null);
  expect(container.textContent).toContain('Ningún archivo elegido');
});
