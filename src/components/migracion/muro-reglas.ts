/**
 * Las reglas del muro de migración, sin React.
 *
 * Todo lo que decide **si alguien entra o no al producto** vive acá y es
 * puro: se puede probar sin montar una pantalla, y se lee de un vistazo.
 * La UI (`MuroDeMigracion.tsx`) sólo pinta lo que estas funciones dicen.
 */

import type {
  EstadoDeMigracion,
  PasoDeMigracion,
  IdDePasoDeMigracion,
} from '@/lib/api/migracion-estado.service';

/**
 * Las rutas que el muro NUNCA tapa.
 *
 * 🔴 Sin esto el muro es una trampa: el paso 2 manda a
 * `/inmuebles/importar`, que es una pantalla del panel — y el muro la
 * taparía, dejando a la persona encerrada mirando el muro que la mandó ahí,
 * sin manera de avanzar.
 *
 * La lista es de PREFIJOS: `/panel/inmobiliaria/migracion` cubre también
 * `/migracion/terceros`, que es donde vive el paso 1 completo.
 */
export const RUTAS_EXENTAS_DEL_MURO: readonly string[] = [
  // Paso 1 (y la propia secuencia de arranque, que es la misma pantalla sin muro).
  '/panel/inmobiliaria/migracion',
  // Paso 2 — el importador de inmuebles, que ya existía.
  '/panel/inmobiliaria/inmuebles/importar',
  // Paso 3 — el importador de contratos, que ya existía.
  '/panel/inmobiliaria/contratos/migrar',
  // Pasos 4 y 5 — el plan de cuentas y los registros contables. Ya los cubre
  // el prefijo de arriba; van explícitos para que nadie los pierda si un día
  // se mueven de carpeta.
  '/panel/inmobiliaria/migracion/puc',
  '/panel/inmobiliaria/migracion/contables',
];

/**
 * ¿Esta ruta se salva del muro?
 *
 * Prefijo estricto: coincide exacta, o seguida de `/`. Comparar con
 * `startsWith` a secas dejaría pasar `/panel/inmobiliaria/migracion-otra-cosa`,
 * que no es un paso de la migración.
 */
export function estaExentaDelMuro(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  // Sin la barra final: `/migracion/` y `/migracion` son la misma pantalla.
  const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return RUTAS_EXENTAS_DEL_MURO.some(
    (exenta) => ruta === exenta || ruta.startsWith(`${exenta}/`),
  );
}

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
 * ¿Se puede ofrecer «Ya terminé»? Sólo con todos los exigibles listos.
 *
 * Ofrecerlo antes convierte el muro en un cartel que se cierra con un clic,
 * que es exactamente lo que había antes de este trabajo.
 */
export function todoListo(pasos: PasoDeMigracion[]): boolean {
  const exigibles = pasos.filter(esExigible);
  return exigibles.length > 0 && exigibles.every((p) => p.estado === 'listo');
}

/** A dónde manda cada paso. `null` = no hay pantalla todavía. */
export const RUTA_DEL_PASO: Record<IdDePasoDeMigracion, string | null> = {
  terceros: '/panel/inmobiliaria/migracion/terceros',
  propiedades: '/panel/inmobiliaria/inmuebles/importar',
  contratos: '/panel/inmobiliaria/contratos/migrar',
  puc: '/panel/inmobiliaria/migracion/puc',
  contables: '/panel/inmobiliaria/migracion/contables',
};
