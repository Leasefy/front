/**
 * La página de Lotes no puede verse vacía cuando hay plata esperando.
 *
 * Nico, 22-09: «le doy ir a lotes y no aparece nada». El mes tenía 317
 * dispersiones pendientes por $794 M y la pantalla decía «Todavía no hay
 * lotes». Lo que estos tests fijan:
 * - con dispersiones pendientes, la frase dice cuántas esperan lote y por
 *   cuánto, y el botón para armarlo está ahí mismo;
 * - el mes se elige con `SelectorDeMes` (en español), no con un
 *   `<input type="month">` que pinta el mes en el idioma del navegador;
 * - «Ir a Lotes» desde una dispersión abre en SU mes (`?mes=`);
 * - se pregunta desde qué banco se gira; cada banco dice qué recibe (archivo
 *   oficial o planilla para cargar a mano) y uno sin migración no deja armar;
 * - los pasos del lote se leen en una línea.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type {
  BancosParaGirar,
  CandidatosDeDispersion,
} from '@/lib/api/lotes-de-dispersion.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isAdmin: false, isLoading: false, agencyRole: 'admin' }),
}));

vi.mock('@/lib/hooks/use-lotes-de-dispersion', () => ({
  useLotesDeDispersion: () => ({ lotes: [], cargando: false, error: null, refetch: vi.fn() }),
}));

vi.mock('./use-nombres-del-equipo', () => ({
  useNombresDelEquipo: () => ({ nombreDe: (id: string) => id }),
}));

const candidatos = vi.fn();
const bancos = vi.fn();
const armar = vi.fn();
vi.mock('@/lib/api/lotes-de-dispersion.service', () => ({
  lotesDeDispersionApi: {
    candidatos: (...a: unknown[]) => candidatos(...a) as unknown,
    bancos: (...a: unknown[]) => bancos(...a) as unknown,
    armar: (...a: unknown[]) => armar(...a) as unknown,
  },
}));

import { ListaDeLotes } from './ListaDeLotes';

function candidato(i: number, motivo: string | null = null) {
  return {
    dispersionId: `d-${i}`,
    propietarioId: `p-${i}`,
    propietarioName: `Propietario ${i}`,
    month: '2026-09',
    netoCop: 2_500_000,
    acumuladoCop: 2_500_000 * (i + 1),
    entraEnElCupo: true,
    motivoDeExclusion: motivo,
  };
}

/** Lo que había el 22-09: 317 esperando, 3 sin cuenta. */
function septiembre(): CandidatosDeDispersion {
  const lista = Array.from({ length: 317 }, (_, i) => candidato(i, i < 3 ? 'Sin número de cuenta' : null));
  return {
    orden: 'MENOR_A_MAYOR',
    plata: {
      corte: '2026-09-22',
      entradasCop: 0,
      comprometidoCop: 0,
      disponibleCop: 0,
      hayExtracto: false,
      ultimoMovimiento: null,
    },
    candidatos: lista,
    sugeridos: [],
    totalCop: 794_000_000,
    cantidad: 314,
  };
}

function lista(): BancosParaGirar {
  return {
    disponible: true,
    motivo: null,
    bancos: [
      {
        id: 'BANCOLOMBIA',
        nombre: 'Bancolombia',
        formato: 'BANCOLOMBIA_PAB',
        nombreDelFormato: 'Bancolombia — pagos PAB',
        fuente: {
          url: 'https://www.bancolombia.com/wcm/connect/x/FormatoPagosPAB.pdf',
          documento: 'Estructura formato de pagos - PAB',
          version: 'PDF del 27-05-2026',
          consultado: '2026-09-22',
        },
        entrega: 'ARCHIVO_OFICIAL',
        porQueNo: null,
      },
      {
        id: 'DAVIVIENDA',
        nombre: 'Davivienda',
        formato: 'PLANILLA_MANUAL',
        nombreDelFormato: 'Planilla para cargar a mano',
        entrega: 'PLANILLA',
        fuente: null,
        porQueNo: 'Davivienda le entrega el diseño del archivo a cada empresa dentro de su portal.',
      },
      {
        id: 'BANCO_AV_VILLAS',
        nombre: 'Banco AV Villas',
        formato: null,
        nombreDelFormato: 'AV Villas — pagos a terceros ACH',
        entrega: 'ARCHIVO_OFICIAL',
        fuente: null,
        porQueNo:
          'Lo de Banco AV Villas está listo pero falta aplicar la migración 20260922230000_formatos_de_todos_los_bancos en esta base.',
      },
    ],
    cuentas: [],
    ultima: { banco: 'BANCOLOMBIA', tipoDeCuenta: 'CORRIENTE', numeroDeCuenta: '10012345678' },
  };
}

