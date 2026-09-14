'use client'

/**
 * 🔴 Qué va a pasar con este contrato cuando venza, y cuándo.
 *
 * Nico (2026-09-12): «Contrató el 3 de septiembre y 3 meses antes del 3 no hay
 * ninguna notificación por parte del inquilino que lo renueve y haga el
 * incremento. Cuando haga esa renovación, que notifique también
 * automáticamente: que haga la renovación de manera automática y el
 * incremento del canon.»
 *
 * La Ley 820 de 2003 ya dice eso: el contrato se prorroga SOLO por el mismo
 * término si nadie avisa con 3 meses de anticipación (art. 22), y el canon
 * puede subir hasta el IPC del año anterior avisando (art. 20). Esta sección
 * es la única parte del producto donde eso se LEE antes de que pase: la fecha
 * en que se avisa, la fecha en que se renueva y con qué canon.
 *
 * 🔴 El pronóstico lo calcula el BACK con la misma regla que corre el cron de
 * las 00:20 (`contracts/renovacion/renovacion-automatica.ts`). Acá no se
 * recalcula nada: si la pantalla hiciera su propia cuenta, tarde o temprano
 * diría una cosa y el sistema haría otra.
 */

import { useCallback, useEffect, useState } from 'react'
import { ArrowsClockwise, Info, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  NOMBRE_DE_LA_PARTE,
  PARTES_QUE_AVISAN,
  renovacionAutomaticaApi,
  type ParteQueAvisa,
  type PlanDelContrato,
} from '@/lib/api/renovacion-automatica.service'
import { fechaLarga, formatearPct } from '@/lib/renovaciones/reglas'
import { formatCurrency } from '@/lib/format'
import type { Contract } from '@/lib/types/contract'

interface Props {
  contract: Pick<Contract, 'id'>
  puedeEditar: boolean
}

/** Por qué no hay pronóstico, dicho como lo entendería quien opera. */
const SIN_PLAN: Record<string, string> = {
  CONTRATO_NO_VIGENTE:
    'Este contrato todavía no rige (o ya terminó): no hay renovación que preparar.',
  SIN_VENCIMIENTO:
    'Este contrato no tiene fecha de fin, así que no se puede saber cuándo se renueva. Cárgala en el contrato.',
  SIN_CANON:
    'Este contrato no tiene canon, así que no hay sobre qué aplicar el incremento.',
}

