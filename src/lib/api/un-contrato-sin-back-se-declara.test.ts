/**
 * 🔴 UN CONTRATO DE FRONT SIN BACK TIENE QUE ESTAR DECLARADO ACÁ.
 *
 * ── Lo que pasó, dos veces el mismo día (20 y 21-09-2026) ──────────────────
 *
 * Aparecieron dos archivos `*.service.ts` con el contrato completo —tipos,
 * manejo de errores, pantalla— sobre endpoints que el back NUNCA implementó:
 * `lease-documents.service.ts` (el paz y salvo) y `autopago.service.ts` (la
 * domiciliación del canon). Los dos lo decían en su encabezado, con la frase
 * «CONTRACT ONLY (no backend today)». Pero **nadie lee encabezados cuando está
 * buscando si algo existe**: quien abre el repo ve un servicio, tipos y una
 * pantalla, y concluye que la función está construida.
 *
 * Y la trampa tiene una tercera forma, la inversa, que costó más: el
 * `agent-contact.service.ts` decía «no HTTP contact endpoint is exposed yet»
 * cuando el back ya publicaba la ruta hacía semanas, así que la pantalla
 * mantenía un botón en «Próximamente» sobre algo que ya funcionaba.
 *
 * ── Qué hace este guardián ─────────────────────────────────────────────────
 *
 * Recorre `src/` y encuentra toda declaración de «esto no tiene back». Cada
 * una TIENE que estar en la lista de abajo, con una línea que diga qué falta.
 * Así:
 *
 *   · un contrato nuevo sin back no puede entrar en silencio: el test cae
 *     hasta que alguien lo declare acá, y esta lista es lo primero que se lee
 *     antes de afirmar que algo existe; y
 *   · cuando el back se construye, borrar la frase del archivo obliga a borrar
 *     el renglón de acá, y viceversa — que es lo que no pasó con
 *     `agent-contact`.
 *
 * Esta lista NO es una lista de pendientes aceptados: es el inventario de lo
 * que el código aparenta y no es.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(process.cwd(), 'src');

/**
 * Recorrer `src/` entero tarda ~0,8 s sola y bastante más con la suite y la
 * máquina cargadas. El tiempo por defecto de vitest (5 s) alcanza hoy y no
 * alcanzó el 21-09 en otro guardián parecido, así que va declarado Y APLICADO
 * —`tasa-de-recaudo.guardian.test.ts` lo tenía declarado y no se lo aplicaba
 * a su `it`, y se cayó por eso.
 */
const TIEMPO_DE_RECORRER_EL_REPO = 60_000;

/**
 * Las formas en que un archivo declara que no tiene back. Se buscan varias
 * porque la frase se escribió distinta cada vez, que es justamente por qué
 * hacía falta un guardián y no una convención.
 *
 * ⚠️ «sin back» en español NO entra: se usa para «si el back está caído», que
 * es otra cosa. Lo encontró este mismo guardián al escribirlo, marcando un
 * `catch` de `use-migracion-con-deuda.ts` que no tenía nada que ver.
 */
const FORMAS = [/CONTRACT ONLY/i, /no backend (today|yet)/i];

/**
 * 🔴 EL INVENTARIO de todo archivo que HABLA de no tener back.
 *
 * Dos clases de renglón, y las dos tienen que estar:
 *
 *   · `FALTA` — el contrato existe y el endpoint no. La nota dice CUÁL falta.
 *   · `YA_ESTA` — el back se construyó y el archivo sólo lo menciona como
 *     historia. Está acá para que la próxima búsqueda de «CONTRACT ONLY» no
 *     vuelva a contarlo como pendiente, que es exactamente el error que
 *     cometió quien leyó `agent-contact.service.ts`.
 *
 * Para sacar un renglón hay que borrar la frase del archivo.
 */
const LO_QUE_HABLA_DE_NO_TENER_BACK: Record<
  string,
  { estado: 'FALTA' | 'YA_ESTA'; nota: string }
