import type { CreacionDeLote } from '@/lib/api/inmuebles-importacion.service';

/**
 * La columna «Fotos» al terminar la carga (Nico, 10-10-2026: «decirlo en el
 * resultado»). El back mide, de los inmuebles NUEVOS, cuántos enlaces traía
 * cada fila y cuántas fotos quedaron; aquí se dice en palabras. `null` si
 * llegaron todas o el back no lo midió (uno anterior no manda `fotos`).
 */
export function fraseDeLasFotosQueNoBajaron(creacion: CreacionDeLote | null | undefined): string | null {
  const f = creacion?.fotos;
  if (!f) return null;
  const faltan = f.pedidas - f.traidas;
  if (faltan <= 0) return null;
  const filas =
    f.filas.length === 0
      ? ''
      : f.filas.length === 1
        ? ` (fila ${f.filas[0]})`
        : ` (filas ${f.filas.slice(0, -1).join(', ')} y ${f.filas[f.filas.length - 1]})`;
  return `${faltan} de ${f.pedidas} ${f.pedidas === 1 ? 'foto' : 'fotos'} del archivo no se ${faltan === 1 ? 'pudo' : 'pudieron'} traer${filas}: el enlace tiene que ser https y público (en Drive o Dropbox, «cualquiera con el enlace»).`;
}