let contenedor: HTMLDivElement;
let raiz: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar(mesInicial?: string) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  await act(async () => {
    raiz.render(<ListaDeLotes mesInicial={mesInicial} />);
  });
  await esperar();
}

function frase(): string {
  return document.body.querySelector('[data-testid="frase-del-mes"]')?.textContent ?? '';
}

async function clicEn(el: Element | null | undefined) {
  if (!el) throw new Error('No está el elemento');
  await act(async () => {
    (el as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

function botonQueDice(texto: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(texto),
  );
}

beforeEach(() => {
  candidatos.mockResolvedValue(septiembre());
  bancos.mockResolvedValue(lista());
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('<ListaDeLotes> — el mes no se ve vacío', () => {
  it('🔴 con dispersiones pendientes dice cuántas esperan lote y por cuánto, en vez de «Todavía no hay lotes»', async () => {
    await montar('2026-09');

    expect(candidatos).toHaveBeenCalledWith({ month: '2026-09' });
    const texto = frase();
    expect(texto).toContain('317');
    expect(texto).toContain('esperan lote');
    expect(texto).toContain('314');
    expect(texto).toMatch(/794\.000\.000/);
    expect(texto).toContain('les falta un dato bancario');
    expect(document.body.textContent).not.toContain('Todavía no hay lotes');
    expect(botonQueDice('Armar el lote de')).toBeDefined();
  });

  it('el mes se elige con SelectorDeMes en español, no con un <input type="month">', async () => {
    await montar('2026-09');

    expect(document.body.querySelector('input[type="month"]')).toBeNull();
    const selector = document.body.querySelector('[data-testid="mes-del-lote"]');
    expect(selector?.getAttribute('data-mes')).toBe('2026-09');
    expect(selector?.textContent).toContain('Septiembre de 2026');
  });

  it('«Ir a Lotes» desde una dispersión abre en SU mes', async () => {
    candidatos.mockResolvedValue({ ...septiembre(), candidatos: [], totalCop: 0, cantidad: 0 });
    await montar('2026-07');

    expect(candidatos).toHaveBeenCalledWith({ month: '2026-07' });
    expect(frase()).toContain('Ninguna dispersión de julio de 2026 espera lote');
    expect(botonQueDice('Armar el lote de')).toBeUndefined();
  });

  it('los pasos del lote se leen en una línea', async () => {
    await montar('2026-09');

    const pasos = document.body.querySelector('[aria-label="Cómo sale un pago"]')?.textContent ?? '';
    expect(pasos).toContain('otra persona lo aprueba con un código');
    expect(pasos).toContain('descargas el archivo de ese banco (o su planilla)');
    expect(pasos).toContain('lo subes al portal del banco');
    expect(pasos).toContain('marcas el lote pagado');
  });
});

describe('<ListaDeLotes> — desde qué banco se gira', () => {
  async function abrirArmar() {
    await montar('2026-09');
    await clicEn(botonQueDice('Armar el lote de'));
    await esperar();
  }

  it('propone la última elección de la agencia y la manda al armar', async () => {
    armar.mockResolvedValue({
      lote: { id: 'lote-1', cantidad: 314, totalCop: 794_000_000 },
      excluidos: [],
      descubiertoCop: 0,
    });
    await abrirArmar();

    const bancolombia = document.body.querySelector('[data-testid="banco-BANCOLOMBIA"]');
    expect(bancolombia?.getAttribute('aria-checked')).toBe('true');
    const numero = document.body.querySelector<HTMLInputElement>('#numero-de-cuenta-origen');
    expect(numero?.value).toBe('10012345678');
    expect(document.body.querySelector('[data-testid="fuente-del-formato"]')?.textContent).toContain(
      'instructivo oficial del banco',
    );

    await clicEn(botonQueDice('Armar lote con el mes entero'));

    expect(armar).toHaveBeenCalledWith(
      expect.objectContaining({
        month: '2026-09',
        origen: { banco: 'BANCOLOMBIA', tipoDeCuenta: 'CORRIENTE', numeroDeCuenta: '10012345678' },
      }),
    );
  });

  it('los bancos salen agrupados por lo que reciben', async () => {
    await abrirArmar();

    const oficial = document.body.querySelector('[data-testid="grupo-ARCHIVO_OFICIAL"]')?.textContent ?? '';
    const planilla = document.body.querySelector('[data-testid="grupo-PLANILLA"]')?.textContent ?? '';
    expect(oficial).toContain('Archivo del banco — oficial');
    expect(oficial).toContain('Bancolombia');
    expect(planilla).toContain('Planilla para cargar a mano');
    expect(planilla).toContain('Davivienda');
    expect(planilla).not.toContain('Bancolombia');
  });

  it('🔴 un banco sin estructura publicada recibe la PLANILLA, lo dice antes de armar y sí deja armar', async () => {
    armar.mockResolvedValue({
      lote: { id: 'lote-1', cantidad: 314, totalCop: 794_000_000 },
      excluidos: [],
      descubiertoCop: 0,
    });
    await abrirArmar();

    await clicEn(document.body.querySelector('[data-testid="banco-DAVIVIENDA"]'));

    const aviso = document.body.querySelector('[data-testid="banco-con-planilla"]')?.textContent ?? '';
    expect(aviso).toContain('Para Davivienda te damos una planilla para cargar a mano');
    expect(aviso).toContain('dentro de su portal');
    expect(aviso).toContain('envíanoslo');
    // No hay instructivo que citar: no se promete un archivo del banco.
    expect(document.body.querySelector('[data-testid="fuente-del-formato"]')).toBeNull();

    const numero = document.body.querySelector<HTMLInputElement>('#numero-de-cuenta-origen');
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(numero, '0550123456');
      numero!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clicEn(botonQueDice('Armar lote con el mes entero'));

    expect(armar).toHaveBeenCalledWith(
      expect.objectContaining({
        origen: { banco: 'DAVIVIENDA', tipoDeCuenta: 'AHORROS', numeroDeCuenta: '0550123456' },
      }),
    );
  });

  it('🔴 un banco cuyo formato espera una migración aparece, dice cuál y NO deja armar', async () => {
    await abrirArmar();

    const avVillas = document.body.querySelector('[data-testid="banco-BANCO_AV_VILLAS"]');
    expect(avVillas?.textContent).toContain('no disponible todavía');
    await clicEn(avVillas);

    const aviso = document.body.querySelector('[data-testid="banco-sin-formato"]')?.textContent ?? '';
    expect(aviso).toContain('Todavía no se puede girar desde Banco AV Villas');
    expect(aviso).toContain('20260922230000_formatos_de_todos_los_bancos');
    expect(botonQueDice('Armar lote con el mes entero')?.disabled).toBe(true);
  });

  it('sin la migración, se arma como antes y lo dice', async () => {
    bancos.mockResolvedValue({
      ...lista(),
      disponible: false,
      motivo: 'Elegir el banco del lote necesita la migración 20260922190100_origen_del_lote.',
      ultima: null,
    });
    await abrirArmar();

    expect(document.body.textContent).toContain('20260922190100_origen_del_lote');
    expect(botonQueDice('Armar lote con el mes entero')?.disabled).toBe(false);
  });
});
