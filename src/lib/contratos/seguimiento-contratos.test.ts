/**
 * SEGUIMIENTO-FRONT (03-10-2026) — lo del back de Contratos (ff282197) en la
 * pantalla: la terminación programada que la LISTA sólo trae en
 * `estadoParaMostrar`, los valores por defecto de «Nuevo contrato» y el
 * depósito sólo en comercial (Nico, TAL CUAL).
 */
import { describe, expect, it } from 'vitest';

import type { Contract, EstadoDelContratoDelBack } from '@/lib/types/contract';
import { estadoParaMostrar } from './estado-para-mostrar';
import { vigenciaDelContrato } from './vigencia';
import {
  porQueSeProponeElProrrateo,
  terminosConLosValoresDelBack,
  type ValoresPorDefectoDelContrato,
} from './valores-por-defecto';
import { depositoAplica, depositoParaMostrar } from './deposito-del-contrato';

const HOY = new Date('2026-10-03T12:00:00');

const activo = (over: Partial<EstadoDelContratoDelBack> = {}): EstadoDelContratoDelBack => ({
  estado: 'ACTIVO',
  vigencia: 'VIGENTE',
  empiezaEl: null,
  terminaEl: '2027-03-31',
  porVencer: false,
  vencidoSinRenovar: false,
  terminacionProgramada: null,
  leyenda: 'Activo',
  ...over,
});

describe('estadoParaMostrar — 🔴 la terminación programada del back (C-01)', () => {
  it('🔴 la fila de la LISTA (sin `terminadoEn`) dice «Activo · Termina el 31 oct» con lo que manda el back', () => {
    // Así llega una fila de `GET /contracts`: sin `terminadoEn`.
    const contrato = {
      status: 'active',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      estadoParaMostrar: activo({
        terminaEl: '2026-10-31',
        terminacionProgramada: {
          fecha: '2026-10-31',
          motivo: 'MUTUO_ACUERDO',
          motivoLegible: 'Mutuo acuerdo',
          nota: null,
          finPactadoOriginal: '2027-03-31',
        },
      }),
    } as Pick<Contract, 'status' | 'startDate' | 'estadoParaMostrar'>;
    const vigencia = vigenciaDelContrato({ status: 'active', endDate: '2027-03-31', startDate: '2026-04-01' }, HOY);
    const e = estadoParaMostrar({ contrato, vigencia, etiquetaDelEstado: 'Activo', locale: 'es', hoy: HOY });
    expect(e.clave).toBe('TERMINA');
    expect(e.texto).toMatch(/^Activo · Termina el 31 de oct/);
  });

  it('«Empieza el …» sale del back aunque la fecha local diga otra cosa', () => {
    const contrato = {
      status: 'active',
      startDate: '2026-11-01',
      estadoParaMostrar: activo({ estado: 'POR_EMPEZAR', vigencia: 'POR_EMPEZAR', empiezaEl: '2026-11-01' }),
    } as Pick<Contract, 'status' | 'startDate' | 'estadoParaMostrar'>;
    const vigencia = vigenciaDelContrato({ status: 'active', endDate: '2027-10-31', startDate: '2026-11-01' }, HOY);
    const e = estadoParaMostrar({ contrato, vigencia, etiquetaDelEstado: 'Activo', locale: 'es', hoy: HOY });
    expect(e.clave).toBe('POR_EMPEZAR');
    expect(e.texto).toMatch(/^Empieza el 1 de nov/);
  });

  it('activo sin terminación programada: la etiqueta de siempre', () => {
    const contrato = { status: 'active', startDate: '2026-04-01', estadoParaMostrar: activo() } as Pick<
      Contract,
      'status' | 'startDate' | 'estadoParaMostrar'
    >;
    const vigencia = vigenciaDelContrato({ status: 'active', endDate: '2027-03-31', startDate: '2026-04-01' }, HOY);
    expect(estadoParaMostrar({ contrato, vigencia, etiquetaDelEstado: 'Activo', locale: 'es', hoy: HOY }).clave).toBe('NORMAL');
  });

  it('un back anterior (sin `estadoParaMostrar`): como antes, por `terminadoEn`', () => {
    const contrato = { status: 'active', startDate: '2026-04-01' } as Pick<Contract, 'status' | 'startDate'>;
    const vigencia = vigenciaDelContrato(
      { status: 'active', endDate: '2027-03-31', startDate: '2026-04-01', terminadoEn: '2026-10-31' },
      HOY,
    );
    expect(estadoParaMostrar({ contrato, vigencia, etiquetaDelEstado: 'Activo', locale: 'es', hoy: HOY }).clave).toBe('TERMINA');
  });
});

