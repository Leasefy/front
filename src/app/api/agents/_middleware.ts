import { NextResponse } from 'next/server'

/**
 * Validates that the request comes from an authenticated source.
 *
 * Production: validates Supabase JWT or a pre-shared API key.
 * Development: allows all requests for easier testing.
 *
 * Security note: When AGENT_API_KEY is set, it must match the
 * x-api-key header exactly. Bearer token validation is a placeholder
 * until Supabase JWT verification is fully integrated.
 */
export function validateAgentRequest(req: Request): {
  valid: boolean
  error?: string
  agencyId?: string
} {
  // In development, skip strict auth but still validate body structure
  if (process.env.NODE_ENV === 'development') {
    return { valid: true }
  }

  // Production: check for API key or Bearer token
  const authHeader = req.headers.get('authorization')
  const apiKey = req.headers.get('x-api-key')

  if (!authHeader && !apiKey) {
    return { valid: false, error: 'Missing authorization header or x-api-key' }
  }

  // Validate API key if configured
  const expectedApiKey = process.env.AGENT_API_KEY
  if (apiKey) {
    if (!expectedApiKey) {
      return { valid: false, error: 'API key authentication not configured on server' }
    }
    if (apiKey !== expectedApiKey) {
      return { valid: false, error: 'Invalid API key' }
    }
    return { valid: true }
  }

  // Validate Bearer token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (!token) {
      return { valid: false, error: 'Empty Bearer token' }
    }

    // TODO: Validate Supabase JWT signature and claims
    // For now, require AGENT_API_KEY match as a basic gate
    if (expectedApiKey && token !== expectedApiKey) {
      return { valid: false, error: 'Invalid Bearer token' }
    }

    // If no AGENT_API_KEY is configured, reject in production
    if (!expectedApiKey) {
      return { valid: false, error: 'Token validation not configured on server' }
    }

    return { valid: true }
  }

  return { valid: false, error: 'Invalid authorization format' }
}

export function unauthorizedResponse(error: string) {
  return NextResponse.json({ error }, { status: 401 })
}
