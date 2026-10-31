/**
 * La descripción del inmueble con formato (Nico 31-10-2026: «que en el text area de la descripción tenga lo de bold,
 * etc… para hacer mejor una descripción, agregar emojis»).
 *
 * Se guarda como TEXTO con las marcas de WhatsApp —`*negrilla*`, `_cursiva_`, líneas con «- » o «1. »— y no como
 * HTML: así lo que la inmobiliaria copia a WhatsApp se ve igual allá, una descripción vieja (texto plano) se lee igual
 * que antes, y nada de lo que escriba puede inyectar marcado en la ficha. `**doble**` también es negrilla (quien lo
 * trae de otro editor). Las marcas no cruzan líneas.
 *
 * Este archivo es puro: lo usan el editor (la barra de formato) y la ficha (que lo pinta).
 */

export type Trozo =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'negrilla'; hijos: Trozo[] }
  | { tipo: 'cursiva'; hijos: Trozo[] };

export type Bloque =
  | { tipo: 'parrafo'; lineas: Trozo[][] }
  | { tipo: 'vinetas'; items: Trozo[][] }
  | { tipo: 'numerada'; desde: number; items: Trozo[][] };

/** Una marca abre al inicio o tras un espacio/signo, pega al texto, y cierra antes de un espacio/signo o el final. */
const MARCA = /(^|[\s([{¡¿"'“‘])(\*\*|\*|_)(?=\S)(.*?\S)\2(?=$|[\s)\]}.,;:!?¡¿"'”’])/u;

const VINETA = /^\s*[-•*]\s+/;
const NUMERO = /^\s*(\d{1,3})[.)]\s+/;

/** Los trozos de UNA línea: texto, negrilla y cursiva (anidables una vez). */
export function trozosDeLaLinea(linea: string): Trozo[] {
  const trozos: Trozo[] = [];
  let resto = linea;
  while (resto) {
    const m = MARCA.exec(resto);
    if (!m) {
      trozos.push({ tipo: 'texto', texto: resto });
      break;
    }
    const antes = resto.slice(0, m.index) + m[1];
    if (antes) trozos.push({ tipo: 'texto', texto: antes });
    const hijos = trozosDeLaLinea(m[3]);
    trozos.push(m[2] === '_' ? { tipo: 'cursiva', hijos } : { tipo: 'negrilla', hijos });
    resto = resto.slice(m.index + m[0].length);
  }
  return juntarTextos(trozos);
}

function juntarTextos(trozos: Trozo[]): Trozo[] {
  const juntos: Trozo[] = [];
  for (const t of trozos) {
    const ultimo = juntos[juntos.length - 1];
    if (t.tipo === 'texto' && ultimo?.tipo === 'texto') ultimo.texto += t.texto;
    else juntos.push(t);
  }
  return juntos;
}

/**
 * Los bloques de la descripción: párrafos (cada línea se respeta, como antes con `whitespace-pre-line`), listas con
 * viñetas y listas numeradas. Una línea en blanco separa párrafos.
 */
export function bloquesDeLaDescripcion(texto: string | null | undefined): Bloque[] {
  const bloques: Bloque[] = [];
  let actual: Bloque | null = null;
  const cerrar = () => {
    if (actual) bloques.push(actual);
    actual = null;
  };
  for (const cruda of (texto ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const linea = cruda.trimEnd();
    if (!linea.trim()) {
      cerrar();
      continue;
    }
    const numero = NUMERO.exec(linea);
    const vineta = !numero && VINETA.exec(linea);
    if (numero) {
      const item = trozosDeLaLinea(linea.slice(numero[0].length));
      if (actual?.tipo === 'numerada') actual.items.push(item);
      else {
        cerrar();
        actual = { tipo: 'numerada', desde: Number(numero[1]), items: [item] };
      }
    } else if (vineta) {
      const item = trozosDeLaLinea(linea.slice(vineta[0].length));
      if (actual?.tipo === 'vinetas') actual.items.push(item);
      else {
        cerrar();
        actual = { tipo: 'vinetas', items: [item] };
      }
    } else {
      const lineaDeTexto = trozosDeLaLinea(linea.trim());
      if (actual?.tipo === 'parrafo') actual.lineas.push(lineaDeTexto);
      else {
        cerrar();
        actual = { tipo: 'parrafo', lineas: [lineaDeTexto] };
      }
    }
  }
  cerrar();
  return bloques;
}

function textoDeLosTrozos(trozos: Trozo[]): string {
  return trozos.map((t) => (t.tipo === 'texto' ? t.texto : textoDeLosTrozos(t.hijos))).join('');
}

/**
 * La descripción sin marcas, para donde no hay formato (el CSV de los portales, un resumen, un largo): la negrilla y
 * la cursiva quedan como texto y las viñetas como «• ».
 */
export function textoPlanoDeLaDescripcion(texto: string | null | undefined): string {
  return bloquesDeLaDescripcion(texto)
    .map((b) => {
      if (b.tipo === 'parrafo') return b.lineas.map(textoDeLosTrozos).join('\n');
      if (b.tipo === 'vinetas') return b.items.map((i) => `• ${textoDeLosTrozos(i)}`).join('\n');
      return b.items.map((i, n) => `${b.desde + n}. ${textoDeLosTrozos(i)}`).join('\n');
    })
    .join('\n\n');
}

// ── Lo que hace la barra de formato ─────────────────────────────────────────────────────────────────────────────

export interface Edicion {
  valor: string;
  /** La selección que queda después (para seguir escribiendo donde iba). */
  inicio: number;
  fin: number;
}

/** Cambia la selección por `texto` y deja el cursor al final de lo insertado (un emoji, por ejemplo). */
export function insertar(valor: string, inicio: number, fin: number, texto: string): Edicion {
  const nuevo = valor.slice(0, inicio) + texto + valor.slice(fin);
  const cursor = inicio + texto.length;
  return { valor: nuevo, inicio: cursor, fin: cursor };
}

/**
 * Negrilla (`*`) o cursiva (`_`) sobre la selección. Sin selección deja las dos marcas con el cursor en medio; si la
 * selección ya está marcada, la desmarca; con varias líneas marca cada una (las marcas no cruzan líneas). Los espacios
 * de los bordes quedan afuera: `* hola*` no sería negrilla.
 */
export function alternarMarca(valor: string, inicio: number, fin: number, marca: '*' | '_'): Edicion {
  if (inicio === fin) {
    const nuevo = valor.slice(0, inicio) + marca + marca + valor.slice(fin);
    return { valor: nuevo, inicio: inicio + 1, fin: inicio + 1 };
  }
  // Ya marcada por fuera (la marca justo antes y justo después): se quita.
  if (valor.slice(inicio - 1, inicio) === marca && valor.slice(fin, fin + 1) === marca) {
    const nuevo = valor.slice(0, inicio - 1) + valor.slice(inicio, fin) + valor.slice(fin + 1);
    return { valor: nuevo, inicio: inicio - 1, fin: fin - 1 };
  }
  const elegido = valor.slice(inicio, fin);
  // Marcada por dentro (la selección incluye las marcas): se quita.
  if (elegido.length > 2 && elegido.startsWith(marca) && elegido.endsWith(marca) && !elegido.includes('\n')) {
    const sinMarca = elegido.slice(1, -1);
    return { valor: valor.slice(0, inicio) + sinMarca + valor.slice(fin), inicio, fin: inicio + sinMarca.length };
  }
  const marcado = elegido
    .split('\n')
    .map((linea) => {
      const m = /^(\s*)(.*?)(\s*)$/.exec(linea);
      if (!m || !m[2]) return linea;
      return `${m[1]}${marca}${m[2]}${marca}${m[3]}`;
    })
    .join('\n');
  return { valor: valor.slice(0, inicio) + marcado + valor.slice(fin), inicio, fin: inicio + marcado.length };
}

/**
 * Viñetas o lista numerada en las líneas de la selección (enteras). Si todas ya son de ese tipo, se quita; si eran de
 * la otra, se cambia. Las líneas en blanco se dejan como están.
 */
export function alternarLista(valor: string, inicio: number, fin: number, tipo: 'vinetas' | 'numerada'): Edicion {
  const desde = valor.lastIndexOf('\n', inicio - 1) + 1;
  const finDeLinea = valor.indexOf('\n', Math.max(fin - (fin > inicio && valor[fin - 1] === '\n' ? 1 : 0), inicio));
  const hasta = finDeLinea === -1 ? valor.length : finDeLinea;
  const lineas = valor.slice(desde, hasta).split('\n');
  const conTexto = lineas.filter((l) => l.trim());
  const yaLoSon = conTexto.length > 0 && conTexto.every((l) => (tipo === 'numerada' ? NUMERO.test(l) : VINETA.test(l) && !NUMERO.test(l)));
  let n = 0;
  const nuevas = lineas.map((l) => {
    if (!l.trim()) return l;
    const limpia = l.replace(NUMERO, '').replace(VINETA, '');
    if (yaLoSon) return limpia;
    n += 1;
    return tipo === 'numerada' ? `${n}. ${limpia}` : `- ${limpia}`;
  });
  const bloque = nuevas.join('\n');
  return { valor: valor.slice(0, desde) + bloque + valor.slice(hasta), inicio: desde, fin: desde + bloque.length };
}
