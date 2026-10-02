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

  it('es el Dialog de la plataforma: el botón de enviar vive en el pie y envía el formulario con `form=`', () => {
    montar('member');
    const dialogo = document.body.querySelector('[role="dialog"]');
    expect(dialogo?.textContent).toContain('Invitar usuario');
    const form = dialogo!.querySelector('form')!;
    const enviar = dialogo!.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    // Fuera del <form> (el pie fijo es hijo directo del Content)…
    expect(form.contains(enviar)).toBe(false);
    // …y apuntándolo, para que «Enviar invitación» siga enviando.
    expect(form.id).not.toBe('');
    expect(enviar.getAttribute('form')).toBe(form.id);
  });
});

/**
 * 02-10-2026 · tanda 2 del sistema de errores (A6). Antes el modal hacía
 * `console.error` y SeccionEquipo se tragaba el error: el modal se cerraba, se
 * reseteaba y la persona perdía lo escrito sin saber qué pasó.
 */
describe('AgenteFormModal — cuando el back no guarda la invitación', () => {
  const ApiErrorDe = async () => (await import('@/lib/api/client')).ApiError;

  function montarCon(onSubmit: () => Promise<void>, onClose = vi.fn()) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root!.render(<AgenteFormModal isOpen onClose={onClose} onSubmit={onSubmit} variant="member" />);
    });
    return onClose;
  }

  const dialogo = () => document.body.querySelector('[role="dialog"]') as HTMLElement;
  /** Por su placeholder: así la prueba también corre contra el modal de antes (sin ids). */
  const PLACEHOLDER: Record<string, string> = {
    name: 'Juan Perez',
    email: 'juan@inmobiliaria.com',
  };
  const campo = (sufijo: string) =>
    dialogo().querySelector<HTMLInputElement>(`input[placeholder="${PLACEHOLDER[sufijo]}"]`)!;
  const errorDe = (sufijo: string) => dialogo().querySelector(`[id$="-${sufijo}-error"]`);

  function escribir(input: HTMLInputElement, valor: string) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function llenarYEnviar() {
    act(() => {
      escribir(campo('name'), 'Carlos Asesor');
      escribir(campo('email'), 'carlos@inmobiliaria.co');
    });
    await act(async () => {
      dialogo().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));
    });
  }

  it('🔴 un 400 con campos pinta el error en su campo, le da el foco y no cierra ni borra lo escrito', async () => {
    const ApiError = await ApiErrorDe();
    const onClose = montarCon(
      vi.fn().mockRejectedValue(
        new ApiError(400, ['El nombre puede tener hasta 120 caracteres.'], 'DATOS_INVALIDOS', {
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          campos: [{ campo: 'name', regla: 'longitud_maxima', mensaje: 'El nombre puede tener hasta 120 caracteres.' }],
        }),
      ),
    );
    await llenarYEnviar();

    expect(errorDe('name')?.textContent).toBe('El nombre puede tener hasta 120 caracteres.');
    expect(campo('name').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(campo('name'));
    expect(onClose).not.toHaveBeenCalled();
    expect(campo('email').value).toBe('carlos@inmobiliaria.co');
    expect(dialogo().querySelector('[data-testid="invitacion-error"]')).toBeNull();
  });

  it('un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    const ApiError = await ApiErrorDe();
    const onClose = montarCon(
      vi.fn().mockRejectedValue(
        new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
          statusCode: 500,
          code: 'ERROR_INTERNO',
          referencia: 'a1b2c3d4',
        }),
      ),
    );
    await llenarYEnviar();

    const aviso = dialogo().querySelector('[data-testid="invitacion-error"]')?.textContent ?? '';
    expect(aviso).toContain('No pudimos enviar la invitación: algo falló de nuestro lado');
    expect(aviso).toContain('a1b2c3d4');
    expect(aviso).not.toMatch(/conexi/i);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sin respuesta (status 0) habla de la conexión', async () => {
    montarCon(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await llenarYEnviar();
    expect(dialogo().querySelector('[data-testid="invitacion-error"]')?.textContent).toMatch(/conexi/i);
  });

  it('el 402 del tope de asesores dice el mensaje del back y ofrece «Ver planes»', async () => {
    const ApiError = await ApiErrorDe();
    montarCon(
      vi.fn().mockRejectedValue(
        new ApiError(402, 'Alcanzaste el límite de agentes de tu plan. Sube de plan para agregar más.', 'LIMITE_DEL_PLAN', {
          statusCode: 402,
          code: 'LIMITE_DEL_PLAN',
          limite: 'agentes',
        }),
      ),
    );
    await llenarYEnviar();
    const aviso = dialogo().querySelector('[data-testid="invitacion-error"]') as HTMLElement;
    expect(aviso.textContent).toContain('Alcanzaste el límite de agentes de tu plan');
    expect(aviso.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/upgrade');
  });

  it('un nombre de más de 120 caracteres no se manda (el tope del back)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    montarCon(onSubmit);
    act(() => {
      escribir(campo('name'), 'a'.repeat(121));
      escribir(campo('email'), 'carlos@inmobiliaria.co');
    });
    await act(async () => {
      dialogo().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(errorDe('name')?.textContent).toBe('El nombre puede tener hasta 120 caracteres.');
  });
});

/**
 * 02-10-2026 · El teléfono se pedía (obligatorio para un asesor) y NUNCA se
 * guardaba: `InviteMemberDto` no tiene `phone` y `inviteUser` lo tiraba antes
 * de mandar. Ya no se pide ni viaja.
 */
describe('AgenteFormModal — no pide el teléfono', () => {
  const dialogo = () => document.body.querySelector('[role="dialog"]') as HTMLElement;

  function escribir(input: HTMLInputElement, valor: string) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function montarCon(variant: 'agent' | 'member', onSubmit: (invite: unknown) => Promise<void>) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root!.render(<AgenteFormModal isOpen onClose={vi.fn()} onSubmit={onSubmit} variant={variant} />);
    });
  }

  it.each(['agent', 'member'] as const)('🔴 la variante «%s» no tiene campo de teléfono', (variant) => {
    montarCon(variant, vi.fn().mockResolvedValue(undefined));
    expect(dialogo().querySelector('input[type="tel"]')).toBeNull();
    expect(dialogo().querySelector('[id$="-phone"]')).toBeNull();
    expect(dialogo().textContent).not.toContain('inmobiliaria.agente.phone');
  });

  it.each(['agent', 'member'] as const)('🔴 «%s»: se envía sin teléfono y el cuerpo no lo lleva', async (variant) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    montarCon(variant, onSubmit);
    act(() => {
      escribir(dialogo().querySelector<HTMLInputElement>('input[placeholder="Juan Perez"]')!, 'Carlos Asesor');
      escribir(dialogo().querySelector<HTMLInputElement>('input[placeholder="juan@inmobiliaria.com"]')!, 'carlos@inmobiliaria.co');
    });
    await act(async () => {
      dialogo().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const invite = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(invite).toMatchObject({ name: 'Carlos Asesor', email: 'carlos@inmobiliaria.co', role: 'agente' });
    expect('phone' in invite).toBe(false);
    expect(document.body.querySelector('[id$="-phone-error"]')).toBeNull();
  });
});
