'use client'

/**
 * UN PREFIJO POR TIPO DE DOCUMENTO — el estado de la numeración, arriba de
 * «Resolución».
 *
 * Nico y Juan Camilo (2026-09-17): «un prefijo por tipo de documento (canon del
 * inquilino, comisión al propietario, otros como intereses y reparaciones),
 * cada uno con su resolución y su rango; **el sistema avisa cuando se agota el
 * rango o se vence la resolución**».
 *
 * ── Qué pinta, y por qué en ese orden ──────────────────────────────────────
 *
 *   1. Los AVISOS primero. Lo que BLOQUEA arriba y en rojo; lo que sólo
 *      advierte, debajo. Un aviso que dice «te quedan 8 números» y otro que
 *      dice «no puedes facturar la comisión» no pueden verse iguales.
 *   2. La tabla POR TIPO: con qué resolución se numera cada cosa hoy y cuál es
 *      el próximo número. Es la respuesta a «¿puedo facturar el canon?», que es
 *      la única pregunta que trae a alguien acá.
 *
 * 🔴 Cuando una fila numera «por la general» se DICE: la inmobiliaria que se
 * tomó el trabajo de separar sus rangos tiene que enterarse de que uno de sus
 * tipos está saliendo por el rango de todo.
 *
 * 🔴 Y sin la migración (`porTipoDisponible: false`) esto no se pinta: la
 * numeración por tipo todavía no existe en esa base y una tabla que promete lo
 * que no hay es peor que no mostrarla.
 *
 * 🔴 QA-FACT (03-10-2026), FA-08 / FA-14: sin ninguna resolución el mismo
 * párrafo salía una vez por tipo en el aviso y otra en cada fila. Ahora: sin
 * ninguna, el aviso de arriba de la pestaña lo dice y acá no se repite; los
 * tipos sin resolución van en UNA línea; la fila dice «Sin resolución», no el
 * párrafo; y la nota crédito dice que lleva su consecutivo propio (no usa
 * resolución), en vez de «numera con LABQA».
 */

import { SealCheck, SealWarning, Warning } from '@phosphor-icons/react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ResolucionesDeLaAgencia } from '@/lib/api/facturacion-por-mes.service'
import { TIPOS_EN_ORDEN } from '@/lib/api/facturacion-electronica.service'
import { sinLaRutaDeFacturacion } from '@/lib/facturacion/por-facturar'

