/**
 * AvanceDeRetomar.test.tsx — lo que se ve mientras se abre una carga (02-10-2026).
 *
 * Pasos reales (poner al día → traer la lista), no un porcentaje inventado;
 * el barrido del tramo en curso desaparece con movimiento reducido.
 */

import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MotionConfig } from 'framer-motion';

import { AvanceDeRetomar, type AvanceDeRetomarProps } from './AvanceDeRetomar';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LOTE = 'inquilinos-2026-10-01-1815';

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(props: Partial<AvanceDeRetomarProps> = {}, reducido = false) {
  container = document.createElement('div');
  document.body.appendChild(container);
  const avance = (
    <AvanceDeRetomar
      lote={LOTE}
      fase="poniendo-al-dia"
      filas={1729}
      puestasAlDia={null}
      tarda={false}
      {...props}
    />
  );
  await act(async () => {
    root = createRoot(container);
    root.render(reducido ? <MotionConfig reducedMotion="always">{avance}</MotionConfig> : avance);
  });
}

const barra = () => container.querySelector('[role="progressbar"]');
const tramos = () => [...container.querySelectorAll('[data-estado]')].map((t) => t.getAttribute('data-estado'));
const texto = () => container.querySelector(`[data-testid="retomando-${LOTE}"]`)?.textContent ?? '';

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
});

describe('AvanceDeRetomar', () => {
  it('paso 1 de 2: poniendo al día las filas, con el tramo en curso barriendo', async () => {
    await pintar();

    expect(barra()?.getAttribute('aria-valuenow')).toBe('0');
    expect(barra()?.getAttribute('aria-valuemax')).toBe('2');
    expect(barra()?.textContent).toContain('Paso 1 de 2');
    expect(tramos()).toEqual(['en-curso', 'pendiente']);
    expect(texto()).toContain('Poniendo al día las 1.729 filas con las reglas de hoy');
    expect(container.querySelectorAll('[data-barrido]')).toHaveLength(1);
  });

  it('paso 2 de 2: dice cuántas quedaron al día y trae la lista; el primer tramo queda lleno', async () => {
    await pintar({ fase: 'leyendo', puestasAlDia: 1729 });

    expect(barra()?.getAttribute('aria-valuenow')).toBe('1');
    expect(barra()?.textContent).toContain('Paso 2 de 2');
    expect(tramos()).toEqual(['hecho', 'en-curso']);
    expect(texto()).toContain('1.729 filas quedaron al día. Trayendo la lista de lo que falta');
  });

  it('si la revisión falló o no había nada viejo, no dice que algo quedó al día', async () => {
    await pintar({ fase: 'leyendo', puestasAlDia: null });
    expect(texto()).toBe('Trayendo la lista de lo que falta…');
  });

  it('con movimiento reducido no hay barrido: el tramo en curso queda marcado, quieto', async () => {
    await pintar({}, true);

    expect(tramos()).toEqual(['en-curso', 'pendiente']);
    expect(container.querySelectorAll('[data-barrido]')).toHaveLength(0);
  });

  it('si tarda, ofrece soltar la espera sin miedo a duplicar', async () => {
    await pintar({ tarda: true });
    expect(texto()).toContain('Está tardando más de lo normal');
    expect(texto()).toContain('no se duplica a nadie');
  });
});
