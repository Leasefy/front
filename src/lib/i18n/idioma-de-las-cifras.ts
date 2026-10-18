/**
 * Con el panel en inglés, la plata y los números se escriben al estilo de
 * EE. UU.: «$ 5,450,000», «1,234 debtors» (Nico, 16-10-2026: «Estilo EE. UU.
 * en todo»). En español, como siempre: «$ 5.450.000».
 *
 * `formatCurrency` y `formatNumber` (`lib/format.ts`) sin idioma siguen lo que
 * diga este módulo, y lo dice el `I18nProvider`: avisa en el RENDER el idioma
 * ya hidratado. Antes de hidratar es siempre español —lo mismo que pintó el
 * servidor—, así que la primera pintada del navegador no difiere.
 *
 * 🔴 Lo que sale para AFUERA (un contrato, un PDF, un Excel, un WhatsApp, un
 * correo, lo que se copia para mandarle a un interesado) va al inquilino o al
 * propietario en español: pasa `'es'` explícito. Lo exige
 * `plata-para-afuera.guardian.test.ts`. En un texto en español, «$ 2,350,000»
 * se puede leer como dos coma treinta y cinco.
 */

export type IdiomaDeLasCifras = 'es' | 'en';

let idioma: IdiomaDeLasCifras = 'es';
/** Quién lo dijo: el proveedor que se desmonta sólo devuelve el español si nadie más habló después. */
let dueno: string | null = null;

/** Lo llama el `I18nProvider` en cada render, con el idioma ya hidratado. */
export function avisarIdiomaDeLasCifras(nuevo: IdiomaDeLasCifras, quien: string): void {
  idioma = nuevo;
  dueno = quien;
}

/** Al desmontarse el proveedor: vuelve al español, salvo que otro ya haya hablado. */
export function soltarIdiomaDeLasCifras(quien: string): void {
  if (dueno !== quien) return;
  idioma = 'es';
  dueno = null;
}

export function idiomaDeLasCifras(): IdiomaDeLasCifras {
  return idioma;
}

/** Para un `toLocaleString` / `Intl.NumberFormat` de PANTALLA. */
export function localeDeLasCifras(): 'es-CO' | 'en-US' {
  return idioma === 'en' ? 'en-US' : 'es-CO';
}

/** Lo único que se le pide a un formato de cifras. */
export interface FormatoDeCifras {
  format(valor: number): string;
}

/**
 * Un `Intl.NumberFormat` para un idioma. En inglés, la plata en pesos
 * (`currency: 'COP'`) se escribe «$ 2,500,000», como `formatCurrency`: `en-US`
 * escribiría «COP 2,500,000».
 */
export function formatoDeCifras(locale: string, opciones?: Intl.NumberFormatOptions): FormatoDeCifras {
  const pesosEnIngles = locale === 'en-US' && opciones?.style === 'currency' && opciones.currency === 'COP';
  if (!pesosEnIngles) return new Intl.NumberFormat(locale, opciones);
  const f = new Intl.NumberFormat(locale, { ...opciones, currencyDisplay: 'narrowSymbol' });
  return { format: (valor: number) => f.format(valor).replace('$', '$ ') };
}

/**
 * Un formato de cifras de PANTALLA que sigue al panel: el idioma se mira en
 * cada `format`, no al crearlo, así que sirve también creado una vez en el
 * módulo (`const COP = cifrasDeLaPantalla({ … })`).
 */
export function cifrasDeLaPantalla(opciones?: Intl.NumberFormatOptions): FormatoDeCifras {
  const porIdioma = new Map<string, FormatoDeCifras>();
  return {
    format(valor: number) {
      const locale = localeDeLasCifras();
      let f = porIdioma.get(locale);
      if (!f) {
        f = formatoDeCifras(locale, opciones);
        porIdioma.set(locale, f);
      }
      return f.format(valor);
    },
  };
}
