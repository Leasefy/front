/**
 * «Para <hacer X> te faltan N pasos» (GLOW UP, 20-10-2026).
 *
 * Lo que fija: cuenta sólo lo obligatorio, marca el primero que falta como
 * «Sigue», no pinta la acción de lo que ya está listo, y con todo listo se
 * pliega en una línea que se puede volver a abrir.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ListaParaEmpezar, type Requisito } from './ListaParaEmpezar';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  try {
    window.localStorage.clear();
  } catch {
    /* sin almacenamiento */
  }
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const q = (s: string) => host.querySelector(s);

async function pintar(requisitos: Requisito[]) {
  await act(async () => {
    root.render(
      <ListaParaEmpezar paraQue="facturar" requisitos={requisitos} recordarComo="prueba" data-testid="lista" />,
    );
  });
}

const boton = (id: string) => <button type="button" data-testid={`accion-${id}`}>hacer</button>;

describe('ListaParaEmpezar', () => {
  it('cuenta lo que falta, sin lo opcional, y marca el primero como «Sigue»', async () => {
    await pintar([
      { id: 'a', titulo: 'Resolución', estado: 'listo', accion: boton('a') },
      { id: 'b', titulo: 'Documento', estado: 'falta', accion: boton('b') },
      { id: 'c', titulo: 'DIAN', estado: 'falta', accion: boton('c') },
      { id: 'd', titulo: 'Correos', estado: 'opcional', accion: boton('d'), etiqueta: 'No frena la factura' },
    ]);
    expect(q('[data-testid="lista"]')!.textContent).toContain('Para facturar te faltan 2 pasos');
    // Lo listo no ofrece su acción; lo que falta, sí.
    expect(q('[data-testid="accion-a"]')).toBeNull();
    expect(q('[data-testid="accion-b"]')).not.toBeNull();
    // El primero que falta es el que sigue, y sólo ése.
    expect(q('[data-testid="lista-b"]')!.textContent).toContain('Sigue');
    expect(q('[data-testid="lista-c"]')!.textContent).not.toContain('Sigue');
    // Lo opcional lleva su rótulo y su acción, pero no cuenta.
    expect(q('[data-testid="lista-d"]')!.textContent).toContain('No frena la factura');
    expect(q('[data-testid="accion-d"]')).not.toBeNull();
  });

  it('soloLoQueFalta: no pinta los pasos hechos ni el «1/3»; por defecto sí (revisora r25, perfiles)', async () => {
    const requisitos: Requisito[] = [
      { id: 'a', titulo: 'Resolución', estado: 'listo' },
      { id: 'b', titulo: 'Documento', estado: 'falta' },
      { id: 'c', titulo: 'DIAN', estado: 'falta' },
    ];
    await pintar(requisitos);
    expect(q('[data-testid="lista-a"]')).not.toBeNull();
    expect(q('[data-testid="lista"]')!.textContent).toContain('1/3');
    await act(async () => {
      root.render(
        <ListaParaEmpezar paraQue="facturar" requisitos={requisitos} soloLoQueFalta data-testid="lista" />,
      );
    });
    expect(q('[data-testid="lista-a"]')).toBeNull();
    expect(q('[data-testid="lista-b"]')).not.toBeNull();
    expect(q('[data-testid="lista-c"]')).not.toBeNull();
    expect(q('[data-testid="lista"]')!.textContent).not.toContain('1/3');
    expect(q('[data-testid="lista"]')!.textContent).toContain('Para facturar te faltan 2 pasos');
  });

  it('en singular cuando falta uno', async () => {
    await pintar([
      { id: 'a', titulo: 'Resolución', estado: 'falta' },
      { id: 'b', titulo: 'DIAN', estado: 'listo' },
    ]);
    expect(q('[data-testid="lista"]')!.textContent).toContain('Para facturar te falta 1 paso');
  });

  it('🔴 lo que no se pudo revisar no cuenta como listo ni como pendiente', async () => {
    await pintar([
      { id: 'a', titulo: 'Resolución', estado: 'listo' },
      { id: 'b', titulo: 'Correos', estado: 'desconocido', detalle: 'No pudimos revisar' },
    ]);
    // 🔴 No sabemos si los correos están: no se puede decir «Todo listo».
    expect(q('[data-testid="lista"]')!.getAttribute('data-estado')).toBe('pendiente');
    expect(q('[data-testid="lista"]')!.textContent).toContain('No pudimos revisar todo lo que necesitas para facturar');
    expect(q('[data-testid="lista"]')!.textContent).not.toContain('Todo listo');
  });

  it('con todo listo se pliega en una línea y se puede volver a abrir', async () => {
    await pintar([
      { id: 'a', titulo: 'Resolución', estado: 'listo' },
      { id: 'b', titulo: 'DIAN', estado: 'listo' },
    ]);
    const lista = q('[data-testid="lista"]')!;
    expect(lista.textContent).toContain('Todo listo para facturar');
    const cabecera = lista.querySelector('button[aria-expanded]') as HTMLButtonElement;
    expect(cabecera.getAttribute('aria-expanded')).toBe('false');
    expect(q('[data-testid="lista-a"]')).toBeNull();
    await act(async () => {
      cabecera.click();
    });
    expect(cabecera.getAttribute('aria-expanded')).toBe('true');
    expect(q('[data-testid="lista-a"]')).not.toBeNull();
  });

  it('mientras se revisa algo, no dice «Todo listo»', async () => {
    await pintar([
      { id: 'a', titulo: 'Resolución', estado: 'listo' },
      { id: 'b', titulo: 'DIAN', estado: 'cargando' },
    ]);
    expect(q('[data-testid="lista"]')!.textContent).not.toContain('Todo listo');
    expect(q('[data-testid="lista"]')!.textContent).toContain('Revisando');
  });
});
