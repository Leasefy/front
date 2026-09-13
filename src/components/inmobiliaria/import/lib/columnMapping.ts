// src/components/inmobiliaria/import/lib/columnMapping.ts
// Heuristic column matcher: Tier 1 keyword dictionary + Tier 2 Levenshtein distance

import type { ColumnMapping, ParsedRow } from './importTypes';
import { dividirLasCompuestas } from './columnaCompuesta';

/**
 * Keyword dictionary for Tier 1 exact substring matching.
 * Keys are Leasefy target field names; values are Spanish/English keywords.
 */
/**
 * Keywords ordered by specificity — longer/more specific phrases first.
 * The matcher checks in order, so "tipo inmueble" matches propertyType before
 * "inmueble" could match propertyTitle.
 */
export const COLUMN_KEYWORDS: Record<string, string[]> = {
  /*
   * El «Código» del sistema viejo (Nico, 2026-09-08: «el más importante es el
   * de ID (Código): así identifican las inmobiliarias el inmueble y con ese id
   * lo identifican en el contrato»). Va a `Property.externalId` y es la llave
   * con la que después se cruzan los contratos.
   *
   * 🔴 Hasta hoy `codigo`, `referencia` y `consecutivo` estaban BLOQUEADOS en
   * `ENCABEZADOS_SIN_CAMPO` «porque el código lo asigna el servidor». Eso sigue
   * siendo cierto para el consecutivo de Leasefy — y es OTRO número: éste es el
   * del sistema del que se migra, y sin él el archivo real entraba con su
   * columna más importante sin mapear.
   */
  externalId:       ['codigo del inmueble', 'codigo inmueble', 'codigo de la propiedad', 'codigo propiedad', 'id del inmueble', 'id inmueble', 'codigo', 'referencia', 'consecutivo', 'ref', 'cod', 'id'],
  propertyType:     ['tipo inmueble', 'tipo de inmueble', 'tipo propiedad', 'clase inmueble', 'clase de inmueble', 'tipo', 'clase', 'type'],
  propertyTitle:    ['titulo', 'nombre propiedad', 'descripcion corta', 'nombre'],
  propertyAddress:  ['direccion del inmueble', 'direccion inmueble', 'direccion', 'address', 'ubicacion', 'calle', 'dir'],
  propertyCity:     ['ciudad', 'municipio', 'city'],
  // `urbanizacion` SALIÓ de acá: es su propia columna en el archivo real
  // («Barrio» y «Urbanización» vienen juntas, 460 filas traen las dos) y
  // dejarla como sinónimo de barrio hacía que una de las dos se perdiera en el
  // dedup, sin decirlo.
  propertyZone:     ['barrio', 'zona', 'sector', 'localidad', 'vecindario', 'comuna'],
  urbanizacion:     ['urbanizacion', 'unidad residencial', 'conjunto residencial', 'conjunto cerrado', 'conjunto', 'edificio', 'torre'],
  /** El estrato viene en PALABRAS («Tres», «No Estratificada»): lo lee `estratoDePalabras`. */
  stratum:          ['estrato del inmueble', 'estrato de la propiedad', 'estrato propiedad', 'estrato', 'stratum'],
  /** Dónde están las llaves. Informativo, va a la descripción del inmueble. */
  llavesEn:         ['llaves en', 'ubicacion de las llaves', 'ubicacion de llaves', 'donde estan las llaves', 'llaves'],
  /** Quién cargó el inmueble en el sistema viejo. Informativo. */
  creadaPor:        ['creada por', 'creado por', 'usuario que creo', 'registrado por', 'creada'],
  // T-0038 §3.2.1 — the department (not the municipality/city). Kept
  // distinct from propertyCity's 'municipio'/'ciudad'.
  propertyDepartment: ['departamento del inmueble', 'departamento de la propiedad', 'departamento'],
  // T-0038 §3.2.2 (D2) — "tipo de negocio"/"tipo negocio" used to be
  // blocked (ENCABEZADOS_SIN_CAMPO): Arriendo/Venta has a home now.
  // Keywords are longer than propertyType's generic 'tipo' (4 chars) so
  // tier1's max-score-wins comparison always prefers this field for them.
  // `servicio` es el encabezado del archivo real (valores: «Arriendo»,
  // «Venta», «Venta y Arriendo»). Es genérico, así que «Servicios públicos» —
  // el falso positivo obvio— queda bloqueado en ENCABEZADOS_SIN_CAMPO.
  listingType:      ['tipo de negocio', 'tipo negocio', 'tipo de operacion', 'tipo operacion', 'arriendo o venta', 'renta o venta', 'tipo de servicio', 'servicio'],
  monthlyRent:      ['canon de arrendamiento', 'canon arrendamiento', 'valor del arriendo', 'canon mensual', 'valor arriendo', 'valor canon', 'renta mensual', 'arrendamiento', 'canon', 'arriendo', 'precio', 'alquiler', 'renta', 'mensual', 'rent'],
  // T-0038 §3.2.3 — kept strictly more specific than monthlyRent's generic
  // 'precio' so a bare "Precio" still degrades to monthlyRent (§3.2.2: an
  // absent/ambiguous listingType degrades to RENT) and only an explicit
  // "…de venta"/"…venta" header goes to salePrice.
  salePrice:        ['precio de venta', 'precio venta', 'valor de venta', 'valor venta'],
  adminFee:         ['cuota de administracion', 'valor administracion', 'administracion mensual', 'administracion', 'admin', 'cuota admin', 'copropiedad', 'cuota'],
  commissionPercent:['porcentaje de comision', 'comision', 'fee', 'honorario', 'honorarios', 'porcentaje'],
  propertyArea:     ['area construida', 'area privada', 'metros cuadrados', 'area m2', 'area', 'metros', 'mts2', 'mts', 'm2', 'superficie', 'tamano'],
  bedrooms:         ['numero de habitaciones', 'alcobas', 'habitaciones', 'cuartos', 'dormitorios', 'hab', 'recamaras', 'bedrooms'],
  bathrooms:        ['numero de banos', 'banos', 'bano', 'bathrooms', 'wc'],
  ownerName:        ['nombre del propietario', 'nombre propietario', 'propietario', 'arrendador', 'dueno', 'owner'],
  // Más específico que ownerName ('propietario', 11) y que cualquier 'documento'
  // suelto: la cédula del dueño resuelve la ficha sin adivinar por nombre.
  ownerDocument:    ['cedula del propietario', 'documento del propietario', 'nit del propietario', 'cedula propietario', 'documento propietario', 'nit propietario', 'cc propietario', 'identificacion del propietario', 'identificacion propietario', 'cedula del arrendador', 'documento del arrendador'],
  // OJO: el nivel 1 gana por LONGITUD de la palabra clave, así que cualquier
  // variante «<algo> propietario» tiene que ser MÁS LARGA que 'propietario'
  // (11) o el teléfono termina en el campo del nombre. Pasó con
  // «Movil propietario»: 'propietario' (11) le ganaba a 'movil' (5).
  // «Teléfonos Propietario» (en plural, el encabezado del archivo real) NO
  // contiene «telefono propietario»: el plural rompe la subcadena y
  // 'propietario' (11) le ganaba, así que los teléfonos entraban en el NOMBRE
  // del dueño. Por eso las variantes en plural están escritas aparte.
  ownerPhone:       ['telefonos del propietario', 'telefono del propietario', 'whatsapp del propietario', 'celular del propietario', 'contacto del propietario', 'whatsapp propietario', 'telefonos propietario', 'telefono propietario', 'celulares propietario', 'celular propietario', 'contacto propietario', 'telefonos arrendador', 'telefono arrendador', 'celular arrendador', 'telefono del dueno', 'numero propietario', 'movil propietario', 'tel propietario', 'telefonos', 'telefono', 'whatsapp', 'celular', 'movil', 'tel', 'phone'],
  status:           ['estado del inmueble', 'estado', 'status', 'disponibilidad'],
  notes:            ['observaciones', 'observacion', 'notas', 'comentarios', 'descripcion', 'notes'],
  // T-0038 §3.2.6 (D5, R6) — property-level "fecha de consignación",
  // agency-only. Distinct from any mandate/contract date field (none of
  // which this importer maps today).
  // «Fecha Creación» del sistema viejo es cuándo se cargó el inmueble allá:
  // es la consignación de esa ficha, y es el único dato de fecha que trae el
  // archivo real. Va acá, no a un campo nuevo.
  consignedAt:      ['fecha de consignacion', 'fecha consignacion', 'fecha de creacion', 'fecha creacion', 'fecha de alta', 'consignacion'],
};

