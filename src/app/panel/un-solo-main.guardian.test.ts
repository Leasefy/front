/**
 * 🔴 UN SOLO `<main>` POR PÁGINA.
 *
 * `src/app/panel/inmobiliaria/layout.tsx` ya envuelve todo en un `<main>` —el
 * que recibe el foco cuando alguien usa «Saltar al contenido principal»—, así
 * que una página que además abre el suyo deja DOS landmarks `main` en el mismo
 * documento.
 *
 * Qué cuesta, medido en `/pagos/cobranza/llamadas`: un lector de pantalla
 * anuncia dos «principal» y el enlace de salto lleva al de afuera, que empieza
 * en la barra de navegación — así que saltar al contenido no salta nada.
 *
 * Además, casi siempre el `<main>` de adentro venía con su PROPIO tope de
 * ancho (`max-w-7xl`, 1.280 px) encima del tope del panel (1.920): la misma
 * pantalla a medio usar que Nico vio en Generar dispersión el 22-09 («¿por qué
 * no utilizas todo el ancho? ¡para eso lo tienes!»). Los nueve que tenían las
 * dos cosas se arreglaron ese día.
 *
 * 🔴 Los que quedan están DECLARADOS abajo: son de Postulaciones y Estudio, que
 * todavía no pasaron por el molde. La lista no dice «está bien», dice «ya
 * estaba». Lo que esta prueba impide es que aparezca uno nuevo.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PANEL = 'src/app/panel';
const LAYOUT = 'src/app/panel/inmobiliaria/layout.tsx';

function conMain(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) conMain(p, out);
    else if (
      /\.tsx$/.test(p) &&
      !/\.test\.tsx$/.test(p) &&
      p !== LAYOUT &&
      readFileSync(p, 'utf8').includes('<main')
    ) {
      out.push(p);
    }
  }
  return out.sort();
}

/** Los que ya tenían su propio `<main>` el 22-09-2026. */
/**
 * 🔴 22-09 · La lista quedó VACÍA salvo el layout del propietario.
 *
 * Eran 41. Las 40 de `inmobiliaria/` —19 de Cobranza, 13 de Postulaciones y
 * Estudio, 4 de Retención, y las demás— pasaron a `<div>`: el `<main>` lo pone
 * el layout y era el de afuera el que recibía el foco.
 *
 * El de `(landlord)/layout.tsx` se queda y NO es un defecto: el panel del
 * propietario no cuelga del layout de inmobiliaria —no hay
 * `src/app/panel/layout.tsx`—, así que ese es su único landmark. Está acá para
 * que el barrido no lo cuente como nuevo.
 */
const DECLARADOS: readonly string[] = ['src/app/panel/(landlord)/layout.tsx'];

describe('🔴 el panel tiene un solo landmark principal', () => {
  it('ninguna página NUEVA abre su propio <main>', () => {
    const nuevos = conMain(PANEL).filter((p) => !DECLARADOS.includes(p));
    expect(
      nuevos,
      `El layout del panel ya pone el <main>. Estas páginas abren otro, así que\n` +
        `quedan dos landmarks «principal» y «Saltar al contenido» lleva al de\n` +
        `afuera. Usa un <div>.\n\n  ${nuevos.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('🔴 el que ya se arregló sale de la lista', () => {
    const hoy = new Set(conMain(PANEL));
    const yaArreglados = DECLARADOS.filter((p) => !hoy.has(p));
    expect(
      yaArreglados,
      `Estos ya no abren su propio <main>: sácalos de DECLARADOS.\n\n  ${yaArreglados.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('el layout SÍ pone el suyo, y uno solo', () => {
    const texto = readFileSync(LAYOUT, 'utf8');
    expect(texto.match(/<main/g) ?? []).toHaveLength(1);
  });
});
