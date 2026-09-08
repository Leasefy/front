/**
 * El correo con el que alguien entra a Leasefy: normalizar, validar y sugerir.
 *
 * ── Por qué existe (Nico, 2026-09-07) ─────────────────────────────────────
 * «Revisa que en el input de correo pongan correos válidos y agrega casos que
 * puedan llegar a pasar ahí para que sí o sí no vayan a haber errores al
 * entrar.» El correo del registro es el que después se escribe en el login:
 * si al registrarse entró «Nicolas@Gmail.com » (mayúscula del teclado del
 * celular, espacio del autocompletado) y al entrar escribe «nicolas@gmail.com»,
 * la persona no sabe por qué no entra. Y si entró «nico@gmail.con», el enlace
 * de confirmación se fue a ningún lado y nunca va a poder entrar.
 *
 * Tres piezas, todas puras:
 *
 * - `normalizarCorreo`: lo que se manda a Supabase SIEMPRE pasa por acá, en el
 *   registro y en el login, así los dos coinciden. Recorta espacios, baja a
 *   minúsculas, quita invisibles y el «mailto:» o el «Nombre <correo>» que
 *   pega algún cliente de correo.
 * - `validarCorreo`: dice QUÉ está mal, no sólo que está mal. «Falta la @» es
 *   accionable; «Email inválido» no.
 * - `sugerirCorreo`: los errores de dedo en los dominios que usa todo el mundo
 *   («gmail.con», «hotmial.com»). No corrige solo —el dominio raro puede ser
 *   real—: propone, y la pantalla decide si bloquea o sólo ofrece.
 *
 * Sólo ASCII a propósito: Supabase rechaza correos con tildes o ñ y una
 * dirección así no existe en la práctica.
 */

const INVISIBLES = /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g;


/** Lo que va antes de la @ (RFC 5322, la parte práctica, sin comillas). */
const LOCAL_PERMITIDO = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
/** Una etiqueta del dominio: letras, números y guiones, sin guion en las puntas. */
const ETIQUETA_DE_DOMINIO = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** Tabuladores, saltos y demás códigos de control que no se ven pero llegan pegados. */
function sinCaracteresDeControl(texto: string): string {
  let limpio = '';
  for (const ch of texto) {
    const codigo = ch.charCodeAt(0);
    if (codigo >= 0x20 && codigo !== 0x7f) limpio += ch;
  }
  return limpio;
}

export function normalizarCorreo(crudo: string | null | undefined): string {
  if (!crudo) return '';
  let correo = String(crudo).normalize('NFKC').replace(INVISIBLES, '');
  correo = sinCaracteresDeControl(correo).trim();
  // «Nicolás García <nico@gmail.com>»: lo que pega el autocompletado de algunos clientes.
  const entreAngulos = correo.match(/<([^<>]+)>/);
  if (entreAngulos) correo = entreAngulos[1].trim();
  if (/^mailto:/i.test(correo)) correo = correo.slice('mailto:'.length).trim();
  return correo.toLowerCase();
}

export type CorreoValidado =
  | { ok: true; correo: string; sugerencia: string | null }
  | { ok: false; correo: string; motivo: string; sugerencia: string | null };

/**
 * Dominios que casi siempre son un error de dedo de otro dominio. La clave es
 * lo que escribió la persona; el valor, lo que seguramente quiso escribir.
 * Sólo proveedores masivos: «empresa.co» es un dominio colombiano legítimo y
 * no se toca.
 */
const DOMINIOS_MAL_ESCRITOS: Record<string, string> = {
  // Gmail
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gmail.cmo': 'gmail.com',
  'gmail.ocm': 'gmail.com',
  'gmail.vom': 'gmail.com',
  'gmail.xom': 'gmail.com',
  'gmail.com.co': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gimail.com': 'gmail.com',
  'gmail': 'gmail.com',
  'gmailcom': 'gmail.com',
  // Hotmail
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotmail.om': 'hotmail.com',
  'hotmail.comm': 'hotmail.com',
  'hotmail.cmo': 'hotmail.com',
  'hotmail.com.co': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'homail.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmail': 'hotmail.com',
  'hotmailcom': 'hotmail.com',
  // Outlook / Live / MSN
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'outlook.comm': 'outlook.com',
  'outlook.cmo': 'outlook.com',
  'outlook.com.co': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook': 'outlook.com',
  'outlookcom': 'outlook.com',
  'live.con': 'live.com',
  'live.cm': 'live.com',
  'live.comm': 'live.com',
  'msn.con': 'msn.com',
  // Yahoo
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yahoo.comm': 'yahoo.com',
  'yahoo.cmo': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yahoo': 'yahoo.com',
  'yahoocom': 'yahoo.com',
  // iCloud
  'icloud.co': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icloud.cm': 'icloud.com',
  'icloud.comm': 'icloud.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloud': 'icloud.com',
  'icloudcom': 'icloud.com',
  // Proton
  'protonmail.con': 'protonmail.com',
  'proton.m': 'proton.me',
};

/** Terminaciones que no existen y son «.com» con un dedo corrido. */
const TERMINACIONES_QUE_SON_COM = new Set(['con', 'cmo', 'ocm', 'vom', 'xom', 'comm', 'coml', 'cpm', 'cok']);

