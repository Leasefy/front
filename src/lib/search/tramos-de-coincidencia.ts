/**
 * tramos-de-coincidencia — qué parte de un resultado del ⌘K coincide con lo
 * escrito, para resaltarla.
 *
 * Se compara sin tildes y sin mayúsculas: quien escribe «maria» busca
 * «María», y «cobranza» tiene que encender «Cobranza». Lo resaltado se corta
 * sobre el texto ORIGINAL (con sus tildes), por eso se lleva un mapa de cada
 * carácter normalizado a su posición en el original.
 *
 * Primero se busca la consulta entera; si no aparece tal cual, cada palabra
 * por separado («pagos cartera» resalta las dos aunque no vayan juntas). Se
 * marca la primera aparición de cada una: resaltar todas las «a» de un
 * nombre no ayuda a leer.
 */

export interface Tramo {
  texto: string;
  coincide: boolean;
}

/** Sin tildes ni diéresis y en minúscula. `ñ` → `n`: se escribe sin ella en el móvil. */
function aplanar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** El texto aplanado y, por cada carácter suyo, la posición en el original. */
function aplanarConMapa(texto: string): { plano: string; origen: number[] } {
  let plano = '';
  const origen: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    for (const c of aplanar(texto.charAt(i))) {
      plano += c;
      origen.push(i);
    }
  }
  return { plano, origen };
}

export function tramosDeCoincidencia(texto: string, consulta: string): Tramo[] {
  const buscada = aplanar(consulta).trim().replace(/\s+/g, ' ');
  if (!texto || !buscada) return [{ texto, coincide: false }];

  const { plano, origen } = aplanarConMapa(texto);
  const marcado = new Array<boolean>(texto.length).fill(false);

  const marcar = (termino: string): boolean => {
    const desde = plano.indexOf(termino);
    if (desde < 0) return false;
    const hasta = desde + termino.length - 1;
    for (let i = origen[desde]!; i <= origen[hasta]!; i++) marcado[i] = true;
    return true;
  };

  if (!marcar(buscada)) {
    for (const palabra of buscada.split(' ')) marcar(palabra);
  }

  const tramos: Tramo[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ultimo = tramos[tramos.length - 1];
    const c = texto.charAt(i);
    if (ultimo && ultimo.coincide === marcado[i]) ultimo.texto += c;
    else tramos.push({ texto: c, coincide: marcado[i]! });
  }
  return tramos;
}
