/**
 * QA-MIGRACION-95 (fork de hallazgos, 06-10-2026): el porqué del candado del
 * paso 6 cuando lo que frena es el PLAN DE CUENTAS.
 *
 * Visto en el muro de una inmobiliaria nueva (b-muro, «muro-porque-contables»):
 * «Los saldos iniciales y los movimientos esperan a Cuentas del PUC: cada
 * saldo y cada movimiento se imputa a un propietario, un inquilino o un
 * contrato, y esos tienen que estar cargados primero. El plan de cuentas no
 * espera…». La frase es la de esperar a terceros y contratos con el paso del
 * plan metido adentro: se contradice sola y no dice por qué el plan frena.
 */
import { describe, expect, it } from 'vitest';

import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';
import { claveDelPorque } from './MuroDeMigracion';

const muroEs = (es as unknown as { migracion: { muro: Record<string, string> } }).migracion.muro;
const muroEn = (en as unknown as { migracion: { muro: Record<string, string> } }).migracion.muro;

describe('el porqué del candado (MuroDeMigracion)', () => {
  it('los registros contables frenados por el plan de cuentas dicen que esperan al plan, no a terceros', () => {
    const clave = claveDelPorque('contables', 'puc');
    expect(clave).toBe('migracion.muro.esperanElPlanDeCuentas');
    const frase = muroEs.esperanElPlanDeCuentas;
    expect(frase).toBeTruthy();
    expect(frase).not.toMatch(/propietario, un inquilino o un contrato/);
    expect(frase).not.toMatch(/no espera/);
    expect(muroEn.esperanElPlanDeCuentas).toBeTruthy();
  });

  it('frenados por terceros o contratos, la frase de siempre; los demás pasos, «Primero termina…»', () => {
    expect(claveDelPorque('contables', 'contratos')).toBe('migracion.muro.esperanTercerosYContratos');
    expect(claveDelPorque('contables', 'propietarios')).toBe('migracion.muro.esperanTercerosYContratos');
    expect(claveDelPorque('inquilinos', 'propietarios')).toBe('migracion.muro.primero');
    expect(claveDelPorque('contratos', 'propiedades')).toBe('migracion.muro.primero');
  });
});
