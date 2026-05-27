// PDF Verdict Document — @react-pdf/renderer DSL
// Language: Spanish only (v1). English PDF deferred to Phase 38 polish.
// DO NOT add server-side rendering logic here. Client-side blob generation only.
// Filename uses cedula_hash_first8 — raw cédula digits NEVER appear in filename.
// Format: A4 landscape (3 carriers side-by-side). Portrait not implemented in v1.

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { pdfStyles } from './pdf-styles'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** @T-30-07-01 cedula_display must be a hash-derived redaction string — never raw digits */
export interface VerdictPdfProps {
  quote: {
    cedula_hash: string      // 64-char sha256 hex — first 8 chars used in filename
    cedula_display: string   // hash-redacted form e.g. "a1b2•••d4" (pre-computed by caller)
    canon: number            // monthly rent in COP
    ciudad: string
    tipo: string             // "arrendamiento" | "coarrendamiento" etc.
    codeudores: number
    createdAt: string        // ISO timestamp for header
  }
  carriers: Array<{
    name: string             // "Sura" | "Mapfre" | "Bolívar" | ...
    verdict: 'approved' | 'rejected' | 'error' | 'stub'
    prima_mensual: number | null
    condiciones: string | null
    motivo_rechazo: string | null
  }>
  agency: {
    name: string
    contact: string          // email or phone for footer
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verdictLabel(verdict: VerdictPdfProps['carriers'][0]['verdict']): string {
  switch (verdict) {
    case 'approved': return 'Aprobado'
    case 'rejected': return 'Rechazado'
    case 'error':    return 'Error'
    case 'stub':     return 'Demo'
  }
}

function verdictStyle(verdict: VerdictPdfProps['carriers'][0]['verdict']) {
  switch (verdict) {
    case 'approved': return pdfStyles.verdictApproved
    case 'rejected': return pdfStyles.verdictRejected
    case 'error':    return pdfStyles.verdictError
    case 'stub':     return pdfStyles.verdictStub
  }
}

function formatCop(amount: number): string {
  return 'COP ' + amount.toLocaleString('es-CO')
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CarrierCard({ carrier }: { carrier: VerdictPdfProps['carriers'][0] }) {
  return (
    <View style={pdfStyles.carrierCard}>
      <Text style={pdfStyles.carrierName}>{carrier.name}</Text>

      <Text style={[pdfStyles.verdictBadge, verdictStyle(carrier.verdict)]}>
        {verdictLabel(carrier.verdict)}
      </Text>

      <View>
        <Text style={pdfStyles.priceLabel}>Prima mensual</Text>
        <Text style={pdfStyles.priceValue}>
          {carrier.prima_mensual != null ? formatCop(carrier.prima_mensual) : 'N/A'}
        </Text>
      </View>

      {carrier.condiciones ? (
        <Text style={pdfStyles.condicionesText}>{carrier.condiciones}</Text>
      ) : (
        <Text style={[pdfStyles.condicionesText, { color: '#9ca3af' }]}>—</Text>
      )}

      {carrier.motivo_rechazo ? (
        <Text style={pdfStyles.motivoText}>Motivo: {carrier.motivo_rechazo}</Text>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main document component
// ---------------------------------------------------------------------------

export function VerdictPdfDocument(props: VerdictPdfProps): JSX.Element {
  const { quote, carriers, agency } = props

  const logoUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/icons/leasefy-logo.svg`
    : '/icons/leasefy-logo.svg'

  return (
    <Document
      title="Leasefy — Dictamen de Cotización"
      author="Leasefy"
      subject={`Cotización ${quote.cedula_display}`}
      creator="Leasefy Cotizador"
      producer="@react-pdf/renderer"
    >
      <Page
        size="A4"
        orientation="landscape"
        style={pdfStyles.page}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <View style={pdfStyles.header}>
          {/* Logo — falls back to text if Image fails */}
          {logoUrl ? (
            <Image
              src={logoUrl}
              style={pdfStyles.headerLogo}
            />
          ) : (
            <Text style={[pdfStyles.headerTitle, { color: '#4f46e5', fontSize: 18 }]}>
              Leasefy
            </Text>
          )}
          <View style={pdfStyles.headerMeta}>
            <Text style={pdfStyles.headerTitle}>Leasefy — Cotización de Seguro</Text>
            <Text style={pdfStyles.headerSubtitle}>
              {quote.cedula_display} · {formatTimestamp(quote.createdAt)}
            </Text>
          </View>
        </View>

        {/* Separator */}
        <View style={pdfStyles.separator} />

        {/* ---------------------------------------------------------------- */}
        {/* Inputs summary                                                   */}
        {/* ---------------------------------------------------------------- */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Datos de la solicitud</Text>
          <View style={pdfStyles.inputsGrid}>
            <View style={pdfStyles.inputCell}>
              <Text style={pdfStyles.inputLabel}>Canon mensual</Text>
              <Text style={pdfStyles.inputValue}>{formatCop(quote.canon)}</Text>
            </View>
            <View style={pdfStyles.inputCell}>
              <Text style={pdfStyles.inputLabel}>Ciudad</Text>
              <Text style={pdfStyles.inputValue}>{quote.ciudad}</Text>
            </View>
            <View style={pdfStyles.inputCell}>
              <Text style={pdfStyles.inputLabel}>Tipo</Text>
              <Text style={pdfStyles.inputValue}>{quote.tipo}</Text>
            </View>
            <View style={pdfStyles.inputCell}>
              <Text style={pdfStyles.inputLabel}>Codeudores</Text>
              <Text style={pdfStyles.inputValue}>{String(quote.codeudores)}</Text>
            </View>
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Carrier verdict cards                                            */}
        {/* ---------------------------------------------------------------- */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Dictamen de aseguradoras</Text>
          <View style={pdfStyles.carriersRow}>
            {carriers.map((carrier, i) => (
              <CarrierCard key={i} carrier={carrier} />
            ))}
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Footer (absolute)                                                */}
        {/* ---------------------------------------------------------------- */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            {agency.name} · {agency.contact}
          </Text>
          <Text style={pdfStyles.footerDisclaimer}>
            Este documento es informativo y no constituye un contrato de seguro. Vigencia del dictamen sujeta a condiciones de cada aseguradora.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
