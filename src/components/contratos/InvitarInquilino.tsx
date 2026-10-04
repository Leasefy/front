'use client'

/**
 * La invitación al portal del inquilino, desde su contrato.
 *
 * Nació para el contrato migrado que se activó sin inquilino — contract.md
 * §3.2.B (T-0036): sin esto, "sin invitar" en la migración significaría
 * "nunca". Reutiliza `POST /contracts/:id/invitar-inquilino`, que a su vez
 * reutiliza `asegurarInquilino` del back (el enlace que apunta a
 * crear-contraseña, no directo al portal — I4). Las dos respuestas 200 nunca
 * comparten frase: se mandó una invitación, o la persona ya tenía cuenta y
 * sólo se vinculó (§3.2.B3).
 *
 * 🔴 QA-CONT CR-08 (Nico 03-10: «Sólo desde el contrato… 7 días + Reenviar»):
 * un inquilino CON cuenta que nunca entró no tenía en su contrato ni el estado
 * ni «Reenviar». Ahora el estado lo dice el back
 * (`GET /contracts/:id/invitacion-del-inquilino`) y el botón es el que él
 * manda: «Invitar al portal», «Reenviar invitación» o ninguno. Al reenviar, la
 * respuesta trae `reenvio` con si salió y, si no, por qué: nunca se dice
 * «enviada» si no salió. Con un back anterior (la lectura falla) queda lo de
 * siempre: el botón sólo mientras el contrato no tiene inquilino.
 */

import { useCallback, useEffect, useState } from 'react'
import { Presence } from '@leasefy/cadence'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { toast } from '@/components/ui/toast'

import { Button } from '@/components/ui/button'
import {
  contractsApi,
  mapBackendContract,
  type InvitacionDelInquilino,
} from '@/lib/api/contracts.service'
import { ApiError } from '@/lib/api/client'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { diaEnColombia, fechaLarga } from '@/lib/fechas/fecha-de-la-casa'
import type { Contract } from '@/lib/types/contract'

interface Props {
  contract: Contract
  /** `canAccess('contratos', 'create')` — mismo permiso que el back exige (Y2), NUNCA `contratos:edit`. */
  puedeInvitar: boolean
  onActualizado: (c: Contract) => void
  /** §3.3-E2: un 409 significa que alguien más ya lo hizo — hay que releer el contrato. */
  onConflicto: () => void
}

/** «15 de octubre de 2026» de un instante ISO, en el día de Colombia. */
function dia(iso: string | null): string | null {
  const d = diaEnColombia(iso)
  return d ? fechaLarga(d) : null
}

/** El estado de la invitación, en palabras. `null` si no hay nada que decir. */
export function estadoDeLaInvitacionEnPalabras(
  inv: InvitacionDelInquilino,
  correo: string | null | undefined,
): string | null {
  const enviada = dia(inv.ultimoEnvio)
  const vence = dia(inv.vence)
  switch (inv.estado) {
    case 'SIN_CUENTA':
      return inv.accion === 'INVITAR' && correo
        ? `Correo guardado: ${correo}. Todavía no tiene cuenta ni acceso al portal.`
        : 'Sin correo de inquilino: agrégalo para poder invitarlo al portal.'
    case 'SIN_ENVIO':
      return 'Tiene cuenta del portal, pero no hay registro de que le haya salido la invitación. Todavía no ha entrado.'
    case 'PENDIENTE':
      return enviada && vence
        ? `Invitación al portal enviada el ${enviada}; vale hasta el ${vence}. Todavía no ha entrado.`
        : 'Tiene una invitación al portal vigente. Todavía no ha entrado.'
    case 'VENCIDA':
      return vence
        ? `La invitación al portal venció el ${vence} y todavía no ha entrado.`
        : 'La invitación al portal venció y todavía no ha entrado.'
    case 'YA_ENTRO':
      return 'Ya entró al portal.'
  }
}

