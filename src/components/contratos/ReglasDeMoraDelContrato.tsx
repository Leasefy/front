'use client'

/**
 * Las reglas de mora de la inmobiliaria, vistas desde ESTE contrato.
 *
 * Nico (2026-09-01): «al ser reglas generales si voy a un contrato debería
 * poder aplicárselas, y eso los contratos no lo tienen hoy». Las reglas se
 * configuran una vez para toda la cartera (Cobros → Reglas de mora) y por
 * defecto rigen para todos los contratos. Acá se ve, contrato por contrato,
 * cuál aplica y con qué números — y se puede quitar una (un inquilino con el
 * que se pactó no cobrar honorario) o pisarle el valor o el día (un interés
 * pactado más bajo, el honorario desde el 20 y no desde el 15).
 *
 * «Igual que la agencia» no es un ajuste: cuando todo vuelve al default el
 * back borra la fila, y la pantalla deja de decir «propio».
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Gavel, ArrowCounterClockwise } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { reglasDeMoraApi } from '@/lib/api/reglas-de-mora.service'
import type {
  AjusteDeReglaDelContrato,
  ReglaDeMoraDelContrato,
} from '@/lib/api/reglas-de-mora.types'
import type { Contract } from '@/lib/types/contract'
import {
  NOMBRE_DEL_CONCEPTO,
  describirDisparador,
  describirFormula,
  describirTope,
  formatearPorcentaje,
} from '@/components/cobros/reglas-de-mora/legible'
import { formatCurrency } from '@/lib/format'

interface Props {
  contract: Pick<Contract, 'id'>
  puedeEditar: boolean
}

const PANTALLA_DE_REGLAS = '/panel/inmobiliaria/cobros/reglas-de-mora'

export function ReglasDeMoraDelContrato({ contract, puedeEditar }: Props) {
  const [reglas, setReglas] = useState<ReglaDeMoraDelContrato[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupada, setOcupada] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    setReglas(null)
    try {
      setReglas(await reglasDeMoraApi.delContrato(contract.id))
    } catch (e) {
      // Un fallo NO se pinta como «sin reglas»: son cosas distintas.
      setError(e instanceof Error ? e.message : 'No pudimos traer las reglas de mora.')
      setReglas([])
    }
  }, [contract.id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function ajustar(reglaId: string, ajuste: AjusteDeReglaDelContrato) {
    setOcupada(reglaId)
    setError(null)
    try {
      const actualizada = await reglasDeMoraApi.ajustarEnContrato(contract.id, reglaId, ajuste)
      setReglas((prev) =>
        (prev ?? []).map((r) => (r.regla.id === reglaId ? actualizada : r)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el ajuste.')
    } finally {
      setOcupada(null)
    }
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-5 space-y-3"
      data-testid="reglas-de-mora-del-contrato"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Reglas de mora</h3>
        </div>
        <Button asChild variant="ghost" size="sm" hideArrow>
          <Link href={PANTALLA_DE_REGLAS}>Las de la inmobiliaria</Link>
        </Button>
      </div>

      {reglas === null ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : error && reglas.length === 0 ? (
        <div className="space-y-2 text-sm">
          <p className="text-destructive">{error}</p>
          <Button variant="secondary" size="sm" hideArrow onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      ) : reglas.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="reglas-vacio">
          La inmobiliaria todavía no tiene reglas de mora: a este contrato no
          se le cobra interés ni honorario cuando se atrasa.{' '}
          <Link href={PANTALLA_DE_REGLAS} className="font-medium text-primary hover:underline">
            Crear la primera regla
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Las reglas son de la inmobiliaria y rigen para todos los contratos.
            Acá se ajustan sólo para este.
          </p>
          {reglas.map((r) => (
            <FilaDeRegla
              key={r.regla.id}
              fila={r}
              puedeEditar={puedeEditar}
              ocupada={ocupada === r.regla.id}
              onAjustar={(ajuste) => void ajustar(r.regla.id, ajuste)}
            />
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      )}
    </section>
  )
}

function FilaDeRegla({
  fila,
  puedeEditar,
  ocupada,
  onAjustar,
}: {
  fila: ReglaDeMoraDelContrato
  puedeEditar: boolean
  ocupada: boolean
  onAjustar: (ajuste: AjusteDeReglaDelContrato) => void
}) {
  const { regla } = fila
  const efectiva = { ...regla, valor: fila.valor, disparadorDia: fila.disparadorDia }
  const valorEsPropio = fila.valor !== fila.valorDeLaAgencia
  const diaEsPropio = fila.disparadorDia !== fila.disparadorDiaDeLaAgencia

  return (
    <div
      className={
        fila.aplica
          ? 'rounded-lg border border-border p-3'
          : 'rounded-lg border border-dashed border-border p-3 opacity-70'
      }
      data-testid={`regla-${regla.id}`}
      data-aplica={fila.aplica}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium text-foreground">{regla.nombre}</p>
            {/* El concepto sólo si el nombre no lo dice ya: «Interés de mora · Interés de mora» es ruido. */}
            {NOMBRE_DEL_CONCEPTO[regla.concepto].toLowerCase() !== regla.nombre.trim().toLowerCase() ? (
              <span className="text-xs text-muted-foreground">
                · {NOMBRE_DEL_CONCEPTO[regla.concepto]}
              </span>
            ) : null}
            {fila.esPropio ? (
              <span
                className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
                data-testid={`propio-${regla.id}`}
              >
                propio
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {fila.aplica
              ? `Se dispara ${describirDisparador(efectiva)} y cobra ${describirFormula(efectiva)}, ${describirTope(regla.topeCop)}.`
              : 'No se le aplica a este contrato.'}
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Aplica</span>
          <Switch
            checked={fila.aplica}
            disabled={!puedeEditar || ocupada}
            onCheckedChange={(v) => onAjustar({ aplica: v })}
            aria-label={`${regla.nombre}: aplica a este contrato`}
            data-testid={`aplica-${regla.id}`}
          />
        </label>
      </div>

      {fila.aplica && puedeEditar ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <CampoPropio
            etiqueta={etiquetaDelValor(regla.formula)}
            valor={fila.valor}
            deLaAgencia={fila.valorDeLaAgencia}
            esPropio={valorEsPropio}
            deshabilitado={ocupada}
            step={regla.formula === 'MONTO_FIJO' ? 1 : 0.0001}
            formatear={(n) =>
              regla.formula === 'MONTO_FIJO' ? formatCurrency(n) : formatearPorcentaje(n)
            }
            onGuardar={(n) => onAjustar({ valor: n })}
            onVolver={() => onAjustar({ valor: null })}
            testId={`valor-${regla.id}`}
          />
          <CampoPropio
            etiqueta={regla.disparador === 'DIA_DEL_MES' ? 'Día del mes' : 'Día de mora'}
            valor={fila.disparadorDia}
            deLaAgencia={fila.disparadorDiaDeLaAgencia}
            esPropio={diaEsPropio}
            deshabilitado={ocupada}
            step={1}
            formatear={(n) => `día ${n}`}
            onGuardar={(n) => onAjustar({ disparadorDia: n })}
            onVolver={() => onAjustar({ disparadorDia: null })}
            testId={`dia-${regla.id}`}
          />
        </div>
      ) : null}
    </div>
  )
}

