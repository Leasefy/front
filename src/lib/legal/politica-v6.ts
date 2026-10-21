/**
 * La política de tratamiento v6.0 = la v5.0 + la política de datos hermética
 * (20-10-2026).
 *
 * ── Qué cambia frente a la v5.0 ─────────────────────────────────────────────
 *
 * Nico (20-10-2026): «necesito una política de datos muy hermética» — que los
 * agentes de IA usen bien los datos de nuestros clientes y que nunca salgan de
 * la plataforma; las grabaciones y transcripciones de cobranza se guardan
 * «2 años desde la llamada», y «mientras siga en jurídico». Publicarla: «si».
 * Es un cambio MATERIAL: versión nueva; la v5.0 queda intacta en
 * `politica-v5.ts` (es lo que aceptó quien aceptó antes).
 *
 * Se arma DESDE la v5.0 y sólo agrega o cambia esto, para que la diferencia se
 * lea aquí y la prueba (`versiones.test.ts`) la fije:
 *   · §5: «este documento es la versión 5.0» dice 6.0.
 *   · §6: al final, «Los agentes trabajan dentro de la plataforma».
 *   · §7: la viñeta de cuánto se guardan las grabaciones (12 meses → 2 años, con
 *     su transcripción).
 *   · §11: después del aviso, el control antes de que algo salga.
 *   · §13: la viñeta de las grabaciones (12 meses → 2 años, con transcripciones).
 *   · §17: después de «Lo que hacemos», quién ve y quién descarga.
 *
 * 🔴 NUNCA se edita el contenido de una versión ya publicada: se publica una
 * nueva y se sube la constante en `versiones.ts`.
 */

import type { Bloque, Seccion } from './politica-v3';
import { POLITICA_V5 } from './politica-v5';

const FRASE_DE_LA_VERSION_VIEJA = 'Por eso este documento es la versión 5.0 y no una corrección sobre la anterior.';
const FRASE_DE_LA_VERSION = 'Por eso este documento es la versión 6.0 y no una corrección sobre la anterior.';

export const SUBTITULO_DE_LOS_AGENTES = 'Los agentes trabajan dentro de la plataforma';

export const PARRAFO_DE_LOS_AGENTES =
  'Los agentes usan **sólo los datos que necesitan para cada tarea**, y sólo los de la persona y la inmobiliaria del caso. **No le revelan a una persona los datos de otra.** Lo que llega dentro de un documento, un correo o un mensaje lo tratan como información, nunca como una orden: si un texto les pide sacar datos de la plataforma o enviarlos a otro lado, no lo hacen.';

export const GRABACIONES_EN_LAS_LLAMADAS_VIEJO =
  'Se guardan **12 meses**, o hasta que se cierre el caso jurídico al que pertenecen, lo que ocurra después.';
export const GRABACIONES_EN_LAS_LLAMADAS =
  'Se guardan **2 años desde la llamada**, con su transcripción, o mientras el caso al que pertenecen siga en cobro jurídico, lo que ocurra después. **Luego se borran.**';

export const GRABACIONES_EN_LA_CONSERVACION_VIEJO = '**Grabaciones de llamadas**: 12 meses, o hasta el cierre del caso jurídico.';
export const GRABACIONES_EN_LA_CONSERVACION =
  '**Grabaciones y transcripciones de las llamadas**: 2 años desde la llamada, o mientras el caso siga en cobro jurídico, lo que ocurra después.';

export const CONTROL_DE_SALIDA =
  '**Antes de que algo salga de la plataforma, pasa por un control.** Todo mensaje, correo, SMS o llamada se revisa justo antes de enviarse:';

export const REGLAS_DE_SALIDA: readonly string[] = Object.freeze([
  'Sólo sale **hacia alguien registrado en Leasefy**: tú, tu inmobiliaria y su equipo, o un proveedor, abogado o aseguradora que trabaje con ella.',
  '**A cada persona sólo le llegan sus propios datos.** Si un mensaje trae datos de otra persona, no se envía. El equipo de tu inmobiliaria sí recibe los datos de sus clientes, porque los atiende.',
  'Los enlaces sólo llevan a Leasefy, a la pasarela de pago o al sitio de tu inmobiliaria.',
  'Lo que no pasa el control **no se envía y queda registrado**.',
]);

