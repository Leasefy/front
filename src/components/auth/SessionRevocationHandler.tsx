'use client'

/**
 * SessionRevocationHandler
 *
 * Mount once in the root layout (inside AuthProvider). Listens on Realtime for
 * a `session_revocations` row targeting THIS device's session and, when it
 * arrives, signs the user out and shows a blocking "signed in elsewhere" notice.
 * This is the instant path of single-session enforcement; the 401 backstop in
 * apiClient covers the case where this event never arrived.
 */

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import { getAccessToken } from '@/lib/api/client'
import { decodeAccessToken } from '@/lib/auth/jwt'
import { useSessionRevocation } from '@/lib/hooks/use-session-revocation'

export function SessionRevocationHandler() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [revoked, setRevoked] = useState(false)

  // session_id is stable across token refresh, so deriving it once per user is
  // enough. getAccessToken() is already set by the time `user` is populated.
  const currentSessionId = useMemo(
    () => decodeAccessToken(getAccessToken())?.session_id,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  )

  const handleRevoked = useCallback(() => {
    setRevoked(true)
    void signOut()
  }, [signOut])

  useSessionRevocation({
    userId: user?.id,
    currentSessionId,
    onRevoked: handleRevoked,
  })

  if (!revoked) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-revoked-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      data-lenis-prevent
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl dark:bg-neutral-900">
        <h2
          id="session-revoked-title"
          className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
        >
          Iniciaste sesión en otro dispositivo
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Por seguridad, cerramos esta sesión. Solo puede haber un dispositivo
          activo a la vez.
        </p>
        <button
          type="button"
          onClick={() => {
            setRevoked(false)
            router.push('/auth')
          }}
          className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Volver a iniciar sesión
        </button>
      </div>
    </div>
  )
}
