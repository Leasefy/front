import type { PortafolioRow } from '@/lib/types/inmobiliaria';

/**
 * 🔴 El buscador de Inmuebles (QA 04-10, IN-09).
 *
 * Sólo miraba el título y la dirección: «24» (el CÓDIGO con el que la
 * inmobiliaria identifica el inmueble), «Paula» (la propietaria) y «Bello» (la
 * ciudad) daban «Ningún resultado». Ahora busca por código —con y sin «#»—, el
 * código propio de la inmobiliaria, título, dirección, propietario(s),
 * inquilino, barrio, ciudad y departamento, sin importar tildes ni mayúsculas.
 *
 * «#24» busca SÓLO el código (exacto): quien escribe el numeral está diciendo
 * «el inmueble 24», no «cualquier dirección con un 24».
 */

/** Minúsculas y sin tildes: «Bogotá» y «bogota» son lo mismo para quien busca. */
export function normalizarParaBuscar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function codigoDeLaFila(fila: PortafolioRow): number | null {
  if (fila.kind === 'sinMandato') return fila.code ?? null;
  return fila.propertyCode ?? null;
}

function textosDeLaFila(fila: PortafolioRow, nombreDelPropietario: Record<string, string>): string[] {
  const comunes = [fila.propertyTitle, fila.propertyAddress, fila.propertyZone, fila.propertyCity];
  if (fila.kind === 'sinMandato') {
    return [...comunes, fila.department ?? ''];
  }
  const propietarios = (fila.copropietarios ?? []).map(
    (c) => c.propietario?.name ?? nombreDelPropietario[c.propietarioId] ?? '',
  );
  return [
    ...comunes,
    fila.propertyExternalId ?? '',
    nombreDelPropietario[fila.propietarioId] ?? '',
    ...propietarios,
    fila.inquilino?.nombre ?? '',
    fila.currentTenantName ?? '',
  ];
}

/**
 * ¿La fila calza con lo que la persona escribió?
 * `nombreDelPropietario` es el mapa id → nombre de la lista de propietarios
 * (el mandato trae el id; el nombre viene de `usePropietarios`).
 */
export function coincideConLaBusqueda(
  fila: PortafolioRow,
  busqueda: string,
  nombreDelPropietario: Record<string, string> = {},
): boolean {
  const consulta = normalizarParaBuscar(busqueda);
  if (!consulta) return true;

  const codigo = codigoDeLaFila(fila);
  const conNumeral = /^#\s*(\d+)$/.exec(consulta);
  if (conNumeral) {
    return codigo != null && codigo === Number(conNumeral[1]);
  }
  if (/^\d+$/.test(consulta) && codigo != null && codigo === Number(consulta)) {
    return true;
  }

  return textosDeLaFila(fila, nombreDelPropietario).some((t) =>
    normalizarParaBuscar(t).includes(consulta),
  );
}
