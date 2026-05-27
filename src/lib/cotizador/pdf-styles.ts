// PDF Styles — StyleSheet.create mirroring DESIGN.md tokens
// Uses @react-pdf/renderer's StyleSheet API.
// All measurements in pt (print-space). A4 landscape page.

import { StyleSheet, Font } from '@react-pdf/renderer'

// ---------------------------------------------------------------------------
// Font registration — Manrope + Space Mono from Google Fonts CDN
// ---------------------------------------------------------------------------
Font.register({
  family: 'Manrope',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggqxSuXd.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggexSuXd.woff2',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggOxSuXd.woff2',
      fontWeight: 700,
    },
  ],
})

Font.register({
  family: 'Space Mono',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/spacemono/v13/i7dPIFZifjKcF5UAWdDRYEF8RQ.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/spacemono/v13/i7dQIFZifjKcF5UAWdDRYEFo-YD1Zah.woff2',
      fontWeight: 700,
    },
  ],
})

// ---------------------------------------------------------------------------
// Color tokens (DESIGN.md indigo-600 system)
// ---------------------------------------------------------------------------
const colors = {
  primary: '#4f46e5',       // indigo-600
  primaryLight: '#818cf8',  // indigo-400
  primaryBorder: '#c7d2fe', // indigo-200
  heading: '#111827',       // gray-900
  body: '#374151',          // gray-700
  muted: '#6b7280',         // gray-500
  border: '#e5e7eb',        // gray-200
  surface: '#f9fafb',       // gray-50
  approved: '#16a34a',      // green-600
  approvedBg: '#dcfce7',    // green-100
  rejected: '#dc2626',      // red-600
  rejectedBg: '#fee2e2',    // red-100
  error: '#d97706',         // amber-600
  errorBg: '#fef3c7',       // amber-100
  stubBg: '#f3f4f6',        // gray-100
  stub: '#6b7280',          // gray-500
}

// ---------------------------------------------------------------------------
// StyleSheet
// ---------------------------------------------------------------------------
export const pdfStyles = StyleSheet.create({
  // Page
  page: {
    size: 'A4',
    orientation: 'landscape',
    paddingTop: 32,
    paddingBottom: 48,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  headerLogo: {
    width: 80,
    height: 24,
    objectFit: 'contain',
  },
  headerMeta: {
    flexDirection: 'column',
    gap: 2,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontWeight: 600,
    fontSize: 14,
    color: colors.heading,
  },
  headerSubtitle: {
    fontFamily: 'Space Mono',
    fontSize: 9,
    color: colors.muted,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontWeight: 700,
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    borderBottomStyle: 'solid',
  },

  // Inputs grid (2x2)
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputCell: {
    width: '22%',
    flexDirection: 'column',
    gap: 2,
  },
  inputLabel: {
    fontFamily: 'Space Mono',
    fontSize: 8,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputValue: {
    fontFamily: 'Manrope',
    fontWeight: 600,
    fontSize: 12,
    color: colors.heading,
  },

  // Separator
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.primaryBorder,
    borderBottomStyle: 'solid',
    marginBottom: 16,
  },

  // Carriers row
  carriersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  carrierCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 12,
    flexDirection: 'column',
    gap: 6,
  },
  carrierName: {
    fontFamily: 'Manrope',
    fontWeight: 700,
    fontSize: 11,
    color: colors.heading,
  },

  // Verdict badge
  verdictBadge: {
    fontFamily: 'Space Mono',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  verdictApproved: {
    color: colors.approved,
    backgroundColor: colors.approvedBg,
  },
  verdictRejected: {
    color: colors.rejected,
    backgroundColor: colors.rejectedBg,
  },
  verdictError: {
    color: colors.error,
    backgroundColor: colors.errorBg,
  },
  verdictStub: {
    color: colors.stub,
    backgroundColor: colors.stubBg,
  },

  // Price
  priceLabel: {
    fontFamily: 'Space Mono',
    fontSize: 8,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priceValue: {
    fontFamily: 'Space Mono',
    fontWeight: 700,
    fontSize: 14,
    color: colors.heading,
  },

  // Condiciones + motivo
  condicionesText: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: colors.body,
    lineHeight: 1.4,
  },
  motivoText: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: colors.rejected,
    fontStyle: 'italic',
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 40,
    right: 40,
    flexDirection: 'column',
    gap: 2,
  },
  footerText: {
    fontFamily: 'Space Mono',
    fontSize: 8,
    color: colors.muted,
  },
  footerDisclaimer: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: colors.muted,
    fontStyle: 'italic',
    lineHeight: 1.3,
  },
})
