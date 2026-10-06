/**
 * QA-INQ-95 (T-02, 04-10-2026) · «Canon» mayor→menor dejaba «QA-CONT-95 … En
 * firma $4.500.000» y «Isabella … Empieza el 1 de nov $3.300.000» al FINAL, detrás
 * de las filas de $1.000.000: se ordenaba por el canon vigente (0) y se mostraba
 * el del contrato. Se ordena por lo que la fila muestra; sin arriendo, al final.
 */
import { describe, it, expect } from 'vitest';
import { ordenarInquilinos, canonDeLaFila } from './lista';
import type { Inquilino, ArriendoDeInquilino } from '@/lib/api/inquilinos.service';

const arriendo = (canonCop: number, estado: string, desde = '2026-01-01'): ArriendoDeInquilino =>
  ({ leaseId: null, contractId: `c-${canonCop}-${estado}`, estado, desde, hasta: '2027-01-01', canonCop, inmueble: null }) as unknown as ArriendoDeInquilino;
const persona = (nombre: string, arriendos: ArriendoDeInquilino[]): Inquilino =>
  ({ tenantId: nombre, nombre, email: null, telefono: null, documento: null, arriendos }) as unknown as Inquilino;

const LISTA = [
  persona('Ana Vigente', [arriendo(1_000_000, 'ACTIVE')]),
  persona('QA-CONT-95 En firma', [arriendo(4_500_000, 'EN_FIRMA', '2026-10-15')]),
  persona('Isabella Por empezar', [arriendo(3_300_000, 'ACTIVE', '2099-11-01')]),
  persona('Sofía Sin arriendo', []),
  persona('Bea Vigente', [arriendo(2_000_000, 'ACTIVE')]),
];

describe('ordenar por canon', () => {
  it('mayor a menor por el canon que muestra la fila; sin arriendo al final', () => {
    expect(ordenarInquilinos(LISTA, 'canon', 'desc').map((p) => p.nombre)).toEqual([
      'QA-CONT-95 En firma',
      'Isabella Por empezar',
      'Bea Vigente',
      'Ana Vigente',
      'Sofía Sin arriendo',
    ]);
  });
  it('menor a mayor, y lo que no tiene canon sigue al final', () => {
    expect(ordenarInquilinos(LISTA, 'canon', 'asc').map((p) => p.nombre)).toEqual([
      'Ana Vigente',
      'Bea Vigente',
      'Isabella Por empezar',
      'QA-CONT-95 En firma',
      'Sofía Sin arriendo',
    ]);
  });
  it('canonDeLaFila: con uno, el suyo; sin arriendo, null', () => {
    expect(canonDeLaFila(LISTA[1])).toBe(4_500_000);
    expect(canonDeLaFila(LISTA[3])).toBeNull();
  });
});
