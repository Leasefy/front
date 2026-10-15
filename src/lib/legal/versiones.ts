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

/**
 * Política de tratamiento de datos personales publicada en `/privacidad`.
 *
 * v5.0 (15-10-2026): la inmobiliaria escribe por WhatsApp a quien firmó
 * contrato con ella, sin un «sí» aparte (§4 y §5; Nico). La v4.0 sigue en
 * `politica-v4.ts` y la v3.0 en `politica-v3.ts`.
 */
export const VERSION_POLITICA_DE_TRATAMIENTO = 'politica-tratamiento-v5.0';

/** Desde cuándo rige la versión publicada (AAAA-MM-DD). */
export const VIGENCIA_POLITICA_DE_TRATAMIENTO = '2026-10-15';

/**
 * Términos y condiciones publicados en `/terminos`.
 *
 * v2.2 (15-10-2026): §18 suma la autorización de los inquilinos con contrato
 * para escribirles por WhatsApp desde Mensajes (va con la Política v5.0).
 *
 * v2.1 (04-10-2026): §19 suma la frase del Anexo de Encargo sobre las
 * preguntas al asistente (la inmobiliaria autoriza a Leasefy a revisarlas en
 * los términos de la §16 de la Política). Lo acepta la inmobiliaria al
 * registrarse (`onboarding-session.service.ts`, `CURRENT_TERMS_VERSION`).
 */
export const VERSION_TERMINOS = 'terminos-v2.2';
