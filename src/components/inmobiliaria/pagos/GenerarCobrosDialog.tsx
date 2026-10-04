'use client'

/**
 * GenerarCobrosDialog — la confirmación de la única acción MASIVA de esta
 * pantalla.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 * El botón decía «Generar cobros del mes» y llevaba a `/ai/pagos/generar`, una
 * pantalla cuyo modo masivo es una vista previa ILUSTRATIVA con el CTA en
 * «Próximamente». O sea: el botón más prominente del header no generaba nada, y
 * su nombre no decía ni sobre qué mes ni sobre cuántos contratos iba a operar.
 *
 * Mientras tanto el endpoint real existe y está desplegado —
 * `POST /inmobiliaria/cobros/generate { month }` (`cobrosApi.generate`, tipado
 * en `generated/back.ts` como «Generate cobros for a month») — y NADIE en el
 * front lo llamaba.
 *
 * Este diálogo cierra las dos cosas: llama al endpoint de verdad y, antes de
 * hacerlo, DICE SU ALCANCE. Regla de la casa: nunca una acción masiva sin decir
 * a cuántos y sobre qué va a caer.
 *
 * ── Qué se afirma y qué no ───────────────────────────────────────────────────
 * Sólo se muestran hechos verificables desde el front:
 *   · el mes, escrito con todas las letras (nunca 'YYYY-MM' a secas);
 *   · cuántos cobros de ese mes YA existen — es `cobros.length` de la misma
 *     tabla que el usuario está viendo, no un número traído de otro lado.
 * NO se promete «va a crear N cobros» ni «no duplica»: el reparto lo decide el
 * back y desde acá no se puede saber sin inventarlo.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Warning, CheckCircle, SealWarning, ArrowSquareOut, Receipt } from '@phosphor-icons/react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { Checkbox } from '@/components/ui/checkbox'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { Appear, Banner } from '@leasefy/cadence'
import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  cobrosApi,
  type ConsignacionConContratoVencido,
  type ResultadoDeLaGeneracion,
} from '@/lib/api/inmobiliaria.service'
import { mesEnTitulo } from '@/lib/utils/mes'
import { useI18n } from '@/lib/i18n'

/**
 * ¿El back RECHAZÓ la corrida (un 4xx que dice por qué)? (02-10-2026)
 *
 * `FalloDeCarga` está hecho para una LECTURA: para él un 400 o un 409 es
 * inesperado y lo titula «problema nuestro». Generar es una ACCIÓN: un 409
 * («ya hay una corrida en curso») o un 400 dicen qué pasó y hay que leerlo tal
 * cual. Los 5xx, la red y las caídas siguen con `FalloDeCarga`, que sabe
 * nombrar el servicio caído y dar la referencia.
 */
function esUnRechazo(error: unknown): boolean {
  const { tipo } = leerFallo(error)
  return tipo === 'datos' || tipo === 'conflicto' || tipo === 'rechazo' || tipo === 'noExiste'
}

export interface GenerarCobrosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** El mes sobre el que se va a generar, en 'YYYY-MM'. */
  mes: string
  /** Cuántos cobros de ese mes ya existen HOY (dato real de la tabla de al lado). */
  yaGenerados: number
  /** Se llama tras un generate exitoso para que la tabla se vuelva a leer. */
  onGenerado: () => void
}

/**
 * Los contratos VENCIDOS que la corrida dejó fuera.
 *
 * 🔴 Se ordenan poniendo primero los que YA tienen una renovación abierta:
 * ésos están a un clic de resolverse y son los que conviene mirar antes.
 */
export function ordenarVencidos(
  contratos: readonly ConsignacionConContratoVencido[],
): ConsignacionConContratoVencido[] {
  return [...contratos].sort((a, b) => {
    if (a.tieneRenovacionAbierta !== b.tieneRenovacionAbierta) {
      return a.tieneRenovacionAbierta ? -1 : 1
    }
    // Después, el más vencido primero: es el que más tiempo lleva sin cobrarse.
    return b.diasVencido - a.diasVencido
  })
}

/** «Contrato 1839» o, si es migrado, el número que la inmobiliaria conoce. */
function nombreDelContrato(c: ConsignacionConContratoVencido): string {
  return c.externalId ? `Contrato ${c.externalId}` : `Contrato ${c.code}`
}

