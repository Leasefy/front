/**
 * 🔴🔴 GUARDIÁN: UN MÉTODO DEL CLIENTE SIN UN SOLO LLAMADOR ES UNA PUERTA QUE
 * NO EXISTE.
 *
 * ── Por qué existe este archivo ────────────────────────────────────────────
 *
 * Nico, 22-09: «me da miedo que cada que te digo "ve y haz algo" tú encuentras
 * errores; ¿por qué no haces un QA para verificar que todo esté bien?».
 *
 * El miedo está bien puesto, y la causa es medible: las 12.865 pruebas
 * verifican **lo que el código hace**, no **si la pantalla tiene por dónde
 * hacerlo**. Un método del cliente HTTP con su prueba verde y ningún botón que
 * lo llame pasa el CI perfecto y en el producto es una promesa rota.
 *
 * Ya pasó CUATRO veces, y las cuatro las encontró Nico mirando la pantalla, no
 * el CI:
 *   · las plantillas de documento (21-09) — la pantalla que las prometía no la
 *     renderizaba nadie;
 *   · el convenio de recaudo (21-09) — «Configurar el convenio» sin formulario;
 *   · `captacionApi.cargarLista` (22-09) — «carga los archivos de OFAC, ONU y
 *     UE» y no había dónde;
 *   · `captacionApi.revisarConsulta` (22-09) — «una coincidencia bloquea hasta
 *     que un administrador la revise», y no había dónde revisarla: un tercero
 *     bloqueado se quedaba bloqueado para siempre.
 *
 * ── Qué hace, y qué NO ─────────────────────────────────────────────────────
 *
 * Recorre los 95 servicios de `src/lib/api`, saca los métodos de cada cliente
 * HTTP y comprueba que algo del producto los llame. Los que hoy no tiene
 * llamador quedan DECLARADOS abajo, con su motivo cuando se sabe.
 *
 * 🔴 La lista declarada NO dice «esto está bien». Dice «esto ya estaba, y se
 * ve». Lo que el guardián impide es que **crezca**: un método nuevo sin puerta
 * rompe la prueba el día que se escribe, no seis meses después cuando alguien
 * abre la pantalla.
 *
 * Bajar este número es trabajo de producto, y hay tres clases distintas:
 *   a) puerta que falta   — la pantalla existe y promete la acción → hay que
 *      construirla (eso fueron las cuatro de arriba);
 *   b) módulo por terminar — nómina y el portal del propietario están detrás
 *      de un plan que la agencia de QA no tiene; sus métodos esperan pantalla;
 *   c) código muerto      — quedó de algo que se quitó → hay que borrarlo.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'src';
const DIR = 'src/lib/api';

/** Sólo los clientes HTTP, no los mapas de constantes (`NOMBRE_DEL_TIPO`). */
const ES_CLIENTE = /(Api|Service|service)$/;

const esPrueba = (p: string) =>
  /\.test\.tsx?$|\.spec\.tsx?$|__tests__|\/tests\//.test(p);

function todosLosArchivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) todosLosArchivos(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** Las claves de nivel 1 de un `export const xApi = { … }` que son funciones. */
function metodosDe(texto: string, objeto: string): string[] {
  const inicio = texto.indexOf(`export const ${objeto}`);
  if (inicio === -1) return [];
  const abre = texto.indexOf('{', inicio);
  if (abre === -1) return [];
  let nivel = 0;
  let fin = abre;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') nivel++;
    else if (texto[i] === '}' && --nivel === 0) {
      fin = i;
      break;
    }
  }
  const cuerpo = texto.slice(abre + 1, fin);
  const out: string[] = [];
  // `nombre: (…) =>` — un espacio anidado (`nombre: {`) se cuenta por sus hijos.
  for (const m of cuerpo.matchAll(/^ {2}(\w+):\s*(\{?)/gm)) {
    if (m[2] !== '{') out.push(m[1]);
  }
  // `nombre(…) {` y `async nombre(…) {`
  for (const m of cuerpo.matchAll(/^ {2}(?:async )?(\w+)\s*\(/gm)) out.push(m[1]);
  return out;
}

function metodosSinLlamador(): string[] {
  const archivos = todosLosArchivos(RAIZ);
  const producto = archivos
    .filter((p) => !esPrueba(p) && !p.startsWith(DIR))
    .map((p) => readFileSync(p, 'utf8'));
  const otrosServicios = archivos.filter(
    (p) => p.startsWith(DIR) && !esPrueba(p),
  );

  const huerfanos: string[] = [];
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.service.ts'))) {
    const ruta = join(DIR, f);
    const texto = readFileSync(ruta, 'utf8');
    for (const m of texto.matchAll(/export const (\w+)\s*(?::[^=]*)?=\s*\{/g)) {
      const objeto = m[1];
      if (!ES_CLIENTE.test(objeto)) continue;
      for (const metodo of metodosDe(texto, objeto)) {
        const aguja = `.${metodo}(`;
        if (producto.some((t) => t.includes(aguja))) continue;
        // Un servicio que llama a otro tampoco es una puerta que falta.
        const desdeOtroServicio = otrosServicios.some(
          (p) => p !== ruta && readFileSync(p, 'utf8').includes(aguja),
        );
        if (desdeOtroServicio) continue;
        huerfanos.push(`${objeto}.${metodo}`);
      }
    }
  }
  return huerfanos.sort();
}

/**
 * Lo que HOY no tiene puerta. Medido el 22-09-2026.
 *
 * 🔴 Para quitar uno de acá hay que construir la pantalla que lo llame, o
 * borrar el método. Agregar uno nuevo sin decir por qué es exactamente lo que
 * esta prueba viene a impedir.
 */
const DECLARADOS: readonly string[] = [
  'actasApi.complete',
  'actasApi.objetar',
  'agencyApi.declineInvitation',
  'agencyApi.getOnboardingStatus',
  'agencySubscriptionApi.chargePseCheckout',
  'agentesApi.getLeaderboard',
  'aiAnalysisApi.getDocumentResult',
  'aiAnalysisApi.triggerDocumentAnalysis',
  'bitacoraApi.acciones',
  'captacionApi.anularFirma',
  'captacionApi.consultarListas',
  'captacionApi.datos',
  'captacionApi.guardarDatos',
  'captacionApi.previsualizarVenta',
  'captacionApi.revisarBaja',
  'captacionApi.sePuedePublicar',
  'captacionApi.urlDelDocumento',
  'carteraApi.inquilinos',
  'carteraApi.propietarios',
  'clausulasPropiasApi.eliminar',
  'cobrosApi.generateOne',
  'cobrosApi.registerPayment',
  'conciliacionBancariaApi.conciliarSeguros',
  'contractsApi.inquilinos',
  'facturacionElectronicaService.crearProveedor',
  'facturacionElectronicaService.notasDebito',
  'finanzasApi.asignarASede',
  'inmobiliariaConfigApi.getConfigBilling',
  'inmobiliariaConfigApi.getConfigInvoices',
  'landlordApi.getCandidateWithStatus',
  'landlordApi.getDashboard',
  'landlordApplicationsApi.deleteNote',
  'landlordApplicationsApi.getDocumentDownloadUrl',
  'landlordApplicationsApi.saveNote',
  'landlordApplicationsApi.triggerReevaluation',
  'leadsApi.buscarContactos',
  'leadsApi.contacto',
  'leadsApi.continuar',
  'leadsApi.reasignaciones',
  'leadsApi.reasignar',
  'leadsApi.reasignarVencidos',
  'leadsApi.respondido',
  'mantenimientoApi.changeStatus',
  'mantenimientoApi.getKanban',
  'mantenimientoApi.reabrirPorGarantia',
  'matchingApi.guardarPesos',
  'mediosDePagoApi.catalogo',
  'messagesApi.archiveConversation',
  'messagesApi.getApplicationMessages',
  'messagesApi.getConversationMessages',
  'messagesApi.getMessagesByLease',
  'messagesApi.markApplicationAsRead',
  'messagesApi.markConversationAsRead',
  'messagesApi.muteConversation',
  'messagesApi.reportConversation',
  'messagesApi.sendApplicationMessage',
  'messagesApi.sendAttachment',
  'messagesApi.sendConversationMessage',
  'messagesApi.sendMessageByLease',
  'nominaApi.actualizarNovedad',
  'nominaApi.actualizarPersona',
  'nominaApi.ajustar',
  'nominaApi.borrarConcepto',
  'nominaApi.borrarNovedad',
  'nominaApi.catalogoDeNovedades',
  'nominaApi.causales',
  'nominaApi.crearConcepto',
  'nominaApi.crearNovedad',
  'nominaApi.definitiva',
  'nominaApi.generarElectronica',
  'nominaApi.novedades',
  'nominaApi.persona',
  'nominaApi.reactivarPersona',
  'nominaApi.retirarPersona',
  'ownerFinanzasApi.getInformePdf',
  'ownerFinanzasApi.getPortafolio',
  'ownerFinanzasApi.getProyeccion',
  'ownerFinanzasApi.getRecaudoAnual',
  'paymentMethodsApi.unassignProperty',
  'permissionsApi.getMemberPermissions',
  'permissionsApi.getMyPermissions',
  'permissionsApi.updateMemberPermissions',
  'pipelineApi.getStats',
  'plantillasDeMensajeApi.eliminar',
  'postulacionesApi.revisarCierre',
  'propertiesApi.getAssigned',
  'propertiesApi.removeAgent',
  'propietariosApi.getCobros',
  'propietariosApi.getDispersiones',
  'proveedoresDeMantenimientoApi.calificar',
  'pseCheckoutApi.checkout',
  'pseCheckoutApi.getRequestStatus',
  'pseCheckoutApi.verifyRequest',
  'recibosDeCajaApi.anticipos',
  'recibosDeCajaApi.aplicarAnticipos',
  'renovacionAutomaticaApi.borrarAviso',
  'renovacionAutomaticaApi.registrarAviso',
  'renovacionesApi.getUpcoming',
  'reportesApi.export',
  'reportesApi.getDefinitions',
  'sessionApi.claim',
  'sessionApi.revoke',
  'subscriptionsApi.cancelSubscription',
  'subscriptionsApi.createSubscription',
  'subscriptionsApi.getPlan',
  'tesoreriaApi.detalleDelArchivo',
  'tesoreriaApi.listarArchivos',
  'tesoreriaApi.pendientesDelContrato',
  'visitasApi.noShows',
  'visitasApi.sePuedeMostrar',
];

describe('🔴 ninguna ruta del cliente se queda sin puerta', () => {
  it('no aparece un método NUEVO sin un solo llamador en el producto', () => {
    const hoy = metodosSinLlamador();
    const nuevos = hoy.filter((m) => !DECLARADOS.includes(m));
    expect(
      nuevos,
      `Estos métodos del cliente HTTP no los llama nadie en el producto.\n` +
        `Si la pantalla que los usa todavía no existe, esa pantalla es la tarea;\n` +
        `si el método sobró, bórralo. Declararlo acá es el último recurso, y va\n` +
        `con el motivo escrito.\n\n  ${nuevos.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('🔴 la lista declarada no se queda con métodos que YA tienen puerta', () => {
    // Si alguien construyó la pantalla, el método sale de la lista. Sin esto
    // la lista sólo crece y deja de significar algo.
    const hoy = new Set(metodosSinLlamador());
    const yaConectados = DECLARADOS.filter((m) => !hoy.has(m));
    expect(
      yaConectados,
      `Estos ya tienen quien los llame: sácalos de DECLARADOS.\n\n  ${yaConectados.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('el barrido mira los 95 servicios y encuentra métodos de verdad', () => {
    // Un guardián que no encuentra nada porque el regex se rompió es peor que
    // no tenerlo: pasaría verde para siempre.
    expect(readdirSync(DIR).filter((x) => x.endsWith('.service.ts')).length).toBeGreaterThan(80);
    expect(metodosSinLlamador().length).toBeGreaterThan(0);
  });
});
