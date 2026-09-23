/**
 * 🔴 TODA PROMESA DE «PRÓXIMAMENTE» TIENE QUE ESTAR DECLARADA ACÁ.
 *
 * ── Por qué existe (21-09-2026) ────────────────────────────────────────────
 *
 * `un-contrato-sin-back-se-declara.test.ts` ya vigilaba los servicios que
 * DECÍAN no tener back, buscando dos frases en inglés («CONTRACT ONLY», «no
 * backend yet»). Servía para lo que se escribió, y dejaba ciega la mitad más
 * grande: **lo que el producto le promete al usuario en su propio idioma**.
 *
 * El barrido del 21-09 encontró, fuera de ese guardián:
 *
 *   · 19 pantallas que pintan «Próximamente» / «Coming soon», y
 *   · 25 claves del diccionario i18n con la misma promesa,
 *
 * y al cruzarlas contra el back apareció el patrón caro del día: **la mayoría
 * de esas promesas eran sobre cosas ya construidas.** Ese día se arreglaron
 * seis —editar el perfil del asesor (`PATCH .../members/:id/profile`), darle un
 * inmueble (`PUT .../consignaciones/:id/assign-agent`), el botón «Renovar» del
 * propietario, la descarga del acta, la cámara del inventario y el «ver
 * contrato» de la consignación— y se borraron **22 claves muertas** del
 * diccionario, promesas que ya no las leía nadie y que seguían ahí para que la
 * próxima búsqueda las contara como pendientes.
 *
 * ── 21-09, más tarde: la que estaba «más cerca de ser mentira» ─────────────
 *
 * `inmobiliaria.documento.comingSoon` («crear una plantilla de documento») salió
 * de esta lista, y no por un cable: al abrir el editor apareció que el botón
 * apagado tapaba una TRAMPA. `generateDocument` copiaba el contenido de una
 * plantilla propia tal cual, así que un `{{arrendatarioNombre}}` salía impreso
 * con las llaves en un documento firmado. Nadie lo había visto porque no había
 * forma de crear una plantilla. Ahora el editor existe, el back rechaza al
 * GUARDAR una variable que no sabe llenar, y las del sistema se duplican en vez
 * de editarse. La lección, que vale para el resto de esta lista: **un botón
 * apagado puede estar tapando algo peor que un hueco**, así que la promesa se
 * mira antes de decidir si el trabajo es grande o chico.
 *
 * Y con el componente muerto que la pintaba (`DocumentoTemplates.tsx`, que no
 * renderizaba nadie) se fueron 92 claves del diccionario: el bloque
 * `inmobiliaria.documento` entero, que sólo él usaba.
 *
 * ── Qué hace este guardián ─────────────────────────────────────────────────
 *
 * Recorre `src/` (sin los comentarios, para no contar la historia como
 * promesa) y el diccionario, y exige que CADA promesa esté acá con tres cosas:
 *
 *   · `estado` — `HONESTO` (degrada sobre algo real, o depende de un dato o de
 *     una decisión de negocio), `FALTA` (de verdad no existe en ninguna parte)
 *     o `MENTIRA` (existe y la pantalla dice que no).
 *   · `de` — de quién es lo que falta, que es lo que decide si se puede hacer
 *     hoy: `back` · `micro` (el repo `agent`) · `front` · `infra` · `negocio`.
 *   · `nota` — QUÉ falta exactamente. Sin eso la lista no sirve para trabajar.
 *
 * Y tres cosas no pueden pasar:
 *
 *   1. una promesa nueva sin declarar (el test cae hasta que alguien la mire);
 *   2. un renglón muerto —lo que ya no se promete, sale de la lista—; y
 *   3. 🔴 **un renglón en `MENTIRA`**. Esa no es una clase que se pueda dejar
 *      parqueada: si lo que se promete ya existe, lo que hay que hacer es
 *      quitar la promesa, no anotarla.
 *
 * ── Lo que este guardián NO ve, dicho en voz alta ──────────────────────────
 *
 * Sólo busca «Próximamente» y «Coming soon». **«Todavía no» queda afuera a
 * propósito**: el producto lo usa en decenas de vacíos legítimos («Todavía no
 * hay leads»), así que meterlo llenaría la lista de ruido hasta que nadie la
 * leyera. Una pantalla que quiera esconder una promesa sólo tiene que escribir
 * «esta pantalla todavía no crea el estudio» — y hay dos que lo hacen
 * (`postulaciones/estudio/nuevo` y `.../reglas`), declaradas igual acá abajo
 * aunque el barrido no las vea, para que no se pierdan.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(process.cwd(), 'src');

/** Recorrer `src/` entero con la máquina cargada no cabe en los 5 s de vitest. */
const TIEMPO_DE_RECORRER_EL_REPO = 60_000;

