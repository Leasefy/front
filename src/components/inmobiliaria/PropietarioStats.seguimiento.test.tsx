/**
 * PropietarioStats — 🔴 P-10 (SEGUIMIENTO-FRONT, back 5731a4e2): `pendingBalance`
 * ya es el GIRO ATRASADO (vencido y sin girar, la fuente del estado de cuenta),
 * con cuántas cuotas y desde cuándo; lo generado en Dispersiones viene aparte
 * (`generadoSinGirar`). La alerta decía «son dispersiones ya generadas» sobre
 * ese número. Preparación copiada de `PropietarioStats.test.tsx`.
 *
 * (Cabecera original:) PropietarioStats — las alertas dicen qué pasó, qué hacer y traen el botón.
 *
 * Nico (2026-09-02 13:23): «Atención requerida · la ocupación está por
 * debajo del 70 %» sobre un propietario con CERO inmuebles. Ni se entiende
 * ni hay nada que hacer ahí.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion, Propietario } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
    locale: 'es',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}));

import { PropietarioStats } from './PropietarioStats';

const base: Propietario = {
  id: 'p1',
  name: 'Ana',
  email: null,
  phone: null,
  documentType: 'CC',
  documentNumber: '1',
  bankAccount: { bank: 'bancolombia', accountType: 'savings', accountNumber: '123', accountHolder: 'Ana' },
  propertyCount: 0,
  activeLeases: 0,
  totalMonthlyRent: 0,
  pendingBalance: 0,
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
};

const mandato = (over: Partial<Consignacion>): Consignacion =>
  ({ id: 'c1', propertyTitle: 'Apto 501', listingType: 'rent', availability: 'rented', ...over }) as Consignacion;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(props: Partial<React.ComponentProps<typeof PropietarioStats>>) {
  act(() => {
    root.render(React.createElement(PropietarioStats, { propietario: base, variant: 'full', ...props }));
  });
}

const alertas = () => Array.from(container.querySelectorAll('[role="alert"]')).map((a) => a.getAttribute('data-testid'));

describe('<PropietarioStats> — P-10: el giro atrasado y lo generado, cada uno con su nombre', () => {
  it('🔴 la alerta del atraso dice cuántos giros y desde cuándo, y lo generado aparte', () => {
    render({
      propietario: {
        ...base,
        pendingBalance: 23_698_900,
        girosVencidos: 13,
        giroVencidoDesde: '2025-11-01',
        generadoSinGirar: 3_656_150,
      },
      consignaciones: [],
    });
    const a = container.querySelector('[data-testid="alerta-pendiente-de-giro"]')!;
    expect(a.textContent).toContain('inmobiliaria.propietario.alertas.pendienteDeGiro.titulo($23.698.900)');
    expect(a.textContent).toContain('inmobiliaria.propietario.giros.variosDesde(13,1 nov 2025)');
    expect(a.textContent).toContain('inmobiliaria.propietario.alertas.pendienteDeGiro.generado($3.656.150)');
    // El generado NO es otra alerta cuando ya hay atraso: va dicho dentro.
    expect(container.querySelector('[data-testid="alerta-generado-sin-girar"]')).toBeNull();
  });

  it('🔴 la franja: «Giro atrasado» con el detalle de los giros (no «Último giro»)', () => {
    render({
      propietario: { ...base, pendingBalance: 500_000, girosVencidos: 1, giroVencidoDesde: '2026-10-01', lastPaymentDate: '2026-09-03T12:00:00Z' },
      consignaciones: [],
    });
    const franja = container.querySelector('[data-testid="resumen-del-propietario"]')!.textContent ?? '';
    expect(franja).toContain('$500.000');
    expect(franja).toMatch(/inmobiliaria\.propietario\.giros\.unoDesde\(1 oct/);
  });

  it('🔴 sin atraso pero con dispersiones generadas: «Al día» y una alerta informativa de lo generado', () => {
    render({
      propietario: { ...base, pendingBalance: 0, girosVencidos: 0, giroVencidoDesde: null, generadoSinGirar: 1_200_000 },
      consignaciones: [],
    });
    expect(container.querySelector('[data-testid="alerta-pendiente-de-giro"]')).toBeNull();
    const a = container.querySelector<HTMLElement>('[data-testid="alerta-generado-sin-girar"]')!;
    expect(a).not.toBeNull();
    expect(a.getAttribute('data-severidad')).toBe('info');
    expect(a.textContent).toContain('inmobiliaria.propietario.alertas.generadoSinGirar.titulo($1.200.000)');
    expect(container.querySelector('[data-testid="resumen-del-propietario"]')!.textContent).toContain(
      'inmobiliaria.propietario.stats.upToDate',
    );
  });

  it('con la plata oculta (asesor) no hay alerta de giros ni de lo generado', () => {
    render({
      propietario: { ...base, plataOculta: true, pendingBalance: null as unknown as number, generadoSinGirar: null },
      consignaciones: [],
    });
    expect(container.querySelector('[data-testid="alerta-pendiente-de-giro"]')).toBeNull();
    expect(container.querySelector('[data-testid="alerta-generado-sin-girar"]')).toBeNull();
  });
});
