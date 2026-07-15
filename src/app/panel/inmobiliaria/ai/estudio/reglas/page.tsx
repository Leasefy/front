'use client'

/**
 * /ai/estudio/reglas — "Reglas del estudio" (visión §18: configuración por
 * inmobiliaria).
 *
 * Cada inmobiliaria define cómo el agente evalúa a los candidatos: relación
 * ingreso/canon, cuándo exigir codeudor, documentos por ocupación, qué casos
 * escalan a revisión humana, cuándo enviar a asegurabilidad, qué información
 * se comparte con el propietario, el tono de los mensajes al candidato, el
 * tiempo de los recordatorios y los canales permitidos.
 *
 * UX-only: todo el estado es controlado en React. "Guardar" muestra una
 * confirmación inline ("Próximamente…") en vez de llamar a un endpoint
 * inventado.
 */

import { useState } from 'react'
import {
  Bell,
  CheckCircle,
  ChatCircleText,
  ChatsCircle,
  Scales,
  ShieldCheck,
  UserFocus,
  Users,
  WarningCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Chip, SegmentedControl, Switch } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.ai.estudio'

/* ---------------------------------------------------------------------------
 * Tipos de estado controlado
 * ------------------------------------------------------------------------- */

type Tono = 'cercano' | 'neutral' | 'formal'
type CuandoCodeudor = 'siempre' | 'porRelacion' | 'porOcupacion' | 'nunca'
type EnvioAsegurabilidad = 'aprobados' | 'todos' | 'manual'

type Canal = 'whatsapp' | 'correo' | 'sms' | 'llamada'
type Ocupacion = 'empleado' | 'independiente' | 'pensionado' | 'empresa' | 'estudiante'
type DocItem = 'cedula' | 'laboral' | 'extractos' | 'declaracionRenta' | 'rut' | 'camaraComercio' | 'referencias'
type RevisionCaso = 'sinIngresos' | 'alertaListas' | 'relacionBaja' | 'docInconsistente' | 'extranjero'

interface ReglasState {
  // Relación mínima ingreso/canon
  relacionMinima: number
  // Codeudor
  cuandoCodeudor: CuandoCodeudor
  relacionParaCodeudor: number
  // Documentos requeridos por ocupación
  ocupacionActiva: Ocupacion
  docsPorOcupacion: Record<Ocupacion, DocItem[]>
  // Casos que requieren revisión humana
  revisionHumana: RevisionCaso[]
  // Asegurabilidad
  envioAsegurabilidad: EnvioAsegurabilidad
  // Info a compartir con propietarios
  compartirDecision: boolean
  compartirResumen: boolean
  compartirScore: boolean
  compartirDocumentos: boolean
  // Tono de mensajes
  tono: Tono
  // Recordatorios
  recordatorioHoras: number
  maxRecordatorios: number
  // Canales permitidos
  canales: Canal[]
}

const INITIAL_STATE: ReglasState = {
  relacionMinima: 3,
  cuandoCodeudor: 'porRelacion',
  relacionParaCodeudor: 2.5,
  ocupacionActiva: 'empleado',
  docsPorOcupacion: {
    empleado: ['cedula', 'laboral', 'extractos'],
    independiente: ['cedula', 'extractos', 'declaracionRenta', 'rut'],
    pensionado: ['cedula', 'extractos'],
    empresa: ['rut', 'camaraComercio', 'extractos'],
    estudiante: ['cedula', 'referencias'],
  },
  revisionHumana: ['alertaListas', 'docInconsistente'],
  envioAsegurabilidad: 'aprobados',
  compartirDecision: true,
  compartirResumen: true,
  compartirScore: false,
  compartirDocumentos: false,
  tono: 'cercano',
  recordatorioHoras: 24,
  maxRecordatorios: 3,
  canales: ['whatsapp', 'correo'],
}

/* ---------------------------------------------------------------------------
 * Estilos compartidos (idioms de la casa)
 * ------------------------------------------------------------------------- */

const LABEL_CLASSES = 'block text-sm font-medium text-fg mb-1.5'

/* ---------------------------------------------------------------------------
 * Subcomponentes UX (locales — no se exportan)
 * ------------------------------------------------------------------------- */

/** Cabecera de sección con ícono en chip neutro + título + descripción. */
function SectionHeader({ icon: SectionIcon, title, desc }: { icon: Icon; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
        <SectionIcon className="w-5 h-5 text-fg" weight="duotone" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        <p className="text-sm text-fg-muted">{desc}</p>
      </div>
    </div>
  )
}

