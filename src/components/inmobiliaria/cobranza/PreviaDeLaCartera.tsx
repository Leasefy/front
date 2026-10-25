'use client'
/**
 * Lo que se va a importar, ANTES de importarlo (20-10-2026).
 *
 * Nico: «ellos pueden subir como quieran y deberíamos tomarlo». El lector
 * (`lib/importar/leer-planilla.ts`) decide solo dónde está cada dato; esta
 * vista lo muestra y deja corregirlo:
 *
 *   · cada campo con la columna que se le asignó, cambiable;
 *   · de dónde sale el vencimiento: del archivo, del CONTRATO EN LEASEFY (la
 *     cuota más vieja con saldo) o, para los que no aparecen, de la fecha que
 *     escriba la persona (Nico eligió «Sacarla del contrato en Leasefy»);
 *   · cinco filas como quedaron leídas, y las que no se pueden importar con
 *     el porqué.
 *
 * No escribe nada: el botón de importar es de la tarjeta.
 */
import { useId, useState } from 'react'
import { CaretDown, CheckCircle, Info, WarningCircle } from '@phosphor-icons/react'
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import { useTr } from '@/lib/i18n/use-tr'
import { cn } from '@/lib/utils'
import {
  CAMPOS_DE_CARTERA,
  type CampoDeCartera,
  type FilaDeCartera,
} from '@/lib/cobranza/cartera-del-archivo'
import type { Mapeo } from '@/lib/importar/reconocer-columnas'
import { textoDeLaCelda } from '@/lib/importar/reconocer-columnas'
import type { PlanillaLeida } from '@/lib/importar/leer-planilla'

/** Los campos que se muestran siempre; los demás, en «Más columnas». */
const PRINCIPALES: readonly CampoDeCartera[] = [
  'documento',
  'nombre',
  'telefono',
  'deuda',
  'vencimiento',
  'contrato',
  'correo',
  'inmueble',
]

const NINGUNA = '__no_viene__'

/** `2026-10-05` → «5 oct 2026». */
function fechaCorta(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
}

export type EstadoDelCruce =
  | { tipo: 'no-hace-falta' }
  | { tipo: 'buscando' }
  | { tipo: 'listo'; encontradas: number; sinEncontrar: number }
  | { tipo: 'fallo' }

export interface PreviaDeLaCarteraProps {
  leida: PlanillaLeida<CampoDeCartera>
  mapeo: Mapeo<CampoDeCartera>
  onMapeo: (mapeo: Mapeo<CampoDeCartera>) => void
  filas: readonly FilaDeCartera[]
  cruce: EstadoDelCruce
  fecha: string
  onFecha: (fecha: string) => void
}