function etiquetaDelValor(formula: ReglaDeMoraDelContrato['regla']['formula']): string {
  switch (formula) {
    case 'INTERES_DIARIO':
      return 'Tasa diaria (%)'
    case 'PORCENTAJE_DE_LA_BASE':
      return 'Porcentaje (%)'
    case 'MONTO_FIJO':
      return 'Monto (COP)'
  }
}

/**
 * Un número que el contrato puede pisar. Se escribe, «Guardar» lo manda;
 * cuando difiere de la agencia aparece lo de la agencia al lado y «Volver a
 * la general» borra el ajuste.
 */
function CampoPropio({
  etiqueta,
  valor,
  deLaAgencia,
  esPropio,
  deshabilitado,
  step,
  formatear,
  onGuardar,
  onVolver,
  testId,
}: {
  etiqueta: string
  valor: number
  deLaAgencia: number
  esPropio: boolean
  deshabilitado: boolean
  step: number
  formatear: (n: number) => string
  onGuardar: (n: number) => void
  onVolver: () => void
  testId: string
}) {
  const [borrador, setBorrador] = useState(String(valor))
  // El valor puede cambiar por afuera (se guardó, se volvió a la general):
  // el borrador lo sigue mientras nadie lo esté editando.
  useEffect(() => {
    setBorrador(String(valor))
  }, [valor])

  const n = Number(borrador)
  const cambiado = borrador.trim() !== '' && Number.isFinite(n) && n !== valor

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{etiqueta}</label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step={step}
          min={0}
          value={borrador}
          disabled={deshabilitado}
          onChange={(e) => setBorrador(e.target.value)}
          className="h-9"
          data-testid={testId}
        />
        {cambiado ? (
          <Button
            size="sm"
            hideArrow
            disabled={deshabilitado}
            onClick={() => onGuardar(n)}
            data-testid={`${testId}-guardar`}
          >
            Guardar
          </Button>
        ) : null}
      </div>
      {esPropio ? (
        <p className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <span>La inmobiliaria cobra {formatear(deLaAgencia)}.</span>
          <button
            type="button"
            disabled={deshabilitado}
            onClick={onVolver}
            className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
            data-testid={`${testId}-volver`}
          >
            <ArrowCounterClockwise className="h-3 w-3" />
            Volver a la general
          </button>
        </p>
      ) : null}
    </div>
  )
}