function OmitidosPorVencido({
  omitidos,
}: {
  omitidos: NonNullable<ResultadoDeLaGeneracion['omitidosPorContratoVencido']>
}) {
  /*
   * 🔴 `consultado: false` NO es «no hay vencidos»: es «no se pudo saber».
   * La corrida se comportó como siempre y NO excluyó a nadie. Decirlo como si
   * estuviera todo bien sería afirmar algo que nadie verificó.
   */
  if (!omitidos.consultado) {
    return (
      <div
        className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-fg"
        data-testid="vencidos-no-verificado"
      >
        <SealWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="duotone" aria-hidden="true" />
        <span>
          No se pudo verificar si hay contratos vencidos, así que esta corrida
          NO excluyó a ninguno: se comportó como siempre.
          {omitidos.motivo ? ` ${omitidos.motivo}` : ''} Avísale a tu equipo
          técnico antes de dar el mes por cerrado.
        </span>
      </div>
    )
  }

  const contratos = ordenarVencidos(omitidos.contratos)

  return (
    <div className="space-y-2" data-testid="vencidos-omitidos">
      <p className="flex items-start gap-2 text-sm text-fg">
        <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="duotone" aria-hidden="true" />
        <span>
          <strong className="tabular-nums">{omitidos.cuantos}</strong>{' '}
          {omitidos.cuantos === 1
            ? 'contrato vencido quedó fuera'
            : 'contratos vencidos quedaron fuera'}
          : no se les generó cobro. Renuévalos o termínalos para que vuelvan a
          la corrida.
        </span>
      </p>

      <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {contratos.map((c) => (
          <li key={c.contractId} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">
                {c.tenantName ?? nombreDelContrato(c)}
              </p>
              <p className="truncate text-caption text-fg-muted">
                {c.propertyAddress ? `${c.propertyAddress} · ` : ''}
                {c.leyenda}
              </p>
              {c.tieneRenovacionAbierta ? (
                <p className="text-caption text-primary" data-testid={`renovacion-abierta-${c.contractId}`}>
                  Ya tiene una renovación abierta
                </p>
              ) : null}
            </div>
            <Link
              href={`/panel/inmobiliaria/contratos/${c.contractId}`}
              className="flex shrink-0 items-center gap-1 text-caption text-primary hover:underline"
              data-testid={`ir-al-contrato-${c.contractId}`}
            >
              Abrir
              <ArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GenerarCobrosDialog({
  open,
  onOpenChange,
  mes,
  yaGenerados,
  onGenerado,
}: GenerarCobrosDialogProps) {
  const { t } = useI18n()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<unknown>(null)
  /**
   * 🔴 PG-R13 (QA de Pagos, 03-10-2026): avisarles a los inquilinos es una
   * decisión de quien genera, apagada por defecto. Antes generar disparaba
   * «Factura y cobro del mes» a todos sin decirlo (el incidente del 14-09).
   */
  const [avisar, setAvisar] = useState(false)
  /**
   * El resultado de la corrida. Antes el diálogo se cerraba y listo; desde que
   * el back excluye los contratos VENCIDOS hay que mostrarlos, porque una
   * corrida que deja gente afuera en silencio es justo lo que esa exclusión
   * vino a evitar.
   */
  const [resultado, setResultado] = useState<ResultadoDeLaGeneracion | null>(
    null,
  )

  const titulo = mesEnTitulo(mes)

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      const r = avisar
        ? await cobrosApi.generate(mes, { avisarALosInquilinos: true })
        : await cobrosApi.generate(mes)
      onGenerado()
      const omitidos = r?.omitidosPorContratoVencido
      // Sólo se queda abierto si hay algo que CONTAR: vencidos que quedaron
      // fuera, o que no se pudo verificar si los había.
      if (omitidos && (omitidos.cuantos > 0 || !omitidos.consultado)) {
        setResultado(r)
      } else {
        onOpenChange(false)
      }
    } catch (err) {
      // El error se queda EN el diálogo: cerrarlo escondería el fallo y el
      // usuario creería que se generaron.
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  function cambiarApertura(siguiente: boolean) {
    if (enviando) return // no cerrar a mitad de una acción masiva
    if (!siguiente) {
      setError(null)
      setResultado(null)
      setAvisar(false)
    }
    onOpenChange(siguiente)
  }

  const omitidos = resultado?.omitidosPorContratoVencido
  /*
   * La variante sigue al estado (DESIGN.md §17): pregunta → corrida terminada
   * (o terminada SIN poder verificar los vencidos, que es una advertencia: la
   * corrida no excluyó a nadie) → fallo. El medallón dice el estado; por eso el
   * ✓ verde que iba a mano en el cuerpo ya no está.
   */
  const variante = omitidos
    ? omitidos.consultado
      ? 'success'
      : 'warning'
    : error
      ? 'error'
      : 'confirm'

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogContent
        size="md"
        variant={variante}
        icon={variante === 'confirm' ? <Receipt weight="bold" /> : undefined}
        data-testid="generar-cobros-dialog"
      >
        <DialogHeader>
          {resultado && omitidos ? (
            <>
              <DialogTitle>La corrida de {titulo} terminó</DialogTitle>
              {typeof resultado.created === 'number' ? (
                <DialogDescription>
                  <span className="tabular-nums">{resultado.created.toLocaleString('es-CO')}</span>{' '}
                  {resultado.created === 1 ? 'cobro generado.' : 'cobros generados.'}
                </DialogDescription>
              ) : null}
            </>
          ) : error ? (
            <>
              <DialogTitle>
                {t('inmobiliaria.ai.pagos_home.resumen.generar.errorTitulo', { mes: titulo })}
              </DialogTitle>
              <DialogDescription>
                {t('inmobiliaria.ai.pagos_home.resumen.generar.errorDescripcion')}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>
                {t('inmobiliaria.ai.pagos_home.resumen.generar.titulo', { mes: titulo })}
              </DialogTitle>
              <DialogDescription>
                {t('inmobiliaria.ai.pagos_home.resumen.generar.descripcion', { mes: titulo })}
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {/* Movimiento (ola 2, 03-10-2026): el resultado de la corrida y el
            fallo ENTRAN (fundido y 4 px) en lugar del formulario. */}
        {omitidos ? (
          <Appear distance="xs">
          <OmitidosPorVencido omitidos={omitidos} />
          </Appear>
        ) : error && esUnRechazo(error) ? (
          <Banner variant="danger" role="alert" data-testid="generar-rechazo">
            {mensajeParaLaPersona(error, { accion: 'generar los cobros' })}
          </Banner>
        ) : error ? (
          <Appear distance="xs">
          <FalloDeCarga
            error={error}
            queEs={t('inmobiliaria.ai.pagos_home.resumen.generar.queEs')}
            onReintentar={confirmar}
            enmarcado={false}
          />
          </Appear>
        ) : (
          <div className="space-y-3">
            {/* El alcance, en hechos: sobre qué mes y qué hay hoy. */}
            <dl className="rounded-lg border border-border divide-y divide-border">
              <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-fg-muted">
                  {t('inmobiliaria.ai.pagos_home.resumen.generar.mesLabel')}
                </dt>
                <dd className="text-sm font-semibold text-fg" data-testid="generar-mes">
                  {titulo}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-fg-muted">
                  {t('inmobiliaria.ai.pagos_home.resumen.generar.yaGeneradosLabel')}
                </dt>
                <dd
                  className="text-sm font-semibold text-fg tabular-nums"
                  data-testid="generar-ya-generados"
                >
                  {yaGenerados}
                </dd>
              </div>
            </dl>

            {yaGenerados > 0 ? (
              <p
                className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
                data-testid="generar-aviso-duplicado"
              >
                <Warning className="mt-0.5 h-4 w-4 shrink-0" weight="duotone" aria-hidden="true" />
                <span>
                  {t('inmobiliaria.ai.pagos_home.resumen.generar.avisoYaHay', {
                    n: yaGenerados,
                    mes: titulo,
                  })}
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2 px-1 text-sm text-fg-muted">
                <CheckCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  weight="duotone"
                  aria-hidden="true"
                />
                <span>
                  {t('inmobiliaria.ai.pagos_home.resumen.generar.avisoLimpio', { mes: titulo })}
                </span>
              </p>
            )}

            {/* PG-R13: si los inquilinos se enteran o no lo decide quien
                genera, y se dice ANTES de confirmar. */}
            <label className="flex items-start gap-2 px-1 text-sm text-fg" data-testid="generar-avisar">
              <Checkbox
                className="mt-0.5"
                checked={avisar}
                onCheckedChange={(v) => setAvisar(v === true)}
                data-testid="generar-avisar-casilla"
              />
              <span>
                {t('inmobiliaria.ai.pagos_home.resumen.generar.avisarALosInquilinos')}
                <span className="block text-caption text-fg-muted">
                  {avisar
                    ? t('inmobiliaria.ai.pagos_home.resumen.generar.avisarSi')
                    : t('inmobiliaria.ai.pagos_home.resumen.generar.avisarNo')}
                </span>
              </span>
            </label>
          </div>
        )}

        <DialogFooter>
          {resultado ? (
            // Terminado, la salida es blanca (DESIGN.md §17: «Listo» blanco).
            <Button
              variant="outline"
              hideArrow
              onClick={() => cambiarApertura(false)}
              data-testid="generar-cerrar"
            >
              Cerrar
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                hideArrow
                onClick={() => cambiarApertura(false)}
                disabled={enviando}
              >
                {t('common.cancel')}
              </Button>
              <Button
                hideArrow
                onClick={confirmar}
                disabled={enviando}
                isLoading={enviando}
                data-testid="generar-confirmar"
              >
                {enviando
                  ? t('inmobiliaria.ai.pagos_home.resumen.generar.enviando')
                  : t('inmobiliaria.ai.pagos_home.resumen.generar.confirmar', { mes: titulo })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
