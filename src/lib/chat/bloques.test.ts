import { describe, it, expect } from 'vitest';
import { leerBloques, leerEntidades, sinTablasDeMarkdown, textoDeCelda, tieneTabla } from './bloques';

/**
 * La parte con FORMA de la respuesta (Nico, 23-09: «entregar siempre respuestas
 * usando algún componente que haga match»). El micro y el panel pueden ser de
 * versiones distintas: todo lo que llega se lee con tolerancia y el texto queda
 * siempre de respaldo.
 */

const TEXTO_CON_TABLA = [
  'Tienes 2 contratos que vencen en octubre:',
  '',
  '| Código | Inquilino | Canon |',
  '|---|---|---:|',
  '| 101 | Juan Camilo López | $ 2.500.000 |',
  '| 102 | Ana Ruiz | $ 1.800.000 |',
  '',
  'Los dos tienen propuesta de renovación enviada.',
].join('\n');

describe('sinTablasDeMarkdown — la tabla la pinta Cadence, no el texto', () => {
  it('quita la tabla GFM y deja el texto de alrededor', () => {
    expect(sinTablasDeMarkdown(TEXTO_CON_TABLA)).toBe(
      'Tienes 2 contratos que vencen en octubre:\n\nLos dos tienen propuesta de renovación enviada.'
    );
  });

  it('mientras se escribe, una tabla a medio teclear no asoma como rayas y barras', () => {
    // Cortado en el encabezado: todavía no hay separador, la regla GFM no la ve.
    const aMedias = TEXTO_CON_TABLA.slice(0, TEXTO_CON_TABLA.indexOf('|---'));
    expect(sinTablasDeMarkdown(aMedias, { parcial: true })).toBe('Tienes 2 contratos que vencen en octubre:');
    // Sin `parcial` no se toca nada que no sea una tabla completa.
    expect(sinTablasDeMarkdown(aMedias)).toContain('| Código |');
  });

  it('un texto sin tablas queda igual', () => {
    expect(sinTablasDeMarkdown('Hola.\n\n- uno\n- dos')).toBe('Hola.\n\n- uno\n- dos');
  });
});

describe('leerBloques — tolerante con el micro', () => {
  it('lee tabla, métrica y aviso; descarta lo desconocido o roto', () => {
    const bloques = leerBloques([
      {
        tipo: 'tabla',
        titulo: 'contratos',
        columnas: [{ clave: 'canon', titulo: 'Canon', formato: 'moneda' }, { clave: 'x', formato: 'raro' }],
        filas: [{ canon: 2500000, x: 'a' }],
        total: 29,
        truncada: true,
      },
      { tipo: 'metrica', titulo: 'Cartera', valor: 12500000, formato: 'moneda' },
      { tipo: 'aviso', tono: 'advertencia', texto: 'Hay más filas.' },
      { tipo: 'metrica', valor: Number.NaN },
      { tipo: 'tabla', columnas: [], filas: [] },
      { tipo: 'grafica' },
      'basura',
    ]);
    expect(bloques).toHaveLength(3);
    const tabla = bloques[0];
    expect(tabla.tipo === 'tabla' && tabla.columnas[1]).toEqual({ clave: 'x', titulo: 'x', formato: 'texto' });
    expect(tabla.tipo === 'tabla' && tabla.total).toBe(29);
    expect(tieneTabla(bloques)).toBe(true);
    expect(leerBloques(undefined)).toEqual([]);
  });
});

