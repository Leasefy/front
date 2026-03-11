import { type NextRequest, NextResponse } from 'next/server';

/**
 * Middleware
 *
 * Currently a pass-through — all auth checks happen client-side via ProtectedRoute.
 * This file establishes the route config so /invitacion is explicitly documented
 * as a public route that must never be gated by server-side auth.
 *
 * Public routes (no auth required):
 *   /                         — Landing page
 *   /auth                     — Auth page
 *   /invitacion/[token]       — Invitation acceptance page
 *   /propiedades              — Property catalog
 *   /para/*                   — Marketing pages
 *   /productos/*              — Product pages
 *   /pricing                  — Pricing page
 *   /blog                     — Blog
 *   /ayuda                    — Help center
 *   /terminos, /privacidad    — Legal pages
 *
 * When server-side auth middleware is added in the future, ensure all
 * paths above are excluded from the auth check (especially /invitacion/[token]).
 */
export function middleware(_request: NextRequest) {
  // Pass through — no server-side auth enforcement yet
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, site icons
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
