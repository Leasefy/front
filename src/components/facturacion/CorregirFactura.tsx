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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import { MoneyInput } from '@/components/ui/money-input'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  MENSAJES_DE_LA_FACTURACION,
  VALOR_MAXIMO_DE_LA_NOTA_COP,
} from '@/lib/facturacion/limites-de-la-facturacion'
import {
  NOMBRE_DEL_CONCEPTO_DEBITO,
  facturacionElectronicaService,
  type ConceptoDeNotaDebito,
} from '@/lib/api/facturacion-electronica.service'
import {
  NOMBRE_DEL_CONCEPTO,
  type ConceptoDeNotaCredito,
  type FacturaEmitida,
} from '@/lib/api/facturacion-por-mes.service'

/**
 * Los conceptos DIAN de una nota crédito PARCIAL (FA-25, 03-10): los de la
 * total menos «Anulación», que acredita la factura entera.
 */
const CONCEPTOS_DE_LA_PARCIAL: readonly ConceptoDeNotaCredito[] = [
  'REBAJA',
  'DEVOLUCION',
  'AJUSTE_DE_PRECIO',
  'OTROS',
]

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

/** Los campos del diálogo que pueden traer un error del back. */
type CampoDeLaNota = 'valor' | 'motivo' | 'concepto'

/**
 * Lo que está mal con el valor, o `null` si se puede mandar (02-10-2026).
 * La parcial tiene el techo del saldo de la factura; la débito, el del DTO
 * del back (`int4`, $2.000.000.000), con su MISMA frase.
 */
export function errorDelValorDeLaNota(
  valor: string,
  cual: Exclude<Cual, null>,
  maximoParcialCop: number,
): string | null {
  if (valor === '') return null
  const n = Number(valor)
  if (cual === 'PARCIAL') {
    return Number.isInteger(n) && n > 0 && n <= maximoParcialCop
      ? null
      : `Escribe un valor entre ${formatCurrency(1)} y ${formatCurrency(maximoParcialCop)}.`
  }
  if (!Number.isInteger(n) || n <= 0) return 'Escribe un valor mayor que cero.'
  if (n > VALOR_MAXIMO_DE_LA_NOTA_COP) return MENSAJES_DE_LA_FACTURACION.valorDeLaNotaMaximo
  return null
}

