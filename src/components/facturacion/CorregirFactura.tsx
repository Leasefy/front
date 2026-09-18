'use client'

/**
 * CORREGIR UNA FACTURA YA EMITIDA: nota crédito PARCIAL y nota DÉBITO.
 *
 * Nico y Juan Camilo (2026-09-17): «factura emitida con error: **nota crédito
 * (total o parcial) con motivo + factura nueva** corregida; la deuda del estado
 * de cuenta se ajusta sola. Las facturas emitidas NO se borran».
 *
 * ── Lo que esta pieza agrega a «Anular con nota crédito» ───────────────────
 *
 *   · **Acreditar una parte**: cuando el error fue un renglón —un parqueadero
 *     que el contrato no tiene, un concepto de más— y no toda la factura. De
 *     éstas pueden ir varias mientras la suma no pase del total.
 *   · **Cobrar de más** (nota débito): cuando faltó plata en la factura.
 *
 * 🔴 Los dos botones SÓLO aparecen cuando el back dice que se puede
 * (`correccion.puedeParcial` / `.puedeNotaDebito`). Cuando no, se muestra la
 * razón: un botón que va a fallar es peor que no tenerlo — la misma regla que
 * ya gobierna «Anular».
 *
 * 🔴 Y el tope del valor lo pone el back (`maximoParcialCop`): la nota que se
 * pasa se RECHAZA con el máximo exacto, no se recorta. Acá el campo lo dice
 * antes, para que nadie tenga que descubrirlo con un error.
 */

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import {
  NOMBRE_DEL_CONCEPTO_DEBITO,
  facturacionElectronicaService,
  pesos,
  type ConceptoDeNotaDebito,
} from '@/lib/api/facturacion-electronica.service'
import type { FacturaEmitida } from '@/lib/api/facturacion-por-mes.service'

/** El mínimo que el back exige para el motivo (`MinLength(10)`). */
export const MIN_MOTIVO = 10

export function motivoSuficienteParaCorregir(motivo: string): boolean {
  return motivo.trim().length >= MIN_MOTIVO
}

export interface CorregirFacturaProps {
  factura: FacturaEmitida
  /** Se llama después de emitir, para recargar el listado. */
  onHecho: () => void | Promise<void>
}

type Cual = 'PARCIAL' | 'DEBITO' | null

