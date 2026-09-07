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
 *
 * ── El nombre en partes ─────────────────────────────────────────────────────
 *
 * Los sistemas viejos parten el nombre: «Primer Nombre», «Segundo Nombre»,
 * «Primer Apellido», «Segundo Apellido» (Terceros.csv), o «Nombres» y
 * «Apellidos». El back recibe UN `nombre` —y de ahí saca nombres y apellidos
 * con `partirNombre`—, así que acá se arma: se reconocen esas columnas como
 * PARTES (`MapeoDeColumna.parte`), no como el campo `nombre`, y `armarFila`
 * las pega en orden cuando la fila no trae un nombre completo propio. Sin
 * esto, «Primer Nombre» empataba `nombre` por contención y el propietario
 * entraba llamándose «MARIA» (Nico, 2026-09-07: «es muy raro que ellos
 * identifiquen nombre, segundo nombre… y nosotros solo nombre completo»).
 *
 * «Nombre» solo, sin ninguna columna de apellidos al lado, sigue siendo el
 * nombre completo: es el alias de siempre.
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

/** Las partes en que un sistema viejo suele traer el nombre, en el orden en que se pegan. */
export const PARTES_DEL_NOMBRE = [
  'primerNombre',
  'segundoNombre',
  'primerApellido',
  'segundoApellido',
  'nombres',
  'apellidos',
] as const;

export type ParteDelNombre = (typeof PARTES_DEL_NOMBRE)[number];

export const ETIQUETA_DE_PARTE: Record<ParteDelNombre, string> = {
  primerNombre: 'primer nombre',
  segundoNombre: 'segundo nombre',
  primerApellido: 'primer apellido',
  segundoApellido: 'segundo apellido',
  nombres: 'nombres',
  apellidos: 'apellidos',
};

/**
 * Cómo viaja una parte en el `<select>` del mapeo, para no chocar con un
 * campo de la plantilla: `nombre:primerNombre`.
 */
export const VALOR_DE_PARTE = 'nombre:';

export function valorDeParte(parte: ParteDelNombre): string {
  return `${VALOR_DE_PARTE}${parte}`;
}

/**
 * Una columna que no tiene campo pero que no se puede tirar («Otro Teléfono»,
 * «Representante Legal»): se agrega a las notas de la ficha como
 * «Columna: valor». En el archivo real 185 filas traían un segundo teléfono
 * y 10 un representante legal, y se perdían (2026-09-07).
 */
export const VALOR_A_NOTAS = 'notas:+';

/** Encabezados que van solos a las notas cuando no mapearon a nada. */
const A_NOTAS_SOLAS = [/^(otro|segundo|2do) tel/, /tel(efono)? 2$/, /^representante legal/];

export function parteDeValor(valor: string | null): ParteDelNombre | null {
  if (!valor || !valor.startsWith(VALOR_DE_PARTE)) return null;
  const parte = valor.slice(VALOR_DE_PARTE.length);
  return (PARTES_DEL_NOMBRE as readonly string[]).includes(parte) ? (parte as ParteDelNombre) : null;
}

/*
 * Los encabezados normalizados con los que se reconoce cada parte. Las cuatro
 * primeras por contención («Primer Nombre/Razón Social» contiene «primer
 * nombre»); «nombres»/«apellidos» sólo por igualdad, y sólo si la otra mitad
 * también está: un archivo con «Nombre» y nada de apellidos trae el nombre
 * completo en esa columna.
 */
const TERMINOS_DE_PARTE: Record<ParteDelNombre, readonly string[]> = {
  primerNombre: ['primer nombre', '1er nombre', 'nombre 1', 'nombre1'],
  segundoNombre: ['segundo nombre', '2do nombre', 'nombre 2', 'nombre2', 'otros nombres'],
  primerApellido: ['primer apellido', '1er apellido', 'apellido 1', 'apellido1'],
  segundoApellido: ['segundo apellido', '2do apellido', 'apellido 2', 'apellido2'],
  nombres: ['nombres', 'nombre'],
  apellidos: ['apellidos', 'apellido'],
};

