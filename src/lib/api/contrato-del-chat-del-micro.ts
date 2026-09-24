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
  /** Un tipo, o varios (`["string","null"]`: así serializa el micro un `.nullable()`). */
  type?: string | string[];
  properties?: Record<string, EsquemaDelMicro>;
  required?: string[];
  enum?: unknown[];
  format?: string;
  minLength?: number;
  maxLength?: number;
  items?: EsquemaDelMicro;
  maxItems?: number;
  /** Las variantes de una unión (las tarjetas: `propuesta`, `en_curso`…). */
  oneOf?: EsquemaDelMicro[];
  anyOf?: EsquemaDelMicro[];
  /** Todas a la vez (el micro envuelve así una referencia anulable). */
  allOf?: EsquemaDelMicro[];
  /** Un registro (`datos: Record<string, string | number>`). */
  additionalProperties?: EsquemaDelMicro | boolean;
  discriminator?: { propertyName: string; mapping?: Record<string, unknown> };
}

export interface RutaDelContrato {
  archivo: string;
  cuerpo?: EsquemaDelMicro;
  respuesta?: EsquemaDelMicro;
}

// El JSON importado tiene tipos literales (uniones con llaves distintas por
// variante) que TS no deja convertir directo al esquema genérico.
const RUTAS = contrato.rutas as unknown as Record<string, RutaDelContrato>;
const COMPONENTES = (contrato as unknown as { componentes?: Record<string, EsquemaDelMicro> }).componentes ?? {};

/**
 * Un esquema que viaja por el STREAM y no es una ruta (las piezas nuevas del
 * `done`, el evento `proceso_iniciado`), resuelto. `null` si el micro no lo
 * declara en el extracto.
 */
export function componenteDelMicro(nombre: string): EsquemaDelMicro | null {
  return COMPONENTES[nombre] ?? null;
}

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

/** Los tipos que admite el esquema (`type` suelto o en lista). */
function tiposDe(esquema: EsquemaDelMicro): string[] {
  if (Array.isArray(esquema.type)) return esquema.type;
  return esquema.type ? [esquema.type] : [];
}

/** ¿El esquema deja pasar `null`? (`["x","null"]`, o una variante `{type:"null"}`). */
function admiteNull(esquema: EsquemaDelMicro): boolean {
  if (tiposDe(esquema).includes('null')) return true;
  return [...(esquema.oneOf ?? []), ...(esquema.anyOf ?? [])].some(admiteNull);
}

/** `{type: ["object","null"]}` suelto: la marca de «o null» de un `allOf`, sin forma propia. */
function esSoloLaMarcaDeNull(esquema: EsquemaDelMicro): boolean {
  return admiteNull(esquema) && !esquema.properties && !esquema.oneOf && !esquema.anyOf && !esquema.enum;
}

/**
 * Los errores de `valor` contra `esquema` (vacío = cumple). Sólo lo que usan
 * los esquemas de estas rutas: objeto, texto, booleano, número, lista, enum,
 * uuid, largos, registros, uniones (`oneOf`/`anyOf`) y el `allOf` con el que
 * el micro envuelve una referencia anulable.
 *
 * 🔴 Estricto: una llave que el esquema no declara es un error (el micro la
 * borraría en silencio). Un esquema vacío (`{}`, «lo que devolvió el back tal
 * cual») acepta cualquier cosa, que es lo que dice.
 */
export function erroresContraElEsquema(
  esquema: EsquemaDelMicro,
  valor: unknown,
  camino = 'cuerpo',
): string[] {
  if (valor === null && admiteNull(esquema)) return [];

  if (esquema.allOf) {
    // `allOf: [Referencia, {type: [..., "null"]}]` = la referencia o `null`.
    // La segunda parte sólo dice «o null»: no tiene propiedades que validar.
    if (valor === null && esquema.allOf.some(admiteNull)) return [];
    return esquema.allOf
      .filter((s) => !esSoloLaMarcaDeNull(s))
      .flatMap((s) => erroresContraElEsquema(s, valor, camino));
  }

  const variantes = esquema.oneOf ?? esquema.anyOf;
  if (variantes) {
    const noNulas = variantes.filter((v) => !(tiposDe(v).length === 1 && tiposDe(v)[0] === 'null'));
    // Con discriminador, los errores que valen son los de SU variante.
    const clave = esquema.discriminator?.propertyName;
    if (clave && valor && typeof valor === 'object' && !Array.isArray(valor)) {
      const d = (valor as Record<string, unknown>)[clave];
      const suya = noNulas.find((v) => v.properties?.[clave]?.enum?.includes(d));
      if (!suya) return [`${camino}.${clave}: «${String(d)}» no es una variante que el micro conozca`];
      return erroresContraElEsquema(suya, valor, camino);
    }
    const intentos = noNulas.map((v) => erroresContraElEsquema(v, valor, camino));
    if (intentos.some((e) => e.length === 0)) return [];
    return [`${camino}: no cumple ninguna variante (${intentos.map((e) => e[0]).join(' | ')})`];
  }

  const tipos = tiposDe(esquema).filter((t) => t !== 'null');
  if (tipos.length === 0) return []; // `{}`: cualquier cosa.
  if (tipos.length > 1) {
    const intentos = tipos.map((t) => erroresContraElEsquema({ ...esquema, type: t }, valor, camino));
    return intentos.some((e) => e.length === 0) ? [] : intentos[0];
  }

  const errores: string[] = [];
  switch (tipos[0]) {
    case 'object': {
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return [`${camino}: no es un objeto`];
      const obj = valor as Record<string, unknown>;
      const props = esquema.properties ?? {};
      for (const r of esquema.required ?? []) {
        if (obj[r] === undefined) errores.push(`${camino}.${r}: falta (es obligatorio)`);
      }
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        if (props[k]) {
          errores.push(...erroresContraElEsquema(props[k], v, `${camino}.${k}`));
        } else if (esquema.additionalProperties && typeof esquema.additionalProperties === 'object') {
          errores.push(...erroresContraElEsquema(esquema.additionalProperties, v, `${camino}.${k}`));
        } else if (esquema.additionalProperties !== true) {
          errores.push(`${camino}.${k}: el micro no declara esta llave (la borraría en silencio)`);
        }
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
    case 'number':
      return typeof valor === 'number' && Number.isFinite(valor) ? [] : [`${camino}: no es un número`];
    case 'integer':
      return Number.isInteger(valor) ? [] : [`${camino}: no es un entero`];
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
      return [`${camino}: tipo de esquema no soportado por el validador (${String(tipos[0])})`];
  }
}