export function RenovacionDelContrato({ contract, puedeEditar }: Props) {
  const [datos, setDatos] = useState<PlanDelContrato | null>(null)
  // El error ENTERO: `FalloDeCarga` lo clasifica (404 sin reintentar, red sí)
  // y no muestra el inglés del back.
  const [error, setError] = useState<unknown>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      setDatos(await renovacionAutomaticaApi.delContrato(contract.id))
    } catch (e) {
      // Un fallo NO se pinta como «no se renueva»: son cosas distintas.
      setError(e)
    }
  }, [contract.id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function registrarAviso(parte: ParteQueAvisa, motivo: string) {
    if (!datos?.renovacionId) return
    setGuardando(true)
    try {
      await renovacionAutomaticaApi.registrarAviso(datos.renovacionId, { parte, motivo })
      setDialogoAbierto(false)
      toast.success('Aviso registrado: este contrato no se prorroga.')
      await cargar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo registrar el aviso.')
    } finally {
      setGuardando(false)
    }
  }

  async function retirarAviso() {
    if (!datos?.renovacionId) return
    setGuardando(true)
    try {
      await renovacionAutomaticaApi.borrarAviso(datos.renovacionId)
      toast.success('Aviso retirado: el contrato vuelve a prorrogarse solo.')
      await cargar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo retirar el aviso.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 space-y-3"
      data-testid="renovacion-del-contrato"
    >
      <div className="flex items-center gap-2">
        <ArrowsClockwise className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">Renovación</h3>
      </div>

      {datos === null && error === null ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : error !== null ? (
        <FalloDeCarga
          error={error}
          queEs="la renovación de este contrato"
          onReintentar={cargar}
          enmarcado={false}
        />
      ) : datos && !datos.plan ? (
        <p className="text-sm text-muted-foreground" data-testid="renovacion-sin-plan">
          {SIN_PLAN[datos.sinPlanPorque ?? ''] ??
            'Todavía no se puede calcular la renovación de este contrato.'}
        </p>
      ) : datos?.plan ? (
        <div className="space-y-3">
          <Pronostico datos={datos} />

          {datos.aviso ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Si quien avisó se retracta, el contrato vuelve a prorrogarse solo.
              </p>
              {puedeEditar && datos.renovacionId ? (
                <Button
                  variant="secondary"
                  size="sm"
                  hideArrow
                  isLoading={guardando}
                  onClick={() => void retirarAviso()}
                  data-testid="renovacion-retirar-aviso"
                >
                  Retirar el aviso
                </Button>
              ) : null}
            </div>
          ) : puedeEditar ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {datos.renovacionId
                  ? 'Si alguna de las partes avisa que no renueva, regístralo acá: es lo único que frena la prórroga.'
                  : 'La renovación se abre sola tres meses antes del vencimiento. Hasta entonces no hay dónde registrar un aviso.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={!datos.renovacionId}
                onClick={() => setDialogoAbierto(true)}
                data-testid="renovacion-abrir-aviso"
              >
                Registrar aviso de no renovación
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <DialogoDeAviso
        abierto={dialogoAbierto}
        guardando={guardando}
        onCerrar={() => setDialogoAbierto(false)}
        onConfirmar={(parte, motivo) => void registrarAviso(parte, motivo)}
      />
    </section>
  )
}

/** La frase con la que Nico quiere leer esta sección, y sus números. */
function Pronostico({ datos }: { datos: PlanDelContrato }) {
  const plan = datos.plan!
  const vence = fechaLarga(plan.finDeVigencia, 'es')
  const avisaHasta = fechaLarga(plan.fechaDeAviso, 'es')
  const nuevoVence = fechaLarga(plan.nuevoVencimiento, 'es')

  if (datos.aviso) {
    const quien =
      NOMBRE_DE_LA_PARTE[datos.aviso.por as ParteQueAvisa] ?? 'Una de las partes'
    return (
      <div
        className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 space-y-1"
        data-testid="renovacion-con-aviso"
      >
        <p className="flex items-start gap-2 text-sm text-warning">
          <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{quien} avisó que no renueva.</strong> Este contrato termina el {vence} y
            el inmueble queda disponible: no se prorroga ni sube el canon.
          </span>
        </p>
        {datos.aviso.motivo ? (
          <p className="pl-6 text-xs text-muted-foreground">Motivo: {datos.aviso.motivo}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground" data-testid="renovacion-frase">
        Se renueva sola el <strong>{vence}</strong>
        {plan.incremento > 0 ? (
          <>
            {' '}
            con un incremento del{' '}
            <strong className="font-mono tabular-nums">
              {formatearPct(plan.incrementoPct, 'es')}
            </strong>
            {' — '}
            <span className="font-mono tabular-nums">{formatCurrency(plan.canonActual)}</span>
            {' → '}
            <span className="font-mono tabular-nums">{formatCurrency(plan.canonNuevo)}</span>
          </>
        ) : (
          ' con el mismo canon'
        )}{' '}
        si nadie avisa antes del <strong>{avisaHasta}</strong>.
      </p>
      <p className="text-xs text-muted-foreground">
        Se prorroga por {plan.mesesDeTermino} meses, hasta el {nuevoVence}
        {plan.ipc ? ` · IPC de ${plan.ipc.anio}: ${formatearPct(plan.ipc.rate, 'es')}` : ''}.
      </p>

      {plan.incremento <= 0 && !plan.ipc ? (
        <p
          className="flex items-start gap-2 text-xs text-muted-foreground"
          data-testid="renovacion-sin-ipc"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          No hay IPC cargado para esa vigencia, así que se renueva sin incremento. Escríbelo
          en el cajón de renovación y el sistema lo usará.
        </p>
      ) : null}

      {datos.propuestaEnviadaAt ? (
        <p className="text-xs text-muted-foreground" data-testid="renovacion-propuesta-enviada">
          La propuesta ya salió al inquilino y al propietario.
        </p>
      ) : null}

      {/*
        Sin la perilla de la agencia el cron no toca este contrato: decirlo es
        la diferencia entre una pantalla que informa y una que promete algo
        que no va a pasar.
      */}
      {!datos.automaticaPrendida ? (
        <p
          className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          data-testid="renovacion-automatica-apagada"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            La renovación automática está <strong>apagada</strong> para tu inmobiliaria: el
            contrato se prorroga igual por ley, pero Leasefy no va a mandar la propuesta ni a
            subir el canon solo. Pídenos prenderla.
          </span>
        </p>
      ) : null}
    </div>
  )
}

function DialogoDeAviso({
  abierto,
  guardando,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean
  guardando: boolean
  onCerrar: () => void
  onConfirmar: (parte: ParteQueAvisa, motivo: string) => void
}) {
  const [parte, setParte] = useState<ParteQueAvisa>('INQUILINO')
  const [motivo, setMotivo] = useState('')

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md" data-testid="dialogo-aviso-no-renovacion">
        <DialogHeader>
          <DialogTitle>Aviso de no renovación</DialogTitle>
          <DialogDescription>
            La ley pide avisar con tres meses de anticipación. Registrado el aviso, este
            contrato no se prorroga: termina en su vencimiento y el inmueble queda disponible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>¿Quién avisa?</Label>
            <div className="flex flex-wrap gap-2">
              {PARTES_QUE_AVISAN.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={parte === p ? 'default' : 'outline'}
                  size="sm"
                  hideArrow
                  onClick={() => setParte(p)}
                  data-testid={`aviso-parte-${p}`}
                >
                  {NOMBRE_DE_LA_PARTE[p]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo-aviso-no-renovacion">Motivo</Label>
            <Textarea
              id="motivo-aviso-no-renovacion"
              data-testid="aviso-motivo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por ejemplo: el inquilino se muda en diciembre."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" hideArrow onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            hideArrow
            disabled={motivo.trim().length < 3 || guardando}
            isLoading={guardando}
            onClick={() => onConfirmar(parte, motivo.trim())}
            data-testid="aviso-confirmar"
          >
            Registrar el aviso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