const PARTES_DE_NOMBRES: readonly ParteDelNombre[] = ['primerNombre', 'segundoNombre', 'nombres'];
const PARTES_DE_APELLIDOS: readonly ParteDelNombre[] = ['primerApellido', 'segundoApellido', 'apellidos'];

/**
 * Un encabezado que es claramente UNA parte («Primer Nombre», «Apellido 2»)
 * nunca se lleva el campo `nombre` por contención, aunque el archivo no
 * traiga la otra mitad y no se pueda armar nada: mejor «falta Nombre
 * completo» que un propietario llamado «MARIA». «Nombre»/«Nombres» solos no
 * cuentan: ésos sí son el nombre completo.
 */
function esParteNumerada(encabezadoNormalizado: string): boolean {
  return (['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'] as const).some((p) =>
    TERMINOS_DE_PARTE[p].some((t) => encabezadoNormalizado.includes(t)),
  );
}

/**
 * Qué columna del archivo es qué parte del nombre. Vacío si el archivo no
 * trae el nombre partido (o trae sólo una mitad: con eso no se arma nada).
 */
export function partesDelNombre(encabezados: string[]): Map<number, { parte: ParteDelNombre; termino: string }> {
  const normalizados = encabezados.map(normalizarEncabezado);
  const halladas = new Map<number, { parte: ParteDelNombre; termino: string }>();
  const tomadas = new Set<ParteDelNombre>();

  // Primero las partes numeradas, por contención.
  for (const parte of ['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'] as const) {
    normalizados.forEach((n, i) => {
      if (tomadas.has(parte) || halladas.has(i) || !n) return;
      const termino = TERMINOS_DE_PARTE[parte].find((t) => n.includes(t));
      if (termino) {
        halladas.set(i, { parte, termino });
        tomadas.add(parte);
      }
    });
  }
  // Después «Nombres»/«Apellidos», por igualdad, sólo si esa mitad no vino numerada.
  for (const parte of ['nombres', 'apellidos'] as const) {
    const mitad = parte === 'nombres' ? PARTES_DE_NOMBRES : PARTES_DE_APELLIDOS;
    if (mitad.some((p) => tomadas.has(p))) continue;
    const i = normalizados.findIndex((n, idx) => !halladas.has(idx) && TERMINOS_DE_PARTE[parte].includes(n));
    if (i !== -1) {
      halladas.set(i, { parte, termino: normalizados[i] });
      tomadas.add(parte);
    }
  }

  const hayNombres = PARTES_DE_NOMBRES.some((p) => tomadas.has(p));
  const hayApellidos = PARTES_DE_APELLIDOS.some((p) => tomadas.has(p));
  return hayNombres && hayApellidos ? halladas : new Map();
}

export interface MapeoDeColumna {
  /** El encabezado tal como venía en el archivo. Se muestra sin tocar. */
  columna: string;
  /** `ColumnaDePlantilla.campo`, o `null` si se ignora. */
  campo: string | null;
  /**
   * La parte del nombre que trae esta columna, cuando el archivo lo trae
   * partido. Excluyente con `campo`: `armarFila` pega las partes en el
   * campo `nombre`.
   */
  parte?: ParteDelNombre;
  /** Se agrega a las notas de la ficha como «Columna: valor». Excluyente con `campo`. */
  aNotas?: boolean;
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

  // ── Pasada 0: el nombre en partes. Va antes que todo porque «Nombres» es
  // un alias exacto de `nombre` y «Primer Nombre» lo contiene: sin esto, una
  // de esas columnas se queda con el campo y el nombre entra mocho. ────────
  for (const [i, { parte, termino }] of partesDelNombre(encabezados)) {
    mapeo[i].parte = parte;
    mapeo[i].porque = termino;
    mapeo[i].exacto = normalizarEncabezado(encabezados[i]) === termino;
  }

