/**
 * Las piezas del hilo que actúa, leídas con tolerancia (un micro viejo no las
 * manda; una forma rara se descarta sin romper), y los enlaces internos del
 * texto convertidos en intención.
 */

import { describe, it, expect } from 'vitest';

import {
  intencionDelEnlace,
  leerAcciones,
  leerConfirmacion,
  leerFormulario,
  leerIntencion,
  leerResultado,
  respuestaDeLaPropuesta,
  tipoDeFichaDeLaEntidad,
} from './acciones-del-hilo';

const UUID = '4a23f784-2050-4874-bfc4-bc9d1352794a';

describe('la intención', () => {
  it('lee las formas válidas y descarta las otras', () => {
    expect(leerIntencion({ accion: 'ver', entidad: { tipo: 'contrato', id: '24' } })).toEqual({
      accion: 'ver',
      entidad: { tipo: 'contrato', id: '24' },
    });
    expect(leerIntencion({ accion: 'confirmar', propuestaId: 'p' })).toEqual({ accion: 'confirmar', propuestaId: 'p' });
    expect(leerIntencion({ accion: 'ver', entidad: { tipo: 'agencia', id: 'x' } })).toBeNull();
    expect(leerIntencion({ accion: 'confirmar' })).toBeNull();
    expect(leerIntencion(null)).toBeNull();
  });

  it('un enlace interno a una entidad del panel es «ver su ficha»; otro enlace interno, sin intención', () => {
    expect(intencionDelEnlace(`/panel/inmobiliaria/contratos/${UUID}`)).toEqual({ accion: 'ver', entidad: { tipo: 'contrato', id: UUID } });
    expect(intencionDelEnlace(`/panel/inmobiliaria/propietarios/${UUID}?tab=plata`)).toEqual({
      accion: 'ver',
      entidad: { tipo: 'propietario', id: UUID },
    });
    expect(intencionDelEnlace('/panel/inmobiliaria/pagos/cobranza')).toBeNull();
  });

  it('la tarjeta del inquilino se pide como «persona»', () => {
    expect(tipoDeFichaDeLaEntidad({ tipo: 'inquilino' })).toBe('persona');
    expect(tipoDeFichaDeLaEntidad({ tipo: 'contrato' })).toBe('contrato');
    expect(tipoDeFichaDeLaEntidad({ tipo: 'lead' })).toBeNull();
    expect(tipoDeFichaDeLaEntidad({ tipo: 'inquilino', tipoDeFicha: 'persona' })).toBe('persona');
  });
});

describe('las piezas del `done`', () => {
  it('acciones: sólo las que tienen id, título y entidad', () => {
    const a = leerAcciones([
      { id: 'registrar_pago', titulo: 'Registrar un pago', entidad: { tipo: 'contrato', id: UUID }, disponible: true, riesgo: { muevePlata: true } },
      { id: 'x' },
      'basura',
    ]);
    expect(a).toEqual([
      {
        id: 'registrar_pago',
        titulo: 'Registrar un pago',
        entidad: { tipo: 'contrato', id: UUID },
        disponible: true,
        porQueNo: null,
        riesgo: { muevePlata: true, escribeATerceros: false, irreversible: false },
        lectura: false,
        desde: null,
      },
    ]);
  });

  it('confirmación, resultado y formulario: tolerantes, nunca lanzan', () => {
    expect(leerConfirmacion({ propuestaId: 'p', frase: 'Voy a…', modo: 'raro' })).toMatchObject({ modo: 'copiloto', pregunta: '¿Lo hago?' });
    expect(leerConfirmacion({ frase: 'sin id' })).toBeNull();
    expect(leerResultado({ estado: 'hecha', resumen: 'Listo.', deshacer: { propuestaId: 'p' } })).toMatchObject({
      deshacer: { propuestaId: 'p', etiqueta: 'Deshacer' },
    });
    expect(leerResultado({ estado: 'otra', resumen: 'x' })).toBeNull();
    expect(
      leerFormulario({
        accion: 'registrar_pago',
        entidad: { tipo: 'contrato', id: UUID },
        campos: [{ clave: 'valorCop', tipo: 'moneda', requerido: true }, { clave: 'mal clave', tipo: 'texto' }],
      })?.campos.map((c) => c.clave),
    ).toEqual(['valorCop']);
  });

  it('una propuesta está contestada cuando un mensaje POSTERIOR de la persona la nombra', () => {
    const posteriores = [
      { role: 'assistant' },
      { role: 'user', intencion: { accion: 'cancelar' as const, propuestaId: 'p-2' } },
      { role: 'user', intencion: { accion: 'confirmar' as const, propuestaId: 'p-1' } },
    ];
    expect(respuestaDeLaPropuesta('p-1', posteriores)).toBe('confirmar');
    expect(respuestaDeLaPropuesta('p-3', posteriores)).toBeNull();
  });
});
