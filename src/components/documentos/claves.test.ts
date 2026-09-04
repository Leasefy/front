/**
 * Las claves que usa la pantalla de Documentos existen en los dos idiomas.
 *
 * Sin esto, una clave nueva sólo en `es.json` se ve como el propio texto de la
 * clave («inmobiliaria.documentos.legales.colPartes») en el panel en inglés, y
 * nadie lo nota hasta que un usuario cambia de idioma.
 */
import { describe, it, expect } from 'vitest';
import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';

const CLAVES = [
  'subtitle',
  'generar',
  'buscar',
  'tipo',
  'estado',
  'todosLosTipos',
  'todosLosEstados',
  'colDocumento',
  'colTipo',
  'colInmueble',
  'colPartes',
  'colFecha',
  'colEstado',
  'colAcciones',
  'verPdf',
  'descargar',
  'vacioTitulo',
  'vacioDesc',
  'colPlantilla',
  'colCategoria',
  'colVersion',
  'colVariables',
  'verPlantilla',
  'vacioPlantillas',
  'vacioPlantillasDesc',
  'colInquilino',
  'vacioActas',
  'vacioActasDesc',
  'errorPdf',
  'plantillaTitulo',
] as const;

type Diccionario = Record<string, unknown>;

function legales(dic: Diccionario): Record<string, string> {
  const inmobiliaria = dic.inmobiliaria as Diccionario;
  const documentos = inmobiliaria.documentos as Diccionario;
  return documentos.legales as Record<string, string>;
}

describe('claves de Documentos', () => {
  it.each(CLAVES)('«%s» está en es y en en, y no está vacía', (clave) => {
    expect(legales(es as Diccionario)[clave]?.trim()).toBeTruthy();
    expect(legales(en as Diccionario)[clave]?.trim()).toBeTruthy();
  });

  it('los dos idiomas tienen exactamente las mismas claves', () => {
    expect(Object.keys(legales(es as Diccionario)).sort()).toEqual(
      Object.keys(legales(en as Diccionario)).sort(),
    );
  });
});
