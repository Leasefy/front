'use client'

/**
 * PilotoTopes — hasta dónde el Piloto actúa solo en Automático (24-09-2026).
 *
 * P-3 (Nico): «Automático: tope por inmobiliaria (por defecto $5.000.000 por
 * acción y 10 destinatarios); por encima, un clic». P-10: «1 minuto de gracia
 * con Deshacer visible y claro, cumpliendo el horario de ley». Los tres vivían
 * como dato en el micro (`preferencias_del_piloto`) sin pantalla: la píldora
 * decía «dentro de tus topes» y nadie podía ver cuáles eran.
 *
 * Reglas que manda esta pantalla:
 *   · los RANGOS los pone el micro (`GET /piloto/preferencias`): se valida con
 *     los mismos números que el PUT, no con otros escritos acá;
 *   · el horario es la ley: se muestra, no se edita;
 *   · sólo un administrador los cambia (la matriz del ERP). Para el resto los
 *     campos quedan apagados CON el porqué; sin la migración de la tabla,
 *     también, con el porqué — nunca un botón que falla al apretarlo;
 *   · dice quién los cambió y cuándo (la bitácora del micro guarda qué cambió).
 *
 * Presentacional: la lectura y el guardado llegan por props
 * (`usePilotoPreferencias`), así se prueba sin abrir el cajón.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Clock, FloppyDisk } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { leerFallo } from '@/lib/errores/traductor-de-errores'
import { formatCurrency } from '@/lib/format'
import type { CambiosDePreferencias, PilotoPreferenciasResponse, RangoDePreferencia } from '@/lib/api/piloto'

type Campo = 'topeMontoCop' | 'topeDestinatarios' | 'graciaSegundos'
const CAMPOS: Campo[] = ['topeMontoCop', 'topeDestinatarios', 'graciaSegundos']

export interface PilotoTopesProps {
  data: PilotoPreferenciasResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  guardando: boolean
  /** `fallo` es el error entero (un 400 trae `campos` por tope); `error`, el código viejo, no se muestra. */
  onGuardar: (cambios: CambiosDePreferencias) => Promise<{ ok: boolean; error?: string; fallo?: unknown }>
  onReintentar: () => Promise<void> | void
}

/** El texto del campo → número entero, o `null` si no es un entero. */
function entero(texto: string): number | null {
  const limpio = texto.trim()
  if (!/^\d+$/.test(limpio)) return null
  return Number(limpio)
}

function dentro(n: number | null, r: RangoDePreferencia): boolean {
  return n !== null && n >= r.min && n <= r.max
}

