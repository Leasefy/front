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
  'propietarios',
  'inquilinos',
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
 * Hoy los seis pasos existen; el estado queda como fallo genérico —si un
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
  propietarios: 'configuracion',
  inquilinos: 'configuracion',
  propiedades: 'portafolio',
  contratos: 'contratos',
  puc: 'configuracion',
  contables: 'configuracion',
};

// ══════════════════════════════════════════════════════════════════════════
// El veredicto: qué quedó asociado y qué no
// ══════════════════════════════════════════════════════════════════════════

/**
 * 🔴 Terminar los pasos NO es terminar la migración.
 *
 * Lo que pasó de verdad (agencia de Nico, dev, 2026-09-03): 91 contratos
 * migrados, 89 **activados sin inmueble y sin propietario**, y el muro dijo
 * «todo listo» con la lista de faltantes vacía. Sin inmueble no hay
 * consignación, sin consignación no hay cobro, y sin cobro no aparece ni el
 * inquilino ni la cartera. La inmobiliaria sube todo, entra, y encuentra
 * contratos pelados — pero se entera días después, y sola.
 *
 * `todoListo()` mira los PASOS (¿subiste el archivo?). Esto mira el
 * RESULTADO (¿quedó cada contrato pegado a su inmueble y a su dueño?). El
 * muro no puede cerrar por lo primero ignorando lo segundo.
 */
export interface DeudaDeMigracion {
  /** Filas de migración de contratos de la agencia — `resumen.total`. */
  contratos: number;
  /** Contratos ACTIVOS sin inmueble: existen y no cobran un peso. */
  sinInmueble: number;
  /** Contratos ACTIVOS con inmueble y sin consignación: tampoco cobran. */
  sinPropietario: number;
  /** Filas que todavía no se activaron: el archivo entró, el contrato no. */
  pendientes: number;
  /**
   * Filas frenadas por el inquilino (correo, nombre o documento ajeno).
   *
   * `null` = **el back todavía no lo cuenta**, y entonces la línea no se
   * dibuja. Un `0` acá afirmaría «no falta ningún inquilino», que es
   * exactamente lo que no sabemos. Ver `leerDeuda()`.
   */
  sinInquilino: number | null;
}

/** Los motivos, en el orden en que se muestran y se resuelven. */
export const MOTIVOS_DE_DEUDA = [
  'sinInmueble',
  'sinPropietario',
  'sinInquilino',
  'pendientes',
] as const;

export type MotivoDeDeuda = (typeof MOTIVOS_DE_DEUDA)[number];

export interface LineaDeVeredicto {
  motivo: MotivoDeDeuda;
  cantidad: number;
}

function numeroNoNegativo(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Lee `GET /contracts/migrar/resumen` y devuelve la deuda, o `null` si la
 * respuesta no tiene la forma esperada.
 *
 * Misma asimetría que `normalizarEstado()`, al revés: acá el riesgo no es
 * encerrar a nadie sino **inventar un número**. Ante cualquier duda se
 * devuelve `null` (no se dice nada) en vez de un cero tranquilizador.
 *
 * `sinInquilino` sale de `porMotivo`, el conteo por `Faltante` que el back
 * expone (o va a exponer). Mientras no venga, queda en `null` y su línea no
 * existe — nunca en `0`.
 */
export function leerDeuda(bruto: unknown): DeudaDeMigracion | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const r = bruto as Record<string, unknown>;

  const contratos = numeroNoNegativo(r.total);
  const pendientes = numeroNoNegativo(r.pendientes);
  if (contratos === null || pendientes === null) return null;

  // Un back anterior al 2026-09-02 no manda estos dos. Ausentes ⇒ 0: son
  // conteos de una condición que ese back no podía producir todavía.
  const sinInmueble = numeroNoNegativo(r.activadosSinInmueble) ?? 0;
  const sinPropietario = numeroNoNegativo(r.activadosSinPropietario) ?? 0;

  return {
    contratos,
    pendientes,
    sinInmueble,
    sinPropietario,
    sinInquilino: leerSinInquilino(r.porMotivo),
  };
}

/**
 * Cuántas filas frena el inquilino, sumando los tres `Faltante` que son el
 * mismo problema para quien mira la pantalla: falta el correo, falta el
 * nombre, o el documento es de otra cuenta.
 */
function leerSinInquilino(porMotivo: unknown): number | null {
  if (typeof porMotivo !== 'object' || porMotivo === null) return null;
  const m = porMotivo as Record<string, unknown>;
  const partes = ['inquilino_correo', 'inquilino_nombre', 'inquilino_documento_ajeno'].map(
    (clave) => numeroNoNegativo(m[clave]),
  );
  // Si NINGUNA de las tres vino, el back no cuenta esto: no se afirma nada.
  if (partes.every((p) => p === null)) return null;
  return partes.reduce<number>((suma, p) => suma + (p ?? 0), 0);
}

