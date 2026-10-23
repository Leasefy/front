'use client'

/**
 * AcuerdoGeneralForm — el nivel interno donde se arma un acuerdo general.
 *
 * Está en una pantalla propia y no en un modal a propósito: son tres decisiones
 * distintas (a quién, qué ofrecer, en qué orden gana) y ninguna cabe en un
 * diálogo sin quedar apretada.
 *
 * El orden de las secciones es el orden de las preguntas:
 *   1. ¿Cómo se llama y qué se le dice al deudor?
 *   2. ¿A quién aplica?      → vacío = a todos. NO es «a nadie».
 *   3. ¿Qué le ofrece?
 *
 * Arriba de Guardar va el acuerdo leído de corrido. Es lo que deja ver, antes
 * de guardar, si dice lo que uno cree que dice.
 */

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FloppyDisk } from '@phosphor-icons/react'
import { BackButton } from '@/components/ui/back-button'
import { BackButton as VueltaConPregunta } from '@leasefy/cadence'
import { toast } from '@/components/ui/toast'
import { useAvisoAlSalir } from '@/lib/hooks/use-aviso-al-salir'
import { Card, Presence, Stagger, StaggerItem } from '@leasefy/cadence'

import {
  Button,
  Input,
  Label,
  Checkbox,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import {
  ETAPAS_ES,
  ETAPAS_EN_ORDEN,
  resumenAcuerdoGeneral,
  avisosDelAcuerdoGeneral,
  type AcuerdoGeneral,
  type EtapaCartera,
} from '@/lib/cobranza/acuerdo-general-vocab'
import type { AcuerdoGeneralNuevo } from '@/lib/hooks/cobranza/use-acuerdos-generales'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  erroresDelAcuerdoGeneral,
  type CampoDelAcuerdoGeneral,
} from '@/lib/hooks/cobranza/limites-de-cobranza'

const VOLVER = '/panel/inmobiliaria/pagos/cobranza/acuerdos'

/**
 * El `id` del control de cada campo, en el orden de la pantalla. Su error vive
 * en `${id}-error` (el `aria-describedby` del control) y el primero con error
 * recibe el foco.
 */
const ID_DEL_CAMPO: Record<CampoDelAcuerdoGeneral, string> = {
  name: 'ag-nombre',
  conditionEs: 'ag-condicion',
  minDaysOverdue: 'ag-min-dias',
  maxDaysOverdue: 'ag-max-dias',
  minAmountCop: 'ag-min-monto',
  maxAmountCop: 'ag-max-monto',
  discountPct: 'ag-descuento',
  maxInstallments: 'ag-cuotas',
  minInitialPct: 'ag-inicial',
  priority: 'ag-prioridad',
}
const CAMPOS = Object.keys(ID_DEL_CAMPO) as CampoDelAcuerdoGeneral[]

type ErroresDelAcuerdo = Partial<Record<CampoDelAcuerdoGeneral, string>>

function enfocarElPrimero(errores: ErroresDelAcuerdo) {
  const primero = CAMPOS.find((c) => errores[c])
  if (primero) document.getElementById(ID_DEL_CAMPO[primero])?.focus()
}

export interface Borrador {
  name: string
  conditionEs: string
  priority: number
  active: boolean
  stages: EtapaCartera[]
  minDaysOverdue: number | null
  maxDaysOverdue: number | null
  minAmountCop: number | null
  maxAmountCop: number | null
  discountPct: number
  discountKind: 'none' | 'intereses_parcial' | 'intereses_total'
  maxInstallments: number
  minInitialPct: number
}

export const BORRADOR_VACIO: Borrador = {
  name: '',
  conditionEs: '',
  priority: 0,
  active: true,
  stages: [],
  minDaysOverdue: null,
  maxDaysOverdue: null,
  minAmountCop: null,
  maxAmountCop: null,
  discountPct: 0,
  discountKind: 'none',
  maxInstallments: 3,
  minInitialPct: 30,
}

