'use client'

/**
 * Paso 3 del recorrido: el inquilino paga su estudio.
 *
 * La pantalla existe entera. Lo que todavía no existe es el cobro del lado
 * del backend (ver src/lib/api/estudio-pago.service.ts), y eso se dice en
 * pantalla en vez de mostrar un formulario que no cobraría nada. Un botón
 * «Pagar» que no cobra es la peor versión de esto: la persona cree que pagó.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Info, Lock } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTarjetas } from '@/components/estado/EsqueletoTabla'
import {
  estudioPagoApi,
  CobroNoDisponible,
  type EstadoDePagoDelEstudio,
} from '@/lib/api/estudio-pago.service'
import { subscriptionsApi } from '@/lib/api/subscriptions.service'
import type { PSEBank, PSEPaymentData } from '@/lib/api/subscriptions.types'

function moneda(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

const DATOS_VACIOS: PSEPaymentData = {
  documentType: 'CC',
  documentNumber: '',
  bankCode: '',
  holderName: '',
}

export default function PagoDelEstudioPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<EstadoDePagoDelEstudio | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [sinCobro, setSinCobro] = useState(false)

  const [bancos, setBancos] = useState<PSEBank[]>([])
  const [datos, setDatos] = useState<PSEPaymentData>(DATOS_VACIOS)
  const [enviando, setEnviando] = useState(false)
  const [errorDePago, setErrorDePago] = useState<unknown>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    setSinCobro(false)
    try {
      const e = await estudioPagoApi.consultarEstado()
      setEstado(e)
    } catch (e) {
      if (e instanceof CobroNoDisponible) setSinCobro(true)
      else setError(e)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    // La lista de bancos es del flujo PSE que ya funciona. Si no llega, el
    // select queda vacío y el formulario no se puede enviar — que es lo
    // correcto: sin banco no hay pago.
    subscriptionsApi.getPSEBanks().then(setBancos).catch(() => setBancos([]))
  }, [])

  const pagar = async () => {
    setEnviando(true)
    setErrorDePago(null)
    try {
      const { urlDePago } = await estudioPagoApi.iniciarPago(datos)
      window.location.href = urlDePago
    } catch (e) {
      if (e instanceof CobroNoDisponible) setSinCobro(true)
      else setErrorDePago(e)
      setEnviando(false)
    }
  }

  const completo =
    datos.documentNumber.trim() && datos.bankCode && datos.holderName.trim()

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <header className="space-y-1.5">
        <p className="font-mono text-label uppercase tracking-mono-label text-fg-subtle">
          Paso 3 de 11
        </p>
        <h1 className="text-h1 font-semibold text-fg">Pagá tu estudio</h1>
        <p className="text-body text-fg-muted">
          Se hace una vez y te sirve para todas las propiedades que te interesen.
        </p>
      </header>

      <div className="mt-8">
        {cargando ? (
          <EsqueletoTarjetas cantidad={1} className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1" />
        ) : sinCobro ? (
          /* El cobro no está listo del lado del servidor. Se dice, con salida:
             mostrar el formulario acá sería cobrar de mentira. */
          <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
              <Lock weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-1.5">
              <p className="text-[15px] font-semibold text-fg">
                Todavía no se puede pagar desde acá
              </p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
                Estamos terminando el cobro en línea. Mientras tanto, la
                inmobiliaria puede correr tu estudio y te avisamos apenas esté.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/inquilino">Volver a mi panel</Link>
              </Button>
            </div>
          </div>
        ) : error ? (
          <FalloDeCarga
            error={error}
            queEs="el estado de tu estudio"
            onReintentar={() => void cargar()}
            volverA={{ label: 'Volver a mi panel', href: '/inquilino' }}
          />
        ) : estado?.pagado ? (
          <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft">
              <CheckCircle weight="fill" className="h-6 w-6 text-success" aria-hidden="true" />
            </div>
            <p className="mt-4 text-[15px] font-semibold text-fg">Tu estudio ya está pago</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted">
              {estado.pagadoEl
                ? `Lo pagaste el ${new Date(estado.pagadoEl).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                : 'No tenés que pagar de nuevo.'}
            </p>
            <Button className="mt-6" onClick={() => router.push('/inquilino/explorar')}>
              Ver propiedades
            </Button>
          </div>
        ) : estado ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-fg-muted">Costo del estudio</span>
                <span className="font-mono text-stat font-semibold tabular-nums text-fg">
                  {moneda(estado.precioCop)}
                </span>
              </div>
              {estado.incluye.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border pt-4">
                  {estado.incluye.map((linea) => (
                    <li key={linea} className="flex items-start gap-2 text-sm text-fg-muted">
                      <CheckCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        weight="fill"
                        aria-hidden="true"
                      />
                      {linea}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-fg">Pagar con PSE</h2>

              <div className="space-y-1.5">
                <label htmlFor="banco" className="block text-xs font-medium text-fg">
                  Banco
                </label>
                <Select
                  value={datos.bankCode || undefined}
                  onValueChange={(v) => setDatos({ ...datos, bankCode: v })}
                >
                  <SelectTrigger id="banco">
                    <SelectValue
                      placeholder={bancos.length ? 'Elegí tu banco' : 'No pudimos traer los bancos'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="titular" className="block text-xs font-medium text-fg">
                  Nombre del titular
                </label>
                <Input
                  id="titular"
                  value={datos.holderName}
                  onChange={(e) => setDatos({ ...datos, holderName: e.target.value })}
                  placeholder="Como figura en el banco"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="documento" className="block text-xs font-medium text-fg">
                  Número de documento
                </label>
                <Input
                  id="documento"
                  inputMode="numeric"
                  value={datos.documentNumber}
                  onChange={(e) => setDatos({ ...datos, documentNumber: e.target.value })}
                  className="tabular-nums"
                />
              </div>

              {errorDePago !== null && (
                <FalloDeCarga
                  error={errorDePago}
                  queEs="el pago"
                  onReintentar={() => void pagar()}
                  className="py-8"
                />
              )}

              <Button
                className="w-full"
                onClick={() => void pagar()}
                isLoading={enviando}
                disabled={!completo || enviando}
                data-testid="pagar-estudio"
              >
                Pagar {moneda(estado.precioCop)}
              </Button>

              <p className="flex items-start gap-2 text-xs text-fg-subtle">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Te llevamos al banco para autorizar. Volvés acá apenas termines.
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  )
}
