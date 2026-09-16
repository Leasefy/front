/**
 * Un $0 de comisión que es un vacío de datos no se pinta como un hecho.
 *
 * Medido en dev el 16-09: ninguno de los 1.040 contratos vigentes tenía agente
 * asignado, así que todos los «$0» del ranking eran giros que no le sumaban a
 * nadie. `GET /inmobiliaria/agentes/comisiones` lo dice; acá se fija que la
 * pantalla lo diga también.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }));

import {
  AvisoDeComisionesSinAtribuir,
  frasesDeComisionesSinAtribuir,
  porQueLaComisionNoEsUnHecho,
  type ResumenDeComisiones,
} from './ComisionesSinAtribuir';
import { AgenteLeaderboard } from './AgenteLeaderboard';
import { AgenteMetrics } from './AgenteMetrics';
import type { Agente } from '@/lib/types/inmobiliaria';

void React;

function resumen(extra: Partial<ResumenDeComisiones> = {}): ResumenDeComisiones {
  return {
    mes: '2026-09',
    giros: { total: 5, deCuotas: 5, historicos: 0, descartadosPorDuplicado: 0 },
    sinAgente: { giros: 0, girosDelMes: 0, comisionCop: 0, comisionDelMesCop: 0 },
    deAgentesFueraDelEquipo: { giros: 0, comisionCop: 0 },
    contratosVigentes: { total: 10, sinAgente: 0 },
    ...extra,
  };
}

function agente(commissionsThisMonth: number, totalCommissions: number): Agente {
  return {
    id: 'ag-1',
    name: 'Sofía Ruiz',
    email: 'sofia@example.com',
    phone: '3001234567',
    role: 'agent',
    status: 'active',
    commissionSplit: 50,
    assignedPropertyIds: [],
    hireDate: '2025-01-01',
    metrics: {
      assignedProperties: 0,
      activeLeases: 0,
      closedThisMonth: 0,
      closedThisYear: 0,
      totalCommissions,
      commissionsThisMonth,
      avgDaysToClose: 0,
      conversionRate: 0,
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  } as Agente;
}

describe('porQueLaComisionNoEsUnHecho', () => {
  it('sin resumen no afirma nada: la cifra se muestra como llega', () => {
    expect(porQueLaComisionNoEsUnHecho(0, null, 'mes')).toBeNull();
  });

  it('una cifra distinta de 0 se muestra', () => {
    expect(
      porQueLaComisionNoEsUnHecho(
        120_000,
        resumen({ sinAgente: { giros: 3, girosDelMes: 3, comisionCop: 1, comisionDelMesCop: 1 } }),
        'mes',
      ),
    ).toBeNull();
  });

  it('$0 con giros sin agente del período es un vacío, y dice cuántos', () => {
    const r = resumen({
      sinAgente: { giros: 7, girosDelMes: 2, comisionCop: 700_000, comisionDelMesCop: 200_000 },
    });
    expect(porQueLaComisionNoEsUnHecho(0, r, 'mes')).toBe(
      '2 giros de este mes sin agente asignado: esta cifra no los incluye.',
    );
    expect(porQueLaComisionNoEsUnHecho(0, r, 'total')).toBe(
      '7 giros sin agente asignado: esta cifra no los incluye.',
    );
  });

  it('$0 sin un solo giro todavía no es un mal mes', () => {
    expect(
      porQueLaComisionNoEsUnHecho(0, resumen({ giros: { total: 0, deCuotas: 0, historicos: 0, descartadosPorDuplicado: 0 } }), 'total'),
    ).toMatch(/Todavía no se le ha girado nada/);
  });

  it('$0 con todos los giros atribuidos a otros agentes SÍ es un hecho', () => {
    expect(porQueLaComisionNoEsUnHecho(0, resumen(), 'mes')).toBeNull();
  });
});

describe('frasesDeComisionesSinAtribuir', () => {
  it('lo medido en dev: sin giros y ningún contrato vigente con agente', () => {
    expect(
      frasesDeComisionesSinAtribuir(
        resumen({
          giros: { total: 0, deCuotas: 0, historicos: 0, descartadosPorDuplicado: 0 },
          contratosVigentes: { total: 739, sinAgente: 739 },
        }),
      ),
    ).toEqual([
      'Todavía no hay giros a propietarios: la comisión de cada agente sale de lo que se le gira al dueño, así que por ahora nadie tiene comisión.',
      'Ninguno de los 739 contratos vigentes tiene agente asignado: sus giros no le van a sumar a nadie hasta que lo asignes en la ficha del inmueble.',
    ]);
  });

  it('giros sin agente, de agentes que ya no están y algunos contratos sin agente', () => {
    const frases = frasesDeComisionesSinAtribuir(
      resumen({
        sinAgente: { giros: 1, girosDelMes: 0, comisionCop: 150_000, comisionDelMesCop: 0 },
        deAgentesFueraDelEquipo: { giros: 3, comisionCop: 90_000 },
        contratosVigentes: { total: 1040, sinAgente: 12 },
      }),
    );
    expect(frases).toHaveLength(3);
    expect(frases[0]).toMatch(/^1 giro sin agente asignado \(.*150\.000.*\): asígnalo en la ficha del inmueble/);
    expect(frases[1]).toMatch(/^3 giros de agentes que ya no están en el equipo/);
    expect(frases[2]).toMatch(/^12 de 1\.040 contratos vigentes no tienen agente asignado/);
  });

  it('todo atribuido: nada que decir', () => {
    expect(frasesDeComisionesSinAtribuir(resumen())).toEqual([]);
  });
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function pintar(nodo: React.ReactNode) {
  act(() => {
    root.render(nodo);
  });
}

describe('<AvisoDeComisionesSinAtribuir>', () => {
  it('sin resumen o sin nada que decir no pinta nada', () => {
    pintar(<AvisoDeComisionesSinAtribuir resumen={null} />);
    expect(container.innerHTML).toBe('');
    pintar(<AvisoDeComisionesSinAtribuir resumen={resumen()} />);
    expect(container.innerHTML).toBe('');
  });

  it('dice qué falta y lleva a donde se arregla', () => {
    pintar(
      <AvisoDeComisionesSinAtribuir
        resumen={resumen({ contratosVigentes: { total: 4, sinAgente: 4 } })}
      />,
    );
    const aviso = container.querySelector('[data-testid="aviso-comisiones-sin-atribuir"]');
    expect(aviso?.textContent).toContain('Ninguno de los 4 contratos vigentes tiene agente asignado');
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles');
  });
});

describe('<AgenteLeaderboard> — comisión sin camino', () => {
  const sinAgente = resumen({
    sinAgente: { giros: 4, girosDelMes: 4, comisionCop: 400_000, comisionDelMesCop: 400_000 },
  });

  it('un $0 con giros sin agente se pinta «—» con su razón, y el aviso aparece', () => {
    pintar(<AgenteLeaderboard agentes={[agente(0, 0)]} resumenDeComisiones={sinAgente} />);
    const celda = container.querySelector('[data-testid="agente-comision-sin-camino"]');
    expect(celda?.textContent).toBe('—');
    expect(celda?.getAttribute('aria-label')).toBe(
      '4 giros de este mes sin agente asignado: esta cifra no los incluye.',
    );
    expect(container.textContent).not.toContain('$0');
    expect(container.querySelector('[data-testid="aviso-comisiones-sin-atribuir"]')).not.toBeNull();
  });

  it('sin resumen, la cifra se muestra como antes', () => {
    pintar(<AgenteLeaderboard agentes={[agente(0, 0)]} />);
    expect(container.querySelector('[data-testid="agente-comision-sin-camino"]')).toBeNull();
    expect(container.querySelector('[data-testid="aviso-comisiones-sin-atribuir"]')).toBeNull();
  });

  it('una comisión real se muestra aunque haya giros sin agente', () => {
    pintar(<AgenteLeaderboard agentes={[agente(1_000_000, 8_000_000)]} resumenDeComisiones={sinAgente} />);
    expect(container.querySelector('[data-testid="agente-comision-sin-camino"]')).toBeNull();
  });
});

describe('<AgenteMetrics> — comisión sin camino', () => {
  it('las dos tarjetas de comisión dicen «—» cuando no hay giros todavía', () => {
    pintar(
      <AgenteMetrics
        metrics={agente(0, 0).metrics}
        resumenDeComisiones={resumen({
          giros: { total: 0, deCuotas: 0, historicos: 0, descartadosPorDuplicado: 0 },
        })}
      />,
    );
    const sinDato = Array.from(container.querySelectorAll('[aria-label]')).filter((n) =>
      (n.getAttribute('aria-label') ?? '').includes('sin dato'),
    );
    expect(sinDato).toHaveLength(2);
    expect(sinDato.every((n) => n.textContent === '—')).toBe(true);
    expect(container.querySelector('[data-testid="aviso-comisiones-sin-atribuir"]')).not.toBeNull();
  });
});
