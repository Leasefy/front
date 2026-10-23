'use client'

/**
 * COBRI-13 (Nico 18-10, todas la recomendada): los links de pago de Cobri que
 * no se pagaron, con las ACCIONES MASIVAS de verdad (antes «Próximamente»).
 * Se marcan las cuotas y se pide la acción; cada fila dice qué pasó con ella.
 *
 *   · Reenviar links — el MISMO link vivo, por WhatsApp.
 *   · Generar links nuevos — link nuevo para el vencido (un rechazado que sigue
 *     vivo se reenvía: dos links vivos = pago doble).
 *   · Marcar / quitar seguimiento — pausa a Cobri y a Reti para esa cuota.
 *   · Enviar a cobranza — respeta el plazo (Mori la toma al cumplirse).
 *   · Enviar instrucciones de transferencia — por CORREO, sólo si la Ley 2300
 *     lo deja (Nico 18-10, «Correo si la ley lo deja»: un solo canal por
 *     semana; si esta semana ya se le escribió por WhatsApp no sale y la fila
 *     dice desde cuándo).
 *
 * Lo que le escribe al inquilino sale por Cobri en el horario de ley y con la
 * Ley 2300 (un contacto al día): por eso se confirma antes y la fila lo dice.
 */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowsClockwise, Bank, ClipboardText, Headset, LinkSimple, XCircle } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Button, Card } from '@/components/ui'
import { confirmar } from '@/components/ui/confirmar'
import { EstadoDelLink } from '@/components/inmobiliaria/pagos/payu/EstadoDelLink'
import { formatCurrency, formatDate } from '@/lib/format'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { useTr } from '@/lib/i18n/use-tr'
import { pagosFallidosApi, type AccionDeLosFallidos, type ResultadoDeUnaCuota } from '@/lib/api/pagos-fallidos.service'
import type { LinksQueNoSePagaron } from '@/lib/hooks/use-links-de-cobri-que-no-se-pagaron'

interface Boton {
  accion: AccionDeLosFallidos
  label: string
  icon: Icon
  /** Lo que se le dice antes de hacerlo (le escribe al inquilino o lo pasa a cobranza). Sin esto, se hace directo. */
  confirmacion?: string
  /** El botón de la confirmación, cuando `label` no cabe al lado de «Cancelar» (el cuadro mide 420 px). */
  confirmarCon?: string
}

const POR_WHATSAPP =
  'Cobri le escribe por WhatsApp a cada inquilino en el horario de ley. Si hoy ya se le escribió a alguno, la Ley 2300 no deja salir el suyo y su fila lo dice.'

const BOTONES: Boton[] = [
  { accion: 'reenviar', label: 'Reenviar los enlaces', icon: LinkSimple, confirmacion: POR_WHATSAPP },
  { accion: 'generar', label: 'Generar enlaces nuevos', icon: ArrowsClockwise, confirmacion: POR_WHATSAPP },
  { accion: 'seguimiento', label: 'Marcar en seguimiento', icon: ClipboardText },
  { accion: 'quitar_seguimiento', label: 'Quitar seguimiento', icon: XCircle },
  {
    accion: 'cobranza',
    label: 'Enviar a cobranza',
    icon: Headset,
    confirmacion: 'Si ya pasó el plazo, Mori la toma ya; si no, la toma el día en que se cumple.',
  },
  {
    accion: 'transferencia',
    label: 'Enviar instrucciones de transferencia',
    icon: Bank,
    confirmarCon: 'Enviar por correo',
    confirmacion:
      'Cobri le manda por correo la cuenta de la inmobiliaria, el valor y la referencia. La Ley 2300 deja un solo canal por semana: si esta semana ya se le escribió por WhatsApp, no sale y su fila dice desde cuándo. Si sale, esta semana Cobri ya no le escribe por WhatsApp.',
  },
]

