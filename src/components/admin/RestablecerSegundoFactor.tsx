'use client'

import { useState, type FormEvent } from 'react'
import { adminApi, ApiError } from '@/lib/admin/api'

/** GET /api/v1/admin/cuentas/buscar?email= (back: `admin/resources/cuentas`). */
interface CuentaParaSoporte {
  id: string
  email: string
  nombre: string | null
  rol: string
  inmobiliarias: Array<{ nombre: string; rol: string }>
  segundoFactor: { total: number; verificados: number }
}

/**
 * Soporte restablece el segundo factor de UNA cuenta (29-09-2026).
 *
 * El caso real: Nico activó el segundo factor del dueño de una inmobiliaria
 * en su propio celular y después borró esa entrada. El dueño tiene la
 * contraseña y nadie tiene el código. Si el dueño tiene su correo, el login
 * ya le ofrece restablecerlo solo; esto es para cuando ni eso.
 *
 * Se busca la cuenta por correo, se muestra A QUIÉN (nombre, correo,
 * inmobiliarias, factores) y se confirma antes de quitar nada — mismo patrón
 * de acción con confirmación en la tarjeta que `/admin/approvals/[id]`. El
 * back deja el rastro (`user.mfa_reset` en la bitácora del admin) y le manda
 * al usuario el correo de aviso.
 */
export function RestablecerSegundoFactor() {
  const [correo, setCorreo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [cuenta, setCuenta] = useState<CuentaParaSoporte | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [restableciendo, setRestableciendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)

  const nombre = cuenta?.nombre || cuenta?.email || ''

  async function buscar(e: FormEvent) {
    e.preventDefault()
    const email = correo.trim()
    if (!email) return
    setBuscando(true)
    setError(null)
    setHecho(null)
    setCuenta(null)
    setConfirmando(false)
    try {
      setCuenta(await adminApi<CuentaParaSoporte>('/cuentas/buscar', { query: { email } }))
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'No hay ninguna cuenta con ese correo.'
          : err instanceof ApiError
            ? err.message
            : 'Error de red',
      )
    } finally {
      setBuscando(false)
    }
  }

  async function restablecer() {
    if (!cuenta) return
    setRestableciendo(true)
    setError(null)
    try {
      await adminApi<void>(`/cuentas/${cuenta.id}/segundo-factor/restablecer`, { method: 'POST' })
      setHecho(
        `Listo: ${nombre} ya no tiene segundo factor. Le mandamos un correo avisándole; la próxima vez que entre lo activa de nuevo.`,
      )
      setCuenta({ ...cuenta, segundoFactor: { total: 0, verificados: 0 } })
      setConfirmando(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de red')
    } finally {
      setRestableciendo(false)
    }
  }

  return (
    <div className="card p-5 border-t-4 border-t-brand">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-1">
        soporte · segundo factor
      </div>
      <p className="text-sm text-fg-muted mb-4">
        Para quien perdió su app de autenticación y tampoco puede usar el código por correo del
        login. Quita todos sus factores; al entrar, lo activa de nuevo.
      </p>

      <form onSubmit={(e) => void buscar(e)} className="flex flex-wrap gap-2 mb-4">
        <input
          type="email"
          className="input w-72"
          placeholder="correo de la cuenta"
          aria-label="Correo de la cuenta"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <button type="submit" className="btn" disabled={buscando || !correo.trim()}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {cuenta && (
        <div className="space-y-3">
          <div className="text-sm">
            <div className="font-medium text-fg">{cuenta.nombre ?? '—'}</div>
            <div className="font-mono text-xs text-fg-muted">
              {cuenta.email} · {cuenta.rol}
            </div>
            {cuenta.inmobiliarias.length > 0 && (
              <div className="text-xs text-fg-muted mt-1">
                {cuenta.inmobiliarias.map((i) => `${i.nombre} (${i.rol})`).join(' · ')}
              </div>
            )}
            <div className="font-mono text-xs text-fg-muted mt-1">
              {cuenta.segundoFactor.total === 0
                ? 'No tiene segundo factor: no hay nada que restablecer.'
                : `${cuenta.segundoFactor.total} ${cuenta.segundoFactor.total === 1 ? 'factor' : 'factores'} · ${cuenta.segundoFactor.verificados} ${cuenta.segundoFactor.verificados === 1 ? 'verificado' : 'verificados'}`}
            </div>
          </div>

          {!confirmando ? (
            <button
              type="button"
              className="btn btn-danger"
              disabled={cuenta.segundoFactor.total === 0}
              onClick={() => {
                setHecho(null)
                setConfirmando(true)
              }}
            >
              Restablecer segundo factor
            </button>
          ) : (
            <div className="card p-3 border-bad/40">
              <p className="text-sm text-fg mb-3">
                Vas a quitarle el segundo factor a {nombre} ({cuenta.email}). Va a poder entrar sólo
                con su contraseña hasta que lo active de nuevo, y le llega un correo avisándole.
                ¿Seguro?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={restableciendo}
                  onClick={() => void restablecer()}
                >
                  {restableciendo ? 'Restableciendo…' : 'Sí, restablecer'}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={restableciendo}
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-bad mt-3">
          {error}
        </p>
      )}
      {hecho && (
        <p role="status" className="text-sm text-fg mt-3">
          {hecho}
        </p>
      )}
    </div>
  )
}
