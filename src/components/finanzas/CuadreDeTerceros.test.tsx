/**
 * El cuadre no dice «cuadra en $0» cuando no hay con qué cuadrar.
 *
 * Las tres cosas que estos tests fijan, y que son justamente las que un cuadre
 * mal hecho arruina:
 *
 *   · sin extracto, `diferenciaCop` es `null` y la pantalla dice «no se pudo
 *     cuadrar» — nunca un cero, que se leería como «está todo bien»;
 *   · una diferencia A FAVOR no se pinta en rojo: es lo normal mientras la
 *     comisión siga en la cuenta de recaudo;
 *   · que FALTE plata de terceros sí, y va arriba de todo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CuadreDeTerceros } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ cuadre: vi.fn() }));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { cuadre: h.cuadre },
  codigoSinMigrar: vi.fn(() => null),
}));

import { CuadreDeTercerosPanel } from './CuadreDeTerceros';

function respuesta(extra: Partial<CuadreDeTerceros> = {}): CuadreDeTerceros {
  return {
    fecha: '2026-09-17',
    saldoDeLaCuentaCop: 100_000_000,
    recaudadoYNoGiradoCop: 80_000_000,
    anticiposDelInquilinoCop: 12_000_000,
    garantiasDeServiciosCop: 5_000_000,
    partidasPorIdentificarCop: 3_000_000,
    partidasPorIdentificar: 2,
    entradasIgnoradasCop: 0,
    entradasIgnoradas: 0,
    comisionRetenidaCop: 0,
    comisionTrasladadaCop: 0,
    haySaldoDelBanco: true,
    plataDeTercerosCop: 100_000_000,
    comisionEnLaCuentaCop: 0,
    laDiferenciaEsLaComision: false,
    diferenciaCop: 0,
    cuadra: true,
    faltaPlataDeTerceros: false,
    explicaciones: [],
    avisos: [],
    detalle: {
      recaudadoCop: 400_000_000,
      giradoCop: 320_000_000,
      movimientosDelExtracto: 412,
      garantiasVivas: 7,
    },
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.cuadre.mockReset().mockResolvedValue(respuesta());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<CuadreDeTercerosPanel />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const testId = (id: string) => container.querySelector(`[data-testid="${id}"]`);

describe('el veredicto de arriba', () => {
  it('cuando cuadra exacto, lo dice y no alarma', async () => {
    await pintar();
    const veredicto = testId('cuadre-veredicto');
    expect(veredicto?.getAttribute('data-estado')).toBe('cuadra');
    expect(veredicto?.textContent).toContain('Cuadra exacto');
  });

  it('🔴 sin extracto NO dice que cuadra: dice que no se pudo cuadrar', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        haySaldoDelBanco: false,
        diferenciaCop: null,
        cuadra: false,
        avisos: ['No hay extracto bancario cargado hasta esta fecha.'],
      }),
    );
    await pintar();
    const veredicto = testId('cuadre-veredicto');
    expect(veredicto?.getAttribute('data-estado')).toBe('sin-extracto');
    expect(veredicto?.textContent).toContain('No se pudo cuadrar');
    // Y la diferencia y el saldo se pintan con guion, NUNCA con $0.
    expect(testId('valor-diferencia')?.textContent).toBe('—');
    expect(testId('valor-saldo-banco')?.textContent).toBe('—');
  });

  it('🚨 si FALTA plata de terceros, va en rojo y con el número', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        saldoDeLaCuentaCop: 92_000_000,
        diferenciaCop: -8_000_000,
        cuadra: false,
        faltaPlataDeTerceros: true,
        avisos: ['🚨 En la cuenta de recaudo hay $8.000.000 MENOS de lo que se le debe a terceros.'],
      }),
    );
    await pintar();
    const veredicto = testId('cuadre-veredicto');
    expect(veredicto?.getAttribute('data-estado')).toBe('falta');
    expect(veredicto?.getAttribute('role')).toBe('alert');
    expect(veredicto?.textContent).toContain('Falta plata de terceros');
  });

  it('una diferencia A FAVOR no alarma: es lo normal con la comisión adentro', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        saldoDeLaCuentaCop: 104_100_000,
        diferenciaCop: 4_100_000,
        cuadra: false,
        comisionRetenidaCop: 4_100_000,
        explicaciones: ['La comisión que la inmobiliaria ya se ganó sigue en esta cuenta.'],
      }),
    );
    await pintar();
    const veredicto = testId('cuadre-veredicto');
    expect(veredicto?.getAttribute('data-estado')).toBe('a-favor');
    expect(veredicto?.getAttribute('role')).toBe('status');
    // La comisión sale como REFERENCIA, no como término de la identidad.
    expect(testId('cifra-comision-referencia')?.textContent).toContain('NO entra en la identidad');
  });
});

describe('la identidad y sus explicaciones', () => {
  it('pinta los cuatro términos con su definición', async () => {
    await pintar();
    for (const id of ['recaudado-no-girado', 'anticipos', 'garantias', 'por-identificar']) {
      expect(testId(`cifra-${id}`)).not.toBeNull();
    }
    expect(testId('cifra-por-identificar')?.textContent).toContain(
      'no se pasan a ingresos ni se devuelven solas',
    );
  });

  it('las explicaciones se muestran en orden, sin esconderlas', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        diferenciaCop: 4_100_000,
        cuadra: false,
        explicaciones: ['La comisión de la inmobiliaria.', 'Plata propia que entró.'],
      }),
    );
    await pintar();
    const lista = testId('cuadre-explicaciones');
    expect(lista?.querySelectorAll('li')).toHaveLength(2);
    expect(lista?.textContent).toContain('La comisión de la inmobiliaria.');
  });

  it('los avisos del back se muestran arriba, no se filtran', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        avisos: [
          '2 partida(s) por identificar: se quedan en el pasivo.',
          '🚨 3 entrada(s) están marcadas como IGNORADAS.',
        ],
      }),
    );
    await pintar();
    expect(testId('cuadre-avisos')?.querySelectorAll('li')).toHaveLength(2);
    expect(testId('cuadre-avisos')?.textContent).toContain('IGNORADAS');
  });
});

/*
 * 🔴 EL MISMO TEXTO NO SE DICE DOS VECES.
 *
 * Nico, 21-09: «esto también parece un vómito, hay que mejorar muchísimo esta
 * pantalla también». Lo primero que se veía eran DOS cajas amarillas pegadas
 * diciendo lo mismo: el veredicto y, debajo, el aviso del back — las dos «no
 * hay extracto bancario cargado… cárgalo en Conciliación».
 *
 * Los dos bloques tienen trabajos distintos (el veredicto dice si se le puede
 * creer a la pantalla; los avisos, qué NO cuentan estos números), y justo en el
 * estado sin extracto son la misma frase. Manda el veredicto: está arriba y
 * trae el enlace.
 */
