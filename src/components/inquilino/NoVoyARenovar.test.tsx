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
  // La variante viaja como `data-variant`, igual que en el Content de Cadence.
  DialogContent: ({
    children,
    variant,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    variant?: string;
    'data-testid'?: string;
  }) => (
    <div data-testid={testId} data-variant={variant}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  it('es destructivo: rojo, y dice qué pasa con la prórroga y que se puede retirar', async () => {
    await montar(arriendo(150));
    await abrir();
    const dialogo = porTestId('dialogo-no-voy-a-renovar')!;
    // DESIGN.md §17: medallón rojo y el botón principal rojo.
    expect(dialogo.getAttribute('data-variant')).toBe('destructive');
    expect(porTestId('confirmar-no-renovar')!.className).toContain('bg-danger');
    expect(dialogo.textContent).toContain('Sin aviso se prorroga solo');
    expect(dialogo.textContent).toContain('puedes retirarlo');
  });

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

describe('errores con la regla de oro (02-10-2026)', () => {
  function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
    return Object.assign(new Error(String(cuerpo.message ?? '')), {
      name: 'ApiError',
      status,
      code: cuerpo.code,
      detalle: cuerpo,
    });
  }

  it('🔴 un 400 en el motivo va bajo el motivo, sin toast', async () => {
    const LARGO = 'El motivo puede tener hasta 500 caracteres.';
    h.api.avisarQueNoRenueva.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: [LARGO],
        campos: [{ campo: 'motivo', regla: 'largo', mensaje: LARGO }],
      }),
    );
    await montar(arriendo(150));
    await abrir();
    await escribirMotivo('Me mudo de ciudad');
    await act(async () => {
      (porTestId('confirmar-no-renovar') as HTMLButtonElement).click();
    });
    expect(document.getElementById('motivo-no-renovar-error')?.textContent).toBe(LARGO);
    expect(porTestId('motivo-no-renovar')!.getAttribute('aria-invalid')).toBe('true');
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it('🔴 retirar el aviso con un 5xx dice que fue nuestro, con la referencia', async () => {
    h.api.retirarElAvisoDeNoRenovacion.mockRejectedValue(
      errorDelBack(500, { code: 'ERROR_INTERNO', message: 'Internal server error', referencia: 'ab12cd34' }),
    );
    await montar(
      arriendo(150, { at: '2026-09-01T00:00:00.000Z', por: 'INQUILINO', motivo: 'Me mudo' }),
    );
    await act(async () => {
      (porTestId('retirar-aviso') as HTMLButtonElement).click();
    });
    const { description } = h.toast.error.mock.calls[0][1] as { description: string };
    expect(description).toMatch(/^No pudimos retirar el aviso: algo falló de nuestro lado/);
    expect(description).toContain('ab12cd34');
  });

  it('sin respuesta: habla de la conexión', async () => {
    h.api.avisarQueNoRenueva.mockRejectedValue(new TypeError('Failed to fetch'));
    await montar(arriendo(150));
    await abrir();
    await escribirMotivo('Me mudo de ciudad');
    await act(async () => {
      (porTestId('confirmar-no-renovar') as HTMLButtonElement).click();
    });
    const { description } = h.toast.error.mock.calls[0][1] as { description: string };
    expect(description).toMatch(/conexión/);
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

describe('D-19 (QA-INQ-95 ronda 2) · el aviso del contrato y la fecha del fin', () => {
  it('el aviso que registró la inmobiliaria EN EL CONTRATO (sin renovación) se muestra', async () => {
    await montar({
      id: 'l-1',
      endDate: '2027-07-31T00:00:00.000Z',
      renovacion: null,
      avisoNoRenovar: { at: '2026-10-04T15:00:00.000Z', por: 'INMOBILIARIA', motivo: 'El propietario necesita el inmueble' },
    } as never);
    const caja = porTestId('aviso-de-no-renovacion')!;
    expect(caja.textContent).toContain('Tu inmobiliaria registró');
    expect(porTestId('abrir-no-renovar')).toBeNull();
  });

  it('el fin del contrato es un DÍA: «31 de julio», no el 30 (medianoche UTC en Bogotá)', async () => {
    await montar({ id: 'l-1', endDate: '2027-07-31T00:00:00.000Z', renovacion: null } as never);
    await abrir();
    expect(porTestId('dialogo-no-voy-a-renovar')!.textContent).toContain('31 de julio de 2027');
  });
});
