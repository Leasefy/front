/**
 * columnas-de-contrato — leer el export de contratos de otro sistema.
 *
 * ── El día que esto falló de verdad ────────────────────────────────────────
 *
 * 2026-09-03: un archivo de 110 contratos entró entero y las 110 filas
 * quedaron guardadas así:
 *
 *   datos:     {"direccion":"","inquilino":{"correo":"","nombre":""}}
 *   faltantes: [inmueble, inquilino_correo, inquilino_nombre, fechas, canon,
 *               dia_de_pago, uso]
 *
 * Ninguna columna se reconoció, cada desplegable quedó en «Ignorar», y el
 * importador dejó continuar igual: 110 filas basura creadas y el aviso recién
 * DESPUÉS. De ahí salen las tres reglas de este archivo:
 *
 *   1. Reconocer de verdad: abreviaturas («CC», «Tel.», «Cod.»), sinónimos
 *      («tenedor», «vence», «alquiler») y encabezados compuestos («Correo
 *      electrónico del arrendatario») son lo que manda una inmobiliaria real.
 *   2. Decir qué tan seguro está: `certeza` viaja con cada columna y la
 *      pantalla marca las dudosas para que alguien confirme.
 *   3. Nunca adivinar en silencio: lo que no se entiende queda SIN campo, y
 *      lo esencial sin mapear FRENA el import (`faltantesEsenciales`).
 *
 * ── Por qué esto NO reusa el mapeo de inmuebles ─────────────────────────────
 *
 * El importador de inmuebles **bloquea a propósito** las columnas del
 * inquilino: `arrendatario`, `inquilino`, `codeudor`, `deudor solidario`,
 * `fiador` están en `ENCABEZADOS_SIN_CAMPO`. Se pusieron ahí porque
 * «Celular arrendatario» se auto-mapeaba a `ownerPhone` con confianza 0.92 —
 * el teléfono del inquilino terminaba guardado como el del propietario.
 *
 * Para un contrato, esas columnas son **justo lo que necesitamos**.
 *
 * ── La trampa que ya nos costó caro, y su arreglo de fondo ──────────────────
 *
 * `arrendador` (el propietario) y `arrendatario` (el inquilino) se diferencian
 * en dos letras y significan lo contrario. Antes esto se resolvía con una
 * lista de sinónimos ordenada y `includes`, y esa lista tenía un agujero
 * enorme: cualquier encabezado con «arrendatario» que NO estuviera listado
 * literalmente («Tel. arrendatario», «E-mail arrendatario», «CC arrendatario»)
 * caía en el término suelto `arrendatario` y se guardaba como el NOMBRE del
 * inquilino. Peor: como un campo se llena una sola vez, la columna real
 * «Nombre del arrendatario» quedaba después sin mapear.
 *
 * Ahora los campos de persona no se buscan por lista: se COMPONEN. Se detecta
 * el rol (arrendatario/inquilino/tenedor vs arrendador/propietario/dueño) y el
 * atributo (nombre/correo/teléfono/documento) por separado. Si el encabezado
 * nombra un rol y un atributo que no tenemos (dirección, ciudad, fecha de
 * nacimiento…), el resultado es SIN campo — nunca el nombre por descarte.
 */

/** Los campos de un contrato migrado que se pueden llenar desde un archivo. */
export type CampoDeContrato =
  | "direccionInmueble"
  | "codigoInmueble"
  | "ciudadInmueble"
  | "inquilinoNombre"
  | "inquilinoCorreo"
  | "inquilinoTelefono"
  | "inquilinoDocumento"
  | "fechaInicio"
  | "fechaFin"
  | "canon"
  | "deposito"
  | "diaDePago"
  | "uso"
  | "periodicidad"
  | "comision"
  | "propietarioNombre"
  | "propietarioDocumento"
  | "propietarioCorreo"
  | "propietarioTelefono";

/**
 * Qué tan seguro está el auto-mapeo de una columna.
 *
 * - `exacta`   — el encabezado ES el término (o rol + atributo, sin sobras).
 * - `sinonimo` — empató un sinónimo o una abreviatura conocida.
 * - `dudosa`   — empató por una palabra genérica («Ciudad», «Desde»,
 *                «Honorarios»): puede estar bien, pero alguien tiene que
 *                mirarla. La pantalla las marca.
 */
