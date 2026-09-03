'use client'

/**
 * /ai/pagos/reglas — punto 12: Reglas configurables del agente de Pagos.
 *
 * Cada regla de negocio de la inmobiliaria (cuándo generar cobros, cuándo
 * recordar, cuándo escalar a cobranza, cómo liquidar a propietarios, qué se
 * aprueba solo y qué pide mano humana) es una card-row con un Switch + un
 * control de parametrización opcional (día, días, monto o selector excluyente).
 *
 * UX-only sobre el backend existente: NO hay endpoint de persistencia de reglas,
 * así que la UI es completa y honesta — los controles muestran y editan estado
 * local (preview), pero "Guardar cambios" es un placeholder deshabilitado
 * "Próximamente" (T-323: nunca un botón que finja funcionar).
 *
 * Las operaciones profundas (correr cobros, dispersiones) viven en sus pantallas
 * dedicadas; acá se gobierna el COMPORTAMIENTO del agente, y se cross-linkea.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Info } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button } from '@/components/ui'
import { Eyebrow } from '@leasefy/cadence'
import { ReglaCard } from '@/components/inmobiliaria/pagos/ReglaCard'

function PagosReglas() {
  // ── Estado local (preview). Sin endpoint → no persiste; ver "Próximamente". ──

  // Generación de cobros
  const [generarCobros, setGenerarCobros] = useState(true)
  const [diaGeneracion, setDiaGeneracion] = useState(25)
  const [aplicarExcedentes, setAplicarExcedentes] = useState(true)
  const [permitirParciales, setPermitirParciales] = useState(true)

  // Recordatorios
  const [recordatorioPrevio, setRecordatorioPrevio] = useState(true)
  const [diasRecordatorio, setDiasRecordatorio] = useState(3)
  const [reenviarNoPagado, setReenviarNoPagado] = useState(true)

  // Cobranza
  const [activarCobranza, setActivarCobranza] = useState(true)
  const [diasCobranza, setDiasCobranza] = useState(2)

  // Liquidación a propietarios
  const [liquidarPostConciliacion, setLiquidarPostConciliacion] = useState(true)
  const [retenerSiDisputa, setRetenerSiDisputa] = useState(true)

  // Aprobaciones
  const [aprobarAutoPagos, setAprobarAutoPagos] = useState(true)
  const [montoAprobacionAuto, setMontoAprobacionAuto] = useState(500000)
  const [aprobacionDevoluciones, setAprobacionDevoluciones] = useState(true)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Reglas</h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            Define cómo se comporta el agente de pagos para tu inmobiliaria: cuándo genera cobros, cuándo
            recuerda, cuándo escala a cobranza, cómo liquida a propietarios y qué puede aprobar solo.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* T-323: sin endpoint de persistencia → placeholder honesto. */}
          <Button hideArrow disabled title="Próximamente">
            Guardar cambios
          </Button>
        </div>
      </header>

      {/* Aviso de preview — honesto: los cambios no se guardan aún. */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4">
        <Info className="w-5 h-5 shrink-0 text-fg-muted mt-0.5" weight="duotone" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-fg">Vista previa de configuración</p>
          <p className="text-sm text-fg-muted leading-snug">
            Podés ajustar las reglas para ver cómo quedarían. La persistencia de reglas estará disponible
            próximamente; por ahora los cambios no se guardan.
          </p>
        </div>
      </div>

      {/* Generación de cobros */}
      <section className="space-y-3">
        <Eyebrow>Generación de cobros</Eyebrow>
        <div className="space-y-3">
          <ReglaCard
            titulo="Generar cobros automáticamente"
            descripcion="El agente crea los cobros del mes para todos los contratos activos el día configurado."
            activa={generarCobros}
            onToggle={setGenerarCobros}
            control={{
              tipo: 'numero',
              ariaLabel: 'Día del mes para generar cobros',
              prefijo: 'El día',
              sufijo: 'de cada mes',
              value: diaGeneracion,
              min: 1,
              max: 28,
              onChange: setDiaGeneracion,
              inputClassName: 'w-20',
            }}
          />

          <ReglaCard
            titulo="Permitir pagos parciales"
            descripcion="Acepta abonos parciales solo cuando el contrato lo permite; el saldo restante queda pendiente."
            activa={permitirParciales}
            onToggle={setPermitirParciales}
          />

          <ReglaCard
            titulo="Aplicar excedentes al próximo mes"
            descripcion="Si el inquilino paga de más, el excedente se abona automáticamente al cobro del mes siguiente."
            activa={aplicarExcedentes}
            onToggle={setAplicarExcedentes}
          />
        </div>
      </section>

      {/* Recordatorios */}
      <section className="space-y-3">
        <Eyebrow>Recordatorios</Eyebrow>
        <div className="space-y-3">
          <ReglaCard
            titulo="Recordar antes del vencimiento"
            descripcion="Envía un recordatorio amable al inquilino unos días antes de la fecha de pago."
            activa={recordatorioPrevio}
            onToggle={setRecordatorioPrevio}
            control={{
              tipo: 'numero',
              ariaLabel: 'Días antes del vencimiento para recordar',
              value: diasRecordatorio,
              min: 1,
              max: 15,
              sufijo: 'días antes del vencimiento',
              onChange: setDiasRecordatorio,
              inputClassName: 'w-20',
            }}
          />

          <ReglaCard
            titulo="Reenviar si fue abierto y no pagado"
            descripcion="Si el inquilino vio el cobro pero no pagó, el agente reenvía el recordatorio."
            activa={reenviarNoPagado}
            onToggle={setReenviarNoPagado}
          />
        </div>
      </section>

      {/* Cobranza */}
      <section className="space-y-3">
        <Eyebrow>Cobranza</Eyebrow>
        <div className="space-y-3">
          <ReglaCard
            titulo="Activar cobranza tras el vencimiento"
            descripcion="Pasados unos días sin pago, el caso escala al agente de cobranza para gestión de mora."
            activa={activarCobranza}
            onToggle={setActivarCobranza}
            control={{
              tipo: 'numero',
              ariaLabel: 'Días después del vencimiento para activar cobranza',
              value: diasCobranza,
              min: 1,
              max: 30,
              sufijo: 'días después del vencimiento',
              onChange: setDiasCobranza,
              inputClassName: 'w-20',
            }}
          />
        </div>
        <p className="text-xs text-fg-muted">
          La gestión activa de mora se trabaja en el{' '}
          <Link
            href="/panel/inmobiliaria/cobros/cobranza"
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            agente de cobranza
          </Link>
          .
        </p>
      </section>

      {/* Liquidación a propietarios */}
      <section className="space-y-3">
        <Eyebrow>Liquidación a propietarios</Eyebrow>
        <div className="space-y-3">
          <ReglaCard
            titulo="Liquidar solo después de conciliar"
            descripcion="Solo dispersa el dinero al propietario cuando el pago del inquilino quedó conciliado en el banco."
            activa={liquidarPostConciliacion}
            onToggle={setLiquidarPostConciliacion}
          />

          <ReglaCard
            titulo="Retener si hay una disputa"
            descripcion="Mantiene la liquidación en pausa mientras exista una disputa abierta sobre el contrato o el pago."
            activa={retenerSiDisputa}
            onToggle={setRetenerSiDisputa}
          />
        </div>
        <p className="text-xs text-fg-muted">
          Las dispersiones y la conciliación bancaria se operan en{' '}
          <Link
            href="/panel/inmobiliaria/pagos/dispersiones"
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            Dispersiones
          </Link>{' '}
          y{' '}
          <Link
            href="/panel/inmobiliaria/pagos/liquidaciones"
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            Tesorería
          </Link>
          .
        </p>
      </section>

      {/* Aprobaciones */}
      <section className="space-y-3">
        <Eyebrow>Aprobaciones</Eyebrow>
        <div className="space-y-3">
          <ReglaCard
            titulo="Aprobar pagos pequeños automáticamente"
            descripcion="Los pagos por debajo del monto definido se aprueban sin intervención humana; el resto pasa a la cola."
            activa={aprobarAutoPagos}
            onToggle={setAprobarAutoPagos}
            control={{
              tipo: 'numero',
              ariaLabel: 'Monto máximo para aprobación automática',
              prefijo: 'Hasta $',
              sufijo: 'COP',
              value: montoAprobacionAuto,
              min: 0,
              onChange: setMontoAprobacionAuto,
              inputClassName: 'w-36',
            }}
          />

          <ReglaCard
            titulo="Pedir aprobación humana para devoluciones"
            descripcion="Toda devolución a un inquilino o propietario requiere la aprobación explícita de un humano."
            activa={aprobacionDevoluciones}
            onToggle={setAprobacionDevoluciones}
          />
        </div>
        <p className="text-xs text-fg-muted">
          Los pagos que requieren tu aprobación los revisás en la{' '}
          <Link
            href="/panel/inmobiliaria/pagos/cola"
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            cola de pagos
          </Link>
          .
        </p>
      </section>
    </div>
  )
}

export default function PagosReglasPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosReglas />
    </PageGuard>
  )
}
