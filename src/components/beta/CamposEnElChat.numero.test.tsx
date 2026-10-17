/**
 * @vitest-environment happy-dom
 */
/**
 * Nico (16-10, captura de la tarjeta de la prórroga con «doce»): «obliga al
 * input solo a numérico y ya». En el campo, las letras no entran.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { CamposEnElChat } from './CamposEnElChat';
import type { CampoDelFormulario } from '@/lib/chat/acciones-del-hilo';

const meses: CampoDelFormulario = {
  clave: 'meses',
  etiqueta: 'Término de cada período, en meses',
  tipo: 'numero',
  requerido: true,
  opciones: [],
  ayuda: null,
  valor: null,
};

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
});

function Sonda() {
  const [valores, setValores] = React.useState<Record<string, string>>({});
  return <CamposEnElChat campos={[meses]} valores={valores} idBase="t" onCambiar={(k, v) => setValores((x) => ({ ...x, [k]: v }))} />;
}

function escribir(input: HTMLInputElement, texto: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    set.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('el campo de número del chat', () => {
  it('«doce» no entra; «12» sí', () => {
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    root = createRoot(contenedor);
    act(() => root!.render(<Sonda />));
    const input = contenedor.querySelector('input')!;
    escribir(input, 'doce');
    expect(input.value).toBe('');
    escribir(input, '12');
    expect(input.value).toBe('12');
    escribir(input, '12a');
    expect(input.value).toBe('12');
  });
});
