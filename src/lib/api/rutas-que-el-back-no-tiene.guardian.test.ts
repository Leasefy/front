/**
 * 🔴🔴 GUARDIÁN: UNA LLAMADA A UNA RUTA QUE EL BACK NO EXPONE ES UN 404
 * ESPERANDO A QUE ALGUIEN CABLEE EL BOTÓN.
 *
 * ── De dónde sale ──────────────────────────────────────────────────────────
 *
 * Nico, 22-09: «haz el QA completo y soluciona todo lo que encuentres».
 *
 * El guardián hermano —`puertas-que-faltan.guardian.test.ts`— vigila el método
 * que NADIE llama. Este vigila el problema de al lado, que es peor y que aquel
 * no puede ver: el método que pide una ruta **que no existe**. Medido contra el
 * back vivo el 22-09, eran catorce, y ninguna prueba los veía porque todas
 * espían a `apiClient` con un doble: si el doble responde, la prueba pasa,
 * exista la ruta o no.
 *
 * Los catorce salieron de tres descuidos, y vale la pena nombrarlos porque son
 * los que se van a repetir:
 *
 *   1. **el verbo** — `actasApi.update` y `mantenimientoApi.update` mandaban
 *      `PATCH` y el back sólo expone `@Put(':id')`;
 *   2. **el parámetro por el lado equivocado** — analítica mandaba la métrica
 *      por la cadena de consulta (`/trends?metricId=x`) y el back la pide en el
 *      camino (`@Get('trends/:metricId')`); y era opcional, así que la llamada
 *      sin métrica se veía razonable;
 *   3. **copiar el vecino** — `propietariosApi` tenía `getConsignaciones`,
 *      `getCobros` y `getDispersiones` copiadas de `agentesApi` cambiando
 *      «agentes» por «propietarios». Las consignaciones son del AGENTE que
 *      captó y los cobros son del CONTRATO.
 *
 * ── Contra qué compara ─────────────────────────────────────────────────────
 *
 * Contra `rutas-del-back.json`, la instantánea de las ~1.100 rutas que el back
 * declara, que se regenera con `node scripts/rutas-del-back.mjs`.
 *
 * 🔴 NO sirve el OpenAPI generado (`scripts/back-openapi.json`): trae 451
 * operaciones de ~1.100 rutas, porque sólo salen las que llevan decoradores de
 * Swagger. Con eso, dos de cada tres llamadas buenas parecerían rotas.
 *
 * ── Qué hacer cuando esto se pone rojo ─────────────────────────────────────
 *
 *   · ¿la ruta es nueva en el back? → `node scripts/rutas-del-back.mjs`;
 *   · ¿el verbo o el camino están mal? → arréglalos, que es el caso común;
 *   · ¿la ruta no existe y no va a existir? → borra el método;
 *   · ¿la ruta la va a montar el back y el contrato se quiere dejar escrito?
 *     → decláralo abajo CON EL MOTIVO.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import instantanea from './rutas-del-back.json';

const DIR = 'src/lib/api';

/**
 * `GET /x/:id/y` y `` GET `/x/${id}/y` `` son la misma ruta.
 *
 * 🔴 Un segmento como `estado${query({ anio })}` NO es un parámetro: es el
 * segmento `estado` con la cadena de consulta pegada. Tratarlo como comodín
 * hacía pasar siete métodos de nómina por rutas inexistentes. Si hay texto
 * literal antes del `${`, ese texto ES el segmento.
 */
export function formaDeLaRuta(verbo: string, ruta: string): string {
  const camino = ruta
    .replace(/\?.*$/, '')
    .split('/')
    .map((s) => {
      if (s === '' || s.startsWith(':')) return '*';
      const i = s.indexOf('${');
      if (i > 0) return s.slice(0, i);
      if (i === 0) return '*';
      return s;
    })
    .join('/')
    .replace(/\/+$/, '');
  return `${verbo.toUpperCase()} ${camino}`;
}

