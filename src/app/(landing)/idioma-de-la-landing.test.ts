/**
 * Guardián del inglés de la landing estática (Nico, 23-10-2026: «toda la landing, incluidas las internas, deben
 * quedar en español e inglés»). La home y sus internas tienen UNA fuente en español; el inglés sale de
 * `public/landing/js/en.js`, que `public/landing/js/idioma.js` aplica en el navegador. Si alguien cambia o agrega
 * un texto en el HTML (o un `LF.t("…")` / `LFT("…")` en los scripts) sin su inglés, esta prueba lo dice.
 * Lo que arman los scripts a partir de datos (las vistas de Productos) se revisa al armar `en.js` (armar-en.py).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PUB = join(process.cwd(), 'public');
const leer = (ruta: string) => readFileSync(join(PUB, ruta), 'utf8');
/* nombres de idioma, atajos y letras sueltas: se quedan como están */
const SIN_TRADUCIR = new Set(['Español', 'English', 'ES', 'EN', '⌘K', 'A']);

type Ventana = typeof window & { LFI_REGISTRO?: string[]; LFI?: { aplicar: (el: Element) => void }; LF_EN?: Record<string, string> };

function diccionario(): Record<string, string> {
  const w = window as Ventana;
  delete w.LF_EN;
  new Function(leer('landing/js/en.js'))();
  return w.LF_EN ?? {};
}

function clavesDelHtml(ruta: string): string[] {
  const html = leer(ruta);
  const cuerpo = (/<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '').replace(/<script[\s\S]*?<\/script>/g, '');
  const titulo = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  const w = window as Ventana;
  w.LFI_REGISTRO = [];
  new Function(leer('landing/js/idioma.js'))();
  document.body.innerHTML = cuerpo;
  document.title = titulo;
  w.LFI!.aplicar(document.body);
  return Array.from(new Set(w.LFI_REGISTRO));
}

function clavesDeLosScripts(carpeta: string, funcion: string): string[] {
  const re = new RegExp(`${funcion}\\("([^"\\\\]+)"\\)`, 'g');
  return readdirSync(join(PUB, carpeta))
    .filter((f) => f.endsWith('.js') && f !== 'en.js' && f !== 'idioma.js')
    .flatMap((f) => Array.from(leer(`${carpeta}/${f}`).matchAll(re), (m) => m[1]));
}

describe('el inglés de la landing estática', () => {
  const EN = diccionario();
  const faltan = (claves: string[]) => claves.filter((k) => !SIN_TRADUCIR.has(k) && !(k in EN));

  it.each(['landing/index.html', 'internas/productos/index.html', 'internas/para/index.html'])(
    'todo texto de %s tiene su inglés',
    (ruta) => {
      const claves = clavesDelHtml(ruta);
      expect(claves.length).toBeGreaterThan(20);
      expect(faltan(claves)).toEqual([]);
    },
  );

  it('lo que escriben los scripts (LF.t / LFT) tiene su inglés', () => {
    const claves = [
      ...clavesDeLosScripts('landing/js', 'LF\\.t'),
      ...clavesDeLosScripts('internas/productos/js', 'LFT'),
      ...clavesDeLosScripts('internas/para/js', 'LFT'),
    ];
    expect(claves.length).toBeGreaterThan(10);
    expect(faltan(claves)).toEqual([]);
  });

  it('cada traducción trae los mismos tramos que su español', () => {
    const SEP = ' ¦ ';
    const distintos = Object.entries(EN).filter(([es, en]) => es.split(SEP).length !== en.split(SEP).length);
    expect(distintos).toEqual([]);
  });
});
