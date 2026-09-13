/**
 * columnaCompuesta — una columna que trae DOS datos en cada celda.
 *
 * El archivo real de contratos trae la propiedad como «3 - CR 50 127 SUR 61
 * OF 502» (código + dirección) y al propietario como «[1] 901272830 -
 * CONSTRUCTORA X» (documento + nombre). Mapear esa columna a «Dirección» a
 * secas guardaba la dirección con el código pegado adelante y dejaba el código
 * sin llegar a ningún lado — y el código es la llave con la que los contratos
 * encuentran su inmueble (Nico, 2026-09-11: «si la columna trae dos tipos de
 * información, que le podamos decir: el primero de izquierda a derecha es X y
 * el siguiente es Y»).
 *
 * ── Qué se considera «dos datos» ─────────────────────────────────────────────
 *
 * La IZQUIERDA tiene que ser un dato corto —un código o un documento: letras
 * opcionales y dígitos, con puntos de miles si acaso— seguido de un guion. Una
 * dirección con guion adentro («CALLE 130 SUR 52 - 03») no cumple: la
 * izquierda tiene espacios y letras, así que la celda va ENTERA a la derecha.
 * Es la misma regla que `codigoYDireccion` en `valores-de-origen.ts`, medida
 * contra 2.895 direcciones reales sin inventar un solo código.
 *
 * Con el guion pegado («3-CR 50») la derecha tiene que empezar por letra:
 * «55-51 CALLE 129» son dos números de una nomenclatura, no un código.
 */

import type { ColumnMapping, DivisionDeColumna, ParsedRow } from './importTypes';

export interface CeldaPartida {
  izquierda: string;
  derecha: string;
}

/** El `[1]` / `[2]` con el que el archivo numera copropietarios y co-inquilinos. */
const MARCADOR_DE_ORDEN = /^\[\d+\]\s*/;
const DATO_CORTO = /^[A-Za-z]{0,3}[\d.]+$/;

export function partirCelda(valor: unknown): CeldaPartida | null {
  const texto = String(valor ?? '').replace(/\s+/g, ' ').trim().replace(MARCADOR_DE_ORDEN, '');
  if (!texto) return null;
  const m = texto.match(/^(\S+?)( ?)[-–]( ?)(.+)$/);
  if (!m) return null;
  const [, izquierda, antes, despues, derecha] = m;
  if (!DATO_CORTO.test(izquierda)) return null;
  const conEspacios = antes === ' ' && despues === ' ';
  if (!conEspacios && !/^[a-zA-ZÀ-ɏ]/.test(derecha)) return null;
  const der = derecha.trim();
  if (!der) return null;
  return { izquierda, derecha: der };
}

/** Cuántas celdas de muestra tienen la forma «dato - texto». */
export function detectarColumnaCompuesta(valores: unknown[]): { proporcion: number; ejemplo: CeldaPartida } | null {
  const noVacias = valores.map((v) => String(v ?? '').trim()).filter(Boolean);
  if (noVacias.length === 0) return null;
  const partidas = noVacias.map(partirCelda).filter((p): p is CeldaPartida => p !== null);
  const proporcion = partidas.length / noVacias.length;
  // Con menos del 80 % la columna no ES compuesta: una dirección de cada cinco
  // con un código adelante es un archivo sucio, no un formato.
  if (proporcion < 0.8) return null;
  return { proporcion, ejemplo: partidas[0] };
}

const VIA = /\b(cr|cra|kr|kra|cl|cll|calle|carrera|av|avenida|ak|ac|dg|diagonal|tv|transversal|km|mz|manzana)\b|#/i;

export function pareceDireccion(texto: string): boolean {
  return VIA.test(texto);
}

/**
 * A qué campos mandar cada parte, según lo que YA se sabía de la columna (su
 * encabezado) y la forma de la celda. La persona puede cambiarlo.
 */
