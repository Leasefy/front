/**
 * @vitest-environment happy-dom
 *
 * 🔴 Política de datos (Nico, 20-10-2026): descargar datos personales es de
 * quien tenga «Exportar» del módulo; sin permisos cargados, no se descarga.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ contexto: null as unknown }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => h.contexto }));

import { usePuedeDescargar } from './puede-descargar';

function leer(modulo: 'contratos' | 'clientes') {
  let r: ReturnType<typeof usePuedeDescargar> | null = null;
  function Sonda() {
    r = usePuedeDescargar(modulo);
    return null;
  }
  const el = document.createElement('div');
  act(() => createRoot(el).render(<Sonda />));
  return r!;
}

describe('quién descarga datos personales', () => {
  it('el administrador siempre', () => {
    h.contexto = { isLoading: false, isAdmin: true, canAccess: () => false };
    expect(leer('contratos')).toEqual({ puede: true, porQue: null });
  });
  it('otro rol, sólo con «Exportar» de ese módulo', () => {
    h.contexto = { isLoading: false, isAdmin: false, canAccess: (m: string, a: string) => m === 'clientes' && a === 'export' };
    expect(leer('clientes').puede).toBe(true);
    const sin = leer('contratos');
    expect(sin.puede).toBe(false);
    expect(sin.porQue).toContain('«Exportar» de Contratos');
  });
  it('🔴 mientras los permisos cargan, no', () => {
    h.contexto = { isLoading: true, isAdmin: true, canAccess: () => true };
    expect(leer('contratos').puede).toBe(false);
  });
});
