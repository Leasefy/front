'use client'

import { useState } from 'react'
import { Alert } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { listPlans, type AdminPlan } from '@/lib/admin/plans'
import { fmtCOP } from '@/lib/admin/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Accion = 'plan' | 'suspender' | 'reactivar'

/**
 * Lo que Leasefy puede hacer con el plan de una inmobiliaria desde su ficha
 * (19-10-2026, Nico): cambiarle el plan y darle días sin cobro, suspenderla y
 * reactivarla. Todo pide motivo y queda registrado (back:
 * `suscripcion-de-la-inmobiliaria.service.ts`).
 */
export function AccionesDelPlan({
  tenantId,
  nombre,
  estado,
  planActual,
  alTerminar,
}: {
  tenantId: string
  nombre: string
  /** Estado de la suscripción (`ACTIVE`, `SUSPENDED`…) o `null` si no tiene plan. */
  estado: string | null
  planActual: string | null
  alTerminar: () => void
}) {
  const [accion, setAccion] = useState<Accion | null>(null)
  const [motivo, setMotivo] = useState('')
  const [tier, setTier] = useState('')
  const [dias, setDias] = useState('0')
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const planes = useApiQuery<AdminPlan[]>((signal) => listPlans('AGENCY', signal), [])
  const activos = (planes.data ?? []).filter((p) => p.isActive).sort((a, b) => (a.level ?? 99) - (b.level ?? 99))

  const abrir = (a: Accion) => {
    setAccion(a)
    setMotivo('')
    setTier(planActual ?? '')
    setDias('0')
    setFallo(null)
  }

  const diasNum = Number(dias)
  const diasValidos = Number.isInteger(diasNum) && diasNum >= 0 && diasNum <= 365
  const listo = motivo.trim().length >= 5 && (accion !== 'plan' || (tier !== '' && diasValidos))

  async function confirmar() {
    if (!accion || !listo) return
    setGuardando(true)
    setFallo(null)
    try {
      const ruta = accion === 'plan' ? 'plan' : accion
      await adminApi(`/tenants/${tenantId}/${ruta}`, {
        method: 'POST',
        body: accion === 'plan' ? { tier, diasDeGracia: diasNum, motivo: motivo.trim() } : { motivo: motivo.trim() },
      })
      setAccion(null)
      alTerminar()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: 'guardar el cambio', porDefecto: 'No se pudo guardar el cambio.' }))
    } finally {
      setGuardando(false)
    }
  }

  const suspendida = estado === 'SUSPENDED'
  const titulo =
    accion === 'plan'
      ? `Cambiar el plan de ${nombre}`
      : accion === 'suspender'
        ? `Suspender a ${nombre}`
        : `Reactivar a ${nombre}`
  const descripcion =
    accion === 'plan'
      ? 'El plan cambia ya. Los días de gracia corren el próximo cobro: son días sin cobro y después el cobro sigue normal.'
      : accion === 'suspender'
        ? 'Su panel queda bloqueado hasta que la reactives. No se borra nada.'
        : 'Vuelve a entrar a su panel ya. Si tiene un cobro pendiente, sigue pendiente para pagarse.'

  return (
    <>
      <Button size="sm" variant="outline" hideArrow onClick={() => abrir('plan')}>
        {planActual ? 'Cambiar plan' : 'Asignar plan'}
      </Button>
      {estado && !suspendida && estado !== 'CANCELLED' ? (
        <Button size="sm" variant="outline" hideArrow onClick={() => abrir('suspender')}>
          Suspender
        </Button>
      ) : null}
      {suspendida ? (
        <Button size="sm" variant="outline" hideArrow onClick={() => abrir('reactivar')}>
          Reactivar
        </Button>
      ) : null}

      <Cajon abierto={accion !== null} onOpenChange={(a) => (a ? null : setAccion(null))}>
        <CajonCabecera titulo={titulo} descripcion={descripcion} />
        <CajonCuerpo>
          <div className="space-y-4">
            {accion === 'suspender' ? <Alert variant="warning">Su equipo deja de poder usar Leasefy desde ya.</Alert> : null}
            {accion === 'plan' ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="plan-nuevo" className="text-body-sm font-medium text-fg">
                    Plan
                  </label>
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger id="plan-nuevo">
                      <SelectValue placeholder={planes.isLoading ? 'Cargando los planes…' : 'Elige un plan'} />
                    </SelectTrigger>
                    <SelectContent>
                      {activos.map((p) => (
                        <SelectItem key={p.id} value={p.tier}>
                          {p.name} ·{' '}
                          {p.billingMode === 'USAGE_CANON'
                            ? `${(p.usageFeeBps / 100).toLocaleString('es-CO')} % del canon`
                            : p.monthlyPrice === 0
                              ? 'gratis'
                              : `${fmtCOP(p.monthlyPrice)} al mes`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="dias-de-gracia" className="text-body-sm font-medium text-fg">
                    Días sin cobro
                  </label>
                  <Input
                    id="dias-de-gracia"
                    inputMode="numeric"
                    className="w-32 tabular-nums"
                    value={dias}
                    onChange={(e) => setDias(e.target.value.replace(/[^\d]/g, ''))}
                  />
                  <p className="text-caption text-fg-subtle">
                    {diasValidos ? '0 = el cobro sigue en su fecha. Hasta 365.' : 'Entre 0 y 365.'}
                  </p>
                </div>
              </>
            ) : null}
            <div className="space-y-1.5">
              <label htmlFor="motivo-del-plan" className="text-body-sm font-medium text-fg">
                ¿Por qué? <span className="text-danger">*</span>
              </label>
              <Textarea
                id="motivo-del-plan"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={
                  accion === 'suspender'
                    ? 'P. ej.: tres meses sin pagar'
                    : accion === 'reactivar'
                      ? 'P. ej.: pagó por transferencia'
                      : 'P. ej.: cliente piloto, un mes de cortesía'
                }
                aria-required="true"
              />
              <p className="text-caption text-fg-subtle">Queda guardado con tu correo y la fecha.</p>
            </div>
            {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
          </div>
        </CajonCuerpo>
        <CajonPie ayuda={listo ? undefined : 'Escribe el motivo (al menos 5 letras) para seguir.'}>
          <Button variant="outline" hideArrow onClick={() => setAccion(null)}>
            Cancelar
          </Button>
          <Button
            hideArrow
            variant={accion === 'suspender' ? 'destructive' : 'default'}
            disabled={!listo || guardando}
            onClick={() => void confirmar()}
          >
            {guardando
              ? 'Guardando…'
              : accion === 'plan'
                ? 'Cambiar el plan'
                : accion === 'suspender'
                  ? 'Suspender'
                  : 'Reactivar'}
          </Button>
        </CajonPie>
      </Cajon>
    </>
  )
}