/**
 * Encabezados que NO tienen campo nuestro, y que por eso NUNCA se mapean solos.
 *
 * Sin esta lista el matcher los asigna igual, porque el nivel 2 (Levenshtein,
 * umbral 0.5) siempre encuentra «algo parecido». Medido con encabezados reales
 * del mercado colombiano ANTES de escribirla:
 *
 *   Celular arrendatario  →  ownerPhone    (0.92, marcado «DETECTADO»)
 *   Arrendatario          →  propertyZone  (0.50)
 *   Estrato               →  status        (0.71)
 *   Tipo de negocio       →  propertyType  (0.92)
 *
 * El primero es el grave: el teléfono del INQUILINO entrando como el del
 * propietario, con la confianza más alta que el sistema sabe dar, así que
 * nadie lo revisa. Un campo vacío se nota; uno lleno con el dato de otra
 * persona, no.
 *
 * Ojo con «arrendador» (el propietario) y «arrendatario» (el inquilino): se
 * diferencian en dos letras y significan lo contrario. Por eso `arrendador` sí
 * es palabra clave de ownerName y `arrendatario` se bloquea acá — el bloqueo
 * se evalúa PRIMERO y, como `arrendatario` no contiene `arrendador`, no se
 * pisan.
 */
export const ENCABEZADOS_SIN_CAMPO = [
  // Personas que no son el propietario.
  'arrendatario', 'inquilino', 'codeudor', 'deudor solidario', 'fiador',
  // Datos del inmueble que la importación no guarda.
  // «Estrato» salió de esta lista: hoy tiene campo (`stratum`) y el archivo
  // real lo trae en las 2.894 filas.
  'matricula inmobiliaria', 'matricula', 'chip catastral', 'referencia catastral',
  // Identificadores que NO son el código del inmueble. «Código», «Referencia»
  // y «Consecutivo» dejaron de estar bloqueados —son `externalId`— así que las
  // dos columnas que se les parecen y no lo son se nombran acá.
  'codigo postal', 'codigo catastral', 'servicios publicos',
  // No hay campo de correo en la importación. Sin bloquearlo,
  // «Correo propietario» caía en ownerName por el mismo problema de longitud.
  'correo', 'email', 'e-mail',
  // Medido en la auditoría 2026-09-01, con encabezados reales:
  //   «Dirección de notificación del propietario» → ownerName ('propietario', 11)
  //   «Garantía» → monthlyRent (Levenshtein 0.5+)
  //   «Fecha de inicio» → consignedAt (0.59) — la fecha del CONTRATO entrando
  //     como fecha de consignación del inmueble, en silencio.
  // Nada de esto tiene campo acá: mejor sin mapear que mapeado a otra cosa.
  'notificacion', 'deposito', 'garantia', 'fianza', 'poliza', 'aseguradora',
  'fecha de inicio', 'fecha inicio', 'inicio del contrato', 'inicio contrato',
  'fecha fin', 'fecha de fin', 'fin del contrato', 'fin contrato',
  'vencimiento', 'duracion',
  // T-0038 §3.8: "tipo de negocio"/"tipo negocio" ya NO están bloqueados —
  // tienen destino en `listingType` (ver COLUMN_KEYWORDS). "codigo" queda
  // bloqueado a propósito: el código es asignado por el servidor
  // (contract.md §3.2.5) y nunca se acepta en la escritura.
];

