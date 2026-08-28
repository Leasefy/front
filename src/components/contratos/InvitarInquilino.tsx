'use client'

/**
 * Invitar (o vincular) al inquilino de un contrato migrado que se activó
 * sin uno — contract.md §3.2.B (T-0036). Sin esto, "sin invitar" en la
 * migración (WU-3, en el mismo branch) significaría "nunca": la única
 * salida de un contrato sin inquilino es esta pantalla (I2).
 *
 * Reutiliza `POST /contracts/:id/invitar-inquilino`, que a su vez reutiliza
 * `asegurarInquilino` del lado del back (el mismo enlace de invitación que
 * apunta a crear-contraseña, no directo al portal — I4). Acá sólo hay que
 * distinguir las dos respuestas 200 posibles: se mandó una invitación, o la
 * persona ya tenía cuenta y sólo se vinculó — nunca la misma frase para las
 * dos (§3.2.B3).
 */

import { useState } from 'react'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { contractsApi, mapBackendContract } from '@/lib/api/contracts.service'
import { ApiError } from '@/lib/api/client'
import type { Contract } from '@/lib/types/contract'

interface Props {
  contract: Contract
  /** `canAccess('contratos', 'create')` — mismo permiso que el back exige (Y2), NUNCA `contratos:edit`. */
  puedeInvitar: boolean
  onActualizado: (c: Contract) => void
  /** §3.3-E2: un 409 significa que alguien más ya lo hizo — hay que releer el contrato. */
  onConflicto: () => void
}

export function InvitarInquilino({ contract, puedeInvitar, onActualizado, onConflicto }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El botón sólo existe mientras el contrato no tiene inquilino — en
  // cuanto se invita/vincula, desaparece solo (tenantId deja de ser null).
  if (contract.tenantId !== null) return null

  if (!contract.tenantEmail) {
    return <p className="text-sm text-muted-foreground">Sin correo de inquilino.</p>
  }

  async function invitar() {
    setEnviando(true)
    setError(null)
    try {
      const res = await contractsApi.invitarInquilino(contract.id)
      onActualizado(mapBackendContract(res.contrato))
      toast.success(
        res.invitado
          ? 'Le mandamos la invitación al inquilino.'
          : 'Ese correo ya tenía una cuenta en Leasefy: vinculamos el contrato, sin mandar nada.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos invitar al inquilino.')
      if (e instanceof ApiError && e.status === 409) onConflicto()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Correo guardado: <span className="text-foreground">{contract.tenantEmail}</span>.
        Todavía no tiene cuenta ni acceso al portal.
      </p>
      {puedeInvitar ? (
        <Button
          variant="outline"
          size="sm"
          hideArrow
          disabled={enviando}
          isLoading={enviando}
          onClick={() => void invitar()}
          data-testid="invitar-inquilino"
        >
          <PaperPlaneTilt className="w-4 h-4" />
          Invitar al inquilino
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
