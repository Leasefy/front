import { normalizarEncabezado } from './columnas-de-tercero';

/**
 * MC-30 (MIG-C, 04-10): la columna «Por qué» del mapeo decía el ALIAS
 * normalizado con que se reconoció la columna («codigo», «maneja tercero»):
 * sin tildes, en minúsculas y con palabras que la persona nunca escribió.
 * Ahora lo dice en palabras y con el pedazo del encabezado TAL COMO viene en
 * su archivo («Su nombre incluye «Maneja Tercero»»).
 */
export function porQueDelMapeo(m: {
  columna: string;
  porque: string;
  exacto?: boolean;
  isManual?: boolean;
  campo?: string | null;
}): string {
  if (m.isManual) return 'Lo elegiste a mano';
  if (!m.campo || !m.porque) return 'No la reconocimos: elige el campo o déjala sin usar';
  if (m.exacto || normalizarEncabezado(m.columna) === m.porque) {
    return 'Por el nombre de la columna';
  }
  const fragmento = fragmentoDelEncabezado(m.columna, m.porque);
  return fragmento ? `Su nombre incluye «${fragmento}»` : 'Por el nombre de la columna';
}

/** El pedazo del encabezado original (con sus tildes y mayúsculas) que dice `termino`. */
export function fragmentoDelEncabezado(columna: string, termino: string): string | null {
  const palabras = columna.split(/\s+/).filter(Boolean);
  for (let i = 0; i < palabras.length; i += 1) {
    for (let j = i + 1; j <= palabras.length; j += 1) {
      const pedazo = palabras.slice(i, j).join(' ');
      if (normalizarEncabezado(pedazo) === termino) return pedazo.replace(/[¿?:.()]+$/g, '').replace(/^[¿(]+/, '');
    }
  }
  return null;
}
