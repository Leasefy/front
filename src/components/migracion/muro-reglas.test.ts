/**
 * Las reglas del muro — lo que decide si alguien entra al producto.
 *
 * Cada caso de acá es una manera concreta de dejar a un cliente afuera o de
 * encerrarlo adentro. Por eso se prueban como funciones puras y no a través
 * de la pantalla: acá no hay nada que se pueda tapar con un mock.
 */

import { describe, it, expect } from 'vitest';
import type { PasoDeMigracion } from '@/lib/api/migracion-estado.service';
import {
  siguientePaso,
  normalizarEstado,
  pasoActual,
  pasoHabilitado,
  pasoQueFrena,
  todoListo,
} from './muro-reglas';

function paso(
  id: PasoDeMigracion['id'],
  estado: PasoDeMigracion['estado'],
  conteo = 0,
): PasoDeMigracion {
  return { id, estado, detalle: null, conteo };
}

/** El estado típico de una inmobiliaria que recién entra: los cinco por hacer. */
const RECIEN_LLEGADA: PasoDeMigracion[] = [
  paso('terceros', 'pendiente'),
  paso('propiedades', 'pendiente'),
  paso('contratos', 'pendiente'),
  paso('puc', 'pendiente'),
  paso('contables', 'pendiente'),
];

// ══════════════════════════════════════════════════════════════════════════