export function InvitarInquilino({ contract, puedeInvitar, onActualizado, onConflicto }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Lo que dice el back de la invitación. `null` = todavía no se sabe (o back anterior). */
  const [invitacion, setInvitacion] = useState<InvitacionDelInquilino | null>(null)

  const leer = useCallback(async () => {
    try {
      const inv = await contractsApi.invitacionDelInquilino(contract.id)
      setInvitacion(inv && typeof inv === 'object' && 'estado' in inv ? inv : null)
    } catch {
      // Back anterior o la lectura falló: queda el comportamiento de siempre.
      setInvitacion(null)
    }
  }, [contract.id])

  useEffect(() => {
    void leer()
    // `tenantId` cambia al invitar/vincular: se vuelve a leer el estado.
  }, [leer, contract.tenantId])

  async function invitar() {
    setEnviando(true)
    setError(null)
    try {
      const res = await contractsApi.invitarInquilino(contract.id)
      if (res.reenvio) {
        // CR-08: el reenvío dice si salió. Si no salió, NUNCA «enviada».
        setInvitacion(res.reenvio.invitacion)
        if (res.reenvio.enviada) toast.success(res.reenvio.mensaje)
        else toast.warning(res.reenvio.mensaje)
      } else {
        toast.success(
          res.invitado
            ? 'Le mandamos la invitación al inquilino.'
            : 'Ese correo ya tenía una cuenta en Leasefy: vinculamos el contrato, sin mandar nada.',
        )
        void leer()
      }
      if (res.contrato) onActualizado(mapBackendContract(res.contrato))
    } catch (e) {
      // El 409 y el 502 traen su frase del back; un 5xx sin frase dice que es
      // nuestro (con la referencia) y sólo la red habla de conexión.
      setError(
        mensajeParaLaPersona(e, {
          porDefecto: 'No pudimos invitar al inquilino.',
          accion: 'invitar al inquilino',
        }),
      )
      if (e instanceof ApiError && e.status === 409) {
        onConflicto()
        void leer()
      }
    } finally {
      setEnviando(false)
    }
  }

  const mensajeDeError = (
    <Presence show={Boolean(error)} initial={false} distance="xs" as="p" role="alert" className="text-sm text-destructive" data-testid="invitar-inquilino-error">
      {error}
    </Presence>
  )

  // Sin el estado del back: lo de siempre (sólo mientras no tiene inquilino).
  if (!invitacion) {
    if (contract.tenantId !== null) return null
    if (!contract.tenantEmail) {
      return <p className="text-sm text-muted-foreground">Sin correo de inquilino.</p>
    }
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Correo guardado: <span className="text-foreground">{contract.tenantEmail}</span>.
          Todavía no tiene cuenta ni acceso al portal.
        </p>
        {puedeInvitar ? (
          <BotonDeInvitar accion="INVITAR" enviando={enviando} onClick={() => void invitar()} />
        ) : null}
        {mensajeDeError}
      </div>
    )
  }

  const enPalabras = estadoDeLaInvitacionEnPalabras(invitacion, contract.tenantEmail)
  return (
    <div className="space-y-2" data-testid="invitacion-del-inquilino" data-estado={invitacion.estado}>
      {enPalabras ? (
        <p
          className={
            invitacion.estado === 'VENCIDA' ? 'text-sm text-warning' : 'text-sm text-muted-foreground'
          }
          data-testid="invitacion-estado"
        >
          {enPalabras}
        </p>
      ) : null}
      {puedeInvitar && invitacion.accion ? (
        <BotonDeInvitar accion={invitacion.accion} enviando={enviando} onClick={() => void invitar()} />
      ) : null}
      {mensajeDeError}
    </div>
  )
}

function BotonDeInvitar({
  accion,
  enviando,
  onClick,
}: {
  accion: 'INVITAR' | 'REENVIAR'
  enviando: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      hideArrow
      disabled={enviando}
      isLoading={enviando}
      onClick={onClick}
      data-testid="invitar-inquilino"
    >
      <PaperPlaneTilt className="w-4 h-4" />
      {/* CR-14: «Invitar al portal» es el nombre con que lo nombra el 409
          `INQUILINO_SIN_CUENTA` del back; CR-08: «Reenviar invitación». */}
      {accion === 'REENVIAR' ? 'Reenviar invitación' : 'Invitar al portal'}
    </Button>
  )
}
