'use client'

/**
 * `/panel/inmobiliaria/configuracion/ia` — Automatización IA, dentro del marco
 * de Configuración.
 *
 * El asistente propone reglas que aprendió del uso; una persona con rol
 * OPERATOR+ las certifica antes de que puedan influir en el chat. Los datos, el
 * rol y la compuerta (que falla cerrada) viven en `ChatLessonsPanel` /
 * `useChatLessons`: acá sólo se elige la sección.
 *
 * Antes esta ruta traía su propia miga de pan y su propio encabezado; ahora el
 * marco de Configuración pone el título y la nav, así que no se repiten.
 */

import { SeccionCompleta } from '../contenido'

export default function AutomatizacionIaPage() {
  return <SeccionCompleta id="ia" />
}