/**
 * Normalize a string for comparison:
 * - Lowercase
 * - Strip diacritics (NFD decomposition)
 * - Trim whitespace
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Standard dynamic programming Levenshtein distance.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Un alias de 3 letras o menos («id», «ref», «cod», «tel», «hab», «dir», «m2»)
 * NO se busca por subcadena: aparece dentro de palabras que no tienen nada que
 * ver. «Ciudad» contiene «id», «Unidad» también, y con `id` como alias del
 * código del inmueble eso mandaba la ciudad al identificador.
 *
 * Con la columna llamada así y punto («Id», «Cod.», «N° Hab») sí vale, así que
 * la regla es palabra completa, no igualdad: es estrictamente más estricta que
 * `includes` y no le quita nada a los alias largos.
 */
const LARGO_MINIMO_PARA_SUBCADENA = 4;

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contieneAlias(normalizedHeader: string, normKeyword: string): boolean {
  if (normKeyword.length >= LARGO_MINIMO_PARA_SUBCADENA) {
    return normalizedHeader.includes(normKeyword);
  }
  return new RegExp(`(?<![a-z0-9])${escaparRegex(normKeyword)}(?![a-z0-9])`).test(normalizedHeader);
}

/**
 * Try Tier 1: keyword exact substring match.
 * Returns { targetField, confidence } or null if no match.
 */
