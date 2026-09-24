/**
 * Plugin de rehype que envuelve en un elemento propio el texto NUEVO de una
 * respuesta que se está revelando (desde el carácter `desde` del markdown), para
 * que quien pinta lo funda en vez de hacerlo aparecer de golpe.
 *
 * Por qué así (Nico, 23-09: «que el final se sienta pulido»): en la fase
 * acelerada del revelado (`revelado.ts`) el texto llega por palabras y después
 * por bloques; a esa velocidad, sin fundido, se ve como un parpadeo. El
 * markdown se vuelve a parsear en cada cuadro, así que no hay un nodo «viejo» y
 * uno «nuevo» que animar: hay que decidir por POSICIÓN en el texto fuente. Cada
 * nodo de texto de hast trae la posición de donde salió; lo que empieza en o
 * después de `desde` es lo recién llegado.
 *
 * `etiqueta` alterna entre dos nombres de elemento (`revelar-a`/`revelar-b`)
 * mapeados a dos componentes distintos: si fuera siempre el mismo, React
 * reusaría el `<span>` del bloque anterior (misma posición, mismo tipo) y la
 * animación no volvería a correr.
 */

interface Posicion {
  start?: { offset?: number };
  end?: { offset?: number };
}
interface NodoTexto {
  type: 'text';
  value: string;
  position?: Posicion;
}
interface NodoElemento {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: Nodo[];
  position?: Posicion;
}
interface NodoRaiz {
  type: 'root';
  children: Nodo[];
}
type Nodo = NodoTexto | NodoElemento | NodoRaiz | { type: string; children?: Nodo[] };

function envolver(etiqueta: string, hijo: NodoTexto): NodoElemento {
  return { type: 'element', tagName: etiqueta, properties: {}, children: [hijo] };
}

function recorrer(padre: { children?: Nodo[] }, desde: number, etiqueta: string): void {
  if (!padre.children) return;
  const nuevos: Nodo[] = [];
  for (const hijo of padre.children) {
    if (hijo.type !== 'text') {
      recorrer(hijo as { children?: Nodo[] }, desde, etiqueta);
      nuevos.push(hijo);
      continue;
    }
    const texto = hijo as NodoTexto;
    const inicio = texto.position?.start?.offset;
    const fin = texto.position?.end?.offset;
    if (inicio === undefined || fin === undefined || fin <= desde) {
      nuevos.push(texto);
      continue;
    }
    if (inicio >= desde) {
      nuevos.push(envolver(etiqueta, texto));
      continue;
    }
    // El corte cae dentro de este nodo. Sólo se parte si el texto es copia
    // literal del fuente (sin escapes ni entidades); si no, se funde entero.
    const corte = desde - inicio;
    if (texto.value.length === fin - inicio && corte > 0 && corte < texto.value.length) {
      nuevos.push({ type: 'text', value: texto.value.slice(0, corte) });
      nuevos.push(envolver(etiqueta, { type: 'text', value: texto.value.slice(corte) }));
    } else {
      nuevos.push(envolver(etiqueta, texto));
    }
  }
  padre.children = nuevos;
}

export function rehypeRevelar(opciones: { desde: number | null; etiqueta: string }) {
  return (arbol: NodoRaiz) => {
    if (opciones.desde === null || opciones.desde < 0) return;
    recorrer(arbol, opciones.desde, opciones.etiqueta);
  };
}