describe('leerEntidades — persona → contratos → inmueble → propietario → cartera', () => {
  it('un inquilino trae su contrato con inmueble, propietarios y cartera', () => {
    const [e] = leerEntidades([
      {
        tipo: 'inquilino',
        id: 'p-1',
        titulo: 'Juan Camilo López',
        motivo: 'cédula',
        documento: '1020304050',
        telefono: '3001234567',
        correo: null,
        totalContratos: 2,
        otrosRoles: ['propietario', 'marciano'],
        contratos: [
          {
            id: 'c-1',
            codigo: 101,
            estado: 'ACTIVE',
            vigente: true,
            inquilino: 'Juan Camilo López',
            inicio: '2025-11-01',
            fin: '2026-10-31',
            canonCop: 2500000,
            diasParaVencer: 38,
            inmueble: { id: 'i-1', codigo: 7, titulo: 'Apto 301', direccion: 'Cra 7 # 45-10', ciudad: 'Bogotá' },
            propietarios: [{ id: 'o-1', nombre: 'Marta Gómez', participacionPct: 100 }],
            renovacion: null,
            cartera: { estado: 'ok', deudaTotalCop: 2500000, carteraCop: 2500000, porVencerCop: 0, diasDeMoraMaximo: 12 },
          },
        ],
      },
    ]);
    expect(e.documento).toBe('1020304050');
    expect(e.otrosRoles).toEqual(['propietario']);
    expect(e.contratos[0].inmueble?.direccion).toBe('Cra 7 # 45-10');
    expect(e.contratos[0].propietarios).toEqual([{ id: 'o-1', nombre: 'Marta Gómez' }]);
    expect(e.contratos[0].cartera).toEqual({
      estado: 'ok',
      deudaTotalCop: 2500000,
      carteraCop: 2500000,
      porVencerCop: 0,
      diasDeMoraMaximo: 12,
    });
  });

  it('un PROPIETARIO trae sus contratos colgados de cada inmueble: se aplanan con el inmueble puesto', () => {
    const [e] = leerEntidades([
      {
        tipo: 'propietario',
        id: 'o-1',
        titulo: 'Marta Gómez',
        motivo: 'nombre',
        documentoFinal: '4050',
        inmuebles: [
          {
            id: 'i-1',
            codigo: 7,
            titulo: 'Apto 301',
            direccion: 'Cra 7 # 45-10',
            ciudad: 'Bogotá',
            contratoVigente: {
              id: 'c-1',
              codigo: 101,
              estado: 'ACTIVE',
              vigente: true,
              inquilino: 'Juan Camilo López',
              fin: '2026-10-31',
              canonCop: 2500000,
              diasParaVencer: 38,
              inmueble: null,
              propietarios: [],
              renovacion: null,
              cartera: { estado: 'sin_cuotas' },
            },
          },
          { id: 'i-2', codigo: 8, titulo: 'Local', direccion: 'Cl 80', ciudad: 'Bogotá', contratoVigente: null },
        ],
      },
    ]);
    // Sin el documento completo (otro back o sin permiso): los últimos 4, marcados.
    expect(e.documento).toBe('••••4050');
    expect(e.contratos).toHaveLength(1);
    expect(e.contratos[0].inquilino).toBe('Juan Camilo López');
    expect(e.contratos[0].inmueble?.direccion).toBe('Cra 7 # 45-10');
    expect(e.contratos[0].cartera).toEqual({ estado: 'sin_cuotas' });
  });
});

describe('textoDeCelda', () => {
  it('formatea por columna y nunca pinta «null» ni un 0 inventado', () => {
    expect(textoDeCelda(null, 'moneda')).toBe('—');
    expect(textoDeCelda('', 'texto')).toBe('—');
    expect(textoDeCelda(2500000, 'moneda')).toMatch(/^\$\s?2[.,]500[.,]000$/);
    expect(textoDeCelda('29', 'numero')).toBe('29');
    expect(textoDeCelda(true, 'texto')).toBe('Sí');
  });
});

describe('identificadores', () => {
  it('un código o una cédula no llevan separador de miles, aunque el micro los mande como número', () => {
    const [tabla] = leerBloques([
      {
        tipo: 'tabla',
        titulo: 'contratos',
        columnas: [
          { clave: 'codigo', titulo: 'Código', formato: 'numero' },
          { clave: 'documento_del_inquilino', titulo: 'Documento', formato: 'numero' },
          { clave: 'dias_para_vencer', titulo: 'Días para vencer', formato: 'numero' },
        ],
        filas: [{ codigo: 1040, documento_del_inquilino: 1020304050, dias_para_vencer: 1200 }],
        total: 1,
        truncada: false,
      },
    ]);
    if (tabla.tipo !== 'tabla') throw new Error('no es tabla');
    expect(tabla.columnas.map((c) => c.formato)).toEqual(['texto', 'texto', 'numero']);
    expect(textoDeCelda(1040, tabla.columnas[0].formato)).toBe('1040');
  });
});