const DEL_BACK = new Set(
  (instantanea.rutas as string[]).map((l) => {
    const i = l.indexOf(' ');
    return formaDeLaRuta(l.slice(0, i), l.slice(i + 1));
  }),
);

/**
 * ¿El back atiende esta llamada?
 *
 * 🔴 El comodín del front NO calza contra un segmento literal del back, y es a
 * propósito. La versión permisiva —comodín contra cualquier cosa, a los dos
 * lados— se tragaba en silencio tres roturas de verdad: `/documents/*​/signed-url`
 * calzaba con `GET /documents/application/:id` sólo porque tenían la misma
 * cantidad de segmentos. Un guardián que para no molestar deja pasar lo que
 * vino a buscar no sirve para nada.
 *
 * El precio es el caso legítimo al revés: el front interpola un valor de un
 * conjunto CERRADO que el back declara literal —`steps/${paso}` con el paso en
 * 1..4, `compartir/${canal}` con el canal en correo|whatsapp—. Esos son dos, y
 * van declarados abajo con su motivo. Dos declaraciones explícitas valen más
 * que tres roturas calladas.
 */
export function elBackLaAtiende(forma: string): boolean {
  return DEL_BACK.has(forma);
}

export interface LlamadaAlBack {
  quien: string;
  forma: string;
  archivo: string;
}

/**
 * Cada `apiClient.verbo(...)` de los servicios, con su ruta resuelta.
 *
 * 🔴 Se recorre el TEXTO, no las líneas. La primera versión leía línea por
 * línea y se le escapaba toda llamada partida en dos —que son muchas—:
 *
 *     return await apiClient.get<Respuesta>(
 *       `/leases/${leaseId}/chat`,
 *     );
 *
 * Con eso veía 511 llamadas de ~800 y daba verde sobre las que no miraba. Un
 * barrido que no dice lo que NO pudo mirar miente por omisión.
 */
