/**
 * Quién subió una carga de la migración, cuándo y cuánto tardó, en una línea.
 *
 * 🔴 06-10-2026 (Nico, con captura): la migración NO va al centro de procesos
 * («todo al centro, menos migración», 01-10); cada paso de la Puesta en marcha
 * muestra SUS cargas. El centro decía quién y cuándo; la lista del paso tiene
 * que decirlo también. Puro y probado (`datos-de-la-carga.test.ts`).
 */

const PARTES = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h12',
});

/** «6 de octubre, 8:31 a. m.», armado por partes: igual en todo motor. */
function cuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = Object.fromEntries(PARTES.formatToParts(d).map((x) => [x.type, x.value]));
  const hora24 = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hourCycle: 'h23' }).format(d));
  const franja = hora24 < 12 ? 'a. m.' : 'p. m.';
  return `${p.day} de ${p.month}, ${Number(p.hour)}:${p.minute} ${franja}`;
}

function duracion(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const minutos = Math.round(ms / 60_000);
  if (minutos < 1) return 'menos de un minuto';
  if (minutos < 60) return minutos === 1 ? '1 minuto' : `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  const h = horas === 1 ? '1 hora' : `${horas} horas`;
  return resto === 0 ? h : `${h} y ${resto === 1 ? '1 minuto' : `${resto} minutos`}`;
}

export interface DatosDeUnaCarga {
  subidoPor?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  /** Terminó (o falló): se dice cuánto tardó. */
  terminada?: boolean;
  /** Corre ahora en el servidor: se dice cuánto lleva (contra `ahora`). */
  enCurso?: boolean;
  /** El reloj de «cuánto lleva»; por defecto, ahora. */
  ahora?: Date;
  /**
   * `false` cuando `actualizadoEn` no mide el trabajo sino la última vez que
   * se tocó la carga (inmuebles: la persona revisa y crea cuando quiere, así
   * que «tardó» contaría su espera). Entonces se dice cuándo terminó.
   */
  duracionConfiable?: boolean;
}

export function lineaDeLaCarga(c: DatosDeUnaCarga): string {
  const partes: string[] = [];
  if (c.subidoPor) partes.push(`Subida por ${c.subidoPor}`);
  if (c.creadoEn) {
    const t = cuando(c.creadoEn);
    if (t) partes.push(partes.length ? `el ${t}` : `Subida el ${t}`);
  }
  // Una carga que espera a la persona (por revisar, por crear) no «lleva»
  // nada: no se le pone reloj. Sólo la que terminó (tardó) o la que corre (lleva).
  if (c.creadoEn && c.terminada && c.actualizadoEn && c.duracionConfiable === false) {
    const t = cuando(c.actualizadoEn);
    if (t) partes.push(`terminó el ${t}`);
  } else if (c.creadoEn && c.terminada && c.actualizadoEn) {
    const d = duracion(new Date(c.actualizadoEn).getTime() - new Date(c.creadoEn).getTime());
    if (d) partes.push(`tardó ${d}`);
  } else if (c.creadoEn && c.enCurso) {
    const d = duracion((c.ahora ?? new Date()).getTime() - new Date(c.creadoEn).getTime());
    if (d) partes.push(`lleva ${d}`);
  }
  return partes.join(' · ');
}
