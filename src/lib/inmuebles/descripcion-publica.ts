/**
 * 🔴 Espejo de `back/src/properties/descripcion-publica.ts` (Nico 30-10-2026: la ficha mostraba «Llaves en: otro ·
 * Precio de venta según el archivo: $1.500.000.000»). El back ya la limpia en las rutas públicas; esto es la segunda
 * defensa en la ficha. Quita sólo los segmentos con esas etiquetas exactas (separados por « · »).
 */
const ETIQUETAS_INTERNAS: readonly RegExp[] = [/^llaves en\s*:/i, /^precio de venta seg[uú]n el archivo\s*:/i, /^canon seg[uú]n el archivo\s*:/i];

export function descripcionPublica(texto: string | null | undefined): string {
  if (!texto) return '';
  const lineas: string[] = [];
  for (const linea of texto.split('\n')) {
    const segmentos = linea.split(' · ');
    const publicos = segmentos.filter((s) => !ETIQUETAS_INTERNAS.some((re) => re.test(s.trim())));
    if (publicos.length === segmentos.length) lineas.push(linea);
    else if (publicos.some((s) => s.trim())) lineas.push(publicos.join(' · '));
  }
  return lineas.join('\n').trim();
}
