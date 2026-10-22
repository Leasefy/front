import { NextResponse } from 'next/server'
import { asociacionDeAndroid, huellasDeAndroid } from '@/lib/app-nativa/enlaces-de-la-app'

/*
 * Los enlaces de leasefy.co que abren la app de Android (ver
 * `lib/app-nativa/enlaces-de-la-app.ts`). Sin ANDROID_SHA256_CERT_FINGERPRINTS
 * (la app todavía no está en Google Play): 404, como antes.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  const huellas = huellasDeAndroid(process.env.ANDROID_SHA256_CERT_FINGERPRINTS)
  if (huellas.length === 0) {
    return new NextResponse(null, { status: 404 })
  }
  return NextResponse.json(asociacionDeAndroid(huellas), {
    headers: { 'cache-control': 'public, max-age=3600' },
  })
}