/**
 * El correo que seguramente quiso escribir, o null si no hay nada que sugerir.
 * Sólo mira el dominio: lo de antes de la @ es de la persona y no se adivina.
 */
export function sugerirCorreo(correo: string): string | null {
  const normalizado = normalizarCorreo(correo);
  const arroba = normalizado.indexOf('@');
  if (arroba <= 0) return null;
  const local = normalizado.slice(0, arroba);
  const dominio = normalizado.slice(arroba + 1).replace(/,/g, '.');
  if (!dominio) return null;

  const conocido = DOMINIOS_MAL_ESCRITOS[dominio];
  if (conocido) return `${local}@${conocido}`;

  const etiquetas = dominio.split('.');
  const terminacion = etiquetas[etiquetas.length - 1];
  if (etiquetas.length >= 2 && TERMINACIONES_QUE_SON_COM.has(terminacion)) {
    return `${local}@${[...etiquetas.slice(0, -1), 'com'].join('.')}`;
  }

  // La coma en vez del punto («gmail,com») ya quedó reemplazada arriba: si
  // el resultado difiere de lo escrito, eso es la sugerencia.
  const escrito = normalizado.slice(arroba + 1);
  if (escrito !== dominio) return `${local}@${dominio}`;

  return null;
}

function falla(correo: string, motivo: string, sugerencia: string | null = null): CorreoValidado {
  return { ok: false, correo, motivo, sugerencia };
}

/**
 * Valida el correo ya normalizado y dice qué le falta. Con `ok: true` puede
 * venir igual una `sugerencia`: el correo es válido en forma pero el dominio
 * parece un error de dedo.
 */
export function validarCorreo(crudo: string | null | undefined): CorreoValidado {
  const correo = normalizarCorreo(crudo);

  if (!correo) return falla(correo, 'Escribe tu correo.');
  if (/\s/.test(correo)) return falla(correo, 'El correo no puede tener espacios.');
  if (/[^\x21-\x7e]/.test(correo)) {
    return falla(correo, 'El correo no puede tener tildes, ñ ni otros símbolos: sólo letras, números, puntos y guiones.');
  }

  const arrobas = correo.split('@').length - 1;
  if (arrobas === 0) return falla(correo, 'Falta la @ (por ejemplo, nombre@gmail.com).');
  if (arrobas > 1) return falla(correo, 'Sólo puede haber una @.');

  const [local, dominio] = correo.split('@');
  if (!local) return falla(correo, 'Falta lo que va antes de la @.');
  if (!dominio) return falla(correo, 'Falta el dominio después de la @ (por ejemplo, gmail.com).');
  if (local.length > 64 || correo.length > 254) return falla(correo, 'El correo es demasiado largo.');
  if (!LOCAL_PERMITIDO.test(local)) return falla(correo, 'Antes de la @ hay un carácter que no va en un correo.');
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return falla(correo, 'Antes de la @ el punto no puede ir al principio, al final ni repetido.');
  }

  const sugerencia = sugerirCorreo(correo);

  if (dominio.includes(',')) return falla(correo, 'En el dominio va un punto, no una coma.', sugerencia);
  if (!dominio.includes('.')) {
    return falla(correo, 'Al dominio le falta el punto (por ejemplo, gmail.com).', sugerencia);
  }

  const etiquetas = dominio.split('.');
  if (etiquetas.some((e) => e === '')) return falla(correo, 'El dominio tiene un punto de más.', sugerencia);
  if (etiquetas.some((e) => !ETIQUETA_DE_DOMINIO.test(e))) {
    return falla(correo, 'El dominio tiene un carácter que no va (sólo letras, números y guiones).', sugerencia);
  }
  const terminacion = etiquetas[etiquetas.length - 1];
  if (!/^[a-z]{2,}$/.test(terminacion)) {
    return falla(correo, 'La terminación del dominio no es válida (por ejemplo, .com o .co).', sugerencia);
  }

  return { ok: true, correo, sugerencia };
}

/**
 * Dónde leer el correo, para el botón «Abrir Gmail» de las pantallas de
 * «Revisa tu correo». Sólo los proveedores con webmail conocido; con
 * cualquier otro dominio no hay botón, que es mejor que un botón que abre
 * cualquier cosa.
 */
export function webmailDelCorreo(correo: string): { nombre: string; url: string } | null {
  const dominio = normalizarCorreo(correo).split('@')[1] ?? '';
  if (!dominio) return null;
  if (dominio === 'gmail.com' || dominio === 'googlemail.com') {
    return { nombre: 'Gmail', url: 'https://mail.google.com/mail/u/0/' };
  }
  if (/^(hotmail|outlook|live|msn)\.[a-z.]+$/.test(dominio)) {
    return { nombre: 'Outlook', url: 'https://outlook.live.com/mail/0/' };
  }
  if (/^(yahoo|ymail|rocketmail)\.[a-z.]+$/.test(dominio)) {
    return { nombre: 'Yahoo Mail', url: 'https://mail.yahoo.com/' };
  }
  if (dominio === 'icloud.com' || dominio === 'me.com' || dominio === 'mac.com') {
    return { nombre: 'iCloud Mail', url: 'https://www.icloud.com/mail/' };
  }
  if (dominio === 'proton.me' || dominio === 'protonmail.com' || dominio === 'pm.me') {
    return { nombre: 'Proton Mail', url: 'https://mail.proton.me/' };
  }
  return null;
}
