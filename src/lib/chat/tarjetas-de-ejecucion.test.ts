/**
 * Las tarjetas del ejecutor, leídas del micro (24-09).
 *
 * 🔴 Dos cosas distintas que se prueban por separado:
 *   1. Que los EJEMPLOS con los que se prueba el chat son lo que el micro de
 *      verdad manda: se validan, estrictos, contra el esquema que el micro
 *      publica en su `openapi-snapshot.json` (extraído a
 *      `contrato-del-chat-del-micro.json`). Una prueba que inventa su propia
 *      tarjeta pasa aunque el micro mande otra cosa.
 *   2. Que el lector del front no pierde nada de lo que el micro declara (si
 *      el micro agrega un campo o un `tipo`, esto se pone rojo antes que la
 *      pantalla).
 */

import { describe, expect, it } from 'vitest';

import {
  componenteDelMicro,
  erroresContraElEsquema,
  rutaDelMicro,
  type EsquemaDelMicro,
} from '@/lib/api/contrato-del-chat-del-micro';
import {
  AGENCIA,
  CONTRATO_24,
  EJECUCION,
  PROCESO,
  enCurso,
  enGracia,
  errorDePermiso,
  hecha,
  programada,
  propuestaDeRenovacion,
  propuestaDelLote,
} from './tarjetas-de-ejecucion.fixtures';
import {
  ESTADOS_DEL_RESULTADO,
  TIPOS_DE_TARJETA,
  conElProcesoDelStream,
  elTextoRepiteLaTarjeta,
  etiquetaDeLaClave,
  hitoDeLaCuenta,
  leerEventoProcesoIniciado,
  leerIntencionDelBoton,
  leerTarjetaDeEjecucion,
  relojDeLaCuenta,
  riesgosNombrados,
  segundosQueFaltan,
  vistaPreviaLegible,
} from './tarjetas-de-ejecucion';

const piezasDelDone = componenteDelMicro('AiHubChatPiezasNuevasDelDone')!;
const esquemaDeLaEjecucion = piezasDelDone.properties!.ejecucion;
const rutaDeLaEjecucion = rutaDelMicro('GET', `/api/agency/${AGENCIA}/ai-hub/chat/ejecuciones/${EJECUCION}`)!;

/** Las variantes de la unión del micro, por `tipo`. */
function variantes(): Record<string, EsquemaDelMicro> {
  const union = esquemaDeLaEjecucion.allOf!.find((s) => s.discriminator)!;
  return Object.fromEntries(union.oneOf!.map((v) => [v.properties!.tipo.enum![0] as string, v]));
}

const EJEMPLOS = {
  propuesta: propuestaDeRenovacion(),
  propuestaDelLote: propuestaDelLote(),
  enCurso: enCurso(),
  enGracia: enGracia('2026-09-24T14:01:00.000Z'),
  hecha: hecha(true),
  programada: programada(),
  error: errorDePermiso(true),
};

describe('los ejemplos son lo que el micro manda (esquema del snapshot, estricto)', () => {
  it('el contrato trae la ruta de la tarjeta al día y las piezas nuevas del `done`', () => {
    expect(rutaDeLaEjecucion, 'GET …/ejecuciones/{id} no está en el contrato').not.toBeNull();
    expect(rutaDeLaEjecucion.ruta.respuesta?.properties?.tarjeta).toBeDefined();
    expect(Object.keys(piezasDelDone.properties!).sort()).toEqual(['ejecucion', 'ensayo', 'plan']);
  });

  it.each(Object.entries(EJEMPLOS))('%s cabe en `done.ejecucion` y en la respuesta de GET …/ejecuciones/{id}', (_, ejemplo) => {
    expect(erroresContraElEsquema(esquemaDeLaEjecucion, ejemplo, 'ejecucion')).toEqual([]);
    expect(erroresContraElEsquema(rutaDeLaEjecucion.ruta.respuesta!, { tarjeta: ejemplo }, 'respuesta')).toEqual([]);
  });

  it('el validador sí muerde: una llave de más o un tipo desconocido son errores', () => {
    expect(erroresContraElEsquema(esquemaDeLaEjecucion, { ...hecha(false), inventada: 1 }, 'e')).not.toEqual([]);
    expect(erroresContraElEsquema(esquemaDeLaEjecucion, { ...hecha(false), tipo: 'plan' }, 'e')).not.toEqual([]);
    // `null` es válido: un turno sin ejecución.
    expect(erroresContraElEsquema(esquemaDeLaEjecucion, null, 'e')).toEqual([]);
  });

  it('el evento `proceso_iniciado` también es el del micro', () => {
    const evento = { type: 'proceso_iniciado', procesoId: PROCESO, ejecucionId: EJECUCION };
    expect(erroresContraElEsquema(componenteDelMicro('AiHubChatEventoProcesoIniciado')!, evento)).toEqual([]);
    expect(leerEventoProcesoIniciado(evento)).toEqual({ procesoId: PROCESO, ejecucionId: EJECUCION });
    expect(leerEventoProcesoIniciado({ type: 'proceso_iniciado', procesoId: PROCESO })).toBeNull();
  });
});

