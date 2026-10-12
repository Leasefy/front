'use client'

/**
 * «Registrar gestión» (COBRANZA-MANUAL, 04-10-2026).
 *
 * Nico: «"Registrar gestión" (llamada, WhatsApp, visita, correo, nota) con
 * promesa opcional (fecha y monto, aviso si se incumple) en cada fila de
 * Cartera y en el estado de cuenta». Quién y cuándo los pone el servidor.
 *
 * 🔴 Registrar NO manda nada a nadie: sólo anota. Se dice en el diálogo.
 */
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Chip } from '@leasefy/cadence'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { CampoDePlata } from '@/components/ui/campo-de-plata'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { cobranzaManualApi } from '@/lib/api/cobranza-manual.service'
import {
  NOMBRE_DEL_RESULTADO,
  NOMBRE_DEL_TIPO,
  RESULTADOS_DE_GESTION,
  TIPOS_DE_GESTION,
  type EntradaDelHistorial,
  type QuienEs,
  type ResultadoDeGestion,
  type TipoDeGestion,
} from '@/lib/api/cobranza-manual.types'
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia'

type Campo = 'resultado' | 'comentario' | 'fecha' | 'monto'

/** Lo que el formulario deja mandar, en palabras de la persona. */
export function validarLaGestion(f: {
  tipo: TipoDeGestion
  resultado: ResultadoDeGestion | ''
  comentario: string
  conPromesa: boolean
  fecha: string
  monto: number | undefined
  hoy: string
}): Partial<Record<Campo, string>> {
  const errores: Partial<Record<Campo, string>> = {}
  if (f.tipo === 'NOTA' && !f.comentario.trim()) errores.comentario = 'Escribe la nota.'
  if (f.tipo !== 'NOTA' && !f.resultado) {
    errores.resultado = `Di qué pasó con la ${NOMBRE_DEL_TIPO[f.tipo].toLowerCase()}.`
  }
  if (f.conPromesa) {
    if (!f.fecha) errores.fecha = 'Elige el día en que prometió pagar.'
    else if (f.fecha < f.hoy) errores.fecha = 'La fecha de la promesa no puede ser anterior a hoy.'
    if (!f.monto || f.monto <= 0) errores.monto = 'Escribe cuánto prometió pagar.'
  }
  return errores
}

export interface RegistrarGestionProps {
  abierto: boolean
  onCerrar: () => void
  quien: QuienEs
  /** El nombre de la persona, para el título. */
  nombre?: string | null
  onRegistrada?: (gestion: EntradaDelHistorial) => void
}

