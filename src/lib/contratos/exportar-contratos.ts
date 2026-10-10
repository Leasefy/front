/**
 * Exportar contratos a Excel (acciones masivas, Nico 10-10-2026): una fila por
 * contrato, con lo que muestra la lista. La hoja se arma pura y se prueba;
 * bajar es lo único que toca el navegador.
 */

import type { Contract } from '@/lib/types/contract';
import { descargar } from '@/lib/propietarios/exportar-datos';

export const ENCABEZADOS_DE_CONTRATOS = [
  'Número',
  'Inquilino',
  'Correo del inquilino',
  'Documento del inquilino',
  'Inmueble',
  'Ciudad',
  'Canon',
  'Desde',
  'Hasta',
  'Estado',
] as const;

export function hojaDeContratos(contratos: readonly Contract[], estadoDe: (c: Contract) => string): (string | number)[][] {
  return [
    [...ENCABEZADOS_DE_CONTRATOS],
    ...contratos.map((c) => [
      c.externalId ?? (c.code != null ? String(c.code) : ''),
      c.tenantName || '',
      c.tenantEmail || '',
      c.tenantDocument || '',
      c.propertyId === null ? 'Sin inmueble' : c.propertyAddress || '',
      c.propertyCity || '',
      c.monthlyRent ?? '',
      c.startDate?.slice(0, 10) ?? '',
      c.endDate?.slice(0, 10) ?? '',
      estadoDe(c),
    ]),
  ];
}

export async function descargarContratos(
  contratos: readonly Contract[],
  estadoDe: (c: Contract) => string,
): Promise<string> {
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(hojaDeContratos(contratos, estadoDe));
  ws['!cols'] = ENCABEZADOS_DE_CONTRATOS.map((t) => ({ wch: Math.max(14, t.length + 4) }));
  XLSX.utils.book_append_sheet(libro, ws, 'Contratos');
  const bytes = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const nombre = `contratos-${dia}.xlsx`;
  descargar(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre);
  return nombre;
}

/**
 * Los inquilinos de los contratos marcados, para el estado de cuenta: es por
 * CLIENTE (el CEO: uno por persona aunque tenga varios contratos), así que
 * dos contratos del mismo inquilino le mandan UNO. La referencia es la cuenta
 * o, sin ella, el documento (lo que acepta `GET estado-de-cuenta/inquilino/:ref`).
 */
export function inquilinosDeLosContratos(contratos: readonly Contract[]): {
  clientes: { id: string; nombre: string; documento: string | null }[];
  sinInquilino: number;
} {
  const vistos = new Map<string, { nombre: string; documento: string | null }>();
  let sinInquilino = 0;
  for (const c of contratos) {
    const ref = c.tenantId ?? (c.tenantDocument?.trim() || null);
    if (!ref) {
      sinInquilino += 1;
      continue;
    }
    if (!vistos.has(ref)) {
      vistos.set(ref, { nombre: c.tenantName || 'Inquilino sin nombre', documento: c.tenantDocument?.trim() || null });
    }
  }
  return { clientes: [...vistos].map(([id, v]) => ({ id, ...v })), sinInquilino };
}
