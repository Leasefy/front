/**
 * «Hace 1639 días» no lo lee nadie.
 *
 * 🔴 Nico, 2026-09-12, en el historial de un inmueble consignado en 2022:
 * «mira que ahí habla de días y debería, si se pasa de 365, volverse en años
 * más días si es que restan».
 *
 * Un número de días es exacto y a partir de cierto tamaño deja de significar
 * algo: nadie sabe cuánto es 1639 días sin hacer la cuenta. Desde el año se
 * dice en años, y los días que sobran se conservan —no se redondean— para que
 * el dato siga siendo el mismo.
 *
 * El año se cuenta como 365 días. No es el calendario exacto (los bisiestos
 * corren un día cada cuatro años) y es a propósito: acá se está redactando
 * una frase para leer de reojo, no calculando una fecha de vencimiento. Para
 * eso está la fecha exacta, que en el historial va justo debajo.
 */

const DIAS_POR_ANIO = 365;

export interface FechaRelativa {
  /** Días de diferencia, ya redondeados. Negativo = en el pasado. */
  dias: number;
  /** El texto ya armado, en el idioma pedido. */
  texto: string;
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Cómo se nombra una distancia en días, sin el «Hace»/«En». */
function distancia(dias: number, locale: string): string {
  const es = locale === 'es';
  if (dias < DIAS_POR_ANIO) {
    return es ? plural(dias, 'día', 'días') : plural(dias, 'day', 'days');
  }

  const anios = Math.floor(dias / DIAS_POR_ANIO);
  const resto = dias - anios * DIAS_POR_ANIO;
  const enAnios = es
    ? plural(anios, 'año', 'años')
    : plural(anios, 'year', 'years');
  if (resto === 0) return enAnios;

  const enDias = es
    ? plural(resto, 'día', 'días')
    : plural(resto, 'day', 'days');
  return es ? `${enAnios} y ${enDias}` : `${enAnios} and ${enDias}`;
}

/**
 * «Hoy», «Ayer», «Hace 12 días», «Hace 4 años y 178 días».
 *
 * `ahora` se pasa para poder probarlo: sin él, una prueba de «hace 4 años»
 * cambiaría de resultado cada día.
 */
export function fechaRelativa(
  fecha: Date | string,
  locale: string,
  ahora: Date = new Date(),
): FechaRelativa {
  const objeto = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const es = locale === 'es';

  if (Number.isNaN(objeto.getTime())) return { dias: 0, texto: '' };

  const dias = Math.round(
    (objeto.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dias === 0) return { dias, texto: es ? 'Hoy' : 'Today' };
  if (dias === 1) return { dias, texto: es ? 'Mañana' : 'Tomorrow' };
  if (dias === -1) return { dias, texto: es ? 'Ayer' : 'Yesterday' };

  const cuanto = distancia(Math.abs(dias), locale);
  return {
    dias,
    texto:
      dias > 0
        ? es
          ? `En ${cuanto}`
          : `In ${cuanto}`
        : es
          ? `Hace ${cuanto}`
          : `${cuanto} ago`,
  };
}
