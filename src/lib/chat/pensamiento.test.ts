/**
 * El pensamiento en vivo (02-10-2026), la parte pura: leer el evento del micro,
 * aplicarlo, cerrarlo, partir el resultado por su cifra y poner el nombre del
 * equipo donde el micro dice «el especialista de…».
 */
import { describe, expect, it } from 'vitest';

import {
  agentesDelPensamiento,
  aplicarPaso,
  cerrarPensamiento,
  cifraEnTexto,
  conNombreDelEquipo,
  duracionEnPalabras,
  leerPasoDelPensamiento,
  leerPensamientoGuardado,
  lineaParaLectores,
  partirPorLaCifra,
  pasoEnCurso,
  ponerActividad,
  type PasoDelPensamiento,
} from './pensamiento';

/** El `t` de las pruebas: el nombre funcional de cada agente, como en es.json. */
const t = (k: string) => {
  const m = /^agentes\.(.+)\.nombre$/.exec(k);
  if (!m) return k;
  return { reportes: 'Reportes', conciliacion: 'Conciliación', matching: 'Matching' }[m[1]!] ?? m[1]!;
};

const paso = (over: Partial<PasoDelPensamiento> = {}): PasoDelPensamiento => ({
  id: 'p',
  fase: 'plan',
  texto: 'Pensando la respuesta con tu cartera…',
  estado: 'en_curso',
  ...over,
});

describe('leerPasoDelPensamiento', () => {
  it('lee el evento del micro tal cual llega', () => {
    expect(
      leerPasoDelPensamiento({
        type: 'pensamiento',
        id: 'busqueda',
        fase: 'busqueda',
        texto: 'Busqué “Juan Camilo López” en inquilinos, propietarios, contratos y pagos',
        estado: 'listo',
        resultado: { texto: '2 coincidencias: un inquilino y un propietario', cifra: 2, formato: 'numero' },
        ms: 860,
      })
    ).toEqual({
      id: 'busqueda',
      fase: 'busqueda',
      texto: 'Busqué “Juan Camilo López” en inquilinos, propietarios, contratos y pagos',
      estado: 'listo',
      resultado: { texto: '2 coincidencias: un inquilino y un propietario', cifra: 2, formato: 'numero' },
      ms: 860,
    });
  });

  it('mal formado es «no llegó»: nunca un paso a medias', () => {
    expect(leerPasoDelPensamiento(null)).toBeNull();
    expect(leerPasoDelPensamiento({ id: 'x', texto: 'algo' })).toBeNull();
    expect(leerPasoDelPensamiento({ id: 'x', estado: 'listo' })).toBeNull();
    expect(leerPasoDelPensamiento({ id: 'x', texto: 'algo', estado: 'quien sabe' })).toBeNull();
    // Un resultado sin texto no se pinta; el paso sí.
    expect(leerPasoDelPensamiento({ id: 'x', texto: 'algo', estado: 'listo', resultado: { cifra: 3 } })?.resultado).toBeUndefined();
  });
});

describe('aplicar, actividad y cierre', () => {
  it('un paso con el mismo id se actualiza EN SU LUGAR; uno nuevo va al final', () => {
    let pasos = aplicarPaso([], paso({ id: 'a' }));
    pasos = aplicarPaso(pasos, paso({ id: 'b' }));
    pasos = aplicarPaso(pasos, paso({ id: 'a', estado: 'listo', texto: 'Lo pensé con tu cartera' }));
    expect(pasos.map((p) => `${p.id}:${p.estado}`)).toEqual(['a:listo', 'b:en_curso']);
  });

  it('el «progreso» del micro va al especialista que corre, y se va cuando termina', () => {
    let pasos = aplicarPaso([], paso({ id: 'plan-1', estado: 'listo' }));
    pasos = aplicarPaso(pasos, paso({ id: 'despacho-d1', fase: 'despacho', agente: 'reportes' }));
    pasos = ponerActividad(pasos, 'Revisando las 14 filas de contratos…');
    expect(pasoEnCurso(pasos)?.actividad).toBe('Revisando las 14 filas de contratos…');
    pasos = aplicarPaso(pasos, paso({ id: 'despacho-d1', fase: 'despacho', agente: 'reportes', estado: 'listo' }));
    expect(pasos[1]!.actividad).toBeUndefined();
  });

  it('cerrar el turno: lo que corría queda listo (o fallido si se cortó), sin los puntos suspensivos', () => {
    const pasos = [paso({ id: 'a', estado: 'listo', texto: 'Listo' }), paso({ id: 'b', actividad: 'Leyendo…' })];
    expect(cerrarPensamiento(pasos).map((p) => [p.estado, p.texto, p.actividad])).toEqual([
      ['listo', 'Listo', undefined],
      ['listo', 'Pensando la respuesta con tu cartera', undefined],
    ]);
    expect(cerrarPensamiento(pasos, true)[1]!.estado).toBe('fallo');
  });

  it('lo guardado en el mensaje se vuelve a leer con la misma forma', () => {
    const guardado = { pasos: [paso({ estado: 'listo' })], duracionMs: 8400 };
    expect(leerPensamientoGuardado(JSON.parse(JSON.stringify(guardado)))).toEqual(guardado);
    expect(leerPensamientoGuardado({ pasos: [] })).toBeNull();
    expect(leerPensamientoGuardado('x')).toBeNull();
  });
});

