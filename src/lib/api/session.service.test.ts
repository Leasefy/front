import { describe, it, expect, vi, beforeEach } from 'vitest'

const post = vi.fn()
vi.mock('./client', () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
  },
}))

import { claimSession } from './session.service'

beforeEach(() => {
  post.mockReset()
})

describe('claimSession', () => {
  it('POSTs /auth/session/claim with the given token and returns { superseded }', async () => {
    post.mockResolvedValue({ superseded: true })
    const result = await claimSession('token-xyz')
    expect(post).toHaveBeenCalledWith('/auth/session/claim', {}, 'token-xyz')
    expect(result).toEqual({ superseded: true })
  })

  it('manda el id del navegador en el cuerpo: es lo que vuelve honesto el «otro dispositivo»', async () => {
    post.mockResolvedValue({ superseded: false })
    await claimSession('token-xyz', { deviceId: 'dev-A' })
    expect(post).toHaveBeenCalledWith('/auth/session/claim', { deviceId: 'dev-A' }, 'token-xyz')
  })
})
