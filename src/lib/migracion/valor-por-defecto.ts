/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — TE-08: las frases de «Poner
 * un valor por defecto» en la migración de terceros. Con «También reemplazar
 * los que ya tienen valor» marcado, la pantalla seguía diciendo «lo que ya
 * trae valor no se toca» junto a «Ojo: el valor que ya traían a la fila se
 * pierde»: las dos cosas a la vez, y la segunda mal dicha.
 */

/** Qué hace el botón, según se pisen o no los valores que ya hay. */
export function explicacionDelValorPorDefecto(sobrescribir: boolean): string {
  return sobrescribir
    ? 'Se escribe en todas las seleccionadas, también donde ya hay un valor. Después puedes cambiarlo fila por fila.'
    : 'Sólo se llena donde ese campo está vacío; lo que ya trae valor no se toca. Después puedes cambiarlo fila por fila.';
}

/** El aviso de lo que se pierde al reemplazar: «la fila» o «las N». */
export function avisoDeReemplazo(cantidad: number): string {
  return cantidad === 1
    ? 'Ojo: se pierde el valor que ya traía la fila.'
    : `Ojo: se pierde el valor que ya traían las ${cantidad.toLocaleString('es-CO')}.`;
}

/**
 * Qué filas cambia «Crear con datos por completar» cuando todavía no se sabe
 * cuántas califican. Decía «Sólo cambia las fila…» con una sola marcada.
 */
export function alcanceDeLasIncompletas(cantidad: number): string {
  return cantidad === 1
    ? 'Sólo cambia la fila si únicamente le falta el documento o su tipo; si no, sigue acá.'
    : 'Sólo cambia las filas a las que únicamente les falta el documento o su tipo; las demás siguen acá.';
}
