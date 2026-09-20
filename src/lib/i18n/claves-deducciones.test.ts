/**
 * Guardia de las claves de las deducciones del propietario.
 *
 * Una clave que sólo exista en `es.json` sale en pantalla como su ruta para
 * quien use la app en inglés; una que tenga `{{valor}}` en español y no en
 * inglés sale con el número perdido. Las deducciones mueven lo que se le gira
 * al propietario: un rótulo roto ahí es un «Neto a girar» que no se entiende.
 */

import { describe, it, expect } from 'vitest';

import es from './locales/es.json';
import en from './locales/en.json';

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

function hojas(nodo: unknown, prefijo: string): string[] {
  if (!nodo || typeof nodo !== 'object') return [prefijo];
  return Object.entries(nodo as Record<string, unknown>).flatMap(([k, v]) =>
    hojas(v, `${prefijo}.${k}`),
  );
}

function marcadores(texto: string): string[] {
  return [...texto.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
}

const D = 'inmobiliaria.deducciones';
const T = 'inmobiliaria.tesoreria';

/** Lo que consumen los componentes de `components/inmobiliaria/deducciones`, Liquidaciones, Mantenimientos, la cartera de propietarios y la cuenta de cobro al propietario. Escrito a mano a propósito. */
const CLAVES = [
  `${D}.tab`,
  `${D}.titulo`,
  `${D}.descripcion`,
  `${D}.registrar`,
  `${D}.sinTabla`,
  `${D}.vacio`,
  `${D}.queSon`,
  `${D}.totalPendiente`,
  `${D}.totalEnLiquidacion`,
  `${D}.totalSaldoEnContra`,
  `${D}.colFecha`,
  `${D}.colConcepto`,
  `${D}.colValor`,
  `${D}.colEstado`,
  `${D}.colSoporte`,
  `${D}.verSoporte`,
  `${D}.abriendoSoporte`,
  `${D}.noSeAbrioSoporte`,
  `${D}.sinSoporte`,
  `${D}.anular`,
  `${D}.anuladaPorque`,
  `${D}.suParte`,
  `${D}.origen.REPARACION`,
  `${D}.origen.MANUAL`,
  `${D}.origen.SALDO_ANTERIOR`,
  `${D}.origen.COBRO_AL_ARRENDAR`,
  `${D}.estado.PENDIENTE`,
  `${D}.estado.EN_LIQUIDACION`,
  `${D}.estado.EN_LIQUIDACION_SIN_MES`,
  `${D}.estado.APLICADA`,
  `${D}.estado.APLICADA_SIN_MES`,
  `${D}.estado.ANULADA`,
  `${D}.estado.PROYECTADA`,
  `${D}.nuevo.titulo`,
  `${D}.nuevo.descripcion`,
  `${D}.nuevo.motivo`,
  `${D}.nuevo.motivoAyuda`,
  `${D}.nuevo.motivoPlaceholder`,
  `${D}.nuevo.valor`,
  `${D}.nuevo.inmueble`,
  `${D}.nuevo.inmuebleNinguno`,
  `${D}.nuevo.inmuebleAyuda`,
  `${D}.nuevo.soporte`,
  `${D}.nuevo.soporteAyuda`,
  `${D}.nuevo.cancelar`,
  `${D}.nuevo.guardar`,
  `${D}.nuevo.guardando`,
  `${D}.nuevo.faltaMotivo`,
  `${D}.nuevo.faltaValor`,
  `${D}.nuevo.faltaSoporte`,
  `${D}.nuevo.soporteMuyPesado`,
  `${D}.nuevo.soporteTipo`,
  `${D}.nuevo.registrado`,
  `${D}.nuevo.noSeRegistro`,
  `${D}.anularDialogo.titulo`,
  `${D}.anularDialogo.descripcion`,
  `${D}.anularDialogo.motivo`,
  `${D}.anularDialogo.faltaMotivo`,
  `${D}.anularDialogo.cancelar`,
  `${D}.anularDialogo.confirmar`,
  `${D}.anularDialogo.anulando`,
  `${D}.anularDialogo.anulado`,
  `${D}.anularDialogo.noSeAnulo`,
  `${D}.liquidacion.titulo`,
  `${D}.liquidacion.netoDelMes`,
  `${D}.liquidacion.aGirar`,
  `${D}.liquidacion.saldoEnContraAviso`,
  `${D}.liquidacion.enContraFila`,
  `${D}.liquidacion.quedanEnContraUno`,
  `${D}.liquidacion.quedanEnContraVarios`,
  `${D}.aCargoDe.titulo`,
  `${D}.aCargoDe.descripcion`,
  `${D}.aCargoDe.propietario`,
  `${D}.aCargoDe.propietarioAyuda`,
  `${D}.aCargoDe.inquilino`,
  `${D}.aCargoDe.inquilinoAyuda`,
  `${D}.aCargoDe.cancelar`,
  `${D}.aCargoDe.confirmar`,
  `${D}.aCargoDe.aprobando`,
  `${D}.aCargoDe.aprobadaPropietario`,
  `${D}.aCargoDe.aprobadaInquilino`,
  `${D}.aCargoDe.sugiereElAgente`,
  `${D}.aCargoDe.quienPropietario`,
  `${D}.aCargoDe.quienInquilino`,
  // H-03 (18-09-2026): las dos formas nuevas.
  `${D}.aCargoDe.compartida`,
  `${D}.aCargoDe.compartidaAyuda`,
  `${D}.aCargoDe.inmobiliaria`,
  `${D}.aCargoDe.inmobiliariaAyuda`,
  `${D}.aCargoDe.inmobiliariaMotivo`,
  `${D}.aCargoDe.repartoInquilino`,
  `${D}.aCargoDe.repartoResumen`,
  `${D}.aCargoDe.quienCompartida`,
  `${D}.aCargoDe.quienInmobiliaria`,
  `${D}.aCargoDe.aprobadaCompartida`,
  `${D}.aCargoDe.aprobadaInmobiliaria`,
  `${D}.propuesta.titulo`,
  `${D}.propuesta.cotizacion`,
  `${D}.propuesta.sinCotizacion`,
  `${D}.propuesta.sugierePropietario`,
  `${D}.propuesta.sugiereInquilino`,
  `${D}.propuesta.aprobacionHumana`,
  `${D}.propuesta.revisar`,
  `${D}.cargoAlInquilino.titulo`,
  `${D}.cargoAlInquilino.detalle`,
  `${D}.cargoAlInquilino.aprobada`,
  `${D}.deuda.titulo`,
  `${D}.deuda.descripcion`,
  `${D}.deuda.desde`,
  `${D}.deuda.sinCuentaDeCobro`,
  `${D}.deuda.generar`,
  `${D}.deuda.generando`,
  `${D}.deuda.generada`,
  `${D}.deuda.noSeGenero`,
  `${D}.deuda.verCuenta`,
  `${D}.deuda.sinMigrar`,
  `${D}.deuda.queEs`,
  `${D}.cartera.titulo`,
  `${D}.cartera.descripcion`,
  `${D}.cartera.colPropietario`,
  `${D}.cartera.colDebe`,
  `${D}.cartera.colDesde`,
  `${D}.cartera.colCuenta`,
  `${D}.cartera.sinCuenta`,
  `${D}.cartera.cuenta`,
  `${D}.cartera.total`,
  `${D}.cartera.queSon`,
  `${D}.cuentaDeCobro.titulo`,
  `${D}.cuentaDeCobro.numero`,
  `${D}.cuentaDeCobro.emitida`,
  `${D}.cuentaDeCobro.a`,
  `${D}.cuentaDeCobro.de`,
  `${D}.cuentaDeCobro.concepto`,
  `${D}.cuentaDeCobro.valor`,
  `${D}.cuentaDeCobro.total`,
  `${D}.cuentaDeCobro.estado.VIGENTE`,
  `${D}.cuentaDeCobro.estado.DESCONTADA`,
  `${D}.cuentaDeCobro.estado.ANULADA`,
  `${D}.cuentaDeCobro.imprimir`,
  `${D}.cuentaDeCobro.volver`,
  `${D}.cuentaDeCobro.noEsFactura`,
  `${D}.cuentaDeCobro.queEs`,
  `${T}.fDeducciones`,
  `${T}.fAGirar`,
  `${T}.fSaldoEnContra`,
  `${T}.colDeducciones`,
];

describe('claves de las deducciones del propietario', () => {
  it.each(CLAVES)('%s existe, con texto, en español y en inglés', (clave) => {
    expect(typeof leer(es, clave)).toBe('string');
    expect(typeof leer(en, clave)).toBe('string');
    expect((leer(es, clave) as string).trim()).not.toBe('');
    expect((leer(en, clave) as string).trim()).not.toBe('');
  });

  it('el bloque tiene las mismas claves en los dos idiomas', () => {
    expect(hojas(leer(en, D), D).sort()).toEqual(hojas(leer(es, D), D).sort());
  });

  it.each(CLAVES)('%s lleva los mismos marcadores en los dos idiomas', (clave) => {
    expect(marcadores(leer(en, clave) as string)).toEqual(marcadores(leer(es, clave) as string));
  });

  it('el aviso del saldo en contra dice que pasa a la siguiente liquidación, no que se cobra', () => {
    const aviso = leer(es, `${D}.liquidacion.saldoEnContraAviso`) as string;
    expect(aviso).toMatch(/siguiente liquidación/);
    expect(aviso).not.toMatch(/cuenta de cobro|cobrar/i);
  });

  it('la deuda del propietario se cobra con cuenta de cobro, y la cuenta dice que no es factura', () => {
    expect(leer(es, `${D}.deuda.descripcion`) as string).toMatch(/se le cobran/);
    expect(leer(es, `${D}.cuentaDeCobro.noEsFactura`) as string).toMatch(/no es factura electrónica/);
  });

  it('la propuesta del agente dice que aprueba una persona', () => {
    expect(leer(es, `${D}.propuesta.aprobacionHumana`) as string).toMatch(/no aprueba/);
    expect(leer(es, `${D}.aCargoDe.sugiereElAgente`) as string).toMatch(/La decisión es tuya/);
  });

  it('el copy va en tuteo: nada de «usted» ni imperativos de usted', () => {
    const textos = hojas(leer(es, D), D).map((c) => leer(es, c) as string);
    for (const texto of textos) {
      expect(texto).not.toMatch(/\busted\b|\bescriba\b|\badjunte\b|\bcóbrele\b/i);
    }
  });
});