> = {
  'lib/api/autopago.service.ts': {
    estado: 'FALTA',
    nota: 'Domiciliación del canon (cobro recurrente tokenizado con Wompi). El back no tiene ninguna de las rutas de `/autopago`. Es el hueco más rentable de los cuatro de la matriz de competencia.',
  },
  'lib/api/messages.service.ts': {
    estado: 'FALTA',
    nota: 'Mensajes por ARRIENDO (`/leases/:id/messages`). El back tiene los hilos por conversación (`/conversations/:id/messages`), no por arriendo.',
  },
  'lib/api/messages.types.ts': {
    estado: 'FALTA',
    nota: 'Adjuntos en el chat y acciones sobre una conversación. El back no recibe adjuntos en `ChatMessage`.',
  },
  'components/inmobiliaria/cotizador/CarrierCardExpandible.tsx': {
    estado: 'FALTA',
    nota: '«Avanzar» con una aseguradora del cotizador. El micro cotiza; no hay ruta para tomar la cotización y seguir.',
  },
  'lib/api/lease-documents.service.ts': {
    estado: 'YA_ESTA',
    nota: 'Paz y salvo y certificado de estar al día. Construido el 21-09-2026: `GET/POST /portal/certificados` y `GET /portal/certificados/:id/pdf`.',
  },
  'lib/api/agent-contact.service.ts': {
    estado: 'YA_ESTA',
    nota: 'La puerta de la Ley 2300. El back publica `GET /agent/contact/can-contact` desde T-0045; el encabezado decía que no y mantuvo un botón en «Próximamente» sobre algo que ya funcionaba.',
  },
};

function archivos(dir: string, salida: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (/\.tsx?$/.test(ruta) && !/\.test\.tsx?$/.test(ruta)) salida.push(ruta);
  }
  return salida;
}

function losQueDicenQueNoTienenBack(): string[] {
  const encontrados: string[] = [];
  for (const ruta of archivos(RAIZ)) {
    const texto = readFileSync(ruta, 'utf8');
    if (FORMAS.some((f) => f.test(texto))) {
      encontrados.push(relative(RAIZ, ruta));
    }
  }
  return encontrados.sort();
}

describe('🔴 los contratos de front sin back', () => {
  it('todos están declarados en el inventario, con qué les falta', () => {
    const sinDeclarar = losQueDicenQueNoTienenBack().filter(
      (r) => !(r in LO_QUE_HABLA_DE_NO_TENER_BACK),
    );
    expect(
      sinDeclarar,
      'Este archivo dice que no tiene back. Decláralo en SIN_BACK (en ' +
        'un-contrato-sin-back-se-declara.test.ts) diciendo QUÉ endpoint falta, ' +
        'o borra la frase si el back ya existe.',
    ).toEqual([]);
  }, TIEMPO_DE_RECORRER_EL_REPO);

  it('el inventario no tiene renglones muertos: lo que ya no menciona el tema, sale', () => {
    const declarados = losQueDicenQueNoTienenBack();
    const sobrantes = Object.keys(LO_QUE_HABLA_DE_NO_TENER_BACK).filter(
      (r) => !declarados.includes(r),
    );
    expect(
      sobrantes,
      'Estos archivos ya no dicen que les falte back. Borra su renglón del ' +
        'inventario: un inventario con renglones muertos deja de leerse.',
    ).toEqual([]);
  }, TIEMPO_DE_RECORRER_EL_REPO);

  it('cada renglón explica qué falta o qué se construyó, no sólo que pasó algo', () => {
    for (const [ruta, fila] of Object.entries(LO_QUE_HABLA_DE_NO_TENER_BACK)) {
      expect(fila.nota.length, `${ruta} no explica de qué endpoint habla`).toBeGreaterThan(40);
    }
  });

  it('🔴 el paz y salvo y la puerta de la Ley 2300 YA tienen back', () => {
    expect(LO_QUE_HABLA_DE_NO_TENER_BACK['lib/api/lease-documents.service.ts'].estado)
      .toBe('YA_ESTA');
    expect(LO_QUE_HABLA_DE_NO_TENER_BACK['lib/api/agent-contact.service.ts'].estado)
      .toBe('YA_ESTA');
  });

  it('los que de verdad faltan son los que hay que contar, y hoy son cuatro', () => {
    const faltan = Object.entries(LO_QUE_HABLA_DE_NO_TENER_BACK)
      .filter(([, f]) => f.estado === 'FALTA')
      .map(([r]) => r);
    // El número no es decorativo: es la respuesta a «¿qué aparenta el front que
    // no existe?». Que cambie tiene que ser una decisión, no un descuido.
    expect(faltan).toHaveLength(4);
  });
});
