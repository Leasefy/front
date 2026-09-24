/**
 * El inquilino avisa que no va a renovar.
 *
 * 🔴 Lo que se protege acá es que la pantalla diga el plazo ANTES de apretar.
 * Sin aviso el contrato se prorroga solo (Ley 820) y la ley pide tres meses de
 * preaviso: un aviso con veinte días se registra igual —esconderlo sería peor—
 * pero la persona tiene que saberlo antes, no después.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  api: {
    avisarQueNoRenueva: vi.fn(),
    retirarElAvisoDeNoRenovacion: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/leases.service', () => ({ leasesApi: h.api }));
vi.mock('sonner', () => ({ toast: h.toast }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="modal">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { NoVoyARenovar, diasHastaElFin } from './NoVoyARenovar';

const HOY = new Date('2026-09-21T10:00:00.000Z');

/** Un arriendo que termina dentro de `dias` días. */
function arriendo(dias: number, aviso: { at: string; por: string; motivo: string } | null = null) {
  const fin = new Date(HOY);
  fin.setUTCDate(fin.getUTCDate() + dias);
  return {
    id: 'l-1',
    endDate: fin.toISOString(),
    renovacion: aviso
      ? {
          id: 'r-1',
          status: 'RENOV_PENDING',
          proposedRent: 0,
          proposedAdminFee: null,
          newEndDate: null,
          tenantAcceptedAt: null,
          avisoNoRenovar: aviso,
        }
      : null,
  } as never;
}

let contenedor: HTMLDivElement;
let raiz: Root;
const alCambiar = vi.fn();

beforeEach(() => {
  /* 🔴 `setSystemTime` SOLO hace algo con los timers falsos puestos, y sin esto
     el test se apoyaba en la fecha real de la máquina: hoy pasaba porque hoy es
     21-09, y mañana «faltan 150 días» sería 149. Se falsea únicamente `Date`
     —no los timers— para no meterle a React un reloj detenido. */
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY);
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  h.api.avisarQueNoRenueva.mockReset().mockResolvedValue({
    aTiempo: true,
    diasDeAnticipacion: 150,
    preavisoDeLey: 90,
  });
  h.api.retirarElAvisoDeNoRenovacion.mockReset().mockResolvedValue(undefined);
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  alCambiar.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  vi.useRealTimers();
});

async function montar(lease: never) {
  await act(async () => {
    raiz.render(<NoVoyARenovar lease={lease} onCambio={alCambiar} />);
  });
}

const porTestId = (id: string) => contenedor.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function abrir() {
  await act(async () => {
    (porTestId('abrir-no-renovar') as HTMLButtonElement).click();
  });
}

async function escribirMotivo(texto: string) {
  const area = porTestId('motivo-no-renovar') as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, texto);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('el plazo se dice ANTES de apretar', () => {
  it('con más de tres meses, dice que llega a tiempo', async () => {
    await montar(arriendo(150));
    await abrir();
    expect(porTestId('plazo-ok')!.textContent).toContain('150 días');
    expect(porTestId('plazo-tarde')).toBeNull();
  });

  it('🔴 con menos de tres meses, avisa que puede no servir — y deja avisar igual', async () => {
    await montar(arriendo(20));
    await abrir();
    const tarde = porTestId('plazo-tarde')!;
    expect(tarde.textContent).toContain('20 días');
    expect(tarde.textContent).toContain('puede no aceptarlo');
    // Lo importante: el botón NO está apagado por el plazo.
    await escribirMotivo('Me mudo de ciudad');
    expect((porTestId('confirmar-no-renovar') as HTMLButtonElement).disabled).toBe(false);
  });

  it('justo en el límite de los 90 días, llega a tiempo', async () => {
    await montar(arriendo(90));
    await abrir();
    expect(porTestId('plazo-ok')).not.toBeNull();
    await act(async () => raiz.unmount());
    raiz = createRoot(contenedor);
    await montar(arriendo(89));
    await abrir();
    expect(porTestId('plazo-tarde')).not.toBeNull();
  });

  it('un contrato ya vencido lo dice con sus palabras, no con un número negativo', async () => {
    await montar(arriendo(-5));
    await abrir();
    expect(porTestId('plazo-tarde')!.textContent).toContain('ya pasó su fecha');
    expect(porTestId('plazo-tarde')!.textContent).not.toContain('-5');
  });
});

