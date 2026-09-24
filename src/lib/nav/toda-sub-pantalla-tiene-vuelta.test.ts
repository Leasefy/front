/**
 * 🔴 TODA SUB-PANTALLA DE CONTABILIDAD TIENE CÓMO DEVOLVERSE.
 *
 * Nico, 20-09, mirando «Deterioro de cartera»: «no tiene navegación, uno no
 * sabe cómo devolverse».
 *
 * Tenía razón y no era una sola: de las doce sub-pantallas de Contabilidad,
 * TRES —certificados, deterioro y presupuesto— no traían el «← Contabilidad»
 * que sí tenían las otras nueve. No es cosmético: a estas tres se llega desde
 * la portada Y desde los renglones de «Para el contador», así que el botón
 * atrás del navegador devuelve a sitios distintos según de dónde viniste, y a
 * veces a ninguno (cuando se abrió el enlace directo).
 *
 * Esta prueba recorre el directorio de rutas en vez de listar las pantallas a
 * mano, para que una pantalla NUEVA no pueda nacer sin salida.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(process.cwd(), 'src/app/panel/inmobiliaria/contabilidad');

describe('las sub-pantallas de Contabilidad', () => {
  it('🔴 todas tienen un camino de vuelta a la portada', () => {
    const sinSalida: string[] = [];
    for (const entrada of readdirSync(RAIZ, { withFileTypes: true })) {
      if (!entrada.isDirectory()) continue;
      const pagina = join(RAIZ, entrada.name, 'page.tsx');
      if (!existsSync(pagina)) continue;
      const texto = readFileSync(pagina, 'utf8');
      const vuelve =
        texto.includes('href="/panel/inmobiliaria/contabilidad"') ||
        texto.includes("href='/panel/inmobiliaria/contabilidad'");
      if (!vuelve) sinSalida.push(entrada.name);
    }
    expect(sinSalida).toEqual([]);
  });

  it('hay al menos diez sub-pantallas: la prueba de arriba no está midiendo cero', () => {
    const conPagina = readdirSync(RAIZ, { withFileTypes: true }).filter(
      (e) => e.isDirectory() && existsSync(join(RAIZ, e.name, 'page.tsx')),
    );
    expect(conPagina.length).toBeGreaterThanOrEqual(10);
  });
});
