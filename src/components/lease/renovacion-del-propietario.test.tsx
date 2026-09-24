/**
 * 🔴 El botón de renovación en el panel del PROPIETARIO (21-09-2026).
 *
 * Era un aviso de «Próximamente podrás renovar contratos desde aquí» en el
 * botón PRIMARIO de la tarjeta, y sólo aparecía cuando al contrato le quedaban
 * 60 días o menos — o sea, exactamente cuando al dueño más le importa. Era
 * falso de dos maneras: el propietario no renueva (lo hace la inmobiliaria, y
 * el back lo tiene en `inmobiliaria/renovaciones`), y lo que sí puede hacer
 * —pedirle algo a su inmobiliaria— ya existía.
 *
 * Lo que fija esta prueba:
 * - nunca más la palabra «Próximamente» en esta tarjeta;
 * - el botón lleva al único canal real del propietario;
 * - la tarjeta dice QUIÉN renueva, que es lo que explica por qué él no;
 * - y nada de esto aparece si al contrato le falta mucho: un aviso de
 *   renovación a 10 meses del vencimiento es ruido.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Lease } from '@/lib/types/lease';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('@/lib/hooks/useLeases', () => ({
  useLeasePayments: () => ({
    payments: [],
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
}));

import { LeaseExpandableItem } from './LeaseExpandableItem';

function arriendo(diasQueFaltan: number): Lease {
  const fin = new Date(Date.now() + diasQueFaltan * 24 * 60 * 60 * 1000);
  return {
    id: 'lease-1',
    contractId: 'contrato-1',
    propertyId: 'inmueble-1',
    landlordId: 'dueno-1',
    tenantId: 'inquilino-1',
    status: 'active',
    monthlyRent: 2_500_000,
    startDate: '2025-10-01',
    endDate: fin.toISOString().slice(0, 10),
    paymentDay: 5,
    propertyTitle: 'Apto 301 — El Poblado',
    propertyAddress: 'Calle 10 #43-20',
    propertyCity: 'Medellín',
    propertyThumbnail: '',
    tenantName: 'Ana Pérez',
  } as unknown as Lease;
}

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  router.push.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

/** La tarjeta nace cerrada; las acciones viven adentro. */
async function montarYAbrir(lease: Lease) {
  await act(async () => {
    raiz.render(<LeaseExpandableItem lease={lease} />);
  });
  const cabecera = contenedor.querySelector<HTMLButtonElement>('button')!;
  await act(async () => {
    cabecera.click();
  });
}

function boton(texto: string) {
  return [...contenedor.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(texto),
  );
}

describe('la renovación en la tarjeta del propietario', () => {
  it('no promete nada: no dice «Próximamente» en ningún lado', async () => {
    await montarYAbrir(arriendo(20));
    expect(contenedor.textContent).not.toContain('Próximamente');
  });

  it('el botón lleva al canal real del propietario, no a un aviso', async () => {
    await montarYAbrir(arriendo(20));
    const b = boton('Hablar de la renovación')!;
    expect(b).toBeTruthy();
    await act(async () => {
      b.click();
    });
    expect(router.push).toHaveBeenCalledWith('/panel/solicitudes/nueva');
  });

  it('dice quién prepara la renovación, que es por qué el dueño no la hace', async () => {
    await montarYAbrir(arriendo(20));
    const linea = contenedor.querySelector('[data-testid="quien-renueva"]');
    expect(linea?.textContent).toContain('tu inmobiliaria');
  });

  it('a un contrato que le falta mucho no le habla de renovar', async () => {
    await montarYAbrir(arriendo(300));
    expect(contenedor.querySelector('[data-testid="quien-renueva"]')).toBeNull();
    expect(boton('Hablar de la renovación')).toBeUndefined();
  });
});