export function RegistrarGestion({ abierto, onCerrar, quien, nombre, onRegistrada }: RegistrarGestionProps) {
  const hoy = hoyEnColombia()
  const [tipo, setTipo] = useState<TipoDeGestion>('LLAMADA')
  const [resultado, setResultado] = useState<ResultadoDeGestion | ''>('')
  const [comentario, setComentario] = useState('')
  const [conPromesa, setConPromesa] = useState(false)
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState<number | undefined>(undefined)
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Cada vez que se abre, empieza en limpio.
  useEffect(() => {
    if (!abierto) return
    setTipo('LLAMADA')
    setResultado('')
    setComentario('')
    setConPromesa(false)
    setFecha('')
    setMonto(undefined)
    setErrores({})
    setGeneral(null)
  }, [abierto])

  // «Prometió pagar» abre la promesa: es el caso de todos los días.
  useEffect(() => {
    if (resultado === 'PROMETIO_PAGAR') setConPromesa(true)
  }, [resultado])

  async function registrar() {
    const locales = validarLaGestion({ tipo, resultado, comentario, conPromesa, fecha, monto, hoy })
    setErrores(locales)
    setGeneral(null)
    if (Object.keys(locales).length > 0) return
    setEnviando(true)
    try {
      const { gestion } = await cobranzaManualApi.registrar(quien, {
        tipo,
        ...(tipo !== 'NOTA' && resultado ? { resultado } : {}),
        comentario,
        ...(conPromesa && fecha && monto ? { promesa: { fecha, montoCop: monto } } : {}),
      })
      onRegistrada?.(gestion)
      onCerrar()
    } catch (err) {
      const r = repartirErroresDelServidor<Campo>(err, {
        campos: ['resultado', 'comentario', 'fecha', 'monto'],
        mapa: { 'promesa.fecha': 'fecha', fecha: 'fecha', 'promesa.montoCop': 'monto', montoCop: 'monto' },
        porDefecto: 'No pudimos registrar la gestión. Prueba de nuevo en un momento.',
      })
      setErrores(r.porCampo)
      setGeneral(r.sueltos[0] ?? null)
    } finally {
      setEnviando(false)
    }
  }

  const etiquetaDelComentario = tipo === 'NOTA' ? 'La nota' : 'Comentario (opcional)'

  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o && !enviando) onCerrar() }}>
      <DialogContent size="md" data-testid="registrar-gestion">
        <DialogHeader>
          <DialogTitle>Registrar gestión</DialogTitle>
          <DialogDescription>
            {nombre ? `${nombre} · ` : ''}Esto sólo anota en el historial: no se le envía nada al inquilino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-fg">¿Cómo fue?</legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Cómo fue la gestión">
              {TIPOS_DE_GESTION.map((t) => (
                <Chip
                  key={t}
                  size="sm"
                  selected={tipo === t}
                  aria-pressed={tipo === t}
                  onClick={() => {
                    setTipo(t)
                    setErrores({})
                  }}
                  data-testid={`gestion-tipo-${t}`}
                >
                  {NOMBRE_DEL_TIPO[t]}
                </Chip>
              ))}
            </div>
          </fieldset>

          <Presence show={tipo !== 'NOTA'} initial={false} distance="xs">
            <div className="space-y-1.5">
              <label htmlFor="gestion-resultado" className="text-sm font-medium text-fg">
                ¿Qué pasó?
              </label>
              <Select value={resultado} onValueChange={(v) => setResultado(v as ResultadoDeGestion)}>
                <SelectTrigger id="gestion-resultado" aria-label="Qué pasó" data-testid="gestion-resultado">
                  <SelectValue placeholder="Elige el resultado" />
                </SelectTrigger>
                <SelectContent>
                  {RESULTADOS_DE_GESTION.map((r) => (
                    <SelectItem key={r} value={r}>
                      {NOMBRE_DEL_RESULTADO[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errores.resultado ? (
                <p className="text-sm text-danger" role="alert">{errores.resultado}</p>
              ) : null}
            </div>
          </Presence>

          <div className="space-y-1.5">
            <label htmlFor="gestion-comentario" className="text-sm font-medium text-fg">
              {etiquetaDelComentario}
            </label>
            <Textarea
              id="gestion-comentario"
              value={comentario}
              maxLength={2000}
              rows={3}
              placeholder={tipo === 'NOTA' ? 'Qué pasó, qué se acordó…' : 'Lo que dijo, lo que quedó pendiente…'}
              onChange={(e) => setComentario(e.target.value)}
              data-testid="gestion-comentario"
            />
            {errores.comentario ? (
              <p className="text-sm text-danger" role="alert">{errores.comentario}</p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <label className="flex items-start gap-2 text-sm text-fg">
              <Checkbox
                checked={conPromesa}
                onCheckedChange={(v) => setConPromesa(v === true)}
                data-testid="gestion-con-promesa"
              />
              <span>
                <span className="font-medium">Registrar una promesa de pago</span>
                <span className="block text-caption text-fg-muted">
                  Si llega la fecha y no entró el pago, queda «Incumplida» y te avisamos aquí en el panel. Si el
                  pago entra, queda «Cumplida» sola.
                </span>
              </span>
            </label>
            <Presence show={conPromesa} initial={false} distance="xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="gestion-promesa-fecha" className="text-sm font-medium text-fg">
                    ¿Qué día?
                  </label>
                  <CampoDeDia
                    id="gestion-promesa-fecha"
                    value={fecha}
                    onChange={(v) => setFecha(v)}
                    min={hoy}
                    testid="gestion-promesa-fecha"
                  />
                  {errores.fecha ? (
                    <p className="text-sm text-danger" role="alert">{errores.fecha}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="gestion-promesa-monto" className="text-sm font-medium text-fg">
                    ¿Cuánto?
                  </label>
                  <CampoDePlata
                    id="gestion-promesa-monto"
                    areas="cobros_recibos_y_cartera"
                    value={monto}
                    onChange={(v) => setMonto(Number.isFinite(v) ? v : undefined)}
                    aria-label="Monto prometido"
                    data-testid="gestion-promesa-monto"
                  />
                  {errores.monto ? (
                    <p className="text-sm text-danger" role="alert">{errores.monto}</p>
                  ) : null}
                </div>
              </div>
            </Presence>
          </div>

          {general ? (
            <p className="text-sm text-danger" role="alert" data-testid="gestion-error">
              {general}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void registrar()} isLoading={enviando} hideArrow data-testid="gestion-registrar">
            Registrar gestión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

void React
