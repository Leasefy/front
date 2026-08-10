// Phase 38 plan 38-07 (D-38-11 frontend half) — transcript PDF document.
//
// Hybrid pattern: backend (agent 38-03) applies PII redaction to transcript
// JSON; this client-side component lays the redacted JSON into a printable PDF
// using @react-pdf/renderer DSL. Browser triggers download from pdf().toBlob().
//
// SECURITY INVARIANT:
//   - This component receives ALREADY-REDACTED text from the backend.
//   - It MUST NOT attempt its own PII redaction — a regex on the client could
//     be bypassed via devtools. Backend (T-38-03-03 in 38-03) is the source of
//     truth for masking.
//   - No browser APIs (window, document, localStorage) used here — the file is
//     safe to pass to pdf().toBlob() in any context.
//
// LAYOUT: A4 portrait (transcripts are tall, not wide — different from the
// cotizador verdict PDF which uses A4 landscape with 3 carrier cards).
// Inline StyleSheet — NOT importing from cotizador/pdf-styles.ts (that file
// belongs to the cotizador domain and is deleted in Task 38-07-02).

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RedactedTurn {
  speaker: 'agent' | 'debtor'
  text: string       // already PII-redacted by backend (T-38-03-03)
  timestamp: string  // e.g. "00:34"
}

export interface TranscriptPdfProps {
  callId: string
  debtorNameRedacted: string  // backend pre-redacted (e.g. "Juan •••")
  generatedAt: string         // ISO timestamp
  turns: RedactedTurn[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGenerated(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Inline StyleSheet — A4 portrait, Helvetica
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
  },

  // Header block
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerDebtor: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  headerTimestamp: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  headerCallId: {
    fontSize: 8,
    fontFamily: 'Courier',
    color: '#6b7280',
  },

  // Separator
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    marginVertical: 8,
  },

  // Turn block
  turn: {
    marginBottom: 6,
  },
  turnSpeakerAgent: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1A40FF',  // electric-blue
    marginBottom: 2,
  },
  turnSpeakerDebtor: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0369a1',  // sky-700
    marginBottom: 2,
  },
  turnText: {
    fontSize: 10,
    color: '#1f2937',  // gray-800
    paddingLeft: 8,
    lineHeight: 1.4,
  },

  // Footer (absolute)
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
  },
})

// ---------------------------------------------------------------------------
// Main document component
// ---------------------------------------------------------------------------

export function TranscriptPdf(props: TranscriptPdfProps): JSX.Element {
  const { callId, debtorNameRedacted, generatedAt, turns } = props
  const generatedAtLabel = formatGenerated(generatedAt)

  return (
    <Document
      title="Leasefy — Transcript de Llamada"
      author="Leasefy"
      subject={`Transcript ${callId}`}
      creator="Leasefy Cobranza"
      producer="@react-pdf/renderer"
    >
      <Page size="A4" style={styles.page}>
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <View>
          <Text style={styles.headerTitle}>Leasefy — Transcript de Llamada</Text>
          <Text style={styles.headerDebtor}>{debtorNameRedacted}</Text>
          <Text style={styles.headerTimestamp}>{generatedAtLabel}</Text>
          <Text style={styles.headerCallId}>Call ID: {callId}</Text>
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* ---------------------------------------------------------------- */}
        {/* Turns                                                            */}
        {/* ---------------------------------------------------------------- */}
        {turns.map((turn, i) => (
          <View key={i} style={styles.turn}>
            <Text
              style={
                turn.speaker === 'agent'
                  ? styles.turnSpeakerAgent
                  : styles.turnSpeakerDebtor
              }
            >
              {/* El documento es en español y va a manos de la inmobiliaria o
                  de una autoridad; los slugs internos no se muestran. */}
              {`${turn.speaker === 'agent' ? 'AGENTE' : 'INQUILINO'} [${turn.timestamp}]`}
            </Text>
            <Text style={styles.turnText}>{turn.text}</Text>
          </View>
        ))}

        {/* ---------------------------------------------------------------- */}
        {/* Footer (fixed at bottom)                                         */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.footer} fixed>
          <Text>
            {`Documento confidencial — PII redactado por Leasefy. Generado ${generatedAtLabel}.`}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