/** «a, b y c». */
function enUnaFrase(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

export interface NumeracionPorTipoProps {
  datos: ResolucionesDeLaAgencia
}

export function NumeracionPorTipo({ datos }: NumeracionPorTipoProps) {
  if (!datos.porTipoDisponible) return null

  /** Ningún tipo tiene resolución: el aviso de arriba de la pestaña ya lo dice. */
  const ninguna = datos.porTipo.every((t) => t.resolucionId === null)
  const bloqueos = ninguna
    ? []
    : datos.avisos.filter((a) => a.clase === 'BLOQUEA' && a.tipo !== 'NOTA_CREDITO')
  /** Los tipos sin ninguna resolución, juntos en UNA línea. */
  const sinResolucion = bloqueos.filter((a) => a.motivo === 'SIN_RESOLUCION')
  const otrosBloqueos = bloqueos.filter((a) => a.motivo !== 'SIN_RESOLUCION')
  const nombreDe = new Map(datos.porTipo.map((t) => [t.tipo, t.nombre]))
  const advertencias = datos.avisos.filter((a) => a.clase === 'ADVIERTE')
  const orden = new Map(TIPOS_EN_ORDEN.map((t, i) => [t, i]))
  const porTipo = [...datos.porTipo].sort(
    (a, b) => (orden.get(a.tipo) ?? 99) - (orden.get(b.tipo) ?? 99),
  )

  return (
    <div className="space-y-4" data-testid="numeracion-por-tipo">
      {bloqueos.length > 0 && (
        <div
          className="rounded-lg border border-danger/30 bg-danger-soft p-3 space-y-2"
          data-testid="numeracion-bloqueos"
        >
          <div className="flex items-center gap-2">
            <SealWarning
              className="w-5 h-5 text-danger flex-shrink-0"
              weight="fill"
            />
            <p className="text-caption font-semibold text-danger">
              {bloqueos.length === 1
                ? 'Hay un tipo de documento que hoy no se puede numerar'
                : `Hay ${bloqueos.length} tipos de documento que hoy no se pueden numerar`}
            </p>
          </div>
          <ul className="space-y-1 pl-7">
            {sinResolucion.length > 0 && (
              <li className="text-caption text-fg" data-testid="aviso-bloquea-sin-resolucion">
                {enUnaFrase(sinResolucion.map((a) => nombreDe.get(a.tipo) ?? a.tipo))}{' '}
                {sinResolucion.length === 1 ? 'no tiene' : 'no tienen'} una resolución que{' '}
                {sinResolucion.length === 1 ? 'lo numere' : 'los numere'}. Carga una de ese
                tipo, o una sin tipo, que numera todo.
              </li>
            )}
            {otrosBloqueos.map((a) => (
              <li
                key={`${a.tipo}-${a.motivo}`}
                className="text-caption text-fg"
                data-testid={`aviso-bloquea-${a.tipo}`}
              >
                {sinLaRutaDeFacturacion(a.explicacion)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {advertencias.length > 0 && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 space-y-2"
          data-testid="numeracion-advertencias"
        >
          <div className="flex items-center gap-2">
            <Warning
              className="w-5 h-5 text-warning flex-shrink-0"
              weight="fill"
            />
            <p className="text-caption font-semibold text-warning">
              Pídele a la DIAN la resolución siguiente antes de quedarte sin
              numeración
            </p>
          </div>
          <ul className="space-y-1 pl-7">
            {advertencias.map((a) => (
              <li
                key={`${a.tipo}-${a.motivo}`}
                className="text-caption text-fg"
                data-testid={`aviso-advierte-${a.tipo}`}
              >
                {a.explicacion}
              </li>
            ))}
          </ul>
          <p className="text-caption text-fg-muted pl-7">
            Te avisamos cuando quedan {datos.umbrales.numeros} números o faltan{' '}
            {datos.umbrales.dias} días para el vencimiento.
          </p>
        </div>
      )}

      <section
        className="rounded-lg border border-border bg-surface overflow-hidden"
        data-testid="numeracion-tabla"
      >
        <div className="border-b border-border p-4">
          <h3 className="text-body font-semibold text-fg">
            Con qué se numera cada documento
          </h3>
          <p className="text-caption text-fg-muted">
            Cada tipo puede tener su propia resolución y su propio prefijo. Una
            resolución sin tipo numera todo.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Documento</TableHead>
                <TableHead className="whitespace-nowrap">Resolución</TableHead>
                <TableHead className="whitespace-nowrap">Prefijo</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Disponibles
                </TableHead>
                <TableHead className="whitespace-nowrap">Próximo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porTipo.map((t) =>
                t.tipo === 'NOTA_CREDITO' ? (
                  /* 🔴 FA-14 / FA-R34: ninguna nota crédito usa resolución. */
                  <TableRow key={t.tipo} data-testid={`numeracion-${t.tipo}`}>
                    <TableCell className="text-fg">{t.nombre}</TableCell>
                    <TableCell colSpan={4} className="text-caption text-fg-muted">
                      No usa resolución: lleva su consecutivo propio (NC-1, NC-2…).
                    </TableCell>
                  </TableRow>
                ) : (
                <TableRow key={t.tipo} data-testid={`numeracion-${t.tipo}`}>
                  <TableCell className="text-fg">
                    <span className="inline-flex items-center gap-1.5">
                      {t.puedeNumerar ? (
                        <SealCheck
                          className="w-4 h-4 text-success flex-shrink-0"
                          weight="fill"
                        />
                      ) : (
                        <SealWarning
                          className="w-4 h-4 text-danger flex-shrink-0"
                          weight="fill"
                        />
                      )}
                      {t.nombre}
                    </span>
                    {t.puedeNumerar && t.porLaGeneral && (
                      <p className="text-caption text-fg-muted pl-[22px]">
                        Numera con la resolución general (no tiene una propia).
                      </p>
                    )}
                    {/* El porqué largo va UNA vez en el aviso de arriba. */}
                    {!t.puedeNumerar && (
                      <p className="text-caption text-danger pl-[22px]">
                        {t.resolucionId === null ? 'Sin resolución' : 'No numera hoy'}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                    {t.resolucionNumero ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-fg-muted">
                    {t.prefijo || '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                    {t.puedeNumerar ? t.disponibles.toLocaleString('es-CO') : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg">
                    {t.siguiente ?? '—'}
                  </TableCell>
                </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
