/**
 * /avaluo/verificar/[slug] — public certificate verification page.
 *
 * No auth required — publicly accessible.
 * Renders a certificate verification card identified by the slug.
 *
 * TODO: wire real verification fetch when backend exposes /verificar/:slug
 */

import { Badge } from '@/components/ui/badge'
import { SealCheck, Building, CurrencyDollar, CalendarBlank, UserCircle } from '@phosphor-icons/react/dist/ssr'

interface Props {
  params: { slug: string }
}

// ---------------------------------------------------------------------------
// Placeholder row
// ---------------------------------------------------------------------------

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-none mt-0.5">
        <Icon className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm text-foreground leading-relaxed">{value}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VerificarCertificadoPage({ params }: Props) {
  const { slug } = params

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="mx-auto max-w-xl space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
            Verificación de certificado
          </p>
          <h1 className="text-h2">Avalúo comercial certificado</h1>
        </div>

        {/* Certificate card */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
          {/* Verification badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-none">
              <SealCheck className="w-5 h-5 text-emerald-600" weight="fill" />
            </div>
            <div>
              <Badge variant="success">Certificado verificado</Badge>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                ID: {slug}
              </p>
            </div>
          </div>

          {/* Certificate details — placeholder rows */}
          <div className="divide-y divide-border">
            <InfoRow
              icon={Building}
              label="Dirección del inmueble"
              value="—"
            />
            <InfoRow
              icon={CurrencyDollar}
              label="Valor de avalúo"
              value="—"
            />
            <InfoRow
              icon={CalendarBlank}
              label="Fecha de emisión"
              value="—"
            />
            <InfoRow
              icon={UserCircle}
              label="Avaluador certificado"
              value="—"
            />
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Este certificado fue emitido por Leasefy. Para verificar su
            autenticidad comunícate a{' '}
            <a
              href="mailto:avaluos@leasefy.co"
              className="underline text-foreground"
            >
              avaluos@leasefy.co
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
