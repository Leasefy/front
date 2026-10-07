/**
 * El primer canon de un contrato que todavía no existe, para el resumen de
 * «Crear contrato» (QA-CONT C-22, 03-10-2026).
 *
 * 🔴 Es un ESPEJO de la regla del back (`inmobiliaria/cobros/motor-de-mora/
 * regla-del-arriendo.ts`: `diaComercial`, `diasComerciales`, `valorPorDias`)
 * y sólo del CANON: el IVA, las retenciones y los conceptos los pone el back
 * al generar la cuota. Por eso la pantalla lo llama «primer canon» y no
 * «primera cuota»: un número que se parece al de la cuota y no es el mismo
 * sería peor que no decir nada.
 *
 *  · Prorrateado (`prorratear = true`): meses comerciales de 30 días; el primer
 *    período va del día de inicio al último del mes y cobra `canon ÷ 30 × días`.
 *    Un inicio el día 1 cobra el mes completo.
 *  · Fecha a fecha (`false`): del día de inicio al día anterior del mes
 *    siguiente, el canon completo, y vence el día en que empieza.
 */

export const DIAS_DEL_MES_COMERCIAL = 30;

interface FechaCivil {
  anio: number;
  mes: number;
  dia: number;
}

export interface PrimerCanon {
  /** `'YYYY-MM-DD'` del primer día del período. */
  desde: string;
  /** `'YYYY-MM-DD'` del último día del período. */
  hasta: string;
  /** Días comerciales que se cobran (30 = mes completo). */
  dias: number;
  /** Pesos del canon del período (sin IVA, conceptos ni retenciones). */
  valor: number;
  /** `true` cuando cobra menos de un mes completo. */
  prorrateado: boolean;
}

function leer(iso: string): FechaCivil | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) return null;
  const f = { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
  if (f.mes < 1 || f.mes > 12 || f.dia < 1 || f.dia > diasEnElMes(f.anio, f.mes)) return null;
  return f;
}

function iso(f: FechaCivil): string {
  return `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;
}

function diasEnElMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** El último día de cualquier mes es el 30; un 31 no existe (espejo del back). */
function diaComercial(f: FechaCivil): number {
  if (f.dia >= diasEnElMes(f.anio, f.mes)) return DIAS_DEL_MES_COMERCIAL;
  return Math.min(f.dia, DIAS_DEL_MES_COMERCIAL);
}

/** Días comerciales de `desde` a `hasta` dentro del mismo mes, los dos incluidos. */
function diasComercialesDelMes(desde: FechaCivil, hasta: FechaCivil): number {
  return Math.max(0, diaComercial(hasta) - diaComercial(desde) + 1);
}

/** El día anterior al mismo día del mes siguiente (el 31 sin par cae en el último). */
function finDelPeriodoFechaAFecha(f: FechaCivil): FechaCivil {
  const mes = f.mes === 12 ? 1 : f.mes + 1;
  const anio = f.mes === 12 ? f.anio + 1 : f.anio;
  const dia = Math.min(f.dia, diasEnElMes(anio, mes));
  const d = new Date(Date.UTC(anio, mes - 1, dia) - 24 * 60 * 60 * 1000);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

/**
 * El primer canon, o `null` si falta la fecha de inicio o el canon (no se
 * inventa un número sobre datos que todavía no están).
 */
export function primerCanon(args: {
  inicio: string;
  canon: number;
  prorratear: boolean;
}): PrimerCanon | null {
  const inicio = leer(args.inicio);
  if (!inicio || !(args.canon > 0)) return null;

  if (!args.prorratear) {
    const hasta = finDelPeriodoFechaAFecha(inicio);
    return {
      desde: iso(inicio),
      hasta: iso(hasta),
      dias: DIAS_DEL_MES_COMERCIAL,
      valor: Math.round(args.canon),
      prorrateado: false,
    };
  }

  const ultimo: FechaCivil = { ...inicio, dia: diasEnElMes(inicio.anio, inicio.mes) };
  const dias = Math.min(diasComercialesDelMes(inicio, ultimo), DIAS_DEL_MES_COMERCIAL);
  return {
    desde: iso(inicio),
    hasta: iso(ultimo),
    dias,
    valor: Math.round((args.canon * dias) / DIAS_DEL_MES_COMERCIAL),
    prorrateado: dias < DIAS_DEL_MES_COMERCIAL,
  };
}
