/**
 * Publicar muchos a la vez sin duplicar y sin desordenar las fotos (Nico,
 * 20-10-2026: «si llegan a ser muchísimos inmuebles, ¿cómo escala esto?»).
 *
 * - **Varios inmuebles en paralelo** (4 por defecto), pero las fotos de UN
 *   inmueble van de a una: el back numera cada foto contando las que ya tiene
 *   (`order = count`), así que dos fotos del mismo inmueble subiendo a la vez
 *   chocan contra `@@unique([propertyId, order])`. Ir en orden además deja la
 *   primera como portada.
 * - **Nada se crea dos veces**: cada inmueble viaja con su llave
 *   (`Idempotency-Key`), y si ya tiene `idCreado` ni se pide crear. Las fotos
 *   ya subidas no se vuelven a subir.
 * - **Un inmueble que falla no frena a los demás.**
 */

export interface FotoPorSubir {
  id: string;
  archivo: File;
  subida: boolean;
}

export interface TrabajoDePublicacion<D = unknown> {
  clave: string;
  llave: string;
  datos: D;
  idCreado?: string;
  fotos: FotoPorSubir[];
}

export type ResultadoDePublicacion =
  | { que: 'publicado'; id: string }
  | { que: 'fallo'; motivo: string; id?: string };

export interface ManosDeLaPublicacion<D> {
  crear: (datos: D, llave: string) => Promise<{ id: string }>;
  subirFoto: (id: string, archivo: File) => Promise<unknown>;
  /** El error en palabras para la persona. */
  motivo: (error: unknown, que: 'crear' | 'foto') => string;
  /**
   * Cuántas fotos tiene YA el inmueble en el servidor. Sólo se pregunta al
   * retomar uno ya creado: la foto que iba subiendo cuando se cerró la pestaña
   * pudo haber llegado sin que la pantalla alcanzara a marcarla.
   */
  cuantasTiene?: (id: string) => Promise<number>;
}

export interface AvisosDeLaPublicacion {
  alEmpezar?: (clave: string) => void;
  /** El inmueble ya existe: guardar el id para no crearlo de nuevo. */
  alCrear?: (clave: string, id: string) => void;
  /** Esta foto ya está arriba: no volver a subirla. */
  alSubirFoto?: (clave: string, fotoId: string) => void;
  alTerminar?: (clave: string, resultado: ResultadoDePublicacion) => void;
}

/** Corre `tarea` con como mucho `n` a la vez, en el orden de la lista. */
export async function enParalelo<T>(items: readonly T[], n: number, tarea: (item: T) => Promise<void>): Promise<void> {
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    while (siguiente < items.length) {
      const item = items[siguiente++];
      await tarea(item);
    }
  });
  await Promise.all(trabajadores);
}

export async function publicarUno<D>(
  t: TrabajoDePublicacion<D>,
  manos: ManosDeLaPublicacion<D>,
  avisos: AvisosDeLaPublicacion = {},
): Promise<ResultadoDePublicacion> {
  avisos.alEmpezar?.(t.clave);
  let id = t.idCreado;
  if (!id) {
    try {
      id = (await manos.crear(t.datos, t.llave)).id;
    } catch (error) {
      return { que: 'fallo', motivo: manos.motivo(error, 'crear') };
    }
    avisos.alCrear?.(t.clave, id);
  }
  /*
   * Al retomar: las fotos de un inmueble suben EN ORDEN, así que si el
   * servidor tiene más de las marcadas, las siguientes pendientes ya llegaron
   * (a lo sumo una por inmueble: la que iba en vuelo). Se marcan y se saltan.
   */
  let yaLlegaron = 0;
  if (t.idCreado && manos.cuantasTiene && t.fotos.some((f) => !f.subida)) {
    try {
      const enElServidor = await manos.cuantasTiene(id);
      yaLlegaron = Math.max(0, enElServidor - t.fotos.filter((f) => f.subida).length);
    } catch {
      yaLlegaron = 0; // Sin saberlo, se suben: mejor una repetida que una que falte.
    }
  }
  let fallaron = 0;
  let primerMotivo: string | null = null;
  for (const foto of t.fotos) {
    if (foto.subida) continue;
    if (yaLlegaron > 0) {
      yaLlegaron -= 1;
      avisos.alSubirFoto?.(t.clave, foto.id);
      continue;
    }
    try {
      await manos.subirFoto(id, foto.archivo);
      avisos.alSubirFoto?.(t.clave, foto.id);
    } catch (error) {
      fallaron += 1;
      primerMotivo ??= manos.motivo(error, 'foto');
    }
  }
  if (fallaron === 0) return { que: 'publicado', id };
  const cuantas = fallaron === 1 ? '1 foto no subió' : `${fallaron} fotos no subieron`;
  return {
    que: 'fallo',
    id,
    motivo: `Ya está publicado, pero ${cuantas}${primerMotivo ? ` (${primerMotivo.replace(/\.$/, '')})` : ''}. Toca «Publicar» para reintentarlas.`,
  };
}

export async function publicarEnTandas<D>(
  trabajos: readonly TrabajoDePublicacion<D>[],
  manos: ManosDeLaPublicacion<D>,
  avisos: AvisosDeLaPublicacion = {},
  opciones: { aLaVez?: number } = {},
): Promise<Map<string, ResultadoDePublicacion>> {
  const resultados = new Map<string, ResultadoDePublicacion>();
  await enParalelo(trabajos, opciones.aLaVez ?? 4, async (t) => {
    const r = await publicarUno(t, manos, avisos);
    resultados.set(t.clave, r);
    avisos.alTerminar?.(t.clave, r);
  });
  return resultados;
}

/**
 * Deja correr como mucho `n` tareas a la vez; las demás esperan su turno en
 * orden. Para preparar fotos de a pocas (cada una ocupa memoria mientras se
 * achica) y para no bajar las fotos de cien enlaces juntas.
 */
export function limitador(n: number) {
  let enVuelo = 0;
  const esperando: Array<() => void> = [];
  return async function correr<T>(tarea: () => Promise<T>): Promise<T> {
    // El turno se PASA de mano al terminar (sin bajar la cuenta): así nadie
    // que llegue justo en ese instante se cuela por encima de los que esperan.
    if (enVuelo >= n) await new Promise<void>((turno) => esperando.push(turno));
    else enVuelo += 1;
    try {
      return await tarea();
    } finally {
      const siguiente = esperando.shift();
      if (siguiente) siguiente();
      else enVuelo -= 1;
    }
  };
}
