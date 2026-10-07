/**
 * Lo que dijo el back, sólo si le sirve a una persona. Delega la regla de
 * oro (red / 5xx) en `traductor-de-errores.ts`.
 *
 * Un 400 o un 409 que explica («esa franja se cruza con otra», «el inmueble
 * tiene un contrato vigente») es la respuesta a lo que la persona acaba de
 * intentar: va en el toast o al lado del botón. Un 5xx no explica nada —su
 * texto es «Internal server error» o un volcado de Prisma— y un mensaje largo
 * o de varias líneas tampoco cabe en un toast. En esos casos devuelve
 * `undefined` y quien llama pone su propio texto.
 */
import { ApiError } from '@/lib/api/client';
import { mensajeDeCaida } from '@/lib/conexion/servicio-no-disponible';
import { leerFallo, mensajeDeUnFalloNuestro, mensajeSinRespuesta } from './traductor-de-errores';

const LARGO_MAXIMO = 160;

/*
 * 01-10-2026 · Un 5xx no explica nada… salvo una caída. El 503
 * `SERVICIO_NO_DISPONIBLE` dice QUÉ parte se cayó y que reintentar en unos
 * minutos sirve, y eso sí le sirve a la persona: antes de la regla del 5xx.
 */
/*
 * 02-10-2026 · La regla de oro del traductor único (`traductor-de-errores.ts`):
 * un 5xx ya no es «nada que decir»: dice que fue nuestro, con la referencia
 * para soporte; y sin respuesta se habla de la red, con un texto limpio (sin
 * el «(Failed to fetch)» del navegador).
 */
function porLaReglaDeOro(e: unknown): string | undefined {
  const fallo = leerFallo(e);
  if (fallo.tipo === 'sinRespuesta') return mensajeSinRespuesta();
  if (fallo.tipo === 'nuestro') return mensajeDeUnFalloNuestro(fallo);
  return undefined;
}

export function descripcionDelError(e: unknown): string | undefined {
  const caida = mensajeDeCaida(e);
  if (caida) return caida;
  if (!(e instanceof Error) || !e.message) return undefined;
  const deLaRegla = porLaReglaDeOro(e);
  if (deLaRegla) return deLaRegla;
  if (e instanceof ApiError && e.status >= 500) return undefined;
  const m = e.message.trim();
  if (m.length > LARGO_MAXIMO || m.includes('\n') || m.startsWith('Invalid `')) return undefined;
  return m;
}

/**
 * Los motivos del rechazo, uno por renglón, para pintarlos AL LADO de lo que
 * la persona intentó (F5).
 *
 * Un 400 del `ValidationPipe` del back llega con `message` como arreglo, y
 * `ApiError` lo concatena con « · » para poder ser un `Error`. Ese pegote
 * pasaba de largo el tope de `descripcionDelError` y terminaba en
 * `undefined`: el toast decía «no se pudo» y la persona no sabía qué campo
 * cambiar. Acá se devuelven los motivos SUELTOS, que es como se leen.
 *
 * Devuelve `[]` cuando no hay nada que le sirva a una persona (un 5xx, un
 * volcado de Prisma, un mensaje larguísimo): quien llama pone su propio texto.
 */
export function motivosDelError(e: unknown): string[] {
  const caida = mensajeDeCaida(e);
  if (caida) return [caida];
  if (!(e instanceof Error)) return [];
  const deLaRegla = porLaReglaDeOro(e);
  if (deLaRegla) return [deLaRegla];
  if (e instanceof ApiError && e.status >= 500) return [];
  const lista =
    e instanceof ApiError && e.messages?.length ? e.messages : [e.message ?? ''];
  return lista
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && m.length <= LARGO_MAXIMO && !m.includes('\n') && !m.startsWith('Invalid `'));
}
