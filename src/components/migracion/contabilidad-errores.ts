/**
 * Los códigos de error de `back-erp/src/inmobiliaria/contabilidad/*` en
 * palabras. El back manda `{ statusCode, code, message }`; el CÓDIGO es el
 * contrato y el mensaje es copy. Acá se traduce a lo que la persona tiene
 * que hacer, no a lo que el sistema no pudo.
 *
 * 🔴 Sistema de errores (02-10-2026): este traductor se queda SÓLO con los
 * códigos de negocio de la contabilidad (la tabla de abajo, la apertura ya
 * registrada y el 403 sin código del guard de escritura). Todo lo demás —un
 * 400 de validación con `campos`, un 409 sin código propio, un 5xx, la red—
 * lo dice `mensajeParaLaPersona`, con la regla de oro: «conexión» sólo cuando
 * no hubo respuesta; un 5xx, «de nuestro lado» con la referencia. Antes un
 * `TypeError: Failed to fetch` o un 500 salían crudos en la pantalla.
 */

import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatDate } from '@/lib/format';
import { conCentavosEn, configDePlataAhora } from '@/lib/plata/con-centavos';

const MENSAJES: Record<string, string> = {
  // puc.service.ts
  CODIGO_FUERA_DEL_ARBOL:
    'El código tiene que empezar con el código de la cuenta padre y ser más largo (1105 → 110505).',
  PADRE_DESCONOCIDO: 'La cuenta padre que elegiste ya no existe. Recarga el plan.',
  PADRE_CON_MOVIMIENTOS:
    'Esa cuenta ya tiene movimientos: no puede convertirse en cuenta mayor con subcuentas.',
  CODIGO_DUPLICADO: 'Ya hay una cuenta con ese código en tu plan.',
  NATURALEZA_CON_MOVIMIENTOS: 'La cuenta tiene movimientos: la naturaleza ya no se puede cambiar.',
  CUENTA_MAYOR: 'Una cuenta con subcuentas no puede recibir movimientos. Imputa en la subcuenta.',
  CUENTA_CON_MOVIMIENTOS: 'La cuenta tiene movimientos: se puede desactivar, pero no borrar ni dejar de ser imputable.',
  CUENTA_CON_SUBCUENTAS: 'La cuenta tiene subcuentas: primero borra o desactiva las subcuentas.',
  // asientos.service.ts
  ASIENTO_INCOMPLETO: 'Un asiento necesita al menos dos líneas.',
  MOVIMIENTO_AMBIGUO: 'Una línea no puede tener débito y crédito a la vez.',
  MOVIMIENTO_VACIO: 'Hay una línea sin monto.',
  MONTO_NEGATIVO: 'Los montos van en positivo: el lado (débito o crédito) dice el signo.',
  MONTO_INVALIDO: 'Los montos van en pesos enteros, sin centavos.',
  MONTO_FUERA_DE_RANGO: 'Un monto es demasiado grande para una sola línea. Partila en dos.',
  ASIENTO_DESCUADRADO: 'El asiento no cuadra: los débitos tienen que ser iguales a los créditos.',
  CUENTA_NO_IMPUTABLE: 'Una de las cuentas es mayor (tiene subcuentas): imputa en la subcuenta.',
  CUENTA_INACTIVA: 'Una de las cuentas está inactiva.',
  CUENTA_DESCONOCIDA: 'Una de las cuentas no existe en tu plan.',
  FECHA_INVALIDA: 'La fecha tiene que ser un día real, en formato AAAA-MM-DD.',
  PERIODO_CERRADO: 'Esa fecha cae en un período que ya se cerró.',
  ASIENTO_YA_REVERSADO: 'Ese asiento ya tiene su reversión: no se puede reversar dos veces.',
  PERIODO_YA_CERRADO: 'Ese período ya estaba cerrado.',
  // reapertura.service.ts (19-09)
  MOTIVO_OBLIGATORIO:
    'Reabrir un mes cerrado exige un motivo escrito: queda en la bitácora y es lo que hace que el cierre se pueda deshacer sin perder el rastro.',
  NADA_QUE_REABRIR: 'La contabilidad no tiene ninguna fecha cerrada: no hay nada que reabrir.',
  NO_ES_UNA_REAPERTURA:
    'Esa fecha no mueve la frontera hacia atrás. Para cerrar MÁS se usa el cierre, no la reapertura.',
  REAPERTURA_SIN_MIGRAR:
    'Todavía no se puede reabrir un mes cerrado: esta función aún no está disponible. Nuestro equipo la está habilitando.',
  // puc.service.ts / exogena.service.ts (19-09)
  NO_DEDUCIBLE_SIN_MIGRAR:
    'Todavía no se puede marcar una cuenta como no deducible: esta función todavía no está disponible y nuestro equipo la está habilitando. Mientras tanto todo el gasto se declara deducible en el 1001.',
  CONFIGURACION_DE_EXOGENA_SIN_MIGRAR:
    'Todavía no se puede guardar la configuración de exógena: esta función todavía no está disponible y nuestro equipo la está habilitando. Mientras tanto rigen los valores por defecto.',
  // migracion-contable.service.ts
  LOTE_DEMASIADO_GRANDE: 'El lote es demasiado grande: parte el archivo en tandas de 5.000 asientos.',
};

