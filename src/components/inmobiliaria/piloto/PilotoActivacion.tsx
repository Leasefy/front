'use client'

/**
 * PilotoActivacion — el Piloto automático se prende POR INMOBILIARIA
 * (PI-01, PILOTO-ACTIVO, 04-10-2026).
 *
 * Lo que pasaba: el Piloto era una variable del servidor (la misma para todas)
 * y la página decía «Lo activa el equipo de Leasefy». La inmobiliaria que
 * compraba el Piloto automático no lo podía prender.
 *
 * Ahora, arriba de la torre, una franja dice en palabras cómo está el Piloto
 * de ESTA inmobiliaria (`GET /piloto/activo` del micro):
 *   · activo en prueba: «Prueba del Piloto: te quedan N días (hasta el …)»;
 *   · sin activar: qué hace y el botón (sólo un administrador) «Activar la
 *     prueba de 30 días» — con una confirmación que dice QUÉ VA A PASAR (qué
 *     agentes empiezan a actuar solos, con qué topes, qué sigue pidiendo el
 *     clic, cuándo termina la prueba) y el código de su aplicación (PI-23);
 *   · prueba terminada: volvió a Copiloto, y que para seguir hay que
 *     contratarlo (no se toca el cobro del SaaS: no hay botón de pago);
 *   · apagado por Leasefy (el interruptor maestro): ninguna inmobiliaria opera
 *     sola, y lo que elija queda guardado.
 * Y debajo, lo que le FALTA a la operación para que el Piloto trabaje (CR-31:
 * sin días de plazo no hay cobranza…), cada cosa con su enlace.
 *
 * Apagarlo no pide código (frenar siempre es fácil), pero sí confirmar.
 */

import { useState } from 'react'
import { Power, Rocket, WarningCircle } from '@phosphor-icons/react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertaAccionable, type SeveridadDeAlerta } from '@/components/ui/alerta-accionable'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { fechaLarga, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import { formatCurrency } from '@/lib/format'
import { usePilotoActivo } from '@/lib/hooks/piloto/use-piloto-opera-sola'
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context'
import type { PilotoActivoResponse } from '@/lib/api/piloto'
import { ConfirmarAutomatico, pideSegundoFactor } from './ConfirmarAutomatico'
import { EnlaceQueSePuedeAbrir } from './EnlaceQueSePuedeAbrir'

const fecha = (iso: string | null | undefined) => fechaLarga(diaEnColombia(iso))

/** «Contratos», «Contratos y Facturación», «Contratos, Facturación y Cobranza». */
function enLista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
}

/** El título y el tono de la franja, según por qué está (o no) activo. */
export function comoSeVe(d: PilotoActivoResponse): { titulo: string; severidad: SeveridadDeAlerta } {
  switch (d.motivo) {
    case 'activo':
      return d.prueba
        ? {
            titulo: `Piloto automático activo · Prueba: ${d.prueba.diasRestantes === 1 ? 'te queda 1 día' : `te quedan ${d.prueba.diasRestantes} días`}`,
            severidad: 'success',
          }
        : { titulo: 'Piloto automático activo', severidad: 'success' }
    case 'prueba_terminada':
      return { titulo: 'Terminó tu prueba del Piloto automático', severidad: 'warning' }
    case 'apagado_por_leasefy':
      return { titulo: 'Leasefy tiene apagado el Piloto automático', severidad: 'info' }
    case 'apagado_por_la_inmobiliaria':
      // QA-PILOTO-95 (06-10): sin «Apagaste»: lo lee también el asesor o el otro administrador, que
      // no lo apagaron. Quién lo apagó lo dice la frase del micro («Tu inmobiliaria apagó…»).
      return { titulo: 'El Piloto automático está apagado', severidad: 'info' }
    case 'no_se_pudo_leer':
      return { titulo: 'No pude comprobar el Piloto automático', severidad: 'warning' }
    default:
      return { titulo: 'El Piloto automático no está activo en tu inmobiliaria', severidad: 'info' }
  }
}

