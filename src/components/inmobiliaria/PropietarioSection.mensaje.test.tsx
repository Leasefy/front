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
import { describe, it, expect, vi, afterEach } from 'vitest';
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
   * 🔴 Sin cuenta de portal no hay a quién escribirle: la ficha del
   * propietario es de la inmobiliaria, no un usuario del producto.
   */
  it('sin cuenta de portal NO se dibuja, y el correo y el teléfono siguen ahí', async () => {
    await pintar(propietario({ cuentaDePortalId: null }));

    expect(botones().join(' | ')).not.toContain('Mensaje');
    expect(container.querySelector('a[href^="mailto:"]')).not.toBeNull();
  });

  it('un back que todavía no manda el campo se comporta como «sin cuenta»', async () => {
    await pintar(propietario());

    expect(botones().join(' | ')).not.toContain('Mensaje');
  });
});
