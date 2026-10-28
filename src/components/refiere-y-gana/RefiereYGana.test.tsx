/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { ColegaReferido, MiRefiereYGana } from '@/lib/api/refiere-y-gana.service';

const api = vi.hoisted(() => ({ mio: vi.fn(), codigo: vi.fn(), usar: vi.fn() }));
vi.mock('@/lib/api/refiere-y-gana.service', () => ({ refiereYGanaApi: api }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { RefiereYGana } from './RefiereYGana';

const colega = (i: number, o: Partial<ColegaReferido> = {}): ColegaReferido => ({
  id: `r${i}`,
  nombre: `Colega ${i}`,
  tipo: 'inmobiliaria',
  estado: 'registrado',
  premio: null,
  registradoEn: '2026-10-20T15:00:00Z',
  pagoEn: null,
  aplicadoEn: null,
  aplicadoHasta: null,
  ...o,
});
const datos = (o: Partial<MiRefiereYGana> = {}): MiRefiereYGana => ({
  puedeReferir: true,
  estado: 'pagado',
  codigo: 'valle-k7m2',
  tope: 3,
  anio: 2026,
  ganadosEsteAnio: 1,
  porUsar: 1,
  diasGratisDelReferido: 30,
  diasDelEnlace: 30,
  referidos: [colega(1, { nombre: 'Inmobiliaria Verifica', estado: 'pago', premio: 'mes', pagoEn: '2026-10-25T15:00:00Z' }), colega(2, { nombre: 'Laura Gómez', tipo: 'agente' })],
  ...o,
});

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;
async function montar() {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => {
    raiz!.render(<RefiereYGana rutaDelPlan="/panel/inmobiliaria/upgrade" />);
  });
  for (let i = 0; i < 3; i++) await act(async () => {});
}
afterEach(() => {
  act(() => raiz?.unmount());
  caja?.remove();
  document.body.innerHTML = '';
  vi.clearAllMocks();
});
const por = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe('Refiere y gana en pantalla', () => {
  it('quien paga ve su enlace, su código, el WhatsApp y sus meses del año', async () => {
    api.mio.mockResolvedValue(datos());
    await montar();
    expect(por('el-enlace')?.textContent).toMatch(/\/r\/valle-k7m2$/);
    expect(por('el-codigo')?.textContent).toBe('valle-k7m2');
    expect(por('mandar-por-whatsapp')?.getAttribute('href')).toContain('wa.me');
    expect(por('ganados-este-anio')?.textContent).toBe('Llevas 1 de 3 este año');
    expect(por('tus-meses')?.textContent).toContain('Un mes por usar');
  });

  it('lista a los colegas con su estado y los filtra', async () => {
    api.mio.mockResolvedValue(datos());
    await montar();
    const lista = por('lista-de-colegas');
    expect(lista?.textContent).toContain('Inmobiliaria Verifica');
    expect(lista?.textContent).toContain('Ganaste un mes');
    expect(lista?.textContent).toContain('Agente inmobiliario');
    const enSuMes = [...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('En su mes gratis'));
    await act(async () => enSuMes?.click());
    expect(por('lista-de-colegas')?.textContent).not.toContain('Inmobiliaria Verifica');
    expect(por('lista-de-colegas')?.textContent).toContain('Laura Gómez');
  });

  it('pagina de a 10', async () => {
    api.mio.mockResolvedValue(datos({ referidos: Array.from({ length: 14 }, (_, i) => colega(i)) }));
    await montar();
    expect(por('lista-de-colegas')?.querySelectorAll('li')).toHaveLength(10);
  });

  it('quien no paga no tiene enlace: ve el programa y «Ver mi plan»', async () => {
    api.mio.mockResolvedValue(datos({ puedeReferir: false, estado: 'gratis', codigo: null, referidos: [] }));
    await montar();
    expect(por('tu-enlace')).toBeNull();
    expect(por('sin-plan-todavia')?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/upgrade');
    expect(por('sin-colegas')).not.toBeNull();
    expect(por('como-funciona-refiere')?.textContent).toContain('Paga y tú ganas un mes');
  });

  it('sin la migración dice que todavía no está activo, sin un error rojo', async () => {
    api.mio.mockRejectedValue(new ApiError(503, 'x', 'FALTA_UNA_MIGRACION'));
    await montar();
    expect(document.body.textContent).toContain('todavía no está activo');
    expect(por('como-funciona-refiere')).not.toBeNull();
  });
});
