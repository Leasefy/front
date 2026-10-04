/**
 * Las llaves de los centavos vistas desde el front («centavos en todo», C3-FRONT).
 *
 * Lo que se protege:
 *   · un área sólo cuenta como prendida si el back dice `true` (nunca por error);
 *   · la deuda pide sus DOS áreas;
 *   · un back viejo (404), caído o raro → sin centavos, como hoy;
 *   · una pregunta cada 60 s, compartida por todos los campos;
 *   · las reglas de entero y la frase «sin centavos» SÓLO con la llave apagada.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as servicio from '@/lib/api/config-de-plata.service';
import {
  AREAS_DE_LA_DEUDA,
  AREAS_DE_PLATA,
  MENSAJE_PLATA_HASTA_EL_CENTAVO,
  NINGUNA_CON_CENTAVOS,
  VIGENCIA_DE_LA_CONFIG_DE_PLATA_MS,
  conCentavosEn,
  configDePlataAhora,
  esPlataQueSeAcepta,
  fijarConfigDePlataParaPruebas,
  fraseDeLaPlata,
  leerConfigDePlata,
  refrescarConfigDePlata,
} from './con-centavos';
import { usePlataConCentavos } from './use-plata-con-centavos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const todas = (valor: boolean) => Object.fromEntries(AREAS_DE_PLATA.map((a) => [a, valor]));

beforeEach(() => {
  fijarConfigDePlataParaPruebas(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  fijarConfigDePlataParaPruebas(null);
});

describe('leerConfigDePlata', () => {
  it('lee el cuerpo de GET /config/plata área por área', () => {
    const estado = leerConfigDePlata({
      conCentavos: { ...todas(false), contratos_y_cuotas: true, tesoreria_y_conciliacion: true },
    });
    expect(estado.contratos_y_cuotas).toBe(true);
    expect(estado.tesoreria_y_conciliacion).toBe(true);
    expect(estado.cobros_recibos_y_cartera).toBe(false);
    expect(Object.keys(estado).sort()).toEqual([...AREAS_DE_PLATA].sort());
  });

  it('sólo un `true` literal prende un área: lo raro queda apagado', () => {
    const estado = leerConfigDePlata({
      conCentavos: { contratos_y_cuotas: 'true', cobros_recibos_y_cartera: 1, nomina: null, inventada: true },
    });
    expect(estado).toEqual(NINGUNA_CON_CENTAVOS);
  });

  it('un cuerpo que no es el esperado (404 de un back viejo, lista, texto) → ninguna', () => {
    for (const cuerpo of [undefined, null, 'Not Found', [], { statusCode: 404 }, { conCentavos: [] }]) {
      expect(leerConfigDePlata(cuerpo)).toEqual(NINGUNA_CON_CENTAVOS);
    }
  });
});

describe('conCentavosEn', () => {
  const soloContratos = leerConfigDePlata({ conCentavos: { contratos_y_cuotas: true } });
  const deuda = leerConfigDePlata({
    conCentavos: { contratos_y_cuotas: true, cobros_recibos_y_cartera: true },
  });

  it('una sola área', () => {
    expect(conCentavosEn(soloContratos, 'contratos_y_cuotas')).toBe(true);
    expect(conCentavosEn(soloContratos, 'nomina')).toBe(false);
  });

  it('la deuda pide sus DOS áreas: con una sola, al peso', () => {
    expect(conCentavosEn(soloContratos, AREAS_DE_LA_DEUDA)).toBe(false);
    expect(conCentavosEn(deuda, AREAS_DE_LA_DEUDA)).toBe(true);
  });

  it('sin áreas no hay centavos', () => {
    expect(conCentavosEn(deuda, undefined)).toBe(false);
    expect(conCentavosEn(deuda, null)).toBe(false);
    expect(conCentavosEn(deuda, [])).toBe(false);
  });
});

describe('la frase y la regla de la plata escrita, según la llave', () => {
  it('apagada: sólo pesos enteros y la frase «sin centavos» de cada campo', () => {
    expect(esPlataQueSeAcepta(2_350_000, false)).toBe(true);
    expect(esPlataQueSeAcepta(2_350_000.29, false)).toBe(false);
    expect(fraseDeLaPlata('Escribe el canon en pesos enteros, sin centavos.', false)).toBe(
      'Escribe el canon en pesos enteros, sin centavos.',
    );
  });

  it('prendida: hasta dos decimales; el tercero se frena; la frase es la del back', () => {
    expect(esPlataQueSeAcepta(2_350_000.29, true)).toBe(true);
    expect(esPlataQueSeAcepta(0.29, true)).toBe(true);
    expect(esPlataQueSeAcepta(1_234.567, true)).toBe(false);
    expect(esPlataQueSeAcepta(Number.NaN, true)).toBe(false);
    expect(fraseDeLaPlata('Escribe el canon en pesos enteros, sin centavos.', true)).toBe(
      MENSAJE_PLATA_HASTA_EL_CENTAVO,
    );
    expect(MENSAJE_PLATA_HASTA_EL_CENTAVO).not.toMatch(/sin centavos/);
  });
});

describe('refrescarConfigDePlata — una pregunta compartida, 60 s', () => {
  it('guarda lo que dijo el back', async () => {
    vi.spyOn(servicio, 'pedirConfigDePlata').mockResolvedValue({ conCentavos: todas(true) });
    const estado = await refrescarConfigDePlata();
    expect(conCentavosEn(estado, AREAS_DE_LA_DEUDA)).toBe(true);
    expect(configDePlataAhora()).toEqual(estado);
  });

  it('un back viejo (404) o caído: ninguna, sin lanzar', async () => {
    vi.spyOn(servicio, 'pedirConfigDePlata').mockRejectedValue(new Error('404'));
    await expect(refrescarConfigDePlata()).resolves.toEqual(NINGUNA_CON_CENTAVOS);
  });

  it('un fallo síncrono del cliente también es «ninguna»', async () => {
    vi.spyOn(servicio, 'pedirConfigDePlata').mockImplementation(() => {
      throw new TypeError('apiClient.get is not a function');
    });
    await expect(refrescarConfigDePlata()).resolves.toEqual(NINGUNA_CON_CENTAVOS);
  });

  it('diez campos a la vez son UNA pregunta, y no se repite antes de 60 s', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    const pedir = vi.spyOn(servicio, 'pedirConfigDePlata').mockResolvedValue({ conCentavos: todas(false) });
    await Promise.all(Array.from({ length: 10 }, () => refrescarConfigDePlata()));
    expect(pedir).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + VIGENCIA_DE_LA_CONFIG_DE_PLATA_MS - 1);
    await refrescarConfigDePlata();
    expect(pedir).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 2);
    await refrescarConfigDePlata();
    expect(pedir).toHaveBeenCalledTimes(2);
  });
});

describe('usePlataConCentavos', () => {
  let host: HTMLDivElement;
  let root: Root;
  let visto: boolean[];

  function Sonda({ areas }: { areas?: Parameters<typeof usePlataConCentavos>[0] }) {
    visto.push(usePlataConCentavos(areas));
    return null;
  }

  beforeEach(() => {
    visto = [];
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it('arranca sin centavos y se prende cuando el back lo dice', async () => {
    vi.spyOn(servicio, 'pedirConfigDePlata').mockResolvedValue({ conCentavos: todas(true) });
    await act(async () => root.render(React.createElement(Sonda, { areas: AREAS_DE_LA_DEUDA })));
    expect(visto[0]).toBe(false);
    expect(visto.at(-1)).toBe(true);
  });

  it('sin áreas no pregunta nada y es `false`', async () => {
    const pedir = vi.spyOn(servicio, 'pedirConfigDePlata').mockResolvedValue({ conCentavos: todas(true) });
    await act(async () => root.render(React.createElement(Sonda, {})));
    expect(pedir).not.toHaveBeenCalled();
    expect(visto.every((v) => v === false)).toBe(true);
  });

  it('con un back viejo se queda sin centavos', async () => {
    vi.spyOn(servicio, 'pedirConfigDePlata').mockRejectedValue(new Error('404'));
    await act(async () => root.render(React.createElement(Sonda, { areas: 'tesoreria_y_conciliacion' })));
    expect(visto.every((v) => v === false)).toBe(true);
  });
});
