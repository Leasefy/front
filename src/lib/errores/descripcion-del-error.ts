/**
 * Lo que dijo el back, sólo si le sirve a una persona.
 *
 * Un 400 o un 409 que explica («esa franja se cruza con otra», «el inmueble
 * tiene un contrato vigente») es la respuesta a lo que la persona acaba de
 * intentar: va en el toast o al lado del botón. Un 5xx no explica nada —su
 * texto es «Internal server error» o un volcado de Prisma— y un mensaje largo
 * o de varias líneas tampoco cabe en un toast. En esos casos devuelve
 * `undefined` y quien llama pone su propio texto.
 */
import { ApiError } from '@/lib/api/client';

const LARGO_MAXIMO = 160;

export function descripcionDelError(e: unknown): string | undefined {
  if (!(e instanceof Error) || !e.message) return undefined;
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
  if (!(e instanceof Error)) return [];
  if (e instanceof ApiError && e.status >= 500) return [];
  const lista =
    e instanceof ApiError && e.messages?.length ? e.messages : [e.message ?? ''];
  return lista
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && m.length <= LARGO_MAXIMO && !m.includes('\n') && !m.startsWith('Invalid `'));
}