export const QUIEN_VE_Y_QUIEN_DESCARGA =
  '**Dentro de tu inmobiliaria, cada persona ve lo que su rol le permite**, y **descargar archivos con datos personales** (contratos, inquilinos, propietarios, cartera) requiere un permiso específico. En Leasefy, sólo las personas autorizadas acceden a los datos de la plataforma, y los cambios que hacen quedan registrados con quién los hizo y por qué.';

const p = (texto: string): Bloque => ({ tipo: 'p', texto });
const sub = (texto: string): Bloque => ({ tipo: 'sub', texto });
const lista = (items: string[]): Bloque => ({ tipo: 'lista', items });

function falta(seccion: number, que: string): never {
  throw new Error(`politica-v6: la §${seccion} de la v5.0 ya no tiene ${que}`);
}

/** Cambia UNA viñeta de una lista, palabra por palabra. */
function conLaVinetaCambiada(seccion: number, bloques: Bloque[], vieja: string, nueva: string): Bloque[] {
  const i = bloques.findIndex((b) => b.tipo === 'lista' && b.items?.includes(vieja));
  if (i < 0) falta(seccion, `la viñeta «${vieja.slice(0, 40)}…»`);
  return bloques.map((b, j) => (j === i ? { ...b, items: b.items!.map((x) => (x === vieja ? nueva : x)) } : b));
}

function conLaVersion(bloques: Bloque[]): Bloque[] {
  const i = bloques.findIndex((b) => b.tipo === 'p' && b.texto?.includes(FRASE_DE_LA_VERSION_VIEJA));
  if (i < 0) falta(5, '«la versión 5.0»');
  return bloques.map((b, j) => (j === i ? { ...b, texto: b.texto!.replace(FRASE_DE_LA_VERSION_VIEJA, FRASE_DE_LA_VERSION) } : b));
}

function conElControlDeSalida(bloques: Bloque[]): Bloque[] {
  const i = bloques.findIndex((b) => b.tipo === 'aviso');
  if (i < 0) falta(11, 'el aviso de «Nunca vendemos tus datos»');
  return [...bloques.slice(0, i + 1), p(CONTROL_DE_SALIDA), lista([...REGLAS_DE_SALIDA]), ...bloques.slice(i + 1)];
}

function conQuienVe(bloques: Bloque[]): Bloque[] {
  const i = bloques.findIndex((b) => b.tipo === 'p' && b.texto?.startsWith('**Lo que hacemos:**'));
  if (i < 0) falta(17, '«Lo que hacemos»');
  return [...bloques.slice(0, i + 1), p(QUIEN_VE_Y_QUIEN_DESCARGA), ...bloques.slice(i + 1)];
}

export const POLITICA_V6: Seccion[] = POLITICA_V5.map((s) => {
  switch (s.n) {
    case 5:
      return { ...s, bloques: conLaVersion(s.bloques) };
    case 6:
      return { ...s, bloques: [...s.bloques, sub(SUBTITULO_DE_LOS_AGENTES), p(PARRAFO_DE_LOS_AGENTES)] };
    case 7:
      return { ...s, bloques: conLaVinetaCambiada(7, s.bloques, GRABACIONES_EN_LAS_LLAMADAS_VIEJO, GRABACIONES_EN_LAS_LLAMADAS) };
    case 11:
      return { ...s, bloques: conElControlDeSalida(s.bloques) };
    case 13:
      return {
        ...s,
        bloques: conLaVinetaCambiada(13, s.bloques, GRABACIONES_EN_LA_CONSERVACION_VIEJO, GRABACIONES_EN_LA_CONSERVACION),
      };
    case 17:
      return { ...s, bloques: conQuienVe(s.bloques) };
    default:
      return s;
  }
});