function tier1Match(normalizedHeader: string): { targetField: string; confidence: number } | null {
  // Collect ALL matches, prefer forward matches (header contains keyword) over reverse
  let bestField: string | null = null;
  let bestScore = 0;

  for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    for (const keyword of keywords) {
      const normKeyword = normalize(keyword);
      const forwardMatch = contieneAlias(normalizedHeader, normKeyword);
      const reverseMatch = normKeyword.includes(normalizedHeader);

      if (forwardMatch) {
        // Forward match: header contains keyword — strong signal, score by keyword length
        const score = 1000 + normKeyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      } else if (reverseMatch && normalizedHeader.length >= normKeyword.length * 0.6) {
        // Reverse match: keyword contains header — weaker, only when header is substantial
        const score = normKeyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
    }
  }

  if (bestField) {
    return { targetField: bestField, confidence: 0.92 };
  }
  return null;
}

/**
 * Try Tier 2: Levenshtein distance against all keywords.
 * Returns { targetField, confidence } or null if no match above threshold.
 */
function tier2Match(normalizedHeader: string): { targetField: string; confidence: number } | null {
  const THRESHOLD = 0.5;
  let bestField: string | null = null;
  let bestConfidence = 0;

  for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    for (const keyword of keywords) {
      const normKeyword = normalize(keyword);
      const maxLen = Math.max(normalizedHeader.length, normKeyword.length);
      if (maxLen === 0) continue;
      const dist = levenshteinDistance(normalizedHeader, normKeyword);
      const confidence = 1 - dist / maxLen;
      if (confidence >= THRESHOLD && confidence > bestConfidence) {
        bestConfidence = confidence;
        bestField = field;
      }
    }
  }

  if (bestField) {
    // Cap tier 2 confidence below tier 1 threshold
    const cappedConfidence = Math.min(bestConfidence, 0.89);
    return { targetField: bestField, confidence: cappedConfidence };
  }

  return null;
}

/**
 * Auto-map an array of column headers to Leasefy target fields.
 *
 * Rules:
 * - Tier 1 (keyword substring match): confidence 0.9+
 * - Tier 2 (Levenshtein): confidence 0.5–0.89
 * - No match: targetField null, confidence 0
 * - Deduplication: if two headers map to same targetField, keep the higher-confidence one
 */
export function autoMapColumns(headers: string[], rawRows: ParsedRow[] = []): ColumnMapping[] {
  // First pass: score each header
  const results: ColumnMapping[] = headers.map((header) => {
    const normalized = normalize(header);

    // Nivel 0 — el bloqueo va PRIMERO. Para estos encabezados no tenemos
    // campo, y dejarlos llegar a Levenshtein produce asignaciones seguras de
    // sí mismas y equivocadas (ver ENCABEZADOS_SIN_CAMPO). Sin campo es un
    // resultado válido: la persona lo mapea a mano si quiere.
    if (ENCABEZADOS_SIN_CAMPO.some((termino) => normalized.includes(termino))) {
      return { sourceColumn: header, targetField: null, confidence: 0, isManual: false };
    }

    const tier1 = tier1Match(normalized);
    if (tier1) {
      return {
        sourceColumn: header,
        targetField: tier1.targetField,
        confidence: tier1.confidence,
        isManual: false,
      };
    }
    const tier2 = tier2Match(normalized);
    if (tier2) {
      return {
        sourceColumn: header,
        targetField: tier2.targetField,
        confidence: tier2.confidence,
        isManual: false,
      };
    }
    return {
      sourceColumn: header,
      targetField: null,
      confidence: 0,
      isManual: false,
    };
  });

  // Deduplication pass: for each targetField, keep only the highest confidence mapping
  const fieldToIndex = new Map<string, number>();

  for (let i = 0; i < results.length; i++) {
    const { targetField, confidence } = results[i];
    if (!targetField) continue;

    if (fieldToIndex.has(targetField)) {
      const existingIndex = fieldToIndex.get(targetField)!;
      if (confidence > results[existingIndex].confidence) {
        // Current one is better — nullify the existing one
        results[existingIndex] = {
          ...results[existingIndex],
          targetField: null,
          confidence: 0,
        };
        fieldToIndex.set(targetField, i);
      } else {
        // Existing one is better — nullify current
        results[i] = {
          ...results[i],
          targetField: null,
          confidence: 0,
        };
      }
    } else {
      fieldToIndex.set(targetField, i);
    }
  }

  // Las columnas que traen dos datos en la celda («3 - CR 50 127 SUR 61») se
  // parten de una: el código es la llave con la que los contratos encuentran
  // el inmueble, y dejarlo pegado a la dirección lo perdía.
  return rawRows.length > 0 ? dividirLasCompuestas(results, rawRows) : results;
}

export type { ColumnMapping };
