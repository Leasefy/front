'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { adminApi, ApiError } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { Alert, Card } from '@leasefy/cadence'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { ROL_DEL_EQUIPO } from '@/lib/admin/textos-del-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
/** El rol de la cuenta (`users.role`) o de la inmobiliaria, en palabras. */
const ROL_DE_LA_CUENTA: Record<string, string> = {
  TENANT: 'Inquilino',
  LANDLORD: 'Propietario',
  AGENT: 'Inmobiliaria',
  ADMIN: 'Administrador de Leasefy',
}

export function RestablecerSegundoFactor({
  correoInicial,
  sinTarjeta = false,
}: {
  /** (19-10-2026) Llega buscada: desde el equipo de la ficha de una inmobiliaria. */
  correoInicial?: string
  /** Sin la tarjeta de afuera (dentro de un cajón). */
  sinTarjeta?: boolean
} = {}) {
  const [correo, setCorreo] = useState(correoInicial ?? '')
  const [buscando, setBuscando] = useState(false)
  const [cuenta, setCuenta] = useState<CuentaParaSoporte | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [restableciendo, setRestableciendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)

  const nombre = cuenta?.nombre || cuenta?.email || ''

  async function buscar(e?: FormEvent, correoABuscar = correo) {
    e?.preventDefault()
    const email = correoABuscar.trim()
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
          : mensajeDelAdmin(err, { accion: 'buscar la cuenta' }),
      )
    } finally {
      setBuscando(false)
    }
  }

  const yaBusco = useRef(false)
  useEffect(() => {
    if (correoInicial && !yaBusco.current) {
      yaBusco.current = true
      void buscar(undefined, correoInicial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correoInicial])

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
      setError(mensajeDelAdmin(err, { accion: 'restablecer el segundo factor' }))
    } finally {
      setRestableciendo(false)
    }
  }

  const contenido = (
    <>
      <form onSubmit={(e) => void buscar(e)} className="mb-4 flex flex-wrap gap-2">
        <Input
          type="email"
          className="w-full sm:w-80"
          placeholder="Correo de la cuenta"
          aria-label="Correo de la cuenta"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Button variant="outline" hideArrow type="submit" disabled={buscando || !correo.trim()}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </Button>
      </form>

      {cuenta && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-bg p-4 text-body-sm">
            <div className="font-medium text-fg">{cuenta.nombre ?? 'Sin nombre registrado'}</div>
            <div className="mt-0.5 text-caption text-fg-muted">
              {cuenta.email} · {ROL_DE_LA_CUENTA[cuenta.rol] ?? cuenta.rol}
            </div>
            {cuenta.inmobiliarias.length > 0 && (
              <div className="mt-1 text-caption text-fg-muted">
                {cuenta.inmobiliarias.map((i) => `${i.nombre} (${ROL_DEL_EQUIPO[i.rol] ?? i.rol})`).join(' · ')}
              </div>
            )}
            <div className="mt-2 text-caption text-fg tabular-nums">
              {cuenta.segundoFactor.total === 0
                ? 'No tiene segundo factor: no hay nada que restablecer.'
                : `${cuenta.segundoFactor.total} ${cuenta.segundoFactor.total === 1 ? 'factor' : 'factores'} · ${cuenta.segundoFactor.verificados} ${cuenta.segundoFactor.verificados === 1 ? 'verificado' : 'verificados'}`}
            </div>
          </div>

          {!confirmando ? (
            <Button
              variant="destructive"
              hideArrow
              type="button"
              disabled={cuenta.segundoFactor.total === 0}
              onClick={() => {
                setHecho(null)
                setConfirmando(true)
              }}
            >
              Restablecer segundo factor
            </Button>
          ) : (
            <Card className="border-danger/40 p-4">
              <p className="mb-3 text-body-sm text-fg">
                Vas a quitarle el segundo factor a {nombre} ({cuenta.email}). Va a poder entrar sólo con su contraseña
                hasta que lo active de nuevo, y le llega un correo avisándole. ¿Seguro?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  hideArrow
                  type="button"
                  disabled={restableciendo}
                  onClick={() => void restablecer()}
                >
                  {restableciendo ? 'Restableciendo…' : 'Sí, restablecer'}
                </Button>
                <Button
                  variant="outline"
                  hideArrow
                  type="button"
                  disabled={restableciendo}
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {error && (
        <Alert variant="danger" role="alert" className="mt-3">
          {error}
        </Alert>
      )}
      {hecho && (
        <Alert variant="success" role="status" className="mt-3">
          {hecho}
        </Alert>
      )}
    </>
  )

  if (sinTarjeta) return contenido

  return (
    <Tarjeta
      titulo="Restablecer el segundo factor"
      descripcion="Para quien perdió su app de autenticación y tampoco puede usar el código por correo del login. Quita todos sus factores; al entrar, lo activa de nuevo."
    >
      {contenido}
    </Tarjeta>
  )
}
