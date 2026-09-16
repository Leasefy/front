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
