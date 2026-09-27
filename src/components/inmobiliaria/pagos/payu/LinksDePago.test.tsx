/**
 * «Links de pago (Payu)» contra DOBLES de `GET /inmobiliaria/cobros/links` (el
 * back se construye en paralelo; la forma está fijada en `payu-api-front.md`).
 *
 * Lo que no puede pasar:
 *   · un estado dicho sólo con color (cada pastilla lleva icono y palabra);
 *   · un botón «Enviar link» (Nico eligió el cron, no el pedido manual);
 *   · pedir la página 3 del mes nuevo al cambiar de mes o de estado.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}));

const pantalla = { movil: false };
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => pantalla.movil }));

// El Select de Radix no se opera en happy-dom: el doble pinta cada opción como botón.
vi.mock('@/components/ui/select', async () => {
  const R = await import('react');
  const Ctx = R.createContext<(v: string) => void>(() => undefined);
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children?: React.ReactNode }) =>
      R.createElement(Ctx.Provider, { value: onValueChange }, R.createElement('div', { 'data-select': value }, children)),
    SelectTrigger: ({ children, ...resto }: { children?: React.ReactNode } & Record<string, unknown>) =>
      R.createElement('div', resto, children),
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children),
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => {
      const elegir = R.useContext(Ctx);
      return R.createElement('button', { type: 'button', 'data-opcion': value, onClick: () => elegir(value) }, children);
    },
  };
});

// ── El doble de la ruta ─────────────────────────────────────────────────────
const get = vi.fn();
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { get: (...a: unknown[]) => get(...a) },
}));

import { LinksDePago } from './LinksDePago';
import { mesActual } from '@/lib/recaudo/meses';
import type { LinkDePagoDeCuota, PaginaDeLinksDePago } from '@/lib/types/payu';

const link = (parcial: Partial<LinkDePagoDeCuota>): LinkDePagoDeCuota => ({
  cuotaId: 'c1',
  contratoId: 'k1',
  contratoNumero: '#43',
  inmueble: 'Apartamento 101, Cra 37 10-08',
  inquilino: 'Marta Gómez',
  fechaDeVencimiento: '2026-10-05',
  montoCop: 1_500_000,
  estado: 'enviado',
  hitosEnviados: ['antes', 'dia'],
  ultimoEnvioEn: '2026-10-05T13:02:11.000Z',
  pagadoEn: null,
  paymentUrl: 'https://checkout.wompi.co/l/abc',
  ...parcial,
});

const LOS_CINCO: LinkDePagoDeCuota[] = [
  link({ cuotaId: 'c-ninguno', estado: 'ninguno', hitosEnviados: [], ultimoEnvioEn: null, paymentUrl: null }),
  link({ cuotaId: 'c-enviado' }),
  link({
    cuotaId: 'c-pagado',
    estado: 'pagado',
    hitosEnviados: ['antes'],
    pagadoEn: '2026-10-03T15:00:00.000Z',
  }),
  link({ cuotaId: 'c-vencido', estado: 'vencido', hitosEnviados: ['antes', 'dia', 'despues'] }),
  link({ cuotaId: 'c-fallido', estado: 'fallido', hitosEnviados: ['antes', 'dia'] }),
];

const pagina = (items: LinkDePagoDeCuota[], extra: Partial<PaginaDeLinksDePago> = {}): PaginaDeLinksDePago => ({
  items,
  total: items.length,
  page: 1,
  limit: 20,
  ...extra,
});

let contenedor: HTMLDivElement;
let root: Root;

beforeEach(() => {
  pantalla.movil = false;
  get.mockReset();
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

async function montar(el: React.ReactElement) {
  await act(async () => root.render(el));
  await act(async () => {
    await Promise.resolve();
  });
}

const q = (sel: string) => contenedor.querySelector(sel);
const fila = (id: string) => q(`[data-testid="link-${id}"]`);
const ultimaRuta = () => String(get.mock.calls.at(-1)?.[0]);

describe('LinksDePago — el estado del link de cada cuota', () => {
  it('pide la ruta del mes corriente, página 1 de 20', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO));
    await montar(<LinksDePago />);
    expect(get).toHaveBeenCalledWith(`/inmobiliaria/cobros/links?mes=${mesActual()}&page=1&limit=20`);
  });

  it('🔴 los cinco estados con icono y palabra, nunca sólo color', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO));
    await montar(<LinksDePago mes="2026-10" />);
    const palabras: Record<string, string> = {
      ninguno: 'Sin link',
      enviado: 'Enviado',
      pagado: 'Pagado',
      vencido: 'Vencido',
      fallido: 'Pago fallido',
    };
    for (const [estado, palabra] of Object.entries(palabras)) {
      const pastilla = fila(`c-${estado}`)?.querySelector('[data-testid="estado-del-link"]');
      expect(pastilla?.getAttribute('data-estado'), estado).toBe(estado);
      expect(pastilla?.textContent, estado).toContain(palabra);
      expect(pastilla?.querySelector('svg'), estado).not.toBeNull();
    }
  });

  it('dice cuáles de los tres avisos salieron (3 días antes, el día, 3 días después)', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO));
    await montar(<LinksDePago mes="2026-10" />);
    const hitos = [...(fila('c-enviado')?.querySelectorAll('[data-hito]') ?? [])];
    expect(hitos.map((h) => [h.getAttribute('data-hito'), h.getAttribute('data-enviado')])).toEqual([
      ['antes', 'si'],
      ['dia', 'si'],
      ['despues', 'no'],
    ]);
    expect(hitos[0].textContent).toContain('3 días antes');
    expect(hitos[0].textContent).toContain('enviado');
    expect(hitos[2].textContent).toContain('3 días después');
    expect(hitos[2].textContent).toContain('sin enviar');
    // Sin link no hay avisos que listar.
    expect(fila('c-ninguno')?.querySelector('[data-testid="hitos-del-link"]')).toBeNull();
  });

  it('🔴 una cuota que ya pasó su «3 días después» sin link no dice «todavía»: la lleva cobranza (Nico, 26-09)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-28T15:00:00.000Z'));
    try {
      const enMora = { ...LOS_CINCO.find((l) => l.estado === 'ninguno')!, cuotaId: 'c-mora', fechaDeVencimiento: '2026-01-05' };
      get.mockResolvedValue(pagina([enMora]));
      await montar(<LinksDePago mes="2026-10" />);
      expect(fila('c-mora')?.textContent).toContain('la lleva cobranza');
      expect(fila('c-mora')?.textContent).not.toContain('todavía no le ha escrito');
    } finally {
      vi.useRealTimers();
    }
  });

  it('🔴 QA 26-09: con enMora del back, una cuota que por sí sola no venció pero cuyo inquilino debe una anterior en mora no dice «todavía»', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-06T15:00:00.000Z'));
    try {
      const ninguno = LOS_CINCO.find((l) => l.estado === 'ninguno')!;
      get.mockResolvedValue(
        pagina([
          // Vence el 10: por su fecha todavía es de Payu, pero el contrato debe septiembre.
          { ...ninguno, cuotaId: 'c-debe-otra', fechaDeVencimiento: '2026-10-10', enMora: true },
          // Vence el 1: ella misma pasó su «3 días después».
          { ...ninguno, cuotaId: 'c-vencida', fechaDeVencimiento: '2026-10-01', enMora: true },
          // El back dice que no: manda el back, no la fecha.
          { ...ninguno, cuotaId: 'c-al-dia', fechaDeVencimiento: '2026-10-10', enMora: false },
        ]),
      );
      await montar(<LinksDePago mes="2026-10" />);
      expect(fila('c-debe-otra')?.textContent).toContain('debe una cuota anterior en mora');
      expect(fila('c-debe-otra')?.textContent).toContain('la lleva cobranza');
      expect(fila('c-debe-otra')?.textContent).not.toContain('todavía no le ha escrito');
      expect(fila('c-vencida')?.textContent).toContain('Venció hace más de 3 días sin pagar');
      expect(fila('c-al-dia')?.textContent).toContain('Payu todavía no le ha escrito por esta cuota.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('enMora del back gana sobre la fecha; sin el campo (back viejo) se sigue mirando la fecha', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-06T15:00:00.000Z'));
    try {
      const ninguno = LOS_CINCO.find((l) => l.estado === 'ninguno')!;
      get.mockResolvedValue(
        pagina([
          // Fecha vieja pero el back dice que Payu no la excluye por mora (la cuota ya no debe).
          { ...ninguno, cuotaId: 'c-back-no', fechaDeVencimiento: '2026-09-01', enMora: false },
          // Back viejo: sin el campo, la fecha decide.
          { ...ninguno, cuotaId: 'c-sin-campo', fechaDeVencimiento: '2026-09-01' },
        ]),
      );
      await montar(<LinksDePago mes="2026-10" />);
      expect(fila('c-back-no')?.textContent).not.toContain('la lleva cobranza');
      expect(fila('c-sin-campo')?.textContent).toContain('Venció hace más de 3 días sin pagar');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cada estado dice qué significa', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-28T15:00:00.000Z'));
    get.mockResolvedValue(pagina(LOS_CINCO));
    await montar(<LinksDePago mes="2026-10" />);
    expect(fila('c-ninguno')?.textContent).toContain('Payu todavía no le ha escrito por esta cuota.');
    expect(fila('c-enviado')?.textContent).toContain('Último aviso:');
    expect(fila('c-pagado')?.textContent).toContain('Pagado el');
    expect(fila('c-vencido')?.textContent).toContain('la sigue cobranza');
    expect(fila('c-fallido')?.textContent).toContain('la pasarela no aprobó el pago');
    vi.useRealTimers();
  });

  it('el valor con formatCurrency y la fecha de vencimiento como día (sin correrse por el huso)', async () => {
    get.mockResolvedValue(pagina([link({})]));
    await montar(<LinksDePago mes="2026-10" />);
    expect(fila('c1')?.textContent).toContain('$ 1.500.000');
    expect(fila('c1')?.textContent).toContain('5 de oct de 2026');
    expect(fila('c1')?.textContent).toContain('Contrato #43');
  });

  it('«Ver el link» sólo mientras sirve para pagar (enviado o tras un pago fallido), en otra pestaña', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO));
    await montar(<LinksDePago mes="2026-10" />);
    const enlace = (id: string) => fila(id)?.querySelector('a[href^="https://checkout"]');
    expect(enlace('c-enviado')?.getAttribute('target')).toBe('_blank');
    expect(enlace('c-enviado')?.getAttribute('rel')).toContain('noopener');
    expect(enlace('c-fallido')).not.toBeNull();
    expect(enlace('c-pagado')).toBeNull();
    expect(enlace('c-vencido')).toBeNull();
    expect(enlace('c-ninguno')).toBeNull();
  });

  it('🔴 no hay ningún botón para mandar el link: lo manda el cron', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO));
    await montar(<LinksDePago mes="2026-10" />);
    const acciones = [...contenedor.querySelectorAll('button, a')].map((b) => b.textContent ?? '');
    expect(acciones.filter((texto) => /enviar|mandar|reenviar/i.test(texto))).toEqual([]);
  });

  it('en el teléfono es una lista, no una tabla que haya que correr', async () => {
    pantalla.movil = true;
    get.mockResolvedValue(pagina(LOS_CINCO));
    await montar(<LinksDePago mes="2026-10" />);
    expect(q('[data-testid="lista-de-links"]')).not.toBeNull();
    expect(q('table')).toBeNull();
    // La barra se parte en líneas a 390 px.
    expect(q('[data-testid="barra-de-links-de-pago"]')?.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['flex', 'flex-wrap']),
    );
  });
});

describe('LinksDePago — filtros y páginas', () => {
  it('filtrar por estado pide ese estado, desde la página 1', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO, { total: 60 }));
    await montar(<LinksDePago mes="2026-10" />);
    await act(async () => (contenedor.querySelector('[aria-label="Página siguiente"]') as HTMLButtonElement).click());
    expect(ultimaRuta()).toBe('/inmobiliaria/cobros/links?mes=2026-10&page=2&limit=20');

    await act(async () => (q('[data-opcion="vencido"]') as HTMLButtonElement).click());
    expect(ultimaRuta()).toBe('/inmobiliaria/cobros/links?mes=2026-10&estado=vencido&page=1&limit=20');
    // 🔴 Nunca se pidió la página 2 del estado nuevo.
    expect(get.mock.calls.map((c) => String(c[0]))).not.toContain(
      '/inmobiliaria/cobros/links?mes=2026-10&estado=vencido&page=2&limit=20',
    );
  });

  it('cambiar de mes vuelve a la página 1 sin pedir la página vieja del mes nuevo', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO, { total: 60 }));
    let mes = '2026-10';
    const onCambiarMes = vi.fn((m: string) => {
      mes = m;
    });
    await montar(<LinksDePago mes={mes} onCambiarMes={onCambiarMes} />);
    await act(async () => (contenedor.querySelector('[aria-label="Página siguiente"]') as HTMLButtonElement).click());
    await act(async () => (q('[aria-label="Mes anterior"]') as HTMLButtonElement).click());
    expect(onCambiarMes).toHaveBeenCalledWith('2026-09');
    await montar(<LinksDePago mes={mes} onCambiarMes={onCambiarMes} />);
    expect(ultimaRuta()).toBe('/inmobiliaria/cobros/links?mes=2026-09&page=1&limit=20');
    expect(get.mock.calls.map((c) => String(c[0]))).not.toContain(
      '/inmobiliaria/cobros/links?mes=2026-09&page=2&limit=20',
    );
  });

  it('no avanza más allá del mes siguiente al corriente', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO));
    const [y, m] = mesActual().split('-').map(Number);
    const siguiente = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
    await montar(<LinksDePago mes={siguiente} onCambiarMes={() => undefined} />);
    expect((q('[aria-label="Mes siguiente"]') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('LinksDePago — vacío y fallo', () => {
  it('un mes sin cuotas lo dice con el mes, no «no hay datos»', async () => {
    get.mockResolvedValue(pagina([]));
    await montar(<LinksDePago mes="2026-10" />);
    expect(contenedor.textContent).toContain('No hay cuotas que venzan en octubre de 2026');
    expect(q('table')).toBeNull();
  });

  it('con un estado puesto, el vacío es del filtro y ofrece quitarlo', async () => {
    get.mockResolvedValue(pagina(LOS_CINCO));
    await montar(<LinksDePago mes="2026-10" />);
    get.mockResolvedValue(pagina([]));
    await act(async () => (q('[data-opcion="fallido"]') as HTMLButtonElement).click());
    expect(contenedor.textContent).toContain('Ningún resultado');
    expect(contenedor.textContent).not.toContain('No hay cuotas que venzan');
  });

  it('si el back falla, lo dice y deja reintentar (no una tabla vacía)', async () => {
    get.mockRejectedValue(new Error('500'));
    await montar(<LinksDePago mes="2026-10" />);
    expect(q('table')).toBeNull();
    const reintentar = [...contenedor.querySelectorAll('button')].find((b) => /intentar/i.test(b.textContent ?? ''));
    expect(reintentar).toBeTruthy();
    get.mockResolvedValue(pagina(LOS_CINCO));
    await act(async () => reintentar!.click());
    expect(fila('c-enviado')).not.toBeNull();
  });

  it('las claves de la sección existen en castellano y en inglés (las que se arman con el estado también)', () => {
    type Arbol = { [k: string]: string | Arbol };
    const hojas = (o: Arbol, pre = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [`${pre}${k}`] : hojas(v, `${pre}${k}.`)));
    const deEs = hojas((es as unknown as { inmobiliaria: { cobros: { linksDePago: Arbol } } }).inmobiliaria.cobros.linksDePago);
    const deEn = hojas((en as unknown as { inmobiliaria: { cobros: { linksDePago: Arbol } } }).inmobiliaria.cobros.linksDePago);
    expect(deEn.sort()).toEqual(deEs.sort());
    for (const e of ['ninguno', 'enviado', 'pagado', 'vencido', 'fallido']) expect(deEs).toContain(`estado.${e}`);
    for (const h of ['antes', 'dia', 'despues']) expect(deEs).toContain(`hitos.${h}`);
  });
});