  // ── Pasada 1: igualdad. Es la regla del back, y no se equivoca. ──────────
  // También sin espacios, como `columnaDeEncabezado()` del back: «C.C.»
  // normaliza a «c c» y el alias es «cc»; «NroCuenta» queda «nrocuenta».
  mapeo.forEach((m, i) => {
    if (m.parte) return;
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

  // ── Pasada 2: contención, gana el alias más largo — ENTRE TODAS las
  // columnas, no en el orden del archivo. ───────────────────────────────────
  //
  // 🔴 Antes se resolvía columna por columna, de izquierda a derecha, y cada
  // una se quedaba con el mejor campo que quedara libre. Con el archivo real
  // de una inmobiliaria (Terceros.csv) «Primer Nombre/Razón Social» venía
  // ANTES que «Nombre Completo/Razón Social»: la primera empataba `nombre`
  // por «razon social» y la segunda —la buena— encontraba el campo tomado.
  // El propietario entraba llamándose «MARIA». (Nico, 2026-09-07.)
  //
  // Ahora se juntan todos los empates posibles y se asignan del término más
  // largo al más corto: «nombre completo» (15) le gana a «razon social» (12)
  // sin importar en qué columna del archivo esté cada uno.
  const candidatos: { i: number; campo: string; termino: string }[] = [];
  mapeo.forEach((m, i) => {
    if (m.campo || m.parte) return;
    const n = normalizarEncabezado(encabezados[i]);
    if (!n) return;
    for (const columna of columnas) {
      if (usados.has(columna.campo)) continue;
      if (columna.campo === 'nombre' && esParteNumerada(n)) continue;
      for (const termino of terminosDe(columna)) {
        if (termino.length < LARGO_MINIMO_PARA_CONTENER) continue;
        if (n.includes(termino)) candidatos.push({ i, campo: columna.campo, termino });
      }
    }
  });
  // Estable ante empates de largo: gana la columna que está más a la
  // izquierda, que es lo que hacía la versión anterior.
  candidatos.sort((a, b) => b.termino.length - a.termino.length || a.i - b.i);
  const columnasTomadas = new Set<number>();
  for (const c of candidatos) {
    if (usados.has(c.campo) || columnasTomadas.has(c.i)) continue;
    usados.add(c.campo);
    columnasTomadas.add(c.i);
    mapeo[c.i].campo = c.campo;
    mapeo[c.i].porque = c.termino;
    mapeo[c.i].exacto = false;
  }

  // ── Pasada 3: lo que no tiene campo pero no se tira, a las notas. ────────
  if (columnas.some((c) => c.campo === 'notas')) {
    mapeo.forEach((m, i) => {
      if (m.campo || m.parte) return;
      const n = normalizarEncabezado(encabezados[i]);
      if (n && A_NOTAS_SOLAS.some((re) => re.test(n))) {
        m.aNotas = true;
        m.porque = 'se agrega a las notas';
        m.exacto = true;
      }
    });
  }

  return mapeo;
}

/**
 * Cambia UNA columna a mano.
 *
 * Si el campo (o la parte del nombre) elegido ya lo reclamaba otra columna,
 * esa otra lo pierde: dos columnas apuntando al mismo campo pisarían el dato
 * en silencio, igual que en el auto-mapeo. `valor` es un campo de la
 * plantilla, un `nombre:<parte>` (ver `valorDeParte`) o `null` para ignorar.
 */
export function remapear(
  mapeo: MapeoDeColumna[],
  columna: string,
  valor: string | null,
): MapeoDeColumna[] {
  const parte = parteDeValor(valor);
  const aNotas = valor === VALOR_A_NOTAS;
  const campo = parte || aNotas ? null : valor;
  return mapeo.map((m) => {
    if (m.columna === columna) {
      return {
        columna,
        campo,
        ...(parte ? { parte } : {}),
        ...(aNotas ? { aNotas: true } : {}),
        porque: '',
        exacto: false,
        isManual: true,
      };
    }
    if ((campo && m.campo === campo) || (parte && m.parte === parte)) {
      const { parte: _parte, ...sinParte } = m;
      void _parte;
      return { ...sinParte, campo: null, porque: '', exacto: false, isManual: true };
    }
    return m;
  });
}

/** Si las partes mapeadas alcanzan para armar un nombre: una de nombres y una de apellidos. */
export function nombreSeArmaPorPartes(mapeo: MapeoDeColumna[]): boolean {
  const partes = new Set(mapeo.map((m) => m.parte).filter(Boolean));
  return (
    PARTES_DE_NOMBRES.some((p) => partes.has(p)) && PARTES_DE_APELLIDOS.some((p) => partes.has(p))
  );
}

/** Las columnas del archivo con las que se arma el nombre, en el orden en que se pegan. */
export function columnasDelNombrePorPartes(mapeo: MapeoDeColumna[]): string[] {
  return PARTES_DEL_NOMBRE.map((p) => mapeo.find((m) => m.parte === p)?.columna).filter(
    (c): c is string => Boolean(c),
  );
}

function celda(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor).replace(/\s+/g, ' ').trim();
}

/**
 * El nombre completo a partir de las partes de una fila.
 *
 * Nombres, después apellidos. Si vienen numerados («Primer Nombre», «Segundo
 * Nombre») se usan esos; si no, «Nombres». Igual con los apellidos. Una parte
 * vacía simplemente no está: «MARIA» + «» + «RUIZ» + «GOMEZ» es «MARIA RUIZ
 * GOMEZ», no «MARIA  RUIZ GOMEZ».
 */
export function componerNombre(partes: Partial<Record<ParteDelNombre, unknown>>): string {
  const numerados = (a: ParteDelNombre, b: ParteDelNombre, juntos: ParteDelNombre) => {
    const primero = celda(partes[a]);
    const segundo = celda(partes[b]);
    return primero || segundo ? [primero, segundo] : [celda(partes[juntos])];
  };
  return [
    ...numerados('primerNombre', 'segundoNombre', 'nombres'),
    ...numerados('primerApellido', 'segundoApellido', 'apellidos'),
  ]
    .filter(Boolean)
    .join(' ');
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
  // El nombre armado por partes cuenta como mapeado: no falta nada.
  if (nombreSeArmaPorPartes(mapeo)) mapeados.add('nombre');
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
  const partes: Partial<Record<ParteDelNombre, unknown>> = {};
  for (const m of mapeo) {
    if (m.parte) partes[m.parte] = fila[m.columna];
    if (!m.campo) continue;
    cruda[m.campo] = fila[m.columna];
  }
  // El nombre completo propio de la fila gana; las partes llenan lo que falta.
  // Un archivo puede traer las dos cosas (Terceros.csv) y no todas las filas
  // tienen la columna completa llena.
  // Con una sola mitad (sólo «Primer Nombre») no se arma nada: sería el
  // nombre mocho que esto existe para evitar; la plantilla lo reporta como
  // «falta Nombre completo».
  if (!celda(cruda.nombre) && nombreSeArmaPorPartes(mapeo)) {
    const compuesto = componerNombre(partes);
    if (compuesto) cruda.nombre = compuesto;
  }
  // Las columnas «a notas» se pegan debajo de la nota propia, una por línea.
  const lineas = mapeo
    .filter((m) => m.aNotas)
    .map((m) => {
      const v = celda(fila[m.columna]);
      return v ? `${m.columna}: ${v}` : '';
    })
    .filter(Boolean);
  if (lineas.length > 0) cruda.notas = [celda(cruda.notas), ...lineas].filter(Boolean).join('\n');
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
