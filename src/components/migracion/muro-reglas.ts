/**
 * Las reglas del muro de migración, sin React.
 *
 * Todo lo que decide **si alguien entra o no al producto** vive acá y es
 * puro: se puede probar sin montar una pantalla, y se lee de un vistazo.
 * La UI (`MuroDeMigracion.tsx`) sólo pinta lo que estas funciones dicen.
 *
 * 🔴 No hay rutas exentas. Hubo una lista —las pantallas de cada paso— y
 * era un agujero: el muro mandaba a `/migracion/terceros`, y ahí la persona
 * veía la plataforma entera con el sidebar y todo. Ahora el contenido de
 * cada paso vive ADENTRO del muro, y el muro tapa todas las rutas del panel
 * hasta que la migración se resuelva.
 */

import type {
  EstadoDeMigracion,
  PasoDeMigracion,
  IdDePasoDeMigracion,
} from '@/lib/api/migracion-estado.service';

const IDS_VALIDOS: readonly IdDePasoDeMigracion[] = [
  'terceros',
  'propiedades',
  'contratos',
  'puc',
  'contables',
];

const ESTADOS_VALIDOS = ['listo', 'pendiente', 'no_disponible'] as const;

function esPaso(v: unknown): v is PasoDeMigracion {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    IDS_VALIDOS.includes(p.id as IdDePasoDeMigracion) &&
    (ESTADOS_VALIDOS as readonly string[]).includes(p.estado as string) &&
    (p.detalle === null || typeof p.detalle === 'string') &&
    typeof p.conteo === 'number'
  );
}

/**
 * 🔴 El único lugar del front que puede decir «bloqueá».
 *
 * Recibe lo que sea que haya devuelto la red y devuelve `null` —es decir,
 * panel abierto— ante cualquier cosa que no sea, sin ambigüedad, un estado
 * bien formado que pide bloquear. `bloquea` tiene que ser el booleano `true`
 * literal: un `"true"`, un `1` o un campo ausente NO bloquean.
 *
 * Esta asimetría es a propósito. Un falso negativo (no bloqueo a quien debía
 * migrar) se corrige solo en la siguiente carga; un falso positivo deja a un
 * cliente afuera del producto que paga.
 */
export function normalizarEstado(bruto: unknown): EstadoDeMigracion | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const e = bruto as Record<string, unknown>;
  if (e.bloquea !== true) return null;
  if (!Array.isArray(e.pasos)) return null;
  if (!e.pasos.every(esPaso)) return null;
  const resuelta =
    e.resuelta === 'completada' || e.resuelta === 'omitida' ? e.resuelta : null;
  // Un muro sin un solo paso que hacer es un callejón: no se levanta.
  if (e.pasos.length === 0) return null;
  return { bloquea: true, resuelta, pasos: e.pasos as PasoDeMigracion[] };
}

/**
 * Un paso que el back declara `no_disponible` no cuenta para nada.
 *
 * Hoy los cinco pasos existen; el estado queda como fallo genérico —si un
 * módulo se cae o se apaga por bandera, el back lo marca así y el muro no
 * deja a nadie encerrado esperando una pantalla que no responde.
 */
export function esExigible(paso: PasoDeMigracion): boolean {
  return paso.estado !== 'no_disponible';
}

/**
 * Un paso se puede empezar sólo cuando todos los EXIGIBLES anteriores están
 * listos. El orden no es una preferencia: el inmueble necesita dueño, el
 * contrato se pega a la dirección del inmueble y un asiento no se puede
 * imputar a una cuenta que todavía no existe.
 *
 * Los `no_disponible` intercalados no frenan a los que vienen después —
 * si no, un módulo caído congelaría todo lo de abajo.
 */
export function pasoHabilitado(pasos: PasoDeMigracion[], indice: number): boolean {
  const paso = pasos[indice];
  if (!paso || !esExigible(paso)) return false;
  return pasos.slice(0, indice).every((previo) => !esExigible(previo) || previo.estado === 'listo');
}

/**
 * El paso exigible sin terminar que frena al de `indice`, si hay uno.
 *
 * Se devuelve el ÚLTIMO —el inmediatamente anterior que falta— y no el
 * primero: es el que la persona tiene que hacer ahora, no el que hizo hace
 * tres pantallas.
 */
export function pasoQueFrena(
  pasos: PasoDeMigracion[],
  indice: number,
): PasoDeMigracion | null {
  for (let i = indice - 1; i >= 0; i--) {
    const previo = pasos[i];
    if (esExigible(previo) && previo.estado !== 'listo') return previo;
  }
  return null;
}

/** El paso exigible más arriba que todavía no está listo: dónde parás hoy. */
export function pasoActual(pasos: PasoDeMigracion[]): number {
  const i = pasos.findIndex((p) => esExigible(p) && p.estado !== 'listo');
  return i === -1 ? pasos.length - 1 : i;
}

/**
 * A dónde seguir desde el paso `desde`.
 *
 * El primer paso habilitado sin terminar después de él; si no hay ninguno,
 * el primero sin terminar en general (puede estar ANTES: un paso que se
 * dio por listo y volvió a pendiente porque borraron el único propietario).
 * `null` cuando no hay a dónde ir — todo listo, o el pendiente es el mismo.
 */
export function siguientePaso(pasos: PasoDeMigracion[], desde: number): number | null {
  for (let i = desde + 1; i < pasos.length; i++) {
    if (esExigible(pasos[i]) && pasos[i].estado !== 'listo' && pasoHabilitado(pasos, i)) {
      return i;
    }
  }
  const primero = pasos.findIndex((p) => esExigible(p) && p.estado !== 'listo');
  return primero !== -1 && primero !== desde ? primero : null;
}

/**
 * ¿Se puede ofrecer «Entrar al panel»? Sólo con todos los exigibles listos.
 *
 * Ofrecerlo antes convierte el muro en un cartel que se cierra con un clic,
 * que es exactamente lo que había antes de este trabajo.
 */
export function todoListo(pasos: PasoDeMigracion[]): boolean {
  const exigibles = pasos.filter(esExigible);
  return exigibles.length > 0 && exigibles.every((p) => p.estado === 'listo');
}

/**
 * El módulo de permisos que protege cada paso — el mismo `module=` que usan
 * sus páginas (`PageGuard`), que a su vez es el `@RequirePermission` del back.
 * Adentro del muro no hay `PageGuard` que redirija: se mira esto y se dice.
 */
export const MODULO_DEL_PASO: Record<IdDePasoDeMigracion, string> = {
  terceros: 'configuracion',
  propiedades: 'portafolio',
  contratos: 'contratos',
  puc: 'configuracion',
  contables: 'configuracion',
};
