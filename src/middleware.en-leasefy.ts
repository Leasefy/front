import type { NextRequest, NextResponse } from 'next/server';

import { middleware } from './middleware';

/**
 * Para las pruebas: el middleware en un host de Leasefy, donde responde EN EL ACTO (sólo un dominio propio de una
 * inmobiliaria le pregunta al back y devuelve una promesa). Si un día respondiera una promesa aquí, la prueba lo dice.
 */
export function middlewareEnLeasefy(request: NextRequest): NextResponse {
  const r = middleware(request);
  if (r instanceof Promise) throw new Error('En un host de Leasefy el middleware tiene que responder en el acto.');
  return r;
}
