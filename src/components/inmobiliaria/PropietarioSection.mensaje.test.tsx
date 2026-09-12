/**
 * 🔴 Nico, 2026-09-12: «desde el inmueble al propietario podamos hablarle no
 * sólo por email o teléfono sino por los mensajes de Leasefy».
 *
 * El correo y el teléfono se van del producto: lo que se habla ahí no queda
 * en ningún lado y el siguiente agente que abra la ficha no sabe qué se dijo.
 * El hilo directo sí queda, y lo ve cualquier miembro de la inmobiliaria.
 *
 * Lo que se fija acá es la condición que lo hace posible o imposible: la
 * ficha de `Propietario` es COMERCIAL y no es un usuario. Sin cuenta de
 * portal no hay a quién escribirle, y un botón que no puede hacer nada es
 * peor que ninguno.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Propietario } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, formatDate: () => '' }) }));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
const { invitarAlPortal } = vi.hoisted(() => ({ invitarAlPortal: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { invitarAlPortal },
}));

import { PropietarioSection } from './ConsignacionDetailSections';

const propietario = (over: Partial<Propietario> = {}): Propietario =>
  ({
    id: 'p-1',
    name: 'Margarita Maria Correa Ochoa',
    documentType: 'CC',
    documentNumber: '39167882',
    email: 'margarita@example.com',
    phone: '3001234567',
    ...over,
  }) as Propietario;

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(p: Propietario) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<PropietarioSection propietario={p} />);
  });
}

const botones = () =>
  [...container.querySelectorAll('button, a')].map((b) => b.textContent?.trim());
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  invitarAlPortal.mockReset();
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

describe('<PropietarioSection> — escribirle por Leasefy', () => {
  it('🔴 con cuenta de portal ofrece el mensaje, junto al correo y al teléfono', async () => {
    await pintar(propietario({ cuentaDePortalId: 'u-9' }));

    const texto = botones().join(' | ');
    expect(texto).toContain('Mensaje');
    // Y los de siempre siguen: el mensaje se SUMA, no reemplaza nada.
    expect(container.querySelector('a[href^="mailto:"]')).not.toBeNull();
    expect(container.querySelector('a[href^="tel:"]')).not.toBeNull();
  });

  /*
   * 🔴 Sin cuenta de portal no hay a quién escribirle — pero el HUECO no es la
   * respuesta. Nico abrió la ficha de una propietaria suya el 2026-09-12 y
   * leyó ese espacio vacío como «no le colocaste la opción». De las dos
   * lecturas posibles, la equivocada es la que se saca cualquiera. En su
   * cartera son 1.676 de 1.733 fichas.
   */
  it('🔴 sin cuenta de portal lo DICE y ofrece invitarlo, en vez de un hueco', async () => {
    await pintar(propietario({ cuentaDePortalId: null }));

    expect(botones().join(' | ')).not.toContain('Mensaje');
    expect(q('propietario-sin-cuenta')?.textContent).toContain('No tiene cuenta en Leasefy');
    expect((q('invitar-propietario') as HTMLButtonElement).disabled).toBe(false);
    // Y los de siempre siguen ahí.
    expect(container.querySelector('a[href^="mailto:"]')).not.toBeNull();
  });

  /* Sin correo no hay a dónde mandar nada: se dice, y el botón no miente. */
  it('sin correo el aviso explica qué falta y no ofrece invitar', async () => {
    await pintar(propietario({ cuentaDePortalId: null, email: undefined }));

    expect(q('propietario-sin-cuenta')?.textContent).toContain('Agrega su correo');
    expect((q('invitar-propietario') as HTMLButtonElement).disabled).toBe(true);
  });

  it('un back que todavía no manda el campo se comporta como «sin cuenta»', async () => {
    await pintar(propietario());

    expect(botones().join(' | ')).not.toContain('Mensaje');
    expect(q('propietario-sin-cuenta')).not.toBeNull();
  });

  /*
   * 🔴 Después de invitar, el mensaje aparece SIN recargar: el back ya
   * confirmó la cuenta. Hacer recargar la ficha entera para ver un botón que
   * el servidor ya dio es hacer esperar de gusto.
   */
  it('al invitar, el mensaje aparece en el acto', async () => {
    invitarAlPortal.mockResolvedValue({ cuentaDePortalId: 'user-nuevo', enviada: true });
    await pintar(propietario({ cuentaDePortalId: null }));

    await act(async () => {
      (q('invitar-propietario') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(invitarAlPortal).toHaveBeenCalledWith('p-1');
    expect(botones().join(' | ')).toContain('Mensaje');
    expect(q('propietario-sin-cuenta')).toBeNull();
  });

  /*
   * La cuenta quedó creada aunque el correo no saliera, así que el mensaje
   * funciona igual — lo que falló se dice por otro lado.
   */
  it('si el correo no sale, el mensaje igual queda disponible', async () => {
    invitarAlPortal.mockResolvedValue({
      cuentaDePortalId: 'user-nuevo',
      enviada: false,
      motivo: 'ENVIO_FALLIDO',
    });
    await pintar(propietario({ cuentaDePortalId: null }));

    await act(async () => {
      (q('invitar-propietario') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(botones().join(' | ')).toContain('Mensaje');
  });
});
