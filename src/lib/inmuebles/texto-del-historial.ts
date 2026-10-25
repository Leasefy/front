/**
 * El historial del inmueble con las palabras de Leasefy.
 *
 * El back escribe el título y el detalle de cada evento cuando pasa
 * («Agente asignado: Ana…», «…sus fichas del pipeline…»), y la ficha los
 * pintaba tal cual: la revisión de diseño del 22-10-2026 lo marcó como
 * bloqueante (inglés y jerga a la vista). Sin tocar el back, la ficha los pasa
 * por aquí: las frases conocidas se reescriben enteras y las palabras sueltas
 * se cambian por las del manual de voz (docs/VOZ-Y-TONO.md §3). Lo que no se
 * reconoce queda como vino.
 */

/** Frases enteras que el back escribe y que se dicen de otra forma. */
const FRASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^Agente asignado:\s*/i, 'Asesor a cargo: '],
  [
    /Queda como responsable del inmueble, sus fichas del pipeline y sus cobros\.?/i,
    'Lleva el inmueble, sus prospectos y sus cobros.',
  ],
  [/^Consignación creada$/i, 'Mandato registrado'],
  [/contrato de consignación/gi, 'mandato'],
];

/** Palabras sueltas: jerga o inglés → la palabra de la casa. */
const PALABRAS: ReadonlyArray<readonly [RegExp, string]> = [
  [/fichas del pipeline/gi, 'prospectos'],
  [/\bdel pipeline\b/gi, 'de la prospección'],
  [/\bel pipeline\b/gi, 'la prospección'],
  [/\bal pipeline\b/gi, 'a la prospección'],
  [/\bpipeline\b/gi, 'prospección'],
  [/\bexport\b/gi, 'archivo'],
];

export function textoDelHistorial(texto: string): string {
  let t = texto;
  for (const [patron, reemplazo] of FRASES) t = t.replace(patron, reemplazo);
  for (const [patron, reemplazo] of PALABRAS) t = t.replace(patron, reemplazo);
  return t;
}