export function PilotoTopes({ data, isLoading, error, notAvailable, guardando, onGuardar, onReintentar }: PilotoTopesProps) {
  const { t } = useI18n()
  const [valores, setValores] = useState<Record<Campo, string>>({ topeMontoCop: '', topeDestinatarios: '', graciaSegundos: '' })
  const [fallo, setFallo] = useState<string | null>(null)
  /** Lo que el micro dijo de cada tope (un 400 con `campos`): va debajo de SU campo. */
  const [delServidor, setDelServidor] = useState<Partial<Record<Campo, string>>>({})
  const cambiar = (c: Campo, texto: string) => {
    setValores((v) => ({ ...v, [c]: texto }))
    setDelServidor((e) => (e[c] ? { ...e, [c]: undefined } : e))
  }

  // Lo guardado manda cada vez que llega (al abrir, y tras guardar).
  useEffect(() => {
    if (!data) return
    setValores({
      topeMontoCop: String(data.preferencias.topeMontoCop),
      topeDestinatarios: String(data.preferencias.topeDestinatarios),
      graciaSegundos: String(data.preferencias.graciaSegundos),
    })
  }, [data])

  const numeros = useMemo(
    () => Object.fromEntries(CAMPOS.map((c) => [c, entero(valores[c])])) as Record<Campo, number | null>,
    [valores],
  )
  const invalidos = useMemo(
    () => (data ? CAMPOS.filter((c) => !dentro(numeros[c], data.rangos[c])) : []),
    [data, numeros],
  )
  const cambios: CambiosDePreferencias = useMemo(() => {
    if (!data) return {}
    const out: CambiosDePreferencias = {}
    for (const c of CAMPOS) {
      const n = numeros[c]
      if (n !== null && n !== data.preferencias[c]) out[c] = n
    }
    return out
  }, [data, numeros])

  if (isLoading && !data) {
    return (
      <div className="space-y-2" data-testid="piloto-topes-cargando">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    )
  }
  if (error && !data) {
    return <FalloDeCarga error={error} queEs="los topes del Piloto" onReintentar={onReintentar} enmarcado={false} />
  }
  if (notAvailable || !data) {
    return (
      <p className="text-caption text-fg-muted" data-testid="piloto-topes-sin-fuente">
        {t('inmobiliaria.piloto.topes.sinFuente')}
      </p>
    )
  }

  const editable = data.puedeEditar && data.guardable !== false
  const hayCambios = Object.keys(cambios).length > 0
  const puedeGuardar = editable && hayCambios && invalidos.length === 0 && !guardando

  const guardar = async () => {
    setFallo(null)
    setDelServidor({})
    const r = await onGuardar(cambios)
    if (r.ok) {
      toast.success(t('inmobiliaria.piloto.topes.guardado'))
      return
    }
    // Con la regla de oro: lo que el micro dijo de un tope va a SU campo (y el
    // foco ahí); el resto, dicho para la persona, al pie y al toast. Antes:
    // «No se guardaron: 403» o el `error` del micro tal cual.
    const reparto = repartirErroresDelServidor<Campo>(r.fallo, {
      campos: CAMPOS,
      // El 403 del micro trae su frase en `error` (que no se muestra) y el
      // código `SOLO_ADMINISTRADOR`: se decide por el código.
      porDefecto:
        leerFallo(r.fallo).code === 'SOLO_ADMINISTRADOR'
          ? 'Sólo un administrador puede cambiar los topes del Piloto.'
          : 'No se guardaron los topes.',
      accion: 'guardar los topes',
    })
    setDelServidor(reparto.porCampo)
    const primero = reparto.orden[0]
    if (primero) document.getElementById(`piloto-topes-${primero}`)?.focus()
    if (reparto.sueltos.length > 0) {
      const texto = reparto.sueltos.join(' · ')
      setFallo(texto)
      toast.error(texto)
    }
  }

  const rango = (c: Campo) => {
    const r = data.rangos[c]
    const f = (n: number) => (c === 'topeMontoCop' ? formatCurrency(n) : n.toLocaleString('es-CO'))
    return t('inmobiliaria.piloto.topes.fueraDeRango', { min: f(r.min), max: f(r.max) })
  }

  /** El error de un tope: el rango (se ataja antes de enviar) o lo que dijo el micro. */
  const errorDe = (c: Campo): string | undefined => (invalidos.includes(c) ? rango(c) : delServidor[c])
  /** Lo que el input le dice al lector de pantalla cuando su tope tiene un error. */
  const aria = (c: Campo) =>
    errorDe(c)
      ? { 'aria-invalid': true as const, 'aria-describedby': `piloto-topes-${c}-error` }
      : { 'aria-invalid': false as const }

  const campo = (c: Campo, control: ReactNode) => (
    <div className="space-y-1.5" data-testid={`piloto-topes-campo-${c}`}>
      <label htmlFor={`piloto-topes-${c}`} className="text-body-sm font-medium text-fg">
        {t(`inmobiliaria.piloto.topes.${c}.label`)}
      </label>
      {control}
      {/* La ayuda y el error se cruzan (sin saltar el alto): ver ErrorDelCampo. */}
      <ErrorDelCampo
        id={`piloto-topes-${c}-error`}
        mensaje={errorDe(c)}
        pista={t(`inmobiliaria.piloto.topes.${c}.ayuda`)}
        className="mt-0 text-caption"
      />
    </div>
  )

  return (
    <div className="space-y-4" data-testid="piloto-topes">
      <p className="text-body-sm text-fg-muted">{t('inmobiliaria.piloto.topes.descripcion')}</p>

      {!editable && data.porQueNo && (
        <p className="rounded-md bg-surface-muted px-3 py-2 text-caption text-fg" data-testid="piloto-topes-por-que-no">
          {data.porQueNo}
        </p>
      )}

      {campo(
        'topeMontoCop',
        <MoneyInput
          id="piloto-topes-topeMontoCop"
          value={valores.topeMontoCop}
          onChange={(crudo) => cambiar('topeMontoCop', crudo)}
          disabled={!editable}
          {...aria('topeMontoCop')}
          className="font-mono tabular-nums"
        />,
      )}
      {campo(
        'topeDestinatarios',
        <Input
          id="piloto-topes-topeDestinatarios"
          inputMode="numeric"
          value={valores.topeDestinatarios}
          onChange={(e) => cambiar('topeDestinatarios', e.target.value.replace(/\D/g, ''))}
          disabled={!editable}
          {...aria('topeDestinatarios')}
          className="font-mono tabular-nums"
        />,
      )}
      {campo(
        'graciaSegundos',
        <Input
          id="piloto-topes-graciaSegundos"
          inputMode="numeric"
          value={valores.graciaSegundos}
          onChange={(e) => cambiar('graciaSegundos', e.target.value.replace(/\D/g, ''))}
          disabled={!editable}
          {...aria('graciaSegundos')}
          className="font-mono tabular-nums"
        />,
      )}

      <div className="space-y-1.5 rounded-lg border border-border px-3 py-2.5" data-testid="piloto-topes-horario">
        <p className="flex items-center gap-1.5 text-body-sm font-medium text-fg">
          <Clock weight="duotone" className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          {t('inmobiliaria.piloto.topes.horario.titulo')}
        </p>
        <ul className="space-y-1">
          {data.ventanas.map((v) => (
            <li key={v.tipo} className="text-caption text-fg-muted">
              <span className="font-medium text-fg">{t(`inmobiliaria.piloto.topes.ventana.${v.tipo}`)}:</span> {v.nombre}
            </li>
          ))}
        </ul>
        <p className="text-caption text-fg-subtle">{t('inmobiliaria.piloto.topes.horario.ayuda')}</p>
      </div>

      <p className="text-caption text-fg-subtle" data-testid="piloto-topes-rastro">
        {data.preferencias.porDefecto || !data.cambiadoEn
          ? t('inmobiliaria.piloto.topes.porDefecto')
          : t('inmobiliaria.piloto.topes.cambiadoPor', {
              quien: data.cambiadoPor ?? '—',
              fecha: new Date(data.cambiadoEn).toLocaleString('es-CO', {
                timeZone: 'America/Bogota',
                day: 'numeric',
                month: 'long',
                hour: 'numeric',
                minute: '2-digit',
              }),
            })}
      </p>

      {fallo && (
        <p className="text-caption text-danger" role="alert" data-testid="piloto-topes-fallo">
          {fallo}
        </p>
      )}

      {data.puedeEditar && (
        <Button
          size="sm"
          hideArrow
          disabled={!puedeGuardar}
          isLoading={guardando}
          onClick={() => void guardar()}
          data-testid="piloto-topes-guardar"
        >
          <FloppyDisk weight="duotone" className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('inmobiliaria.piloto.topes.guardar')}
        </Button>
      )}
    </div>
  )
}
