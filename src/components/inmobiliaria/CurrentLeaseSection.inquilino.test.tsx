/**
 * 🔴 Nico, 2026-09-12: «no veo como información en el inmueble al inquilino,
 * que también se debería de poder hablarle por mensajes de Leasefy».
 *
 * Lo que se fija acá:
 *  · El inquilino del contrato vigente manda sobre `currentTenantName`, que
 *    es una copia suelta que la activación escribe.
 *  · El botón de Leasefy sólo aparece con cuenta de portal — sin cuenta no
 *    hay a quién escribirle.
 *  · «Ver contrato» deja de ser un botón apagado: ahora se sabe CUÁL contrato.
 *  · Un back anterior al 2026-09-12 no manda `inquilino`, y la tarjeta tiene
 *    que seguir mostrando lo que siempre mostró.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion, InquilinoDeLaConsignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, formatDate: () => '31 dic 2026' }),
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { CurrentLeaseSection } from './ConsignacionDetailSections';

const INQUILINO: InquilinoDeLaConsignacion = {
  contractId: 'contract-9',
  nombre: 'Veronica Durango Montoya',
  documento: '1007102565',
  correo: 'veronica@example.com',
  telefono: '3014691688',
  cuentaDePortalId: 'user-veronica',
};

const consignacion = (over: Partial<Consignacion> = {}): Consignacion =>
  ({
    id: 'consig-1',
    availability: 'rented',
    currentTenantName: 'VERONICA DURANGO MONTOYA',
    monthlyRent: 1_500_000,
    leaseEndDate: '2026-12-31',
    ...over,
  }) as Consignacion;

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

async function pintar(c: Consignacion) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<CurrentLeaseSection consignacion={c} />);
  });
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

describe('<CurrentLeaseSection> — el inquilino', () => {
  it('🔴 muestra su nombre, su documento y las tres formas de hablarle', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }));

    expect(q('inquilino-nombre')?.textContent).toBe('Veronica Durango Montoya');
    expect(container.querySelector('a[href="mailto:veronica@example.com"]')).not.toBeNull();
    expect(container.querySelector('a[href="tel:3014691688"]')).not.toBeNull();
    expect(q('contacto-inquilino')?.textContent).toContain('Mensaje');
  });

  /* «Documento» y no «CC»: el tipo no se guarda en ningún lado. */
  it('el documento acompaña al rótulo sin inventarle la sigla', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }));

    expect(container.textContent).toContain('Documento 1007102565');
    expect(container.textContent).not.toContain('CC 1007102565');
  });

  /* Sin cuenta de portal no se ofrece escribirle; el resto sigue. */
  it('sin cuenta de portal no se dibuja el mensaje de Leasefy', async () => {
    await pintar(consignacion({ inquilino: { ...INQUILINO, cuentaDePortalId: null } }));

    expect(q('contacto-inquilino')?.textContent).not.toContain('Mensaje');
    expect(container.querySelector('a[href^="mailto:"]')).not.toBeNull();
  });

  /*
   * 🔴 Estuvo apagado con un «próximamente» desde siempre, no porque la
   * pantalla faltara sino porque acá no se sabía cuál contrato era.
   */
  it('«Ver contrato» lleva al contrato, y sabe de dónde se vino', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }));

    const enlace = q('ver-contrato-del-inquilino') as HTMLAnchorElement | null;
    expect(enlace).not.toBeNull();
    expect(enlace!.getAttribute('href')).toBe(
      '/panel/inmobiliaria/contratos/contract-9?volver=' +
        encodeURIComponent('/panel/inmobiliaria/inmuebles/consig-1'),
    );
  });

  /*
   * El contrato es el hecho; `availability` es una columna que alguien pudo
   * dejar sin actualizar. Con contrato vigente hay inquilino igual.
   */
  it('con contrato vigente se muestra aunque la disponibilidad diga otra cosa', async () => {
    await pintar(consignacion({ availability: 'available', inquilino: INQUILINO }));

    expect(q('inquilino-nombre')?.textContent).toBe('Veronica Durango Montoya');
  });

  it('un back que todavía no manda el inquilino sigue mostrando el nombre suelto', async () => {
    await pintar(consignacion({ inquilino: null }));

    expect(q('inquilino-nombre')?.textContent).toBe('VERONICA DURANGO MONTOYA');
    // Y no inventa contacto donde no lo hay.
    expect(q('contacto-inquilino')).toBeNull();
    expect(q('ver-contrato-del-inquilino')).toBeNull();
  });

  it('un inmueble disponible y sin contrato dice que no hay inquilino', async () => {
    await pintar(
      consignacion({ availability: 'available', currentTenantName: undefined, inquilino: null }),
    );

    expect(q('inquilino-nombre')).toBeNull();
    expect(container.textContent).toContain('noTenant');
  });
});
