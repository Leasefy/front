'use client'

/**
 * El escenario tributario del contrato: cómo se LLAMA la situación que forman
 * las dos partes, y qué impuestos genera.
 *
 * Nico (2026-09-12): «Los contratos no están mostrando la información sobre el
 * escenario que se da en ese contrato. Ejemplo: si el inquilino es persona
 * natural y si el propietario es persona natural, el escenario de ese contrato
 * sería contrato de arrendamiento entre personas naturales. Entonces ese no va
 * a generar impuestos.»
 *
 * La tarjeta NO calcula nada: el back resuelve el escenario con el mismo
 * régimen que usa el motor de cobros y lo manda armado. Si la pantalla lo
 * dedujera por su cuenta sería una segunda cuenta, y el día que difieran diría
 * «no genera impuestos» mientras el cobro cobra IVA.
 *
 * ── Tres estados, y ninguno es «medio escenario» ────────────────────────────
 *
 * 1. **Confirmado**: las cuatro responsabilidades están declaradas. Se nombra
 *    el escenario y se listan sus impuestos.
 * 2. **Deducido**: falta declarar alguna y se dedujo del tipo de persona. Se
 *    nombra igual —es lo que Nico pide— pero se avisa que el cobro NO practica
 *    lo deducido hasta que alguien lo confirme. Un supuesto y un hecho se ven
 *    idénticos si no se los distingue, y acá la diferencia es plata.
 * 3. **Sin definir**: falta un dato que no se puede deducir. Se dice CUÁL
 *    falta y se enlaza a completarlo, en vez de mostrar medio escenario.
 */

import { useState } from 'react'
import { Scales, WarningCircle, Info } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { contractsApi } from '@/lib/api/contracts.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { diaEnColombia, fechaLarga } from '@/lib/fechas/fecha-de-la-casa'
import type {
  Contract,
  EscenarioTributarioDelContrato,
  ImpuestoDelEscenario,
} from '@/lib/types/contract'

interface Props {
  contract: Pick<Contract, 'escenarioTributario'> & { id?: string }
  /** QA-CONT-95 B-32: quien edita contratos puede confirmar el escenario. */
  puedeEditar?: boolean
  /** Después de confirmar: la ficha vuelve a leer el contrato. */
  onConfirmado?: () => void
}

/** A quién le pega cada línea, en palabras de recibo. */
const A_CARGO: Record<ImpuestoDelEscenario['aCargoDe'], string> = {
  INQUILINO: 'lo paga el inquilino',
  PROPIETARIO: 'se le descuenta al propietario',
  INMOBILIARIA: 'se le descuenta a la inmobiliaria',
}

const SOBRE: Record<ImpuestoDelEscenario['base'], string> = {
  CANON: 'sobre el canon',
  COMISION: 'sobre la comisión',
}

/** El porcentaje con coma decimal, como se escribe en Colombia. */
function porcentaje(n: number): string {
  return `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`
}

export function EscenarioTributario({ contract, puedeEditar = false, onConfirmado }: Props) {
  const escenario = contract.escenarioTributario

  return (
    <section
      // El ancla a la que lleva «Confirmar el escenario en el contrato» desde
      // el cajón de una factura sin impuestos (QA 22-09).
      id="escenario-tributario"
      className="scroll-mt-24 rounded-lg border border-border bg-card p-5 space-y-3"
      data-testid="escenario-tributario"
    >
      <div className="flex items-center gap-2">
        <Scales className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">
          Escenario tributario
        </h3>
      </div>

      {!escenario ? (
        /*
         * No vino en la respuesta. No es «no genera impuestos»: es que no
         * sabemos, y decirlo es más barato que afirmar un cero.
         */
        <p className="text-sm text-muted-foreground" data-testid="escenario-sin-dato">
          Esta versión del servidor todavía no calcula el escenario de este
          contrato. Recarga la página; si sigue igual, el back necesita
          actualizarse.
        </p>
      ) : (
        <Contenido
          escenario={escenario}
          contractId={contract.id}
          puedeEditar={puedeEditar}
          onConfirmado={onConfirmado}
        />
      )}
    </section>
  )
}

