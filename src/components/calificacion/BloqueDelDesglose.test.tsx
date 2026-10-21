/**
 * El desglose de la Calificación Leasefy con su glow up (19-10-2026, Nico:
 * «ese historial de Leasefy necesita un glow up… es nuestro»). Lo que sostiene:
 * cada componente medido dice qué mide, su puntaje y cuánto pesó de verdad (ya
 * repartido); lo que no tiene dato va al final en UNA línea que dice que su
 * peso se reparte (nunca filas vacías con «sin dato»), y la barra lleva la
 * escala de la letra.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { TarjetaDeCalificacion } from './TarjetaDeCalificacion';
import type { Calificacion } from '@/lib/api/calificacion-leasefy.service';

/** La del pantallazo de Nico: sólo historial, dos componentes con dato. */
const SOLO_HISTORIAL: Calificacion = {
  version: 'leasefy-v1',
  estado: 'SOLO_HISTORIAL',
  puntaje: 68,
  letra: 'B',
  pesoDelHistorial: 1,
  mesesObservados: 14,
  historial: {
    puntaje: 68,
    desglose: [
      { componente: 'puntualidad', pesoNominal: 50, pesoEfectivo: 0, valor: null },
      { componente: 'peorAtraso', pesoNominal: 20, pesoEfectivo: 0, valor: null },
      { componente: 'comoTermino', pesoNominal: 15, pesoEfectivo: 75, valor: 70 },
      { componente: 'acuerdos', pesoNominal: 10, pesoEfectivo: 0, valor: null },
      { componente: 'permanencia', pesoNominal: 5, pesoEfectivo: 25, valor: 63 },
    ],
  },
  documentos: null,
  frenos: [],
  revisiones: [],
  veredicto: 'CON_CONDICIONES',
  condiciones: [],
  canonMaximoCop: null,
  explicacion: [],
};

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

function pintar(c: Calificacion) {
  act(() => raiz.render(<TarjetaDeCalificacion calificacion={c} />));
  return contenedor;
}

describe('el desglose de la Calificación Leasefy', () => {
  it('cada componente medido dice qué mide, su puntaje y cuánto pesó de verdad', () => {
    const el = pintar(SOLO_HISTORIAL);
    const bloque = el.querySelector('[data-testid="bloque-del-desglose"]')!;
    const texto = bloque.textContent ?? '';
    expect(texto).toContain('Historial en Leasefy');
    expect(texto).toContain('Cómo le ha ido arrendando con Leasefy.');
    expect(texto).toContain('Pesa 100 % de la calificación');
    expect(texto).toContain('Cómo terminaron sus contratos');
    expect(texto).toContain('Si los entregó sin deuda y cómo los evaluó la inmobiliaria.');
    expect(texto).toContain('cuenta 75 %');
    expect(texto).toContain('Permanencia');
    expect(texto).toContain('cuenta 25 %');
    // Una barra por componente medido, con su valor para el lector de pantalla.
    const barras = [...bloque.querySelectorAll('[role="meter"]')];
    expect(barras.map((b) => [b.getAttribute('aria-label'), b.getAttribute('aria-valuenow')])).toEqual([
      ['Cómo terminaron sus contratos', '70'],
      ['Permanencia', '63'],
    ]);
    // El anillo del bloque dice el puntaje.
    expect(bloque.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('68 de 100');
  });

  it('lo que no tiene dato va al final en una línea: su peso se reparte, nunca filas vacías', () => {
    const el = pintar(SOLO_HISTORIAL);
    const bloque = el.querySelector('[data-testid="bloque-del-desglose"]')!;
    // «sin dato» sale UNA vez (en el pie), nunca como el valor de una fila.
    expect((bloque.textContent ?? '').match(/sin dato/g)).toHaveLength(1);
    expect(bloque.querySelectorAll('[role="meter"]')).toHaveLength(2);
    expect(el.querySelector('[data-testid="bloque-sin-dato"]')?.textContent).toBe(
      'Todavía sin dato: Puntualidad, Peor atraso (24 meses) y Acuerdos y promesas. Su peso se reparte entre lo que sí se midió.',
    );
  });

  it('en «Mi calificación» le habla de tú a la persona', () => {
    act(() => raiz.render(<TarjetaDeCalificacion calificacion={SOLO_HISTORIAL} deTu />));
    const texto = contenedor.querySelector('[data-testid="bloque-del-desglose"]')?.textContent ?? '';
    expect(texto).toContain('Cómo te ha ido arrendando con Leasefy.');
    expect(texto).toContain('Cómo terminaron tus contratos');
    expect(texto).toContain('Si los entregaste sin deuda y cómo los evaluó la inmobiliaria.');
    expect(texto).toContain('Tu arriendo más largo, frente a 24 meses.');
  });

  it('con todo medido no hay pie; la escala de la letra va debajo de las barras', () => {
    const completo: Calificacion = {
      ...SOLO_HISTORIAL,
      historial: {
        puntaje: 81,
        desglose: SOLO_HISTORIAL.historial!.desglose.map((r) => ({ ...r, pesoEfectivo: r.pesoNominal, valor: 81 })),
      },
    };
    const el = pintar(completo);
    expect(el.querySelector('[data-testid="bloque-sin-dato"]')).toBeNull();
    expect(el.querySelectorAll('[role="meter"]')).toHaveLength(5);
    const escala = [...el.querySelectorAll('[data-testid="bloque-del-desglose"] [aria-hidden] span')].map((s) => s.textContent);
    expect(escala).toEqual(expect.arrayContaining(['D', 'C', 'B', 'A']));
  });
});
