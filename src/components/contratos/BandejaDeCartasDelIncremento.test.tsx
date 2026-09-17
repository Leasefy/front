/**
 * D6 · La bandeja de cartas del incremento (Nico, 17-09).
 *
 * Lo que no puede fallar: la alerta roja del aniversario sin constancia se
 * tiene que VER, enviar es un clic, y un correo que no salió de verdad
 * (simulado, por `EMAIL_DELIVERY_ENABLED`) NO se puede contar como enviado.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: { bandejaDeCartas: vi.fn(), enviarCarta: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

import { cicloDeVidaApi, type CartaEnLaBandeja } from '@/lib/api/ciclo-de-vida.service';
import { toast } from '@/components/ui/toast';
import { BandejaDeCartasDelIncremento } from './BandejaDeCartasDelIncremento';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const toastMock = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function carta(overrides: Partial<CartaEnLaBandeja> = {}): CartaEnLaBandeja {
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
    ...overrides,
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

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
});

async function montar(puedeEditar = true) {
  await act(async () => {
    root!.render(<BandejaDeCartasDelIncremento puedeEditar={puedeEditar} />);
  });
}

const $ = (id: string) => container!.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('<BandejaDeCartasDelIncremento> (D6)', () => {
  it('lista la carta con el canon de antes y el nuevo, y desde cuándo', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    const fila = $('carta-c1-2026-10-01')!;
    expect(fila.textContent).toContain('#1850');
    expect(fila.textContent).toContain('2026-10-01');
    expect(container!.textContent).toContain('30 días antes del aniversario');
  });

  it('🔴 el aniversario sin constancia se ve como alerta roja', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([carta({ estado: 'VENCIDA_SIN_CONSTANCIA', alertaRoja: true, diasParaElAniversario: -3 })]),
    );
    await montar();
    expect($('carta-c1-2026-10-01')!.textContent).toContain('sin constancia');
    expect(container!.textContent).toContain('1 sin constancia');
  });

  it('enviar es un clic y refresca la bandeja', async () => {
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
      ultimoEnvio: { resultado: 'SIMULADA', mensaje: 'El envío de correos está apagado en este entorno.' },
    });
    await montar();
    await act(async () => ($('enviar-c1') as HTMLButtonElement).click());
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith('La carta no salió.', expect.objectContaining({ description: expect.any(String) }));
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
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar(false);
    expect($('carta-c1-2026-10-01')).not.toBeNull();
    expect($('enviar-c1')).toBeNull();
  });
});