export type CertezaDeMapeo = "exacta" | "sinonimo" | "dudosa";

export interface MapeoDeColumna {
  columna: string;
  campo: CampoDeContrato | null;
  /** Qué término del diccionario empató. Vacío si no empató nada. */
  porque: string;
  /** Nivel de confianza del auto-mapeo. `null` cuando no hay campo. */
  certeza: CertezaDeMapeo | null;
  /** La persona lo corrigió a mano — no es el resultado del auto-mapeo. */
  isManual?: boolean;
}

/* ── Normalización ────────────────────────────────────────────────────────── */

/**
 * Abreviaturas y variantes → la palabra canónica.
 *
 * Es la mitad del arreglo: un export real escribe «CC», «Tel.», «Cel»,
 * «Cod.», «Nro», «e-mail», «Dueño», y ninguna de esas formas estaba en el
 * diccionario viejo. Se aplica TOKEN a token, nunca por `includes`, para que
 * «cc» no empate dentro de otra palabra.
 */
const ALIAS: Record<string, string> = {
  // Documento de identidad. `id` NO está acá a propósito: «ID inmueble» es el
  // código del inmueble, no una cédula.
  cc: "documento",
  ce: "documento",
  cedula: "documento",
  cedulas: "documento",
  nit: "documento",
  rut: "documento",
  identificacion: "documento",
  identidad: "documento",
  ident: "documento",
  doc: "documento",
  documentos: "documento",
  // Correo
  email: "correo",
  emails: "correo",
  mail: "correo",
  correos: "correo",
  // Teléfono (celular y teléfono son el mismo campo del contrato)
  tel: "telefono",
  tels: "telefono",
  telefonos: "telefono",
  fono: "telefono",
  cel: "celular",
  cels: "celular",
  celulares: "celular",
  movil: "celular",
  moviles: "celular",
  whatsapp: "celular",
  wpp: "celular",
  wsp: "celular",
  // Nombre
  nombres: "nombre",
  razon: "nombre",
  // Dirección
  dir: "direccion",
  direcciones: "direccion",
  ubicacion: "direccion",
  // Código / número
  cod: "codigo",
  cods: "codigo",
  codigos: "codigo",
  no: "numero",
  nro: "numero",
  num: "numero",
  nums: "numero",
  numeros: "numero",
  "#": "numero",
  // Roles: el inquilino
  arrendataria: "arrendatario",
  arrendatarios: "arrendatario",
  inquilina: "inquilino",
  inquilinos: "inquilino",
  tenedor: "arrendatario",
  tenedora: "arrendatario",
  locatario: "arrendatario",
  locataria: "arrendatario",
  tenant: "arrendatario",
  // Roles: el propietario
  arrendadora: "arrendador",
  arrendadores: "arrendador",
  propietaria: "propietario",
  propietarios: "propietario",
  dueno: "propietario",
  duena: "propietario",
  duenos: "propietario",
  owner: "propietario",
  landlord: "propietario",
  // Administración
  admon: "administracion",
  admin: "administracion",
};

/** Palabras de relleno: no cambian el significado de un encabezado. */
const PALABRAS_VACIAS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "o",
  "a",
  "al",
  "en",
  "por",
  "para",
  "un",
  "una",
  "sr",
  "sra",
  "señor",
]);

/**
 * Minúsculas, sin tildes, sin puntuación y con los espacios colapsados.
 *
 * `%` y `#` sobreviven —y quedan separados— porque son datos: «Comisión %» y
 * «# Inmueble» dependen de ellos.
 */
