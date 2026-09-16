/**
 * @vitest-environment happy-dom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const permisos = vi.hoisted(() => ({
  valor: { isLoading: false as boolean, canAccess: (_m: string, _a: string): boolean => false },
}));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos.valor }));

import { usePuedeHacerRecibo } from './permiso-de-recibo';

function Sonda() {
  return <span data-testid="puede">{usePuedeHacerRecibo() ? 'si' : 'no'}</span>;
}

describe('usePuedeHacerRecibo (C6)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const leer = () => {
    act(() => root.render(<Sonda />));
    return container.querySelector('[data-testid="puede"]')?.textContent;
  };

  it('pide exactamente cobros:create, que es lo que exige el back para emitir', () => {
    const canAccess = vi.fn((m: string, a: string) => m === 'cobros' && a === 'create');
    permisos.valor = { isLoading: false, canAccess };
    expect(leer()).toBe('si');
    expect(canAccess).toHaveBeenCalledWith('cobros', 'create');
  });

  it('un VIEWER (sólo cobros:view) no puede', () => {
    permisos.valor = { isLoading: false, canAccess: (m, a) => m === 'cobros' && a === 'view' };
    expect(leer()).toBe('no');
  });

  it('mientras los permisos cargan no apaga el botón', () => {
    permisos.valor = { isLoading: true, canAccess: () => false };
    expect(leer()).toBe('si');
  });
});

describe('sin permiso el botón se deshabilita con el porqué, no desaparece', () => {
  const fuente = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');

  it.each([
    'src/components/inmobiliaria/CobroDetail.tsx',
    'src/components/inmobiliaria/CobroTable.tsx',
    'src/app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx',
  ])('%s', (ruta) => {
    const s = fuente(ruta);
    expect(s).toContain('usePuedeHacerRecibo()');
    expect(s).toContain('disabled={!puedeHacerRecibo}');
    expect(s).toContain('MOTIVO_SIN_PERMISO_DE_RECIBO');
  });
});

describe('C8: «Marcar incumplido» no existe en el servidor', () => {
  it('el cajón del cobro ya no ofrece un botón que sólo mostraba un aviso', () => {
    const s = readFileSync(join(process.cwd(), 'src/components/inmobiliaria/CobroDetail.tsx'), 'utf8');
    expect(s).not.toContain('handleMarkDefaulted');
    expect(s).not.toContain("t('inmobiliaria.cobros.detail.markDefaulted')");
  });
});
