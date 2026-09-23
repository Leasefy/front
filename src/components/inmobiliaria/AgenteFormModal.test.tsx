/**
 * Invitar a un miembro deja elegir su ROL, entre los siete del back.
 *
 * QA 22-09: la lista de roles existía en este modal y nunca se pintaba; toda
 * invitación desde «Miembros y roles» salía como AGENTE. Y «Editar rol»
 * ofrecía cuatro de siete, con nombres distintos a los de la tabla.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

import { AgenteFormModal } from './AgenteFormModal';
import { getRoleLabel, ROLES_DEL_SISTEMA } from '@/lib/types/inmobiliaria';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function montar(variant: 'agent' | 'member') {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(<AgenteFormModal isOpen onClose={() => {}} onSubmit={() => {}} variant={variant} />);
  });
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe('los roles del sistema', () => {
  it('son los SIETE del back (AgencyMemberRole), cada uno con nombre', () => {
    expect(ROLES_DEL_SISTEMA.map((r) => r.toUpperCase()).sort()).toEqual(
      ['ADMIN', 'AGENTE', 'CONTADOR', 'VIEWER', 'COORDINADOR', 'AUXILIAR_CARTERA', 'ABOGADO_EXTERNO'].sort(),
    );
    for (const rol of ROLES_DEL_SISTEMA) expect(getRoleLabel(rol)).not.toBe('—');
  });

  it('no hay nombres en inglés', () => {
    expect(ROLES_DEL_SISTEMA.map(getRoleLabel)).not.toContain('Viewer');
  });
});

describe('AgenteFormModal', () => {
  it('🔴 invitar un MIEMBRO pinta el selector del rol', () => {
    montar('member');
    expect(document.body.querySelector('[data-testid="rol-del-sistema"]')).not.toBeNull();
  });

  it('crear un AGENTE no lo pinta: el rol es agente', () => {
    montar('agent');
    expect(document.body.querySelector('[data-testid="rol-del-sistema"]')).toBeNull();
  });
});
