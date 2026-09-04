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
  faltasDeLaFila,
  leerDeuda,
  lineasDeVeredicto,
  migracionCerrada,
  vacioPorMigracion,
  type DeudaDeMigracion,
  type FilaMirada,
} from './muro-reglas';

function paso(
  id: PasoDeMigracion['id'],
  estado: PasoDeMigracion['estado'],
  conteo = 0,
): PasoDeMigracion {
  return { id, estado, detalle: null, conteo };
}

/** El estado típico de una inmobiliaria que recién entra: los seis por hacer. */
const RECIEN_LLEGADA: PasoDeMigracion[] = [
  paso('propietarios', 'pendiente'),
  paso('inquilinos', 'pendiente'),
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
    expect(r?.pasos).toHaveLength(6);
  });

  it.each([
    ['bloquea: false', { bloquea: false, resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea ausente', { resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea como texto', { bloquea: 'true', resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea como 1', { bloquea: 1, resuelta: null, pasos: RECIEN_LLEGADA }],
    ['sin pasos', { bloquea: true, resuelta: null }],
    ['pasos vacío', { bloquea: true, resuelta: null, pasos: [] }],
    ['pasos no es lista', { bloquea: true, resuelta: null, pasos: { terceros: 'listo' } }],
    ['un paso con id desconocido', { bloquea: true, pasos: [paso('propietarios', 'listo'), { id: 'otra_cosa', estado: 'listo', detalle: null, conteo: 0 }] }],
    ['un paso con estado desconocido', { bloquea: true, pasos: [{ id: 'propietarios', estado: 'a_medias', detalle: null, conteo: 0 }] }],
    ['un paso sin conteo', { bloquea: true, pasos: [{ id: 'propietarios', estado: 'listo', detalle: null }] }],
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
    const pasos = [paso('propietarios', 'listo', 42), ...RECIEN_LLEGADA.slice(1)];
    expect(pasoHabilitado(pasos, 1)).toBe(true);
    expect(pasoHabilitado(pasos, 2)).toBe(false);
  });

  it('el paso 5 (registros contables) NO se abre sin el 4 (plan de cuentas) listo', () => {
    // Un asiento se imputa a cuentas; sin PUC no hay a qué imputarlo.
    const pasos = [
      paso('propietarios', 'listo'),
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
      paso('propietarios', 'listo'),
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
      paso('propietarios', 'listo'),
      paso('puc', 'no_disponible'),
      paso('propiedades', 'pendiente'),
    ];
    expect(pasoHabilitado(pasos, 2)).toBe(true);
  });
});

describe('pasoQueFrena — el porqué que se muestra bajo el candado', () => {
  it('nombra el paso inmediatamente anterior que falta, no el primero de la lista', () => {
    const pasos = [
      paso('propietarios', 'pendiente'),
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
    const pasos = [paso('propietarios', 'listo'), ...RECIEN_LLEGADA.slice(1)];
    expect(pasoActual(pasos)).toBe(1);
  });

  it('con todo listo no se queda colgado fuera de rango', () => {
    const pasos = [paso('propietarios', 'listo'), paso('propiedades', 'listo')];
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
      paso('propietarios', 'listo', 42),
      paso('propiedades', 'listo', 30),
      paso('contratos', 'listo', 28),
      paso('puc', 'listo', 75),
      paso('contables', 'listo', 1),
    ];
    expect(todoListo(pasos)).toBe(true);
  });

  it('con los tres primeros listos y el PUC pendiente, todavía no', () => {
    const pasos = [
      paso('propietarios', 'listo', 42),
      paso('propiedades', 'listo', 30),
      paso('contratos', 'listo', 28),
      paso('puc', 'pendiente'),
      paso('contables', 'pendiente'),
    ];
    expect(todoListo(pasos)).toBe(false);
  });

  it('los que el back marca `no_disponible` no cuentan — ni a favor ni en contra', () => {
    const pasos = [
      paso('propietarios', 'listo', 42),
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
const p = (estado: PasoDeMigracion['estado']) => paso('propietarios', estado);

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

// ══════════════════════════════════════════════════════════════════════════
// El veredicto — terminar los pasos NO es terminar la migración
// ══════════════════════════════════════════════════════════════════════════

/** Los seis pasos en verde. Antes de este trabajo, esto solo cerraba el muro. */
const TODOS_LISTOS: PasoDeMigracion[] = [
  paso('propietarios', 'listo'),
  paso('inquilinos', 'listo'),
  paso('propiedades', 'listo'),
  paso('contratos', 'listo'),
  paso('puc', 'listo'),
  paso('contables', 'listo'),
];

/** Lo que devolvía el back de dev para la agencia de Nico el 2026-09-03. */
const RESUMEN_DE_NICO = {
  lote: null,
  total: 91,
  pendientes: 0,
  listos: 0,
  activados: 91,
  descartados: 0,
  activables: 0,
  activadosSinInmueble: 89,
  activadosSinPropietario: 89,
};

function deuda(parcial: Partial<DeudaDeMigracion> = {}): DeudaDeMigracion {
  return {
    contratos: 0,
    sinInmueble: 0,
    sinPropietario: 0,
    pendientes: 0,
    sinInquilino: null,
    ...parcial,
  };
}

describe('leerDeuda', () => {
  it('lee el resumen real de la agencia de Nico', () => {
    expect(leerDeuda(RESUMEN_DE_NICO)).toEqual({
      contratos: 91,
      pendientes: 0,
      sinInmueble: 89,
      sinPropietario: 89,
      sinInquilino: null,
    });
  });

  it('sin `porMotivo`, `sinInquilino` queda en null y NO en cero', () => {
    // Un cero afirmaría «no falta ningún inquilino». No lo sabemos.
    expect(leerDeuda(RESUMEN_DE_NICO)?.sinInquilino).toBeNull();
  });

  it('suma los tres faltantes de inquilino cuando el back los cuenta', () => {
    const r = leerDeuda({
      ...RESUMEN_DE_NICO,
      porMotivo: {
        inquilino_correo: 7,
        inquilino_nombre: 4,
        inquilino_documento_ajeno: 1,
        inmueble: 89,
      },
    });
    expect(r?.sinInquilino).toBe(12);
  });

  it('un `porMotivo` sin ninguna clave de inquilino sigue siendo «no lo sé»', () => {
    expect(leerDeuda({ ...RESUMEN_DE_NICO, porMotivo: { canon: 3 } })?.sinInquilino).toBeNull();
  });

  it('un back viejo sin los dos conteos de activados cuenta cero, no null', () => {
    // Ese back no podía producir la condición: el modo sparse no existía.
    const r = leerDeuda({ lote: null, total: 10, pendientes: 2 });
    expect(r).toEqual({
      contratos: 10,
      pendientes: 2,
      sinInmueble: 0,
      sinPropietario: 0,
      sinInquilino: null,
    });
  });

  it('no inventa números ante una respuesta que no tiene forma de resumen', () => {
    expect(leerDeuda(null)).toBeNull();
    expect(leerDeuda('boom')).toBeNull();
    expect(leerDeuda({})).toBeNull();
    expect(leerDeuda({ total: 'muchos', pendientes: 0 })).toBeNull();
    expect(leerDeuda({ total: -1, pendientes: 0 })).toBeNull();
    expect(leerDeuda({ total: 10 })).toBeNull();
  });
});

describe('lineasDeVeredicto', () => {
  it('sólo dibuja lo que tiene algo que decir, en orden de resolución', () => {
    expect(
      lineasDeVeredicto(deuda({ contratos: 110, sinInmueble: 110, sinPropietario: 84, sinInquilino: 12 })),
    ).toEqual([
      { motivo: 'sinInmueble', cantidad: 110 },
      { motivo: 'sinPropietario', cantidad: 84 },
      { motivo: 'sinInquilino', cantidad: 12 },
    ]);
  });

  it('un motivo en cero no es una noticia', () => {
    expect(lineasDeVeredicto(deuda({ contratos: 91, sinPropietario: 84 }))).toEqual([
      { motivo: 'sinPropietario', cantidad: 84 },
    ]);
  });

  it('un motivo que el back no cuenta tampoco se dibuja', () => {
    expect(lineasDeVeredicto(deuda({ contratos: 91, sinInquilino: null }))).toEqual([]);
  });

  it('las filas sin activar son una línea propia', () => {
    expect(lineasDeVeredicto(deuda({ contratos: 91, pendientes: 5 }))).toEqual([
      { motivo: 'pendientes', cantidad: 5 },
    ]);
  });
});

describe('migracionCerrada', () => {
  it('🔴 con los seis pasos en verde y 89 contratos sin inmueble, NO está cerrada', () => {
    // Exactamente lo que pasó: el muro felicitaba sobre una cartera muerta.
    const d = leerDeuda(RESUMEN_DE_NICO);
    expect(todoListo(TODOS_LISTOS)).toBe(true);
    expect(migracionCerrada(TODOS_LISTOS, d)).toBe(false);
  });

  it('sin deuda y con los pasos listos, sí', () => {
    expect(migracionCerrada(TODOS_LISTOS, deuda({ contratos: 91 }))).toBe(true);
  });

  it('con deuda pero pasos sin terminar tampoco: falta todo', () => {
    expect(migracionCerrada(RECIEN_LLEGADA, deuda({ contratos: 91, sinInmueble: 1 }))).toBe(false);
  });

  it('una deuda que no se pudo leer no frena a nadie', () => {
    // Misma regla que el resto del muro: ante la duda no se bloquea.
    expect(migracionCerrada(TODOS_LISTOS, null)).toBe(true);
  });
});

describe('vacioPorMigracion — qué dice una lista vacía', () => {
  it('con contratos migrados y deuda, el vacío se explica por la migración', () => {
    expect(vacioPorMigracion(leerDeuda(RESUMEN_DE_NICO))).toBe(true);
  });

  it('sin deuda, el vacío es el de siempre («traé lo que ya tenés»)', () => {
    expect(vacioPorMigracion(deuda({ contratos: 91 }))).toBe(false);
  });

  it('sin nada migrado tampoco: ahí sí corresponde invitar a migrar', () => {
    expect(vacioPorMigracion(deuda({ contratos: 0, pendientes: 0 }))).toBe(false);
    expect(vacioPorMigracion(null)).toBe(false);
  });
});

describe('faltasDeLaFila', () => {
  function fila(p: Partial<FilaMirada> = {}): FilaMirada {
    return { estado: 'PENDIENTE', propertyId: null, faltantes: [], ...p };
  }

  it('🔴 una fila ACTIVADA sin inmueble tiene deuda aunque `faltantes` venga vacío', () => {
    // El bug: mirar sólo `faltantes` dejaba las 89 activadas como si nada.
    expect(faltasDeLaFila(fila({ estado: 'ACTIVADO', propertyId: null }))).toEqual(['inmueble']);
  });

  it('una fila ACTIVADA con inmueble y sin consignar le falta el propietario', () => {
    expect(
      faltasDeLaFila(fila({ estado: 'ACTIVADO', propertyId: 'p1', propietario: null })),
    ).toEqual(['propietario']);
  });

  it('sin inmueble no se pide además el propietario: no se puede consignar todavía', () => {
    expect(faltasDeLaFila(fila({ estado: 'ACTIVADO', propertyId: null, propietario: null }))).toEqual([
      'inmueble',
    ]);
  });

  it('las variantes de inmueble del back cuentan como «falta el inmueble»', () => {
    expect(faltasDeLaFila(fila({ propertyId: 'p1', faltantes: ['inmueble_ambiguo'] }))).toEqual([
      'inmueble',
    ]);
  });

  it('las tres variantes de inquilino se dicen con una sola palabra', () => {
    expect(
      faltasDeLaFila(fila({ propertyId: 'p1', propietario: { id: 'o1' }, faltantes: ['inquilino_correo'] })),
    ).toEqual(['inquilino']);
    expect(
      faltasDeLaFila(
        fila({ propertyId: 'p1', propietario: { id: 'o1' }, faltantes: ['inquilino_documento_ajeno'] }),
      ),
    ).toEqual(['inquilino']);
  });

  it('canon, fechas, uso y día de pago se agrupan en «datos del contrato»', () => {
    expect(
      faltasDeLaFila(fila({ propertyId: 'p1', propietario: { id: 'o1' }, faltantes: ['canon', 'fechas'] })),
    ).toEqual(['datos']);
  });

  it('una fila completa no le falta nada', () => {
    expect(faltasDeLaFila(fila({ estado: 'ACTIVADO', propertyId: 'p1', propietario: { id: 'o1' } }))).toEqual(
      [],
    );
  });

  it('una fila descartada no cuenta: alguien decidió que no entra', () => {
    expect(faltasDeLaFila(fila({ estado: 'DESCARTADO', propertyId: null }))).toEqual([]);
  });
});
