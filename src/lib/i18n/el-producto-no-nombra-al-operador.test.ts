/**
 * 🔴 EL PRODUCTO NO LE HABLA AL OPERADOR, LE HABLA AL CLIENTE.
 *
 * ── El defecto, dos veces ──────────────────────────────────────────────────
 *
 * El 18-09 Nico preguntó por qué, encima del giro a un propietario, salía
 * «Falta aplicar la migración 20260917120000_modalidad_del_mandato». Se
 * escribió `enCristiano` y el identificador dejó de verse.
 *
 * El 20-09, con «Deterioro de cartera» abierto, salía esto:
 *
 *     «Esta función todavía no está disponible. Por ahora, el cálculo se ve,
 *      pero no se puede proponer ni aprobar. **La aplica Víctor.**»
 *
 * El identificador se había traducido; el NOMBRE DEL OPERADOR no. Es el mismo
 * error un nivel más adentro: quien administra inmuebles no sabe quién es
 * Víctor, no puede escribirle, y lo único que aprende es que hay una persona
 * suelta entre él y su contabilidad.
 *
 * Había once frases así repartidas por el panel.
 *
 * ── Qué se permite y qué no ───────────────────────────────────────────────
 *
 *   · `src/app/admin/`: es el backoffice INTERNO de Leasefy. Ahí el lector ES
 *     el operador y nombrarlo es lo correcto.
 *   · Comentarios de código: son para quien lee el código.
 *   · El `motivo` del back sigue viajando entero: queda en el `title`, en el
 *     DOM y en el log. Lo que cambia es lo que se PINTA.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';


/*
 * ⏱️ 60 s: este guardián lee el repo entero y compite con las demás pruebas de
 * la suite. Ver `el-producto-tutea.test.ts` para el caso en que 30 s no
 * alcanzaron — medir un guardián aislado no lo mide dentro de la suite.
 */
const TIEMPO_DE_RECORRER_EL_REPO = 60_000

const RAIZ = join(process.cwd(), 'src');
const EXCEPCIONES = [join(RAIZ, 'app/admin')];

/**
 * El nombre de quien despliega, que el cliente no tiene por qué leer.
 *
 * ⚠️ Sólo «Víctor», no cualquier nombre propio: «Nicolás García» aparece como
 * nombre DE EJEMPLO en datos de prueba y en una pantalla de demostración, y
 * eso es legítimo. Lo que esta prueba persigue es la instrucción de despliegue
 * —«la aplica X»— colada en el producto, no los nombres.
 */
const NOMBRES = /\bv[íi]ctor\b/i;

function fuentes(dir: string, salida: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules') continue;
    const ruta = join(dir, entrada);
    if (EXCEPCIONES.some((e) => ruta.startsWith(e))) continue;
    if (statSync(ruta).isDirectory()) fuentes(ruta, salida);
    else if (/\.(ts|tsx)$/.test(ruta) && !/\.(test|spec)\.tsx?$/.test(ruta)) salida.push(ruta);
  }
  return salida;
}

/**
 * Los renglones que NO son comentario.
 *
 * ⚠️ Con un rastreador de estado y no con «¿empieza por `*`?»: los comentarios
 * de bloque de este repo citan a Nico en varias líneas, y las de en medio no
 * empiezan por asterisco. Sin esto, el guardián marcaría citas.
 */
function renglonesDeCodigo(texto: string): { n: number; linea: string }[] {
  const salida: { n: number; linea: string }[] = [];
  let enBloque = false;
  texto.split('\n').forEach((linea, i) => {
    const sinBloques = linea.replace(/\/\*[\s\S]*?\*\//g, '');
    let visible = sinBloques;
    if (enBloque) {
      const cierra = visible.indexOf('*/');
      if (cierra === -1) return;
      visible = visible.slice(cierra + 2);
      enBloque = false;
    }
    const abre = visible.indexOf('/*');
    if (abre !== -1) {
      enBloque = true;
      visible = visible.slice(0, abre);
    }
    const sinLinea = visible.replace(/\/\/.*$/, '');
    if (sinLinea.trim()) salida.push({ n: i + 1, linea: sinLinea });
  });
  return salida;
}

describe('el producto no nombra a quien lo despliega', () => {
  it('🔴 ninguna pantalla del panel le dice al cliente quién aplica una migración', () => {
    const culpables: string[] = [];
    for (const ruta of fuentes(RAIZ)) {
      const texto = readFileSync(ruta, 'utf8');
      if (!NOMBRES.test(texto)) continue;
      for (const { n, linea } of renglonesDeCodigo(texto)) {
        if (NOMBRES.test(linea)) culpables.push(`${ruta.replace(RAIZ, 'src')}:${n}`);
      }
    }
    expect(culpables).toEqual([]);
  });

  it('el guardián mira archivos de verdad: no está recorriendo una carpeta vacía', () => {
    expect(fuentes(RAIZ).length).toBeGreaterThan(500);
  });
});
