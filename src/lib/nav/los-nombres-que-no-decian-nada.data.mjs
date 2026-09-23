/**
 * los-nombres-que-no-decian-nada.data.mjs — dos pestañas del Pipeline que se
 * llamaban de una forma y hacían otra.
 *
 * ── Qué se decidió, y por quién ────────────────────────────────────────────
 *
 * Nico, 2026-09-21, abriendo las dos pantallas:
 *
 *   · de «Calce»: «esta pantalla necesita un glow up, algo mucho mejor que se
 *     entienda que se puede hacer bien, y búscale otro nombre»;
 *   · de «Visitas»: «¿para qué existe esta sección si existe la de Agenda?».
 *
 * Las dos preguntas eran de NOMBRE:
 *
 *   `/pipeline/calce`   → `/pipeline/que-ofrecer`
 *     «Calce» no dice qué se puede hacer, se confunde con «Matching» —que está
 *     en el menú de al lado y es otra cosa— y en Colombia se usa más para una
 *     cuña que para un encaje. La pantalla contesta «qué le ofrezco a este
 *     interesado» y «a quién le sirve este inmueble que se liberó».
 *
 *   `/pipeline/visitas` → `/pipeline/preparar-visitas`
 *     La Agenda YA muestra las visitas, con confirmar, rechazar y cancelar.
 *     Esta lista es otra cosa: QUÉ LE FALTA a cada visita para poder hacerse
 *     —el asesor sin asignar, el aviso al inquilino que vive adentro—. Dos
 *     entradas del menú llamadas casi igual prometían lo mismo dos veces.
 *
 * ── Por qué se mueve la URL y no sólo la etiqueta ──────────────────────────
 *
 * Porque hay una regla de la casa (R4, `arquitectura-del-panel.test.ts`): «la
 * etiqueta y la ruta se escriben igual — el segmento sale del nombre». Dejar
 * `/pipeline/calce` con la etiqueta «Qué ofrecer» obligaba a meter las dos en
 * la lista de excepciones, que es para nombres viejos de vocabulario, no para
 * un renombre que estamos haciendo hoy. Escribir la excepción habría sido
 * apagar la regla el mismo día que sirvió.
 *
 * `permanent: false` (307) como sus hermanas: un 301 lo cachea el navegador
 * para siempre y nadie podría volver a probar la ruta vieja si esto se
 * revierte.
 *
 * Plain ESM y no `.ts` porque Next 14.2 no soporta `next.config.ts` y el
 * config corre bajo Node pelado. La re-exportación tipada vive en el `.ts`
 * hermano.
 */
const P = '/panel/inmobiliaria'

/** @type {Array<{ source: string, destination: string, permanent: boolean }>} */
export const LOS_NOMBRES_QUE_NO_DECIAN_NADA_DATA = [
  { source: `${P}/pipeline/calce`, destination: `${P}/pipeline/que-ofrecer`, permanent: false },
  {
    source: `${P}/pipeline/visitas`,
    destination: `${P}/pipeline/preparar-visitas`,
    permanent: false,
  },
]
