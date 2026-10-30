/**
 * El buscador del inmueble de «Nueva solicitud» de mantenimientos (Portofino,
 * 29-10-2026). Nico: «que encuentre por código del inmueble, por el contrato y
 * por el propietario, así como lo tenemos en el buscador inteligente, que
 * permita varias alternativas para dar con el inmueble».
 *
 * No es otro buscador: usa las MISMAS reglas del buscador del panel (Ctrl K,
 * `lib/search`): el código del inmueble como lo escribe la casa («#24»,
 * «inmueble 24», «24»), el número del contrato de Leasefy o el del sistema de
 * la inmobiliaria («1686», «Contrato 3»), el celular escrito como sea y el
 * texto sin tildes. Acá se aplican sobre los inmuebles del formulario (los
 * mandatos) y sobre sus contratos.
 *
 * 🔴 Regla de Portofino: la solicitud es SIEMPRE sobre un inmueble que ya está
 * en el sistema. Esto sólo encuentra; nunca arma un inmueble con lo escrito.
 */

import { apiClient } from '@/lib/api/client';
import type { BackendContract } from '@/lib/api/contracts.types';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import { codigoQueBusca } from '@/lib/search/sources/propiedades-source';
import { matchesQuery as elContratoCoincide, numeroQueCoincide } from '@/lib/search/sources/contratos-source';
import { esElMismoTelefono, telefonoDeLaConsulta } from '@/lib/search/consulta-del-buscador';

/** Lo del contrato que hace falta para buscar por él (lo que trae `GET /contracts`). */
export type ContratoParaBuscar = Pick<
  BackendContract,
  | 'id'
  | 'propertyId'
  | 'code'
  | 'externalId'
  | 'tenantName'
  | 'tenantDocument'
  | 'tenantEmail'
  | 'tenantPhone'
  | 'propertyAddress'
>;

/** Por qué salió un inmueble cuando no se ve en su fila (el número del contrato). */
export interface InmuebleEncontrado {
  consignacion: Consignacion;
  /** El número del contrato que coincidió con lo escrito («1686», «#3»); `null` si fue otra cosa. */
  contrato: string | null;
}

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Los dueños del inmueble, el principal primero. */
export function propietariosDelInmueble(c: Consignacion): { nombre: string; documento: string | null; telefono: string | null }[] {
  return (c.copropietarios ?? [])
    .map((cp) => cp.propietario)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.name))
    .map((p) => ({ nombre: p.name, documento: p.documentNumber ?? null, telefono: p.phone ?? null }));
}

/** ¿Lo escrito está en algún dato del inmueble, de sus dueños o de quien vive ahí? */
function coincideElInmueble(c: Consignacion, consulta: string): boolean {
  const codigo = codigoQueBusca(consulta);
  if (codigo !== null && c.propertyCode === codigo) return true;
  // Con «#» o la palabra, lo escrito ES un código: no se busca en la dirección.
  const soloCodigo = codigo !== null && !/^\s*\d+\s*$/.test(consulta);

  const telefono = telefonoDeLaConsulta(consulta);
  if (telefono) {
    const telefonos = [c.inquilino?.telefono, ...propietariosDelInmueble(c).map((p) => p.telefono)];
    if (telefonos.some((t) => esElMismoTelefono(t, telefono))) return true;
  }

  const n = norm(consulta);
  if (norm(c.propertyExternalId) === n) return true;
  if (soloCodigo) return false;

  const textos = [
    c.propertyTitle,
    c.propertyAddress,
    c.propertyZone,
    c.propertyCity,
    c.propertyExternalId,
    c.currentTenantName,
    c.inquilino?.nombre,
    c.inquilino?.documento,
    ...propietariosDelInmueble(c).flatMap((p) => [p.nombre, p.documento]),
  ];
  return textos.some((t) => norm(t).includes(n));
}

/** Qué tan seguro es el resultado: el código exacto primero, luego el contrato, luego lo demás. */
function orden(c: Consignacion, consulta: string, contrato: string | null): number {
  const codigo = codigoQueBusca(consulta);
  if (codigo !== null && c.propertyCode === codigo) return 0;
  if (norm(c.propertyExternalId) === norm(consulta)) return 0;
  if (contrato) return 1;
  return 2;
}

/**
 * Los inmuebles que coinciden con lo escrito, del más seguro al menos. Sin
 * nada escrito, todos, en el orden en que llegaron. `contratos` es opcional:
 * sin ellos (quien no puede ver contratos, o el back no respondió) se busca
 * igual por todo lo demás.
 */
export function buscarElInmueble(
  consignaciones: readonly Consignacion[],
  consulta: string,
  contratos: readonly ContratoParaBuscar[] = [],
): InmuebleEncontrado[] {
  const q = consulta.trim();
  if (!q) return consignaciones.map((consignacion) => ({ consignacion, contrato: null }));

  // El contrato lleva a su inmueble por el inmueble o por el contrato vigente.
  const porInmueble = new Map<string, string | null>();
  const porContrato = new Map<string, string | null>();
  for (const k of contratos) {
    if (!elContratoCoincide(k as BackendContract, q)) continue;
    const numero = numeroQueCoincide(k, q);
    if (k.propertyId && !porInmueble.get(k.propertyId)) porInmueble.set(k.propertyId, numero);
    if (!porContrato.get(k.id)) porContrato.set(k.id, numero);
  }

  const encontrados: { e: InmuebleEncontrado; orden: number; i: number }[] = [];
  consignaciones.forEach((c, i) => {
    const delContrato = c.inquilino?.contractId ? porContrato.get(c.inquilino.contractId) : undefined;
    const delInmueble = c.propertyId ? porInmueble.get(c.propertyId) : undefined;
    const porElContrato = delContrato !== undefined || delInmueble !== undefined;
    if (!porElContrato && !coincideElInmueble(c, q)) return;
    const contrato = delContrato ?? delInmueble ?? null;
    encontrados.push({ e: { consignacion: c, contrato }, orden: orden(c, q, contrato), i });
  });
  return encontrados.sort((a, b) => a.orden - b.orden || a.i - b.i).map((x) => x.e);
}

/**
 * Los contratos de la inmobiliaria, para buscar por su número. La misma lectura
 * del buscador del panel (`GET /contracts`). Si no se pueden leer, se busca sin
 * ellos: nunca tumba el formulario.
 */
export async function contratosParaBuscar(): Promise<ContratoParaBuscar[]> {
  try {
    const lista = await apiClient.get<BackendContract[]>('/contracts');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}
