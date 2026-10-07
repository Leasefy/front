/**
 * Publicar del propietario: el error de cada campo, en su campo (02-10-2026).
 *
 * `PublishContext` ya junta en `erroresDelServidor` lo que rechazó el back
 * (`campos[]`) y los topes del cliente (`erroresDelInmueble`, espejo del DTO),
 * y lleva a la persona al paso del primer campo. Acá vive lo que comparten los
 * pasos para pintarlo:
 *
 *  · `idDelCampo` / `idDelError`: el id del control y el de su error
 *    (`${id}-error`, el que nombra `aria-describedby` y pinta `ErrorDelCampo`).
 *  · `ariaDelCampo`: id + `aria-invalid` + `aria-describedby` de un control.
 *  · `ariaDelGrupo`: lo mismo para un grupo de botones (tipo, ciudad,
 *    amenidades), que no tiene un control único.
 *  · `hayErroresNuevos` + `enfocarElPrimerError`: el foco va al primer campo
 *    con error SÓLO cuando llegan errores nuevos (un fallo al publicar), no
 *    en cada render ni cuando la persona corrige uno y los demás quedan. El
 *    «primero» es el de `ordenDeLosErrores` del contexto (el orden de la
 *    pantalla), no el que mandó primero el servidor.
 */

import type { PropertyDraft } from '@/lib/types/publish';

/** Un campo del borrador (el mismo `CampoDelBorrador` del contexto). */
export type CampoDePublicar = keyof PropertyDraft;
export type ErroresDePublicar = Partial<Record<CampoDePublicar, string>>;

/** El id del control del campo en el asistente de publicar. */
export function idDelCampo(campo: CampoDePublicar): string {
  return `publicar-${campo}`;
}

/** El id del mensaje de error del campo (`aria-describedby`). */
export function idDelError(campo: CampoDePublicar): string {
  return `${idDelCampo(campo)}-error`;
}

/** id, `aria-invalid` y `aria-describedby` de un control (input, textarea). */
export function ariaDelCampo(campo: CampoDePublicar, error?: string | null) {
  return {
    id: idDelCampo(campo),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? idDelError(campo) : undefined,
  } as const;
}

/**
 * Para un grupo de botones que elige el valor (no hay un input): el grupo
 * lleva `aria-invalid` y nombra su error; el foco va al botón elegido.
 */
export function ariaDelGrupo(campo: CampoDePublicar, error?: string | null) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? idDelError(campo) : undefined,
  } as const;
}

function conMensaje(errores: ErroresDePublicar): CampoDePublicar[] {
  return (Object.keys(errores) as CampoDePublicar[]).filter((c) => !!errores[c]);
}

/**
 * ¿Llegaron errores nuevos?
 *
 * El contexto arma un objeto nuevo en cada fallo al publicar, y otro (con un
 * campo menos) cuando la persona edita un campo con error. Sólo lo primero
 * mueve el foco: si lo único que pasó fue que se quitaron errores, no.
 * Un fallo repetido con los mismos errores SÍ es nuevo (la persona volvió a
 * publicar y el contexto la volvió a llevar al paso).
 */
export function hayErroresNuevos(antes: ErroresDePublicar, ahora: ErroresDePublicar): boolean {
  if (antes === ahora) return false;
  const campos = conMensaje(ahora);
  if (campos.length === 0) return false;
  const soloSeQuitaron =
    campos.length < conMensaje(antes).length && campos.every((c) => antes[c] === ahora[c]);
  return !soloSeQuitaron;
}

const ENFOCABLES = 'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Enfoca un control marcado; un grupo pasa el foco a su botón elegido o al primero. */
function enfocarElMarcado(marcado: HTMLElement): boolean {
  const destino = marcado.matches(ENFOCABLES)
    ? marcado
    : (marcado.querySelector<HTMLElement>('[aria-pressed="true"]:not([disabled])') ??
      marcado.querySelector<HTMLElement>(ENFOCABLES));
  if (!destino) return false;
  destino.focus();
  return true;
}

/**
 * Le da el foco al primer control con error del paso que se ve. Con `orden`
 * (el `ordenDeLosErrores` del contexto), el primero de esa lista que esté en
 * pantalla, marcado con `aria-invalid` y nombrando su error en
 * `aria-describedby`; si ninguno está, o sin `orden`, el primero marcado en la
 * pantalla. Un grupo marcado pasa el foco a su botón elegido
 * (`aria-pressed="true"`) o, si no hay, al primero.
 * Devuelve si enfocó algo.
 */
export function enfocarElPrimerError(
  contenedor: HTMLElement | null,
  orden: readonly CampoDePublicar[] = [],
): boolean {
  if (!contenedor) return false;
  for (const campo of orden) {
    const marcado = contenedor.querySelector<HTMLElement>(
      `[aria-invalid="true"][aria-describedby~="${idDelError(campo)}"]`,
    );
    if (marcado && enfocarElMarcado(marcado)) return true;
  }
  const marcado = contenedor.querySelector<HTMLElement>('[aria-invalid="true"]');
  return marcado ? enfocarElMarcado(marcado) : false;
}
