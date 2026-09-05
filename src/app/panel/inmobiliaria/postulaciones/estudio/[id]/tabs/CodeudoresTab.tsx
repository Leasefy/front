'use client'

/**
 * CodeudoresTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Visión §11/§12: los codeudores asociados al estudio, cada uno con su
 * validación de identidad, ingresos y documentos.
 *
 * ── Lo que había acá ─────────────────────────────────────────────────────
 * Debajo del vacío se pintaba una tarjeta «Ejemplo de una ficha de codeudor»:
 * avatar, «Nombre del codeudor», «C.C. — · — · —» y las tres cajas Identidad
 * / Ingresos / Documentos. Era el bloque menos dañino de los tres —los valores
 * eran todos «—»—, pero seguía siendo una ficha de persona dibujada dentro
 * del expediente de otra persona real, y prometía tres validaciones que no
 * existen en ninguna parte del sistema.
 *
 * ── Qué es real y qué no, dentro de este mismo archivo ───────────────────
 * El comentario anterior afirmaba que `decision.requiereCodeudor` «viene del
 * pipeline». **No es así**, y conviene decirlo con precisión porque la nota se
 * queda:
 *
 *   - REAL, del backend: `financialAnalysis.incomeToRentRatio`, la relación
 *     entre el ingreso detectado y el canon. Sale de la corrida del motor.
 *   - DEL FRONT: el umbral con el que se compara. `DEFAULT_INCOME_RATIO_MIN`
 *     es un `3` escrito en `src/lib/estudio/decision.ts`, todavía no
 *     configurable por agencia. `requiereCodeudor` es `ratio < 3` calculado
 *     acá, no una decisión que haya tomado el motor.
 *
 * O sea: la recomendación es una lectura nuestra sobre un número de ellos. Por
 * eso la nota ahora muestra el número y el umbral en vez de sólo la
 * conclusión — quien la lee puede ver de dónde sale y no confundirla con un
 * veredicto del motor.
 *
 * ── Por qué la lista sigue vacía ─────────────────────────────────────────
 * El codeudor no existe como entidad: cero modelos en Prisma. Lo único que hay
 * es `referencesInfo.hasCoSigner` (un booleano) y un `coSigner` JSON sin
 * esquema, que además se colapsa a `codeudores: 0 | 1` antes de llegar al
 * motor. No hay identidad, ni ingresos, ni documentos por codeudor que
 * mostrar, ni endpoint del que pedirlos.
 */

import { UsersThree } from '@phosphor-icons/react'

import { useTf } from '@/lib/i18n/use-tf'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  DEFAULT_INCOME_RATIO_MIN,
  type EstudioDecision,
  type TenantScoringResult,
} from '@/lib/estudio/decision'

interface CodeudoresTabProps {
  /** `requiereCodeudor` se deriva en el front; ver el encabezado. */
  decision?: EstudioDecision
  result?: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

export function CodeudoresTab({ decision, result }: CodeudoresTabProps) {
  const tf = useTf()

  const recomendado = decision?.requiereCodeudor === true
  const ratio = result?.financialAnalysis?.incomeToRentRatio ?? null

  return (
    <div className="space-y-5" data-testid="estudio-codeudores">
      {/* La recomendación se queda, pero mostrando su aritmética. El ratio es
          dato del motor; el umbral lo pone el front. */}
      {recomendado && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3"
          data-testid="codeudor-recomendado"
        >
          <p className="text-sm text-warning-700 leading-snug">
            {tf(
              `${NS}.detalle.codeudores.recomendado`,
              'Este estudio mejoraría su viabilidad con un codeudor. Cuando se agregue, su validación aparecerá aquí.',
            )}
          </p>
          {ratio !== null && (
            <p className="mt-1.5 text-xs text-warning-700 leading-snug tabular-nums">
              {tf(`${NS}.detalle.codeudores.porQue`, 'El ingreso detectado cubre')}{' '}
              <span className="font-mono">{ratio.toFixed(1)}×</span>{' '}
              {tf(
                `${NS}.detalle.codeudores.porQueUmbral`,
                'el canon, y el umbral con el que trabajamos es',
              )}{' '}
              <span className="font-mono">{DEFAULT_INCOME_RATIO_MIN}×</span>.
            </p>
          )}
        </div>
      )}

      <EmptyState
        icon={UsersThree}
        title={tf(`${NS}.detalle.codeudores.empty.title`, 'Todavía no se pueden registrar codeudores')}
        description={tf(
          `${NS}.detalle.codeudores.empty.description`,
          'Hoy el sistema sólo guarda si la postulación declaró un codeudor, sin sus datos: no hay identidad, ingresos ni documentos que mostrar. Cuando el codeudor exista como ficha propia, su validación aparece acá.',
        )}
      />
    </div>
  )
}