export function CorregirFactura({ factura, onHecho }: CorregirFacturaProps) {
  const [cual, setCual] = useState<Cual>(null)
  const [motivo, setMotivo] = useState('')
  const [valor, setValor] = useState('')
  const [concepto, setConcepto] = useState<ConceptoDeNotaDebito>(
    'INTERESES_DE_MORA',
  )
  const [guardando, setGuardando] = useState(false)

  // El back puede no traer `correccion` (un back anterior): sin ella no se
  // ofrece nada, que es exactamente lo de antes.
  const c = factura.correccion
  if (!c) return null

  const valorCop = Number(valor)
  const valorValido =
    Number.isInteger(valorCop) &&
    valorCop > 0 &&
    (cual !== 'PARCIAL' || valorCop <= c.maximoParcialCop)

  function cerrar() {
    setCual(null)
    setMotivo('')
    setValor('')
  }

  async function emitir() {
    if (!cual || !valorValido || !motivoSuficienteParaCorregir(motivo) || guardando) {
      return
    }
    setGuardando(true)
    try {
      if (cual === 'PARCIAL') {
        const r = await facturacionElectronicaService.emitirNotaCreditoParcial(
          factura.id,
          { concepto: 'REBAJA', motivo: motivo.trim(), valorCop },
        )
        toast.success(`Nota crédito ${r.numeroDeLaNota} emitida`)
      } else {
        const r = await facturacionElectronicaService.emitirNotaDebito(
          factura.id,
          { concepto, motivo: motivo.trim(), valorCop },
        )
        toast.success(`Nota débito ${r.numeroInterno} emitida`)
      }
      cerrar()
      await onHecho()
    } catch (e) {
      // El diálogo queda abierto con lo escrito: reintentar no obliga a
      // volver a escribirlo.
      toast.error(
        e instanceof Error ? e.message : 'No se pudo emitir el documento.',
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <span
      className="inline-flex flex-wrap gap-2"
      data-testid={`corregir-${factura.numero}`}
    >
      {c.puedeParcial && (
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => {
            setMotivo('')
            setValor('')
            setCual('PARCIAL')
          }}
          data-testid={`nota-parcial-${factura.numero}`}
        >
          Acreditar una parte
        </Button>
      )}
      {c.puedeNotaDebito && (
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => {
            setMotivo('')
            setValor('')
            setConcepto('INTERESES_DE_MORA')
            setCual('DEBITO')
          }}
          data-testid={`nota-debito-${factura.numero}`}
        >
          Cobrar de más
        </Button>
      )}
      {!c.puedeParcial && !c.puedeNotaDebito && c.explicacion && (
        <span
          className="text-caption text-fg-muted"
          data-testid={`sin-corregir-${factura.numero}`}
        >
          {c.explicacion}
        </span>
      )}
      {c.acreditadoCop > 0 && (
        <span
          className="text-caption text-fg-muted"
          data-testid={`acreditado-${factura.numero}`}
        >
          Ya acreditado {pesos(c.acreditadoCop)} · saldo {pesos(c.saldoCop)}
        </span>
      )}

      <AlertDialog
        open={cual !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !guardando) cerrar()
        }}
      >
        <AlertDialogContent data-testid="corregir-dialogo">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cual === 'PARCIAL'
                ? `Acreditar una parte de la factura ${factura.numeroDian ?? factura.numero}`
                : `Cobrar de más sobre la factura ${factura.numeroDian ?? factura.numero}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cual === 'PARCIAL'
                ? `La factura no se borra ni cambia de valor: queda con su número y una nota crédito por lo que se acredita. Puedes acreditar hasta ${pesos(c.maximoParcialCop)}.`
                : 'La nota débito es un documento aparte que suma sobre esta factura. Se usa cuando faltó plata en ella (intereses, un ajuste de precio).'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {cual === 'DEBITO' && (
              <div className="space-y-1.5">
                <Label htmlFor="corregir-concepto">Concepto</Label>
                <select
                  id="corregir-concepto"
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
                  value={concepto}
                  onChange={(e) =>
                    setConcepto(e.target.value as ConceptoDeNotaDebito)
                  }
                  data-testid="corregir-concepto"
                >
                  {(
                    Object.keys(NOMBRE_DEL_CONCEPTO_DEBITO) as ConceptoDeNotaDebito[]
                  ).map((k) => (
                    <option key={k} value={k}>
                      {NOMBRE_DEL_CONCEPTO_DEBITO[k]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="corregir-valor">Valor</Label>
              <Input
                id="corregir-valor"
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                data-testid="corregir-valor"
                aria-invalid={valor !== '' && !valorValido ? true : undefined}
              />
              {cual === 'PARCIAL' && (
                <p className="text-caption text-fg-muted">
                  Como máximo {pesos(c.maximoParcialCop)}: es lo que le queda de
                  saldo a la factura.
                </p>
              )}
              {valor !== '' && !valorValido && (
                <p
                  role="alert"
                  className="text-caption text-danger"
                  data-testid="corregir-valor-error"
                >
                  {cual === 'PARCIAL'
                    ? `Escribe un valor entre $1 y ${pesos(c.maximoParcialCop)}.`
                    : 'Escribe un valor mayor que cero.'}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="corregir-motivo">Por qué</Label>
              <Textarea
                id="corregir-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                placeholder={
                  cual === 'PARCIAL'
                    ? 'Se cobró el parqueadero y el contrato no lo tiene.'
                    : 'Intereses de mora de septiembre, pagados el 12 de octubre.'
                }
                data-testid="corregir-motivo"
              />
              <p className="text-caption text-fg-muted">
                Lo lee tu contador y la DIAN. Al menos {MIN_MOTIVO} caracteres.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault()
                void emitir()
              }}
              disabled={
                !valorValido ||
                !motivoSuficienteParaCorregir(motivo) ||
                guardando
              }
              data-testid="corregir-confirmar"
            >
              {cual === 'PARCIAL' ? 'Emitir la nota crédito' : 'Emitir la nota débito'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  )
}
