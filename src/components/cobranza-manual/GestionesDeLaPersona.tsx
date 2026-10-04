'use client'

/**
 * Las gestiones de cobro de UNA persona, con «Registrar gestión» (COBRANZA-MANUAL,
 * 04-10-2026). La misma pieza en los tres lugares que pidió Nico: la fila de
 * Cartera (dentro de su cajón), el estado de cuenta del inquilino y el detalle
 * del deudor de Cobranza.
 *
 * Registrar pide `cobros:create` (administrador, contador y auxiliar de cartera
 * de fábrica); ver, `cobros:view`. Sin el permiso de registrar, el botón no se
 * ofrece y se dice por qué.
 */
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { NotePencil } from '@phosphor-icons/react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { cobranzaManualApi } from '@/lib/api/cobranza-manual.service'
import type { HistorialDeLaPersona, QuienEs } from '@/lib/api/cobranza-manual.types'
import { HistorialDeGestiones } from './HistorialDeGestiones'
import { RegistrarGestion } from './RegistrarGestion'

export function GestionesDeLaPersona({
  quien,
  nombre,
  titulo = 'Gestiones de cobro',
  className,
  onCambio,
}: {
  quien: QuienEs
  nombre?: string | null
  titulo?: string
  className?: string
  /** Avisa que se registró algo (quien muestra un contador puede refrescarlo). */
  onCambio?: () => void
}) {
  const perms = usePermissionsContextSafe()
  const puedeRegistrar = perms ? perms.isAdmin || perms.canAccess('cobros', 'create') : false
  const [datos, setDatos] = useState<HistorialDeLaPersona | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)
  const clave = JSON.stringify(quien)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await cobranzaManualApi.historial(JSON.parse(clave) as QuienEs))
    } catch (err) {
      setError(err)
    } finally {
      setCargando(false)
    }
  }, [clave])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <section className={className} data-testid="gestiones-de-la-persona" aria-labelledby="gestiones-titulo">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="gestiones-titulo" className="text-base font-semibold text-fg">
          {titulo}
        </h2>
        {puedeRegistrar ? (
          <Button size="sm" hideArrow onClick={() => setAbierto(true)} data-testid="abrir-registrar-gestion">
            <NotePencil className="h-4 w-4" aria-hidden="true" />
            Registrar gestión
          </Button>
        ) : (
          <span className="text-caption text-fg-muted">
            Registrar gestiones lo hacen el administrador, el contador y el auxiliar de cartera.
          </span>
        )}
      </div>

      {cargando && !datos ? (
        <div className="flex items-center gap-2 py-4 text-sm text-fg-muted">
          <Spinner size="sm" /> Cargando las gestiones…
        </div>
      ) : error ? (
        <div className="space-y-2 py-2" role="alert">
          <p className="text-sm text-danger">
            {mensajeParaLaPersona(error, { porDefecto: 'No pudimos cargar las gestiones.' })}
          </p>
          <Button size="sm" variant="outline" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      ) : datos ? (
        <div className="space-y-3">
          <Presence show={datos.promesasIncumplidas > 0} initial={false}>
            <p className="rounded-md border border-danger/30 bg-danger/5 p-2 text-sm text-danger" data-testid="promesas-incumplidas">
              {datos.promesasIncumplidas === 1
                ? 'Tiene una promesa de pago incumplida.'
                : `Tiene ${datos.promesasIncumplidas} promesas de pago incumplidas.`}
            </p>
          </Presence>
          {!datos.agente.disponible ? (
            <p className="text-caption text-fg-muted" data-testid="historial-sin-agente">
              No pudimos traer lo que hizo el agente de cobranza; aquí sólo sale lo del equipo.
            </p>
          ) : null}
          {!datos.disponible ? (
            <p className="text-caption text-fg-muted">
              Registrar gestiones todavía no está habilitado en tu inmobiliaria.
            </p>
          ) : null}
          <HistorialDeGestiones entradas={datos.historial} />
        </div>
      ) : null}

      <RegistrarGestion
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        quien={quien}
        nombre={nombre ?? datos?.persona.nombre}
        onRegistrada={() => {
          void cargar()
          onCambio?.()
        }}
      />
    </section>
  )
}

void React