export function sugerirDestinos(
  destinoDelEncabezado: string | null,
  ejemplo: CeldaPartida,
): [string | null, string | null] {
  if (destinoDelEncabezado === 'ownerName') return ['ownerDocument', 'ownerName'];
  if (destinoDelEncabezado === 'propertyAddress') return ['externalId', 'propertyAddress'];
  const digitos = ejemplo.izquierda.replace(/\D/g, '');
  const izquierda = digitos.length >= 7 ? 'ownerDocument' : 'externalId';
  const derecha = pareceDireccion(ejemplo.derecha)
    ? 'propertyAddress'
    : izquierda === 'ownerDocument'
      ? 'ownerName'
      : (destinoDelEncabezado ?? null);
  return [izquierda, derecha];
}

/** Los campos a los que llega una columna: el suyo, o los de sus dos partes. */
export function destinosDe(mapping: ColumnMapping): string[] {
  if (mapping.partes) return mapping.partes.destinos.filter((d): d is string => d !== null);
  return mapping.targetField ? [mapping.targetField] : [];
}

/** Las primeras celdas no vacías de una columna, para detectar y para mostrar. */
export function valoresDe(rawRows: ParsedRow[], columna: string, tope = 20): unknown[] {
  const salida: unknown[] = [];
  for (const fila of rawRows) {
    if (salida.length >= tope) break;
    const v = fila[columna];
    if (v !== null && v !== undefined && String(v).trim()) salida.push(v);
  }
  return salida;
}

/**
 * Quitarle un destino a cualquier OTRA columna (o parte) que lo tuviera: un
 * campo sólo puede venir de un lugar. Mismo criterio que `handleMappingChange`.
 */
function soltarDestino(mappings: ColumnMapping[], destino: string, salvo: string): ColumnMapping[] {
  return mappings.map((m) => {
    if (m.sourceColumn === salvo) return m;
    if (m.partes && m.partes.destinos.includes(destino)) {
      const destinos = m.partes.destinos.map((d) => (d === destino ? null : d)) as [string | null, string | null];
      return { ...m, partes: { destinos }, isManual: true };
    }
    if (m.targetField === destino) return { ...m, targetField: null, confidence: 0, isManual: true };
    return m;
  });
}

/** Partir una columna en dos, con los destinos sugeridos (los que no choquen con otra columna). */
export function dividirColumna(mappings: ColumnMapping[], sourceColumn: string, ejemplo: CeldaPartida): ColumnMapping[] {
  const actual = mappings.find((m) => m.sourceColumn === sourceColumn);
  if (!actual || actual.partes) return mappings;
  const [izq, der] = sugerirDestinos(actual.targetField, ejemplo);
  const ocupados = new Set(mappings.filter((m) => m.sourceColumn !== sourceColumn).flatMap(destinosDe));
  const destinos: [string | null, string | null] = [
    izq && !ocupados.has(izq) ? izq : null,
    der && !ocupados.has(der) ? der : null,
  ];
  return mappings.map((m) =>
    m.sourceColumn === sourceColumn
      ? { ...m, targetField: null, confidence: 1, isManual: true, partes: { destinos } }
      : m,
  );
}

/** Volver a un solo dato: la columna entera queda en el destino de la derecha (el texto). */
export function unirColumna(mappings: ColumnMapping[], sourceColumn: string): ColumnMapping[] {
  return mappings.map((m) => {
    if (m.sourceColumn !== sourceColumn || !m.partes) return m;
    const { partes, ...resto } = m;
    return { ...resto, targetField: partes.destinos[1] ?? partes.destinos[0] ?? null, isManual: true, confidence: 1 };
  });
}

export function cambiarDestinoDeParte(
  mappings: ColumnMapping[],
  sourceColumn: string,
  indice: 0 | 1,
  destino: string | null,
): ColumnMapping[] {
  const base = destino ? soltarDestino(mappings, destino, sourceColumn) : mappings;
  return base.map((m) => {
    if (m.sourceColumn !== sourceColumn || !m.partes) return m;
    const destinos = [...m.partes.destinos] as [string | null, string | null];
    // El mismo campo no puede venir de las dos partes.
    if (destino && destinos[1 - indice] === destino) destinos[1 - indice] = null;
    destinos[indice] = destino;
    return { ...m, partes: { destinos }, isManual: true };
  });
}