/** Lo que dice la confirmación de prenderlo: qué va a pasar, en palabras. */
function QueVaAPasar({ d }: { d: PilotoActivoResponse }) {
  const hasta = d.prueba && !d.prueba.terminada ? d.prueba.hasta : d.pruebaHastaSiSeActivaHoy
  const enAutomatico = d.enAutomatico.map((a) => a.nombre)
  return (
    <div className="space-y-3" data-testid="piloto-activacion-que-va-a-pasar">
      {hasta && !d.sinVencimiento && (
        <p>
          {d.prueba ? 'Sigue tu prueba' : `Empieza tu prueba de ${d.diasDePrueba} días`}: va hasta el{' '}
          <span className="font-medium">{fecha(hasta)}</span>. Al terminar vuelves sola a Copiloto: cada agente en
          Automático baja a Copiloto y te avisamos en la campana.
        </p>
      )}
      <p className="text-fg-muted">
        {enAutomatico.length > 0
          ? `Desde ya actúan solos, a tu nombre, los agentes que tienes en Automático: ${enLista(enAutomatico)}.`
          : 'Todavía no tienes ningún agente en Automático: después de activarlo, pásalos en Autonomía (cada uno con su código).'}{' '}
        Lo hacen dentro de tus topes ({formatCurrency(d.topes.topeMontoCop)} por acción y {d.topes.topeDestinatarios}{' '}
        {d.topes.topeDestinatarios === 1 ? 'persona' : 'personas'} por envío) y del horario de ley, con{' '}
        {d.topes.graciaSegundos} segundos para deshacer cada envío. Lo que hacen te lo cuentan en la Actividad en vivo.
      </p>
      <p className="text-fg-muted">
        Lo que sale de la inmobiliaria sin vuelta atrás o mueve plata (giros, la DIAN, centrales de riesgo,
        terminaciones, propuestas al inquilino) te lo sigue pidiendo con un clic, aunque esté en Automático.
      </p>
      {(d.requisitos?.length ?? 0) > 0 && (
        <p className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-fg">
          Ojo: a tu operación le falta algo para que todo trabaje solo. Lo ves debajo de esta franja, con el
          enlace para arreglarlo.
        </p>
      )}
      <p className="text-fg-muted">Para que quede a tu nombre, te pedimos el código de tu aplicación de autenticación.</p>
    </div>
  )
}

