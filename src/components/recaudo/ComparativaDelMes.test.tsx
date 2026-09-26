/**
 * La comparativa con el mes anterior, estado por estado: con datos, sin mes
 * anterior, sin historia (y con historia corta), mes cerrado, sin recibos y el
 * fallo. Lo que se vigila es lo que la pantalla se niega a decir: «0 %», «∞»
 * o «$ 0» donde falta el dato.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ComparativaDelMes as Comparativa } from '@/lib/api/recaudo.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('./GraficoDiaADia', () => ({
  GraficoDiaADia: ({ dias, resumen }: { dias: unknown[]; resumen: string }) =>
    React.createElement('div', {
      'data-testid': 'grafico-dia-a-dia',
      'data-dias': dias.length,
      'aria-label': resumen,
    }),
}));

vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ queEs }: { queEs?: string }) =>
    React.createElement('div', { 'data-testid': 'fallo-de-carga' }, `No se pudo leer ${queEs}`),
}));

import { ComparativaDelMes, VsMesAnterior, formatearPct, tonoDeLaVariacion } from './ComparativaDelMes';

/** El caso del back (`recaudo.comparativa.spec.ts`): hoy es el 10 de septiembre. */
function comparativa(over: Partial<Comparativa> = {}): Comparativa {
  return {
    month: '2026-09',
    mesAnterior: '2026-08',
    enCurso: true,
    dia: 10,
    diaDelMesAnterior: 10,
    dias: Array.from({ length: 31 }, (_, i) => ({
      dia: i + 1,
      esteMesCop: i < 10 ? (i >= 1 ? 200_000 : 0) + (i >= 4 ? 500_000 : 0) + (i >= 9 ? 100_000 : 0) : null,
      mesAnteriorCop: (i >= 2 ? 300_000 : 0) + (i >= 19 ? 300_000 : 0),
    })),
    vsMesAnterior: {
      seDebe: { actualCop: 2_000_000, anteriorCop: 1_000_000, pct: 100 },
      llego: { actualCop: 800_000, anteriorCop: 300_000, pct: 166.7 },
      falta: { actualCop: 1_400_000, anteriorCop: 700_000, pct: 100 },
      salio: { actualCop: 400_000, anteriorCop: 200_000, pct: 100 },
      queda: { actualCop: 1_140_000, anteriorCop: 1_580_000, pct: -27.8 },
    },
    proyeccion: {
      estado: 'PROYECTADA',
      llegoCop: 800_000,
      porVencerCop: 800_000,
      tasa: 0.7,
      historia: [
        { month: '2026-06', vencioCop: 1_000_000, pagadoDentroCop: 500_000, tasa: 0.5 },
        { month: '2026-07', vencioCop: 1_000_000, pagadoDentroCop: 1_000_000, tasa: 1 },
        { month: '2026-08', vencioCop: 1_000_000, pagadoDentroCop: 600_000, tasa: 0.6 },
      ],
      mesesPedidos: 3,
      cierreCop: 1_360_000,
      rango: { minCop: 1_200_000, maxCop: 1_600_000 },
    },
    ...over,
  };
}

/** La agencia recién llegada: ni mes anterior ni historia. */
function sinMesAnterior(): Comparativa {
  const c = comparativa();
  return {
    ...c,
    dias: c.dias.map((d) => ({ ...d, mesAnteriorCop: d.dia <= 31 ? 0 : null })),
    vsMesAnterior: {
      seDebe: { actualCop: 2_000_000, anteriorCop: null, pct: null },
      llego: { actualCop: 800_000, anteriorCop: 0, pct: null },
      falta: { actualCop: 1_400_000, anteriorCop: null, pct: null },
      salio: { actualCop: 400_000, anteriorCop: 0, pct: null },
      queda: { actualCop: 1_140_000, anteriorCop: 0, pct: null },
    },
    proyeccion: {
      estado: 'SIN_HISTORIA',
      llegoCop: 800_000,
      porVencerCop: 800_000,
      tasa: null,
      historia: [],
      mesesPedidos: 3,
      cierreCop: null,
      rango: null,
    },
  };
}

let host: HTMLDivElement | undefined;
let root: Root | undefined;

async function montar(nodo: React.ReactNode) {
  const h = document.createElement('div');
  document.body.appendChild(h);
  const r = createRoot(h);
  host = h;
  root = r;
  await act(async () => {
    r.render(nodo);
  });
}

function $(sel: string): HTMLElement {
  const el = el$(sel);
  if (!el) throw new Error(`No está: ${sel}`);
  return el;
}

function el$(sel: string): HTMLElement | null {
  return host?.querySelector<HTMLElement>(sel) ?? null;
}

function texto(): string {
  return host?.textContent ?? '';
}

afterEach(async () => {
  const r = root;
  if (r) {
    await act(async () => {
      r.unmount();
    });
  }
  host?.remove();
  root = undefined;
  host = undefined;
});

