import { NextResponse } from 'next/server'
import { asociacionDeApple } from '@/lib/app-nativa/enlaces-de-la-app'

/*
 * Los enlaces de leasefy.co que abren la app de iPhone (ver
 * `lib/app-nativa/enlaces-de-la-app.ts`). Apple lo lee sin redirecciones y como JSON.
 * Sin APPLE_TEAM_ID (la cuenta de Apple todavía no existe): 404, como antes.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim()
  if (!teamId || !/^[A-Z0-9]{10}$/.test(teamId)) {
    return new NextResponse(null, { status: 404 })
  }
  return NextResponse.json(asociacionDeApple(teamId), {
    headers: { 'cache-control': 'public, max-age=3600' },
  })
}
