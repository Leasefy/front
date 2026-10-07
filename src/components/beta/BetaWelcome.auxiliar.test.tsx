/**
 * CF-01 (decisión 12 de Nico, 05-10-2026): el auxiliar de cartera tiene chat,
 * SÓLO de cartera. Su llegada se lo dice y le ofrece preguntas de cartera (cada
 * una con su consulta fija en el micro): ofrecerle «Resume el estado de mis
 * propiedades» sería ofrecerle un «no te corresponde».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto } = vi.hoisted(() => ({
  contexto: {
    filteredSummaries: [] as Array<Record<string, unknown>>,
    switchConversation: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/api/migracion-estado.service', () => ({ migracionEstadoApi: { recordatorio: vi.fn() } }));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => contexto,
  useBetaChatOpcional: () => contexto,
}));

import { BetaWelcome } from './BetaWelcome';
import { plantillasDelRol, CHAT_TEMPLATES } from './ChatTemplates';
import { AuthContext } from '@/lib/auth/auth-context';

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

function pintarComo(agencyRole: string, onPromptClick = vi.fn()) {
  const auth = { agency: { id: 'ag-1', name: 'Inmobiliaria Laboratorio' }, agencyRole } as unknown as React.ContextType<typeof AuthContext>;
  act(() =>
    root.render(
      <AuthContext.Provider value={auth}>
        <BetaWelcome onPromptClick={onPromptClick} />
      </AuthContext.Provider>
    )
  );
  return onPromptClick;
}

describe('la llegada del chat del auxiliar de cartera (CF-01)', () => {
  it('dice que su chat es de la cartera y sus atajos son preguntas de cartera', () => {
    const onPromptClick = pintarComo('AUXILIAR_CARTERA');
    expect(container.textContent).toContain('Pregúntale a tu inmobiliaria por la cartera');
    expect(container.textContent).not.toContain('cartera, contratos, inmuebles y pagos');
    const atajos = [...container.querySelectorAll('[data-testid^="atajo-"]')].map((b) => b.textContent);
    expect(atajos).toEqual(['No han pagado', 'Lo que me deben', 'Los que más deben']);
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="atajo-no_han_pagado"]')!.click());
    expect(onPromptClick).toHaveBeenCalledWith('¿Quién no ha pagado este mes?');
    // Su chat no llama especialistas: la frase no sería verdad para él.
    expect(container.querySelector('[data-testid="fila-del-equipo"]')).toBeNull();
  });

  it('sus preguntas predeterminadas son sólo de cartera', () => {
    pintarComo('AUXILIAR_CARTERA');
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="boton-de-preguntas"]')!.click());
    const items = [...container.querySelectorAll('[role="menuitem"]')].map((b) => b.textContent ?? '');
    expect(items).toHaveLength(5);
    expect(items.join(' ')).not.toMatch(/propiedades|contratos|mantenimiento|candidatos|reporte financiero/i);
  });

  it('el administrador sigue viendo la llegada de siempre', () => {
    pintarComo('ADMIN');
    expect(container.textContent).toContain('Pregúntale a tu inmobiliaria por cartera, contratos, inmuebles y pagos.');
    const atajos = [...container.querySelectorAll('[data-testid^="atajo-"]')].map((b) => b.textContent);
    expect(atajos).toEqual(['Cobros y recaudos', 'Contratos', 'Propiedades']);
    expect(container.querySelector('[data-testid="fila-del-equipo"]')).not.toBeNull();
    expect(plantillasDelRol('ADMIN')).toBe(CHAT_TEMPLATES);
  });
});
