'use client';

/**
 * Los textos del estado de cuenta, en un solo lugar: `locales/es.json` y
 * `locales/en.json`, bloque `estadoDeCuenta` (guardia:
 * `src/lib/i18n/claves-estado-de-cuenta.test.ts`).
 *
 * Se leen ESTÁTICOS, del diccionario en castellano, y no con `t()`: es un
 * documento que se ENTREGA, sus palabras son las que la inmobiliaria ya conoce
 * de su formato de siempre, y `t()` devuelve la clave cuando no la encuentra —
 * un documento con `estadoDeCuenta.titulo` impreso encima sería peor que no
 * tenerlo—. El porqué de no pasar por `useI18n` está en `useTextoDelEstado`,
 * abajo. El inglés ya está en `en.json`: el día que el documento se traduzca,
 * se cambia `useTextoDelEstado` y nada más.
 */

import es from '@/lib/i18n/locales/es.json';

/** `{ a: { b: 'x' } }` → `{ 'prefijo.a.b': 'x' }`. */
function aplanar(
  bloque: Record<string, unknown>,
  prefijo: string,
  salida: Record<string, string> = {},
): Record<string, string> {
  for (const [clave, valor] of Object.entries(bloque)) {
    const ruta = `${prefijo}.${clave}`;
    if (typeof valor === 'string') salida[ruta] = valor;
    else if (valor && typeof valor === 'object') {
      aplanar(valor as Record<string, unknown>, ruta, salida);
    }
  }
  return salida;
}

export const TEXTO: Record<string, string> = aplanar(
  es.estadoDeCuenta as Record<string, unknown>,
  'estadoDeCuenta',
);

export function interpolar(
  texto: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return texto;
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    params[k] === undefined ? `{{${k}}}` : String(params[k]),
  );
}

/** El texto de una clave, ya interpolado. */
export function texto(
  clave: string,
  params?: Record<string, string | number>,
): string {
  const propio = TEXTO[clave];
  return propio ? interpolar(propio, params) : clave;
}

/**
 * 🔴 Este documento NO pasa por `useI18n`, y es a propósito.
 *
 * Se monta en SEIS lugares: la pantalla del panel, la ficha del contrato, la
 * del inquilino, la del propietario, los dos portales y —la que manda— la
 * página PÚBLICA del enlace, que vive fuera de todo proveedor porque quien la
 * abre no tiene sesión. `useI18n` TIRA sin `I18nProvider` encima, y
 * `useOptionalI18n` tampoco alcanza: las pruebas de las tres fichas que lo
 * hospedan reemplazan `@/lib/i18n` con un doble que sólo exporta `useI18n`, y
 * llamar a lo que el doble no exporta tumbaba esas pantallas enteras.
 *
 * Un resumen en una ficha no puede tumbar la ficha. Las palabras del estado de
 * cuenta viven arriba, en castellano, que es el idioma del documento que la
 * inmobiliaria le entrega a su cliente en Colombia; el día que haya que
 * traducirlo, se cambia acá y en un solo lugar.
 *
 * Se deja como hook —y no como `texto` a secas— para que ese día el cambio sea
 * de una línea y no de cuarenta llamadas.
 */
export function useTextoDelEstado() {
  return texto;
}
