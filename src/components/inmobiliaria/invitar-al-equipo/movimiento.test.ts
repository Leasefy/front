import { describe, expect, it } from 'vitest';
import { motionTransition } from '@leasefy/cadence';
import { ENTRAR, REACOMODAR, SALIR, coreografia } from './movimiento';

/**
 * El ritmo de «Invitar a tu equipo» (02-10-2026): sólo `transform` y
 * `opacity`, entrar más largo que salir, y con movimiento reducido nada se
 * desplaza ni escala.
 */

const PROPIEDADES_PERMITIDAS = new Set(['opacity', 'x', 'y', 'scale', 'transition']);

describe('movimiento — la coreografía del modal', () => {
  it('sólo anima opacidad y transformaciones', () => {
    const mov = coreografia(false);
    for (const nombre of ['llega', 'cambia', 'salta'] as const) {
      for (const fase of ['initial', 'animate', 'exit'] as const) {
        for (const prop of Object.keys(mov[nombre][fase])) {
          expect(PROPIEDADES_PERMITIDAS.has(prop), `${nombre}.${fase}.${prop}`).toBe(true);
        }
      }
    }
  });

  it('entrar dura 200 ms y desacelera; salir, 150 ms y acelera; reacomodar, 250 ms', () => {
    expect(ENTRAR).toMatchObject({ duration: 0.2, ease: [0.22, 1, 0.36, 1] });
    expect(SALIR).toMatchObject({ duration: 0.15, ease: [0.4, 0, 1, 1] });
    expect(REACOMODAR).toMatchObject({ visualDuration: 0.25 });
  });

  it('son los tokens de Cadence, no números escritos acá', () => {
    expect(ENTRAR).toBe(motionTransition.enter);
    expect(SALIR).toBe(motionTransition.exit);
    expect(REACOMODAR).toBe(motionTransition.layout);
  });

  it('las distancias son chicas: 8 px lo que llega, 4 px lo que cambia en su lugar', () => {
    const mov = coreografia(false);
    expect(mov.llega.initial).toMatchObject({ opacity: 0, y: 8 });
    expect(mov.cambia.initial).toMatchObject({ opacity: 0, y: 4 });
    expect(mov.salta.initial).toMatchObject({ opacity: 0, scale: 0.6 });
    expect(mov.reacomodo).toBe('position');
  });

  it('con movimiento reducido quedan sólo los fundidos', () => {
    const mov = coreografia(true);
    expect(mov.llega.initial).toMatchObject({ opacity: 0, y: 0 });
    expect(mov.llega.exit).toMatchObject({ opacity: 0, y: 0 });
    expect(mov.cambia.initial).toMatchObject({ opacity: 0, y: 0 });
    expect(mov.salta.initial).toMatchObject({ opacity: 0, scale: 1 });
    expect(mov.reacomodo).toBe(false);
  });
});
