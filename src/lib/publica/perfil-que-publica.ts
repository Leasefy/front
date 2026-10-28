/**
 * El perfil con que alguien vino a publicar (propietario, inmobiliaria o AGENTE), recordado más allá del enlace.
 *
 * QA 27-10-2026 (en el Chrome de Nico): el agente elegía «Soy agente inmobiliario», creaba la cuenta y, al entrar con
 * su clave (no por el enlace del correo, que sí lleva `?perfil=agente`), `/publica` le mostraba «Tu inmobiliaria»: la
 * cuenta del agente es de rol inmobiliaria (`rolDeLaCuenta`) y eso era lo único que quedaba. Ahora el perfil viaja en
 * los datos del registro (`perfil_que_publica`, sobrevive a otro aparato) y en este navegador.
 */
import type { PerfilQuePublica } from '@/components/marketplace/VentanaParaPublicar';

export const CLAVE_DEL_PERFIL_QUE_PUBLICA = 'perfil_que_publica';
const LLAVE = 'leasefy-perfil-que-publica';

const esPerfil = (v: unknown): v is PerfilQuePublica => v === 'landlord' || v === 'agency' || v === 'agente';

export function recordarPerfilQuePublica(perfil: PerfilQuePublica): void {
  try {
    window.localStorage.setItem(LLAVE, perfil);
  } catch {
    /* sin almacenamiento: queda el de la cuenta */
  }
}

export function perfilQuePublicaRecordado(): PerfilQuePublica | null {
  try {
    const v = window.localStorage.getItem(LLAVE);
    return esPerfil(v) ? v : null;
  } catch {
    return null;
  }
}

/** El de los datos de la cuenta (`user_metadata.perfil_que_publica`). */
export function perfilQuePublicaDeLaCuenta(metadatos: unknown): PerfilQuePublica | null {
  if (!metadatos || typeof metadatos !== 'object') return null;
  const v = (metadatos as Record<string, unknown>)[CLAVE_DEL_PERFIL_QUE_PUBLICA];
  return esPerfil(v) ? v : null;
}

/** El de un destino del publicador (`/publica?perfil=agente`), si lo trae. */
export function perfilQuePublicaDelDestino(destino: string | null | undefined): PerfilQuePublica | null {
  if (!destino || !destino.startsWith('/publica')) return null;
  const i = destino.indexOf('?');
  if (i < 0) return null;
  const v = new URLSearchParams(destino.slice(i + 1)).get('perfil');
  return esPerfil(v) ? v : null;
}
