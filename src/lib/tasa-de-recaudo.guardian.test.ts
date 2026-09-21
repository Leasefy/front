/**
 * 🔴 GUARDIÁN: NINGUNA PANTALLA CALCULA LA TASA DE RECAUDO POR SU LADO.
 *
 * El 2026-09-16 la misma agencia veía 2,2 % en el Resumen
 * (`tasaMedida(collectedRevenue, expectedRevenue)`), 43,6 % en Cobros emitidos
 * (`tasaMedida(totalCollected, totalExpected)`) y un tercer número en Recaudo
 * (`recaudadoCop / deudaDelMesCop`), los tres llamados «tasa de recaudo».
 * Desde entonces la mide el back como la eligió la inmobiliaria
 * (`dashboard/tasa-de-recaudo.ts`) y el front sólo la pinta con su rótulo
 * (`src/lib/tasa-de-recaudo.ts`).
 *
 * Esto lee `src/` y falla si reaparece, fuera de ese archivo:
 *
 *   1. una división de lo que entró entre lo que se debía;
 *   2. un `tasaMedida(` cuyo numerador es lo que entró;
 *   3. un `collectionRate` o `tasaDeRecaudo` asignado con algo que no sale de la
 *      tasa del back.
 *
 * Es una trampa, no una prueba de corrección. El bloque de abajo verifica que
 * siga armada contra las líneas exactas que había antes.
 *
 * FUERA de la búsqueda, a propósito: el panel del ARRENDADOR del marketplace
 * (no es una inmobiliaria: no tiene a quién preguntarle cómo medir), la vitrina
 * de diseño, los datos de ejemplo, los tipos generados y las pruebas.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';


/*
 * ⏱️ 60 s: este guardián lee el repo entero y compite con las demás pruebas de
 * la suite. Ver `el-producto-tutea.test.ts` para el caso en que 30 s no
 * alcanzaron — medir un guardián aislado no lo mide dentro de la suite.
 */
const TIEMPO_DE_RECORRER_EL_REPO = 60_000

const RAIZ = join(process.cwd(), 'src');
const CANONICO = join('lib', 'tasa-de-recaudo.ts');
const FUERA = [
  join('app', 'panel', '(landlord)') + sep,
  join('app', 'preview-ds') + sep,
  join('lib', 'data') + sep,
  join('lib', 'api', 'generated') + sep,
  join('lib', 'api', 'landlord.service.ts'),
  join('lib', 'api', 'landlord.types.ts'),
  // El backoffice interno de Leasefy (ROI de la cobranza), no una inmobiliaria.
  join('app', 'admin') + sep,
];

/**
 * Divisiones que se parecen a la tasa y NO lo son. Cada una con su porqué: la
 * lista es corta a propósito, y crecerla debería doler.
 */
const NO_ES_LA_TASA: ReadonlyArray<{ archivo: string; linea: RegExp; porque: string }> = [
  {
    archivo: join('components', 'inmobiliaria', 'reports', 'CollectionsReport.tsx'),
    linea: /const collectedPct = \(m\.collected \/ maxExpected\) \* 100/,
    porque: 'Es el ALTO de la barra del gráfico contra el mes más grande, no una tasa que se muestre.',
  },
];

const ENTRO = '(?:abonado|pagado|paid|collected|recaudado|cobrado)';
const SE_DEBIA = '(?:causado|total|expected|esperado|deuda|reclamado|emitido|facturado)';

const DIVISION = new RegExp(`\\b\\w*${ENTRO}\\w*\\s*\\)?\\s*\\/\\s*\\(?\\s*[\\w.]*${SE_DEBIA}`, 'i');
const TASA_DE_LO_QUE_ENTRO = new RegExp(`tasaMedida\\(\\s*[\\w.]*${ENTRO}`, 'i');
const CLAVE_DE_TASA = /\b(collectionRate|tasaDeRecaudo)\b\??\s*[:=]\s*(.*)$/;
const ES_UN_TIPO_O_UN_LITERAL = /^(number|string|boolean|null|TasaDeRecaudo|\d)/;
const SALE_DE_LA_TASA = /tasa|pct/i;

function sinComentarios(fuente: string): string[] {
  const sinBloques = fuente.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return sinBloques.split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'));
}

function violacionesDe(fuente: string): string[] {
  const lineas = sinComentarios(fuente);
  const malas: string[] = [];
  lineas.forEach((linea, i) => {
    const n = i + 1;
    if (DIVISION.test(linea) || TASA_DE_LO_QUE_ENTRO.test(linea)) {
      malas.push(`${n}: ${linea.trim()}`);
      return;
    }
    const clave = CLAVE_DE_TASA.exec(linea);
    if (!clave) return;
    let valor = clave[2].trim();
    for (let j = i + 1; j < lineas.length && j <= i + 8 && !/[;,{]$/.test(valor); j++) {
      valor = `${valor} ${lineas[j].trim()}`.trim();
    }
    if (valor === '' || valor === ',' || ES_UN_TIPO_O_UN_LITERAL.test(valor)) return;
    if (!SALE_DE_LA_TASA.test(valor)) malas.push(`${n}: ${linea.trim()}`);
  });
  return malas;
}

function archivosDe(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivosDe(ruta);
    if (!/\.(ts|tsx)$/.test(ruta)) return [];
    if (/\.test\.(ts|tsx)$/.test(ruta) || /\.d\.ts$/.test(ruta)) return [];
    return [ruta];
  });
}

describe('guardián de la tasa de recaudo', () => {
  it('ninguna pantalla calcula la tasa por fuera de lo que mide el back', () => {
    const hallazgos = archivosDe(RAIZ)
      .map((ruta) => relative(RAIZ, ruta))
      .filter((rel) => rel !== CANONICO)
      .filter((rel) => !FUERA.some((f) => rel.startsWith(f)))
      .flatMap((rel) =>
        violacionesDe(readFileSync(join(RAIZ, rel), 'utf8'))
          .filter((v) => !NO_ES_LA_TASA.some((n) => n.archivo === rel && n.linea.test(v)))
          .map((v) => `${rel}:${v}`),
      );
    expect(hallazgos).toEqual([]);
  });

  describe('la trampa sigue armada contra lo que había antes del 2026-09-16', () => {
    it.each([
      // reportes/resumen/page.tsx
      'const tasaDeRecaudo = tasaMedida(kpis.collectedRevenue, kpis.expectedRevenue);',
      // lib/api/inmobiliaria.service.ts, `getSummary`
      'collectionRate: raw.collectionRate ?? tasaMedida(totalCollected, totalExpected),',
      // components/recaudo/Recaudo.tsx
      'return Math.round((p.recaudadoCop / p.deudaDelMesCop) * 100);',
      // lib/utils/report-adapters.ts
      'currentMonth === undefined ? null : tasaMedida(currentMonth.collected, currentMonth.total);',
    ])('caza «%s»', (linea) => {
      expect(violacionesDe(linea)).toHaveLength(1);
    });

    it('deja pasar lo que sale de la tasa del back, los tipos y los valores en cero', () => {
      const bien = [
        'collectionRate: raw.tasaDeRecaudo?.pct ?? null,',
        'tasaDeRecaudo: raw.tasaDeRecaudo ?? null,',
        'collectionRate: number | null;',
        'lateCollections: 0, collectionRate: 0, totalCommissions: 0,',
        'const tasaDeOcupacion = tasaMedida(kpis.propertiesRented, enCatalogo);',
        '// collected / total en un comentario no es una cuenta',
      ].join('\n');
      expect(violacionesDe(bien)).toEqual([]);
    });
  });
});