/** ¿Quedó algo a medias? Un campo ausente nunca suma. */
export function hayDeuda(deuda: DeudaDeMigracion | null): boolean {
  if (!deuda) return false;
  return lineasDeVeredicto(deuda).length > 0;
}

/**
 * Las líneas del veredicto: sólo las que tienen algo que decir.
 *
 * Un motivo en `0` no se dibuja (no es una noticia) y uno en `null` tampoco
 * (no lo sabemos). El orden es el de `MOTIVOS_DE_DEUDA` y es el orden en que
 * conviene resolverlos: sin inmueble no hay a quién consignarle nada.
 */
export function lineasDeVeredicto(deuda: DeudaDeMigracion): LineaDeVeredicto[] {
  const lineas: LineaDeVeredicto[] = [];
  for (const motivo of MOTIVOS_DE_DEUDA) {
    const cantidad = deuda[motivo];
    if (typeof cantidad === 'number' && cantidad > 0) lineas.push({ motivo, cantidad });
  }
  return lineas;
}

/**
 * 🔴 La única función que puede decir «la migración terminó».
 *
 * Los pasos completos **y** sin deuda. Mientras haya un contrato que no
 * cobra, el muro no felicita a nadie: muestra el veredicto.
 *
 * `deuda` en `null` (no se pudo leer, o no hay ninguna) no frena: no se
 * bloquea por lo que no se sabe — misma regla que el resto del muro.
 */
export function migracionCerrada(
  pasos: PasoDeMigracion[],
  deuda: DeudaDeMigracion | null,
): boolean {
  return todoListo(pasos) && !hayDeuda(deuda);
}

/**
 * ¿Esta lista vacía se explica por la migración a medias?
 *
 * Inquilinos, Propietarios y Cobros salen todos de la misma cadena: contrato
 * → inmueble → consignación → cobro. Si esa cadena está cortada, la lista
 * está vacía **por eso**, y decirle a la persona «traé los que ya tenés en
 * otro sistema» —justo después de que los trajo— es pedirle que migre dos
 * veces.
 */
export function vacioPorMigracion(deuda: DeudaDeMigracion | null): boolean {
  return deuda !== null && deuda.contratos > 0 && hayDeuda(deuda);
}

// ══════════════════════════════════════════════════════════════════════════
// Fila por fila: qué le falta a ESTA
// ══════════════════════════════════════════════════════════════════════════

/**
 * Las cuatro cosas que pueden faltarle a una fila, agrupadas por lo que la
 * persona tiene que HACER. Los siete `Faltante` del back son más finos
 * (`inmueble_codigo`, `inmueble_ambiguo`, `inquilino_documento_ajeno`…) y esa
 * finura sirve para resolver la fila, no para leer una tabla de 89 filas.
 */
export type FaltaDeFila = 'inmueble' | 'propietario' | 'inquilino' | 'datos';

/** Lo mínimo que hay que mirar de una fila. Un subconjunto de `FilaDeMigracion`. */
export interface FilaMirada {
  estado: string;
  propertyId: string | null;
  propietario?: { id: string } | null;
  faltantes?: readonly string[];
}

const FALTANTES_DE_DATOS = ['fechas', 'canon', 'uso', 'dia_de_pago'];

/**
 * 🔴 No se mira UN solo camino.
 *
 * Una fila PENDIENTE dice qué le falta en `faltantes`; una ACTIVADA no —
 * ya pasó por la puerta— y su deuda sólo se ve en sus columnas
 * (`propertyId` nulo, sin `propietario`). Mirar sólo `faltantes` deja las 89
 * filas activadas de la agencia de Nico como si no les faltara nada, que es
 * exactamente el bug que esta pantalla existe para no repetir.
 */
export function faltasDeLaFila(fila: FilaMirada): FaltaDeFila[] {
  if (fila.estado === 'DESCARTADO') return [];
  const faltantes = fila.faltantes ?? [];
  const faltas: FaltaDeFila[] = [];

  const sinInmueble =
    fila.propertyId === null || faltantes.some((f) => f.startsWith('inmueble'));
  if (sinInmueble) faltas.push('inmueble');

  // Sin inmueble no se puede consignar: pedir además el propietario sería
  // pedir dos cosas cuando sólo una se puede hacer ahora.
  if (!sinInmueble && (faltantes.includes('propietario') || !fila.propietario)) {
    faltas.push('propietario');
  }

  if (faltantes.some((f) => f.startsWith('inquilino'))) faltas.push('inquilino');
  if (faltantes.some((f) => FALTANTES_DE_DATOS.includes(f))) faltas.push('datos');

  return faltas;
}
