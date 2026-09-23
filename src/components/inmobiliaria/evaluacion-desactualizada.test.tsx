/**
 * 🔴 Auditoría 23-09-2026 (decisión de Nico): si el candidato cambia sus datos
 * o reactiva la postulación después de evaluarlo, el back deja la evaluación
 * esperando con `datos_cambiaron`. El cajón del candidato tiene que decir POR
 * QUÉ ya no hay puntaje y qué hacer — no un análisis vacío.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import {
  AvisoDeEvaluacionDesactualizada,
  evaluacionDesactualizada,
} from './CandidateDrawer';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

describe('evaluación desactualizada en el cajón del candidato', () => {
  it('se reconoce por el motivo datos_cambiaron, y sólo por ese', () => {
    expect(evaluacionDesactualizada({ awaiting_reason: 'datos_cambiaron' })).toBe(true);
    expect(evaluacionDesactualizada({ awaiting_reason: 'study_in_progress' })).toBe(false);
    expect(evaluacionDesactualizada(null)).toBe(false);
  });

  it('el aviso dice por qué no hay puntaje y qué hacer', () => {
    act(() => root.render(<AvisoDeEvaluacionDesactualizada />));
    const texto =
      container.querySelector('[data-testid="evaluacion-desactualizada"]')?.textContent ?? '';
    expect(texto).toContain('Hay que volver a evaluarlo');
    expect(texto).toContain('cambió sus datos');
    expect(texto).toContain('Pide un estudio nuevo');
  });
});
