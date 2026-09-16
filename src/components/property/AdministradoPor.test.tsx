/**
 * AdministradoPor — el logo de quien administra el inmueble en el marketplace.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('next/image', () => ({
  default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} />,
}));

import { AdministradoPor, esLeasefy, iniciales } from './AdministradoPor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LEASEFY = '6d37b582-9b9c-4026-bf9a-c96ed4d75b9a';
let root: Root | null = null;
let c: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  c?.remove();
  vi.unstubAllEnvs();
});

function montar(administrador: { agencyId: string | null; nombre: string; logoUrl: string | null }) {
  c = document.createElement('div');
  document.body.appendChild(c);
  root = createRoot(c);
  act(() => root!.render(<AdministradoPor administrador={administrador} />));
}

describe('AdministradoPor', () => {
  it('iniciales: dos palabras, o las dos primeras letras de una', () => {
    expect(iniciales('victor inmobiliaria8')).toBe('VI');
    expect(iniciales('Arriendos')).toBe('AR');
    expect(iniciales('  ')).toBe('·');
  });

  it('Leasefy se reconoce por su inmobiliaria; sin la variable, nadie es Leasefy', () => {
    expect(esLeasefy(LEASEFY)).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_LEASEFY_AGENCY_ID', LEASEFY);
    expect(esLeasefy(LEASEFY)).toBe(true);
    expect(esLeasefy('otra')).toBe(false);
    expect(esLeasefy(null)).toBe(false);
  });

  it('una inmobiliaria con logo muestra su logo y su nombre', () => {
    montar({ agencyId: 'a-1', nombre: 'Arriendos del Sur', logoUrl: 'https://x.supabase.co/logo.png' });
    expect(c!.querySelector('img')?.getAttribute('src')).toBe('https://x.supabase.co/logo.png');
    expect(c!.textContent).toContain('Administrado por Arriendos del Sur');
  });

  it('sin logo, el espacio se llena con sus iniciales', () => {
    montar({ agencyId: 'a-2', nombre: 'victor inmobiliaria8', logoUrl: null });
    expect(c!.querySelector('img')).toBeNull();
    expect(c!.querySelector('[data-testid="logo-del-administrador"]')?.textContent).toBe('VI');
  });

  it('la de Leasefy muestra el símbolo real y dice Leasefy, aunque tenga una imagen subida', () => {
    vi.stubEnv('NEXT_PUBLIC_LEASEFY_AGENCY_ID', LEASEFY);
    montar({ agencyId: LEASEFY, nombre: 'Leasefy.co', logoUrl: 'https://x.supabase.co/leasefy.png' });
    expect(c!.querySelector('img')).toBeNull();
    expect(c!.querySelector('[data-testid="logo-del-administrador"] svg')).not.toBeNull();
    expect(c!.textContent).toContain('Administrado por Leasefy');
  });
});
