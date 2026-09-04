'use client'

/**
 * /ai/pagos/generar — "Generar cobros" (visión §5).
 *
 * Punto de entrada para crear cobros y enviar links de pago, en dos modos
 * (SegmentedControl excluyente):
 *
 *  - INDIVIDUAL: un formulario para un cobro puntual (contrato/inquilino,
 *    concepto, valor, fecha límite, métodos, mensaje con preview, canales y
 *    reglas si-no-paga). Construye un payload real-feeling, pero el ENVÍO no
 *    tiene endpoint expuesto en el front (no hay hook de generate-payment-link),
 *    así que el CTA queda como placeholder honesto "Próximamente" (T-323: nunca
 *    un botón que finja funcionar).
 *
 *  - MASIVO: vista previa del resultado de una corrida (cobros generados, links
 *    enviados, requieren revisión, sin datos de contacto, valor inconsistente).
 *    El bulk no está expuesto → el preview es ILUSTRATIVO, rotulado como ejemplo,
 *    y el envío también queda "Próximamente".
 *
 * UX-only. Cero hex inline — solo tokens del DS. Las operaciones profundas
 * (facturas, aging, payment-runs, tablas de cobros) viven en /cobros,
 * /dispersiones y /tesoreria: se cross-linkean con <Link>, no se duplican.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CurrencyDollar,
  PaperPlaneTilt,
  Receipt,
  Stack as StackIcon,
  Info,
  CheckCircle,
  WarningCircle,
  AddressBook,
  Scales,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button, Card, CardContent, Input, Textarea, EmptyState, Label, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Chip, SegmentedControl } from '@leasefy/cadence'
import { PagoEstadoBadge } from '@/components/inmobiliaria/pagos/PagoEstadoBadge'

/* ---------------------------------------------------------------------------
 * Vocabulario de opciones (estado controlado en React)
 * ------------------------------------------------------------------------- */

type Modo = 'individual' | 'masivo'

type Metodo = 'pse' | 'tarjeta' | 'nequi' | 'efecty' | 'transferencia'
type Canal = 'whatsapp' | 'correo' | 'sms'
type ReglaNoPaga = 'recordarAntes' | 'recordarVencido' | 'escalarCobranza' | 'reportarPropietario'

const METODO_LABEL: Record<Metodo, string> = {
  pse: 'PSE',
  tarjeta: 'Tarjeta',
  nequi: 'Nequi',
  efecty: 'Efecty',
  transferencia: 'Transferencia',
}

const CANAL_LABEL: Record<Canal, string> = {
  whatsapp: 'WhatsApp',
  correo: 'Correo',
  sms: 'SMS',
}

const REGLA_LABEL: Record<ReglaNoPaga, string> = {
  recordarAntes: 'Recordar 2 días antes',
  recordarVencido: 'Recordar al vencer',
  escalarCobranza: 'Escalar a cobranza tras 5 días',
  reportarPropietario: 'Avisar al propietario',
}

const CONCEPTOS = ['Canon de arrendamiento', 'Administración', 'Servicios', 'Mora', 'Otro'] as const

/* ---------------------------------------------------------------------------
 * Estado del formulario individual
 * ------------------------------------------------------------------------- */

interface FormState {
  contrato: string
  inquilino: string
  concepto: string
  valor: string
  fechaLimite: string
  metodos: Metodo[]
  mensaje: string
  canales: Canal[]
  reglas: ReglaNoPaga[]
}

const INITIAL_FORM: FormState = {
  contrato: '',
  inquilino: '',
  concepto: 'Canon de arrendamiento',
  valor: '',
  fechaLimite: '',
  metodos: ['pse', 'tarjeta'],
  mensaje: '',
  canales: ['whatsapp'],
  reglas: ['recordarVencido'],
}

