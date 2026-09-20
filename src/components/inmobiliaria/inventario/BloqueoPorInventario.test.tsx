import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/ui/alerta-accionable', () => ({
  AlertaAccionable: (p: { titulo: string; children?: React.ReactNode; accion?: { href?: string; label: string } }) => (
    <div>
      <strong>{p.titulo}</strong>
      {p.children}
      {p.accion && <a href={p.accion.href}>{p.accion.label}</a>}
    </div>
  ),
}));

import { BloqueoPorInventario } from './BloqueoPorInventario';

let host: HTMLDivElement;
let root: Root;

function montar(bloqueo: React.ComponentProps<typeof BloqueoPorInventario>['bloqueo']) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<BloqueoPorInventario bloqueo={bloqueo} />));
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('BloqueoPorInventario', () => {
  it('dice qué contrato pide actualizar y enlaza al inventario del inmueble', () => {
    montar({
      motivo: 'ANTERIOR_AL_FIN_DEL_CONTRATO',
      consignacionId: 'cons-1',
      porActualizarTras: { contratoId: 'c', code: 4, externalId: 'B-4', terminoEl: '2026-09-01' },
    });
    expect(host.textContent).toContain('Todavía no puedes iniciar este contrato');
    expect(host.textContent).toContain('por actualizar tras el contrato B-4, que terminó el 1 de septiembre de 2026');
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/cons-1#inventario');
  });

  it('sin consignación no inventa un enlace: dice dónde buscar', () => {
    montar({ motivo: 'SIN_INVENTARIO', consignacionId: null, porActualizarTras: null });
    expect(host.querySelector('a')).toBeNull();
    expect(host.textContent).toContain('Busca el inmueble en el portafolio');
  });
});