export function borradorDesde(a: AcuerdoGeneral): Borrador {
  return {
    name: a.name,
    conditionEs: a.conditionEs,
    priority: a.priority,
    active: a.active,
    stages: a.stages as EtapaCartera[],
    minDaysOverdue: a.minDaysOverdue,
    maxDaysOverdue: a.maxDaysOverdue,
    minAmountCop: a.minAmountCop,
    maxAmountCop: a.maxAmountCop,
    discountPct: a.discountPct,
    discountKind: a.discountKind,
    maxInstallments: a.maxInstallments,
    minInitialPct: a.minInitialPct,
  }
}

/** Un número opcional: vacío es «sin condición», NO cero. */
function numeroOpcional(v: string): number | null {
  const limpio = v.trim()
  if (limpio === '') return null
  const n = Number(limpio.replace(/\./g, ''))
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function entero(v: string, porDefecto: number): number {
  const n = Number(v.trim())
  return Number.isFinite(n) ? Math.trunc(n) : porDefecto
}

export interface AcuerdoGeneralFormProps {
  titulo: string
  inicial: Borrador
  /** Devuelve el error a mostrar, o nada si salió bien. */
  onGuardar: (payload: AcuerdoGeneralNuevo) => Promise<void>
  textoGuardar?: string
}

export function AcuerdoGeneralForm({
  titulo,
  inicial,
  onGuardar,
  textoGuardar = 'Guardar acuerdo',
}: AcuerdoGeneralFormProps) {
  const router = useRouter()
  const [b, setB] = useState<Borrador>(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** El error de cada campo: el del cliente (los topes del micro) o el que el micro mandó en `campos`. */
  const [errores, setErrores] = useState<ErroresDelAcuerdo>({})

  const set = useCallback(<K extends keyof Borrador>(k: K, v: Borrador[K]) => {
    // Al corregir un campo, su error ya no aplica (y el del par del rango tampoco).
    setErrores((prev) => {
      const pares: Partial<Record<keyof Borrador, CampoDelAcuerdoGeneral[]>> = {
        minDaysOverdue: ['minDaysOverdue', 'maxDaysOverdue'],
        maxDaysOverdue: ['minDaysOverdue', 'maxDaysOverdue'],
        minAmountCop: ['minAmountCop', 'maxAmountCop'],
        maxAmountCop: ['minAmountCop', 'maxAmountCop'],
      }
      const limpiar = pares[k] ?? (CAMPOS.includes(k as CampoDelAcuerdoGeneral) ? [k as CampoDelAcuerdoGeneral] : [])
      if (!limpiar.some((c) => prev[c])) return prev
      const siguiente = { ...prev }
      for (const c of limpiar) delete siguiente[c]
      return siguiente
    })
    setB((prev) => {
      const siguiente = { ...prev, [k]: v }
      // El porcentaje y el «sobre qué» son la MISMA decisión escrita en dos
      // campos: se guardaba «15% de descuento» junto a «sin descuento», y
      // después nadie podía decir qué se le ofrecía al deudor. Se mueven
      // juntos, así que la contradicción no llega ni a existir.
      if (k === 'discountPct' && siguiente.discountPct > 0 && siguiente.discountKind === 'none') {
        siguiente.discountKind = 'intereses_parcial'
      }
      if (k === 'discountKind' && siguiente.discountKind === 'none') {
        siguiente.discountPct = 0
      }
      return siguiente
    })
  }, [])

  const alternarEtapa = useCallback((etapa: EtapaCartera, marcada: boolean) => {
    setB((prev) => ({
      ...prev,
      stages: marcada
        ? [...prev.stages, etapa]
        : prev.stages.filter((s) => s !== etapa),
    }))
  }, [])

  // El acuerdo dicho de corrido. Se arma con la misma forma que devuelve el
  // back para que la frase de acá y la de la tabla no puedan divergir.
  const comoSeLee = useMemo<AcuerdoGeneral>(
    () => ({
      id: 'preview',
      createdAt: '',
      updatedAt: '',
      ...b,
    }),
    [b],
  )

  const avisos = avisosDelAcuerdoGeneral(comoSeLee)

  const puedeGuardar =
    b.name.trim().length > 0 &&
    b.conditionEs.trim().length > 0 &&
    !(b.discountPct === 0 && b.maxInstallments === 0)

  // Revisora r25 (5b): el botón apagado dice qué falta, al lado.
  const loQueFalta = [
    b.name.trim().length === 0 ? 'el nombre' : null,
    b.conditionEs.trim().length === 0 ? 'la condición' : null,
    b.discountPct === 0 && b.maxInstallments === 0 ? 'un descuento o cuotas' : null,
  ].filter((x): x is string => x !== null)
  const fraseDeLoQueFalta =
    loQueFalta.length === 0
      ? null
      : `Falta ${loQueFalta.length === 1 ? loQueFalta[0] : `${loQueFalta.slice(0, -1).join(', ')} y ${loQueFalta[loQueFalta.length - 1]}`}.`

  // Revisora r25 (3b): lo escrito no se pierde sin aviso (al cerrar la pestaña, y al volver o cancelar).
  const sucio = JSON.stringify(b) !== JSON.stringify(inicial)
  useAvisoAlSalir(sucio && !guardando)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  const salir = useCallback(() => {
    if (sucio) setConfirmandoSalida(true)
    else router.push(VOLVER)
  }, [sucio, router])

  const guardar = useCallback(async () => {
    setError(null)
    // Lo que el micro rechazaría se ataja acá, debajo de su campo.
    const delCliente = erroresDelAcuerdoGeneral(b)
    if (Object.keys(delCliente).length > 0) {
      setErrores(delCliente)
      enfocarElPrimero(delCliente)
      return
    }
    setErrores({})
    setGuardando(true)
    try {
      await onGuardar({
        name: b.name.trim(),
        conditionEs: b.conditionEs.trim(),
        priority: b.priority,
        active: b.active,
        stages: b.stages,
        minDaysOverdue: b.minDaysOverdue,
        maxDaysOverdue: b.maxDaysOverdue,
        minAmountCop: b.minAmountCop,
        maxAmountCop: b.maxAmountCop,
        discountPct: b.discountPct,
        discountKind: b.discountKind,
        maxInstallments: b.maxInstallments,
        minInitialPct: b.minInitialPct,
      })
      // Revisora r25 (1c): al guardar, el aviso que confirma.
      toast.success(`Listo: se guardó «${b.name.trim()}». El agente lo usa desde ya.`)
      router.push(VOLVER)
    } catch (e) {
      // Un 400 con `campos` va a su campo; arriba de Guardar, sólo lo suelto
      // (las etapas, un 409, un 5xx con su referencia, la red).
      const reparto = repartirErroresDelServidor<CampoDelAcuerdoGeneral>(e, {
        campos: CAMPOS,
        porDefecto: 'No pudimos guardar el acuerdo.',
        accion: 'guardar el acuerdo',
      })
      setErrores(reparto.porCampo)
      enfocarElPrimero(reparto.porCampo)
      setError(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null)
      setGuardando(false)
    }
  }, [b, onGuardar, router])

  /** Lo que lleva cada control para leer su error. */
  const aria = (campo: CampoDelAcuerdoGeneral) => ({
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${ID_DEL_CAMPO[campo]}-error` : undefined,
  })

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        {sucio ? (
          // La misma pieza de la vuelta (BackButton sin href = botón): con algo
          // escrito, antes de irse pregunta.
          <VueltaConPregunta onClick={salir} label="Acuerdos de pago" variant="subtle" data-testid="acuerdo-general-volver" />
        ) : (
          <BackButton href={VOLVER} label="Acuerdos de pago" variant="subtle" />
        )}
        <EncabezadoDePantalla
          className="mt-3"
          seccion="Cobranza"
          titulo={titulo}
          descripcion="Una regla que el agente cierra sin preguntarte. Nunca puede ofrecer más que los límites que ya configuraste."
        />
      </div>

      {/* 1 — Qué es */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-fg">Qué es</h2>
          <p className="text-caption text-fg-muted">
            El nombre es para ti; la condición es lo que el agente le dice al deudor.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ag-nombre" className="text-sm">
            Nombre
          </Label>
          <Input
            id="ag-nombre"
            value={b.name}
            maxLength={120}
            placeholder="Cierre rápido de fin de mes"
            onChange={(e) => set('name', e.target.value)}
            {...aria('name')}
          />
          <ErrorDelCampo id="ag-nombre-error" mensaje={errores.name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ag-condicion" className="text-sm">
            Qué tiene que hacer el deudor
          </Label>
          <Input
            id="ag-condicion"
            value={b.conditionEs}
            maxLength={280}
            placeholder="Firma el acuerdo y paga la inicial en 7 días"
            onChange={(e) => set('conditionEs', e.target.value)}
            {...aria('conditionEs')}
          />
          <ErrorDelCampo
            id="ag-condicion-error"
            mensaje={errores.conditionEs}
            pista="Se lo dice tal cual, en la llamada. Escríbelo como se lo dirías tú."
          />
        </div>
      </Card>

      {/* 2 — Cuándo aplica */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-fg">Cuándo aplica</h2>
          <p className="text-caption text-fg-muted">
            Lo que dejes vacío no filtra. Sin nada marcado, aplica a cualquier deudor.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Etapas de mora</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ETAPAS_EN_ORDEN.map((etapa) => (
              <label
                key={etapa}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer"
              >
                <Checkbox
                  checked={b.stages.includes(etapa)}
                  onCheckedChange={(v) => alternarEtapa(etapa, v === true)}
                />
                <span className="text-sm text-fg">{ETAPAS_ES[etapa]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ag-min-dias" className="text-sm">
              Desde (días de mora)
            </Label>
            <Input
              id="ag-min-dias"
              inputMode="numeric"
              value={b.minDaysOverdue ?? ''}
              placeholder="Sin mínimo"
              onChange={(e) => set('minDaysOverdue', numeroOpcional(e.target.value))}
              {...aria('minDaysOverdue')}
            />
            <ErrorDelCampo id="ag-min-dias-error" mensaje={errores.minDaysOverdue} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-max-dias" className="text-sm">
              Hasta (días de mora)
            </Label>
            <Input
              id="ag-max-dias"
              inputMode="numeric"
              value={b.maxDaysOverdue ?? ''}
              placeholder="Sin máximo"
              onChange={(e) => set('maxDaysOverdue', numeroOpcional(e.target.value))}
              {...aria('maxDaysOverdue')}
            />
            <ErrorDelCampo id="ag-max-dias-error" mensaje={errores.maxDaysOverdue} />
          </div>
        </div>

        {/* Revisora r27: a 390 un monto de 9 dígitos no cabía en media columna: uno debajo del otro. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ag-min-monto" className="text-sm">
              Deuda desde (COP)
            </Label>
            <Input
              id="ag-min-monto"
              inputMode="numeric"
              value={b.minAmountCop ?? ''}
              placeholder="Sin mínimo"
              onChange={(e) => set('minAmountCop', numeroOpcional(e.target.value))}
              {...aria('minAmountCop')}
            />
            <ErrorDelCampo id="ag-min-monto-error" mensaje={errores.minAmountCop} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-max-monto" className="text-sm">
              Deuda hasta (COP)
            </Label>
            <Input
              id="ag-max-monto"
              inputMode="numeric"
              value={b.maxAmountCop ?? ''}
              placeholder="Sin máximo"
              onChange={(e) => set('maxAmountCop', numeroOpcional(e.target.value))}
              {...aria('maxAmountCop')}
            />
            <ErrorDelCampo id="ag-max-monto-error" mensaje={errores.maxAmountCop} />
          </div>
        </div>
      </Card>

      {/* 3 — Qué ofrece */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-fg">Qué ofrece</h2>
          <p className="text-caption text-fg-muted">
            El descuento va siempre sobre intereses. El capital no se descuenta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ag-descuento" className="text-sm">
              Descuento (%)
            </Label>
            <Input
              id="ag-descuento"
              inputMode="numeric"
              value={b.discountPct}
              onChange={(e) => set('discountPct', entero(e.target.value, 0))}
              {...aria('discountPct')}
            />
            <ErrorDelCampo id="ag-descuento-error" mensaje={errores.discountPct} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Sobre qué</Label>
            <Select
              value={b.discountKind}
              onValueChange={(v) => set('discountKind', v as Borrador['discountKind'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin descuento</SelectItem>
                <SelectItem value="intereses_parcial">Parte de los intereses</SelectItem>
                <SelectItem value="intereses_total">Todos los intereses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ag-cuotas" className="text-sm">
              Cuotas máximas
            </Label>
            <Input
              id="ag-cuotas"
              inputMode="numeric"
              value={b.maxInstallments}
              onChange={(e) => set('maxInstallments', entero(e.target.value, 0))}
              {...aria('maxInstallments')}
            />
            <ErrorDelCampo id="ag-cuotas-error" mensaje={errores.maxInstallments} pista="0 = pago único." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-inicial" className="text-sm">
              Pago inicial mínimo (%)
            </Label>
            <Input
              id="ag-inicial"
              inputMode="numeric"
              value={b.minInitialPct}
              disabled={b.maxInstallments === 0}
              onChange={(e) => set('minInitialPct', entero(e.target.value, 0))}
              {...aria('minInitialPct')}
            />
            <ErrorDelCampo id="ag-inicial-error" mensaje={errores.minInitialPct} />
          </div>
        </div>
      </Card>

      {/* 4 — Orden y estado */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-fg">Prioridad</h2>
            <p className="text-caption text-fg-muted max-w-md">
              Si un deudor califica para varios acuerdos, gana el número más alto.
            </p>
          </div>
          <div className="w-full sm:w-auto sm:max-w-[16rem]">
            <Input
              id="ag-prioridad"
              className="w-24"
              inputMode="numeric"
              aria-label="Prioridad"
              value={b.priority}
              onChange={(e) => set('priority', entero(e.target.value, 0))}
              {...aria('priority')}
            />
            <ErrorDelCampo id="ag-prioridad-error" mensaje={errores.priority} />
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-fg">Activo</h2>
            <p className="text-caption text-fg-muted max-w-md">
              Apagado queda guardado pero el agente no lo usa.
            </p>
          </div>
          <Switch
            checked={b.active}
            onCheckedChange={(v) => set('active', v)}
            aria-label="Acuerdo activo"
          />
        </div>
      </Card>

      {/* El acuerdo leído de corrido, justo antes de guardarlo. */}
      <div className="space-y-2">
        <p
          data-testid="acuerdo-general-resumen"
          className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-fg"
        >
          {resumenAcuerdoGeneral(comoSeLee)}
        </p>

        {/* Los avisos aparecen y se van mientras se edita: entran y salen
            con su animación en vez de saltar. */}
        <Stagger className="space-y-2 empty:hidden">
          {avisos.map((aviso) => (
            <StaggerItem
              as="p"
              key={aviso}
              data-testid="acuerdo-general-aviso"
              className="rounded-lg border border-warning bg-warning-soft px-4 py-3 text-sm text-warning"
            >
              {aviso}
            </StaggerItem>
          ))}
        </Stagger>

        <Presence as="p" show={Boolean(error)}
            role="alert"
            className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {error}
        </Presence>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            hideArrow
            disabled={!puedeGuardar || guardando}
            isLoading={guardando}
            onClick={() => void guardar()}
            data-testid="acuerdo-general-guardar"
            aria-describedby={fraseDeLoQueFalta ? 'acuerdo-general-falta' : undefined}
          >
            <FloppyDisk className="w-4 h-4" aria-hidden="true" />
            {guardando ? 'Guardando…' : textoGuardar}
          </Button>
          <Button variant="ghost" hideArrow onClick={salir} data-testid="acuerdo-general-cancelar">
            Cancelar
          </Button>
        </div>
        {fraseDeLoQueFalta ? (
          <p id="acuerdo-general-falta" className="text-caption text-fg-muted" data-testid="acuerdo-general-falta">
            {fraseDeLoQueFalta}
          </p>
        ) : null}
        <Presence
          show={confirmandoSalida}
          role="alertdialog"
          aria-label="Descartar lo que escribiste"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3"
        >
          <p className="text-body-sm text-fg">Tienes cambios sin guardar. Si vuelves ahora se pierden.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" hideArrow onClick={() => setConfirmandoSalida(false)}>
              Seguir editando
            </Button>
            <Button variant="ghost" size="sm" hideArrow onClick={() => router.push(VOLVER)} data-testid="acuerdo-general-descartar">
              Descartar y volver
            </Button>
          </div>
        </Presence>
      </div>
    </div>
  )
}