describe('la cifra del resultado', () => {
  it('se parte donde el micro la escribió, para contarla', () => {
    expect(partirPorLaCifra({ texto: '$985.507.187 en 561 clientes', cifra: 985_507_187, formato: 'moneda' })).toEqual({
      antes: '',
      cifra: 985_507_187,
      formato: 'moneda',
      despues: ' en 561 clientes',
    });
    expect(partirPorLaCifra({ texto: '2 coincidencias: un inquilino y un propietario', cifra: 2 })).toMatchObject({
      antes: '',
      despues: ' coincidencias: un inquilino y un propietario',
    });
    expect(partirPorLaCifra({ texto: 'las 3 salen de ahí', cifra: 3, formato: 'numero' })?.antes).toBe('las ');
  });

  it('sin cifra, o si no aparece escrita tal cual, va el texto', () => {
    expect(partirPorLaCifra({ texto: 'lo saco de tus datos' })).toBeNull();
    expect(partirPorLaCifra({ texto: 'catorce contratos', cifra: 14 })).toBeNull();
  });

  it('el mismo formato del micro: miles con punto y $ si es plata', () => {
    expect(cifraEnTexto(31_850_000, 'moneda')).toBe('$31.850.000');
    expect(cifraEnTexto(1234)).toBe('1.234');
  });
});

describe('el nombre del equipo', () => {
  it('donde el micro dice «el especialista de X», va el nombre de equipo.ts', () => {
    expect(conNombreDelEquipo('Le pido al especialista de pagos: “los pagos de octubre”…', 'pagos', t)).toBe(
      'Le pido a Cobri: “los pagos de octubre”…'
    );
    expect(conNombreDelEquipo('El especialista de cobranza no pudo terminar', 'cobranza', t)).toBe('Laura no pudo terminar');
    expect(
      conNombreDelEquipo('hay que contarlo sobre tus datos: se lo pido al especialista de reportes', 'reportes', t)
    ).toBe('hay que contarlo sobre tus datos: se lo pido a Reportes');
    expect(conNombreDelEquipo('Le pasé la consulta al especialista de conciliación, que…', 'conciliacion', t)).toBe(
      'Le pasé la consulta a Conciliación, que…'
    );
  });

  it('sin agente (o uno que el equipo no conoce), la frase queda tal cual', () => {
    expect(conNombreDelEquipo('Le pido al especialista de reportes', undefined, t)).toBe('Le pido al especialista de reportes');
    expect(conNombreDelEquipo('Le pido al especialista de x', 'x', t)).toBe('Le pido al especialista de x');
  });

  it('los especialistas del turno, cada uno una vez y en orden', () => {
    const pasos = [
      paso({ id: '1', fase: 'despacho', agente: 'reportes' }),
      paso({ id: '2', fase: 'despacho', agente: 'pagos' }),
      paso({ id: '3', fase: 'despacho', agente: 'reportes' }),
      paso({ id: '4', fase: 'plan', agente: 'cobranza' }),
    ];
    expect(agentesDelPensamiento(pasos).map((a) => a.id)).toEqual(['reportes', 'pagos']);
  });
});

describe('el tiempo y el lector de pantalla', () => {
  it('el tiempo, discreto', () => {
    expect(duracionEnPalabras(400)).toBe('0,4 s');
    expect(duracionEnPalabras(8_420)).toBe('8,4 s');
    expect(duracionEnPalabras(17_620)).toBe('17 s');
    expect(duracionEnPalabras(65_000)).toBe('1 min 05 s');
  });

  it('una línea con lo esencial: el paso que corre, o el resultado del último', () => {
    const pasos = [paso({ id: 'a', estado: 'listo', texto: 'Tu cartera al 2 de octubre', resultado: { texto: '$48.600.000 en 31 clientes' } })];
    expect(lineaParaLectores(pasos, t)).toBe('Tu cartera al 2 de octubre: $48.600.000 en 31 clientes');
    const conVivo = [...pasos, paso({ id: 'b', fase: 'despacho', agente: 'pagos', texto: 'Le pido al especialista de pagos: “x”…' })];
    expect(lineaParaLectores(conVivo, t)).toBe('Le pido a Cobri: “x”…');
  });
});
