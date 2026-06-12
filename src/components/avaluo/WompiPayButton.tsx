'use client'

/**
 * WompiPayButton — initiates a Wompi checkout session for an avalúo.
 *
 * POSTs to /api/avaluo/wompi-session to obtain the session params (including
 * the server-computed integrity hash — never computed here), then redirects
 * the browser to the Wompi hosted checkout page.
 *
 * integrity comes from server — never computed here.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface WompiPayButtonProps {
  submissionId: string
}

export function WompiPayButton({ submissionId }: WompiPayButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePay = async () => {
    setIsLoading(true)

    try {
      const res = await fetch('/api/avaluo/wompi-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })

      if (!res.ok) {
        throw new Error(`session_failed:${res.status}`)
      }

      const { reference, amountInCents, currency, integrity, publicKey } =
        (await res.json()) as {
          reference: string
          amountInCents: number
          currency: string
          integrity: string
          publicKey: string
        }

      const redirectUrl =
        window.location.origin + '/avaluo/estado/' + submissionId

      const url =
        'https://checkout.wompi.co/p/?public-key=' +
        publicKey +
        '&currency=' +
        currency +
        '&amount-in-cents=' +
        amountInCents +
        '&reference=' +
        reference +
        '&signature:integrity=' +
        integrity +
        '&redirect-url=' +
        encodeURIComponent(redirectUrl)

      window.location.href = url
    } catch {
      toast.error('No pudimos iniciar el pago. Intenta nuevamente.')
      setIsLoading(false)
    }
  }

  return (
    <Button
      size="lg"
      isLoading={isLoading}
      onClick={handlePay}
      className="w-full sm:w-auto"
    >
      Pagar certificado
    </Button>
  )
}
