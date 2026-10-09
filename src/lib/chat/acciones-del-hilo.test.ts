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
  textoDelFormulario,
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
    expect(leerIntencion({ accion: 'ver', entidad: { tipo: 'banco', id: 'x' } })).toBeNull();
    expect(leerIntencion({ accion: 'armar_nomina_del_mes', entidad: { tipo: 'agencia', id: UUID } })).toEqual({
      accion: 'armar_nomina_del_mes',
      entidad: { tipo: 'agencia', id: UUID },
    });
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

  /*
   * 🔴 07-10: los MISMOS tipos de ficha que el micro (`TIPOS_DE_FICHA` de
   * `ai-hub/en-el-chat/intencion.ts`). Faltaba la inmobiliaria y los documentos:
   * el formulario de «arma la nómina» llegaba y se descartaba, y el chat se
   * quedaba en «…necesito estos datos:» sin ningún campo.
   */
  it.each([
    'persona',
    'inquilino',
    'coarrendatario',
    'codeudor',
    'postulante',
    'contrato',
    'inmueble',
    'propietario',
    'agencia',
    'factura',
    'factura_de_proveedor',
    'lote_de_egresos',
    'pqrs',
    'mantenimiento',
    'cita',
    'acta',
    'lead',
  ])('el formulario y los botones de una ficha «%s» llegan al hilo', (tipo) => {
    const entidad = { tipo, id: UUID };
    expect(
      leerFormulario({
        accion: 'armar_nomina_del_mes',
        entidad,
        titulo: 'Armar la nómina del mes',
        campos: [{ clave: 'mes', tipo: 'opcion', requerido: true, opciones: [{ valor: '2026-10', etiqueta: 'Octubre de 2026' }] }],
      }),
    ).toMatchObject({ entidad, campos: [{ clave: 'mes', opciones: [{ valor: '2026-10', etiqueta: 'Octubre de 2026' }] }] });
    expect(leerAcciones([{ id: 'una_accion', titulo: 'Una acción', entidad, disponible: true }])).toHaveLength(1);
  });

  it('lo que la persona «dijo» al llenar el formulario: la opción por su nombre, la plata y la fecha en palabras', () => {
    const f = leerFormulario({
      accion: 'registrar_novedad_de_nomina',
      entidad: { tipo: 'agencia', id: UUID },
      titulo: 'Registrar una novedad de nómina',
      campos: [
        { clave: 'tipo', tipo: 'opcion', requerido: true, opciones: [{ valor: 'BONIFICACION', etiqueta: 'Bonificación — en pesos' }] },
        { clave: 'desde', tipo: 'fecha', requerido: true },
        { clave: 'valorCop', tipo: 'moneda', requerido: false },
      ],
    })!;
    expect(textoDelFormulario(f, { tipo: 'BONIFICACION', desde: '2026-10-05', valorCop: '150000' })).toBe(
      'Registrar una novedad de nómina: Bonificación — en pesos · 5 de octubre de 2026 · $150.000',
    );
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
