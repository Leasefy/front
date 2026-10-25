/**
 * 🔴 LA PLATA DE CONTABILIDAD, CON UN SOLO FORMATO (QA de Contabilidad, CB-17 /
 * CB-09, 03-10-2026). PURA.
 *
 * En la misma zona convivían tres formas de escribir un peso: «$80.330.850»
 * (deterioro, certificados, presupuesto: `formatCurrency` de `lib/types/
 * inmobiliaria`, sin espacio), «$ 1.500.000» (el libro: `Monto`, con espacio) y
 * «$-119.100» (el signo menos DESPUÉS del símbolo, en los avisos que arma el
 * back). La de la casa es la de `Monto` (C1-ESQUEMA Q4 a): «$ 1.234.567», y un
 * negativo con el menos tipográfico ADELANTE: «−$ 119.100».
 *
 * `plataEnElTexto` arregla las cifras que llegan dentro de una frase del back
 * («2 movimientos por $205.830», «operación $0 contra libro $-119.100») sin
 * tocar el resto del texto. `sinEmojis` quita los 🔴/⚠️ que el back mete en sus
 * frases: la pantalla ya pinta el ícono del DS al lado, y dos íconos para el
 * mismo aviso (el emoji y el del cartel) se leen como dos avisos.
 */

import { formatCurrency } from '@/lib/format';

/**
 * «$ 1.234.567» · «−$ 119.100» · «$ 0». En pantalla sigue al idioma del panel;
 * un informe que se descarga pasa 'es' (sale como en Colombia).
 */
export function plata(valor: number, locale?: 'es' | 'en'): string {
  if (!Number.isFinite(valor)) return formatCurrency(0, locale);
  return valor < 0 ? `−${formatCurrency(Math.abs(valor), locale)}` : formatCurrency(valor, locale);
}

/**
 * Un peso escrito dentro de una frase: «$8.757.000», «$ 8.757.000», «$-119.100»,
 * «-$119.100». El grupo de miles es el de es-CO (punto); los centavos no se
 * escriben en esta zona.
 */
const PESO_EN_EL_TEXTO = /([-−]?)\$\s?([-−]?)(\d{1,3}(?:\.\d{3})+|\d+)(?![\d.,]*\d)/g;

/** Las cifras de una frase del back, con el formato de la casa. El resto queda igual. */
export function plataEnElTexto(texto: string): string {
  return texto.replace(PESO_EN_EL_TEXTO, (_todo, antes: string, despues: string, cifra: string) => {
    const negativo = Boolean(antes || despues);
    return `${negativo ? '−' : ''}$ ${cifra}`;
  });
}

/**
 * Los emojis de semáforo y de alerta que el back pone al principio o en medio
 * de una frase (🔴 🟠 🟡 🟢 ⚠️ ⛔ ✅ ❌ ❗ ℹ️). Se quitan con el espacio que los
 * acompaña; el resto de la frase no se toca.
 */
const EMOJIS_DE_AVISO = /\s*(?:\u{1F534}|\u{1F7E0}|\u{1F7E1}|\u{1F7E2}|⚠|⛔|✅|❌|❗|ℹ)️?\s*/gu;

export function sinEmojis(texto: string): string {
  return texto
    .replace(EMOJIS_DE_AVISO, (coincidencia, desplazamiento: number) =>
      // Al principio no deja nada; en medio, un espacio (separaba dos palabras).
      desplazamiento === 0 ? '' : ' ',
    )
    .replace(/ {2,}/g, ' ')
    .trim();
}

/**
 * 🔴 Lo que es del equipo, no de quien usa la pantalla (revisora r25, B6 y B8,
 * 23-10-2026). El back a veces deja en sus frases una nota interna: un código de
 * QA y un nombre del equipo entre paréntesis («… en el 1003 (CB-K-09, Nico
 * 05-10-2026)») o una frase que dice quién del equipo lo hace («La integración
 * la hace Víctor.»). El arreglo de fondo es del back (va en «Datos para
 * Víctor»); esto es el respaldo para que la pantalla no lo diga mientras tanto.
 *
 * `sinNotasInternas` borra el paréntesis con un código de QA (`CB-K-09`) o con
 * un nombre del equipo seguido de una fecha («Nico 05-10-2026»), con el espacio
 * de adelante. Un paréntesis con el nombre de una persona sin fecha («(Víctor
 * Pérez)», un inquilino o un proveedor) se queda: puede ser de verdad.
 */
const PARENTESIS_INTERNO =
  /\s*\((?=[^()]*(?:\b[A-Z]{2,}-[A-Z0-9]+(?:-[A-Z0-9]+)*\b|\b(?:Nico|V[ií]ctor)\s+\d{1,2}-\d{1,2}-\d{4}))[^()]*\)/g;

export function sinNotasInternas(texto: string): string {
  return texto
    .replace(PARENTESIS_INTERNO, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/**
 * La frase que dice QUIÉN del equipo hace algo («La integración la hace
 * Víctor.») se cambia por `enVez`. Sólo para avisos donde un nombre únicamente
 * puede ser del equipo (el del proveedor de nómina electrónica): en una frase
 * cualquiera, «Víctor» puede ser un inquilino.
 */
const FRASE_CON_EL_EQUIPO = /[^.!?]*\b(?:Nico|V[ií]ctor)\b[^.!?]*[.!?]?/g;

export function sinElEquipoEnLaFrase(texto: string, enVez = ''): string {
  return texto
    .replace(FRASE_CON_EL_EQUIPO, () => (enVez ? ` ${enVez}` : ''))
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** Una frase del back lista para la pantalla: sin notas del equipo, sin emojis y con la plata de la casa. */
export function textoDelBack(texto: string): string {
  return plataEnElTexto(sinEmojis(sinNotasInternas(texto)));
}
