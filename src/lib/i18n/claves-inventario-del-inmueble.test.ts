/**
 * Guardia de las claves del inventario del inmueble por versiones: una clave
 * que falte en inglés sale como su ruta, y un `{{numero}}` que falte en un
 * idioma deja el bloqueo sin decir QUÉ contrato pide actualizar.
 */
import { describe, expect, it } from 'vitest';

import en from './locales/en.json';
import es from './locales/es.json';

const B = 'inmobiliaria.inventarioDelInmueble';

/** Lo que consumen `components/inmobiliaria/inventario/*` y el bloqueo. Escrito a mano a propósito. */
const CLAVES = [
  'titulo', 'cargando', 'errorAlCargar', 'reintentar', 'desdeCache', 'migracionPendiente',
  'vigente', 'sinInventario', 'soloBorrador', 'porActualizarTitulo', 'porActualizarTexto',
  'borradorDeVersion', 'versionCompleta', 'sinVersiones', 'completar', 'completando',
  'completarAyuda', 'completarSubePrimero', 'completarSinItems', 'completado', 'errorAlCompletar',
  'historialTitulo', 'historialVacio', 'estadoBorrador', 'estadoCompleto', 'items',
  'contratosQueLaUsan', 'origenConsignacion', 'completadaEl', 'editadaEl', 'verVersion',
  'versionTitulo', 'cerrar', 'contratoTitulo', 'contratoVersion', 'contratoSinCopia',
  'contratoVerInmueble', 'tareaEsteContrato', 'irAlInventario', 'bloqueoTitulo',
  'bloqueoSinInventario', 'bloqueoSoloBorrador', 'bloqueoAnterior', 'bloqueoEnlace',
  'bloqueoSinEnlace', 'espacio', 'espacioPlaceholder',
].map((k) => `${B}.${k}`);

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

const marcadores = (t: string) => [...t.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe('claves del inventario del inmueble', () => {
  it.each(CLAVES)('%s existe en español y en inglés, con los mismos marcadores', (clave) => {
    const enEs = leer(es, clave);
    const enEn = leer(en, clave);
    expect(typeof enEs).toBe('string');
    expect(typeof enEn).toBe('string');
    expect(marcadores(enEs as string)).toEqual(marcadores(enEn as string));
  });

  it('no sobra ninguna clave sin usar', () => {
    const todas = Object.keys(leer(es, B) as Record<string, unknown>).map((k) => `${B}.${k}`);
    expect(todas.sort()).toEqual([...CLAVES].sort());
  });

  it('el bloqueo por contrato anterior nombra el contrato y la fecha', () => {
    expect(marcadores(leer(es, `${B}.bloqueoAnterior`) as string)).toEqual(['fecha', 'numero']);
  });
});
