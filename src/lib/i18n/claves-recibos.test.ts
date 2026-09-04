/**
 * Guardia de las claves de Recibos de caja.
 *
 * Hermano de `claves-avaluos.test.ts`, `claves-recorrido.test.ts` y
 * `claves-aprobacion.test.ts`, y por el mismo motivo: una clave que alguien
 * agregue sólo en `es.json` sale en pantalla como `recibos.form.loQueSea` para
 * quien use la app en inglés, y eso pasa una revisión visual rápida sin saltar.
 *
 * Además fija el catálogo de tipos de concepto contra el enum que declara el
 * back. Si el back agrega un tipo, la pantalla no se rompe —cae al nombre que
 * mandó el back— pero el rótulo queda en `SCREAMING_SNAKE` en la cara del
 * usuario, y eso hay que enterarse acá y no en producción.
 */

import { describe, it, expect } from 'vitest';

import es from './locales/es.json';
import en from './locales/en.json';
import { TIPOS_DE_CONCEPTO } from '@/lib/api/recibos-de-caja.types';

/** Todas las rutas hoja de un objeto, en notación de puntos. */
function hojas(obj: unknown, prefijo = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefijo];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    hojas(v, prefijo ? `${prefijo}.${k}` : k),
  );
}

const RECIBOS_ES = (es as Record<string, unknown>).recibos;
const RECIBOS_EN = (en as Record<string, unknown>).recibos;

/**
 * Lo que consume la pantalla. Escrito a mano a propósito: derivarlo del
 * diccionario haría que el test se compare contra sí mismo y pasara en verde
 * con una clave borrada.
 */
const CLAVES_EN_USO = [
  'nombre',
  'plural',
  'hacer',
  'hacerCorto',
  'queEs',

  'desglose.titulo',
  'desglose.ayuda',
  'desglose.resta',
  'desglose.subtotal',
  'desglose.descuentos',
  'desglose.total',
  'desglose.yaAbonado',
  'desglose.saldo',
  'desglose.cargando',
  'desglose.fallo',
  'desglose.reintentar',
  'desglose.sinDetalle',
  'desglose.descuadre',

  'form.titulo',
  'form.descripcion',
  'form.elegirCobroAyuda',
  'form.sinCobros',
  'form.montoLabel',
  'form.maximo',
  'form.abonarTodo',
  'form.montoRequerido',
  'form.montoPositivo',
  'form.montoExcede',
  'form.quedaPendiente',
  'form.quedaEnCero',
  'form.fechaLabel',
  'form.fechaRequerida',
  'form.medioLabel',
  'form.medioRequerido',
  'form.referenciaLabel',
  'form.referenciaPlaceholder',
  'form.notasLabel',
  'form.notasPlaceholder',
  'form.opcional',
  'form.cancelar',
  'form.emitir',
  'form.emitiendo',
  'form.emitido',
  'form.emitidoQuedaSaldo',
  'form.emitidoSinSaldo',
  'form.fallo',
  'form.medios.transferencia',
  'form.medios.efectivo',
  'form.medios.tarjeta',
  'form.medios.cheque',
  'form.medios.pse',
  'form.medios.otro',

  'historial.titulo',
  'historial.vacio',
  'historial.vacioDesc',
  'historial.cargando',
  'historial.fallo',
  'historial.reintentar',
  'historial.numero',
  'historial.sinNumero',
  'historial.anulado',
  'historial.anuladoEl',
  'historial.recibidoConRecibo',
  'historial.conteo',
  'historial.conteoUno',
  'historial.anular',

  'anular.titulo',
  'anular.queVaAPasar',
  'anular.motivoLabel',
  'anular.motivoPlaceholder',
  'anular.motivoRequerido',
  'anular.cancelar',
  'anular.confirmar',
  'anular.anulando',
  'anular.anulado',
  'anular.anuladoDesc',
  'anular.fallo',

  'conciliar.titulo',
  'conciliar.porQue',
  'conciliar.queVaAPasar',
  'conciliar.origenLabel',
  'conciliar.origenPlaceholder',
  'conciliar.origenRequerido',
  'conciliar.cancelar',
  'conciliar.confirmar',
  'conciliar.conciliando',
  'conciliar.conciliado',
  'conciliar.conciliadoDesc',
  'conciliar.fallo',
];

