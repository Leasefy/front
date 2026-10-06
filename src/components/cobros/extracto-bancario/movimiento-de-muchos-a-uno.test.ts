/**
 * El ritmo de «Este movimiento son N recibos»: tokens de Cadence, sólo
 * `transform`/`opacity`, cascada corta y, con movimiento reducido, TODO
 * instantáneo (sin desplazamientos, sin escalas, sin conteo, duración 0).
 */
import { describe, expect, it } from 'vitest';
import { motionDistance, motionDuration, motionStagger } from '@leasefy/cadence';
import { movimientoDeMuchosAUno, retrasoEnCascada, type Coreografia } from './movimiento-de-muchos-a-uno';

const PERMITIDAS = new Set(['opacity', 'x', 'y', 'scale', 'scaleX', 'scaleY', 'transition']);

function propiedades(c: Coreografia): string[] {
  return [c.initial, c.animate, c.exit]
    .filter(Boolean)
    .flatMap((estado) => Object.keys(estado as object));
}

function todas(reducido: boolean): Coreografia[] {
  const m = movimientoDeMuchosAUno(reducido);
  return [m.tarjeta, m.recibo(0, 6), m.recibo(5, 6), m.calza, m.barra(0.98), m.aviso];
}

describe('movimiento de muchos a uno — los tokens de Cadence', () => {
  it('sólo anima transform y opacity', () => {
    for (const reducido of [false, true]) {
      for (const c of todas(reducido)) {
        for (const p of propiedades(c)) expect(PERMITIDAS.has(p), `«${p}» no es transform/opacity`).toBe(true);
      }
    }
  });

  it('la tarjeta entra subiendo `sm` en `base` y sale en `fast`', () => {
    const m = movimientoDeMuchosAUno(false);
    expect(m.tarjeta.initial).toMatchObject({ opacity: 0, y: motionDistance.sm });
    expect(m.tarjeta.animate.transition).toMatchObject({ duration: motionDuration.base });
    expect(m.tarjeta.exit?.transition).toMatchObject({ duration: motionDuration.fast });
    expect(m.cuenta).toBe(true);
  });

  it('la cascada es corta: 40 ms entre recibos y nunca más de 320 ms para el último', () => {
    expect(retrasoEnCascada(0, 6)).toBe(0);
    expect(retrasoEnCascada(1, 6)).toBeCloseTo(motionStagger.step);
    expect(retrasoEnCascada(39, 40)).toBeLessThanOrEqual(motionStagger.max + 1e-9);
    expect(retrasoEnCascada(1, 1)).toBe(0);
  });

  it('el «calza» salta cuando la suma terminó de contar', () => {
    const t = movimientoDeMuchosAUno(false).calza.animate.transition as Record<string, { delay?: number }>;
    expect(t.scale.delay).toBe(motionDuration.reveal);
    expect(t.opacity.delay).toBe(motionDuration.reveal);
  });

  it('🔴 con movimiento reducido todo es instantáneo: sin desplazamiento, sin escala, sin conteo', () => {
    const m = movimientoDeMuchosAUno(true);
    expect(m.cuenta).toBe(false);
    for (const c of todas(true)) {
      for (const estado of [c.initial, c.animate, c.exit].filter(Boolean) as Record<string, unknown>[]) {
        expect(estado.y ?? 0).toBe(0);
        expect(estado.scale ?? 1).toBe(1);
        if (estado.transition) expect(estado.transition).toEqual({ duration: 0 });
      }
    }
    // La barra queda en su porcentaje desde el primer cuadro.
    expect(m.barra(0.7).initial).toEqual({ scaleX: 0.7 });
  });
});