function formatCOP(raw: string): string {
  const n = Number(String(raw).replace(/[^\d]/g, ''))
  if (!raw || Number.isNaN(n) || n === 0) return '$ —'
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/* ---------------------------------------------------------------------------
 * Modo INDIVIDUAL
 * ------------------------------------------------------------------------- */

function ModoIndividual() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Preview del mensaje: usa el texto del usuario o un default armado con los datos.
  const mensajePreview = useMemo(() => {
    if (form.mensaje.trim()) return form.mensaje.trim()
    const inquilino = form.inquilino.trim() || 'Hola'
    const valor = formatCOP(form.valor)
    const concepto = form.concepto.toLowerCase()
    const fecha = form.fechaLimite || 'la fecha acordada'
    return `${inquilino}, tu pago de ${concepto} por ${valor} vence el ${fecha}. Puedes pagarlo en línea con el siguiente enlace.`
  }, [form.mensaje, form.inquilino, form.valor, form.concepto, form.fechaLimite])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ── Formulario ──────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Contrato e inquilino */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-fg-muted" weight="duotone" aria-hidden="true" />
              <h2 className="text-base font-semibold text-fg">Contrato e inquilino</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gc-contrato">Contrato</Label>
                <Input
                  id="gc-contrato"
                  placeholder="Ej. CTR-2026-0148"
                  value={form.contrato}
                  onChange={(e) => set('contrato', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-inquilino">Inquilino</Label>
                <Input
                  id="gc-inquilino"
                  placeholder="Nombre del inquilino"
                  value={form.inquilino}
                  onChange={(e) => set('inquilino', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Concepto, valor, fecha */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CurrencyDollar className="h-4 w-4 text-fg-muted" weight="duotone" aria-hidden="true" />
              <h2 className="text-base font-semibold text-fg">Detalle del cobro</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="gc-concepto">Concepto</Label>
                <Select value={form.concepto} onValueChange={(v) => set('concepto', v)}>
                  <SelectTrigger id="gc-concepto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCEPTOS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-valor">Valor</Label>
                <Input
                  id="gc-valor"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.valor}
                  onChange={(e) => set('valor', e.target.value.replace(/[^\d]/g, ''))}
                />
                <p className="text-xs text-fg-muted tabular-nums">{formatCOP(form.valor)}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-fecha">Fecha límite</Label>
                <Input
                  id="gc-fecha"
                  type="date"
                  value={form.fechaLimite}
                  onChange={(e) => set('fechaLimite', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métodos de pago (multi-select → Chips) */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">Métodos de pago</h2>
              <p className="text-sm text-fg-muted">Cómo podrá pagar el inquilino desde el link.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(METODO_LABEL) as Metodo[]).map((m) => (
                <Chip
                  key={m}
                  selected={form.metodos.includes(m)}
                  onClick={() => set('metodos', toggle(form.metodos, m))}
                >
                  {METODO_LABEL[m]}
                </Chip>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mensaje + preview */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">Mensaje</h2>
              <p className="text-sm text-fg-muted">
                Déjalo en blanco para usar el mensaje sugerido con los datos del cobro.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gc-mensaje">Texto del mensaje</Label>
              <Textarea
                id="gc-mensaje"
                rows={3}
                placeholder="Escribe un mensaje personalizado (opcional)…"
                value={form.mensaje}
                onChange={(e) => set('mensaje', e.target.value)}
              />
            </div>
            {/* Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Vista previa
              </span>
              <div className="rounded-lg border border-border bg-surface-muted p-4">
                <p className="text-sm text-fg leading-relaxed whitespace-pre-line">{mensajePreview}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary">
                  <CurrencyDollar className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
                  Pagar {formatCOP(form.valor)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canales */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">Canales de envío</h2>
              <p className="text-sm text-fg-muted">Por dónde se enviará el link de pago.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CANAL_LABEL) as Canal[]).map((c) => (
                <Chip
                  key={c}
                  selected={form.canales.includes(c)}
                  onClick={() => set('canales', toggle(form.canales, c))}
                >
                  {CANAL_LABEL[c]}
                </Chip>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reglas si no paga */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Scales className="h-4 w-4 text-fg-muted" weight="duotone" aria-hidden="true" />
              <h2 className="text-base font-semibold text-fg">Si no paga</h2>
            </div>
            <p className="text-sm text-fg-muted">Acciones automáticas alrededor del vencimiento.</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REGLA_LABEL) as ReglaNoPaga[]).map((r) => (
                <Chip
                  key={r}
                  selected={form.reglas.includes(r)}
                  onClick={() => set('reglas', toggle(form.reglas, r))}
                >
                  {REGLA_LABEL[r]}
                </Chip>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Resumen + CTA (sticky en desktop) ───────────────────────── */}
      <aside className="lg:sticky lg:top-6 h-fit space-y-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-fg">Resumen</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-fg-muted">Inquilino</dt>
                <dd className="text-fg text-right">{form.inquilino || '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-fg-muted">Concepto</dt>
                <dd className="text-fg text-right">{form.concepto}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-fg-muted">Valor</dt>
                <dd className="text-fg text-right font-semibold tabular-nums">{formatCOP(form.valor)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-fg-muted">Fecha límite</dt>
                <dd className="text-fg text-right">{form.fechaLimite || '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-fg-muted">Métodos</dt>
                <dd className="text-fg text-right">
                  {form.metodos.length ? form.metodos.map((m) => METODO_LABEL[m]).join(', ') : '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-fg-muted">Canales</dt>
                <dd className="text-fg text-right">
                  {form.canales.length ? form.canales.map((c) => CANAL_LABEL[c]).join(', ') : '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-fg-muted">Estado inicial</dt>
                <dd>
                  <PagoEstadoBadge estado="listo_para_enviar" />
                </dd>
              </div>
            </dl>

            {/* CTA principal — sin endpoint expuesto → placeholder honesto (T-323) */}
            <Button className="w-full" hideArrow disabled title="Próximamente">
              <PaperPlaneTilt className="h-4 w-4" weight="bold" aria-hidden="true" />
              Enviar link de pago · Próximamente
            </Button>
            <p className="text-xs text-fg-muted leading-relaxed">
              El envío de links de pago aún no está disponible desde esta vista. La generación de cobros
              está habilitada en{' '}
              <Link
                href="/panel/inmobiliaria/cobros"
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                Cobros
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Modo MASIVO — preview ilustrativo (sin endpoint de bulk)
 * ------------------------------------------------------------------------- */

interface ResultadoRow {
  key: string
  label: string
  valor: number
  icon: typeof CheckCircle
  tone: { text: string; bg: string }
  detalle: string
}

// Cifras de ejemplo claramente rotuladas — ilustran cómo se vería una corrida.
const RESULTADO_EJEMPLO: ResultadoRow[] = [
  {
    key: 'generados',
    label: 'Cobros generados',
    valor: 124,
    icon: Receipt,
    tone: { text: 'text-primary', bg: 'bg-primary-soft' },
    detalle: 'Listos para enviar este ciclo',
  },
  {
    key: 'enviados',
    label: 'Links enviados',
    valor: 118,
    icon: CheckCircle,
    tone: { text: 'text-success', bg: 'bg-success-soft' },
    detalle: 'Entregados por los canales activos',
  },
  {
    key: 'revision',
    label: 'Requieren revisión',
    valor: 4,
    icon: WarningCircle,
    tone: { text: 'text-warning', bg: 'bg-warning-soft' },
    detalle: 'Datos a confirmar antes de enviar',
  },
  {
    key: 'sinContacto',
    label: 'Sin datos de contacto',
    valor: 2,
    icon: AddressBook,
    tone: { text: 'text-warning', bg: 'bg-warning-soft' },
    detalle: 'Falta WhatsApp o correo del inquilino',
  },
  {
    key: 'inconsistente',
    label: 'Valor inconsistente',
    valor: 1,
    icon: Scales,
    tone: { text: 'text-danger', bg: 'bg-danger-soft' },
    detalle: 'El monto no coincide con el contrato',
  },
]

function ModoMasivo() {
  return (
    <div className="space-y-6">
      {/* Aviso de que el preview es ilustrativo */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4">
        <Info className="h-5 w-5 shrink-0 text-fg-muted" weight="duotone" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-fg">Vista previa ilustrativa</p>
          <p className="text-sm text-fg-muted leading-relaxed">
            La generación masiva de cobros todavía no está disponible desde esta vista. Las cifras de
            abajo son un ejemplo de cómo se vería el resultado de una corrida. Para generar cobros sobre
            la cartera real, usa{' '}
            <Link
              href="/panel/inmobiliaria/cobros"
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              Cobros
            </Link>{' '}
            o{' '}
            <Link
              href="/panel/inmobiliaria/pagos/liquidaciones"
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              Tesorería
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Tabla de resultado (ejemplo rotulado) */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
            <h2 className="text-base font-semibold text-fg">Resultado de la corrida</h2>
            <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
              Ejemplo
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[560px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Resultado</TableHead>
                  <TableHead scope="col">Detalle</TableHead>
                  <TableHead scope="col" className="text-right">Cobros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RESULTADO_EJEMPLO.map((row) => {
                  const RowIcon = row.icon
                  return (
                    <TableRow key={row.key} className="border-t border-border align-top">
                      <TableCell className="py-3 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-md ${row.tone.bg}`}
                          >
                            <RowIcon className={`h-4 w-4 ${row.tone.text}`} weight="duotone" aria-hidden="true" />
                          </span>
                          <span className="text-sm font-medium text-fg">{row.label}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3 pr-5">
                        <p className="text-sm text-fg-muted leading-snug">{row.detalle}</p>
                      </TableCell>
                      <TableCell className="py-3 px-5 text-right">
                        <span className={`text-sm font-semibold tabular-nums ${row.tone.text}`}>
                          {row.valor}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CTAs del bulk — sin endpoint → placeholders honestos (T-323) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Button hideArrow disabled title="Próximamente">
          <PaperPlaneTilt className="h-4 w-4" weight="bold" aria-hidden="true" />
          Enviar todos los cobros válidos · Próximamente
        </Button>
        <Button variant="secondary" hideArrow disabled title="Próximamente">
          Revisar excepciones · Próximamente
        </Button>
      </div>

      {/* Estado vacío honesto de la corrida real */}
      <EmptyState
        icon={StackIcon}
        title="Sin corridas masivas todavía"
        description="Cuando la generación masiva esté disponible, aquí verás el resultado de cada corrida sobre tu cartera real."
      />
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Página
 * ------------------------------------------------------------------------- */

function GenerarCobros() {
  const [modo, setModo] = useState<Modo>('individual')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-h2 text-fg">Generar cobros</h1>
        <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
          Crea un cobro y envía el link de pago a tus inquilinos, de a uno o por toda la cartera.
        </p>
      </header>

      {/* Selector de modo (excluyente) */}
      <SegmentedControl<Modo>
        aria-label="Modo de generación"
        value={modo}
        onChange={setModo}
        options={[
          { value: 'individual', label: 'Individual' },
          { value: 'masivo', label: 'Masivo' },
        ]}
      />

      {/* Contenido por modo */}
      {modo === 'individual' ? <ModoIndividual /> : <ModoMasivo />}
    </div>
  )
}

export default function GenerarCobrosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <GenerarCobros />
    </PageGuard>
  )
}