/** Partir de una las columnas que YA se ven compuestas al leer el archivo. */
export function dividirLasCompuestas(mappings: ColumnMapping[], rawRows: ParsedRow[]): ColumnMapping[] {
  let salida = mappings;
  for (const m of mappings) {
    const deteccion = detectarColumnaCompuesta(valoresDe(rawRows, m.sourceColumn));
    if (!deteccion) continue;
    /*
     * Se parte sola sólo donde lo que hay a cada lado es SEGURO:
     *  · el encabezado ya dijo «dirección» o «propietario»;
     *  · o la columna no tiene campo pero la derecha es una dirección (tiene
     *    vía: CR, CL, CALLE…) y ninguna otra columna es la dirección — es
     *    «Propiedad» del archivo real de contratos: «3 - CR 50 127 SUR 61».
     * Una columna sin campo con «[1] 71211270 - FRAN…» NO se parte sola:
     * puede ser el inquilino, y mandarlo a «propietario» sería un dato
     * equivocado con cara de correcto. Ahí la pantalla ofrece partirla y la
     * persona dice qué es.
     */
    const derechaEsDireccion = pareceDireccion(deteccion.ejemplo.derecha);
    const otraEsLaDireccion = salida.some(
      (x) => x.sourceColumn !== m.sourceColumn && destinosDe(x).includes('propertyAddress'),
    );
    // Las celdas mandan sobre el encabezado: «Propiedad» cae por palabra clave
    // en «Tipo de inmueble», pero «3 - CR 50 127 SUR 61» es una dirección con
    // código, y eso no se discute.
    const esLaDireccion = derechaEsDireccion && !otraEsLaDireccion && m.targetField !== 'ownerName';
    const esSegura = esLaDireccion || m.targetField === 'propertyAddress' || m.targetField === 'ownerName';
    if (!esSegura) continue;
    if (esLaDireccion) {
      salida = salida.map((x) => {
        if (x.sourceColumn === m.sourceColumn) return { ...x, targetField: 'propertyAddress' };
        // Un «Consecutivo» es el número de fila del archivo, no el código del
        // inmueble (Nico, 2026-09-10): si se había llevado el código por
        // palabra clave, lo suelta — el código de verdad viene en la celda.
        if (!x.isManual && x.targetField === 'externalId' && /consecutivo/i.test(x.sourceColumn)) {
          return { ...x, targetField: null, confidence: 0 };
        }
        return x;
      });
    }
    salida = dividirColumna(salida, m.sourceColumn, deteccion.ejemplo).map((x) =>
      x.sourceColumn === m.sourceColumn ? { ...x, isManual: false, confidence: 0.95 } : x,
    );
  }
  return salida;
}

/** Al propietario le llega el documento limpio: «1.026.148.652» → «1026148652». */
export function normalizarParte(destino: string | null, valor: string): string {
  if (destino === 'ownerDocument') return valor.replace(/[.\s]/g, '').toUpperCase();
  return valor.trim();
}

const SENAS_DE_CONTRATOS = [
  'inquilino', 'arrendatario', 'fecha inicio', 'fecha de inicio', 'fecha fin', 'fecha de fin',
  'dia de pago', 'periodicidad', 'canon total', 'fecha de terminacion', 'fecha terminacion',
];

/** ¿Estos encabezados son los de un archivo de CONTRATOS, no de inmuebles? */
export function pareceArchivoDeContratos(headers: string[]): string[] {
  const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const senas = headers.filter((h) => SENAS_DE_CONTRATOS.some((s) => normalizar(h).includes(s)));
  return senas.length >= 2 ? senas : [];
}
