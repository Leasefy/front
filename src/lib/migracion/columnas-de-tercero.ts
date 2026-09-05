/**
 * columnas-de-tercero — mapear los encabezados del Excel de la inmobiliaria
 * contra las columnas que el back espera.
 *
 * ── El diccionario NO vive acá ──────────────────────────────────────────────
 *
 * Los sinónimos («Cédula», «C.C.», «Nro documento» son la misma columna) los
 * declara el back en `plantillas-terceros.ts` y los sirve
 * `GET /inmobiliaria/migracion-terceros/plantilla?tipo=…`. Este módulo sólo
 * aplica esa lista. Es a propósito: la descarga de la plantilla vacía y el
 * mapeo del archivo ajeno son las dos superficies que tienen que estar de
 * acuerdo, y si cada una tuviera su lista, el día que se agregue una columna
 * una de las dos se queda vieja — el archivo trae el dato y el back nunca lo
 * ve, sin un solo error.
 *
 * ── Dos pasadas, y por qué ──────────────────────────────────────────────────
 *
 * 1. **Exacta.** La misma regla que el back usa en `columnaDeEncabezado()`:
 *    normalizar y comparar por igualdad contra título, campo y alias.
 * 2. **Por contención, gana el alias más largo.** Un archivo real dice
 *    «NOMBRE DEL PROPIETARIO», no «Nombre completo». Sin esta pasada, casi
 *    todo queda sin mapear y la persona remapea catorce columnas a mano.
 *
 * La segunda pasada es la que se equivoca, así que se marca distinto
 * (`exacto: false`) y la pantalla lo dice: «se parece a…» no es lo mismo que
 * «coincide con…». El auto-mapeo se equivoca con confianza alta —«Celular
 * arrendatario» ya terminó guardado como teléfono del propietario en el
 * importador de contratos— y un mapeo sin explicación sólo se puede aceptar o
 * rechazar entero.
 *
 * «Gana el más largo» es lo que evita el caso obvio: «Titular de la cuenta»
 * contiene tanto `titular` como `cuenta`, y sin la regla se lo quedaría el
 * número de cuenta.
 */

import {
  CLAVES_DE_FILA,
  type ColumnaDePlantilla,
  type FilaTercero,
  filaDePlantilla,
} from '@/lib/api/migracion-terceros.service';

/**
 * Sin tildes, sin puntuación, minúsculas.
 *
 * 🔴 Copia exacta de `normalizarEncabezado()` en
 * `back-erp/src/inmobiliaria/migracion-terceros/plantillas-terceros.ts`. Si
 * las dos se separan, el front mapea una columna que el back no reconocería
 * (o al revés) y nadie se entera hasta que falta un dato.
 */