/**
 * T-0125 · 409 `APERTURA_YA_REGISTRADA`: la fecha de corte ya tiene un asiento
 * de apertura vigente con OTROS saldos. El back manda `details {numero, fecha}`
 * y un `message` autosuficiente; se prefiere armar la frase con los datos (para
 * que el número y la fecha estén siempre) y se cae al mensaje del back, y por
 * último a un texto propio, si `details` no vino bien formado.
 */
const CORRECCION_DE_LA_APERTURA =
  'Los asientos no se editan: si quedó mal, reversa ese asiento y registra el nuevo.';

function mensajeDeAperturaYaRegistrada(e: ApiError): string {
  const details = e.detalle?.details;
  if (typeof details === 'object' && details !== null) {
    const { numero, fecha } = details as { numero?: unknown; fecha?: unknown };
    if (typeof numero === 'number' && typeof fecha === 'string' && fecha.length >= 10) {
      return (
        `Ya hay un asiento de apertura con fecha de corte ${formatDate(fecha.slice(0, 10))}: ` +
        `el N.º ${numero}, con otros saldos. ${CORRECCION_DE_LA_APERTURA}`
      );
    }
  }
  // El `message` del back es autosuficiente; «Error 409» es el relleno del cliente.
  if (e.message && !/^Error \d+$/.test(e.message)) return e.message;
  return `Ya hay un asiento de apertura con esa fecha de corte y otros saldos. ${CORRECCION_DE_LA_APERTURA}`;
}

/**
 * El 403 de `ContabilidadEscrituraGuard`, que viene SIN `code`. Es el mismo
 * texto de `MOTIVO_SIN_ESCRITURA` (`use-puede-escribir.ts`): la pantalla dice
 * lo mismo antes y después del intento. Un 403 CON código
 * (`SIN_ACCESO_A_CONTABILIDAD`, los de nómina) trae su propio mensaje y lo
 * dice el traductor.
 */
/** `MONTO_INVALIDO` con la llave de la contabilidad prendida (el back dice lo mismo). */
const MONTO_INVALIDO_CON_CENTAVOS = 'Los montos van en pesos, con hasta dos decimales (centavos).';

const SIN_PERMISO_DE_ESCRITURA =
  'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';

/**
 * «No se pudo crear el asiento.» → «crear el asiento»: lo que se estaba
 * haciendo, para que un 5xx diga «No pudimos crear el asiento: algo falló de
 * nuestro lado…». Si el respaldo no tiene esa forma, el 5xx dice la frase
 * general.
 */
function accionDelRespaldo(respaldo: string): string | undefined {
  const m = /^No (?:se pudo|se pudieron|pudimos) ([^.:]+)[.:]/.exec(respaldo.trim());
  return m ? m[1].trim() : undefined;
}

/**
 * La frase para la persona. `respaldo` es lo que se dice si el error no trae
 * nada legible; `accion` (opcional, en infinitivo) nombra lo que se estaba
 * haciendo para un 5xx —si falta, sale del respaldo—.
 */
export function mensajeDeContabilidad(e: unknown, respaldo: string, accion?: string): string {
  if (e instanceof ApiError) {
    if (e.code === 'APERTURA_YA_REGISTRADA') return mensajeDeAperturaYaRegistrada(e);
    // «Centavos en todo»: «sin centavos» SÓLO con la llave de la contabilidad
    // apagada (la que ya preguntó la pantalla del asiento); prendida, el monto
    // inválido es el que trae más de dos decimales.
    if (
      e.code === 'MONTO_INVALIDO' &&
      conCentavosEn(configDePlataAhora(), 'contabilidad_facturacion_y_exogena')
    ) {
      return MONTO_INVALIDO_CON_CENTAVOS;
    }
    if (e.code && MENSAJES[e.code]) return MENSAJES[e.code];
    if (e.status === 403 && !e.code) return SIN_PERMISO_DE_ESCRITURA;
  }
  return mensajeParaLaPersona(e, {
    porDefecto: respaldo,
    accion: accion ?? accionDelRespaldo(respaldo),
  });
}
