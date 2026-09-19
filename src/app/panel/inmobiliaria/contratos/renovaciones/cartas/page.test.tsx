/**
 * La cola de cartas del incremento, en su propia pantalla (19-09-2026).
 *
 * 🔴 Estas pruebas vivían en `BandejaDeCartasDelIncremento.test.tsx` cuando la
 * lista estaba encima de Renovaciones. Se mudaron con la lista, no se
 * reescribieron: lo que protegen es lo mismo de D6 —enviar es un clic, un
 * correo SIMULADO no se canta como enviado, sin correo del inquilino no se
 * manda y se dice qué hacer, sin permiso se lee y no se manda— porque mover
 * una pantalla de lugar no puede aflojar lo que ya estaba garantizado.
 *
 * Lo nuevo es el chrome de la casa: el estado llega por la URL (es el camino
 * que abrió la loseta), hay buscador, alcance y paginación.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ params: new URLSearchParams(), canAccess: vi.fn(() => true) }));

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: { bandejaDeCartas: vi.fn(), enviarCarta: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useSearchParams: () => h.params }));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess }),
}));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...resto
  }: { href: string; children?: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}));

import { cicloDeVidaApi, type CartaEnLaBandeja } from '@/lib/api/ciclo-de-vida.service';
import { toast } from '@/components/ui/toast';
import Pagina from './page';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const toastMock = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

function carta(over: Partial<CartaEnLaBandeja> = {}): CartaEnLaBandeja {
  return {
    contractId: 'c1',
    code: 120,
    externalId: '1850',
    inquilino: 'Ana Díaz',
    correoDelInquilino: 'ana@example.com',
    inmueble: 'Cra 76 # 32-11',
    desde: '2026-10-01',
    diasParaElAniversario: 14,
    estado: 'POR_ENVIAR',
    alertaRoja: false,
    origen: 'IPC',
    porcentaje: 5.1,
    canonAnteriorCop: 2_000_000,
    canonNuevoCop: 2_102_000,
    contenido: 'Señor(a) Ana Díaz…',
    enviadaAt: null,
    medio: null,
    ultimoIntento: null,
    ...over,
  };
}

function bandeja(cartas: CartaEnLaBandeja[], extra: Record<string, unknown> = {}) {
  return {
    diasAntes: 30,
    disponible: true,
    porEnviar: cartas.filter((c) => c.estado === 'POR_ENVIAR').length,
    vencidasSinConstancia: cartas.filter((c) => c.alertaRoja).length,
    enviadas: cartas.filter((c) => c.estado === 'ENVIADA').length,
    cartas,
    ...extra,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  h.params = new URLSearchParams();
  h.canAccess.mockReturnValue(true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
});

async function montar() {
  await act(async () => {
    root!.render(<Pagina />);
  });
}

const $ = (id: string) => container!.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

async function escribir(texto: string) {
  const input = $('buscar-cartas') as HTMLInputElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('la cola de cartas — lo que D6 garantizaba sigue garantizado', () => {
  it('lista la carta con el canon de antes y el nuevo, y desde cuándo', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    const fila = $('carta-c1-2026-10-01')!;
    expect(fila.textContent).toContain('#1850');
    expect(fila.textContent).toContain('2026-10-01');
  });

  it('enviar es un clic y refresca la cola', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    api.enviarCarta.mockResolvedValue({
      ultimoEnvio: { resultado: 'ENVIADA', mensaje: 'Carta enviada a ana@example.com.' },
    });
    await montar();
    await act(async () => ($('enviar-c1') as HTMLButtonElement).click());
    expect(api.enviarCarta).toHaveBeenCalledWith('c1', '2026-10-01', undefined);
    expect(toastMock.success).toHaveBeenCalled();
    expect(api.bandejaDeCartas).toHaveBeenCalledTimes(2);
  });

  it('🔴 un correo SIMULADO no se canta como enviado', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    api.enviarCarta.mockResolvedValue({
      ultimoEnvio: {
        resultado: 'SIMULADA',
        mensaje: 'El envío de correos está apagado en este entorno.',
      },
    });
    await montar();
    await act(async () => ($('enviar-c1') as HTMLButtonElement).click());
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(
      'La carta no salió.',
      expect.objectContaining({ description: expect.any(String) }),
    );
  });

  it('sin correo del inquilino no deja enviar y dice qué hacer', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta({ correoDelInquilino: null })]));
    await montar();
    expect(($('enviar-c1') as HTMLButtonElement).disabled).toBe(true);
    expect(container!.textContent).toContain('entrégala por otro medio');
  });

  it('sin migración se ven las cartas pero no se envían', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()], { disponible: false }));
    await montar();
    expect(container!.textContent).toContain('todavía no se pueden enviar');
    expect($('enviar-c1')).toBeNull();
  });

  it('sin permiso de editar se lee, no se manda', async () => {
    h.canAccess.mockReturnValue(false);
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    expect($('carta-c1-2026-10-01')).not.toBeNull();
    expect($('enviar-c1')).toBeNull();
  });
});

describe('la cola de cartas — el chrome de la casa', () => {
  it('🔴 el estado llega por la URL: es el camino que abrió la loseta', async () => {
    h.params = new URLSearchParams('estado=sin-constancia');
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([
        carta({ contractId: 'c1', estado: 'VENCIDA_SIN_CONSTANCIA', alertaRoja: true }),
        carta({ contractId: 'c2', estado: 'POR_ENVIAR' }),
      ]),
    );
    await montar();
    expect($('carta-c1-2026-10-01')).not.toBeNull();
    expect($('carta-c2-2026-10-01')).toBeNull();
    expect($('alcance-de-cartas')!.textContent).toContain('1 de 2 cartas');
  });

  it('sin `estado` en la URL se ven todas', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([carta({ contractId: 'c1' }), carta({ contractId: 'c2' })]),
    );
    await montar();
    expect(container!.querySelectorAll('[data-testid^="carta-"]')).toHaveLength(2);
    expect($('alcance-de-cartas')).toBeNull();
  });

  it('busca por contrato, inquilino o inmueble, sin tildes', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([
        carta({ contractId: 'c1', inquilino: 'Ana Díaz' }),
        carta({ contractId: 'c2', inquilino: 'Beto Ruiz', externalId: '9001' }),
      ]),
    );
    await montar();
    await escribir('diaz');
    expect($('carta-c1-2026-10-01')).not.toBeNull();
    expect($('carta-c2-2026-10-01')).toBeNull();
    await escribir('9001');
    expect($('carta-c2-2026-10-01')).not.toBeNull();
  });

  it('quitar los filtros devuelve la cola entera', async () => {
    h.params = new URLSearchParams('estado=enviadas');
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([carta({ contractId: 'c1' }), carta({ contractId: 'c2' })]),
    );
    await montar();
    expect(container!.querySelectorAll('[data-testid^="carta-"]')).toHaveLength(0);
    await act(async () => ($('limpiar-filtros-cartas') as HTMLButtonElement).click());
    expect(container!.querySelectorAll('[data-testid^="carta-"]')).toHaveLength(2);
  });

  it('🔴 sin «Volver»: el riel de secciones ya deja Renovaciones marcada', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    expect(container!.textContent).not.toContain('Volver');
  });
});
