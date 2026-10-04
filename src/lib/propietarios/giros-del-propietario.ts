/**
 * Lo que la lista y la ficha dicen de los GIROS de un propietario, sin
 * pantalla (SEGUIMIENTO-FRONT, P-10 de QA de Propietarios, 03-10-2026).
 *
 * 🔴 `pendingBalance` CAMBIÓ DE SIGNIFICADO en el back (commit 5731a4e2):
 *  - ANTES: lo generado en Dispersiones y sin girar. Por eso Ana Lucía, Hernán,
 *    Gloria, Rubén y Teresa salían «Al día» con giros atrasados en su estado de
 *    cuenta, y Paula «$3.656.150» contra «Atrasado $23.698.900».
 *  - AHORA: lo VENCIDO y sin girar de SU parte de las cuotas del lado
 *    PROPIETARIO —la misma fuente y el mismo vencimiento del giro que su estado
 *    de cuenta—, con `girosVencidos` (cuántas cuotas) y `giroVencidoDesde` (la
 *    más vieja). Lo generado en Dispersiones viaja aparte, en
 *    `generadoSinGirar`.
 *
 * Así que «Pendiente» ya no es la palabra: es un GIRO ATRASADO (lo que la
 * inmobiliaria le debió girar y no le ha girado). Lo generado se dice aparte y
 * con su nombre, porque puede incluir el mes que todavía no vence.
 *
 * Al asesor el back le manda todo esto en `null` (`plataOculta`): acá no se
 * vuelve cero ni «Al día» (P-21).
 */

import type { Propietario } from '@/lib/types/inmobiliaria';

export type CamposDeLosGiros = Pick<
  Propietario,
  'pendingBalance' | 'plataOculta' | 'girosVencidos' | 'giroVencidoDesde' | 'generadoSinGirar'
> &
  Partial<Pick<Propietario, 'proximoGiro' | 'activeLeases' | 'copropiedadesArrendadas'>>;

export interface GirosParaMostrar {
  /** Quien mira no ve la plata del propietario: no se afirma nada. */
  oculto: boolean;
  /** Vencido y sin girar (su parte). 0 sin atraso. */
  atrasado: number;
  /** Cuántas cuotas suyas tienen el giro vencido. `null` = el back no lo mandó. */
  girosVencidos: number | null;
  /** `AAAA-MM-DD` del giro vencido más viejo, o `null`. */
  desde: string | null;
  /** Lo generado en Dispersiones que no ha salido. `null` = el back no lo mandó. */
  generadoSinGirar: number | null;
  /** Hay giros atrasados (y quien mira lo puede ver). */
  conAtraso: boolean;
  /**
   * 🔴 COLA-FRONT (04-10, la recomendada): tiene algo arrendado, nada atrasado
   * y NINGÚN giro programado (`proximoGiro: null`): no está «Al día», no tiene
   * día de giro. Con un back que no manda `proximoGiro`, siempre `false`.
   */
  sinDiaDeGiro: boolean;
}

/** ¿Tiene algún inmueble arrendado, propio o en copropiedad? */
function tieneAlgoArrendado(p: CamposDeLosGiros): boolean {
  return (p.activeLeases ?? 0) + (p.copropiedadesArrendadas ?? 0) > 0;
}

function monto(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function entero(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : null;
}

export function girosDelPropietario(p: CamposDeLosGiros): GirosParaMostrar {
  const oculto = p.plataOculta === true;
  if (oculto) {
    return {
      oculto,
      atrasado: 0,
      girosVencidos: null,
      desde: null,
      generadoSinGirar: null,
      conAtraso: false,
      sinDiaDeGiro: false,
    };
  }
  const atrasado = monto(p.pendingBalance);
  return {
    sinDiaDeGiro: atrasado <= 0 && p.proximoGiro === null && tieneAlgoArrendado(p),
    oculto,
    atrasado,
    girosVencidos: entero(p.girosVencidos),
    desde: typeof p.giroVencidoDesde === 'string' && p.giroVencidoDesde ? p.giroVencidoDesde.slice(0, 10) : null,
    generadoSinGirar:
      typeof p.generadoSinGirar === 'number' && Number.isFinite(p.generadoSinGirar) ? p.generadoSinGirar : null,
    conAtraso: atrasado > 0,
  };
}

/**
 * «1 ago», con el año si no es el de `hoy` («1 ago 2025»). La fecha viaja como
 * día civil (`AAAA-MM-DD`): se lee a mediodía UTC para que en Bogotá no caiga
 * al día anterior.
 */
export function fechaCortaDelGiro(iso: string, hoy: Date = new Date()): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const otroAnio = d.getUTCFullYear() !== hoy.getFullYear();
  return d
    .toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      ...(otroAnio ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    })
    .replace(/\./g, '')
    .replace(/ de /g, ' ');
}

/** El `t` de la pantalla, con o sin parámetros. */
type T = (clave: string, params?: Record<string, string | number>) => string;

/**
 * La línea de detalle de un giro atrasado: «3 giros vencidos desde el 1 ago».
 * `null` si no hay atraso o el back no mandó con qué decirlo (uno anterior).
 */
export function detalleDelAtraso(g: GirosParaMostrar, t: T, hoy: Date = new Date()): string | null {
  if (!g.conAtraso) return null;
  const n = g.girosVencidos;
  const fecha = g.desde ? fechaCortaDelGiro(g.desde, hoy) : null;
  if (n === null || n === 0) {
    return fecha ? t('inmobiliaria.propietario.giros.vencidoDesde', { fecha }) : null;
  }
  if (fecha) {
    return n === 1
      ? t('inmobiliaria.propietario.giros.unoDesde', { fecha })
      : t('inmobiliaria.propietario.giros.variosDesde', { n, fecha });
  }
  return n === 1 ? t('inmobiliaria.propietario.giros.uno') : t('inmobiliaria.propietario.giros.varios', { n });
}

/** Suma lo generado sin girar de la lista; `null` si ningún propietario lo trae (back anterior). */
export function generadoSinGirarDeLaLista(propietarios: readonly CamposDeLosGiros[]): number | null {
  let alguno = false;
  let total = 0;
  for (const p of propietarios) {
    const g = girosDelPropietario(p);
    if (g.generadoSinGirar !== null) {
      alguno = true;
      total += g.generadoSinGirar;
    }
  }
  return alguno ? total : null;
}

/**
 * Los datos por completar del propietario: los del back y, si no tiene día de
 * giro (`sinDiaDeGiro`), «día de giro» (COLA-FRONT, 04-10, la recomendada).
 */
export function datosPendientesDelPropietario(
  p: CamposDeLosGiros & Pick<Propietario, 'datosPendientes'>,
): NonNullable<Propietario['datosPendientes']> {
  const delBack = p.datosPendientes ?? [];
  if (!girosDelPropietario(p).sinDiaDeGiro || delBack.includes('diaDeGiro')) return delBack;
  return [...delBack, 'diaDeGiro'];
}
