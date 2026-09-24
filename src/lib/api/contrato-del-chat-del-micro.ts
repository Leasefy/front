/**
 * El contrato REAL de las rutas del chat que el front llama a mano (señales
 * del cerebro, 👍/👎), sacado del micro por
 * `scripts/contrato-del-chat-del-micro.mjs` — y un validador ESTRICTO para
 * que las pruebas comparen contra él lo que de verdad sale por la red.
 *
 * 🔴 Por qué estricto: el micro valida con zod no estricto, que BORRA en
 * silencio las llaves que no conoce y contesta 200. Una prueba que sólo mira
 * «¿mandamos `turnoId`?» pasa aunque el micro lo tire a la basura. Acá una
 * llave que el esquema no declara es un error.
 *
 * Lo usan las pruebas (`src/lib/chat/senales.test.ts`, la del hook del chat).
 */

import contrato from './contrato-del-chat-del-micro.json';

export interface EsquemaDelMicro {
  type?: string;
  properties?: Record<string, EsquemaDelMicro>;
  required?: string[];
  enum?: unknown[];
  format?: string;
  minLength?: number;
  maxLength?: number;
  items?: EsquemaDelMicro;
  maxItems?: number;
}

export interface RutaDelContrato {
  archivo: string;
  cuerpo?: EsquemaDelMicro;
  respuesta?: EsquemaDelMicro;
}

const RUTAS = contrato.rutas as Record<string, RutaDelContrato>;

/** De qué commit del micro salió el extracto (para los mensajes de error). */
export const CONTRATO_SACADO_DE: string = contrato.sacadoDe;

/**
 * La ruta del contrato que atiende `METODO url`, con su clave
 * (`POST /api/agency/{agencyId}/…`), o `null` si el micro no la expone.
 */
export function rutaDelMicro(
  metodo: string,
  url: string,
): { clave: string; ruta: RutaDelContrato } | null {
  const camino = new URL(url, 'http://x').pathname;
  for (const [clave, ruta] of Object.entries(RUTAS)) {
    const [m, plantilla] = clave.split(' ');
    if (m !== metodo.toUpperCase()) continue;
    const patron = new RegExp(
      '^' + plantilla.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{[^/}]+\\?\}/g, '[^/]+') + '$',
    );
    if (patron.test(camino)) return { clave, ruta };
  }
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Los errores de `valor` contra `esquema` (vacío = cumple). Sólo lo que usan
 * los esquemas de estas rutas: objeto, texto, booleano, lista, enum, uuid y
 * largos.
 */
export function erroresContraElEsquema(
  esquema: EsquemaDelMicro,
  valor: unknown,
  camino = 'cuerpo',
): string[] {
  const errores: string[] = [];
  switch (esquema.type) {
    case 'object': {
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return [`${camino}: no es un objeto`];
      const obj = valor as Record<string, unknown>;
      const props = esquema.properties ?? {};
      for (const r of esquema.required ?? []) {
        if (obj[r] === undefined) errores.push(`${camino}.${r}: falta (es obligatorio)`);
      }
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        if (!props[k]) {
          errores.push(`${camino}.${k}: el micro no declara esta llave (la borraría en silencio)`);
          continue;
        }
        errores.push(...erroresContraElEsquema(props[k], v, `${camino}.${k}`));
      }
      return errores;
    }
    case 'string': {
      if (typeof valor !== 'string') return [`${camino}: no es texto`];
      if (esquema.minLength !== undefined && valor.length < esquema.minLength) {
        errores.push(`${camino}: más corto que ${esquema.minLength}`);
      }
      if (esquema.maxLength !== undefined && valor.length > esquema.maxLength) {
        errores.push(`${camino}: más largo que ${esquema.maxLength}`);
      }
      if (esquema.format === 'uuid' && !UUID.test(valor)) errores.push(`${camino}: no es un uuid`);
      if (esquema.enum && !esquema.enum.includes(valor)) {
        errores.push(`${camino}: «${valor}» no está en ${JSON.stringify(esquema.enum)}`);
      }
      return errores;
    }
    case 'boolean':
      return typeof valor === 'boolean' ? [] : [`${camino}: no es booleano`];
    case 'array': {
      if (!Array.isArray(valor)) return [`${camino}: no es una lista`];
      if (esquema.maxItems !== undefined && valor.length > esquema.maxItems) {
        errores.push(`${camino}: más de ${esquema.maxItems} elementos`);
      }
      valor.forEach((v, i) => {
        if (esquema.items) errores.push(...erroresContraElEsquema(esquema.items, v, `${camino}[${i}]`));
      });
      return errores;
    }
    default:
      return [`${camino}: tipo de esquema no soportado por el validador (${String(esquema.type)})`];
  }
}
