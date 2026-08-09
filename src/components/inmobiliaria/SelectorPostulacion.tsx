'use client'

/**
 * SelectorPostulacion — "¿para quién es el contrato?".
 *
 * `/contratos/nuevo` lee `?applicationId=` para traer al candidato, la
 * propiedad y el canon. Sin ese parámetro responde **"Falta el parámetro
 * applicationId en la URL"**, que es lo que pasaba desde los dos lugares que
 * ofrecen crear un contrato. Este diálogo es el paso que faltaba: preguntar
 * sobre qué postulación aprobada se arma.
 *
 * Lo usan dos superficies:
 *   · `NuevoContratoBoton`, el botón principal de la pantalla de Contratos.
 *   · `BotonNuevo`, el lanzador del sidebar — por eso el diálogo se pide sus
 *     propios datos en vez de recibirlos: el sidebar no tiene los contratos
 *     cargados y no vale la pena que los cargue en cada pantalla del panel.
 *
 * Las dos llamadas salen al abrir, nunca antes.
 */

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MagnifyingGlass, User, House } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { landlordApplicationsApi } from '@/lib/api/applications.service'
import { contractsApi } from '@/lib/api/contracts.service'
import type { AllCandidatesItem } from '@/lib/api/applications.types'
import type { Contract } from '@/lib/types/contract'

/**
 * Las postulaciones sobre las que SÍ se puede armar un contrato.
 *
 * Exportada aparte porque es la regla que decide qué se le ofrece a alguien, y
 * equivocarse tiene dos costos distintos: de menos, el botón parece roto; de
 * más, se abre un segundo contrato sobre una persona que ya tiene uno.
 *
 * `busqueda` filtra encima, sin cambiar la elegibilidad — así la pantalla puede
 * distinguir "no hay ninguna" de "ninguna coincide con lo que escribiste".
 */
export function postulacionesElegibles(
  candidatos: readonly AllCandidatesItem[],
  contratos: readonly Contract[],
  busqueda = '',
): AllCandidatesItem[] {
  const yaTienenContrato = new Set(
    contratos.map((c) => c.applicationId).filter((id): id is string => Boolean(id)),
  )
  const q = busqueda.trim().toLowerCase()

  return candidatos
    .filter((c) => c.status === 'APPROVED' && !yaTienenContrato.has(c.id))
    .filter(
      (c) =>
        !q ||
        c.tenantName.toLowerCase().includes(q) ||
        c.propertyTitle.toLowerCase().includes(q),
    )
}

export interface SelectorPostulacionProps {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
}

export function SelectorPostulacion({ abierto, onOpenChange }: SelectorPostulacionProps) {
  const router = useRouter()
  const [candidatos, setCandidatos] = useState<AllCandidatesItem[] | null>(null)
  const [contratos, setContratos] = useState<Contract[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // Los contratos son para descartar postulaciones que ya tienen uno. Si
      // esa llamada falla se sigue igual: peor es no poder crear ninguno.
      const [cands, contrs] = await Promise.all([
        landlordApplicationsApi.getAllCandidates(),
        contractsApi.getMine().catch(() => [] as Contract[]),
      ])
      setCandidatos(cands.candidates)
      setContratos(contrs)
    } catch (err) {
      // Un fallo se dice como fallo: "no pudimos cargar" nunca es "no hay".
      setError(err instanceof Error ? err.message : 'No pudimos cargar las postulaciones.')
    } finally {
      setCargando(false)
    }
  }, [])

  const cambiar = useCallback(
    (siguiente: boolean) => {
      onOpenChange(siguiente)
      if (siguiente) {
        setBusqueda('')
        void cargar()
      }
    },
    [onOpenChange, cargar],
  )

  const elegibles = useMemo(
    () => postulacionesElegibles(candidatos ?? [], contratos, busqueda),
    [candidatos, contratos, busqueda],
  )

  /** Sin el buscador — para no decir "no hay" cuando solo no coincide el texto. */
  const hayAlgunaElegible = useMemo(
    () => postulacionesElegibles(candidatos ?? [], contratos).length > 0,
    [candidatos, contratos],
  )

  return (
    <Dialog open={abierto} onOpenChange={cambiar}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Para quién es el contrato?</DialogTitle>
          <DialogDescription>
            Un contrato se arma sobre una postulación aprobada: de ahí salen el inquilino, la
            propiedad y el canon.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" variant="muted" />
          </div>
        ) : error ? (
          <ErrorState
            title="No pudimos cargar las postulaciones"
            description={error}
            onRetry={() => void cargar()}
          />
        ) : !hayAlgunaElegible ? (
          <EmptyState
            icon={User}
            title="No hay postulaciones aprobadas esperando contrato"
            description="Cuando apruebes a un candidato, aparece acá para armarle el contrato."
            action={{ label: 'Ver postulaciones', href: '/panel/inmobiliaria/postulaciones' }}
          />
        ) : (
          <div className="space-y-3">
            {/* Mismo patrón de buscador que /postulaciones. */}
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <Input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o propiedad..."
                className="pl-9"
                aria-label="Buscar postulación"
              />
            </div>

            {elegibles.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-muted">
                Ninguna postulación coincide con «{busqueda}».
              </p>
            ) : (
              <ul
                // El listado puede pasarse de alto; sin esto Lenis se queda con
                // la rueda y no scrollea (docs/DESIGN.md §8).
                data-lenis-prevent
                className="max-h-[320px] space-y-1 overflow-y-auto [overscroll-behavior:contain]"
              >
                {elegibles.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false)
                        router.push(
                          `/panel/inmobiliaria/contratos/nuevo?applicationId=${encodeURIComponent(c.id)}`,
                        )
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left',
                        'hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                        <User className="h-4 w-4 text-fg-muted" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {c.tenantName}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-fg-muted">
                          <House className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.propertyTitle}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** El botón principal de la pantalla de Contratos. */
export function NuevoContratoBoton({ className }: { className?: string }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Button onClick={() => setAbierto(true)} hideArrow className={cn('shrink-0 gap-2', className)}>
        <Plus className="w-4 h-4" weight="bold" />
        Nuevo contrato
      </Button>
      <SelectorPostulacion abierto={abierto} onOpenChange={setAbierto} />
    </>
  )
}
