/**
 * Buscar en la lista de contratos.
 *
 * 🔴 Nico, 2026-09-12: «esta tabla ¿por qué no tiene buscador?». Era la única
 * de las cuatro del directorio sin uno — propietarios, inquilinos e inmuebles
 * ya lo tenían. Con **1.836 contratos** paginados de a 10, encontrar uno era
 * pasar 184 páginas.
 *
 * ── Se busca sobre la lista COMPLETA, nunca sobre la página ─────────────────
 * Es la misma lección que ya está escrita en la pantalla de propietarios:
 * filtrar lo que ya se paginó hace un buscador que MIENTE — buscar «Martínez»
 * desde la página 1 contesta «no se encontró» con Martínez en la página 3, y
 * nada en la pantalla lo delata. El orden es filtrar → paginar, y por eso esto
 * vive acá y no adentro de la tabla.
 *
 * ── Por qué estos tres campos ──────────────────────────────────────────────
 * Los mismos que la fila muestra: el consecutivo, el inquilino y la dirección.
 * Buscar por algo que no está en pantalla deja a alguien mirando un resultado
 * sin entender por qué salió.
 */

import type { Contract } from '@/lib/types/contract';

/** Sin acentos, sin mayúsculas: «Martínez» encuentra a «MARTINEZ». */
function comparable(v: unknown): string {
  return typeof v === 'string'
    ? v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    : '';
}

export function filtrarContratos<T extends Partial<Contract>>(
  contratos: T[],
  buscar: string,
): T[] {
  const q = comparable(buscar).trim();
  if (!q) return contratos;

  /*
   * «#1981» y «1981» encuentran lo mismo: el numeral es como se LEE el código
   * en la pantalla, así que alguien lo va a escribir, y exigirlo o prohibirlo
   * son dos formas de no encontrar nada.
   */
  const sinNumeral = q.replace(/^#+/, '');

  return contratos.filter((c) => {
    const codigo = c.code != null ? String(c.code) : '';
    return (
      (codigo !== '' && codigo.includes(sinNumeral)) ||
      comparable(c.tenantName).includes(q) ||
      comparable(c.propertyAddress).includes(q) ||
      comparable(c.propertyCity).includes(q)
    );
  });
}
