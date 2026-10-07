/**
 * COLA-FRONT (04-10-2026, la recomendada): un propietario con algo arrendado y
 * NINGÚN giro programado (`proximoGiro: null`, lo agrega COLA-BACK) no está
 * «Al día»: es «Sin día de giro», y «día de giro» entra a «Datos por completar».
 * Con un back que no manda `proximoGiro`, todo como antes.
 */
import { describe, expect, it } from 'vitest';

import { datosPendientesDelPropietario, girosDelPropietario } from './giros-del-propietario';
import { textoDeDatosPorCompletar } from './datos-por-completar';
import { propietarioSinDiaDeGiro } from '@/components/estado-de-cuenta/ResumenEnLaFicha';

const base = {
  pendingBalance: 0,
  girosVencidos: 0,
  giroVencidoDesde: null,
  generadoSinGirar: 0,
  activeLeases: 1,
  copropiedadesArrendadas: 0,
  datosPendientes: [] as Array<'cuentaBancaria'>,
};

describe('sin día de giro', () => {
  it('🔴 arrendado y `proximoGiro: null` → «Sin día de giro» y entra a datos por completar', () => {
    const p = { ...base, proximoGiro: null };
    expect(girosDelPropietario(p).sinDiaDeGiro).toBe(true);
    expect(datosPendientesDelPropietario(p)).toEqual(['diaDeGiro']);
    expect(textoDeDatosPorCompletar(datosPendientesDelPropietario(p))).toBe('Datos por completar: día de giro');
  });

  it('una copropiedad arrendada también cuenta', () => {
    const p = { ...base, activeLeases: 0, copropiedadesArrendadas: 1, proximoGiro: null };
    expect(girosDelPropietario(p).sinDiaDeGiro).toBe(true);
  });

  it('con próximo giro, está «Al día»', () => {
    const p = { ...base, proximoGiro: { fecha: '2026-10-15', monto: 1_167_325 } };
    expect(girosDelPropietario(p).sinDiaDeGiro).toBe(false);
    expect(datosPendientesDelPropietario(p)).toEqual([]);
  });

  it('back anterior (sin el campo), sin nada arrendado, con atraso o sin ver la plata: no se afirma', () => {
    expect(girosDelPropietario({ ...base }).sinDiaDeGiro).toBe(false);
    expect(girosDelPropietario({ ...base, activeLeases: 0, proximoGiro: null }).sinDiaDeGiro).toBe(false);
    expect(girosDelPropietario({ ...base, pendingBalance: 3_700_200, proximoGiro: null }).sinDiaDeGiro).toBe(false);
    expect(girosDelPropietario({ ...base, plataOculta: true, proximoGiro: null }).sinDiaDeGiro).toBe(false);
  });

  it('se suma a lo que ya faltaba, sin repetirse', () => {
    const p = { ...base, datosPendientes: ['cuentaBancaria' as const], proximoGiro: null };
    expect(datosPendientesDelPropietario(p)).toEqual(['cuentaBancaria', 'diaDeGiro']);
  });

  it('🔴 la ficha lo sabe por el resumen: arrendado, sin nada por girar ni próximo giro', () => {
    const nada = { restaPorPagar: 0, proxima: null, enMora: false, enPlazo: false };
    expect(propietarioSinDiaDeGiro(nada, true)).toBe(true);
    expect(propietarioSinDiaDeGiro(nada, false)).toBe(false);
    expect(propietarioSinDiaDeGiro({ ...nada, proxima: { fecha: '2026-10-15', monto: 1 } }, true)).toBe(false);
    expect(propietarioSinDiaDeGiro({ ...nada, restaPorPagar: 3_501_975 }, true)).toBe(false);
    expect(propietarioSinDiaDeGiro(null, true)).toBe(false);
  });
});
