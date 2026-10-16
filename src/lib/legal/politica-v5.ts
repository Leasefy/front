/**
 * La política de tratamiento v5.0 = la v4.0 + los mensajes de la inmobiliaria
 * por WhatsApp (15-10-2026).
 *
 * ── Qué cambia frente a la v4.0 ─────────────────────────────────────────────
 *
 * Nico (15-10-2026; «también propietarios»): «como ya firmaron contrato con la inmobiliaria … dentro de
 * nuestra política de privacidad y términos y condiciones deben de quedar que
 * esas comunicaciones las podemos hacer con inquilinos de nuestras
 * inmobiliarias como clientes y evitar eso de que la persona acepte». Es un
 * cambio MATERIAL: versión nueva; la v4.0 queda intacta en `politica-v4.ts`
 * (es lo que aceptó quien aceptó antes).
 *
 * Se arma DESDE la v4.0 y sólo agrega, para que la diferencia se lea aquí y la
 * prueba (`versiones.test.ts`) la fije:
 *   · §4, después de «Operar el arrendamiento»: el subtítulo y el párrafo de
 *     WhatsApp (`SUBTITULO_DE_WHATSAPP`, `PARRAFO_DE_WHATSAPP`).
 *   · §5: el párrafo de la autorización (`AUTORIZACION_DE_WHATSAPP`), y la frase
 *     «este documento es la versión 3.0», que seguía igual en la v4.0, dice 5.0.
 *
 * 🔴 NUNCA se edita el contenido de una versión ya publicada: se publica una
 * nueva y se sube la constante en `versiones.ts`.
 */

import type { Bloque, Seccion } from './politica-v3';
import { POLITICA_V4 } from './politica-v4';

export const SUBTITULO_DE_WHATSAPP = 'Escribirte por WhatsApp de parte de tu inmobiliaria';

export const PARRAFO_DE_WHATSAPP =
  'Si firmaste un contrato con una inmobiliaria que usa Leasefy —de arrendamiento o, si eres propietario, de administración de tu inmueble—, **tu inmobiliaria te puede escribir por WhatsApp**, al número que registraste, sobre ese contrato: pagos y recibos, giros, mantenimientos, documentos, renovaciones y avisos. Esos mensajes los escribe una persona de tu inmobiliaria desde la plataforma y Leasefy sólo los lleva, como encargado. No los usamos para publicidad. Si prefieres no recibirlos por WhatsApp, díselo a tu inmobiliaria —puedes responder por el mismo chat— y deja de enviártelos por ese canal; lo de tu contrato te seguirá llegando por los demás medios.';

export const AUTORIZACION_DE_WHATSAPP =
  '**Los mensajes de tu inmobiliaria por WhatsApp.** La autorización para que tu inmobiliaria te escriba por WhatsApp sobre tu contrato es la que le diste a ella al firmarlo; por eso la plataforma no te pide un «sí» aparte. Puedes pedirle en cualquier momento que no te escriba por WhatsApp.';

const FRASE_DE_LA_VERSION_VIEJA = 'Por eso este documento es la versión 3.0 y no una corrección sobre la anterior.';
const FRASE_DE_LA_VERSION = 'Por eso este documento es la versión 5.0 y no una corrección sobre la anterior.';

const p = (texto: string): Bloque => ({ tipo: 'p', texto });
const sub = (texto: string): Bloque => ({ tipo: 'sub', texto });

function conWhatsappEnLosUsos(bloques: Bloque[]): Bloque[] {
  const i = bloques.findIndex((b) => b.tipo === 'sub' && b.texto === 'Operar el arrendamiento');
  if (i < 0) throw new Error('politica-v5: la §4 de la v4.0 ya no tiene «Operar el arrendamiento»');
  // El subtítulo va justo después del párrafo de «Operar el arrendamiento».
  return [...bloques.slice(0, i + 2), sub(SUBTITULO_DE_WHATSAPP), p(PARRAFO_DE_WHATSAPP), ...bloques.slice(i + 2)];
}

function conWhatsappEnLaAutorizacion(bloques: Bloque[]): Bloque[] {
  const i = bloques.findIndex((b) => b.tipo === 'p' && b.texto?.includes(FRASE_DE_LA_VERSION_VIEJA));
  if (i < 0) throw new Error('politica-v5: la §5 de la v4.0 ya no dice «la versión 3.0»');
  const conLaVersion = bloques.map((b, j) =>
    j === i ? { ...b, texto: b.texto?.replace(FRASE_DE_LA_VERSION_VIEJA, FRASE_DE_LA_VERSION) } : b,
  );
  // Antes de «Puedes revocar tu autorización…», que cierra la sección.
  return [...conLaVersion.slice(0, i + 1), p(AUTORIZACION_DE_WHATSAPP), ...conLaVersion.slice(i + 1)];
}

export const POLITICA_V5: Seccion[] = POLITICA_V4.map((s) =>
  s.n === 4
    ? { ...s, bloques: conWhatsappEnLosUsos(s.bloques) }
    : s.n === 5
      ? { ...s, bloques: conWhatsappEnLaAutorizacion(s.bloques) }
      : s,
);