export function PreviaDeLaCartera({ leida, mapeo, onMapeo, filas, cruce, fecha, onFecha }: PreviaDeLaCarteraProps) {
  const tr = useTr()
  const { formatCurrency } = useI18n()
  const idFecha = useId()
  const [masColumnas, setMasColumnas] = useState(false)

  const buenas = filas.filter((f) => f.problemas.length === 0)
  const malas = filas.filter((f) => f.problemas.length > 0)

  /** Un ejemplo de la columna, para elegirla sin abrir el archivo. */
  const ejemplo = (columna: string): string => {
    const valor = leida.filas.map((f) => textoDeLaCelda(f[columna])).find((v) => v !== '')
    return valor ? (valor.length > 28 ? `${valor.slice(0, 27)}…` : valor) : ''
  }

  const elegir = (campo: CampoDeCartera, columna: string) => {
    const siguiente: Mapeo<CampoDeCartera> = { ...mapeo }
    // Una columna es de un solo campo: si ya era de otro, se le quita.
    for (const [otro, col] of Object.entries(siguiente) as Array<[CampoDeCartera, string]>) {
      if (col === columna && otro !== campo) delete siguiente[otro]
    }
    if (columna === NINGUNA) delete siguiente[campo]
    else siguiente[campo] = columna
    onMapeo(siguiente)
  }

  const visibles = CAMPOS_DE_CARTERA.filter(
    (c) => PRINCIPALES.includes(c.campo) || masColumnas || mapeo[c.campo] !== undefined,
  )

  const donde = [
    leida.hojas.length > 1 ? tr('hoja «{hoja}»', { hoja: leida.hoja }) : null,
    leida.filaDeEncabezado && leida.filaDeEncabezado > 0
      ? tr('los títulos están en la fila {n}', { n: leida.filaDeEncabezado + 1 })
      : null,
    leida.sinEncabezados ? tr('sin títulos: reconocimos las columnas por lo que tienen') : null,
  ].filter(Boolean)

  return (
    <section className="mt-4 space-y-5" data-testid="previa-de-la-cartera" aria-label={tr('Revisa antes de importar')}>
      <p className="text-sm text-fg-muted">
        {tr('Leímos')} <span className="font-medium text-fg">{leida.archivo}</span>
        {donde.length > 0 ? ` · ${donde.join(' · ')}` : ''}
        {' · '}
        {filas.length === 1 ? tr('1 fila con datos') : tr('{n} filas con datos', { n: filas.length })}
        {leida.filasDeTotales > 0 ? ` · ${tr('apartamos la fila de totales')}` : ''}
      </p>

      {/* ── Columnas ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-fg">{tr('Cómo leímos tus columnas')}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {visibles.map((c) => {
            const falta = c.requerido && !mapeo[c.campo] && !(c.campo === 'nombre' && (mapeo.nombres || mapeo.apellidos))
            return (
              <div key={c.campo} className="space-y-1" data-testid={`columna-${c.campo}`}>
                <label className="text-sm font-medium text-fg" htmlFor={`col-${c.campo}`}>
                  {tr(c.etiqueta)}
                  {c.requerido ? <span className="text-danger"> *</span> : null}
                </label>
                <Select value={mapeo[c.campo] ?? NINGUNA} onValueChange={(v) => elegir(c.campo, v)}>
                  <SelectTrigger
                    id={`col-${c.campo}`}
                    data-invalid={falta || undefined}
                    aria-invalid={falta || undefined}
                    aria-required={c.requerido || undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NINGUNA}>{tr('No viene en el archivo')}</SelectItem>
                    {leida.encabezados.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                        {ejemplo(e) ? <span className="text-fg-muted"> · {ejemplo(e)}</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {falta ? (
                  <p className="text-sm text-danger">{tr('Elige la columna: sin este dato no se puede crear el deudor.')}</p>
                ) : null}
              </div>
            )
          })}
        </div>
        {!masColumnas ? (
          <button
            type="button"
            onClick={() => setMasColumnas(true)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <CaretDown className="h-4 w-4" aria-hidden="true" />
            {tr('Más columnas (otro teléfono, período, canon, administración…)')}
          </button>
        ) : null}
      </div>

      {/* ── Vencimiento ──────────────────────────────────────────────── */}
      <Vencimiento
        mapeo={mapeo}
        cruce={cruce}
        fecha={fecha}
        onFecha={onFecha}
        idFecha={idFecha}
      />

      {/* ── Muestra ──────────────────────────────────────────────────── */}
      {buenas.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-fg">{tr('Así quedan')}</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm" data-testid="previa-filas">
              <thead className="bg-surface-muted text-left text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{tr('Fila')}</th>
                  <th className="px-3 py-2 font-medium">{tr('Documento')}</th>
                  <th className="px-3 py-2 font-medium">{tr('Nombre')}</th>
                  <th className="px-3 py-2 font-medium">{tr('Teléfono')}</th>
                  <th className="px-3 py-2 text-right font-medium">{tr('Debe')}</th>
                  <th className="px-3 py-2 font-medium">{tr('Vence')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {buenas.slice(0, 5).map((f) => (
                  <tr key={f.fila}>
                    <td className="px-3 py-2 tabular-nums text-fg-muted">{f.fila}</td>
                    <td className="px-3 py-2 tabular-nums">{f.documento}</td>
                    <td className="px-3 py-2">{f.nombre}</td>
                    <td className="px-3 py-2 tabular-nums">{f.telefono}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {f.deuda !== null ? formatCurrency(f.deuda) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {f.vencimiento ? (
                        <span className="tabular-nums">
                          {fechaCorta(f.vencimiento)}
                          {f.origenDelVencimiento === 'contrato' ? (
                            <span className="text-fg-muted"> · {tr('del contrato')}</span>
                          ) : f.origenDelVencimiento === 'escrito' ? (
                            <span className="text-fg-muted"> · {tr('la que escribiste')}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-fg-muted">{tr('Sin fecha')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {buenas.length > 5 ? (
            <p className="text-sm text-fg-muted">{tr('…y {n} más.', { n: buenas.length - 5 })}</p>
          ) : null}
        </div>
      ) : null}

      {/* ── Las que no se pueden importar ────────────────────────────── */}
      {malas.length > 0 ? (
        <details className="rounded-lg border border-border bg-surface-muted px-4 py-3" data-testid="previa-con-problemas">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-fg">
            <WarningCircle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            {malas.length === 1
              ? tr('1 fila no se puede importar')
              : tr('{n} filas no se pueden importar', { n: malas.length })}
          </summary>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {malas.slice(0, 100).map((f) => (
              <li key={f.fila} className="text-sm text-fg-muted">
                {tr('Fila {n}', { n: f.fila })}: {f.problemas.map((p) => tr(p)).join(' · ')}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

function Vencimiento({
  mapeo,
  cruce,
  fecha,
  onFecha,
  idFecha,
}: {
  mapeo: Mapeo<CampoDeCartera>
  cruce: EstadoDelCruce
  fecha: string
  onFecha: (f: string) => void
  idFecha: string
}) {
  const tr = useTr()
  if (mapeo.vencimiento) {
    return (
      <p className="flex items-start gap-2 text-sm text-fg-muted">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="fill" aria-hidden="true" />
        {tr('El vencimiento sale de tu archivo, columna «{c}».', { c: mapeo.vencimiento })}
      </p>
    )
  }
  const preguntar = cruce.tipo === 'fallo' || (cruce.tipo === 'listo' && cruce.sinEncontrar > 0)
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface px-4 py-3" data-testid="previa-vencimiento">
      <p className="flex items-start gap-2 text-sm text-fg">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
        <span>
          {tr('Tu archivo no trae la fecha de vencimiento.')}{' '}
          {cruce.tipo === 'buscando'
            ? tr('La estamos buscando en tus contratos de Leasefy…')
            : cruce.tipo === 'fallo'
              ? tr('No pudimos leer tus contratos de Leasefy en este momento.')
              : cruce.tipo === 'listo'
                ? cruce.encontradas > 0
                  ? tr('La tomamos de tus contratos en Leasefy (la cuota vencida más vieja con saldo): la encontramos para {n} de {t}.', {
                      n: cruce.encontradas,
                      t: cruce.encontradas + cruce.sinEncontrar,
                    })
                  : tr('En tus contratos de Leasefy estos inquilinos no tienen cuotas vencidas (o no aparecen).')
                : null}
        </span>
      </p>
      {preguntar ? (
        <div className={cn('space-y-1')}>
          <label htmlFor={idFecha} className="text-sm font-medium text-fg">
            {cruce.tipo === 'listo'
              ? cruce.sinEncontrar === 1
                ? tr('Para el que no aparece, ¿desde qué fecha debe?')
                : tr('Para los {n} que no aparecen, ¿desde qué fecha deben?', { n: cruce.sinEncontrar })
              : tr('¿Desde qué fecha deben?')}
          </label>
          <CampoDeDia id={idFecha} value={fecha} onChange={onFecha} quitable className="max-w-xs" testid="previa-fecha" />
          <p className="text-sm text-fg-muted">
            {tr('Si la dejas vacía, entran como deudores pero no pasan a cobranza: sin vencimiento no hay días de mora.')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
