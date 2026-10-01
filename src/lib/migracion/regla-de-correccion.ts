/**
 * La regla contable que quien vuelve a subir un archivo corregido tiene que
 * conocer.
 *
 * T-0125 (tras el rework del back): un asiento migrado con número se reconoce
 * por su número + su día + sus líneas (cuenta, débito, crédito). Un asiento
 * idéntico se omite como «ya estaba cargado». Si se CORRIGIÓ un monto o una
 * cuenta de uno ya cargado, el archivo corregido ya no es idéntico: entra como
 * un asiento NUEVO y el original sigue en el libro. Un asiento no se edita: se
 * reversa el original.
 */
export const REGLA_DE_CORRECCION =
  'Los asientos idénticos se omiten. Si corregiste un monto o una cuenta de uno que ya estaba cargado, ' +
  'el corregido entra como un asiento nuevo y tienes que reversar el original.';
