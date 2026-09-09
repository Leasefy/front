'use client'

/**
 * Los comprobantes de la contabilidad vieja que quedaron colgados de ESTE
 * contrato.
 *
 * ── Qué son y por qué viven acá ────────────────────────────────────────────
 *
 * Cuando una inmobiliaria migra, sube el export de comprobantes de su sistema
 * contable («Accounting Documents.csv»: 116.469 filas en el archivo real).
 * Esos comprobantes son ENCABEZADOS —prefijo, consecutivo, tipo, fecha,
 * concepto y los totales de débitos y créditos—, **sin las líneas por cuenta**,
 * así que no entran al libro diario: un asiento sin líneas no se puede imputar
 * ni cuadrar. Viven en `documentos_contables_migrados` y el back los cuelga del
 * contrato del tercero que nombra el concepto («… REF 901780503», «EGRESO POR
 * PAGO A …»).
 *
 * Sin esta sección, esa historia existe en la base y no se ve en ninguna
 * pantalla: la plata que esa persona pagó durante seis años queda cargada y
 * muda. Acá es donde alguien la consulta, que es la única razón por la que se
 * migró.
 *
 * ── El tope, y por qué se dice ─────────────────────────────────────────────
 *
 * El back devuelve los más recientes hasta `tope` (500) y además cuántos hay
 * en `total`. Dibujar 500 filas sin decir que había 1.842 es afirmar que ésas
 * son todas — el mismo error que este producto persigue en la migración. Por
 * eso el aviso sale del dato del back (`total > tope`) y no de contar filas.
 */

import { useCallback, useEffect, useState } from 'react'
import { Receipt } from '@phosphor-icons/react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { SinDatos } from '@/components/estado/SinDatos'
import { contabilidadApi, type DocumentosDeUnContrato } from '@/lib/api/contabilidad.service'
import { diaLegible } from '@/lib/contabilidad/fechas'
import { formatCurrency } from '@/lib/format'

interface Props {
  /** Sólo el id: esta sección no depende de nada más del contrato. */
  contractId: string
}

export function DocumentosContablesDelContrato({ contractId }: Props) {
  const [datos, setDatos] = useState<DocumentosDeUnContrato | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await contabilidadApi.migracion.documentos.porContrato(contractId))
    } catch (e) {
      // Un fallo NO se pinta como «este contrato no tiene comprobantes»: son
      // cosas distintas, y la segunda es una afirmación que nadie verificó.
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [contractId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const documentos = datos?.documentos ?? []
  const recortado = Boolean(datos && datos.total > datos.mostrados)

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 space-y-3"
      data-testid="documentos-contables-del-contrato"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            Comprobantes del sistema anterior
          </h3>
        </div>
        {/* El total sale del back, no del largo de la lista: con el tope de por
            medio, contar las filas visibles diría 500 para siempre. */}
        {datos && datos.total > 0 ? (
          <span className="font-mono text-sm tabular-nums text-fg-muted">
            {datos.total.toLocaleString('es-CO')}
          </span>
        ) : null}
      </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={documentos.length === 0}
        queEs="los comprobantes de este contrato"
        // 🔴 `cargar` a secas y no `() => void cargar()`: el botón espera la
        // promesa, y con `void` volvería a decir «Intentar de nuevo» pasara lo
        // que pasara.
        onReintentar={cargar}
        esqueleto={<EsqueletoTabla columnas={5} filas={4} />}
        cuandoVacio={
          <SinDatos
            queSon="comprobantes migrados"
            icono={Receipt}
            titulo="Sin comprobantes del sistema anterior"
            descripcion="Este contrato no tiene comprobantes de la contabilidad vieja colgados. Aparecen acá cuando se sube el export de comprobantes en Migración → Registros contables y el concepto nombra al inquilino o al propietario de este contrato."
          />
        }
      >
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                {/* «Monto» es el total de DÉBITOS del comprobante. El archivo
                    trae débitos y créditos por separado y en un comprobante
                    cuadrado son el mismo número; cuando no cuadran, la fila lo
                    dice en vez de elegir uno en silencio. */}
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((d) => (
                <TableRow key={d.id} data-testid="comprobante-migrado">
                  <TableCell className="whitespace-nowrap">
                    {d.tipo || '—'}
                    {d.anulado ? (
                      <span className="ml-2 text-xs text-danger">anulado</span>
                    ) : null}
                  </TableCell>
                  {/* El prefijo puede venir vacío («FV-26766» vs «26766»), y
                      el consecutivo 0 es un consecutivo: `filter(Boolean)` lo
                      borraría. */}
                  <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">
                    {d.prefijo ? `${d.prefijo}-${d.consecutivo}` : String(d.consecutivo)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{diaLegible(d.fecha)}</TableCell>
                  <TableCell className="max-w-[28rem] text-fg-muted">
                    <span className="line-clamp-2">{d.concepto || '—'}</span>
                    {d.esAnticipo ? (
                      <span className="block text-xs text-fg-subtle">
                        Anticipo
                        {d.anticipoAplicado ? ' aplicado' : ' sin aplicar'}
                        {d.terceroAnticipo ? ` · ${d.terceroAnticipo}` : ''}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                    {/* `null` es «no se pudo leer el monto» y se muestra así.
                        `formatCurrency(null)` devuelve «$ 0», que es un hecho
                        falso mostrado con total confianza. */}
                    {d.debitos === null ? '—' : formatCurrency(d.debitos)}
                    {d.descuadrado ? (
                      <span className="block text-xs font-sans text-warning">
                        descuadrado
                        {d.creditos === null
                          ? ''
                          : ` · créditos ${formatCurrency(d.creditos)}`}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </EstadoDeDatos>

      {recortado ? (
        <p className="text-xs text-fg-muted" data-testid="comprobantes-recortados">
          Se muestran los {datos!.mostrados.toLocaleString('es-CO')} más recientes
          de {datos!.total.toLocaleString('es-CO')}. Los demás están guardados —
          no se perdió ninguno—, pero acá sólo caben estos.
        </p>
      ) : null}
    </section>
  )
}
