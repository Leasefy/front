/**
 * Cambiar el correo de una invitación pendiente (Portofino, 21-10-2026).
 * Se monta el `Dialog` de verdad (Radix, portal a `document.body`).
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import type { AgencyUser } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { cambiar } = vi.hoisted(() => ({ cambiar: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agencyApi: { cambiarCorreoDeLaInvitacion: cambiar },
}));

import { CambiarCorreoDeLaInvitacion } from './CambiarCorreoDeLaInvitacion';

const persona = {
  id: 'member-laura',
  name: 'Laura Sanchez',
  email: 'operacionesportofinopr@gmail.com',
  role: 'agente',
  status: 'invited',
} as unknown as AgencyUser;

let root: Root;
let host: HTMLDivElement;

function escribir(input: HTMLInputElement, valor: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  set.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function montar(onCambiado = vi.fn(), onCerrar = vi.fn()) {
  await act(async () => {
    root.render(
      <CambiarCorreoDeLaInvitacion persona={persona} onCerrar={onCerrar} onCambiado={onCambiado} />,
    );
  });
  const input = document.querySelector<HTMLInputElement>('[data-testid="correo-nuevo-de-la-invitacion"]')!;
  const enviar = document.querySelector<HTMLButtonElement>('[data-testid="enviar-al-correo-nuevo"]')!;
  return { input, enviar, onCambiado, onCerrar };
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  cambiar.mockReset();
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('CambiarCorreoDeLaInvitacion', () => {
  it('abre con el correo de hoy y, con el mismo, ofrece reenviar', async () => {
    const { input, enviar } = await montar();
    expect(input.value).toBe('operacionesportofinopr@gmail.com');
    expect(enviar.textContent).toContain('Reenviar la invitación');
  });

  it('manda el correo nuevo (limpio) y cierra', async () => {
    cambiar.mockResolvedValue({ id: 'm2', emailDelivered: true });
    const { input, enviar, onCambiado, onCerrar } = await montar();
    await act(async () => escribir(input, ' Laura@Portofino.co '));
    expect(enviar.textContent).toContain('Enviar al correo nuevo');
    await act(async () => enviar.click());
    expect(cambiar).toHaveBeenCalledWith('member-laura', { email: 'laura@portofino.co' });
    expect(onCambiado).toHaveBeenCalledWith({ id: 'm2', emailDelivered: true }, 'laura@portofino.co');
    expect(onCerrar).toHaveBeenCalled();
  });

  it('un correo mal escrito se dice bajo el campo, sin llamar al back', async () => {
    const { input, enviar } = await montar();
    await act(async () => escribir(input, 'laura@'));
    await act(async () => enviar.click());
    expect(cambiar).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Escribe un correo válido.');
  });

  it('si el correo nuevo es de otra persona sale el aviso de invitar, y «dárselo» reenvía con la decisión', async () => {
    cambiar
      .mockRejectedValueOnce(
        new ApiError(409, 'Este correo quedó como el usuario de Jose (inquilino)…', 'CORREO_DE_OTRA_PERSONA', {
          code: 'CORREO_DE_OTRA_PERSONA',
          relacion: 'inquilino',
          nombreDeLaCuenta: 'Jose',
          sePuedeDarAlInvitado: true,
        } as never),
      )
      .mockResolvedValueOnce({ id: 'm3', emailDelivered: true });
    const { input, enviar } = await montar();
    await act(async () => escribir(input, 'otra@x.co'));
    await act(async () => enviar.click());
    expect(document.querySelector('[data-testid="aviso-del-correo"]')).not.toBeNull();
    await act(async () => document.querySelector<HTMLButtonElement>('[data-testid="dar-el-correo"]')!.click());
    expect(cambiar).toHaveBeenLastCalledWith('member-laura', { email: 'otra@x.co', elCorreoEsDelInvitado: true });
  });
});
