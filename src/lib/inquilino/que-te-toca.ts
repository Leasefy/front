/**
 * «Te toca: …» — la primera línea del Inicio del inquilino (Nico eligió
 * «3 secciones», 21-10-2026; de la reunión: «entro y… ¿qué hago?»).
 *
 * Una sola cosa, la más urgente, con lo que ya tiene la pantalla:
 *   · quien arrienda: lo vencido, si no el próximo pago, si no «estás al día»;
 *   · quien no: conseguir su tope, si no esperar sus postulaciones, si no
 *     escoger en su catálogo.
 * `null` cuando todavía no se sabe (no se afirma nada mientras carga).
 *
 * PURO: lo prueba `que-te-toca.test.ts`.
 */
import type { VistaDeTuArriendo } from './tu-arriendo';

export interface QueTeToca {
  texto: string;
  href?: string;
}

export function queTeToca(e: {
  arrienda: boolean;
  /** La vista de su arriendo (`vistaDeTuArriendo`); `null` mientras carga o si falló. */
  vista: VistaDeTuArriendo | null;
  aprobacionVigente: boolean;
  postulacionesEnCurso: number;
  es: boolean;
  plata: (n: number) => string;
  dia: (iso: string) => string;
}): QueTeToca | null {
  const { es } = e;
  if (e.arrienda) {
    if (!e.vista) return null;
    if (e.vista.vencido) {
      return {
        texto: es
          ? `Te toca: pagar ${e.plata(e.vista.vencido.valor)}, vencido desde el ${e.dia(e.vista.vencido.desde)}.`
          : `To do: pay ${e.plata(e.vista.vencido.valor)}, overdue since ${e.dia(e.vista.vencido.desde)}.`,
        href: '/inquilino/pagos',
      };
    }
    if (e.vista.proximo) {
      return {
        texto: es
          ? `Te toca: pagar ${e.plata(e.vista.proximo.valor)} antes del ${e.dia(e.vista.proximo.fecha)}.`
          : `To do: pay ${e.plata(e.vista.proximo.valor)} before ${e.dia(e.vista.proximo.fecha)}.`,
        href: '/inquilino/pagos',
      };
    }
    return { texto: es ? 'Estás al día con tu arriendo.' : 'You are up to date with your rent.' };
  }
  if (!e.aprobacionVigente) {
    return {
      texto: es ? 'Te toca: conocer hasta cuánto te arriendan.' : 'To do: find out how much you can rent.',
      href: '/inquilino/aprobacion',
    };
  }
  if (e.postulacionesEnCurso > 0) {
    const n = e.postulacionesEnCurso;
    return {
      texto: es
        ? `Tienes ${n === 1 ? '1 postulación' : `${n} postulaciones`} en curso: te avisamos cuando respondan.`
        : `You have ${n === 1 ? '1 application' : `${n} applications`} in progress: we will let you know when they answer.`,
      href: '/inquilino/aplicaciones',
    };
  }
  return {
    texto: es ? 'Te toca: escoger un inmueble de tu catálogo.' : 'To do: pick a property from your catalog.',
    href: '/inquilino/para-ti',
  };
}