const valores = (over: Partial<ValoresPorDefectoDelContrato> = {}): ValoresPorDefectoDelContrato => ({
  prorratear: true,
  origenDelProrrateo: 'CONTRATOS_DE_LA_INMOBILIARIA',
  contratosVigentes: { prorrateados: 28, fechaAFecha: 2 },
  diasDePlazo: 3,
  origenDelPlazo: 'INMOBILIARIA',
  duracionMeses: 12,
  finSugerido: '2027-10-02',
  comisionPorcentaje: 10,
  penalidadTerminacionCanones: 3,
  reglaDeCobro: {
    modo: 'PRORRATEADO',
    venceElDia: 1,
    primeraCuotaVenceEl: '2026-10-03',
    diasDePlazo: 3,
    origenDelPlazo: 'INMOBILIARIA',
    moraDesdeElDia: 4,
    diaDePagoLegado: null,
    diaDePagoAplica: false,
    frase: 'Se genera y vence el 1 de cada mes…',
  },
  ...over,
});

describe('valores por defecto de «Nuevo contrato» (C-13: los de la inmobiliaria)', () => {
  it('🔴 el prorrateo y el plazo salen del back aunque la agencia no publique el prorrateo', () => {
    const deLaAgencia = { diaDePago: 5, prorratear: null, diasDePlazo: null };
    expect(terminosConLosValoresDelBack(deLaAgencia, valores())).toEqual({ diaDePago: 5, prorratear: true, diasDePlazo: 3 });
  });

  it('sin los valores del back (ruta caída o back anterior) quedan los de la agencia', () => {
    const deLaAgencia = { diaDePago: 1, prorratear: null, diasDePlazo: 5 };
    expect(terminosConLosValoresDelBack(deLaAgencia, null)).toBe(deLaAgencia);
  });

  it('dice de dónde sale la propuesta', () => {
    expect(porQueSeProponeElProrrateo(valores())).toBe(
      'Así lo propone la inmobiliaria: 28 de tus 30 contratos vigentes van prorrateados.',
    );
    expect(
      porQueSeProponeElProrrateo(
        valores({ origenDelProrrateo: 'REGLA_DE_LA_CASA', contratosVigentes: { prorrateados: 0, fechaAFecha: 0 } }),
      ),
    ).toMatch(/todavía no tienes contratos vigentes/);
    expect(
      porQueSeProponeElProrrateo(valores({ prorratear: false, contratosVigentes: { prorrateados: 1, fechaAFecha: 4 } })),
    ).toBe('Así lo propone la inmobiliaria: 4 de tus 5 contratos vigentes van fecha a fecha.');
    expect(porQueSeProponeElProrrateo(valores({ contratosVigentes: { prorrateados: 29, fechaAFecha: 0 } }))).toBe(
      'Así lo propone la inmobiliaria: tus 29 contratos vigentes van prorrateados.',
    );
  });
});

describe('depósito sólo en comercial (Nico, TAL CUAL)', () => {
  it('🔴 manda el back: en vivienda no aplica aunque el uso diga comercial o haya uno viejo guardado', () => {
    const c = { usoInmueble: 'COMERCIAL' as const, deposit: 5_000_000, depositoDelContrato: { aplica: false, valorCop: 5_000_000 } };
    expect(depositoAplica(c)).toBe(false);
    expect(depositoParaMostrar(c)).toBeNull();
  });

  it('en comercial aplica; sin valor pactado, `null` (la ficha dice «Sin depósito pactado»)', () => {
    expect(depositoAplica({ usoInmueble: null, depositoDelContrato: { aplica: true, valorCop: null } })).toBe(true);
    expect(depositoParaMostrar({ usoInmueble: null, depositoDelContrato: { aplica: true, valorCop: null } })).toBeNull();
    expect(depositoParaMostrar({ usoInmueble: null, depositoDelContrato: { aplica: true, valorCop: 8_000_000 } })).toBe(8_000_000);
  });

  it('un back anterior: el uso del contrato, como hasta hoy', () => {
    expect(depositoAplica({ usoInmueble: 'COMERCIAL', deposit: 1 })).toBe(true);
    expect(depositoAplica({ usoInmueble: 'VIVIENDA', deposit: 1 })).toBe(false);
  });
});
