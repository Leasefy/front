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

import { Scales, WarningCircle, Info } from '@phosphor-icons/react'

import type {
  Contract,
  EscenarioTributarioDelContrato,
  ImpuestoDelEscenario,
} from '@/lib/types/contract'

interface Props {
  contract: Pick<Contract, 'escenarioTributario'>
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

export function EscenarioTributario({ contract }: Props) {
  const escenario = contract.escenarioTributario

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 space-y-3"
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
          contrato. Recargá la página; si sigue igual, el back necesita
          actualizarse.
        </p>
      ) : (
        <Contenido escenario={escenario} />
      )}
    </section>
  )
}

function Contenido({
  escenario,
}: {
  escenario: EscenarioTributarioDelContrato
}) {
  const sinDefinir = escenario.codigo === 'SIN_DEFINIR'

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
              <p className="text-xs text-muted-foreground">
                {SOBRE[i.base]} · {A_CARGO[i.aCargoDe]}
              </p>
              <p className="text-xs text-muted-foreground">{i.explicacion}</p>
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
            <li key={titulo} className="text-xs text-muted-foreground">
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
      {escenario.faltan.length > 0 && (
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
                {escenario.faltan.map((f) => (
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
      {escenario.certeza === 'DEDUCIDO' && (
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
        <p key={f} className="text-xs text-muted-foreground">
          {f}
        </p>
      ))}

      {escenario.nombreEnNuby && (
        <p className="text-xs text-muted-foreground" data-testid="escenario-nuby">
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