export function CorregirFactura({ factura, onHecho }: CorregirFacturaProps) {
  const [cual, setCual] = useState<Cual>(null)
  const [motivo, setMotivo] = useState('')
  const [valor, setValor] = useState('')
  const [concepto, setConcepto] = useState<ConceptoDeNotaDebito>(
    'INTERESES_DE_MORA',
  )
  /** El concepto DIAN de la parcial (FA-25: antes iba fijo «Rebaja»). */
  const [conceptoParcial, setConceptoParcial] = useState<ConceptoDeNotaCredito>('REBAJA')
  const [guardando, setGuardando] = useState(false)
  /** Lo que el back dijo de cada campo (02-10-2026): va debajo del campo. */
  const [delServidor, setDelServidor] = useState<Partial<Record<CampoDeLaNota, string>>>({})

  // El back puede no traer `correccion` (un back anterior): sin ella no se
  // ofrece nada, que es exactamente lo de antes.
  const c = factura.correccion
  if (!c) return null

  const valorCop = Number(valor)
  const errorLocalDelValor = cual ? errorDelValorDeLaNota(valor, cual, c.maximoParcialCop) : null
  const valorValido = valor !== '' && errorLocalDelValor === null
  const errorDelValor = errorLocalDelValor ?? delServidor.valor ?? null

  function olvidar(campo: CampoDeLaNota) {
    setDelServidor((previo) => {
      if (!(campo in previo)) return previo
      const resto = { ...previo }
      delete resto[campo]
      return resto
    })
  }

  function cerrar() {
    setCual(null)
    setMotivo('')
    setValor('')
    setDelServidor({})
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
          { concepto: conceptoParcial, motivo: motivo.trim(), valorCop },
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
      // volver a escribirlo. Lo que el back dijo de un campo va debajo de él;
      // lo demás, al toast con la regla de oro (02-10-2026).
      const reparto = repartirErroresDelServidor<CampoDeLaNota>(e, {
        mapa: { valorCop: 'valor' },
        campos: ['valor', 'motivo', 'concepto'],
        porDefecto: 'No se pudo emitir el documento.',
        accion: cual === 'PARCIAL' ? 'emitir la nota crédito' : 'emitir la nota débito',
      })
      setDelServidor(reparto.porCampo)
      const primero = reparto.orden[0]
      if (primero) document.getElementById(`corregir-${primero}`)?.focus()
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '))
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
            setConceptoParcial('REBAJA')
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
          Ya acreditado{' '}
          <span className="font-mono tabular-nums">{formatCurrency(c.acreditadoCop)}</span> · saldo{' '}
          <span className="font-mono tabular-nums">{formatCurrency(c.saldoCop)}</span>
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
                ? `La factura no se borra ni cambia de valor: queda con su número y una nota crédito por lo que se acredita, y la deuda de su cuota baja en ese valor. Puedes acreditar hasta ${formatCurrency(c.maximoParcialCop)}.`
                : 'La nota débito es un documento aparte que suma sobre esta factura y sobre la deuda de su cuota. Se usa cuando faltó plata en ella (intereses, un ajuste de precio). Su IVA lo calcula Leasefy con el escenario tributario del contrato.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {cual === 'PARCIAL' && (
              <div className="space-y-1.5">
                <Label htmlFor="corregir-concepto-parcial">Concepto (lo pide la DIAN)</Label>
                <Select
                  value={conceptoParcial}
                  onValueChange={(v) => {
                    setConceptoParcial(v as ConceptoDeNotaCredito)
                    olvidar('concepto')
                  }}
                >
                  <SelectTrigger
                    id="corregir-concepto-parcial"
                    className="w-full"
                    aria-invalid={delServidor.concepto ? true : undefined}
                    aria-describedby={delServidor.concepto ? 'corregir-concepto-error' : undefined}
                    data-testid="corregir-concepto-parcial"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCEPTOS_DE_LA_PARCIAL.map((k) => (
                      <SelectItem key={k} value={k}>
                        {NOMBRE_DEL_CONCEPTO[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorDelCampo id="corregir-concepto-error" mensaje={delServidor.concepto} />
              </div>
            )}
            {cual === 'DEBITO' && (
              <div className="space-y-1.5">
                <Label htmlFor="corregir-concepto">Concepto</Label>
                {/* FA-R30: el `Select` del DS, no el del navegador. */}
                <Select
                  value={concepto}
                  onValueChange={(v) => {
                    setConcepto(v as ConceptoDeNotaDebito)
                    olvidar('concepto')
                  }}
                >
                  <SelectTrigger
                    id="corregir-concepto"
                    className="w-full"
                    aria-invalid={delServidor.concepto ? true : undefined}
                    aria-describedby={delServidor.concepto ? 'corregir-concepto-error' : undefined}
                    data-testid="corregir-concepto"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(NOMBRE_DEL_CONCEPTO_DEBITO) as ConceptoDeNotaDebito[]
                    ).map((k) => (
                      <SelectItem key={k} value={k}>
                        {NOMBRE_DEL_CONCEPTO_DEBITO[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorDelCampo id="corregir-concepto-error" mensaje={delServidor.concepto} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="corregir-valor">Valor</Label>
              {/* FA-25 (QA-FACT, 03-10): el campo de plata de la casa, que agrupa
                  los miles mientras se escribe; no `type="number"`. */}
              <MoneyInput
                id="corregir-valor"
                value={valor}
                onChange={(crudo) => {
                  setValor(crudo)
                  olvidar('valor')
                }}
                data-testid="corregir-valor"
                aria-invalid={errorDelValor ? true : undefined}
                aria-describedby={errorDelValor ? 'corregir-valor-error' : undefined}
              />
              {cual === 'PARCIAL' && (
                <p className="text-caption text-fg-muted">
                  Como máximo{' '}
                  <span className="font-mono tabular-nums">{formatCurrency(c.maximoParcialCop)}</span>: es lo que le queda de
                  saldo a la factura.
                </p>
              )}
              <ErrorDelCampo id="corregir-valor-error" mensaje={errorDelValor} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="corregir-motivo">Por qué</Label>
              <Textarea
                id="corregir-motivo"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  olvidar('motivo')
                }}
                maxLength={500}
                aria-invalid={delServidor.motivo ? true : undefined}
                aria-describedby={delServidor.motivo ? 'corregir-motivo-error' : undefined}
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
              <ErrorDelCampo id="corregir-motivo-error" mensaje={delServidor.motivo} />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault()
                void emitir()
              }}
              disabled={!valorValido || !motivoSuficienteParaCorregir(motivo)}
              loading={guardando}
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
