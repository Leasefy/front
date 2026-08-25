/**
 * openapi-dedupe.mjs — desambigua `operationId` colisionados del spec del back.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * NestJS deriva el `operationId` de `Clase_metodo`. Cuando el mismo controller
 * se monta en dos rutas —el caso real: avalúos y registration-profiles, que
 * viven en su ruta pública Y en `/api/v1/admin/*`— el spec sale con el MISMO
 * id dos veces. `openapi-typescript` vuelca cada operación en una clave de
 * `interface operations`, así que dos ids iguales son dos claves iguales, y
 * `tsc` corta con TS2300 «Duplicate identifier». Eso tiró el CI del front con
 * seis errores en un archivo que el front ni siquiera importaba todavía.
 *
 * Es un defecto del contrato del back (el arreglo de raíz es un `operationId`
 * explícito en los controllers admin), pero el front no puede quedar rehén de
 * eso: el codegen tiene que producir TypeScript válido con el spec que haya.
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 * Cuando dos operaciones comparten id, se renombran LAS DOS — no sólo la
 * segunda. Dejar que la primera del recorrido conserve el nombre corto ataría
 * el contrato al orden de las claves del JSON: el back reordena un path y el
 * tipo «bueno» cambia de dueño sin que nadie lo note. Renombrar a todas hace
 * que un id colisionado se vea colisionado, siempre.
 *
 * El sufijo sale de `metodo + path`, que en OpenAPI es único por definición:
 * el resultado no puede volver a colisionar y no depende del orden.
 */

/** `/api/v1/admin/avaluos/{id}` → `api_v1_admin_avaluos_id` */
function slugDePath(path) {
  return path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/** Los verbos HTTP que OpenAPI reconoce dentro de un Path Item Object. */
const VERBOS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'])

/**
 * @param {object} spec Documento OpenAPI. Se MUTA y se devuelve.
 * @returns {{ spec: object, renamed: Array<{ operationId: string, method: string, path: string, nuevo: string }> }}
 */
export function dedupeOperationIds(spec) {
  const paths = spec?.paths ?? {}

  // Primera pasada: contar. No se puede renombrar sobre la marcha porque la
  // primera aparición de un id todavía no sabe que va a colisionar.
  const cuenta = new Map()
  for (const item of Object.values(paths)) {
    for (const [verbo, op] of Object.entries(item ?? {})) {
      if (!VERBOS.has(verbo) || !op?.operationId) continue
      cuenta.set(op.operationId, (cuenta.get(op.operationId) ?? 0) + 1)
    }
  }

  // Segunda pasada: renombrar todas las apariciones de un id repetido.
  const renamed = []
  for (const [path, item] of Object.entries(paths)) {
    for (const [verbo, op] of Object.entries(item ?? {})) {
      if (!VERBOS.has(verbo) || !op?.operationId) continue
      const original = op.operationId
      if ((cuenta.get(original) ?? 0) < 2) continue

      const nuevo = `${original}__${verbo}_${slugDePath(path)}`
      op.operationId = nuevo
      renamed.push({ operationId: original, method: verbo, path, nuevo })
    }
  }

  return { spec, renamed }
}
