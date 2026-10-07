/**
 * QA-PROP-95 (04-10-2026): lo que se arregló en la lista de propietarios.
 * - A-20: el orden por nombre es el del español (Óscar con la O, Ñandú tras la N).
 * - A-30: el nombre del Excel lleva el día de Bogotá, no el de UTC.
 */
import { describe, expect, it } from 'vitest';
import { FILTROS_INICIALES, filtrarPropietarios } from './filtrar-propietarios';
import { nombreDelArchivoDeLaLista, nombreDelArchivoDelPropietario } from './exportar-datos';
import type { Propietario } from '@/lib/types/inmobiliaria';

const p = (name: string) => ({ id: name, name, documentType: 'CC', documentNumber: '1', email: null, phone: null }) as unknown as Propietario;

describe('QA-PROP-95 · orden por nombre (A-20)', () => {
  it('«Óscar» va con la O y «Ñandú» después de la N, no después de la Z', () => {
    const lista = [p('Teresa'), p('Óscar'), p('Zoila'), p('Ñandú'), p('Nora'), p('Ana')];
    const asc = filtrarPropietarios(lista, { ...FILTROS_INICIALES, campo: 'name', sentido: 'asc' }).map((x) => x.name);
    expect(asc).toEqual(['Ana', 'Nora', 'Ñandú', 'Óscar', 'Teresa', 'Zoila']);
    const desc = filtrarPropietarios(lista, { ...FILTROS_INICIALES, campo: 'name', sentido: 'desc' }).map((x) => x.name);
    expect(desc[0]).toBe('Zoila');
  });
});

describe('QA-PROP-95 · fecha del Excel (A-30)', () => {
  it('el 4 de octubre a las 8:30 p. m. de Bogotá (5 de octubre en UTC) el archivo dice 2026-10-04', () => {
    const noche = new Date('2026-10-05T01:30:00.000Z');
    expect(nombreDelArchivoDeLaLista(noche)).toBe('propietarios-2026-10-04.xlsx');
    expect(nombreDelArchivoDelPropietario('Paula', noche)).toMatch(/-2026-10-04\.xlsx$/);
  });
});