describe('sin extracto, el aviso no repite el veredicto', () => {
  it('el aviso del extracto no se muestra dos veces', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        haySaldoDelBanco: false,
        diferenciaCop: null,
        cuadra: false,
        avisos: [
          'No hay extracto bancario cargado hasta esta fecha: el saldo de la cuenta de recaudo es desconocido y el cuadre NO se puede hacer. Carga el extracto en Conciliación.',
        ],
      }),
    );
    await pintar();

    expect(testId('cuadre-veredicto')?.textContent).toContain('No se pudo cuadrar');
    // El bloque de avisos no se monta: lo único que traía ya lo dijo el veredicto.
    expect(testId('cuadre-avisos')).toBeNull();
  });

  /*
   * Lo que NO puede pasar: que el filtro se coma un aviso que dice otra cosa.
   * «Faltan tarifas de los costos de la plata» no tiene nada que ver con el
   * extracto y es lo único que avisa que el margen está incompleto.
   */
  it('los avisos que dicen OTRA cosa se siguen mostrando', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        haySaldoDelBanco: false,
        diferenciaCop: null,
        cuadra: false,
        avisos: [
          'No hay extracto bancario cargado hasta esta fecha.',
          'Faltan tarifas de los costos de la plata: el margen no descuenta lo que no está configurado.',
        ],
      }),
    );
    await pintar();

    const avisos = testId('cuadre-avisos')?.textContent ?? '';
    expect(avisos).toContain('Faltan tarifas');
    expect(avisos).not.toContain('extracto bancario');
  });

  /*
   * 🔴 El caso que Nico vio de verdad: CON extracto cargado y descuadre. El
   * veredicto dice «Falta plata de terceros: $1.604.900» y el back manda un
   * aviso con el mismo número. Se cae el gemelo; el de las partidas por
   * identificar, que es otro hecho, se queda.
   */
  it('con descuadre, el aviso que repite la diferencia se cae y el otro se queda', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        haySaldoDelBanco: true,
        cuadra: false,
        diferenciaCop: -1_604_900,
        avisos: [
          '🔴 En la cuenta de recaudo hay $1.604.900 MENOS de lo que se le debe a terceros. Esa plata es de propietarios e inquilinos: revísalo hoy.',
          '2 partidas por identificar ($2.101.235): es plata de alguien y se queda en el pasivo hasta que se le asigne inquilino y cuota.',
        ],
      }),
    );
    await pintar();

    const avisos = testId('cuadre-avisos')?.textContent ?? '';
    expect(avisos).toContain('2 partidas por identificar');
    expect(avisos).not.toContain('MENOS de lo que se le debe');
    // Y el veredicto sí lo dice, con su color y su titular.
    expect(testId('cuadre-veredicto')?.textContent).toContain('1.604.900');
  });

  it('con extracto cargado y cuadrando, los avisos pasan todos', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        haySaldoDelBanco: true,
        avisos: ['Hay 3 entradas del extracto que nadie asignó.'],
      }),
    );
    await pintar();

    expect(testId('cuadre-avisos')?.textContent).toContain('nadie asignó');
  });
});
