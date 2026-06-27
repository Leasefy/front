/**
 * /avaluo/verificar/[slug] — public certificate verification.
 *
 * The micro owns the verification page at /verify/<slug> (SSR on the micro).
 * This Next.js route redirects there permanently.
 *
 * NEXT_PUBLIC_AVALUO_API_URL configures the micro base URL.
 * When it is not set (same-origin rewrite), the redirect goes to /verify/<slug>
 * on the same origin.
 */

import { redirect } from 'next/navigation'

interface Props {
  params: { slug: string }
}

export default function VerificarCertificadoPage({ params }: Props) {
  const { slug } = params
  const base = process.env.NEXT_PUBLIC_AVALUO_API_URL ?? ''
  redirect(`${base}/verify/${slug}`)
}
