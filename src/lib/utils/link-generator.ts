/**
 * Link Generator - Utilities for creating shareable property links
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://arriendo.co'

/**
 * Generate a short unique code for a property link
 * Format: first 4 chars of propertyId + random 4 chars
 * Example: "ch30-mX9k"
 */
export function generateLinkCode(propertyId: string): string {
  const prefix = propertyId.slice(0, 4).toLowerCase().replace(/[^a-z0-9]/g, '')
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${suffix}`
}

/**
 * Build the full shareable URL for a property
 * @param propertyId - The property ID
 * @param agentCode - The agent's unique code (e.g., "JR2024")
 * @param linkCode - The generated link code (e.g., "ch30-mX9k")
 * @returns Full URL with tracking params
 */
export function buildShareableUrl(
  propertyId: string,
  agentCode: string,
  linkCode: string
): string {
  const url = new URL(`${BASE_URL}/aplicar/${propertyId}`)
  url.searchParams.set('ref', agentCode)
  url.searchParams.set('link', linkCode)
  return url.toString()
}

/**
 * Build a shortened display URL (without full domain for UI display)
 */
export function buildDisplayUrl(propertyId: string, linkCode: string): string {
  return `arriendo.co/aplicar/${linkCode}`
}

/**
 * Parse agent attribution from URL params
 */
export function parseAgentAttribution(searchParams: URLSearchParams): {
  agentCode: string | null
  linkCode: string | null
} {
  return {
    agentCode: searchParams.get('ref'),
    linkCode: searchParams.get('link'),
  }
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  } catch {
    return false
  }
}

/**
 * Generate WhatsApp share URL
 */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * Generate email share URL
 */
export function buildEmailShareUrl(
  subject: string,
  body: string,
  to?: string
): string {
  const params = new URLSearchParams()
  if (to) params.set('to', to)
  params.set('subject', subject)
  params.set('body', body)
  return `mailto:${to || ''}?${params.toString()}`
}
