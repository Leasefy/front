/**
 * Lo que una página por público (`/para/*`) tiene que cumplir con la identidad
 * nueva (Cadence 2, la landing «Producto en vivo»): papel, foto en estrías y la
 * corriente de píxeles en vez del héroe negro con velos, degradados y vidrio.
 * Lo usan las pruebas de cada página.
 */

/** Clases del diseño viejo que no pueden volver. */
export const CLASES_PROHIBIDAS = [
  /\bbg-gradient-to-/,
  /\bbackdrop-blur/,
  /\bbg-black\/\d/,
  /\bfrom-black/,
  /\bvia-black/,
  /\bbg-clip-text\b/,
  /\bfont-bold\b/,
  /\bfont-semibold\b/,
  /\btext-\[(8|9|10|11|12)px\]/,
  /\btext-xs\b/,
  /\bblur-\[/,
];

/** Cada clase prohibida que aparece, con el elemento donde está. */
export function clasesProhibidas(raiz: Element): string[] {
  const encontradas: string[] = [];
  raiz.querySelectorAll('[class]').forEach((el) => {
    const clase = el.getAttribute('class') ?? '';
    for (const re of CLASES_PROHIBIDAS) {
      const m = clase.match(re);
      if (m) encontradas.push(`${el.tagName.toLowerCase()} · ${m[0]}`);
    }
  });
  return encontradas;
}

/** Los enlaces de la página como «texto → destino». */
export function enlaces(raiz: Element): string[] {
  return Array.from(raiz.querySelectorAll('a[href]')).map(
    (a) => `${(a.textContent ?? '').replace(/\s+/g, ' ').trim()} → ${a.getAttribute('href')}`,
  );
}

/** Cuántos botones azules (la acción principal) hay dentro de un bloque. */
export function botonesAzules(raiz: Element): number {
  return Array.from(raiz.querySelectorAll('a[class]')).filter((a) =>
    (a.getAttribute('class') ?? '').includes('bg-[#1A40FF]'),
  ).length;
}
