import { describe, it, expect } from 'vitest';
import { mosaicosDelEstado } from './tarjeta-del-estado';
import { t } from '@/lib/i18n/i18n-test-stub';

/**
 * CH-02 / CH-04 (QA del chat, 04-10-2026; CHAT-FIX). En el laboratorio, con el
 * plazo sin fijar (CR-31), la tarjeta debajo de la respuesta decía «CARTERA POR
 * COBRAR $ 0 · CONTRATOS EN CARTERA 0 · PAGADO HOY $2,2 M» con $ 196.887.550
 * vencidos sin pagar. Lo vencido va primero (P-8) y la plata, entera.
 */
const BASE = { deudoresActivos: 0, pagadoHoyCop: 2_217_112, llamadasHoy: 0, escalacionesPendientes: 0, enPrejuridico: 0 };

describe('mosaicosDelEstado — lo vencido sin pagar', () => {
  it('con la mora en $ 0 y plata vencida, dice lo vencido (no «Cartera por cobrar $ 0»)', () => {
    const m = mosaicosDelEstado(
      { ...BASE, carteraCop: 0, contratosEnCartera: 0, vencidoCop: 196_887_550, porVencerCop: 824_069_333 },
      t,
    );
    expect(m.map((x) => x.label)).toEqual(['Vencido sin pagar', 'Por vencer', 'Pagado hoy']);
    expect(m.map((x) => String(x.value))).toEqual(['$\u00a0196.887.550', '$\u00a0824.069.333', '$\u00a02.217.112']);
    expect(m.some((x) => String(x.value) === '$ 0')).toBe(false);
  });

  it('con mora de verdad, la mora y sus contratos van aparte, después de lo vencido', () => {
    const m = mosaicosDelEstado(
      { ...BASE, pagadoHoyCop: 0, carteraCop: 50_000_000, contratosEnCartera: 4, vencidoCop: 80_000_000, porVencerCop: 10_000_000 },
      t,
    );
    expect(m.map((x) => x.label)).toEqual(['Vencido sin pagar', 'En mora (pasó el plazo)', 'Contratos en cartera', 'Por vencer']);
  });
});