describe('avisar', () => {
  it('sin motivo no se puede: no es burocracia, es lo que la inmobiliaria lee', async () => {
    await montar(arriendo(150));
    await abrir();
    expect((porTestId('confirmar-no-renovar') as HTMLButtonElement).disabled).toBe(true);
    await escribirMotivo('ab');
    expect((porTestId('confirmar-no-renovar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('manda el motivo recortado y avisa que quedó', async () => {
    await montar(arriendo(150));
    await abrir();
    await escribirMotivo('  Me mudo de ciudad  ');
    await act(async () => {
      (porTestId('confirmar-no-renovar') as HTMLButtonElement).click();
    });
    expect(h.api.avisarQueNoRenueva).toHaveBeenCalledWith('l-1', 'Me mudo de ciudad');
    expect(alCambiar).toHaveBeenCalled();
  });

  it('🔴 el mensaje de después sale del BACK, no de la cuenta local', async () => {
    // La pantalla cuenta los días para poder avisar antes; la autoridad es el
    // servidor. Si se separaran, manda el servidor.
    h.api.avisarQueNoRenueva.mockResolvedValue({
      aTiempo: false,
      diasDeAnticipacion: 12,
      preavisoDeLey: 90,
    });
    await montar(arriendo(150));
    await abrir();
    await escribirMotivo('Me mudo');
    await act(async () => {
      (porTestId('confirmar-no-renovar') as HTMLButtonElement).click();
    });
    expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('12 días'));
  });
});

describe('cuando ya hay un aviso', () => {
  const AVISO_SUYO = { at: '2026-09-01T00:00:00.000Z', por: 'INQUILINO', motivo: 'Me mudo' };
  const AVISO_DE_ELLOS = {
    at: '2026-09-01T00:00:00.000Z',
    por: 'INMOBILIARIA',
    motivo: 'El propietario va a vender',
  };

  it('el suyo se puede retirar', async () => {
    await montar(arriendo(150, AVISO_SUYO));
    expect(porTestId('aviso-de-no-renovacion')!.textContent).toContain('Avisaste');
    expect(porTestId('aviso-de-no-renovacion')!.textContent).toContain('Me mudo');
    await act(async () => {
      (porTestId('retirar-aviso') as HTMLButtonElement).click();
    });
    expect(h.api.retirarElAvisoDeNoRenovacion).toHaveBeenCalledWith('l-1');
  });

  it('🔴 el de la inmobiliaria NO ofrece retirarlo, y dice con quién hablar', async () => {
    await montar(arriendo(150, AVISO_DE_ELLOS));
    const caja = porTestId('aviso-de-no-renovacion')!;
    expect(caja.textContent).toContain('Tu inmobiliaria registró');
    expect(caja.textContent).toContain('háblalo con ellos');
    expect(porTestId('retirar-aviso')).toBeNull();
  });

  it('con aviso dado ya no se ofrece volver a avisar', async () => {
    await montar(arriendo(150, AVISO_SUYO));
    expect(porTestId('abrir-no-renovar')).toBeNull();
  });
});

describe('diasHastaElFin', () => {
  it('cuenta días civiles, sin que la hora mueva el número', () => {
    expect(diasHastaElFin('2026-12-20T00:00:00.000Z', new Date('2026-09-21T23:00:00'))).toBe(
      diasHastaElFin('2026-12-20T00:00:00.000Z', new Date('2026-09-21T01:00:00')),
    );
  });
});