function bloque(c: Comparativa | null, extra: { error?: unknown; cargando?: boolean } = {}) {
  return (
    <ComparativaDelMes
      month="2026-09"
      comparativa={c}
      cargando={extra.cargando ?? false}
      error={extra.error ?? null}
      onReintentar={() => {}}
    />
  );
}

function lineas(c: Comparativa | null, fallo = false) {
  return (
    <div>
      <VsMesAnterior id="se-debe" comparativa={c} cifra="seDebe" sentido="neutro" fallo={fallo} valorMostrado={2_000_000} />
      <VsMesAnterior id="llego" comparativa={c} cifra="llego" sentido="subirEsBueno" fallo={fallo} valorMostrado={800_000} />
      <VsMesAnterior id="pendiente" comparativa={c} cifra="falta" sentido="subirEsMalo" fallo={fallo} valorMostrado={1_400_000} />
      <VsMesAnterior id="dispersado" comparativa={c} cifra="salio" sentido="neutro" fallo={fallo} valorMostrado={400_000} />
      <VsMesAnterior id="disponible" comparativa={c} cifra="queda" sentido="neutro" fallo={fallo} valorMostrado={1_140_000} />
    </div>
  );
}

describe('formatearPct y el tono', () => {
  it('escribe el signo y la coma decimal', () => {
    expect(formatearPct(166.7)).toBe('+166,7 %');
    expect(formatearPct(-27.8)).toBe('−27,8 %');
    expect(formatearPct(0)).toBe('0 %');
  });

  it('el color depende de si subir es bueno, malo o ninguno', () => {
    expect(tonoDeLaVariacion(10, 'subirEsBueno')).toBe('success');
    expect(tonoDeLaVariacion(-10, 'subirEsBueno')).toBe('danger');
    expect(tonoDeLaVariacion(10, 'subirEsMalo')).toBe('danger');
    expect(tonoDeLaVariacion(-10, 'subirEsMalo')).toBe('success');
    expect(tonoDeLaVariacion(10, 'neutro')).toBe('muted');
    expect(tonoDeLaVariacion(0, 'subirEsBueno')).toBe('muted');
  });
});

describe('VsMesAnterior', () => {
  it('con datos: flecha, signo, fecha del mes anterior y color por sentido', async () => {
    await montar(lineas(comparativa()));
    const llego = $('[data-testid="vs-llego"]');
    expect(llego.textContent).toContain('+166,7 % vs. el 10 de agosto');
    // Para el lector de pantalla, en palabras.
    expect(llego.textContent).toContain('Subió');
    expect(llego.getAttribute('data-tono')).toBe('success');
    expect(llego.querySelector('svg')).not.toBeNull();
    // Lo que falta subió: eso es malo.
    expect($('[data-testid="vs-pendiente"]').getAttribute('data-tono')).toBe('danger');
    const queda = $('[data-testid="vs-disponible"]');
    expect(queda.textContent).toContain('−27,8 %');
    expect(queda.textContent).toContain('Bajó');
    expect(queda.getAttribute('data-tono')).toBe('muted');
  });

  it('si la cifra a la fecha no es la de la tarjeta, dice cuál es', async () => {
    await montar(
      <VsMesAnterior
        id="pendiente"
        comparativa={comparativa({ enCurso: false, dia: 30 })}
        cifra="falta"
        sentido="subirEsMalo"
        fallo={false}
        valorMostrado={1_000_000}
      />,
    );
    expect($('[data-testid="vs-pendiente"]').textContent).toContain('Al día 30: $ 1.400.000');
  });

  /** 🔴 Sin mes anterior: «sin comparación», nunca 0 % ni ∞. */
  it('sin mes anterior dice «sin comparación» en las cinco cifras', async () => {
    await montar(lineas(sinMesAnterior()));
    for (const id of ['se-debe', 'llego', 'pendiente', 'dispersado', 'disponible']) {
      const el = $(`[data-testid="vs-${id}"]`);
      expect(el.textContent).toBe('Sin comparación con agosto');
      expect(el.getAttribute('data-estado')).toBe('sin-comparacion');
    }
    expect(texto()).not.toMatch(/0 %|∞|Infinity|NaN/);
  });

  it('si la comparación falló lo dice; mientras carga no dice nada', async () => {
    await montar(lineas(null, true));
    expect($('[data-testid="vs-llego"]').textContent).toBe(
      'Comparación con el mes anterior: no se pudo leer',
    );
    await act(async () => {
      root?.render(lineas(null, false));
    });
    expect(el$('[data-testid="vs-llego"]')).toBeNull();
  });
});

