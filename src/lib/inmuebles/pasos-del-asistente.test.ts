/**
 * El orden de «Nuevo inmueble» (Juan y Nico, 27-10-2026): el inmueble primero, las fotos aparte, el propietario y
 * el inventario opcionales; el asesor no ve «Agente» y una venta no tiene inventario.
 */
import { describe, expect, it } from 'vitest';
import { ORDEN_DE_PASOS, PASO, claveDelPaso, pasoAnterior, pasoParaRetomar, pasoSiguiente } from './pasos-del-asistente';

const admin = { esAsesor: false, soloVenta: false };
const asesor = { esAsesor: true, soloVenta: false };
const venta = { esAsesor: false, soloVenta: true };

describe('pasos del asistente', () => {
  it('el inmueble es el primero y confirmar el último', () => {
    expect(claveDelPaso(1)).toBe('inmueble');
    expect(claveDelPaso(2)).toBe('fotos');
    expect(claveDelPaso(3)).toBe('propietario');
    expect(claveDelPaso(7)).toBe('confirmar');
    expect(claveDelPaso(8)).toBeNull();
  });

  it('el asesor se salta «Agente» en los dos sentidos', () => {
    expect(pasoSiguiente(PASO.comision, asesor)).toBe(PASO.inventario);
    expect(pasoAnterior(PASO.inventario, asesor)).toBe(PASO.comision);
    expect(pasoSiguiente(PASO.comision, admin)).toBe(PASO.agente);
  });

  it('sólo en venta no hay inventario', () => {
    expect(pasoSiguiente(PASO.agente, venta)).toBe(PASO.confirmar);
    expect(pasoAnterior(PASO.confirmar, venta)).toBe(PASO.agente);
    expect(pasoSiguiente(PASO.comision, { esAsesor: true, soloVenta: true })).toBe(PASO.confirmar);
  });

  it('nunca se pasa de los bordes', () => {
    expect(pasoSiguiente(PASO.confirmar, admin)).toBe(PASO.confirmar);
    expect(pasoAnterior(PASO.inmueble, admin)).toBe(PASO.inmueble);
  });

  it('un borrador con el orden de antes retoma desde el primero; uno de hoy, donde quedó (o el siguiente que exista)', () => {
    expect(pasoParaRetomar({ paso: 4 }, admin)).toBe(PASO.inmueble);
    expect(pasoParaRetomar({ paso: 4, ordenDePasos: ORDEN_DE_PASOS }, admin)).toBe(PASO.comision);
    expect(pasoParaRetomar({ paso: PASO.agente, ordenDePasos: ORDEN_DE_PASOS }, asesor)).toBe(PASO.inventario);
    expect(pasoParaRetomar({ paso: 99, ordenDePasos: ORDEN_DE_PASOS }, admin)).toBe(PASO.confirmar);
  });
});
