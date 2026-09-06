/**
 * La versión de los textos legales publicados. UN solo lugar.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * Cuando alguien acepta una autorización de tratamiento, lo que se guarda como
 * prueba es la VERSIÓN del texto que aceptó — el esquema del back lo dice con
 * todas las letras: `authorizationVersion` es «the single sync point with the
 * legal-texts source of truth». Sin eso, la fila prueba que la persona dijo que
 * sí, pero no a qué dijo que sí, y el art. 12 de la Ley 1581 nos obliga a
 * entregarle copia de lo que autorizó.
 *
 * 🔴 Hasta 2026-09-06 esto era la cadena `'v1'`, escrita a mano en el portal
 * del inquilino, mientras la política publicada iba en la v2.0. O sea que cada
 * consentimiento apuntaba a una versión que no existe.
 *
 * ── La regla ───────────────────────────────────────────────────────────────
 *
 * Al cambiar el texto de `/privacidad` o `/terminos` se sube la versión ACÁ y
 * en la ficha de cabecera de esa página, en el mismo commit. Nunca se muta el
 * texto de una versión ya publicada: se publica una nueva. Si se reescribe el
 * texto de una versión vigente, todas las autorizaciones ya otorgadas quedan
 * apuntando a algo que cambió debajo, y dejan de servir como prueba.
 */

/** Política de tratamiento de datos personales publicada en `/privacidad`. */
export const VERSION_POLITICA_DE_TRATAMIENTO = 'politica-tratamiento-v2.0';

/** Términos y condiciones publicados en `/terminos`. */
export const VERSION_TERMINOS = 'terminos-v2.0';