/** Toggle accesible (role="switch") — el track pill es el patrón canónico de un
 * switch (excepción a §3, igual que un checkbox), tokenizado al DS. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
    />
  )
}

/** Fila switch: texto a la izquierda, toggle a la derecha, en caja suave. */
function SwitchRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string
  hint: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted/40 p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-xs text-fg-muted">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Página
 * ------------------------------------------------------------------------- */

function EstudioReglas() {
  const { t } = useI18n()
  const [reglas, setReglas] = useState<ReglasState>(INITIAL_STATE)
  const [saved, setSaved] = useState(false)

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  const set = <K extends keyof ReglasState>(key: K, value: ReglasState[K]) => {
    setReglas((prev) => ({ ...prev, [key]: value }))
    if (saved) setSaved(false)
  }

  /** Alterna un valor dentro de un array (chips multi-select). */
  const toggleInArray = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
  }

  /* ---- catálogos de opciones (con fallback es) ---- */

  const cuandoCodeudorOptions: { value: CuandoCodeudor; labelKey: string; fallback: string }[] = [
    { value: 'siempre', labelKey: `${NS}.reglas.codeudor.siempre`, fallback: 'Siempre lo exige' },
    { value: 'porRelacion', labelKey: `${NS}.reglas.codeudor.porRelacion`, fallback: 'Cuando la relación ingreso/canon es baja' },
    { value: 'porOcupacion', labelKey: `${NS}.reglas.codeudor.porOcupacion`, fallback: 'Según la ocupación del candidato' },
    { value: 'nunca', labelKey: `${NS}.reglas.codeudor.nunca`, fallback: 'Nunca lo exige automáticamente' },
  ]

  const ocupacionTabs: { value: Ocupacion; labelKey: string; fallback: string }[] = [
    { value: 'empleado', labelKey: `${NS}.reglas.ocupacion.empleado`, fallback: 'Empleado' },
    { value: 'independiente', labelKey: `${NS}.reglas.ocupacion.independiente`, fallback: 'Independiente' },
    { value: 'pensionado', labelKey: `${NS}.reglas.ocupacion.pensionado`, fallback: 'Pensionado' },
    { value: 'empresa', labelKey: `${NS}.reglas.ocupacion.empresa`, fallback: 'Empresa' },
    { value: 'estudiante', labelKey: `${NS}.reglas.ocupacion.estudiante`, fallback: 'Estudiante' },
  ]

  const docOptions: { value: DocItem; labelKey: string; fallback: string }[] = [
    { value: 'cedula', labelKey: `${NS}.reglas.doc.cedula`, fallback: 'Cédula' },
    { value: 'laboral', labelKey: `${NS}.reglas.doc.laboral`, fallback: 'Certificación laboral' },
    { value: 'extractos', labelKey: `${NS}.reglas.doc.extractos`, fallback: 'Extractos bancarios' },
    { value: 'declaracionRenta', labelKey: `${NS}.reglas.doc.declaracionRenta`, fallback: 'Declaración de renta' },
    { value: 'rut', labelKey: `${NS}.reglas.doc.rut`, fallback: 'RUT' },
    { value: 'camaraComercio', labelKey: `${NS}.reglas.doc.camaraComercio`, fallback: 'Cámara de comercio' },
    { value: 'referencias', labelKey: `${NS}.reglas.doc.referencias`, fallback: 'Referencias' },
  ]

  const revisionOptions: { value: RevisionCaso; labelKey: string; fallback: string }[] = [
    { value: 'sinIngresos', labelKey: `${NS}.reglas.revision.sinIngresos`, fallback: 'No se pueden verificar ingresos' },
    { value: 'alertaListas', labelKey: `${NS}.reglas.revision.alertaListas`, fallback: 'Alerta en listas restrictivas' },
    { value: 'relacionBaja', labelKey: `${NS}.reglas.revision.relacionBaja`, fallback: 'Relación ingreso/canon por debajo del mínimo' },
    { value: 'docInconsistente', labelKey: `${NS}.reglas.revision.docInconsistente`, fallback: 'Documentos inconsistentes' },
    { value: 'extranjero', labelKey: `${NS}.reglas.revision.extranjero`, fallback: 'Candidato extranjero' },
  ]

  const asegurabilidadOptions: { value: EnvioAsegurabilidad; labelKey: string; fallback: string }[] = [
    { value: 'aprobados', labelKey: `${NS}.reglas.asegurabilidad.aprobados`, fallback: 'Solo candidatos aprobados' },
    { value: 'todos', labelKey: `${NS}.reglas.asegurabilidad.todos`, fallback: 'Todos los candidatos' },
    { value: 'manual', labelKey: `${NS}.reglas.asegurabilidad.manual`, fallback: 'Solo cuando lo decida el asesor' },
  ]

  const tonoOptions: { value: Tono; labelKey: string; fallback: string }[] = [
    { value: 'cercano', labelKey: `${NS}.reglas.tono.cercano`, fallback: 'Cercano' },
    { value: 'neutral', labelKey: `${NS}.reglas.tono.neutral`, fallback: 'Neutral' },
    { value: 'formal', labelKey: `${NS}.reglas.tono.formal`, fallback: 'Formal' },
  ]

  const canalOptions: { value: Canal; labelKey: string; fallback: string }[] = [
    { value: 'whatsapp', labelKey: `${NS}.reglas.canal.whatsapp`, fallback: 'WhatsApp' },
    { value: 'correo', labelKey: `${NS}.reglas.canal.correo`, fallback: 'Correo' },
    { value: 'sms', labelKey: `${NS}.reglas.canal.sms`, fallback: 'SMS' },
    { value: 'llamada', labelKey: `${NS}.reglas.canal.llamada`, fallback: 'Llamada' },
  ]

  const docsActuales = reglas.docsPorOcupacion[reglas.ocupacionActiva]

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {tf(`${NS}.reglas.title`, 'Reglas del estudio')}
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {tf(
            `${NS}.reglas.subtitle`,
            'Define cómo el agente evalúa a los candidatos de tu inmobiliaria: criterios, documentos, escalamientos y cómo se comunica con cada persona.',
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* 1 — Relación mínima ingreso/canon */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={Scales}
            title={tf(`${NS}.reglas.relacion.title`, 'Relación mínima ingreso/canon')}
            desc={tf(
              `${NS}.reglas.relacion.desc`,
              'Cuántas veces el ingreso del candidato debe superar el canon para considerarse suficiente.',
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="relacionMinima" className={LABEL_CLASSES}>
                {tf(`${NS}.reglas.relacion.minima`, 'Veces el canon (mínimo)')}
              </label>
              <Input
                id="relacionMinima"
                type="number"
                inputMode="decimal"
                min="1"
                max="10"
                step="0.5"
                value={reglas.relacionMinima}
                onChange={(e) => set('relacionMinima', Number.parseFloat(e.target.value) || 0)}              />
              <p className="mt-1 text-xs text-fg-muted">
                {tf(`${NS}.reglas.relacion.hint`, 'Ejemplo: 3 = el ingreso debe ser al menos 3 veces el canon.')}
              </p>
            </div>
          </div>
        </section>

        {/* 2 — Cuándo pedir codeudor */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={Users}
            title={tf(`${NS}.reglas.codeudor.title`, 'Cuándo pedir codeudor')}
            desc={tf(
              `${NS}.reglas.codeudor.desc`,
              'Decide en qué situaciones el agente solicita un codeudor para respaldar el arriendo.',
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cuandoCodeudor" className={LABEL_CLASSES}>
                {tf(`${NS}.reglas.codeudor.regla`, 'Regla')}
              </label>
              <Select
                value={reglas.cuandoCodeudor}
                onValueChange={(v) => set('cuandoCodeudor', v as CuandoCodeudor)}
              >
                <SelectTrigger id="cuandoCodeudor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cuandoCodeudorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {tf(opt.labelKey, opt.fallback)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reglas.cuandoCodeudor === 'porRelacion' && (
              <div>
                <label htmlFor="relacionParaCodeudor" className={LABEL_CLASSES}>
                  {tf(`${NS}.reglas.codeudor.umbral`, 'Exigir codeudor si la relación es menor a')}
                </label>
                <Input
                  id="relacionParaCodeudor"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="10"
                  step="0.5"
                  value={reglas.relacionParaCodeudor}
                  onChange={(e) => set('relacionParaCodeudor', Number.parseFloat(e.target.value) || 0)}                />
              </div>
            )}
          </div>
        </section>

        {/* 3 — Documentos requeridos por ocupación */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={ShieldCheck}
            title={tf(`${NS}.reglas.docs.title`, 'Documentos requeridos por ocupación')}
            desc={tf(
              `${NS}.reglas.docs.desc`,
              'Elige una ocupación y marca qué documentos debe presentar ese tipo de candidato.',
            )}
          />
          {/* Ocupación — selector excluyente (SegmentedControl, contrato §3) */}
          <SegmentedControl
            aria-label={tf(`${NS}.reglas.docs.ocupacionTablist`, 'Ocupación')}
            value={reglas.ocupacionActiva}
            onChange={(v) => set('ocupacionActiva', v as Ocupacion)}
            options={ocupacionTabs.map((tab) => ({
              value: tab.value,
              label: tf(tab.labelKey, tab.fallback),
            }))}
            className="flex-wrap"
          />
          {/* Documentos — multi-select (Chip rounded-md, contrato §3) */}
          <div className="flex flex-wrap gap-2">
            {docOptions.map((doc) => (
              <Chip
                key={doc.value}
                selected={docsActuales.includes(doc.value)}
                onClick={() =>
                  set('docsPorOcupacion', {
                    ...reglas.docsPorOcupacion,
                    [reglas.ocupacionActiva]: toggleInArray(docsActuales, doc.value),
                  })
                }
              >
                {tf(doc.labelKey, doc.fallback)}
              </Chip>
            ))}
          </div>
        </section>

        {/* 4 — Casos que requieren revisión humana */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={UserFocus}
            title={tf(`${NS}.reglas.revision.title`, 'Casos que requieren revisión humana')}
            desc={tf(
              `${NS}.reglas.revision.desc`,
              'Cuando ocurra alguno de estos casos, el agente no decide solo: lo pasa a un asesor.',
            )}
          />
          <div className="flex flex-wrap gap-2">
            {revisionOptions.map((c) => (
              <Chip
                key={c.value}
                selected={reglas.revisionHumana.includes(c.value)}
                onClick={() => set('revisionHumana', toggleInArray(reglas.revisionHumana, c.value))}
              >
                {tf(c.labelKey, c.fallback)}
              </Chip>
            ))}
          </div>
        </section>

        {/* 5 — Cuándo enviar a asegurabilidad */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={ShieldCheck}
            title={tf(`${NS}.reglas.asegurabilidad.title`, 'Cuándo enviar a asegurabilidad')}
            desc={tf(
              `${NS}.reglas.asegurabilidad.desc`,
              'Define en qué momento el agente envía el candidato a estudio de asegurabilidad.',
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="envioAsegurabilidad" className={LABEL_CLASSES}>
                {tf(`${NS}.reglas.asegurabilidad.regla`, 'Regla de envío')}
              </label>
              <Select
                value={reglas.envioAsegurabilidad}
                onValueChange={(v) => set('envioAsegurabilidad', v as EnvioAsegurabilidad)}
              >
                <SelectTrigger id="envioAsegurabilidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {asegurabilidadOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {tf(opt.labelKey, opt.fallback)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* 6 — Info a compartir con propietarios */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={Users}
            title={tf(`${NS}.reglas.propietario.title`, 'Información a compartir con propietarios')}
            desc={tf(
              `${NS}.reglas.propietario.desc`,
              'Controla qué ve el propietario cuando el agente le reporta un candidato.',
            )}
          />
          <div className="space-y-2.5">
            <SwitchRow
              title={tf(`${NS}.reglas.propietario.decision`, 'Decisión final')}
              hint={tf(`${NS}.reglas.propietario.decisionHint`, 'Aprobado, con condiciones o rechazado.')}
              checked={reglas.compartirDecision}
              onChange={() => set('compartirDecision', !reglas.compartirDecision)}
            />
            <SwitchRow
              title={tf(`${NS}.reglas.propietario.resumen`, 'Resumen del candidato')}
              hint={tf(`${NS}.reglas.propietario.resumenHint`, 'Perfil resumido: ocupación, ingresos y antecedentes.')}
              checked={reglas.compartirResumen}
              onChange={() => set('compartirResumen', !reglas.compartirResumen)}
            />
            <SwitchRow
              title={tf(`${NS}.reglas.propietario.score`, 'Puntaje de riesgo')}
              hint={tf(`${NS}.reglas.propietario.scoreHint`, 'El score numérico que calcula el agente.')}
              checked={reglas.compartirScore}
              onChange={() => set('compartirScore', !reglas.compartirScore)}
            />
            <SwitchRow
              title={tf(`${NS}.reglas.propietario.documentos`, 'Documentos del candidato')}
              hint={tf(`${NS}.reglas.propietario.documentosHint`, 'Acceso a los soportes cargados por el candidato.')}
              checked={reglas.compartirDocumentos}
              onChange={() => set('compartirDocumentos', !reglas.compartirDocumentos)}
            />
          </div>
        </section>

        {/* 7 — Tono de mensajes al candidato */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={ChatCircleText}
            title={tf(`${NS}.reglas.tono.title`, 'Tono de los mensajes al candidato')}
            desc={tf(
              `${NS}.reglas.tono.desc`,
              'Cómo se comunica el agente con el candidato durante el proceso.',
            )}
          />
          <SegmentedControl
            aria-label={tf(`${NS}.reglas.tono.title`, 'Tono de los mensajes al candidato')}
            value={reglas.tono}
            onChange={(v) => set('tono', v as Tono)}
            options={tonoOptions.map((opt) => ({
              value: opt.value,
              label: tf(opt.labelKey, opt.fallback),
            }))}
          />
        </section>

        {/* 8 — Tiempo de recordatorios */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={Bell}
            title={tf(`${NS}.reglas.recordatorios.title`, 'Tiempo de recordatorios')}
            desc={tf(
              `${NS}.reglas.recordatorios.desc`,
              'Cada cuánto y cuántas veces el agente le recuerda al candidato que complete su información.',
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="recordatorioHoras" className={LABEL_CLASSES}>
                {tf(`${NS}.reglas.recordatorios.cadaHoras`, 'Recordar cada (horas)')}
              </label>
              <Input
                id="recordatorioHoras"
                type="number"
                inputMode="numeric"
                min="1"
                max="168"
                step="1"
                value={reglas.recordatorioHoras}
                onChange={(e) => set('recordatorioHoras', Number.parseInt(e.target.value, 10) || 0)}              />
            </div>
            <div>
              <label htmlFor="maxRecordatorios" className={LABEL_CLASSES}>
                {tf(`${NS}.reglas.recordatorios.maximo`, 'Máximo de recordatorios')}
              </label>
              <Input
                id="maxRecordatorios"
                type="number"
                inputMode="numeric"
                min="0"
                max="10"
                step="1"
                value={reglas.maxRecordatorios}
                onChange={(e) => set('maxRecordatorios', Number.parseInt(e.target.value, 10) || 0)}              />
            </div>
          </div>
        </section>

        {/* 9 — Canales permitidos */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            icon={ChatsCircle}
            title={tf(`${NS}.reglas.canales.title`, 'Canales permitidos')}
            desc={tf(
              `${NS}.reglas.canales.desc`,
              'Por dónde puede contactar el agente al candidato.',
            )}
          />
          <div className="flex flex-wrap gap-2">
            {canalOptions.map((canal) => (
              <Chip
                key={canal.value}
                selected={reglas.canales.includes(canal.value)}
                onClick={() => set('canales', toggleInArray(reglas.canales, canal.value))}
              >
                {tf(canal.labelKey, canal.fallback)}
              </Chip>
            ))}
          </div>
        </section>

        {/* Confirmación inline (UX-only, sin backend) */}
        {saved && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4"
          >
            <CheckCircle className="w-5 h-5 text-success-700 shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
            <p className="text-sm text-success-700">
              {tf(
                `${NS}.reglas.confirmacion`,
                'Próximamente: estas reglas se guardarán y el agente las aplicará a los nuevos estudios.',
              )}
            </p>
          </div>
        )}

        {/* Aviso UX-only */}
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4">
          <WarningCircle className="w-5 h-5 text-warning-700 shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
          <p className="text-sm text-warning-700">
            {tf(
              `${NS}.reglas.aviso`,
              'Vista previa de configuración. Aún no se conecta con el agente: los cambios no se aplican.',
            )}
          </p>
        </div>

        {/* CTA primaria */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="submit" hideArrow>
            {tf(`${NS}.reglas.guardar`, 'Guardar reglas')}
          </Button>
        </div>
      </form>
    </main>
  )
}

export default function EstudioReglasPage() {
  return (
    <PageGuard module="estudio">
      <EstudioReglas />
    </PageGuard>
  )
}