/** Las claves que llevan `{{param}}` y qué parámetro esperan. */
const CON_PARAMETROS: Record<string, string[]> = {
  'desglose.descuadre': ['conceptos', 'cobro'],
  'form.maximo': ['monto'],
  'form.montoExcede': ['monto'],
  'form.quedaPendiente': ['monto'],
  'form.emitido': ['numero'],
  'form.emitidoQuedaSaldo': ['monto', 'saldo'],
  'form.emitidoSinSaldo': ['monto'],
  'historial.numero': ['numero'],
  'historial.anuladoEl': ['fecha'],
  'historial.conteo': ['count'],
  'anular.titulo': ['numero'],
  'anular.queVaAPasar': ['monto'],
  'anular.anulado': ['numero'],
  'anular.anuladoDesc': ['monto'],
  'conciliar.conciliadoDesc': ['numero'],
};

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

describe('el bloque `recibos` existe en los dos diccionarios', () => {
  it('es un bloque de nivel superior en es y en en', () => {
    expect(RECIBOS_ES).toBeTypeOf('object');
    expect(RECIBOS_EN).toBeTypeOf('object');
  });
});

describe('paridad es ↔ en', () => {
  it('los dos diccionarios tienen EXACTAMENTE las mismas claves', () => {
    const enEs = hojas(RECIBOS_ES).sort();
    const enEn = hojas(RECIBOS_EN).sort();
    expect(enEs).toEqual(enEn);
  });

  it('ninguna traducción quedó vacía', () => {
    for (const dic of [RECIBOS_ES, RECIBOS_EN]) {
      for (const ruta of hojas(dic)) {
        const valor = leer(dic, ruta);
        expect(typeof valor, `${ruta} no es texto`).toBe('string');
        expect(String(valor).trim(), `${ruta} está vacía`).not.toBe('');
      }
    }
  });
});

describe('las claves que usa la pantalla existen', () => {
  it.each(CLAVES_EN_USO)('%s está en los dos diccionarios', (ruta) => {
    expect(leer(RECIBOS_ES, ruta), `falta en es.json: recibos.${ruta}`).toBeTypeOf('string');
    expect(leer(RECIBOS_EN, ruta), `falta en en.json: recibos.${ruta}`).toBeTypeOf('string');
  });
});

describe('los parámetros de interpolación', () => {
  it.each(Object.entries(CON_PARAMETROS))(
    '%s interpola los mismos parámetros en los dos idiomas',
    (ruta, esperados) => {
      for (const [nombre, dic] of [
        ['es', RECIBOS_ES],
        ['en', RECIBOS_EN],
      ] as const) {
        const texto = String(leer(dic, ruta));
        for (const param of esperados) {
          // Un `{{monto}}` que se pierde en la traducción deja al usuario sin
          // la cifra — y el texto sigue leyéndose bien, así que nadie lo nota.
          expect(texto, `${nombre}: recibos.${ruta} perdió {{${param}}}`).toContain(
            `{{${param}}}`,
          );
        }
      }
    },
  );
});

describe('el catálogo de tipos de concepto', () => {
  it('cubre los 11 tipos que declara el back, en los dos idiomas', () => {
    for (const tipo of TIPOS_DE_CONCEPTO) {
      expect(leer(RECIBOS_ES, `desglose.tipos.${tipo}`), `es: falta ${tipo}`).toBeTypeOf('string');
      expect(leer(RECIBOS_EN, `desglose.tipos.${tipo}`), `en: falta ${tipo}`).toBeTypeOf('string');
    }
  });

  it('no tiene tipos de más: un rótulo que el back nunca manda es copy muerto', () => {
    const enCatalogo = Object.keys(
      leer(RECIBOS_ES, 'desglose.tipos') as Record<string, unknown>,
    ).sort();
    expect(enCatalogo).toEqual([...TIPOS_DE_CONCEPTO].sort());
  });
});