describe('ComparativaDelMes', () => {
  it('con datos: el día a día con su resumen y la proyección con la cuenta escrita', async () => {
    await montar(bloque(comparativa()));

    expect($('[data-testid="grafico-dia-a-dia"]').getAttribute('data-dias')).toBe('31');
    const resumen = $('[data-testid="dia-a-dia-resumen"]').textContent;
    expect(resumen).toBe(
      'Al día 10 de septiembre llegaron $ 800.000; al día 10 de agosto habían llegado $ 300.000.',
    );
    expect($('[data-testid="grafico-dia-a-dia"]').getAttribute('aria-label')).toBe(resumen);
    expect(texto()).toContain('Día a día: Septiembre contra agosto');

    const p = $('[data-testid="proyeccion"]');
    expect(p.getAttribute('data-estado')).toBe('PROYECTADA');
    expect(p.textContent).toContain('Proyección del cierre');
    expect($('[data-testid="proyeccion-cifra"]').textContent).toBe('$ 1.360.000');
    expect($('[data-testid="proyeccion-formula"]').textContent).toBe(
      'Llegó $ 800.000 + por vencer $ 800.000 × 70 % (lo que se pagó dentro del mes en junio, julio y agosto) = $ 1.360.000.',
    );
    expect($('[data-testid="proyeccion-rango"]').textContent).toBe(
      'Entre $ 1.200.000 y $ 1.600.000: según el mes, se pagó entre 50 % y 100 % de lo que vencía.',
    );
    expect(el$('[data-testid="proyeccion-historia-corta"]')).toBeNull();
  });

  it('con historia corta proyecta con la que hay y lo dice', async () => {
    const c = comparativa();
    await montar(
      bloque({
        ...c,
        proyeccion: {
          ...c.proyeccion,
          historia: [c.proyeccion.historia[2]],
          tasa: 0.6,
          cierreCop: 1_280_000,
          rango: null,
        },
      }),
    );
    expect($('[data-testid="proyeccion-cifra"]').textContent).toBe('$ 1.280.000');
    expect($('[data-testid="proyeccion-historia-corta"]').textContent).toBe(
      'Con 1 de 3 meses de historia: los demás no tenían deuda.',
    );
    expect($('[data-testid="proyeccion-formula"]').textContent).toContain('en agosto)');
    expect(el$('[data-testid="proyeccion-rango"]')).toBeNull();
  });

  /** 🔴 Sin historia no hay proyección: «Sin datos», nunca «$ 0». */
  it('sin historia dice «Sin datos» y por qué, sin inventar una tasa', async () => {
    await montar(bloque(sinMesAnterior()));
    expect($('[data-testid="proyeccion"]').getAttribute('data-estado')).toBe('SIN_HISTORIA');
    expect($('[data-testid="proyeccion-cifra"]').textContent).toBe('Sin datos');
    expect($('[data-testid="proyeccion-sin-historia"]').textContent).toContain(
      'Ninguno de los 3 meses anteriores tenía deuda',
    );
    expect($('[data-testid="proyeccion"]').textContent).toContain('Hasta hoy llegó $ 800.000');
    expect($('[data-testid="proyeccion-cifra"]').textContent).not.toContain('$');
    expect(el$('[data-testid="proyeccion-formula"]')).toBeNull();
  });

  it('un mes cerrado muestra su cierre, no una proyección', async () => {
    await montar(
      bloque(
        comparativa({
          enCurso: false,
          dia: 30,
          diaDelMesAnterior: 30,
          proyeccion: {
            estado: 'MES_CERRADO',
            llegoCop: 3_000_000,
            porVencerCop: 0,
            tasa: null,
            historia: [],
            mesesPedidos: 3,
            cierreCop: 3_000_000,
            rango: null,
          },
        }),
      ),
    );
    expect($('[data-testid="proyeccion"]').textContent).toContain('Cierre del mes');
    expect($('[data-testid="proyeccion-cifra"]').textContent).toBe('$ 3.000.000');
    expect($('[data-testid="proyeccion"]').textContent).toContain('Septiembre ya cerró');
  });

  it('sin un recibo en los dos meses no dibuja líneas planas: lo dice', async () => {
    const c = comparativa();
    await montar(
      bloque({
        ...c,
        dias: c.dias.map((d) => ({ ...d, esteMesCop: d.esteMesCop === null ? null : 0, mesAnteriorCop: 0 })),
      }),
    );
    expect(el$('[data-testid="grafico-dia-a-dia"]')).toBeNull();
    expect($('[data-testid="dia-a-dia-vacio"]').textContent).toContain(
      'Ningún recibo de caja en septiembre ni en agosto',
    );
  });

  it('el fallo se dice como fallo, no como un mes vacío', async () => {
    await montar(bloque(null, { error: new Error('503') }));
    expect($('[data-testid="fallo-de-carga"]').textContent).toBe(
      'No se pudo leer la comparación con el mes anterior',
    );
    expect(el$('[data-testid="proyeccion"]')).toBeNull();
    expect(el$('[data-testid="comparativa"]')).toBeNull();
  });
});
