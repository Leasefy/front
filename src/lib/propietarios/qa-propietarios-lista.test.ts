/**
 * QA de Propietarios (03-10-2026) — la lógica de la lista, sin pantalla.
 *
 * P-07 · buscar sin tildes ni mayúsculas, por palabras; un documento con
 *        puntos o un teléfono con espacios se comparan por sus dígitos.
 * P-21 · el Excel de la lista no dice «$0» a quien no ve la plata.
 * PR-02 · el `FALTA_CORREO_DEL_TERCERO` del back va bajo Correo, no como un
 *        correo repetido.
 */

import { describe, it, expect } from 'vitest';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { ApiError } from '@/lib/api/client';
import { FILTROS_INICIALES, filtrarPropietarios, sinTildes } from './filtrar-propietarios';
import { armarHojaDeLaLista, SIN_ACCESO_A_LA_PLATA } from './exportar-datos';
import { errorAlGuardarPropietario, CORREO_YA_CARGADO } from './errores-del-propietario';
import { laListaOcultaLaPlata, tipoDeDocumentoEnPalabras } from './lo-que-muestra-la-lista';

function propietario(over: Partial<Propietario> & { name: string }): Propietario {
  return {
    id: over.name,
    email: null,
    phone: null,
    documentType: 'CC',
    documentNumber: '1',
    propertyCount: 0,
    activeLeases: 0,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    bankAccount: { bank: '', accountType: 'savings', accountNumber: '', accountHolder: '' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as Propietario;
}

const ANA_LUCIA = propietario({ name: 'Ana Lucía Peña Úsuga', email: 'analucia@example.test' });
const MUNOZ = propietario({ name: 'Rubén Muñoz Íñiguez', phone: '310 555 0001' });
const INVERSIONES = propietario({
  name: 'Inversiones Laboratorio S.A.S.',
  documentType: 'NIT',
  documentNumber: '901222333',
  phone: '3109998877',
});
const LISTA = [ANA_LUCIA, MUNOZ, INVERSIONES];
const busca = (q: string) =>
  filtrarPropietarios(LISTA, { ...FILTROS_INICIALES, busqueda: q }).map((p) => p.name);

describe('P-07 — buscar como escribe la gente', () => {
  it('sin tildes ni mayúsculas: «usuga» encuentra a «Úsuga»', () => {
    expect(busca('usuga')).toEqual(['Ana Lucía Peña Úsuga']);
    expect(busca('PEÑA')).toEqual(['Ana Lucía Peña Úsuga']);
  });

  it('por palabras y en cualquier orden: «munoz iniguez» e «iniguez munoz»', () => {
    expect(busca('munoz iniguez')).toEqual(['Rubén Muñoz Íñiguez']);
    expect(busca('iniguez munoz')).toEqual(['Rubén Muñoz Íñiguez']);
    expect(busca('ruben iniguez')).toEqual(['Rubén Muñoz Íñiguez']);
  });

  it('una palabra que no está deja la lista vacía (no basta con una de dos)', () => {
    expect(busca('munoz restrepo')).toEqual([]);
  });

  it('el documento con puntos se compara por sus dígitos: «901.222.333»', () => {
    expect(busca('901.222.333')).toEqual(['Inversiones Laboratorio S.A.S.']);
  });

  it('un NIT escrito con su dígito de verificación también lo encuentra: «901.222.333-9»', () => {
    expect(busca('901.222.333-9')).toEqual(['Inversiones Laboratorio S.A.S.']);
  });

  it('el teléfono con espacios, guardado o buscado: «310 555 0001» y «3105550001»', () => {
    expect(busca('310 555 0001')).toEqual(['Rubén Muñoz Íñiguez']);
    expect(busca('3105550001')).toEqual(['Rubén Muñoz Íñiguez']);
    expect(busca('+57 310 999 8877')).toEqual(['Inversiones Laboratorio S.A.S.']);
    expect(busca('310 999 8877')).toEqual(['Inversiones Laboratorio S.A.S.']);
  });

  it('sinTildes aplana tildes y la ñ', () => {
    expect(sinTildes('Muñoz Íñiguez Úsuga')).toBe('munoz iniguez usuga');
  });
});

describe('P-21 — el Excel de la lista no inventa plata', () => {
  it('a quien no ve la plata, «Sin acceso» en el canon y el saldo (nunca 0)', () => {
    const oculto = propietario({ name: 'Paula', plataOculta: true } as Partial<Propietario> & { name: string });
    const hoja = armarHojaDeLaLista([oculto]);
    const cabecera = hoja.filas[0] as string[];
    const fila = hoja.filas[1];
    expect(fila[cabecera.indexOf('Canon mensual total')]).toBe(SIN_ACCESO_A_LA_PLATA);
    expect(fila[cabecera.indexOf('Saldo pendiente')]).toBe(SIN_ACCESO_A_LA_PLATA);
  });

  it('a quien sí la ve, los números de siempre', () => {
    const hoja = armarHojaDeLaLista([propietario({ name: 'Jorge', totalMonthlyRent: 1_000_000, pendingBalance: 5 })]);
    const cabecera = hoja.filas[0] as string[];
    expect(hoja.filas[1][cabecera.indexOf('Canon mensual total')]).toBe(1_000_000);
    expect(hoja.filas[1][cabecera.indexOf('Saldo pendiente')]).toBe(5);
  });

  it('laListaOcultaLaPlata: basta una fila oculta (el back la oculta por rol)', () => {
    expect(laListaOcultaLaPlata([ANA_LUCIA, { ...MUNOZ, plataOculta: true } as Propietario])).toBe(true);
    expect(laListaOcultaLaPlata(LISTA)).toBe(false);
  });
});

describe('P-08 — el tipo de documento en palabras', () => {
  const t = (k: string) => k;
  it('PASSPORT es la etiqueta corta de pasaporte, no la palabra en inglés', () => {
    expect(tipoDeDocumentoEnPalabras(t, 'PASSPORT')).toBe('inmobiliaria.propietario.form.docCorto.PASSPORT');
    expect(tipoDeDocumentoEnPalabras(t, 'CC')).toBe('inmobiliaria.propietario.form.docCorto.CC');
  });
  it('sin tipo, null; un tipo desconocido sale crudo', () => {
    expect(tipoDeDocumentoEnPalabras(t, null)).toBeNull();
    expect(tipoDeDocumentoEnPalabras(t, 'RC')).toBe('RC');
  });
});

describe('PR-02 — el correo que pide la política de la inmobiliaria', () => {
  it('🔴 `FALTA_CORREO_DEL_TERCERO` va bajo Correo, y no como «Ese correo ya está cargado»', () => {
    const err = new ApiError(
      409,
      'Tu inmobiliaria pide el correo de cada tercero: escribe el de este propietario.',
      'FALTA_CORREO_DEL_TERCERO',
    );
    const e = errorAlGuardarPropietario(err);
    expect(e.campo?.field).toBe('email');
    expect(e.campo?.message).not.toBe(CORREO_YA_CARGADO);
    expect(e.campo?.message).toContain('correo');
    expect(e.general).toBeNull();
  });
});
