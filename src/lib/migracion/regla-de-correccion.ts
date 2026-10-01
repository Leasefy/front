/**
 * La regla contable que quien vuelve a subir un archivo corregido tiene que
 * conocer: lo que YA está registrado no se reescribe.
 *
 * T-0125: un asiento migrado con número se reconoce por su número (y su
 * fecha), aunque el contenido cambie. Subir otra vez el archivo corregido
 * deja el asiento viejo como está y lo cuenta como «ya estaba cargado». Un
 * asiento no se edita: se reversa y se vuelve a registrar.
 */
export const REGLA_DE_CORRECCION =
  'Si corregiste un asiento que ya estaba cargado, la corrección no lo reescribe: ' +
  'un asiento no se edita, se reversa y se vuelve a registrar.';
