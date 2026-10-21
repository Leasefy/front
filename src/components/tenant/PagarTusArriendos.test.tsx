/**
 * 🔴 «Selecciona qué vas a pagar» (Nico, 21-10-2026). Ubermensch arrienda una
 * oficina en Caldas y una casa en Sabaneta: «Pagos» le mostraba $6.200.000 sin
 * decir de qué casa. Ahora cada cuota va bajo su inmueble (con el contrato),
 * dice de qué es y se paga lo que él marque, de uno o de los dos, en un pago.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let caja: HTMLDivElement | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  caja?.remove();
  root = null;
  vi.unstubAllGlobals();
});

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${Math.round(n).toLocaleString('es-CO')}`, locale: 'es', t: (k: string) => k }),
}));
vi.mock('@/lib/api/client', () => ({ getAccessToken: () => 'token-de-prueba' }));

import { PagarTusArriendos } from './PagarTusArriendos';
import type { ArriendoQueSePuedePagar } from '@/lib/api/pago-en-linea.service';

const oficina: ArriendoQueSePuedePagar = {
  leaseId: 'lease-oficina',
  contractId: 'c-oficina',
  contratoNumero: 1801,
  inmueble: { titulo: 'Oficina en Centro, Caldas', direccion: 'Calle 130 Sur # 50-23', ciudad: 'Caldas' },
  inmobiliaria: 'victor inmobiliaria8',
  aplica: true,
  cuotas: [
    {
      id: 'q-oficina',
      cuotaId: 'q-oficina',
      mes: '2026-11',
      vence: '2026-11-01',
      vencida: false,
      valorCop: 1_271_471,
      interesCop: 0,
      lineas: [
        { nombre: 'Canon de noviembre', valorCop: 1_100_840, resta: false },
        { nombre: 'IVA sobre el canon', valorCop: 209_160, resta: false },
        { nombre: 'Retención en la fuente', valorCop: 38_529, resta: true },
      ],
      abonadoCop: 0,
    },
  ],
  totalVencidoCop: 0,
  enVerificacion: null,
  ultimoRechazo: null,
};
const casa: ArriendoQueSePuedePagar = {
  ...oficina,
  leaseId: 'lease-casa',
  contractId: 'c-casa',
  contratoNumero: 1820,
  inmueble: { titulo: 'Casa en Sabaneta Barrio, Sabaneta', direccion: 'Carrera 45 # 70 Sur-12', ciudad: 'Sabaneta' },
  cuotas: [{ id: 'q-casa', cuotaId: 'q-casa', mes: '2026-11', vence: '2026-11-01', vencida: false, valorCop: 6_200_000, interesCop: 0 }],
};

function pintar(arriendos: ArriendoQueSePuedePagar[]) {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  root = createRoot(caja);
  act(() => root!.render(<PagarTusArriendos arriendos={arriendos} />));
  return caja;
}
const click = (el: Element | null) => act(() => (el as HTMLElement).click());
const casillaDe = (c: HTMLElement, leaseId: string) => c.querySelector(`[data-testid="inmueble-${leaseId}"] [role="checkbox"]`);

describe('PagarTusArriendos', () => {
  it('🔴 cada cuota va bajo su inmueble, con el contrato; nada marcado de entrada', () => {
    const c = pintar([oficina, casa]);
    const texto = c.textContent ?? '';
    expect(texto).toContain('Selecciona qué vas a pagar');
    expect(texto).toContain('Oficina en Centro, Caldas');
    expect(texto).toContain('Casa en Sabaneta Barrio, Sabaneta');
    expect(texto).toMatch(/Contrato N\.º\s*1801/);
    expect(texto).toMatch(/Contrato N\.º\s*1820/);
    expect(c.querySelector('[data-testid="pagar"]')?.textContent).toBe('Escoge al menos una cuota');
  });

  it('🔴 se pagan las de los dos inmuebles en un solo pago: el total suma y la confirmación dice qué es de cada uno', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ message: 'para la prueba' }), { status: 409 }));
    vi.stubGlobal('fetch', fetch);
    const c = pintar([oficina, casa]);
    click(casillaDe(c, oficina.leaseId));
    click(casillaDe(c, casa.leaseId));
    expect(c.querySelector('[data-testid="pagar"]')?.textContent).toBe('Pagar $ 7.471.471');
    click(c.querySelector('[data-testid="pagar"]'));
    const confirmar = c.querySelector('[data-testid="confirmar-pago"]')?.textContent ?? '';
    expect(confirmar).toContain('la cuota de noviembre de 2026 de Oficina en Centro, Caldas y la cuota de noviembre de 2026 de Casa en Sabaneta Barrio, Sabaneta');
    await act(async () => {
      (c.querySelector('[data-testid="ir-a-wompi"]') as HTMLElement).click();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/inquilino/pagos/varios/wompi-session');
    expect(JSON.parse(String(init.body))).toEqual({
      arriendos: [
        { leaseId: oficina.leaseId, cuotas: 1 },
        { leaseId: casa.leaseId, cuotas: 1 },
      ],
    });
  });

  it('«Ver de qué es» abre el desglose: canon, IVA y la retención que resta', () => {
    const c = pintar([oficina]);
    click(c.querySelector('[data-testid="ver-desglose-2026-11"]'));
    const desglose = c.querySelector('[data-testid="desglose-2026-11"]')?.textContent ?? '';
    expect(desglose).toContain('Canon de noviembre');
    expect(desglose).toContain('IVA sobre el canon');
    expect(desglose).toMatch(/Retención en la fuente−\$ 38\.529/);
    expect(desglose).toContain('Lo que pagas de esta cuota');
  });

  it('un inmueble con un pago esperando a Wompi lo dice y no deja marcar sus cuotas', () => {
    const enCurso = { ...casa, enVerificacion: { solicitudId: 's', valorCop: 6_200_000, desde: '2026-10-21T10:00:00Z', conTransaccion: true } };
    const c = pintar([oficina, enCurso]);
    expect(c.querySelector(`[data-testid="inmueble-${casa.leaseId}"] [data-testid="pago-en-verificacion"]`)).not.toBeNull();
    expect(casillaDe(c, casa.leaseId)?.hasAttribute('disabled')).toBe(true);
  });
});
