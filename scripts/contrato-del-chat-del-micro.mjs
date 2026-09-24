/**
 * Saca del micro el CONTRATO REAL de las rutas del chat que el front llama sin
 * tipos generados, y lo deja en `src/lib/api/contrato-del-chat-del-micro.json`.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * Las señales del cerebro (23-09): el chat le cuenta al micro lo que sólo ve
 * la pantalla (clic en una tarjeta, deshacer, abandono) y el 👍/👎 con el
 * `turnoId` del servidor. Una prueba que espía `fetch` verifica QUÉ pedimos,
 * nunca SI ESO EXISTE: ya nos costó un botón con 404 en cada clic. Y el micro
 * valida con zod NO estricto: una llave que no conoce la BORRA sin avisar
 * (mandar `turnoId` a la ruta del pulgar, que lo llama `turnId`, habría dado
 * 200 y asociado el pulgar por la pregunta, en silencio).
 *
 * Por eso la prueba (`src/lib/chat/senales.test.ts` y la del hook) compara el
 * cuerpo que de verdad sale contra ESTE extracto, y lo hace estricta: una
 * llave que el micro no declara es un error.
 *
 * ── De dónde sale ──────────────────────────────────────────────────────────
 *
 * Del `openapi-snapshot.json` del micro, que su `pnpm openapi:dump` genera
 * desde los esquemas zod de los archivos de ruta, y que su prueba
 * `tests/snapshots/openapi-v1.test.ts` obliga a estar al día con ellos (falla
 * byte a byte si alguien cambia una ruta y no lo regenera). O sea: el esquema
 * del archivo de la ruta, serializado por el propio micro, no copiado a mano.
 * Además se comprueba que cada archivo de ruta declare el camino que dice el
 * snapshot: si no coinciden, esto falla en vez de escribir.
 *
 * No se regenera `src/lib/api/generated/agent.ts` (`pnpm api:gen`) porque ese
 * paso trae de una vez todos los cambios del micro desde la última
 * regeneración y toca tipos que usan otras pantallas; esto es sólo lo que el
 * chat necesita.
 *
 * ── Cómo se usa ────────────────────────────────────────────────────────────
 *
 *   node scripts/contrato-del-chat-del-micro.mjs [ruta/al/micro]
 *
 * Por defecto `../agent`. Es un paso A MANO (como `rutas-del-back.mjs`): el
 * extracto queda commiteado con el commit del micro del que salió.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MICRO = resolve(process.argv[2] ?? '../agent');
const SALIDA = 'src/lib/api/contrato-del-chat-del-micro.json';

/**
 * Las rutas del chat que el front llama a mano. `cuerpo`: se extrae el esquema
 * del cuerpo. `camposDeLaRespuesta`: se extraen SÓLO esos campos de la
 * respuesta 200 (lo que el front lee y no tiene tipado).
 */
const RUTAS = [
  {
    metodo: 'post',
    camino: '/api/agency/{agencyId}/ai-hub/chat/senales',
    archivo: 'src/server/routes/agency-ai-hub-chat-senales.ts',
    cuerpo: true,
  },
  {
    metodo: 'post',
    camino: '/api/agency/{agencyId}/ai-hub/chat/feedback',
    archivo: 'src/server/routes/agency-ai-hub-chat-feedback.ts',
    cuerpo: true,
  },
  {
    metodo: 'post',
    camino: '/api/agency/{agencyId}/ai-hub/chat',
    archivo: 'src/server/routes/agency-ai-hub-chat.ts',
    camposDeLaRespuesta: ['turnoId'],
  },
  // «¿Aprendo esto?» (24-09): el administrador decide qué aprende el chat.
  {
    metodo: 'get',
    camino: '/api/agency/{agencyId}/ai-hub/chat/aprender/{turnoId}',
    archivo: 'src/server/routes/agency-ai-hub-chat-aprender.ts',
    camposDeLaRespuesta: ['disponible', 'aprendizajes', 'motivo', 'leccionesEnUso'],
  },
  {
    metodo: 'post',
    camino: '/api/agency/{agencyId}/ai-hub/chat/aprender/{turnoId}',
    archivo: 'src/server/routes/agency-ai-hub-chat-aprender.ts',
    cuerpo: true,
    // `estado` es nullable (`type: [string, null]` en 3.1) y el validador del
    // contrato sólo entiende tipos simples: se extraen los que el front mira.
    camposDeLaRespuesta: ['aplicado', 'motivo', 'leccionesEnUso'],
  },
  // Las tarjetas del ejecutor (24-09): la tarjeta de HOY de una ejecución, que
  // el chat pide cuando termina la gracia de «Deshacer», cuando vuelve a una
  // programada cuya hora ya pasó y cuando el Centro de procesos ve terminar el
  // proceso que arrancó la acción.
  {
    metodo: 'get',
    camino: '/api/agency/{agencyId}/ai-hub/chat/ejecuciones/{ejecucionId}',
    archivo: 'src/server/routes/agency-ai-hub-chat-ejecuciones.ts',
    camposDeLaRespuesta: ['tarjeta'],
  },
];