export function normalizarEncabezado(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // «e-mail» / «e mail» → «email», antes de que la puntuación se vaya.
    .replace(/\be[\s.\-_]*mail\b/g, "email")
    // «C.C.» → «cc», idem.
    .replace(/\bc\s*\.\s*c\s*\.?/g, " cc ")
    .replace(/[%#]/g, (c) => ` ${c} `)
    .replace(/[^a-z0-9%#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** El encabezado normalizado y con cada abreviatura llevada a su canónica. */
function canonizar(s: string): string {
  return normalizarEncabezado(s)
    .split(" ")
    .filter(Boolean)
    .map((t) => ALIAS[t] ?? t)
    .join(" ");
}

/** Los tokens con significado (sin «de», «del», «la»…). */
function tokensUtiles(canon: string): string[] {
  return canon.split(" ").filter((t) => t && !PALABRAS_VACIAS.has(t));
}

/**
 * ¿El encabezado contiene el término como palabras completas y seguidas?
 *
 * `includes` a secas fue una fuente real de errores: «renta» empataba con el
 * término «rent», y «fecha final» con «fecha fin». Que empate por palabra
 * completa obliga a escribir el sinónimo de verdad en el diccionario, que es
 * lo que se puede revisar.
 */
function contienePalabras(canon: string, termino: string): boolean {
  return ` ${canon} `.includes(` ${termino} `);
}

/* ── Encabezados sin campo ────────────────────────────────────────────────── */

/**
 * Encabezados para los que NO tenemos campo en un contrato.
 *
 * Sin campo es un resultado válido: la persona lo mapea a mano si quiere. Lo
 * que no puede pasar es que se auto-asignen a otra cosa con confianza alta —
 * ese error se comete UNA vez y sale en la factura.
 */
export const SIN_CAMPO_EN_CONTRATO = [
  /*
   * Direcciones y ciudades que NO son la del inmueble. La composición por rol
   * (abajo) ya cubre «Dirección del arrendatario»; estas entradas cubren las
   * que no nombran a nadie — «Dirección de notificación» se robaba la
   * dirección del inmueble si venía antes en el archivo.
   */
  "direccion de notificacion",
  "direccion de correspondencia",
  "direccion de cobro",
  "ciudad de notificacion",
  "codigo postal",
  /*
   * «Valor administración» / «Administración mensual» dicen PLATA con todas
   * las letras: son la cuota del edificio que se le paga a la copropiedad, y
   * para eso no hay campo. Meterlas en `comision` (un porcentaje) es guardar
   * $350.000 como «350.000 %».
   *
   * Ojo: «Cuota de administración» a secas NO está acá. Nico (2026-09-04):
   * en sus archivos esa columna es el porcentaje de la inmobiliaria. Se mapea
   * a `comision`, pero como término DÉBIL —siempre dudosa, y pierde contra
   * cualquier columna que diga «comisión» u «honorarios»—, y con un aviso si
   * los valores tienen cara de pesos. Ver `TERMINOS_DEBILES`.
   */
  "valor de administracion",
  "valor administracion",
  "administracion mensual",
  "matricula inmobiliaria",
  "chip catastral",
  "estrato",
  "consecutivo",
  "referencia interna",
  "observaciones",
  "notas",
  "fecha de nacimiento",
].map(canonizar);

/* ── Campos de persona: rol × atributo ───────────────────────────────────── */

const ROL_INQUILINO = "arrendatario";
const ROL_PROPIETARIO = "propietario";

/** Cómo llega cada rol al encabezado, ya canonizado. */
const TOKENS_DE_ROL: Record<string, string> = {
  arrendatario: ROL_INQUILINO,
  inquilino: ROL_INQUILINO,
  arrendador: ROL_PROPIETARIO,
  propietario: ROL_PROPIETARIO,
};

/** Atributos de persona que SÍ tienen campo, por rol. */
const CAMPO_POR_ROL_Y_ATRIBUTO: Record<
  string,
  Record<string, CampoDeContrato>
> = {
  [ROL_INQUILINO]: {
    nombre: "inquilinoNombre",
    correo: "inquilinoCorreo",
    telefono: "inquilinoTelefono",
    celular: "inquilinoTelefono",
    documento: "inquilinoDocumento",
  },
  [ROL_PROPIETARIO]: {
    nombre: "propietarioNombre",
    correo: "propietarioCorreo",
    telefono: "propietarioTelefono",
    celular: "propietarioTelefono",
    documento: "propietarioDocumento",
  },
};

/**
 * Atributos de una persona para los que NO hay campo.
 *
 * Encontrar uno de estos VETA el encabezado entero: «Municipio del
 * arrendatario» no puede terminar en la ciudad del inmueble sólo porque la
 * palabra «municipio» exista en el diccionario, y «Tipo de documento del
 * arrendatario» (CC/CE) no es el número del documento.
 */
const ATRIBUTOS_SIN_CAMPO = new Set([
  "direccion",
  "ciudad",
  "municipio",
  "barrio",
  "pais",
  "departamento",
  "nacimiento",
  "edad",
  "firma",
  "banco",
  "cuenta",
  "ingresos",
  "ocupacion",
  "profesion",
  "empresa",
  "representante",
  "codeudor",
  "coodeudor",
  "fiador",
  "tipo",
  "estado",
  "civil",
  "sexo",
  "genero",
  "foto",
]);

interface Empate {
  campo: CampoDeContrato;
  porque: string;
  /** Cuántas palabras hizo falta para empatar: más específico gana. */
  puntaje: number;
  certeza: CertezaDeMapeo;
  /** Cede el campo ante cualquier empate normal. Ver `TERMINOS_DEBILES`. */
  debil?: boolean;
}

/** `null` = el encabezado no nombra a nadie · `false` = lo nombra y no aplica. */
function empatePorPersona(canon: string): Empate | null | false {
  const tokens = tokensUtiles(canon);
  const roles = new Set(
    tokens.map((t) => TOKENS_DE_ROL[t]).filter((r): r is string => Boolean(r)),
  );
  if (roles.size === 0) return null;
  // «Arrendador y arrendatario» nombra a los dos: no hay a cuál asignarlo.
  if (roles.size > 1) return false;

  const rol = [...roles][0];
  if (tokens.some((t) => ATRIBUTOS_SIN_CAMPO.has(t))) return false;

  const tabla = CAMPO_POR_ROL_Y_ATRIBUTO[rol];
  const atributos = tokens.filter((t) => t in tabla);
  if (atributos.length === 0) {
    // «Arrendatario» a secas es el nombre del inquilino — la lectura de toda
    // la vida en un export. Puntaje 1: cualquier término de dos palabras del
    // diccionario le gana.
    const rolEscrito = tokens.find((t) => TOKENS_DE_ROL[t]) ?? rol;
    return {
      campo: tabla.nombre,
      porque: rolEscrito,
      puntaje: 1,
      certeza: tokens.length === 1 ? "exacta" : "sinonimo",
    };
  }

  const atributo = atributos[0];
  return {
    campo: tabla[atributo],
    porque: `${atributo} ${rol === ROL_INQUILINO ? "arrendatario" : "propietario"}`,
    puntaje: 2,
    // «Nombre y cédula del arrendatario» trae dos atributos en una celda: se
    // toma el primero y se marca para que alguien la mire.
    certeza:
      atributos.length > 1
        ? "dudosa"
        : tokens.length === 2
          ? "exacta"
          : "sinonimo",
  };
}

/* ── Campos que no son de persona ────────────────────────────────────────── */

/**
 * Sinónimos por campo. Se comparan por palabras completas y gana el más
 * específico (el que empata con más palabras), así que el ORDEN de la lista
 * sólo desempata entre términos del mismo largo.
 */
const DICCIONARIO: Array<{ campo: CampoDeContrato; terminos: string[] }> = [
  {
    campo: "fechaInicio",
    terminos: [
      "fecha de inicio del contrato",
      "fecha de inicio",
      "fecha inicio",
      "fecha inicial",
      "fecha de iniciacion",
      "inicio del contrato",
      "inicio contrato",
      "vigencia desde",
      "fecha desde",
      "start date",
      "inicio",
      "desde",
    ],
  },
  {
    campo: "fechaFin",
    terminos: [
      "fecha de terminacion del contrato",
      "fecha de terminacion",
      "fecha terminacion",
      "fecha de finalizacion",
      "fecha de vencimiento",
      "fecha vencimiento",
      "fecha final",
      "fecha fin",
      "fecha hasta",
      "fin del contrato",
      "fin contrato",
      "terminacion del contrato",
      "vigencia hasta",
      "end date",
      "terminacion",
      "vencimiento",
      "vence",
      "hasta",
    ],
  },
  {
    campo: "deposito",
    terminos: [
      "deposito de garantia",
      "deposito en garantia",
      "valor deposito",
      "deposito",
      "garantia",
    ],
  },
  {
    campo: "canon",
    terminos: [
      "canon de arrendamiento",
      "valor del canon mensual",
      "canon mensual",
      "valor del canon",
      "valor canon",
      "valor del arriendo",
      "valor arriendo",
      "valor del alquiler",
      "arriendo mensual",
      "renta mensual",
      "canon",
      "arriendo",
      "alquiler",
      "renta",
      "mensualidad",
    ],
  },
  {
    campo: "diaDePago",
    terminos: [
      "dia de pago del canon",
      "dia limite de pago",
      "dia de pago",
      "dia de cobro",
      "dia de corte",
      "dia limite",
      "dia pago",
      "plazo de pago",
      "fecha de pago",
      "dia",
    ],
  },
  {
    campo: "uso",
    terminos: [
      "uso del inmueble",
      "destinacion del inmueble",
      "tipo de uso",
      "destinacion",
      "destino",
      "uso",
    ],
  },
  {
    campo: "periodicidad",
    terminos: [
      "periodicidad de pago",
      "frecuencia de pago",
      "periodicidad",
      "frecuencia",
    ],
  },
  {
    campo: "comision",
    terminos: [
      "comision de administracion",
      "honorarios de administracion",
      "porcentaje de comision",
      "porcentaje de administracion",
      "comision %",
      "% comision",
      "% administracion",
      "comision",
      "honorarios",
      /*
       * La familia «cuota»: débil a propósito (ver `TERMINOS_DEBILES`). En el
       * mercado colombiano «cuota de administración» suele ser la cuota del
       * edificio en pesos; en los archivos del owner es el porcentaje de la
       * inmobiliaria. Se mapea, pero pidiendo confirmación y cediendo el campo
       * a cualquier columna que lo diga sin ambigüedad.
       */
      "cuota de administracion",
      "cuota administracion",
      "administracion",
      "cuota",
    ],
  },
  /*
   * El código del inmueble — el «#144» que la inmobiliaria ve en Inmuebles.
   * Cuando el archivo lo trae, el back resuelve por código ANTES que por
   * dirección (Nico, 2026-09-02: 90 contratos sin inmueble porque ninguna
   * dirección coincidía letra a letra). Sin «codigo» ni «id» a secas: eso
   * empataría con el número del contrato o con «código postal».
   */
  {
    campo: "codigoInmueble",
    terminos: [
      "codigo interno del inmueble",
      "codigo del inmueble",
      "codigo de inmueble",
      "codigo de la propiedad",
      "codigo del predio",
      "codigo inmueble",
      "codigo propiedad",
      "codigo predio",
      "numero del inmueble",
      "numero inmueble",
      "id del inmueble",
      "id inmueble",
      "property code",
      "property id",
    ],
  },
  /*
   * La ciudad del inmueble: sólo sirve para CREAR el inmueble cuando no está
   * cargado (`Property.city` es obligatoria). «ciudad» a secas queda como
   * dudosa — puede ser la del propietario en un archivo mal armado.
   */
  {
    campo: "ciudadInmueble",
    terminos: [
      "ciudad del inmueble",
      "ciudad inmueble",
      "municipio del inmueble",
      "municipio inmueble",
      "ciudad",
      "municipio",
      "city",
    ],
  },
  {
    /*
     * Va de última y SIN `inmueble` ni `predio` a secas. Con esos términos,
     * «Uso del inmueble» se mapeaba a la dirección: una palabra genérica
     * empata con encabezados que hablan de otra cosa, y el auto-mapeo no
     * duda — asigna y sigue. Lo agarró el test, no la lectura del código.
     */
    campo: "direccionInmueble",
    terminos: [
      "direccion del inmueble",
      "direccion de la propiedad",
      "direccion del predio",
      "direccion inmueble",
      "direccion predio",
      "direccion",
      "address",
    ],
  },
];

/**
 * Términos que por sí solos no alcanzan para estar seguros. Empatan igual
 * —dejarlos afuera es perder la columna— pero salen marcados como `dudosa` y
 * la pantalla pide confirmarlos.
 */
/**
 * Términos que empatan pero NO se quedan con el campo si hay algo mejor.
 *
 * Un término débil siempre sale `dudosa` y, si otra columna del archivo
 * reclama el mismo campo con un término normal, la pierde por completo — sin
 * importar cuántas palabras haya empatado. Es la regla que Nico pidió para la
 * cuota: si el archivo trae «Comisión» u «Honorarios», ésa gana y la cuota
 * queda sin mapear, lista para que alguien la asigne a mano si quiere.
 */
const TERMINOS_DEBILES = new Set([
  "cuota de administracion",
  "cuota administracion",
  "administracion",
  "cuota",
]);

const TERMINOS_DUDOSOS = new Set([
  "desde",
  "hasta",
  "inicio",
  "vence",
  "terminacion",
  "vencimiento",
  "dia",
  "fecha de pago",
  "plazo de pago",
  "garantia",
  "honorarios",
  "% administracion",
  "porcentaje de administracion",
  "ciudad",
  "municipio",
  "city",
  "renta",
  "mensualidad",
  "destino",
]);

/** El diccionario ya canonizado, una sola vez. */
const DICCIONARIO_CANON = DICCIONARIO.map(({ campo, terminos }) => ({
  campo,
  terminos: terminos.map((t) => ({ escrito: t, canon: canonizar(t) })),
}));

/** Un empate normal siempre le gana a uno débil, empatara con lo que empatara. */
function mejorQue(a: Empate, b: Empate | null): boolean {
  if (!b) return true;
  if (Boolean(a.debil) !== Boolean(b.debil)) return !a.debil;
  return a.puntaje > b.puntaje;
}

function empatePorDiccionario(canon: string): Empate | null {
  let mejor: Empate | null = null;
  for (const { campo, terminos } of DICCIONARIO_CANON) {
    for (const termino of terminos) {
      if (!contienePalabras(canon, termino.canon)) continue;
      const debil = TERMINOS_DEBILES.has(termino.escrito);
      const candidato: Empate = {
        campo,
        porque: termino.escrito,
        puntaje: termino.canon.split(" ").length,
        // Un término débil nunca se presenta como seguro: la pantalla lo
        // marca y alguien confirma.
        certeza:
          debil || TERMINOS_DUDOSOS.has(termino.escrito)
            ? "dudosa"
            : canon === termino.canon
              ? "exacta"
              : "sinonimo",
        debil,
      };
      if (mejorQue(candidato, mejor)) mejor = candidato;
    }
  }
  return mejor;
}

/* ── El auto-mapeo ───────────────────────────────────────────────────────── */

/**
 * Mapea los encabezados de un archivo a campos de contrato.
 *
 * Devuelve SIEMPRE el motivo del empate y su `certeza`. El auto-mapeo se
 * equivoca con confianza alta —así fue como «Celular arrendatario» terminó de
 * teléfono del propietario—, y un número sin explicación no se puede revisar:
 * la persona sólo puede confiar o no confiar.
 */
export function mapearColumnas(encabezados: string[]): MapeoDeColumna[] {
  const candidatos = encabezados.map((columna): MapeoDeColumna & {
    puntaje: number;
    debil: boolean;
  } => {
    const canon = canonizar(columna);
    const sinCampo: MapeoDeColumna & { puntaje: number; debil: boolean } = {
      columna,
      campo: null,
      porque: "",
      certeza: null,
      puntaje: 0,
      debil: false,
    };

    if (SIN_CAMPO_EN_CONTRATO.some((t) => contienePalabras(canon, t))) {
      return sinCampo;
    }

    const persona = empatePorPersona(canon);
    if (persona === false) return sinCampo;

    const diccionario = empatePorDiccionario(canon);
    // Empate parejo → gana el diccionario: «Canon del arrendatario» es el
    // canon, no el nombre del inquilino por nombrar al arrendatario.
    const elegido =
      diccionario && (!persona || diccionario.puntaje >= persona.puntaje)
        ? diccionario
        : persona;
    if (!elegido) return sinCampo;

    return {
      columna,
      campo: elegido.campo,
      porque: elegido.porque,
      certeza: elegido.certeza,
      puntaje: elegido.puntaje,
      debil: Boolean(elegido.debil),
    };
  });

  /*
   * Un campo se llena una sola vez. Antes ganaba la primera columna que
   * apareciera; ahora gana la MÁS específica, y ésa es la mitad del arreglo
   * del incidente: con `['Tel. arrendatario', 'Nombre del arrendatario']`, la
   * primera se llevaba `inquilinoNombre` y la columna real quedaba sin mapear.
   */
  const duenoDelCampo = new Map<CampoDeContrato, number>();
  candidatos.forEach((c, i) => {
    if (!c.campo) return;
    const actual = duenoDelCampo.get(c.campo);
    // Mismo criterio que adentro de una columna: un término normal le gana a
    // uno débil, y entre pares gana el más específico. Por eso «Comisión» le
    // saca `comision` a «Cuota de administración» aunque empate con menos
    // palabras: la cuota queda libre para asignarla a mano.
    const rival: Empate = {
      campo: c.campo,
      porque: c.porque,
      puntaje: c.puntaje,
      certeza: c.certeza ?? "sinonimo",
      debil: c.debil,
    };
    if (
      actual === undefined ||
      mejorQue(rival, {
        campo: c.campo,
        porque: "",
        puntaje: candidatos[actual].puntaje,
        certeza: "sinonimo",
        debil: candidatos[actual].debil,
      })
    ) {
      duenoDelCampo.set(c.campo, i);
    }
  });

  // `puntaje`/`debil` son internos: sirvieron para desempatar y no salen.
  return candidatos.map(({ puntaje, debil, ...m }, i) =>
    m.campo && duenoDelCampo.get(m.campo) !== i
      ? { columna: m.columna, campo: null, porque: "", certeza: null }
      : m,
  );
}

/**
 * En qué fila del archivo están los encabezados de verdad.
 *
 * Un export real no siempre empieza en A1: arriba puede venir el nombre de la
 * inmobiliaria, el rango de fechas o una fila en blanco, y entonces `headers`
 * son «REPORTE DE CONTRATOS» y «(sin nombre)» — cero columnas reconocidas y
 * todas las filas vacías, que es exactamente lo que pasó el 2026-09-03.
 *
 * Se queda en la fila 0 salvo que otra reconozca CLARAMENTE más campos (3 o
 * más, y más que la 0): mover el encabezado por un empate flojo sería peor
 * que no moverlo.
 */
export function mejorFilaDeEncabezado(primerasFilas: string[][]): number {
  const puntajeDe = (fila: string[] | undefined): number => {
    if (!fila) return 0;
    const celdas = fila.map((c) => String(c ?? "").trim()).filter(Boolean);
    if (celdas.length < 2) return 0;
    return mapearColumnas(celdas).filter((m) => m.campo).length;
  };

  const base = puntajeDe(primerasFilas[0]);
  let mejorFila = 0;
  let mejorPuntaje = base;
  for (let i = 1; i < primerasFilas.length; i++) {
    const p = puntajeDe(primerasFilas[i]);
    if (p > mejorPuntaje) {
      mejorPuntaje = p;
      mejorFila = i;
    }
  }
  return mejorPuntaje >= 3 && mejorPuntaje > base ? mejorFila : 0;
}

/* ── Lo esencial: la compuerta ───────────────────────────────────────────── */

export type ClaveEsencial =
  | "inmueble"
  | "inquilino"
  | "contactoInquilino"
  | "fechaInicio"
  | "fechaFin"
  | "canon"
  | "diaDePago";

export interface RequisitoEsencial {
  clave: ClaveEsencial;
  /** Entra en «…la columna de tu archivo que trae ___». */
  etiqueta: string;
  /** Entra en «Tu archivo no trae ninguna columna de ___». */
  nombreCorto: string;
  /** Cualquiera de estos campos lo satisface. */
  campos: CampoDeContrato[];
  /** Palabras que hacen sospechar que una columna suelta podría servir. */
  pistas: string[];
}

/**
 * El mínimo para que una fila migrada SIRVA.
 *
 * No es la lista de deseos: es lo que hace falta para identificar el inmueble,
 * identificar al inquilino y poder cobrarle. Sin uno solo de estos, la fila
 * que se crea es la fila vacía del incidente del 2026-09-03. `uso`,
 * `periodicidad`, `depósito` y `comisión` quedan afuera a propósito: se
 * completan después, fila por fila, sin haber creado basura.
 */
export const REQUISITOS_ESENCIALES: RequisitoEsencial[] = [
  {
    clave: "inmueble",
    etiqueta: "la dirección o el código del inmueble",
    nombreCorto: "dirección ni código del inmueble",
    campos: ["direccionInmueble", "codigoInmueble"],
    pistas: ["direccion", "inmueble", "predio", "propiedad", "address"],
  },
  {
    clave: "inquilino",
    etiqueta: "el nombre del inquilino",
    nombreCorto: "nombre del inquilino",
    campos: ["inquilinoNombre"],
    pistas: ["nombre", "arrendatario", "inquilino"],
  },
  {
    clave: "contactoInquilino",
    etiqueta: "el correo o el documento del inquilino",
    nombreCorto: "correo ni documento del inquilino",
    campos: ["inquilinoCorreo", "inquilinoDocumento"],
    pistas: ["correo", "documento", "arrendatario", "inquilino"],
  },
  {
    clave: "fechaInicio",
    etiqueta: "la fecha de inicio",
    nombreCorto: "fecha de inicio",
    campos: ["fechaInicio"],
    pistas: ["inicio", "inicial", "desde", "vigencia", "fecha"],
  },
  {
    clave: "fechaFin",
    etiqueta: "la fecha de terminación",
    nombreCorto: "fecha de terminación",
    campos: ["fechaFin"],
    pistas: ["fin", "final", "terminacion", "vence", "vencimiento", "hasta", "fecha"],
  },
  {
    clave: "canon",
    etiqueta: "el canon",
    nombreCorto: "canon",
    campos: ["canon"],
    pistas: ["canon", "arriendo", "renta", "alquiler", "mensualidad"],
  },
  {
    clave: "diaDePago",
    etiqueta: "el día de pago",
    nombreCorto: "día de pago",
    campos: ["diaDePago"],
    pistas: ["dia", "pago", "cobro", "corte"],
  },
];

export interface FaltanteEsencial extends RequisitoEsencial {
  /**
   * El archivo trae alguna columna sin mapear que podría servir. Cambia el
   * consejo: elegirla en el desplegable vs. volver a exportar el archivo.
   */
  hayColumnaPosible: boolean;
}

/**
 * Qué falta para poder migrar. Si esto no está vacío, el import NO sigue.
 *
 * Ésa es la diferencia con `sinMapear`, que es informativo: `uso` sin mapear
 * se completa después; el canon sin mapear crea 110 contratos en $0.
 */
export function faltantesEsenciales(
  mapeo: MapeoDeColumna[],
): FaltanteEsencial[] {
  const mapeados = new Set(
    mapeo.map((m) => m.campo).filter((c): c is CampoDeContrato => Boolean(c)),
  );
  const libres = mapeo
    .filter((m) => !m.campo)
    .map((m) => tokensUtiles(canonizar(m.columna)));

  return REQUISITOS_ESENCIALES.filter(
    (r) => !r.campos.some((c) => mapeados.has(c)),
  ).map((r) => ({
    ...r,
    hayColumnaPosible: libres.some((tokens) =>
      tokens.some((t) => r.pistas.includes(t)),
    ),
  }));
}

/* ── Lo conveniente: el aviso que no bloquea ─────────────────────────────── */

/**
 * Los campos que más importan para poder liquidar y facturar un contrato.
 *
 * NO bloquean el import (eso lo hace `faltantesEsenciales`): alimentan el
 * aviso informativo de qué conviene completar. `uso` no es capricho: vivienda
 * va sin IVA y comercial no, y una factura sin IVA se ve idéntica a una a la
 * que se le olvidó el IVA.
 */
export const CAMPOS_CLAVE: CampoDeContrato[] = [
  "direccionInmueble",
  "inquilinoNombre",
  "inquilinoCorreo",
  "fechaInicio",
  "fechaFin",
  "canon",
  "diaDePago",
  "uso",
];

/**
 * Qué campos clave no se mapearon a ninguna columna. Informativo, no bloquea:
 * la lista de trabajo (`FaltantesDeFila`) es donde se completan fila por
 * fila después.
 */
export function sinMapear(mapeo: MapeoDeColumna[]): CampoDeContrato[] {
  const mapeados = new Set(mapeo.map((m) => m.campo).filter(Boolean));
  return CAMPOS_CLAVE.filter((c) => !mapeados.has(c));
}

/**
 * Aplica un remapeo manual de UNA columna.
 *
 * Si el campo elegido ya lo reclamaba otra columna, esa otra lo pierde: dos
 * columnas apuntando al mismo campo pisarían el dato en silencio, igual que
 * en el auto-mapeo.
 */
export function remapear(
  mapeo: MapeoDeColumna[],
  columna: string,
  campo: CampoDeContrato | null,
): MapeoDeColumna[] {
  return mapeo.map((m) => {
    if (m.columna === columna) {
      // Lo eligió una persona: no hay nada que dudar.
      return {
        columna,
        campo,
        porque: "",
        certeza: campo ? "exacta" : null,
        isManual: true,
      };
    }
    if (campo && m.campo === campo && m.columna !== columna) {
      return { ...m, campo: null, porque: "", certeza: null, isManual: true };
    }
    return m;
  });
}
