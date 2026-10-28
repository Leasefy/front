/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PipelineItem } from '@/lib/types/inmobiliaria';

const datos = vi.hoisted(() => ({ items: [] as PipelineItem[] }));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ user: { firstName: 'Laura', lastName: 'Gómez' } }) }));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePipelineItems: () => ({ pipelineItems: datos.items, isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: { getAgenda: vi.fn(async () => ({ eventos: [], resumen: {}, total: 0, page: 1, pageSize: 50 })) },
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { TuDia } from './TuDia';

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;
async function montar() {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => {
    raiz!.render(<TuDia />);
  });
  for (let i = 0; i < 3; i++) await act(async () => {});
}
afterEach(() => {
  act(() => raiz?.unmount());
  caja?.remove();
  document.body.innerHTML = '';
});
const por = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe('«Tu día» en pantalla', () => {
  it('sin nadie esperando: lo dice con su 3D, nunca una lista vacía', async () => {
    datos.items = [];
    await montar();
    expect(por('tu-dia-al-dia')?.textContent).toContain('Estás al día');
  });

  it('quien escribió y no tiene respuesta sale con «Llamar», WhatsApp y la llamada preparada', async () => {
    datos.items = [
      {
        id: 'p1',
        stage: 'lead',
        candidateName: 'Camila Restrepo',
        candidatePhone: '3001234567',
        propertyTitle: 'Apartamento en Laureles',
        propertyAddress: 'Cra 76',
        monthlyRent: 2_800_000,
        daysInStage: 0,
        createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
      } as PipelineItem,
    ];
    await montar();
    const tarjeta = por('llamada-p1')!;
    expect(tarjeta.getAttribute('data-motivo')).toBe('sin_respuesta');
    expect(tarjeta.textContent).toContain('Sin responder');
    expect(por('llamar-p1')?.getAttribute('href')).toBe('tel:+573001234567');
    await act(async () => por('preparar-p1')!.click());
    expect(por('preparacion-p1')?.textContent).toContain('Hola Camila, te habla Laura');
    expect(por('preparacion-p1')?.textContent).toContain('Agendar la visita');
  });
});
