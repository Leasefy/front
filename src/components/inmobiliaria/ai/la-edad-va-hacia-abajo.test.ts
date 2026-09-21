/**
 * 🔴 La edad de algo va hacia ABAJO, nunca hacia arriba.
 *
 * ── De dónde sale ───────────────────────────────────────────────────────────
 *
 * 20-09, con el Piloto abierto en el navegador. La misma decisión —creada el 1
 * de septiembre a las 00:29— aparecía dos veces en la misma pantalla con dos
 * edades distintas: el resumen del Gerente decía «lleva 19 días esperando» y
 * la tarjeta de la bandeja, tres centímetros más abajo, «hace 20d». Eran 19
 * días y 22 horas: una contaba hacia abajo y la otra redondeaba.
 *
 * `relativeTime` la usan 30 pantallas (matching, estudio, asegurabilidad,
 * conciliación, cotizador, los deudores de cobranza), así que el día de más
 * estaba en todas. Y en cobranza el día no es estética: los días de mora y las
 * cadencias de la Ley 2300 se cuentan.
 */

import { describe, expect, it } from 'vitest';

import { relativeTime } from './ColaHumana';

/** Un `t` que devuelve «<unidad>:<n>», para leer la unidad y el número. */
const t = (clave: string, params?: Record<string, unknown>) =>
  `${clave.split('.').pop()}:${params?.n ?? ''}`;

const SEG = 1000;
const MIN = 60 * SEG;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const hace = (ms: number) => relativeTime(new Date(Date.now() - ms).toISOString(), t);

describe('relativeTime', () => {
  it('🔴 19 días y 22 horas son 19 días, no 20', () => {
    expect(hace(19 * DIA + 22 * HORA)).toBe('d:19');
  });

  it('🔴 23 horas y 40 minutos NO son un día: el día no ha pasado', () => {
    /*
     * Antes redondeaba en cascada: los minutos subían la hora a 24, 24 pasaba
     * el corte de las horas, y salía «hace 1d» sin que el día hubiera pasado.
     */
    expect(hace(23 * HORA + 40 * MIN)).toBe('h:23');
  });

  it('59 minutos y 40 segundos son 59 minutos, no una hora', () => {
    expect(hace(59 * MIN + 40 * SEG)).toBe('m:59');
  });

  it('59 segundos son 59 segundos', () => {
    expect(hace(59 * SEG)).toBe('s:59');
  });

  it('las unidades exactas caen donde deben', () => {
    expect(hace(60 * SEG)).toBe('m:1');
    expect(hace(HORA)).toBe('h:1');
    expect(hace(DIA)).toBe('d:1');
  });

  it('una fecha del futuro no da números negativos', () => {
    expect(relativeTime(new Date(Date.now() + 5 * DIA).toISOString(), t)).toBe('s:0');
  });

  it('una fecha ilegible no dice nada, en vez de decir «NaN»', () => {
    expect(relativeTime('no es una fecha', t)).toBe('');
  });
});