describe('el lector no pierde nada de lo que el micro declara', () => {
  it('los mismos cinco tipos y los mismos estados del resultado', () => {
    expect(Object.keys(variantes()).sort()).toEqual([...TIPOS_DE_TARJETA].sort());
    expect(variantes().resultado.properties!.estado.enum).toEqual(ESTADOS_DEL_RESULTADO);
  });

  it.each(Object.entries(EJEMPLOS))('%s se lee entero, con cada campo que el micro declara', (_, ejemplo) => {
    const leida = leerTarjetaDeEjecucion(ejemplo)!;
    expect(leida).not.toBeNull();
    const declarados = Object.keys(variantes()[ejemplo.tipo].properties!).sort();
    expect(Object.keys(leida).sort()).toEqual(declarados);
    if (ejemplo.tipo === 'error') {
      // El único cambio de forma: el botón del segundo factor se lee como los
      // demás (`intencion`), con su reintento completo (acción, entidad y datos).
      expect(leida).toEqual({
        ...ejemplo,
        segundoFactor: { etiqueta: 'Confirmar mi segundo factor', intencion: ejemplo.segundoFactor!.reintento },
      });
    } else {
      expect(leida).toEqual(ejemplo);
    }
  });

  it('un `tipo` que este panel no conoce, o sin id, no se pinta (queda lo de siempre)', () => {
    expect(leerTarjetaDeEjecucion({ ...hecha(false), tipo: 'plan' })).toBeNull();
    expect(leerTarjetaDeEjecucion({ ...hecha(false), ejecucionId: '' })).toBeNull();
    expect(leerTarjetaDeEjecucion({ ...hecha(false), estado: 'fallida' })).toBeNull();
    expect(leerTarjetaDeEjecucion(null)).toBeNull();
  });

  it('un botón mal formado no se pinta: el front no inventa «Deshacer»', () => {
    const sinIntencion = leerTarjetaDeEjecucion({ ...hecha(true), deshacer: { etiqueta: 'Anular el recibo' } });
    expect(sinIntencion && 'deshacer' in sinIntencion ? sinIntencion.deshacer : 'x').toBeNull();
    const sinPropuesta = leerTarjetaDeEjecucion({
      ...hecha(true),
      deshacer: { etiqueta: 'Anular', intencion: { accion: 'deshacer' } },
    });
    expect(sinPropuesta && 'deshacer' in sinPropuesta ? sinPropuesta.deshacer : 'x').toBeNull();
  });
});

describe('la intención de un botón', () => {
  it('sobre una ejecución: sólo acción y propuesta (el micro la valida estricta)', () => {
    expect(leerIntencionDelBoton({ accion: 'deshacer', propuestaId: EJECUCION, sobra: 1 })).toEqual({
      accion: 'deshacer',
      propuestaId: EJECUCION,
    });
  });

  it('el reintento conserva los datos que sirven y descarta los que el micro rechazaría', () => {
    expect(
      leerIntencionDelBoton({
        accion: 'registrar_pago',
        entidad: { tipo: 'contrato', id: CONTRATO_24 },
        datos: { valor: 1_550_000, medio: 'transferencia', '1malo': 'x', raro: { a: 1 } },
      }),
    ).toEqual({
      accion: 'registrar_pago',
      entidad: { tipo: 'contrato', id: CONTRATO_24 },
      datos: { valor: 1_550_000, medio: 'transferencia' },
    });
    // Una entidad que la ficha no conoce no es una intención.
    expect(leerIntencionDelBoton({ accion: 'registrar_pago', entidad: { tipo: 'factura', id: 'x' } })).toBeNull();
  });
});

describe('el proceso que anunció el stream', () => {
  it('se pega a la tarjeta en curso de la MISMA ejecución que todavía no lo trae', () => {
    const sin = leerTarjetaDeEjecucion(enCurso(null));
    expect(conElProcesoDelStream(sin, { procesoId: PROCESO, ejecucionId: EJECUCION })).toMatchObject({ procesoId: PROCESO });
    expect(conElProcesoDelStream(sin, { procesoId: PROCESO, ejecucionId: 'otra' })).toBe(sin);
    const hechaLeida = leerTarjetaDeEjecucion(hecha(false));
    expect(conElProcesoDelStream(hechaLeida, { procesoId: PROCESO, ejecucionId: EJECUCION })).toBe(hechaLeida);
  });
});