export function PilotoActivacion() {
  const { data, isLoading, error, notAvailable, cambiando, cambiar, refetch } = usePilotoActivo()
  const flota = usePilotoFlotaCompartida()
  const [confirmando, setConfirmando] = useState(false)
  const [apagando, setApagando] = useState(false)

  // Un micro viejo (404) o sin dato: no se pinta nada inventado.
  if (notAvailable || (!data && !isLoading && !error)) return null
  if (!data) return null

  const { titulo, severidad } = comoSeVe(data)
  const puede = data.puedeCambiarlo
  const prender = async () => {
    const r = await cambiar(true)
    if (r.ok) {
      void flota.refetch()
      toast.success('Encendiste el Piloto automático.')
      return { ok: true }
    }
    if (!pideSegundoFactor(r.fallo)) {
      toast.error(
        mensajeParaLaPersona(r.fallo, {
          porDefecto: 'No se pudo encender el Piloto automático.',
          accion: 'encender el Piloto automático',
        }),
      )
    }
    return { ok: false, fallo: r.fallo }
  }
  const apagar = async () => {
    const r = await cambiar(false)
    setApagando(false)
    if (r.ok) {
      void flota.refetch()
      toast.success('Apagaste el Piloto automático: ningún agente actúa solo.')
      return
    }
    toast.error(
      mensajeParaLaPersona(r.fallo, {
        porDefecto: 'No se pudo apagar el Piloto automático.',
        accion: 'apagar el Piloto automático',
      }),
    )
  }

  const sePuedePrender =
    puede && data.sePuedeActivar && (data.motivo === 'sin_activar' || data.motivo === 'apagado_por_la_inmobiliaria')
  const sePuedeApagar = puede && data.motivo === 'activo'
  const requisitos = data.requisitos ?? []

  return (
    <section className="space-y-3" id="piloto-activacion" data-testid="piloto-activacion" data-motivo={data.motivo}>
      <AlertaAccionable
        severidad={severidad}
        titulo={titulo}
        icon={data.activo ? <Rocket weight="duotone" /> : <Power weight="duotone" />}
        data-testid="piloto-activacion-estado"
        {...(sePuedePrender
          ? {
              accion: {
                // ACT-09: contratado con Leasefy no tiene prueba que ofrecer.
                label: data.motivo === 'apagado_por_la_inmobiliaria' ? 'Volver a encenderlo' : data.sinVencimiento ? 'Encender el Piloto automático' : `Activar la prueba de ${data.diasDePrueba} días`,
                onClick: () => setConfirmando(true),
                cargando: cambiando,
              },
            }
          : {})}
        {...(sePuedeApagar ? { secundaria: { label: 'Apagar el Piloto', onClick: () => setApagando(true), cargando: cambiando } } : {})}
      >
        {/* 🔴 axe (06-10): las líneas de abajo heredan la tinta legible de la alerta;
            en `text-fg-muted`, con la opacidad 0,9 del texto, daban 3,9:1 sobre el verde. */}
        <p data-testid="piloto-activacion-frase">{data.frase}</p>
        {!puede && !data.activo && data.motivo !== 'apagado_por_leasefy' && data.motivo !== 'prueba_terminada' && (
          <p className="mt-1">Lo activa un administrador de tu inmobiliaria.</p>
        )}
        {data.activo && data.enAutomatico.length > 0 && (
          <p className="mt-1" data-testid="piloto-activacion-en-automatico">
            Actúan solos: {enLista(data.enAutomatico.map((a) => a.nombre))}.
          </p>
        )}
        {data.activo && data.enAutomatico.length === 0 && (
          <p className="mt-1">
            Todavía no tienes ningún agente en Automático: pásalos en Autonomía para que actúen solos.
          </p>
        )}
      </AlertaAccionable>

      {requisitos.length > 0 && (
        <AlertaAccionable
          severidad="warning"
          icon={<WarningCircle weight="duotone" />}
          titulo={
            requisitos.length === 1
              ? 'A tu operación le falta 1 cosa para que el Piloto trabaje'
              : `A tu operación le faltan ${requisitos.length} cosas para que el Piloto trabaje`
          }
          data-testid="piloto-activacion-requisitos"
        >
          <ul className="space-y-2">
            {requisitos.map((r) => (
              <li key={r.id} data-testid={`piloto-requisito-${r.id.replace('requisito:', '')}`}>
                <p>{r.que}</p>
                <EnlaceQueSePuedeAbrir
                  href={r.enlace.href}
                  texto={r.enlace.texto}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                />
              </li>
            ))}
          </ul>
        </AlertaAccionable>
      )}

      <ConfirmarAutomatico
        abierto={confirmando}
        quien="el Piloto"
        pilotoActivo
        titulo="¿Activar el Piloto automático?"
        descripcion="Desde ese momento el Piloto actúa a tu nombre en tu inmobiliaria."
        explicacion={<QueVaAPasar d={data} />}
        textoSi="Sí, activarlo"
        textoVerificar="Verificar y activar"
        onConfirmar={prender}
        onCerrar={() => {
          setConfirmando(false)
          void refetch()
        }}
      />

      <AlertDialog open={apagando} onOpenChange={(o) => !o && !cambiando && setApagando(false)}>
        <AlertDialogContent icon={<Power weight="bold" />} data-testid="piloto-activacion-apagar">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Apagar el Piloto automático?</AlertDialogTitle>
            <AlertDialogDescription>
              Ningún agente vuelve a actuar solo: todo te pide un clic, como en Copiloto. Lo que elegiste en cada
              agente queda guardado
              {data.prueba && !data.prueba.terminada
                ? `, y tu prueba sigue corriendo hasta el ${fecha(data.prueba.hasta)}.`
                : '.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cambiando}>Cancelar</AlertDialogCancel>
            <Button hideArrow variant="destructive" isLoading={cambiando} onClick={() => void apagar()} data-testid="piloto-activacion-apagar-si">
              Sí, apagarlo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
