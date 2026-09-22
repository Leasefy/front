/**
 * Qué columna del archivo es el nombre, cuál el documento y cuál el detalle.
 *
 * ── 🔴 Por qué esto existe ─────────────────────────────────────────────────
 *
 * La pantalla de listas restrictivas decía «carga los archivos oficiales de
 * OFAC, ONU y UE» y NO HABÍA DÓNDE: `captacionApi.cargarLista` estaba escrita
 * en el cliente y no la llamaba nadie. Es el mismo defecto de las plantillas de
 * documento y del convenio de recaudo — una pantalla que manda a hacer algo sin
 * la puerta para hacerlo.
 *
 * Los tres archivos oficiales no traen las mismas columnas ni en el mismo
 * idioma: la SDN de la OFAC trae `SDN_Name`, la lista consolidada de la ONU
 * trae `FIRST_NAME`/`NAME_ORIGINAL_SCRIPT`, y la de la UE trae `NameAlias_
 * WholeName`. Pedirle a alguien que renombre columnas antes de subir el archivo
 * es pedirle que no lo suba.
 *
 * Por eso el nombre se BUSCA por sinónimos, y lo que se encontró se muestra
 * antes de cargar nada: una lista mal leída bloquea a clientes reales.
 */

/** Sin tildes, sin espacios ni guiones bajos, en minúsculas. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_.-]+/g, '')
}

/**
 * Los nombres que usan los archivos oficiales, en orden de preferencia. El
 * primero que aparezca gana: `sdnname` antes que `name` porque la SDN trae las
 * dos y la segunda es la del programa, no la de la persona.
 */
const NOMBRE = [
  'sdnname',
  'namealiaswholename',
  'wholename',
  'nombrecompleto',
  'nombre',
  'name',
  'fullname',
  'nameoriginalscript',
  'razonsocial',
  'tercero',
]

const DOCUMENTO = [
  'documento',
  'numerodedocumento',
  'numerodocumento',
  'identificacion',
  'nit',
  'cedula',
  'document',
  'documentnumber',
  'identificationnumber',
  'identification',
  'idnumber',
  'passportno',
]

const DETALLE = [
  'detalle',
  'programa',
  'program',
  'remarks',
  'observaciones',
  'motivo',
  'reason',
  'title',
  'tipo',
]

function buscar(encabezados: readonly string[], candidatos: readonly string[]): string | null {
  const porNormal = new Map(encabezados.map((h) => [normalizar(h), h]))
  for (const c of candidatos) {
    const hit = porNormal.get(c)
    if (hit !== undefined) return hit
  }
  // Nada exacto: se acepta un encabezado que CONTENGA el candidato («SDN Name
  // (latin)»), pero sólo entonces, para no confundir «nombre del programa» con
  // el nombre de la persona.
  for (const c of candidatos) {
    const hit = encabezados.find((h) => normalizar(h).includes(c))
    if (hit !== undefined) return hit
  }
  return null
}

export interface ColumnasDelArchivo {
  /** `null` = no se encontró ninguna columna de nombre: el archivo no sirve. */
  nombre: string | null
  documento: string | null
  detalle: string | null
}

export function columnasDelArchivo(encabezados: readonly string[]): ColumnasDelArchivo {
  return {
    nombre: buscar(encabezados, NOMBRE),
    documento: buscar(encabezados, DOCUMENTO),
    detalle: buscar(encabezados, DETALLE),
  }
}

export interface FilaDeLaLista {
  nombre: string
  documento?: string
  detalle?: string
}

/**
 * Una fila del archivo, ya en el contrato del back. `null` = la fila no tiene
 * nombre y se descarta: una entrada sin nombre no puede comparar contra nadie,
 * y cargarla vacía haría que TODO coincidiera con ella.
 */
export function filaDeLaLista(
  fila: Record<string, string>,
  columnas: ColumnasDelArchivo,
): FilaDeLaLista | null {
  if (!columnas.nombre) return null
  const nombre = (fila[columnas.nombre] ?? '').trim()
  if (nombre === '') return null
  const documento = columnas.documento
    ? (fila[columnas.documento] ?? '').trim()
    : ''
  const detalle = columnas.detalle ? (fila[columnas.detalle] ?? '').trim() : ''
  return {
    nombre,
    ...(documento !== '' ? { documento } : {}),
    ...(detalle !== '' ? { detalle } : {}),
  }
}
