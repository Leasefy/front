/**
 * Giros devueltos, dentro del lote donde salió la plata.
 *
 * Lo que estos tests fijan:
 *   · «Marcar devuelto» sólo aparece cuando el lote está PAGADO (el banco no
 *     puede devolver plata que no salió);
 *   · el texto de `queHacer.bitacora` se muestra TAL CUAL lo devolvió el back,
 *     y lo mismo `egreso.motivo` al volver a girar;
 *   · sin la migración no se ofrece marcar devuelto y el lote se sigue viendo
 *     entero (falla abierto);
 *   · un giro ya regirado no vuelve a ofrecer la acción.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { GiroDevuelto } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  listar: vi.fn(),
  marcar: vi.fn(),
  regirar: vi.fn(),
  soporte: vi.fn(),
}));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: {
    girosDevueltos: h.listar,
    marcarDevuelto: h.marcar,
    regirar: h.regirar,
    soporteDelGiroDevuelto: h.soporte,
  },
  codigoSinMigrar: () => null,
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

/** El extracto del banco: obligatorio desde el 23-09. */
const EXTRACTO = new File(['%PDF-1.4'], 'extracto.pdf', { type: 'application/pdf' });

async function adjuntar(archivo: File = EXTRACTO) {
  const input = document.body.querySelector<HTMLInputElement>(
    '[data-testid="soporte-de-la-devolucion"]',
  )!;
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import {
  AccionesDelGiro,
  MarcarDevueltoDialog,
  RegirarDialog,
  estaSinResolver,
  hoyEnBogota,
  useGirosDevueltos,
} from './GirosDevueltos';

function giro(extra: Partial<GiroDevuelto> = {}): GiroDevuelto {
  return {
    id: 'g-1',
    dispersionId: 'd-1',
    motivo: 'CUENTA_ERRADA',
    fechaDeLaDevolucion: '2026-09-15',
    valorCop: 2_400_000,
    nombreTitular: 'Jorge Restrepo',
    dispersionNuevaId: null,
    fechaDelNuevoGiro: null,
    resueltoAt: null,
    ...extra,
  };
}

const BITACORA =
  'El banco devolvió el giro de $2.400.000: la cuenta no existe o está mal digitada. La plata vuelve a estar por girar y se le avisó al propietario para que corrija su cuenta bancaria; el siguiente giro queda retenido hasta que un administrador apruebe el cambio.';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.listar.mockReset().mockResolvedValue({ disponible: true, motivo: null, giros: [] });
  h.marcar.mockReset().mockResolvedValue({
    giro: giro(),
    queHacer: {
      vuelveAEstarPorGirar: true,
      avisarAlPropietario: true,
      exigirCambioDeCuenta: true,
      dejarEnBitacora: true,
      bitacora: BITACORA,
    },
  });
  h.regirar.mockReset().mockResolvedValue({
    giro: giro({ dispersionNuevaId: 'd-1', fechaDelNuevoGiro: '2026-09-18' }),
    egreso: {
      fecha: '2026-09-18',
      seReFecho: true,
      motivo:
        'Se volvió a girar el 2026-09-18, no el 2026-09-15: la fecha del egreso pasa a la del giro que sí salió.',
    },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function boton(texto: string): HTMLButtonElement {
  const b = [...document.body.querySelectorAll('button')].find((x) =>
    (x.textContent ?? '').includes(texto),
  );
  if (!b) throw new Error(`No hay botón «${texto}»`);
  return b as HTMLButtonElement;
}

describe('la celda del giro', () => {
  function pintarCelda(props: Partial<React.ComponentProps<typeof AccionesDelGiro>> = {}) {
    return act(async () => {
      root.render(
        <AccionesDelGiro
          dispersionId="d-1"
          nombreTitular="Jorge Restrepo"
          valorCop={2_400_000}
          giro={undefined}
          puedeEditar
          disponible
          onDevolver={() => {}}
          onRegirar={() => {}}
          {...props}
        />,
      );
    });
  }

  it('sin devolución ofrece marcarla', async () => {
    await pintarCelda();
    expect(container.querySelector('[data-testid="marcar-devuelto-d-1"]')).not.toBeNull();
  });

  it('sin permiso de edición no ofrece nada', async () => {
    await pintarCelda({ puedeEditar: false });
    expect(container.querySelector('[data-testid="marcar-devuelto-d-1"]')).toBeNull();
  });

  it('🔴 sin la migración no ofrece marcar devuelto, y no rompe la fila', async () => {
    await pintarCelda({ disponible: false });
    expect(container.querySelector('[data-testid="marcar-devuelto-d-1"]')).toBeNull();
    expect(container.textContent).toBe('—');
  });

  it('con una devolución viva muestra el estado y ofrece volver a girar', async () => {
    await pintarCelda({ giro: giro() });
    expect(container.querySelector('[data-testid="devuelto-d-1"]')?.textContent).toContain(
      'Devuelto',
    );
    expect(container.querySelector('[data-testid="regirar-d-1"]')).not.toBeNull();
  });

  it('🔴 una devolución con soporte ofrece verlo, y abre la URL firmada', async () => {
    h.soporte.mockResolvedValue({ url: 'https://firmada/x.pdf', nombre: 'x.pdf', tipo: 'application/pdf' });
    const abrirVentana = vi.spyOn(window, 'open').mockImplementation(() => null);
    await pintarCelda({ giro: giro({ tieneSoporte: true }) });
    const b = document.body.querySelector<HTMLButtonElement>(`[data-testid="ver-soporte-${giro().id}"]`)!;
    expect(b.textContent).toContain('Ver soporte');
    await act(async () => {
      b.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.soporte).toHaveBeenCalledWith(giro().id);
    expect(abrirVentana).toHaveBeenCalledWith('https://firmada/x.pdf', '_blank', 'noopener,noreferrer');
    abrirVentana.mockRestore();
  });

  it('un giro ya regirado dice cuándo salió y no ofrece la acción otra vez', async () => {
    await pintarCelda({ giro: giro({ dispersionNuevaId: 'd-1', fechaDelNuevoGiro: '2026-09-18' }) });
    expect(container.querySelector('[data-testid="regirado-d-1"]')?.textContent).toContain(
      '2026-09-18',
    );
    expect(container.querySelector('[data-testid="regirar-d-1"]')).toBeNull();
  });
});

describe('marcar devuelto', () => {
  async function abrir() {
    await act(async () => {
      root.render(
        <MarcarDevueltoDialog
          abierto
          dispersionId="d-1"
          nombreTitular="Jorge Restrepo"
          valorCop={2_400_000}
          onCerrar={() => {}}
          onListo={() => {}}
        />,
      );
    });
  }

  it('manda el motivo, la fecha y lo que se escribió', async () => {
    await abrir();
    const motivo = document.body.querySelector<HTMLSelectElement>(
      '[data-testid="motivo-de-la-devolucion"]',
    )!;
    await act(async () => {
      motivo.value = 'RECHAZO_DEL_BANCO';
      motivo.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const codigo = document.body.querySelector<HTMLInputElement>('#codigo-del-banco')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
      setter?.call(codigo, 'R04');
      codigo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await adjuntar();
    await act(async () => {
      boton('Marcar devuelto').click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.marcar).toHaveBeenCalledWith({
      dispersionId: 'd-1',
      motivo: 'RECHAZO_DEL_BANCO',
      motivoDetalle: undefined,
      codigoDelBanco: 'R04',
      fechaDeLaDevolucion: hoyEnBogota(),
      soporte: EXTRACTO,
    });
  });

  it('🔴 sin el soporte del banco, «Marcar devuelto» está apagado y no se le pega al back', async () => {
    await abrir();
    const b = document.body.querySelector<HTMLButtonElement>('[data-testid="confirmar-devuelto"]')!;
    expect(b.disabled).toBe(true);
    expect(b.getAttribute('title')).toContain('soporte del banco');
    await act(async () => {
      b.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.marcar).not.toHaveBeenCalled();
  });

  it('🔴 muestra el texto de la bitácora TAL CUAL lo devolvió el back', async () => {
    await abrir();
    await adjuntar();
    await act(async () => {
      boton('Marcar devuelto').click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(
      document.body.querySelector('[data-testid="texto-de-la-bitacora"]')?.textContent,
    ).toBe(BITACORA);
    expect(
      document.body.querySelector('[data-testid="exige-cambio-de-cuenta"]')?.textContent,
    ).toContain('RETENIDO');
  });

  it('avisa antes del clic cuando el motivo va a exigir corregir la cuenta', async () => {
    await abrir();
    expect(document.body.textContent).toContain('corregir su cuenta antes del');
  });
});

describe('volver a girar', () => {
  async function abrir(g = giro()) {
    await act(async () => {
      root.render(
        <RegirarDialog
          abierto
          giro={g}
          nombreTitular="Jorge Restrepo"
          onCerrar={() => {}}
          onListo={() => {}}
        />,
      );
    });
  }

  it('manda la dispersión del giro y la fecha, y muestra el motivo del egreso', async () => {
    await abrir();
    await act(async () => {
      boton('Registrar el giro').click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.regirar).toHaveBeenCalledWith('g-1', 'd-1', hoyEnBogota());
    expect(document.body.querySelector('[data-testid="motivo-del-egreso"]')?.textContent).toContain(
      'la fecha del egreso pasa a la del giro que sí salió',
    );
    expect(document.body.textContent).toContain('El egreso quedó con fecha 2026-09-18');
  });

  it('dice desde cuándo está devuelto, para poder elegir bien la fecha', async () => {
    await abrir();
    expect(document.body.textContent).toContain('2026-09-15');
  });
});

describe('la lectura falla ABIERTO', () => {
  function Sonda({ activo }: { activo: boolean }) {
    const g = useGirosDevueltos(activo);
    return <span data-testid="sonda">{`${g.disponible}:${g.porDispersion.size}`}</span>;
  }

  it('un fallo de red deja el lote sin la columna, no sin pantalla', async () => {
    h.listar.mockRejectedValue(new Error('sin red'));
    await act(async () => {
      root.render(<Sonda activo />);
    });
    expect(container.querySelector('[data-testid="sonda"]')?.textContent).toBe('false:0');
  });

  it('con el lote sin pagar ni siquiera pregunta', async () => {
    await act(async () => {
      root.render(<Sonda activo={false} />);
    });
    expect(h.listar).not.toHaveBeenCalled();
  });

  it('indexa por dispersión lo que devolvió el back', async () => {
    h.listar.mockResolvedValue({ disponible: true, motivo: null, giros: [giro()] });
    await act(async () => {
      root.render(<Sonda activo />);
    });
    expect(container.querySelector('[data-testid="sonda"]')?.textContent).toBe('true:1');
  });
});

describe('piezas puras', () => {
  it('un giro sin regirar sigue sin resolver', () => {
    expect(estaSinResolver(giro())).toBe(true);
    expect(estaSinResolver(giro({ fechaDelNuevoGiro: '2026-09-18' }))).toBe(false);
    expect(estaSinResolver(giro({ dispersionNuevaId: 'd-2' }))).toBe(false);
    expect(estaSinResolver(giro({ resueltoAt: '2026-09-18T10:00:00Z' }))).toBe(false);
  });

  it('hoy se mide en Bogotá, no en el huso del navegador', () => {
    // 2026-01-01 02:00 UTC son todavía las 21:00 del 31-12 en Bogotá.
    expect(hoyEnBogota(new Date('2026-01-01T02:00:00.000Z'))).toBe('2025-12-31');
  });
});
