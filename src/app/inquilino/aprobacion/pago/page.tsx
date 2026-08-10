'use client'

/**
 * Paso 3 del recorrido del inquilino: paga su aprobación.
 *
 * Vive bajo `/inquilino/aprobacion/` y no en una rama propia. Eso no es
 * cosmético: el sidebar marca lo activo con `pathname.startsWith(href)`, así
 * que colgando de acá «Mi tope de arriendo» queda encendido mientras se paga.
 * En su ruta anterior (`/inquilino/estudio/pago`) no se encendía nada y la
 * persona quedaba fuera de toda sección del panel.
 *
 * También arregla la palabra: `docs/VOCABULARIO.md` prohíbe "estudio" del lado
 * del inquilino —colisiona con apartaestudio— y manda decir **"aprobación"**.
 * La URL vieja redirige.
 *
 * Lo que todavía no existe es el cobro del lado del backend (ver
 * `src/lib/api/estudio-pago.service.ts`), y eso se dice en pantalla en vez de
 * mostrar un formulario que no cobraría nada. Un botón «Pagar» que no cobra es
 * la peor versión de esto: la persona cree que pagó.
 *
 * El ciclo es formulario → banco → vuelve. La vuelta llega como `?estado=` en
 * la URL, que es lo que sabe poner una pasarela.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Lock, Clock, Receipt } from '@phosphor-icons/react'
import { Button, Card, Callout } from '@leasefy/cadence'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTarjetas } from '@/components/estado/EsqueletoTabla'
import { RecorridoInquilino } from '@/components/inquilino/RecorridoInquilino'
import { FormularioPSE } from '@/components/pago/FormularioPSE'
import { useCobroAprobacion } from '@/lib/hooks/use-cobro-aprobacion'
import { estudioPagoApi, CobroNoDisponible } from '@/lib/api/estudio-pago.service'
import { subscriptionsApi } from '@/lib/api/subscriptions.service'
import {
  datosVacios,
  validarPago,
  type DatosDePagoPSE,
  type ErroresDePago,
} from '@/lib/pago/pse'
import type { PSEBank } from '@/lib/api/subscriptions.types'

function moneda(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

/** El id del campo, para poder llevar el foco al primero con problema. */
const CAMPO_A_ID: Record<string, string> = {
  banco: 'pse-banco',
  numeroDeDocumento: 'pse-numero-documento',
  titular: 'pse-titular',
  correo: 'pse-correo',
}