describe('lo que la tarjeta ya dice', () => {
  it('el texto que repite el resumen (lo que el micro deja para un panel viejo) se reconoce', () => {
    const g = leerTarjetaDeEjecucion(enGracia('2026-09-24T14:01:00.000Z'));
    expect(elTextoRepiteLaTarjeta('  Le mando el estado de cuenta a Mateo Pérez por correo. ', g)).toBe(true);
    expect(elTextoRepiteLaTarjeta('Listo.', g)).toBe(false);
    expect(elTextoRepiteLaTarjeta('Antes de hacerlo, confírmame:', leerTarjetaDeEjecucion(propuestaDeRenovacion()))).toBe(false);
  });
});

describe('el riesgo, en palabras y del más grave al más leve', () => {
  it('lote de giros: irreversible, plata, masiva y doble control', () => {
    const p = leerTarjetaDeEjecucion(propuestaDelLote());
    expect(p?.tipo === 'propuesta' && riesgosNombrados(p.riesgo)).toEqual(['irreversible', 'plata', 'masiva', 'dobleControl']);
  });
});

describe('la cuenta regresiva', () => {
  const hasta = '2026-09-24T14:01:00.000Z';
  const fin = Date.parse(hasta);
  it('segundos enteros hacia arriba y nunca negativos', () => {
    expect(segundosQueFaltan(hasta, fin - 45_000)).toBe(45);
    expect(segundosQueFaltan(hasta, fin - 44_100)).toBe(45);
    expect(segundosQueFaltan(hasta, fin + 3_000)).toBe(0);
    expect(segundosQueFaltan('no es fecha', fin)).toBe(0);
  });
  it('«0:45», «1:00», «0:05»', () => {
    expect(relojDeLaCuenta(45)).toBe('0:45');
    expect(relojDeLaCuenta(60)).toBe('1:00');
    expect(relojDeLaCuenta(5)).toBe('0:05');
  });
  it('se anuncian tres momentos, no sesenta', () => {
    const hitos = new Set(Array.from({ length: 61 }, (_, s) => hitoDeLaCuenta(60 - s)));
    expect([...hitos]).toEqual(['inicio', 10, 0]);
  });
});

describe('la vista previa, legible', () => {
  it('el plan de la renovación: pares con formato, la tabla de cuotas, sin ids', () => {
    const v = vistaPreviaLegible(propuestaDeRenovacion().vistaPrevia.datos);
    expect(v.datos.map((d) => [d.etiqueta, d.formato])).toEqual([
      ['Canon actual', 'moneda'],
      ['Canon nuevo', 'moneda'],
      ['Incremento porcentaje', 'numero'],
      ['Fecha de inicio', 'fecha'],
      // Un conteo NO es plata aunque diga «total».
      ['Total de cuotas', 'numero'],
    ]);
    expect(v.tablas).toHaveLength(1);
    expect(v.tablas[0].titulo).toBe('Cuotas');
    expect(v.tablas[0].columnas.map((c) => [c.titulo, c.formato])).toEqual([
      ['Numero', 'numero'],
      ['Vence', 'fecha'],
      ['Valor', 'moneda'],
    ]);
    expect(v.tablas[0].filas).toHaveLength(12);
    expect(JSON.stringify(v)).not.toContain(CONTRATO_24);
  });

  it('una lista suelta es una tabla; lo que no se entiende no se muestra', () => {
    expect(vistaPreviaLegible([{ nombre: 'Mateo Pérez', saldoCop: 1_550_000 }]).tablas[0].columnas.map((c) => c.formato)).toEqual([
      'texto',
      'moneda',
    ]);
    expect(vistaPreviaLegible(null)).toEqual({ datos: [], tablas: [] });
    expect(vistaPreviaLegible({ a: { b: { c: 1 } }, ivaActiva: 3, tarifaActiva: 2 }).datos.map((d) => [d.clave, d.formato])).toEqual([
      ['ivaActiva', 'moneda'],
      ['tarifaActiva', 'numero'],
    ]);
  });

  it('etiquetas en español a partir de la clave', () => {
    expect(etiquetaDeLaClave('fechaDeInicio')).toBe('Fecha de inicio');
    expect(etiquetaDeLaClave('canon_nuevo')).toBe('Canon nuevo');
  });
});