export function llamadasDelFront(): {
  llamadas: LlamadaAlBack[];
  sinPoderLeer: string[];
} {
  const llamadas: LlamadaAlBack[] = [];
  const sinPoderLeer: string[] = [];

  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.service.ts'))) {
    const texto = readFileSync(join(DIR, f), 'utf8');

    // Los prefijos declarados arriba del archivo (`const BASE = '/x'`).
    const constantes = new Map<string, string>();
    for (const m of texto.matchAll(
      /^(?:export )?const (\w+)\s*=\s*['"`]([^'"`$]*)['"`];?$/gm,
    )) {
      constantes.set(m[1], m[2]);
    }

    // Dónde empieza cada objeto exportado y cada método suyo, por posición.
    const hitos: Array<{ en: number; objeto?: string; metodo?: string }> = [];
    for (const m of texto.matchAll(/^export const (\w+)/gm)) {
      hitos.push({ en: m.index!, objeto: m[1] });
    }
    // 🔴 No todos los servicios son un objeto: `pqrs.service.ts` y
    // `tenant-acuerdos.service.ts` exportan funciones sueltas. Sin esto la
    // llamada quedaba sin dueño y el aviso no decía a quién ir a buscar.
    for (const m of texto.matchAll(
      /^(?:export )?(?:async )?function (\w+)\s*\(/gm,
    )) {
      hitos.push({ en: m.index!, objeto: f.replace('.service.ts', ''), metodo: m[1] });
    }
    // 🔴 Un método, no cualquier línea indentada. `leaseId: string,` dentro de
    // una firma partida en varias líneas y un `if (` a cuatro espacios calzaban
    // como métodos y le ponían a la llamada un dueño inventado (`?.if`).
    // Un método es `nombre(`, `async nombre(` o `nombre: (`; un parámetro tiene
    // un TIPO después de los dos puntos, no un paréntesis.
    const PALABRAS = new Set([
      'if', 'for', 'while', 'switch', 'catch', 'return', 'await', 'typeof',
      'function', 'const', 'let', 'new', 'throw', 'do', 'else', 'super',
    ]);
    for (const m of texto.matchAll(
      /^ {2,4}(?:async )?(\w+)\s*(?:\(|:\s*(?:async\s*)?\()/gm,
    )) {
      if (PALABRAS.has(m[1])) continue;
      hitos.push({ en: m.index!, metodo: m[1] });
    }
    hitos.sort((a, b) => a.en - b.en);

    const quienEn = (pos: number): string => {
      let objeto = '?';
      let metodo = '?';
      for (const h of hitos) {
        if (h.en > pos) break;
        if (h.objeto !== undefined) {
          objeto = h.objeto;
          metodo = '?';
        }
        if (h.metodo !== undefined) metodo = h.metodo;
      }
      return `${objeto}.${metodo}`;
    };

    for (const m of texto.matchAll(
      /apiClient\.(getBlob|get|post|put|patch|delete|del)\s*(?:<[\s\S]*?>)?\s*\(\s*/g,
    )) {
      /*
       * 🔴 `getBlob` es un GET que baja un archivo (22-09). No estaba en la
       * lista, así que TODA descarga —PDF, ZIP, CSV— pasaba sin mirar: la del
       * PDF de la factura podía pedir una ruta inexistente y quedar verde.
       */
      const verbo = m[1] === 'getBlob' ? 'get' : m[1];
      const quien = quienEn(m.index!);
      let desde = m.index! + m[0].length;
      // `conQuery(`/x`, {...})` arma la cadena de consulta: la RUTA es su
      // primer argumento. Las tres descargas que lo usan quedaban sin leer.
      const envuelta = texto.slice(desde).match(/^conQuery\(\s*/);
      if (envuelta) desde += envuelta[0].length;
      const comilla = texto[desde];
      if (comilla !== '`' && comilla !== "'" && comilla !== '"') {
        // La ruta puede venir en una constante del propio archivo
        // (`apiClient.post(BASE_DE_LOTES, …)`), que sí se sabe cuánto vale.
        const ident = texto.slice(desde).match(/^(\w+)\s*[,)]/);
        const valor = ident ? constantes.get(ident[1]) : undefined;
        if (valor === undefined) {
          sinPoderLeer.push(quien);
          continue;
        }
        llamadas.push({
          quien,
          forma: formaDeLaRuta(verbo, valor.startsWith('/') ? valor : '/' + valor),
          archivo: f,
        });
        continue;
      }
      const cierra = texto.indexOf(comilla, desde + 1);
      if (cierra === -1) {
        sinPoderLeer.push(quien);
        continue;
      }
      let ruta = texto.slice(desde + 1, cierra);
      for (const [k, v] of constantes) ruta = ruta.split('${' + k + '}').join(v);
      if (ruta.startsWith('${') || ruta === '') {
        sinPoderLeer.push(quien);
        continue;
      }
      if (!ruta.startsWith('/')) ruta = '/' + ruta;
      llamadas.push({ quien, forma: formaDeLaRuta(verbo, ruta), archivo: f });
    }
  }
  return { llamadas, sinPoderLeer };
}

/**
 * Lo que HOY le pide al back una ruta que la instantánea no tiene, con el
 * motivo. Son dos clases, y conviene no confundirlas:
 *
 *   a) el valor viene de un conjunto CERRADO que el back declara literal — la
 *      llamada funciona, lo que no calza es la comparación;
 *   b) el back todavía no montó la ruta, y el front degrada HONESTAMENTE: no
 *      inventa una respuesta ni afirma que hizo algo.
 *
 * 🔴 Lo que NO puede entrar acá es un método que reviente. Si la llamada tira
 * el error a la cara del usuario, no es un contrato escrito de antemano: es un
 * defecto, y va arreglado o borrado.
 */
const DECLARADAS: readonly string[] = [
  // ── (a) el front interpola un valor de un conjunto cerrado ───────────────
  // `steps/${paso}` con el paso en 1..4; el back los declara uno por uno
  // (`@Patch(':id/steps/1')` … `/4`).
  'applicationsApi.updateStep',
  // `compartir/${canal}` con el canal en correo|whatsapp; el back tiene
  // `@Post(':tipo/:id/compartir/correo')` y `.../whatsapp`.
  'estadoDeCuentaApi.enviar',

  // ── (b) el back no la montó y el front lo dice sin mentir ────────────────
  // DOCU-04: la URL firmada la tiene que acuñar el back (es la defensa contra
  // el IDOR) y la ruta no existe. Las dos pantallas que la usan caen a la URL
  // cruda con el hueco DECLARADO en el código, no lo tapan.
  'documentsApi.getSignedUrl',
  // El chat por contrato y las tres acciones sobre una conversación. Los
  // botones se retiraron del widget: sin ruta, «Reportar» era el peor de los
  // tres, porque alguien podía denunciar una conversación abusiva y creer que
  // quedó denunciada.
  'messagesApi.archiveConversation',
  'messagesApi.getMessagesByLease',
  'messagesApi.muteConversation',
  'messagesApi.reportConversation',
  'messagesApi.sendMessageByLease',
  // PQRS del inquilino: contrato tolerante, degrada a lista vacía en 404/403.
  'pqrs.approveCotizacion',
  'pqrs.create',
  'pqrs.listMine',
  // Acuerdos de pago del inquilino: el MOTOR está construido en el micro
  // (`src/cartera/payment-plans/`); faltan las cuatro rutas de inquilino.
  'tenant-acuerdos.accept',
  'tenant-acuerdos.listMine',
  'tenant-acuerdos.requestPremoraPlan',
];

describe('🔴 ninguna llamada del front pide una ruta que el back no tiene', () => {
  it('no aparece una llamada NUEVA contra una ruta inexistente', () => {
    const { llamadas } = llamadasDelFront();
    const alVacio = [
      ...new Set(
        llamadas
          .filter((l) => !elBackLaAtiende(l.forma))
          .map((l) => `${l.quien}  →  ${l.forma}  (${l.archivo})`),
      ),
    ]
      .filter((l) => !DECLARADAS.some((d) => l.startsWith(d)))
      .sort();

    expect(
      alVacio,
      'Estas llamadas piden rutas que el back no expone: son un 404.\n' +
        'Si la ruta es nueva, regenera la instantánea con\n' +
        '`node scripts/rutas-del-back.mjs`. Si el verbo o el camino están\n' +
        'mal, arréglalos. Si la ruta no existe, borra el método.\n\n  ' +
        `${alVacio.join('\n  ')}\n`,
    ).toEqual([]);
  });

  /**
   * 🔴 Un barrido roto no puede pasar en verde para siempre. Si la expresión
   * que saca las llamadas deja de calzar, esto lo dice en vez de callarse.
   */
  it('el barrido encuentra llamadas de verdad y la instantánea está completa', () => {
    const { llamadas, sinPoderLeer } = llamadasDelFront();
    expect(llamadas.length).toBeGreaterThan(750);
    expect(DEL_BACK.size).toBeGreaterThan(900);

    /**
     * 🔴 LO QUE ESTE GUARDIÁN NO MIRA, DICHO EN UN NÚMERO.
     *
     * El 22-09: 803 llamadas leídas y 30 que no —las que arman la URL en una
     * variable antes de pasarla (`const url = ...; apiClient.get(url)`)—. Eso
     * es un 3,6 % a ciegas, casi todo en contabilidad y estados financieros.
     *
     * El tope está acá y no en un comentario a propósito: un barrido que no
     * mide su propio hueco termina leyendo la mitad y diciendo que todo está
     * bien. Si esto sube, o apareció una forma nueva de armar rutas —y hay que
     * enseñársela— o alguien escondió una llamada detrás de una variable.
     */
    expect(sinPoderLeer.length).toBeLessThanOrEqual(30);
  });
});