export function normalizarEncabezado(encabezado: string): string {
  return encabezado
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface MapeoDeColumna {
  /** El encabezado tal como venía en el archivo. Se muestra sin tocar. */
  columna: string;
  /** `ColumnaDePlantilla.campo`, o `null` si se ignora. */
  campo: string | null;
  /** Con qué término empató. Vacío cuando no empató nada o es manual. */
  porque: string;
  /** `false` = empató por contención, no por igualdad. Se muestra distinto. */
  exacto: boolean;
  /** La persona lo eligió a mano. */
  isManual?: boolean;
}

/** Los términos con los que se puede reconocer una columna, sin repetir. */
function terminosDe(columna: ColumnaDePlantilla): string[] {
  const todos = [columna.titulo, columna.campo, ...columna.alias].map(normalizarEncabezado);
  return [...new Set(todos)].filter(Boolean);
}

/**
 * Un alias de menos de 4 letras no se busca por contención: `cc`, `nit` o
 * `tel` aparecen dentro de palabras que no tienen nada que ver («direccion»
 * contiene «cc»). En la pasada exacta sí valen, porque ahí la columna se
 * llama así y punto.
 */
const LARGO_MINIMO_PARA_CONTENER = 4;

/**
 * Mapea los encabezados del archivo contra la plantilla del back.
 *
 * Un campo se llena UNA vez: si el archivo trae dos columnas parecidas, la
 * segunda queda sin mapear en vez de pisar a la primera en silencio.
 */
export function mapearColumnas(
  columnas: readonly ColumnaDePlantilla[],
  encabezados: string[],
): MapeoDeColumna[] {
  const usados = new Set<string>();
  const mapeo: MapeoDeColumna[] = encabezados.map((columna) => ({
    columna,
    campo: null,
    porque: '',
    exacto: false,
  }));

  // ── Pasada 1: igualdad. Es la regla del back, y no se equivoca. ──────────
  // También sin espacios, como `columnaDeEncabezado()` del back: «C.C.»
  // normaliza a «c c» y el alias es «cc»; «NroCuenta» queda «nrocuenta».
  mapeo.forEach((m, i) => {
    const n = normalizarEncabezado(encabezados[i]);
    if (!n) return;
    const compacto = n.replace(/ /g, '');
    for (const exigirExacto of [true, false]) {
      for (const columna of columnas) {
        if (usados.has(columna.campo)) continue;
        const termino = terminosDe(columna).find((t) =>
          exigirExacto ? t === n : t.replace(/ /g, '') === compacto,
        );
        if (termino) {
          usados.add(columna.campo);
          m.campo = columna.campo;
          m.porque = termino;
          m.exacto = true;
          return;
        }
      }
    }
  });

  // ── Pasada 2: contención, gana el alias más largo. ───────────────────────
  mapeo.forEach((m, i) => {
    if (m.campo) return;
    const n = normalizarEncabezado(encabezados[i]);
    if (!n) return;

    let mejor: { campo: string; termino: string } | null = null;
    for (const columna of columnas) {
      if (usados.has(columna.campo)) continue;
      for (const termino of terminosDe(columna)) {
        if (termino.length < LARGO_MINIMO_PARA_CONTENER) continue;
        if (!n.includes(termino)) continue;
        if (!mejor || termino.length > mejor.termino.length) {
          mejor = { campo: columna.campo, termino };
        }
      }
    }
    if (mejor) {
      usados.add(mejor.campo);
      m.campo = mejor.campo;
      m.porque = mejor.termino;
      m.exacto = false;
    }
  });

  return mapeo;
}

/**
 * Cambia UNA columna a mano.
 *
 * Si el campo elegido ya lo reclamaba otra columna, esa otra lo pierde: dos
 * columnas apuntando al mismo campo pisarían el dato en silencio, igual que
 * en el auto-mapeo.
 */
export function remapear(
  mapeo: MapeoDeColumna[],
  columna: string,
  campo: string | null,
): MapeoDeColumna[] {
  return mapeo.map((m) => {
    if (m.columna === columna) {
      return { columna, campo, porque: '', exacto: false, isManual: true };
    }
    if (campo && m.campo === campo) {
      return { ...m, campo: null, porque: '', exacto: false, isManual: true };
    }
    return m;
  });
}

/**
 * Las columnas OBLIGATORIAS que ninguna del archivo llena.
 *
 * Informativo, no bloquea: cualquier archivo tiene que poder llegar a la lista
 * de trabajo. Lo que falte se completa fila por fila, sin volver a subir nada.
 */
export function obligatoriasSinMapear(
  columnas: readonly ColumnaDePlantilla[],
  mapeo: MapeoDeColumna[],
): ColumnaDePlantilla[] {
  const mapeados = new Set(mapeo.map((m) => m.campo).filter(Boolean));
  return columnas.filter((c) => c.obligatoria && !mapeados.has(c.campo));
}

/**
 * Columnas que el back declara y este front no sabe mandar.
 *
 * Siempre debería estar vacío. Si no lo está, el back agregó una columna y
 * `CLAVES_DE_FILA` quedó vieja: mandarla igual sería un 400 con el archivo
 * entero adentro (`forbidNonWhitelisted`), y filtrarla en silencio sería
 * perder el dato. Se dice en pantalla, que es la única salida honesta.
 */
export function columnasNoSoportadas(
  columnas: readonly ColumnaDePlantilla[],
): ColumnaDePlantilla[] {
  const conocidas = new Set<string>(CLAVES_DE_FILA);
  return columnas.filter((c) => !conocidas.has(c.campo));
}

/**
 * Arma la fila que viaja al back a partir de una fila del archivo y el mapeo.
 *
 * Lo que no se mapeó viaja ausente, NUNCA un default inventado. Un tipo de
 * documento vacío no se cae a `CC`: el tipo de persona sale del documento
 * (NIT ⇒ jurídica) y de ahí sale el perfil tributario. Dar CC por sentado
 * convierte a una inmobiliaria en persona natural y le deja de retener lo que
 * había que retenerle.
 */
export function armarFila(
  fila: Record<string, unknown>,
  mapeo: MapeoDeColumna[],
): FilaTercero {
  const cruda: Record<string, unknown> = {};
  for (const m of mapeo) {
    if (!m.campo) continue;
    cruda[m.campo] = fila[m.columna];
  }
  return filaDePlantilla(cruda);
}

/**
 * Un nombre de lote que la persona pueda reconocer mañana.
 *
 * El back rechaza reusarlo (409), así que la fecha va adentro: dos cargas de
 * propietarios el mismo día se distinguen por la hora. `@MaxLength(60)`.
 *
 * 🔴 La hora es la de BOGOTÁ, no la UTC. Con `toISOString()` una carga hecha a
 * las 09:02 de la mañana se llamaba «propietarios-2026-09-05-1402» (auditoría
 * 2026-09-05): el nombre existe justamente para que la persona reconozca su
 * archivo, y una hora que no es la de su reloj no reconoce nada. Cerca de
 * medianoche además cambiaba el DÍA.
 *
 * `Intl` y no un `-5` a mano: restar cinco horas es reimplementar una zona
 * horaria, y es el mismo criterio de `src/lib/recaudo/meses.ts`.
 */
const RELOJ_DE_BOGOTA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function nombreDeLoteSugerido(tipo: 'PROPIETARIO' | 'INQUILINO', ahora = new Date()): string {
  const base = tipo === 'PROPIETARIO' ? 'propietarios' : 'inquilinos';
  const partes = new Map(
    RELOJ_DE_BOGOTA.formatToParts(ahora).map((p) => [p.type, p.value] as const),
  );
  // `hour12: false` puede dar «24» a la medianoche en algunos motores.
  const hora = partes.get('hour') === '24' ? '00' : (partes.get('hour') ?? '00');
  const sello =
    `${partes.get('year')}-${partes.get('month')}-${partes.get('day')}` +
    `-${hora}${partes.get('minute')}`;
  return `${base}-${sello}`.slice(0, 60);
}