function Contenido({
  escenario,
  contractId,
  puedeEditar,
  onConfirmado,
}: {
  escenario: EscenarioTributarioDelContrato
  contractId?: string
  puedeEditar: boolean
  onConfirmado?: () => void
}) {
  const sinDefinir = escenario.codigo === 'SIN_DEFINIR'
  // El motivo del archivo ya va en su propio bloque, con el texto del archivo
  // al lado: en la lista de lo que falta sería la misma frase dos veces.
  const faltan = escenario.faltan.filter(
    (f) => f !== escenario.delArchivo?.motivo,
  )

  return (
    <>
      <div className="space-y-1">
        <p
          className="text-sm font-semibold text-foreground"
          data-testid="escenario-nombre"
        >
          {sinDefinir ? escenario.nombre : `${etiqueta(escenario.codigo)} · ${escenario.nombre}`}
        </p>
        <p className="text-sm text-muted-foreground" data-testid="escenario-resumen">
          {escenario.resumen}
        </p>
      </div>

      {/* 🔴 De dónde salió (QA 22-09). Un contrato migrado trae el escenario
          que la inmobiliaria usaba en su sistema anterior; cuando es uno de
          los nueve del catálogo, ése es el que se factura, y la pantalla lo
          tiene que decir — si no, «confirmado» parece salido de la nada. Y
          cuando NO se pudo usar (un escenario con IVA en una vivienda), el
          motivo va acá, con la salida. */}
      {/* 🔴 QA-CONT-95 B-32: el archivo dice un escenario y la ficha del
          propietario otro (Constructora Ñandú: «Escenario 1 · entre personas
          naturales» siendo una empresa que retiene). No se elige solo: la
          persona confirma cuál rige y, mientras tanto, la factura del canon
          espera. */}
      {escenario.delArchivo?.conflicto && (
        <ChoqueConLaFicha
          codigoDelArchivo={escenario.delArchivo.codigo}
          conflicto={escenario.delArchivo.conflicto}
          textoDelArchivo={escenario.delArchivo.texto}
          contractId={contractId}
          puedeEditar={puedeEditar}
          onConfirmado={onConfirmado}
        />
      )}

      {escenario.delArchivo && !escenario.delArchivo.conflicto && (
        <div
          className={
            escenario.delArchivo.aplicado
              ? 'rounded-lg bg-surface-muted p-3 space-y-1'
              : 'rounded-lg border border-warning/40 bg-warning-soft p-3 space-y-1'
          }
          data-testid="escenario-del-archivo"
        >
          <p className="text-sm text-foreground">
            {escenario.delArchivo.aplicado && escenario.delArchivo.confirmado ? (
              <span data-testid="escenario-confirmado-por">
                <span className="font-medium">
                  Confirmado
                  {escenario.delArchivo.confirmado.por
                    ? ` por ${escenario.delArchivo.confirmado.por}`
                    : ''}{' '}
                  el {fechaLarga(diaEnColombia(escenario.delArchivo.confirmado.el))}
                  {escenario.delArchivo.codigo
                    ? ` (${etiqueta(escenario.delArchivo.codigo)})`
                    : ''}
                  .
                </span>{' '}
                Con él se facturan los impuestos de este contrato.
              </span>
            ) : escenario.delArchivo.aplicado ? (
              <>
                <span className="font-medium">
                  Confirmado por el sistema anterior
                  {escenario.delArchivo.codigo
                    ? ` (${etiqueta(escenario.delArchivo.codigo)})`
                    : ''}
                  .
                </span>{' '}
                Es el escenario que la inmobiliaria tenía para este contrato
                antes de migrar, y con él se facturan los impuestos. Si cambió,
                corrígelo en Administración del contrato.
              </>
            ) : (
              <>
                <span className="font-medium">
                  El escenario del sistema anterior no se pudo usar.
                </span>{' '}
                {escenario.delArchivo.motivo}
              </>
            )}
          </p>
          <p className="text-caption text-muted-foreground">
            En el archivo:{' '}
            <span className="font-mono">
              {escenario.delArchivo.confirmado?.textoDelArchivo ?? escenario.delArchivo.texto}
            </span>
          </p>
        </div>
      )}

      {/* Qué genera. Si no genera nada se DICE, no se deja el hueco: un
          contrato sin impuestos y una tarjeta que se olvidó de listarlos se
          ven exactamente igual. */}
      {escenario.impuestos.length > 0 ? (
        <ul className="space-y-2" data-testid="escenario-impuestos">
          {escenario.impuestos.map((i) => (
            <li
              key={`${i.tipo}-${i.base}`}
              className="rounded-lg border border-border p-3 space-y-1"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {i.nombre}
                </span>
                {/* `shrink-0` + `whitespace-nowrap`: la columna izquierda de la
                    ficha es angosta y sin esto «11 %» se parte en dos líneas. */}
                <span className="shrink-0 whitespace-nowrap font-mono text-sm tabular-nums text-foreground">
                  {porcentaje(i.porcentaje)}
                </span>
              </div>
              <p className="text-caption text-muted-foreground">
                {SOBRE[i.base]} · {A_CARGO[i.aCargoDe]}
              </p>
              <p className="text-caption text-muted-foreground">{i.explicacion}</p>
            </li>
          ))}
        </ul>
      ) : !sinDefinir ? (
        <p
          className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground"
          data-testid="escenario-sin-impuestos"
        >
          No genera IVA ni retenciones: no hay nada que sumarle al cobro ni que
          descontarle al propietario.
        </p>
      ) : null}

      {/* De dónde sale: las cuatro responsabilidades que lo definen. Sin esto
          el nombre es un veredicto sin pruebas, y nadie puede corregirlo. */}
      <details className="text-sm" data-testid="escenario-ejes">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          De dónde sale
        </summary>
        <ul className="mt-2 space-y-1.5 pl-1">
          {(
            [
              ['IVA sobre el canon', escenario.ejes.ivaSobreElCanon],
              ['Retención sobre el canon', escenario.ejes.retencionSobreElCanon],
              ['ReteIVA', escenario.ejes.reteIvaSobreElCanon],
              ['Retención sobre la comisión', escenario.ejes.retencionSobreLaComision],
            ] as const
          ).map(([titulo, eje]) => (
            <li key={titulo} className="text-caption text-muted-foreground">
              <span className="font-medium text-foreground">{titulo}:</span>{' '}
              {eje.valor === null ? 'falta el dato' : eje.valor ? 'sí' : 'no'}
              {eje.origen === 'DEDUCIDO' ? ' (deducido)' : ''} — {eje.porque}
            </li>
          ))}
        </ul>
      </details>

      {/* Lo que falta. Enlaza a Administración del contrato, que es donde se
          corrigen el uso del inmueble y el perfil del inquilino, y a la ficha
          del propietario para lo suyo. */}
      {faltan.length > 0 && (
        <div
          className="rounded-lg border border-dashed border-border p-3 space-y-2"
          data-testid="escenario-faltan"
        >
          <div className="flex items-start gap-2">
            <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                Falta un dato para poder nombrar el escenario
              </p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {faltan.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="text-muted-foreground">
                El uso del inmueble y el perfil del inquilino se completan en{' '}
                <span className="font-medium text-foreground">
                  Administración del contrato
                </span>
                , acá mismo en la ficha. Si es del propietario, va en su ficha.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deducido ≠ confirmado, y la diferencia es plata: el cobro sólo
          practica lo declarado. */}
      {escenario.certeza === 'DEDUCIDO' && !escenario.delArchivo?.conflicto && (
        <div
          className="rounded-lg bg-surface-muted p-3 space-y-1"
          data-testid="escenario-deducido"
        >
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  Escenario deducido, no confirmado.
                </span>{' '}
                {escenario.sinImpuestos
                  ? 'No cambia el cobro —no habría nada que aplicar—, pero conviene declararlo.'
                  : 'Mientras no se declare el perfil tributario de las partes, el cobro NO aplica estos impuestos.'}
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {escenario.deducidos.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ReteICA no es parte de ningún escenario del catálogo: se cobra, pero
          el nombre no la explica. Callarlo haría que la tarjeta pareciera
          completa cuando no lo es. */}
      {escenario.fueraDelCatalogo.map((f) => (
        <p key={f} className="text-caption text-muted-foreground">
          {f}
        </p>
      ))}

      {escenario.nombreEnNuby && !escenario.delArchivo && (
        <p className="text-caption text-muted-foreground" data-testid="escenario-nuby">
          En el sistema anterior:{' '}
          <span className="font-mono">{escenario.nombreEnNuby}</span>
        </p>
      )}
    </>
  )
}

/** «Escenario 5» a partir de `E5`. El código es de la base, no de la pantalla. */
function etiqueta(codigo: string): string {
  return `Escenario ${codigo.slice(1)}`
}

type CodigoDelCatalogo = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9'

/**
 * QA-CONT-95 B-32: el escenario del archivo choca con la ficha del
 * propietario. Dos salidas, la de la ficha primero (es el dato más nuevo: lo
 * escribió la inmobiliaria en Leasefy).
 */
function ChoqueConLaFicha({
  codigoDelArchivo,
  conflicto,
  textoDelArchivo,
  contractId,
  puedeEditar,
  onConfirmado,
}: {
  codigoDelArchivo: CodigoDelCatalogo | null
  conflicto: NonNullable<NonNullable<EscenarioTributarioDelContrato['delArchivo']>['conflicto']>
  textoDelArchivo: string
  contractId?: string
  puedeEditar: boolean
  onConfirmado?: () => void
}) {
  const [enviando, setEnviando] = useState<CodigoDelCatalogo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const confirmar = async (codigo: CodigoDelCatalogo) => {
    if (!contractId) return
    setEnviando(codigo)
    setError(null)
    try {
      await contractsApi.confirmarEscenario(contractId, codigo)
      toast.success(`Confirmado: rige el ${etiqueta(codigo).toLowerCase()}.`, {
        description: 'Las cuotas desde hoy se rehacen con ese escenario.',
      })
      onConfirmado?.()
    } catch (e) {
      setError(mensajeParaLaPersona(e, { accion: 'confirmar el escenario' }))
    } finally {
      setEnviando(null)
    }
  }

  const opciones: { codigo: CodigoDelCatalogo; texto: string; principal: boolean }[] = []
  if (conflicto.codigoDeLaFicha) {
    opciones.push({
      codigo: conflicto.codigoDeLaFicha,
      texto: `Rige el ${etiqueta(conflicto.codigoDeLaFicha).toLowerCase()} (la ficha del propietario)`,
      principal: true,
    })
  }
  if (codigoDelArchivo) {
    opciones.push({
      codigo: codigoDelArchivo,
      texto: `Rige el ${etiqueta(codigoDelArchivo).toLowerCase()} (el archivo)`,
      principal: !conflicto.codigoDeLaFicha,
    })
  }

  return (
    <div
      className="rounded-lg border border-warning/40 bg-warning-soft p-3 space-y-2"
      data-testid="escenario-choque-con-la-ficha"
    >
      <div className="flex items-start gap-2">
        <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-700 dark:text-warning-100" />
        <div className="space-y-1 text-sm text-foreground">
          <p className="font-medium">El archivo y la ficha del propietario no coinciden.</p>
          <p>{conflicto.motivo}</p>
          <p className="text-caption text-muted-foreground">
            En el archivo: <span className="font-mono">{textoDelArchivo}</span>
          </p>
        </div>
      </div>
      {puedeEditar && contractId ? (
        <div className="flex flex-wrap gap-2 pl-6">
          {opciones.map((o) => (
            <Button
              key={o.codigo}
              size="sm"
              variant={o.principal ? 'default' : 'outline'}
              disabled={enviando !== null}
              onClick={() => void confirmar(o.codigo)}
              data-testid={`confirmar-escenario-${o.codigo}`}
            >
              {enviando === o.codigo ? 'Confirmando…' : o.texto}
            </Button>
          ))}
        </div>
      ) : (
        <p className="pl-6 text-caption text-muted-foreground" data-testid="escenario-choque-sin-permiso">
          Lo confirma quien puede editar contratos en tu inmobiliaria.
        </p>
      )}
      {error ? (
        <p className="pl-6 text-sm text-danger" role="alert" data-testid="escenario-choque-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