type Estado = 'HONESTO' | 'FALTA' | 'MENTIRA';
type Duenio = 'back' | 'micro' | 'front' | 'infra' | 'negocio';

interface Promesa {
  estado: Estado;
  de: Duenio;
  nota: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Lo que promete la PANTALLA
// ═══════════════════════════════════════════════════════════════════════════

const EN_PANTALLA: Record<string, Promesa> = {
  'app/inquilino/acuerdos/[id]/page.tsx': {
    estado: 'FALTA',
    de: 'micro',
    nota:
      'Acuerdos de pago del inquilino — el escalón del MEDIO de la cobranza ' +
      '(cobrar → acuerdo → castigo), con los dos extremos ya construidos. 🔴 El ' +
      'motor también está construido, en el micro: `src/cartera/payment-plans/` ' +
      '(engine, política de descuento, romper acuerdo, watcher de incumplimiento, ' +
      'link de Wompi), expuesto SÓLO con alcance de agencia en ' +
      '`POST /api/cartera/payment-plans/offer`. Faltan las cuatro rutas con ' +
      'alcance de INQUILINO que `tenant-acuerdos.service.ts` ya declara: `/mine`, ' +
      '`/:planId/accept`, `/:planId/payment-url` y `/request`.',
  },
  'app/inquilino/casos/page.tsx': {
    estado: 'FALTA',
    de: 'infra',
    nota:
      'Avisar al inquilino por push y por WhatsApp. El aviso dentro del portal sí ' +
      'es real; lo que falta es el canal, no la pantalla.',
  },
  'app/panel/(landlord)/solicitudes/nueva/page.tsx': {
    estado: 'HONESTO',
    de: 'micro',
    nota:
      'Llama de verdad a `ownerSolicitudesApi.crear` y sólo dice «Próximamente» ' +
      'cuando el portal del propietario no responde. Es degradación, no promesa.',
  },
  'app/panel/inmobiliaria/pagos/cobranza/fallidos/page.tsx': {
    estado: 'FALTA',
    de: 'back',
    nota:
      'Las acciones EN LOTE sobre pagos fallidos (reintentar todos, mandar el link ' +
      'a todos). No hay endpoint de operación por lote; la acción por FILA sí es ' +
      'real y sale del WorkItem.',
  },
  'app/panel/inmobiliaria/postulaciones/estudio/[id]/tabs/ReporteTab.tsx': {
    estado: 'FALTA',
    de: 'back',
    nota:
      'Descargar y compartir el PDF del reporte del estudio. Lo que se muestra en ' +
      'pantalla sí sale del pipeline; el armado del archivo y el envío no existen.',
  },
  'components/inmobiliaria/NuevoLeadDialog.tsx': {
    estado: 'HONESTO',
    de: 'negocio',
    nota:
      'El origen del lead que la agencia no tiene habilitado. El texto sale de ' +
      '`configuracion.noHabilitado`, que manda el back: depende del dato, no de ' +
      'que falte construir algo.',
  },
  'components/inmobiliaria/ai/AIAgentCard.tsx': {
    estado: 'HONESTO',
    de: 'negocio',
    nota:
      'El estado de un agente con `status !== "active"`. Depende del dato. ' +
      '(De paso: hoy ningún archivo importa esta tarjeta — la de `preview-ds` es ' +
      'otra, definida ahí mismo.)',
  },
  'components/inmobiliaria/cobranza/CobranzaImportCard.tsx': {
    estado: 'HONESTO',
    de: 'micro',
    nota:
      'Importar cartera. Llama a `POST /cartera/import` y degrada a «Próximamente ' +
      '— requiere despliegue» con 404 o red caída.',
  },
  'components/inmobiliaria/cotizador/RecoveryAsegurabilidad.tsx': {
    estado: 'FALTA',
    de: 'micro',
    nota:
      '«Avanzar» con una aseguradora del cotizador — el mismo hueco que ' +
      '`CarrierCardExpandible.tsx`, que ya está declarado en ' +
      '`un-contrato-sin-back-se-declara.test.ts`. El micro cotiza; no hay ruta para ' +
      'tomar una cotización y seguir.',
  },
  'components/inmobiliaria/pagos/PagoFallidoTabla.tsx': {
    estado: 'HONESTO',
    de: 'back',
    nota:
      'La acción de la fila es la primera que DECLARA el WorkItem del back. Sin ' +
      'acción declarada, el botón queda apagado en vez de fingir (T-323).',
  },
  'components/inmobiliaria/pagos/PrioridadInbox.tsx': {
    estado: 'HONESTO',
    de: 'back',
    nota: 'Igual que `PagoFallidoTabla`: la acción sale del WorkItem o no hay botón.',
  },
  'components/landlord/portal/PortalPlaceholder.tsx': {
    estado: 'HONESTO',
    de: 'micro',
    nota:
      'El caparazón de las secciones del portal del propietario cuando el micro no ' +
      'las está sirviendo. Se usa como ESTADO de esas páginas, no como la página.',
  },
  'components/landlord/portal/finanzas/DescargarInformeButton.tsx': {
    estado: 'HONESTO',
    de: 'micro',
    nota:
      'Pide el PDF de verdad y separa tres finales: llegó · no está habilitado ' +
      '(«Próximamente») · falló. Sólo el del medio es la promesa.',
  },
  'components/landlord/portal/novedades/DamagesSection.tsx': {
    estado: 'HONESTO',
    de: 'micro',
    nota:
      'Los daños con proveedor, con `available:false` del propio servicio. Degrada ' +
      'SÓLO esa sección y no tumba el resto del hub.',
  },
  'components/landlord/portal/seleccion/ComparacionView.tsx': {
    estado: 'HONESTO',
    de: 'micro',
    nota:
      'Elegir candidato llama a `ownerSeleccionApi.elegir`; «Próximamente» sale ' +
      'sólo con status 0 (nadie respondió).',
  },
  'components/layout/Navbar.tsx': {
    estado: 'HONESTO',
    de: 'negocio',
    nota:
      'La etiqueta de los productos que todavía no se lanzan, marcada ítem por ' +
      'ítem en la configuración del menú. Decisión de negocio, no deuda técnica.',
  },
  'components/messages/MessagesWidget.tsx': {
    estado: 'HONESTO',
    de: 'negocio',
    nota:
      'WhatsApp ruteado por la inmobiliaria (Ley 2300). El back ya dice si se ' +
      'puede contactar (`/agent/contact/can-contact`); lo que falta es que la ' +
      'agencia lo tenga prendido.',
  },
  'lib/hooks/cobranza/use-cartera-import.ts': {
    estado: 'HONESTO',
    de: 'micro',
    nota: 'El mensaje de degradación que pinta `CobranzaImportCard`.',
  },
  'lib/hooks/cobranza/use-owner-reports.ts': {
    estado: 'HONESTO',
    de: 'micro',
    nota: 'El mensaje de degradación de los informes del propietario del micro.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Lo que promete el DICCIONARIO
// ═══════════════════════════════════════════════════════════════════════════

const EN_EL_DICCIONARIO: Record<string, Promesa> = {
  'inmobiliaria.ai.cotizador.detail.acciones.proximamente': {
    estado: 'FALTA',
    de: 'micro',
    nota: 'Las acciones sobre una cotización de aseguradora ya resuelta.',
  },
  'inmobiliaria.ai.cotizador.detail.carrierCard.proximamente': {
    estado: 'FALTA',
    de: 'micro',
    nota: 'Avanzar con la aseguradora elegida. Misma falta que `RecoveryAsegurabilidad`.',
  },
  'inmobiliaria.ai.estudio.detalle.reporte.proximamente': {
    estado: 'FALTA',
    de: 'back',
    nota: 'Descargar y compartir el reporte del estudio. Misma falta que `ReporteTab`.',
  },
  'inmobiliaria.finance.export.comingSoon': {
    estado: 'FALTA',
    de: 'back',
    nota:
      'PROGRAMAR una exportación que se repita sola. Exportar ahora mismo sí ' +
      'funciona, en los tres formatos del mismo menú.',
  },
  'landlord.finance.export.comingSoon': {
    estado: 'FALTA',
    de: 'back',
    nota: 'Lo mismo del propietario: la exportación programada.',
  },
  'inmobiliaria.piloto.gobierno.proximamente': {
    estado: 'HONESTO',
    de: 'negocio',
    nota:
      'Los agentes en pausa de producto (`AGENTES_NO_DISPONIBLES`). La tarjeta se ' +
      'lee como no disponible sin importar lo que diga el gobierno real.',
  },
};

/**
 * Las que dicen lo mismo con otras palabras y el barrido no ve. Van acá para
 * que estén en la lista aunque el test no las pueda encontrar solo.
 */
const LAS_QUE_NO_DICEN_PROXIMAMENTE: Record<string, Promesa> = {
  'app/panel/inmobiliaria/postulaciones/estudio/nuevo/page.tsx': {
    estado: 'FALTA',
    de: 'micro',
    nota: '«Esta pantalla todavía no crea el estudio». Un estudio sólo se abre desde una postulación.',
  },
  'app/panel/inmobiliaria/postulaciones/estudio/reglas/page.tsx': {
    estado: 'FALTA',
    de: 'micro',
    nota: '«Estas reglas todavía no se guardan». No hay dónde guardarlas todavía.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════

function archivos(dir: string, salida: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      // Lo generado del OpenAPI no es una promesa del producto: es la copia de
      // la descripción de una ruta.
      if (!ruta.includes(join('api', 'generated'))) archivos(ruta, salida);
    } else if (/\.tsx?$/.test(ruta) && !/\.test\.tsx?$/.test(ruta)) {
      salida.push(ruta);
    }
  }
  return salida;
}

/**
 * Sin comentarios. Un archivo que CUENTA que acá hubo un «próximamente» está
 * documentando, no prometiendo — y si contara, arreglar la trampa obligaría a
 * borrar la explicación de por qué existía.
 */
function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const PROMESA = /Próximamente|Coming soon/;

function loQuePrometeLaPantalla(): string[] {
  const encontrados: string[] = [];
  for (const ruta of archivos(RAIZ)) {
    if (PROMESA.test(sinComentarios(readFileSync(ruta, 'utf8')))) {
      encontrados.push(relative(RAIZ, ruta));
    }
  }
  return encontrados.sort();
}

function clavesConPromesa(): string[] {
  const es = JSON.parse(
    readFileSync(join(RAIZ, 'lib/i18n/locales/es.json'), 'utf8'),
  ) as Record<string, unknown>;
  const salida: string[] = [];
  const recorrer = (nodo: unknown, camino: string) => {
    if (typeof nodo === 'string') {
      if (PROMESA.test(nodo)) salida.push(camino);
    } else if (nodo && typeof nodo === 'object') {
      for (const [k, v] of Object.entries(nodo as Record<string, unknown>)) {
        recorrer(v, camino ? `${camino}.${k}` : k);
      }
    }
  };
  recorrer(es, '');
  return salida.sort();
}

describe('🔴 las promesas de «Próximamente»', () => {
  it('toda promesa en pantalla está declarada, con qué falta y de quién es', () => {
    const sinDeclarar = loQuePrometeLaPantalla().filter((r) => !(r in EN_PANTALLA));
    expect(
      sinDeclarar,
      'Esta pantalla le promete «Próximamente» a alguien. Antes de dejarla así, ' +
        'BUSCA si el back ya lo tiene —el 21-09 seis de estas promesas eran sobre ' +
        'cosas construidas— y después declárala en EN_PANTALLA con qué falta.',
    ).toEqual([]);
  }, TIEMPO_DE_RECORRER_EL_REPO);

  it('no hay renglones muertos: lo que ya no se promete, sale de la lista', () => {
    const encontrados = loQuePrometeLaPantalla();
    const sobrantes = Object.keys(EN_PANTALLA).filter((r) => !encontrados.includes(r));
    expect(
      sobrantes,
      'Este archivo ya no promete nada. Sácalo de EN_PANTALLA: una lista con ' +
        'pendientes que ya no existen es la que hace que nadie la crea.',
    ).toEqual([]);
  }, TIEMPO_DE_RECORRER_EL_REPO);

  it('toda promesa del diccionario está declarada', () => {
    const sinDeclarar = clavesConPromesa().filter((k) => !(k in EN_EL_DICCIONARIO));
    expect(sinDeclarar).toEqual([]);
  });

  it('el diccionario no guarda promesas que ya nadie lee', () => {
    const claves = clavesConPromesa();
    const sobrantes = Object.keys(EN_EL_DICCIONARIO).filter((k) => !claves.includes(k));
    expect(
      sobrantes,
      'Esta clave ya no está en el diccionario. El 21-09 se borraron 22 así: ' +
        'promesas que no las leía nadie y que la siguiente búsqueda contaba como ' +
        'pendientes.',
    ).toEqual([]);
  });

  it('🔴 ninguna promesa es una MENTIRA: lo que ya existe se destapa, no se anota', () => {
    const mentiras = [
      ...Object.entries(EN_PANTALLA),
      ...Object.entries(EN_EL_DICCIONARIO),
      ...Object.entries(LAS_QUE_NO_DICEN_PROXIMAMENTE),
    ]
      .filter(([, p]) => p.estado === 'MENTIRA')
      .map(([k]) => k);
    expect(
      mentiras,
      'Marcar algo como MENTIRA es decir que la función ya existe y la pantalla ' +
        'dice que no. Eso no se deja escrito: se quita la promesa y se cablea.',
    ).toEqual([]);
  });

  it('cada promesa dice QUÉ falta — una nota vacía no es una declaración', () => {
    const flojas = [
      ...Object.entries(EN_PANTALLA),
      ...Object.entries(EN_EL_DICCIONARIO),
      ...Object.entries(LAS_QUE_NO_DICEN_PROXIMAMENTE),
    ]
      .filter(([, p]) => p.nota.trim().length < 40)
      .map(([k]) => k);
    expect(flojas).toEqual([]);
  });
});
