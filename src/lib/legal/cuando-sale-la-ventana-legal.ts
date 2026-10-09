/**
 * Cuándo sale la ventana «Actualizamos la política de datos y los términos».
 *
 * Nico (08-10-2026), viéndola encima de «¿Cómo vas a usar Leasefy?» recién
 * creada la cuenta: «eso de términos y condiciones debe aparecer es en el home
 * luego de que ya tenga todo check, y si le da clic en acepto no debe de
 * volver a aparecer hasta que se vuelvan a actualizar».
 *
 *   · Sólo en el HOME del rol (`getUserHomeRoute`: el Piloto de la
 *     inmobiliaria, `/panel` del propietario, `/inquilino`). Al home no se
 *     llega sin terminar el registro: `ProtectedRoute` manda antes al
 *     onboarding y al segundo factor.
 *   · Con «todo check»: nada de la puesta en marcha delante (la pregunta de la
 *     migración, el muro, la bienvenida), ningún otro diálogo abierto y el
 *     recorrido del panel ya hecho u omitido. El recorrido marca
 *     `<html data-recorrido-pendiente>` mientras le falta (`TourDelPanel`).
 *   · «Una vez por versión» lo guarda el back (`aceptaciones_legales`); acá no
 *     se cambia.
 *
 * PURO: lo que hay en pantalla llega como `existe(selector)`.
 */

import { CAPAS_QUE_BLOQUEAN } from '@/components/tour/pasos-del-tour';

/** Lo que tiene que haberse ido de la pantalla antes de la ventana. */
export const LO_QUE_VA_ANTES_DE_LA_VENTANA_LEGAL: readonly string[] = [
  ...CAPAS_QUE_BLOQUEAN,
  // El recorrido abierto y el que todavía falta (es lo último de una cuenta nueva).
  '[data-testid="tour-del-panel"]',
  'html[data-recorrido-pendiente]',
];

/** ¿La ruta es el home del rol? Sin la query y sin la barra final. */
export function esElHome(ruta: string | null | undefined, home: string): boolean {
  const limpia = (r: string) => (r.split('?')[0] ?? '').replace(/\/+$/, '') || '/';
  return limpia(ruta ?? '') === limpia(home);
}

/** ¿Queda algo delante de la ventana? */
export function hayAlgoAntesDeLaVentanaLegal(existe: (selector: string) => boolean): boolean {
  return LO_QUE_VA_ANTES_DE_LA_VENTANA_LEGAL.some((sel) => {
    try {
      return existe(sel);
    } catch {
      return false;
    }
  });
}

/**
 * Cuántos latidos seguidos sin nada delante antes de abrirla: la pregunta de
 * la migración y el recorrido aparecen un instante DESPUÉS de pintarse el home
 * (esperan al back). Con dos latidos la ventana no se les adelanta.
 */
export const LATIDOS_EN_CALMA = 2;
export const LATIDO_MS = 700;