export default function PagoDeLaAprobacionPage() {
  const router = useRouter()
  const buscador = useSearchParams()
  /** La pasarela devuelve acá. `pendiente` = el banco todavía no confirmó. */
  const vuelta = buscador.get('estado')

  const { estado, recargar } = useCobroAprobacion()

  const [bancos, setBancos] = useState<PSEBank[]>([])
  const [cargandoBancos, setCargandoBancos] = useState(true)
  const [datos, setDatos] = useState<DatosDePagoPSE>(datosVacios)
  const [errores, setErrores] = useState<ErroresDePago>({})
  const [enviando, setEnviando] = useState(false)
  const [errorDePago, setErrorDePago] = useState<unknown>(null)
  const [sinCobro, setSinCobro] = useState(false)

  useEffect(() => {
    // La lista viene del backend, que es quien sabe qué bancos puede debitar.
    // Si no llega no se inventa una: el combobox lo dice y no deja seguir.
    subscriptionsApi
      .getPSEBanks()
      .then(setBancos)
      .catch(() => setBancos([]))
      .finally(() => setCargandoBancos(false))
  }, [])

  const pagar = async () => {
    const e = validarPago(datos)
    setErrores(e)
    const primero = Object.keys(e)[0]
    if (primero) {
      // Al primer campo con problema, para no dejar a nadie buscándolo.
      document
        .getElementById(CAMPO_A_ID[primero] ?? `pse-${primero}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setEnviando(true)
    setErrorDePago(null)
    try {
      const { urlDePago } = await estudioPagoApi.iniciarPago(datos)
      // Se sale del sitio: no hay "después" que manejar acá.
      window.location.href = urlDePago
    } catch (err) {
      if (err instanceof CobroNoDisponible) setSinCobro(true)
      else setErrorDePago(err)
      setEnviando(false)
    }
  }

  const cobro = estado.fase === 'listo' ? estado.cobro : null
  const incluye = useMemo(() => cobro?.incluye ?? [], [cobro])
  const noDisponible = sinCobro || estado.fase === 'noDisponible'

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <RecorridoInquilino
        paso="pago"
        titulo="Paga y conoce tu tope"
        descripcion="Se hace una vez y te sirve para todas las propiedades que te interesen."
        /* Pagar es suyo, pero sin cobro del lado del servidor no tiene ningún
           botón que apretar: decirle "te toca a ti" sería falso. */
        turno={noDisponible ? 'nuestro' : undefined}
      />

      <div className="mt-8 space-y-6">
        {/* La vuelta de la pasarela, antes que nada: es lo que la persona
            está esperando ver cuando el banco la devuelve. */}
        {vuelta === 'pendiente' && (
          <Callout icon={<Clock weight="duotone" />} title="Tu banco está confirmando el pago">
            Puede tardar unos minutos. Te avisamos por correo apenas se acredite
            y la consulta a las aseguradoras arranca sola.
          </Callout>
        )}

        {estado.fase === 'cargando' ? (
          <EsqueletoTarjetas cantidad={1} className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1" />
        ) : noDisponible ? (
          /* El cobro no está listo del lado del servidor. Se dice, con salida:
             mostrar el formulario acá sería cobrar de mentira. */
          <Card className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
              <Lock weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-1.5">
              <p className="text-body-lg font-semibold text-fg">
                Todavía no se puede pagar desde aquí
              </p>
              <p className="mx-auto max-w-sm text-body-sm leading-relaxed text-fg-muted">
                Estamos terminando el pago en línea. Mientras tanto, la
                inmobiliaria puede pedir tu aprobación y te avisamos apenas esté.
              </p>
            </div>
            <Button asChild variant="secondary" className="mt-6">
              <Link href="/inquilino/aprobacion">Volver a mi tope de arriendo</Link>
            </Button>
          </Card>
        ) : estado.fase === 'fallo' ? (
          <FalloDeCarga
            error={estado.error}
            queEs="el estado de tu aprobación"
            onReintentar={recargar}
            volverA={{ label: 'Volver a mi tope de arriendo', href: '/inquilino/aprobacion' }}
          />
        ) : cobro?.pagado ? (
          <Card className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft">
              <CheckCircle weight="fill" className="h-6 w-6 text-success" aria-hidden="true" />
            </div>
            <p className="mt-4 text-body-lg font-semibold text-fg">Tu aprobación ya está paga</p>
            <p className="mx-auto mt-1.5 max-w-sm text-body-sm text-fg-muted">
              {cobro.pagadoEl
                ? `La pagaste el ${new Date(cobro.pagadoEl).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}. No tienes que pagar de nuevo.`
                : 'No tienes que pagar de nuevo.'}
            </p>
            <Button className="mt-6" onClick={() => router.push('/inquilino/para-ti')}>
              Ver las propiedades que te caben
            </Button>
          </Card>
        ) : cobro ? (
          <>
            {/* Qué se está comprando, antes de pedir un solo dato */}
            <Card className="p-6">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-fg-subtle" weight="duotone" aria-hidden="true" />
                  <span className="text-body-sm text-fg-muted">Aprobación de arriendo</span>
                </div>
                <span className="font-mono text-stat font-semibold tabular-nums text-fg">
                  {moneda(cobro.precioCop)}
                </span>
              </div>
              {incluye.length > 0 && (
                <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                  {incluye.map((linea) => (
                    <li key={linea} className="flex items-start gap-2.5 text-body-sm text-fg-muted">
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
            </Card>

            <Card className="p-6">
              <FormularioPSE
                valor={datos}
                onCambio={setDatos}
                bancos={bancos}
                cargandoBancos={cargandoBancos}
                errores={errores}
                deshabilitado={enviando}
              />

              {errorDePago !== null && (
                <FalloDeCarga
                  error={errorDePago}
                  queEs="el pago"
                  onReintentar={() => void pagar()}
                  className="mt-6 py-8"
                />
              )}

              <div className="mt-6 space-y-3 border-t border-border pt-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-body-sm text-fg-muted">Total a debitar</span>
                  <span className="font-mono text-h3 font-semibold tabular-nums text-fg">
                    {moneda(cobro.precioCop)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => void pagar()}
                  loading={enviando}
                  disabled={enviando}
                  data-testid="pagar-aprobacion"
                >
                  {enviando ? 'Llevándote a tu banco…' : `Pagar ${moneda(cobro.precioCop)}`}
                </Button>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  )
}