export function LinksFallidosDeCobri({
  lectura,
  esperanEnLaBandeja,
}: {
  lectura: LinksQueNoSePagaron
  /** cuotaId → el caso de la Bandeja que espera aprobar su siguiente aviso. */
  esperanEnLaBandeja: ReadonlyMap<string, string>
}) {
  const tr = useTr()
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set())
  const [enVuelo, setEnVuelo] = useState<AccionDeLosFallidos | null>(null)
  const [resultados, setResultados] = useState<Map<string, ResultadoDeUnaCuota>>(() => new Map())

  const ids = useMemo(() => lectura.items.map((l) => l.cuotaId), [lectura.items])
  const todas = ids.length > 0 && ids.every((id) => marcadas.has(id))

  if (lectura.cargando && lectura.items.length === 0) return null
  if (lectura.error) {
    return (
      <Card className="p-5 flex flex-wrap items-center justify-between gap-3" data-testid="cobri-fallidos-error">
        <p className="text-sm text-fg-muted">
          {mensajeParaLaPersona(lectura.error, {
            porDefecto: tr('No pudimos leer los enlaces de pago de Cobri.'),
            accion: tr('leer los enlaces de pago de Cobri'),
          })}
        </p>
        <Button variant="outline" size="sm" hideArrow onClick={() => void lectura.recargar()}>
          {tr('Intentar de nuevo')}
        </Button>
      </Card>
    )
  }
  if (lectura.items.length === 0) return null

  const marcar = (id: string) =>
    setMarcadas((m) => {
      const n = new Set(m)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  async function pedir(b: Boton) {
    const cuotas = [...marcadas]
    if (cuotas.length === 0) return
    if (b.confirmacion) {
      const ok = await confirmar({
        titulo: tr('¿{accion} para {n}?', { accion: tr(b.label), n: cuotas.length === 1 ? tr('1 cuota') : tr('{n} cuotas', { n: cuotas.length }) }),
        descripcion: tr(b.confirmacion),
        accion: tr(b.confirmarCon ?? b.label),
      })
      if (!ok) return
    }
    setEnVuelo(b.accion)
    try {
      const r = await pagosFallidosApi.aplicar(b.accion, cuotas)
      setResultados((prev) => {
        const n = new Map(prev)
        for (const x of r) n.set(x.cuotaId, x)
        return n
      })
      const no = r.filter((x) => x.resultado === 'no').length
      if (no === 0) toast.success(tr('Listo: {n} de {t}.', { n: r.length, t: cuotas.length }))
      else toast.message(tr('{ok} listas y {no} sin hacer: cada fila dice por qué.', { ok: r.length - no, no }))
      setMarcadas(new Set())
      await lectura.recargar()
    } catch (err) {
      toast.error(mensajeParaLaPersona(err, { porDefecto: tr('No se pudo hacer.'), accion: tr(b.label) }))
    } finally {
      setEnVuelo(null)
    }
  }

  return (
    <Card className="p-0 overflow-hidden" data-testid="cobri-fallidos">
      <div className="space-y-3 border-b border-border px-5 py-4">
        <div className="space-y-1">
          <h2 className="text-body font-medium text-fg">{tr('Enlaces de pago de Cobri que no se pagaron')}</h2>
          <p className="text-sm text-fg-muted max-w-2xl">
            {tr('Marca las cuotas y elige qué hacer. Lo que le escribe al inquilino sale por Cobri en el horario de ley y con la Ley 2300 (un contacto al día y un solo canal por semana).')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-testid="acciones-masivas">
          <label className="mr-2 inline-flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              checked={todas}
              onChange={() => setMarcadas(todas ? new Set() : new Set(ids))}
              data-testid="marcar-todas"
            />
            {marcadas.size > 0 ? tr('{n} marcadas', { n: marcadas.size }) : tr('Marcar todas')}
          </label>
          {BOTONES.map((b) => (
            <Button
              key={b.accion}
              size="sm"
              variant="outline"
              hideArrow
              disabled={marcadas.size === 0 || enVuelo !== null}
              onClick={() => void pedir(b)}
              data-testid={`accion-${b.accion}`}
            >
              <b.icon className="h-4 w-4" aria-hidden="true" />
              {tr(b.label)}
            </Button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border-faint">
        {lectura.items.map((l) => {
          const r = resultados.get(l.cuotaId)
          return (
            <li key={l.cuotaId} className="space-y-2 px-5 py-4" data-testid={`cobri-fallido-${l.cuotaId}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                    checked={marcadas.has(l.cuotaId)}
                    onChange={() => marcar(l.cuotaId)}
                    data-testid={`marcar-${l.cuotaId}`}
                    aria-label={tr('Marcar la cuota de {quien}', { quien: l.inquilino })}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-fg">{l.inquilino}</span>
                    <span className="block text-caption text-fg-muted">
                      {tr('Contrato')} {l.contratoNumero} · {l.inmueble} · {tr('vence')}{' '}
                      <span className="font-mono tabular-nums">{formatDate(l.fechaDeVencimiento, 'es')}</span>
                    </span>
                    {(l.seguimiento || l.aCobranzaDesde) && (
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {l.seguimiento && (
                          <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning" data-testid={`seguimiento-${l.cuotaId}`}>
                            {tr('En seguimiento')} · {l.seguimiento.por}
                          </span>
                        )}
                        {l.aCobranzaDesde && (
                          <span className="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                            {tr('Va a cobranza')}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </label>
                <p className="whitespace-nowrap font-mono tabular-nums text-fg">{formatCurrency(l.montoCop, 'es')}</p>
              </div>
              <EstadoDelLink link={l} esperaEnLaBandeja={esperanEnLaBandeja.get(l.cuotaId)} />
              {r && (
                <p
                  className={r.resultado === 'no' ? 'text-caption text-danger' : 'text-caption text-success'}
                  data-testid={`resultado-${l.cuotaId}`}
                >
                  {r.mensaje}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