/**
 * Lo que viaja por el STREAM y no es una ruta del registro (el `done` y los
 * eventos SSE): el micro lo deja como componentes del snapshot desde
 * `agency-ai-hub-chat-ejecuciones.ts`. Se copian resueltos para que las
 * pruebas del front lean y validen contra el mismo esquema.
 */
const COMPONENTES = ['AiHubChatPiezasNuevasDelDone', 'AiHubChatEventoProcesoIniciado'];

let spec;
try {
  spec = JSON.parse(readFileSync(join(MICRO, 'openapi-snapshot.json'), 'utf8'));
} catch {
  console.error(
    `No encuentro ${join(MICRO, 'openapi-snapshot.json')}.\n` +
      `Pásale la ruta: node scripts/contrato-del-chat-del-micro.mjs /ruta/al/micro`,
  );
  process.exit(1);
}

/** Resuelve los `$ref` locales (`#/components/schemas/X`) en todo el árbol. */
function sinReferencias(nodo, vistos = new Set()) {
  if (Array.isArray(nodo)) return nodo.map((n) => sinReferencias(n, vistos));
  if (!nodo || typeof nodo !== 'object') return nodo;
  if (typeof nodo.$ref === 'string') {
    const ref = nodo.$ref;
    if (vistos.has(ref)) throw new Error(`referencia circular: ${ref}`);
    const destino = ref
      .replace(/^#\//, '')
      .split('/')
      .reduce((acc, parte) => acc?.[parte], spec);
    if (!destino) throw new Error(`referencia rota: ${ref}`);
    return sinReferencias(destino, new Set([...vistos, ref]));
  }
  return Object.fromEntries(Object.entries(nodo).map(([k, v]) => [k, sinReferencias(v, vistos)]));
}

const rutas = {};
for (const r of RUTAS) {
  const op = spec.paths?.[r.camino]?.[r.metodo];
  if (!op) {
    console.error(`El micro no expone ${r.metodo.toUpperCase()} ${r.camino}.`);
    process.exit(1);
  }
  const fuente = readFileSync(join(MICRO, r.archivo), 'utf8');
  if (!fuente.includes(`path: '${r.camino}'`) || !fuente.includes(`method: '${r.metodo}'`)) {
    console.error(`${r.archivo} no declara ${r.metodo} '${r.camino}': el snapshot y la ruta no coinciden.`);
    process.exit(1);
  }
  const salida = { archivo: r.archivo };
  if (r.cuerpo) {
    const esquema = op.requestBody?.content?.['application/json']?.schema;
    if (!esquema) {
      console.error(`${r.camino} no declara cuerpo JSON.`);
      process.exit(1);
    }
    salida.cuerpo = sinReferencias(esquema);
  }
  if (r.camposDeLaRespuesta) {
    const esquema = sinReferencias(op.responses?.['200']?.content?.['application/json']?.schema ?? {});
    const propiedades = {};
    for (const campo of r.camposDeLaRespuesta) {
      if (!esquema.properties?.[campo]) {
        console.error(`La respuesta de ${r.camino} no trae \`${campo}\`.`);
        process.exit(1);
      }
      propiedades[campo] = esquema.properties[campo];
    }
    salida.respuesta = {
      type: 'object',
      properties: propiedades,
      required: (esquema.required ?? []).filter((c) => r.camposDeLaRespuesta.includes(c)),
    };
  }
  rutas[`${r.metodo.toUpperCase()} ${r.camino}`] = salida;
}

const componentes = {};
for (const nombre of COMPONENTES) {
  const esquema = spec.components?.schemas?.[nombre];
  if (!esquema) {
    console.error(`El micro no declara el componente ${nombre} en su snapshot.`);
    process.exit(1);
  }
  componentes[nombre] = sinReferencias(esquema);
}

let commit = 'desconocido';
try {
  commit = execFileSync('git', ['-C', MICRO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  // Sin git: queda «desconocido», el contrato sirve igual.
}

writeFileSync(
  SALIDA,
  JSON.stringify(
    {
      _comentario:
        'Generado por scripts/contrato-del-chat-del-micro.mjs desde el openapi-snapshot.json del micro. No editar a mano: regenerar.',
      sacadoDe: `micro@${commit}/openapi-snapshot.json`,
      cuando: new Date().toISOString().slice(0, 10),
      rutas,
      componentes,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `${Object.keys(rutas).length} rutas y ${Object.keys(componentes).length} componentes del chat → ${SALIDA} (micro@${commit})`,
);
