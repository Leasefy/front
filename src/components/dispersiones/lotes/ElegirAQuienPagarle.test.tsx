/**
 * Elegir a quién pagarle: el cupo, el acumulado y el descubierto.
 *
 * Lo que estos tests fijan, porque es plata que sale de la cuenta:
 * - el acumulado que ve la persona es el que devolvió el back, no uno recalculado;
 * - tildar suma y destildar resta, y el pie dice «vas a dispersar X a N»;
 * - pasarse del disponible NO bloquea: avisa con el número del descubierto;
 * - una fila sin datos bancarios no se puede tildar ni suma;
 * - sin extracto cargado se dice «no sabemos», no «no hay plata».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CandidatosDeDispersion } from '@/lib/api/lotes-de-dispersion.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const candidatos = vi.fn();
vi.mock('@/lib/api/lotes-de-dispersion.service', () => ({
  lotesDeDispersionApi: {
    candidatos: (...args: unknown[]) => candidatos(...args) as unknown,
  },
}));

import { ElegirAQuienPagarle } from './ElegirAQuienPagarle';

function respuesta(parcial: Partial<CandidatosDeDispersion> = {}): CandidatosDeDispersion {
  return {
    orden: 'MENOR_A_MAYOR',
    plata: {
      corte: '2026-09-15',
      entradasCop: 5_000_000,
      comprometidoCop: 3_000_000,
      disponibleCop: 2_000_000,
      hayExtracto: true,
      ultimoMovimiento: '2026-09-14',
    },
    candidatos: [
      {
        dispersionId: 'd-b',
        propietarioId: 'p-b',
        propietarioName: 'Beatriz',
        month: '2026-09',
        netoCop: 500_000,
        acumuladoCop: 500_000,
        entraEnElCupo: true,
        motivoDeExclusion: null,
      },
      {
        dispersionId: 'd-c',
        propietarioId: 'p-c',
        propietarioName: 'Carlos',
        month: '2026-09',
        netoCop: 1_500_000,
        acumuladoCop: 2_000_000,
        entraEnElCupo: true,
        motivoDeExclusion: null,
      },
      {
        dispersionId: 'd-a',
        propietarioId: 'p-a',
        propietarioName: 'Alicia',
        month: '2026-09',
        netoCop: 3_000_000,
        acumuladoCop: 5_000_000,
        entraEnElCupo: false,
        motivoDeExclusion: null,
      },
    ],
    sugeridos: [],
    totalCop: 5_000_000,
    cantidad: 3,
    ...parcial,
  };
}

let contenedor: HTMLDivElement;
let raiz: Root;

async function montar(onCambio: (e: unknown) => void = () => {}) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  await act(async () => {
    raiz.render(<ElegirAQuienPagarle mes="2026-09" onCambio={onCambio} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function fila(id: string): HTMLElement {
  const f = contenedor.querySelector(`[data-testid="candidato-${id}"]`);
  if (!f) throw new Error(`No está la fila ${id}`);
  return f as HTMLElement;
}

async function tildar(id: string) {
  await act(async () => {
    fila(id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

const texto = () => contenedor.textContent ?? '';

beforeEach(() => {
  candidatos.mockReset();
  candidatos.mockResolvedValue(respuesta());
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('la plata de hoy', () => {
  it('muestra entró / comprometido / disponible', async () => {
    await montar();
    expect(contenedor.querySelector('[data-testid="plata-disponible"]')).not.toBeNull();
    expect(texto()).toContain('Disponible para dispersar');
  });

  it('🔴 sin extracto dice que NO SABEMOS, no que no hay plata', async () => {
    candidatos.mockResolvedValue(
      respuesta({
        plata: {
          corte: '2026-09-15',
          entradasCop: 0,
          comprometidoCop: 0,
          disponibleCop: 0,
          hayExtracto: false,
          ultimoMovimiento: null,
        },
      }),
    );
    await montar();
    expect(texto()).toContain('no sabemos cuánta plata hay');
    // Y no bloquea nada: las filas siguen ahí para poder armar el lote igual.
    expect(contenedor.querySelector('[data-testid="candidato-d-b"]')).not.toBeNull();
  });
});

describe('elegir a quién le pago', () => {
  it('el acumulado es el que devolvió el back, en su orden', async () => {
    await montar();
    expect(fila('d-b').textContent).toContain('$500.000');
    expect(fila('d-c').textContent).toContain('$2.000.000');
  });

  it('tildar suma y el pie dice cuánto y a cuántos', async () => {
    await montar();
    await tildar('d-b');
    await tildar('d-c');

    const pie = contenedor.querySelector('[data-testid="resumen-de-lo-elegido"]');
    expect(pie?.textContent).toContain('$2.000.000');
    expect(pie?.textContent).toContain('2');
    expect(pie?.textContent).toContain('propietarios');
  });

  it('destildar resta', async () => {
    await montar();
    await tildar('d-b');
    await tildar('d-c');
    await tildar('d-c');

    const pie = contenedor.querySelector('[data-testid="resumen-de-lo-elegido"]');
    expect(pie?.textContent).toContain('$500.000');
    expect(pie?.textContent).toContain('1 propietario');
  });

  it('🔴 sin nada tildado el resumen es el MES ENTERO, no «$0 a 0» (QA 22-09)', async () => {
    // Con la lista vacía el back arma el mes entero («Armar lote con el mes
    // entero»): el resumen tiene que decir eso, no que no se gira nada.
    await montar();
    const pie = contenedor.querySelector('[data-testid="resumen-de-lo-elegido"]')!.textContent ?? '';
    expect(pie).toContain('mes entero');
    expect(pie).toContain('$5.000.000');
    expect(pie).toContain('3 propietarios');
    expect(pie).not.toContain('$0 a 0');
  });

  it('avisa a quién le falta la cuenta y no lo deja tildar', async () => {
    candidatos.mockResolvedValue(
      respuesta({
        candidatos: [
          {
            dispersionId: 'd-x',
            propietarioId: 'p-x',
            propietarioName: 'Sin cuenta',
            month: '2026-09',
            netoCop: 900_000,
            acumuladoCop: 0,
            entraEnElCupo: false,
            motivoDeExclusion: 'No tiene número de cuenta',
          },
        ],
      }),
    );
    await montar();

    expect(texto()).toContain('No tiene número de cuenta');
    expect(contenedor.querySelector('[data-testid="candidato-d-x"]')).toBeNull();
  });
});

describe('pasarse del disponible', () => {
  it('🔴 no se bloquea: avisa con el número que sale de plata de la inmobiliaria', async () => {
    const cambios: unknown[] = [];
    await montar((e) => cambios.push(e));

    // Disponible 2.000.000. Se tilda a Alicia (3.000.000): 1.000.000 de más.
    await tildar('d-a');

    expect(texto()).toContain('plata de la inmobiliaria');
    expect(texto()).toContain('$1.000.000');
    expect(cambios.at(-1)).toMatchObject({
      dispersionIds: ['d-a'],
      totalCop: 3_000_000,
      descubiertoCop: 1_000_000,
    });
  });

  it('cuando alcanza no hay aviso de descubierto', async () => {
    await montar();
    await tildar('d-b');
    expect(texto()).not.toContain('plata de la inmobiliaria');
  });
});

describe('tildar hasta un monto', () => {
  it('entra lo que cabe, y una fila grande no tapa a las chicas', async () => {
    await montar();

    const tope = contenedor.querySelector('#tope-del-lote') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(tope, '2000000');
      tope.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const boton = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tildar hasta ese monto'),
    );
    await act(async () => {
      boton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const pie = contenedor.querySelector('[data-testid="resumen-de-lo-elegido"]');
    expect(pie?.textContent).toContain('$2.000.000');
    expect(pie?.textContent).toContain('2');
  });
});

describe('nunca un giro parcial, y las liquidaciones que se cierran en $0', () => {
  const conCompensada = () =>
    respuesta({
      candidatos: [
        ...respuesta().candidatos,
        {
          dispersionId: 'd-z',
          propietarioId: 'p-z',
          propietarioName: 'Zoila',
          month: '2026-09',
          netoCop: -200_000,
          acumuladoCop: 0,
          entraEnElCupo: false,
          motivoDeExclusion:
            'No se gira: sus deducciones cubren el neto de este mes. Se liquida en $0 al pagar el lote y lo que falte pasa a su siguiente liquidación.',
          seCompensa: true,
          saldoEnContraCop: 200_000,
        },
      ],
    });

  it('🔴 no hay dónde escribir un monto por propietario: se tilda entero o no se tilda', async () => {
    await montar();
    expect(contenedor.querySelector('[data-testid="sin-giro-parcial"]')?.textContent).toContain(
      'se gira completo o no se gira',
    );
    // El único campo de texto es el tope, que sólo decide a quién tildar.
    const campos = [...contenedor.querySelectorAll('input')].filter((i) => i.type !== 'checkbox');
    expect(campos.map((i) => i.id)).toEqual(['tope-del-lote']);
  });

  it('una liquidación en contra se tilda, no suma, y dice cuánto pasa al mes siguiente', async () => {
    candidatos.mockResolvedValue(conCompensada());
    const cambios: unknown[] = [];
    await montar((e) => cambios.push(e));

    const zoila = contenedor.querySelector<HTMLElement>('[data-testid="compensable-d-z"]')!;
    expect(zoila.textContent).toContain('se cierra en $0');
    expect(zoila.textContent).toContain('$200.000 pasan al mes siguiente');
    // No sale como excluida.
    expect(texto()).not.toContain('No se gira: sus deducciones');

    await tildar('d-b');
    await act(async () => {
      zoila.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(cambios.at(-1)).toMatchObject({ totalCop: 500_000, descubiertoCop: 0 });
    expect((cambios.at(-1) as { dispersionIds: string[] }).dispersionIds.sort()).toEqual(['d-b', 'd-z']);
    const pie = contenedor.querySelector('[data-testid="resumen-de-lo-elegido"]')!.textContent;
    expect(pie).toContain('$500.000');
    expect(pie).toContain('cierras en $0 la liquidación de 1');
  });

  it('«Tildar hasta ese monto» incluye las que se cierran en $0 sin gastar tope', async () => {
    candidatos.mockResolvedValue(conCompensada());
    const cambios: unknown[] = [];
    await montar((e) => cambios.push(e));

    const tope = contenedor.querySelector('#tope-del-lote') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(tope, '500000');
      tope.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const boton = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tildar hasta ese monto'),
    );
    await act(async () => {
      boton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(cambios.at(-1)).toMatchObject({ totalCop: 500_000 });
    expect((cambios.at(-1) as { dispersionIds: string[] }).dispersionIds.sort()).toEqual(['d-b', 'd-z']);
  });
});
