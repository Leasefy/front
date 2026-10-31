import * as React from 'react';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EditorDeDescripcion } from './EditorDeDescripcion';

void React; // jsx-preserve

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

function render(ui: React.ReactElement) {
  act(() => raiz.render(ui));
}

const campo = () => contenedor.querySelector('textarea[aria-label="Descripción"]') as HTMLTextAreaElement;
const boton = (nombre: string) => contenedor.querySelector(`button[aria-label="${nombre}"]`) as HTMLButtonElement;
const valor = () => contenedor.querySelector('[data-testid="valor"]')?.textContent;
const porId = (id: string) => contenedor.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const clic = (el: HTMLElement) => act(() => el.click());

function ConEstado({ inicial = '', maxLength }: { inicial?: string; maxLength?: number }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <EditorDeDescripcion aria-label="Descripción" value={valor} maxLength={maxLength} onChange={(e) => setValor(e.target.value)} />
      <output data-testid="valor">{valor}</output>
    </>
  );
}

function elegir(el: HTMLTextAreaElement, inicio: number, fin: number) {
  el.focus();
  el.setSelectionRange(inicio, fin);
}

describe('EditorDeDescripcion (Nico 31-10-2026: negrilla, cursiva, listas y emojis en la descripción)', () => {
  it('«Negrilla» marca lo elegido y el formulario recibe el cambio por su onChange', () => {
    render(<ConEstado inicial="Gran balcón" />);
    elegir(campo(), 5, 11);
    clic(boton('Negrilla'));
    expect(valor()).toBe('Gran *balcón*');
  });

  it('⌘I / Ctrl+I pone cursiva sin salir del campo', () => {
    render(<ConEstado inicial="vista" />);
    elegir(campo(), 0, 5);
    act(() => {
      campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'i', ctrlKey: true, bubbles: true }));
    });
    expect(valor()).toBe('_vista_');
  });

  it('«Lista con viñetas» convierte las líneas elegidas', () => {
    render(<ConEstado inicial={'Balcón\nCuarto útil'} />);
    elegir(campo(), 0, campo().value.length);
    clic(boton('Lista con viñetas'));
    expect(valor()).toBe('- Balcón\n- Cuarto útil');
  });

  it('no pasa del tope de letras del campo', () => {
    render(<ConEstado inicial="abc" maxLength={4} />);
    elegir(campo(), 0, 3);
    clic(boton('Negrilla'));
    expect(valor()).toBe('abc');
  });

  it('«Ver cómo queda» la muestra con formato, como en la ficha', () => {
    render(<ConEstado inicial={'*Gran* apartamento\n- Balcón'} />);
    clic(porId('descripcion-vista-previa')!);
    const vista = porId('descripcion-con-formato')!;
    expect(vista.querySelector('strong')?.textContent).toBe('Gran');
    expect(vista.querySelector('li')?.textContent).toBe('Balcón');
    expect(boton('Negrilla').disabled).toBe(true);
    clic(porId('descripcion-vista-previa')!);
    expect(porId('descripcion-con-formato')).toBeNull();
  });
});
