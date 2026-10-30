/**
 * La tarjeta de LO PROGRAMADO del chat (29-10-2026): «¿qué tengo programado?».
 *
 * Cada orden programada con su cuándo («cada día 5 a las 8:00 a. m.»), la
 * próxima vez, el último disparo y lo que quedó listo esperando el clic. Sus
 * botones («Pausar», «Reanudar», «Cancelar», «Hacer ahora») son MENSAJES del
 * hilo: el micro manda la frase exacta y el front la envía tal cual. Nada
 * navega.
 *
 * Viaja en el `done` del stream (clave NUEVA `programado`) con la forma de
 * `AiHubChatTarjetaProgramado` del micro (`en-el-chat/contrato-del-hilo.ts`).
 * Tolerante: lo que no se entiende se descarta.
 */

export type EstadoDeLaProgramada = 'activa' | 'pausada' | 'terminada';
export type TipoDeBotonDeLoProgramado = 'pausar' | 'reanudar' | 'cancelar' | 'hacer_ahora';

export interface BotonDeLoProgramado {
  tipo: TipoDeBotonDeLoProgramado;
  etiqueta: string;
  /** La frase que se manda al hilo, tal cual. */
  mensaje: string;
}

export interface ProgramadaEnLaTarjeta {
  id: string;
  cuando: string;
  que: string;
  estado: EstadoDeLaProgramada;
  proxima: string | null;
  proximaDicha: string;
  ultimoDisparo: { en: string; detalle: string } | null;
  esperaClic: { desde: string; texto: string } | null;
  botones: BotonDeLoProgramado[];
}

export interface TarjetaDeLoProgramado {
  programadas: ProgramadaEnLaTarjeta[];
  hayListas: boolean;
}

const ESTADOS: EstadoDeLaProgramada[] = ['activa', 'pausada', 'terminada'];
const TIPOS: TipoDeBotonDeLoProgramado[] = ['pausar', 'reanudar', 'cancelar', 'hacer_ahora'];

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

function leerBoton(v: unknown): BotonDeLoProgramado | null {
  if (!esObjeto(v) || !TIPOS.includes(v.tipo as TipoDeBotonDeLoProgramado)) return null;
  const etiqueta = texto(v.etiqueta);
  const mensaje = texto(v.mensaje);
  return etiqueta && mensaje ? { tipo: v.tipo as TipoDeBotonDeLoProgramado, etiqueta, mensaje } : null;
}

function leerProgramada(v: unknown): ProgramadaEnLaTarjeta | null {
  if (!esObjeto(v) || !ESTADOS.includes(v.estado as EstadoDeLaProgramada)) return null;
  const id = texto(v.id);
  const cuando = texto(v.cuando);
  const que = texto(v.que);
  if (!id || !cuando || !que) return null;
  const u = esObjeto(v.ultimoDisparo) ? v.ultimoDisparo : null;
  const e = esObjeto(v.esperaClic) ? v.esperaClic : null;
  return {
    id,
    cuando,
    que,
    estado: v.estado as EstadoDeLaProgramada,
    proxima: texto(v.proxima),
    proximaDicha: texto(v.proximaDicha) ?? '',
    ultimoDisparo: u && texto(u.en) && texto(u.detalle) ? { en: texto(u.en)!, detalle: texto(u.detalle)! } : null,
    esperaClic: e && texto(e.texto) ? { desde: texto(e.desde) ?? '', texto: texto(e.texto)! } : null,
    botones: Array.isArray(v.botones) ? v.botones.map(leerBoton).filter((b): b is BotonDeLoProgramado => b !== null) : [],
  };
}

/** La tarjeta de lo programado, o `null` si no llegó o no trae ninguna orden que se entienda. */
export function leerTarjetaDeLoProgramado(v: unknown): TarjetaDeLoProgramado | null {
  if (!esObjeto(v) || !Array.isArray(v.programadas)) return null;
  const programadas = v.programadas.map(leerProgramada).filter((p): p is ProgramadaEnLaTarjeta => p !== null);
  if (programadas.length === 0) return null;
  return { programadas, hayListas: v.hayListas === true || programadas.some((p) => p.esperaClic !== null) };
}

/** «8 de nov., 9:00 a. m.» en hora de Bogotá; `null` si la fecha no se lee. */
export function fechaDelDisparo(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
