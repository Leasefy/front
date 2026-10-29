/**
 * La política de tratamiento v7.0 = la v6.0 + el plan gratis (29-10-2026).
 *
 * ── Qué cambia frente a la v6.0 ─────────────────────────────────────────────
 *
 * Nico (28-10-2026, reunión del CRM): los inquilinos y lo demás del marketplace quedan gratis para quien entra sin la
 * demo, y «en los términos tiene que estar que Leasefy se queda con esa información y la va a usufructuar». El 29-10,
 * al preguntarle si también iba en la Política: «también en la Política». Es un cambio MATERIAL (una finalidad nueva):
 * versión nueva; la v6.0 queda intacta en `politica-v6.ts` (es lo que aceptó quien aceptó antes). Lo dice igual que la
 * cláusula «El plan gratis» de los Términos v2.3 (§6).
 *
 * Se arma DESDE la v6.0 y sólo agrega o cambia esto, para que la diferencia se lea aquí y la prueba
 * (`versiones.test.ts`) la fije:
 *   · §4: al final, la finalidad «Ofrecer inmuebles y servicios a quien entra por el plan gratis» (la lista de §4 es
 *     exhaustiva: lo que no está ahí no se hace).
 *   · §5: «este documento es la versión 6.0» dice 7.0.
 *   · §16: la viñeta de «no usamos los datos… para ofrecerles nuestros servicios» suma la excepción del plan gratis, y
 *     al final va «El plan gratis».
 *
 * 🔴 NUNCA se edita el contenido de una versión ya publicada: se publica una nueva y se sube la constante en
 * `versiones.ts` (y su espejo del back, `legal/aceptaciones/aceptaciones-legales.ts`). Texto para que lo revise un
 * abogado antes de llevarlo a producción.
 */

import type { Bloque, Seccion } from './politica-v3';
import { POLITICA_V6 } from './politica-v6';

const FRASE_DE_LA_VERSION_VIEJA = 'Por eso este documento es la versión 6.0 y no una corrección sobre la anterior.';
const FRASE_DE_LA_VERSION = 'Por eso este documento es la versión 7.0 y no una corrección sobre la anterior.';

export const SUBTITULO_DE_LA_FINALIDAD_DEL_PLAN_GRATIS = 'Ofrecer inmuebles y servicios a quien entra por el plan gratis';

export const PARRAFO_DE_LA_FINALIDAD_DEL_PLAN_GRATIS =
  'Cuando una inmobiliaria o una persona usa Leasefy sin pagar —el marketplace, Arrendamientos e Inquilinos—, conservar y usar la información que carga para prestar y mejorar los servicios, para el análisis del mercado inmobiliario y para **ofrecer a esas personas inmuebles y servicios de Leasefy y de sus aliados**, con el alcance de la sección «Qué hacemos con la información de la plataforma».';

export const NO_OFRECEMOS_VIEJO =
  '**No usamos los datos de los clientes de una inmobiliaria para ofrecerles nuestros servicios por fuera de ella**, salvo que esa inmobiliaria lo haya autorizado expresamente y por escrito en su contrato comercial.';
export const NO_OFRECEMOS =
  '**No usamos los datos de los clientes de una inmobiliaria para ofrecerles nuestros servicios por fuera de ella**, salvo que esa inmobiliaria lo haya autorizado expresamente y por escrito en su contrato comercial, o que use Leasefy con el plan gratis (abajo).';

export const SUBTITULO_DEL_PLAN_GRATIS = 'El plan gratis';

export const PARRAFO_DEL_PLAN_GRATIS =
  'Quien usa Leasefy sin pagar (el marketplace, Arrendamientos e Inquilinos) **autoriza a Leasefy a conservar y usar la información que carga** —inmuebles, propietarios, inquilinos, postulaciones y pedidos— para prestar y mejorar sus servicios, para el análisis del mercado inmobiliario y para ofrecer a esas personas inmuebles y servicios de Leasefy y de sus aliados. Al cargar los datos de otras personas, declara que cuenta con su autorización para hacerlo. Leasefy es quien contacta a esas personas: **no le entrega sus datos personales a los aliados**, y lo que se comparte con terceros o se publica va siempre sin datos que identifiquen a alguien. Cualquier persona puede pedir que no la contactemos más, como dice la sección «Tus derechos, y cómo ejercerlos».';

const p = (texto: string): Bloque => ({ tipo: 'p', texto });
const sub = (texto: string): Bloque => ({ tipo: 'sub', texto });

function falta(seccion: number, que: string): never {
  throw new Error(`politica-v7: la §${seccion} de la v6.0 ya no tiene ${que}`);
}

function conLaVersion(bloques: Bloque[]): Bloque[] {
  const i = bloques.findIndex((b) => b.tipo === 'p' && b.texto?.includes(FRASE_DE_LA_VERSION_VIEJA));
  if (i < 0) falta(5, '«la versión 6.0»');
  return bloques.map((b, j) => (j === i ? { ...b, texto: b.texto!.replace(FRASE_DE_LA_VERSION_VIEJA, FRASE_DE_LA_VERSION) } : b));
}

function conLaExcepcionDelPlanGratis(bloques: Bloque[]): Bloque[] {
  const i = bloques.findIndex((b) => b.tipo === 'lista' && b.items?.includes(NO_OFRECEMOS_VIEJO));
  if (i < 0) falta(16, 'la viñeta de «No usamos los datos de los clientes…»');
  return bloques.map((b, j) => (j === i ? { ...b, items: b.items!.map((x) => (x === NO_OFRECEMOS_VIEJO ? NO_OFRECEMOS : x)) } : b));
}

export const POLITICA_V7: Seccion[] = POLITICA_V6.map((s) => {
  switch (s.n) {
    case 4:
      return {
        ...s,
        bloques: [...s.bloques, sub(SUBTITULO_DE_LA_FINALIDAD_DEL_PLAN_GRATIS), p(PARRAFO_DE_LA_FINALIDAD_DEL_PLAN_GRATIS)],
      };
    case 5:
      return { ...s, bloques: conLaVersion(s.bloques) };
    case 16:
      return {
        ...s,
        bloques: [...conLaExcepcionDelPlanGratis(s.bloques), sub(SUBTITULO_DEL_PLAN_GRATIS), p(PARRAFO_DEL_PLAN_GRATIS)],
      };
    default:
      return s;
  }
});