describe('normalizarEstado — 🔴 ante la duda, NO se bloquea', () => {
  it('bloquea sólo con un estado bien formado que lo pide', () => {
    const r = normalizarEstado({ bloquea: true, resuelta: null, pasos: RECIEN_LLEGADA });
    expect(r).not.toBeNull();
    expect(r?.pasos).toHaveLength(5);
  });

  it.each([
    ['bloquea: false', { bloquea: false, resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea ausente', { resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea como texto', { bloquea: 'true', resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea como 1', { bloquea: 1, resuelta: null, pasos: RECIEN_LLEGADA }],
    ['sin pasos', { bloquea: true, resuelta: null }],
    ['pasos vacío', { bloquea: true, resuelta: null, pasos: [] }],
    ['pasos no es lista', { bloquea: true, resuelta: null, pasos: { terceros: 'listo' } }],
    ['un paso con id desconocido', { bloquea: true, pasos: [paso('terceros', 'listo'), { id: 'otra_cosa', estado: 'listo', detalle: null, conteo: 0 }] }],
    ['un paso con estado desconocido', { bloquea: true, pasos: [{ id: 'terceros', estado: 'a_medias', detalle: null, conteo: 0 }] }],
    ['un paso sin conteo', { bloquea: true, pasos: [{ id: 'terceros', estado: 'listo', detalle: null }] }],
    ['una cadena', 'bloquea'],
    ['null', null],
    ['undefined', undefined],
    ['un HTML de error', '<!doctype html><h1>502</h1>'],
  ])('%s → el panel se ve normal', (_caso, bruto) => {
    expect(normalizarEstado(bruto)).toBeNull();
  });

  it('una `resuelta` que no reconoce no rompe: queda en null y el muro sigue en pie', () => {
    const r = normalizarEstado({ bloquea: true, resuelta: 'algo_nuevo', pasos: RECIEN_LLEGADA });
    expect(r?.resuelta).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('pasoHabilitado — el paso N+1 espera al N', () => {
  it('recién llegada: sólo el primero se puede empezar', () => {
    expect(pasoHabilitado(RECIEN_LLEGADA, 0)).toBe(true);
    expect(pasoHabilitado(RECIEN_LLEGADA, 1)).toBe(false);
    expect(pasoHabilitado(RECIEN_LLEGADA, 2)).toBe(false);
  });

  it('con el primero listo se abre el segundo, y sólo el segundo', () => {
    const pasos = [paso('terceros', 'listo', 42), ...RECIEN_LLEGADA.slice(1)];
    expect(pasoHabilitado(pasos, 1)).toBe(true);
    expect(pasoHabilitado(pasos, 2)).toBe(false);
  });

  it('el paso 5 (registros contables) NO se abre sin el 4 (plan de cuentas) listo', () => {
    // Un asiento se imputa a cuentas; sin PUC no hay a qué imputarlo.
    const pasos = [
      paso('terceros', 'listo'),
      paso('propiedades', 'listo'),
      paso('contratos', 'listo'),
      paso('puc', 'pendiente'),
      paso('contables', 'pendiente'),
    ];
    expect(pasoHabilitado(pasos, 3)).toBe(true);
    expect(pasoHabilitado(pasos, 4)).toBe(false);
    expect(pasoQueFrena(pasos, 4)?.id).toBe('puc');

    const conPuc = [...pasos.slice(0, 3), paso('puc', 'listo', 75), paso('contables', 'pendiente')];
    expect(pasoHabilitado(conPuc, 4)).toBe(true);
  });

  it('un paso que el back marca `no_disponible` nunca se habilita — no hay botón que apretar', () => {
    const pasos = [
      paso('terceros', 'listo'),
      paso('propiedades', 'listo'),
      paso('contratos', 'listo'),
      paso('puc', 'no_disponible'),
    ];
    expect(pasoHabilitado(pasos, 3)).toBe(false);
  });

  it('un `no_disponible` intercalado NO congela a los de abajo', () => {
    // Si un módulo caído frenara lo que viene después, el muro sería una
    // cárcel: nadie podría terminar nunca.
    const pasos = [
      paso('terceros', 'listo'),
      paso('puc', 'no_disponible'),
      paso('propiedades', 'pendiente'),
    ];
    expect(pasoHabilitado(pasos, 2)).toBe(true);
  });
});

describe('pasoQueFrena — el porqué que se muestra bajo el candado', () => {
  it('nombra el paso inmediatamente anterior que falta, no el primero de la lista', () => {
    const pasos = [
      paso('terceros', 'pendiente'),
      paso('propiedades', 'pendiente'),
      paso('contratos', 'pendiente'),
    ];
    expect(pasoQueFrena(pasos, 2)?.id).toBe('propiedades');
  });

  it('el primer paso no lo frena nadie', () => {
    expect(pasoQueFrena(RECIEN_LLEGADA, 0)).toBeNull();
  });
});

describe('pasoActual — dónde parás hoy', () => {
  it('es el primer exigible sin terminar', () => {
    const pasos = [paso('terceros', 'listo'), ...RECIEN_LLEGADA.slice(1)];
    expect(pasoActual(pasos)).toBe(1);
  });

  it('con todo listo no se queda colgado fuera de rango', () => {
    const pasos = [paso('terceros', 'listo'), paso('propiedades', 'listo')];
    expect(pasoActual(pasos)).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('todoListo — la puerta de «Ya terminé»', () => {
  it('con algo pendiente, no', () => {
    expect(todoListo(RECIEN_LLEGADA)).toBe(false);
  });

  it('con los cinco listos, sí', () => {
    const pasos = [
      paso('terceros', 'listo', 42),
      paso('propiedades', 'listo', 30),
      paso('contratos', 'listo', 28),
      paso('puc', 'listo', 75),
      paso('contables', 'listo', 1),
    ];
    expect(todoListo(pasos)).toBe(true);
  });

  it('con los tres primeros listos y el PUC pendiente, todavía no', () => {
    const pasos = [
      paso('terceros', 'listo', 42),
      paso('propiedades', 'listo', 30),
      paso('contratos', 'listo', 28),
      paso('puc', 'pendiente'),
      paso('contables', 'pendiente'),
    ];
    expect(todoListo(pasos)).toBe(false);
  });

  it('los que el back marca `no_disponible` no cuentan — ni a favor ni en contra', () => {
    const pasos = [
      paso('terceros', 'listo', 42),
      paso('propiedades', 'listo', 30),
      paso('contratos', 'listo', 28),
      paso('puc', 'listo', 75),
      paso('contables', 'no_disponible'),
    ];
    expect(todoListo(pasos)).toBe(true);
  });

  it('todos `no_disponible` NO es «todo listo»', () => {
    // Sería ofrecer la salida sin que la persona haya hecho nada, que es
    // justo el cartel que había antes de este trabajo.
    expect(todoListo([paso('puc', 'no_disponible'), paso('contables', 'no_disponible')])).toBe(
      false,
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// siguientePaso — a dónde seguir desde donde estoy parado
// ══════════════════════════════════════════════════════════════════════════

/** Para `siguientePaso` sólo importa el estado; el id es cualquiera válido. */
const p = (estado: PasoDeMigracion['estado']) => paso('terceros', estado);

describe('siguientePaso', () => {
  it('desde un paso listo va al primer pendiente que le sigue', () => {
    expect(siguientePaso([p('listo'), p('pendiente'), p('pendiente')], 0)).toBe(1);
  });

  it('salta los que le siguen si están frenados y vuelve al que falta ANTES', () => {
    // Borraron el único propietario: terceros volvió a pendiente y frena a
    // los de abajo. Desde «propiedades» (listo) hay que volver al 0.
    expect(siguientePaso([p('pendiente'), p('listo'), p('pendiente')], 1)).toBe(0);
  });

  it('un no_disponible intercalado no es destino ni frena', () => {
    expect(siguientePaso([p('listo'), p('no_disponible'), p('pendiente')], 0)).toBe(2);
  });

  it('con todo listo no hay a dónde ir', () => {
    expect(siguientePaso([p('listo'), p('listo')], 1)).toBeNull();
    expect(siguientePaso([p('listo'), p('listo')], 0)).toBeNull();
  });

  it('si el único pendiente es el mismo, tampoco', () => {
    expect(siguientePaso([p('listo'), p('pendiente')], 1)).toBeNull();
  });
});
