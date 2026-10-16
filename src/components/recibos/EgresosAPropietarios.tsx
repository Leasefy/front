'use client'

/**
 * 🔴 Los egresos de la dispersión (Juan, Portofino, 15-10-2026: «¿y los recibos
 * o egresos de la dispersión?»): lo que ya se le giró a cada propietario en un
 * mes, con su extracto en PDF —el comprobante del egreso que el propietario
 * recibe—. La ruta del extracto existía en el back y ninguna pantalla la usaba.
 *
 * Sólo los GIRADOS (`completed`): lo que está por girar vive en Liquidaciones.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DownloadSimple, PaperPlaneTilt } from '@phosphor-icons/react'
import { IconButton } from '@leasefy/cadence'

import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mesesRecientes } from '@/components/inmobiliaria/pagos/DeudaDelMesPanel'
import { toast } from '@/components/ui/toast'
import { dispersionesApi } from '@/lib/api/inmobiliaria.service'
import { listaDeRecibosApi } from '@/lib/api/lista-de-recibos.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import type { Dispersion } from '@/lib/types/inmobiliaria'
import { formatCurrency } from '@/lib/format'
import { diaLegible } from '@/lib/mandato/textos'
import { nombreDelMes } from '@/lib/utils/mes'

/** `AAAA-MM` de hoy en Bogotá. */
function mesDeHoy(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' })
    .format(new Date())
    .slice(0, 7)
}

export function EgresosAPropietarios() {
  const [mes, setMes] = useState(mesDeHoy)
  // Los giros HECHOS: del mes en curso hacia atrás, dos años (el mismo selector de «Deuda del mes»).
  const meses = useMemo(() => mesesRecientes(24), [])
  const [giros, setGiros] = useState<Dispersion[] | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [bajando, setBajando] = useState<string | null>(null)

  const cargar = useCallback(() => {
    setCargando(true)
    setError(null)
    dispersionesApi
      .getAll({ month: mes, status: 'completed' })
      .then(setGiros)
      .catch((e: unknown) => setError(e ?? new Error('No se pudieron cargar los egresos.')))
      .finally(() => setCargando(false))
  }, [mes])

  useEffect(() => cargar(), [cargar])

  const ordenados = useMemo(
    () => [...(giros ?? [])].sort((a, b) => a.propietarioName.localeCompare(b.propietarioName, 'es')),
    [giros],
  )
  const total = useMemo(() => ordenados.reduce((s, g) => s + g.netToPropietario, 0), [ordenados])

  async function bajar(g: Dispersion) {
    setBajando(g.id)
    try {
      await listaDeRecibosApi.bajarExtractoDelGiro(g)
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo bajar el extracto.', accion: 'bajar el extracto' }))
    } finally {
      setBajando(null)
    }
  }

  return (
    <div className="space-y-4" data-testid="egresos-a-propietarios">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          Mes
          <Select value={mes} onValueChange={(v) => v && setMes(v)}>
            <SelectTrigger className="w-[190px]" aria-label="Mes de los egresos" data-testid="mes-de-los-egresos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  {nombreDelMes(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {giros && giros.length > 0 && (
          <p className="text-sm text-fg-muted sm:ml-auto" data-testid="resumen-de-los-egresos">
            {giros.length} {giros.length === 1 ? 'giro' : 'giros'} de {nombreDelMes(mes)} · {formatCurrency(total)} girados
          </p>
        )}
      </div>

      {error && !giros ? (
        <FalloDeCarga error={error} queEs="los egresos a propietarios" onReintentar={cargar} />
      ) : cargando && !giros ? (
        <EsqueletoTabla columnas={5} />
      ) : ordenados.length === 0 ? (
        <SinDatos
          queSon="egresos"
          icono={PaperPlaneTilt}
          titulo={`No hay giros hechos en ${nombreDelMes(mes)}`}
          descripcion="Lo que está por girar vive en Liquidaciones; aquí aparece cuando el lote queda pagado."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Propietario</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead>Girado el</TableHead>
                <TableHead className="text-right">Neto girado</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBodyAnimado>
              {ordenados.map((g) => (
                <TableRowAnimada key={g.id} data-testid={`egreso-${g.id}`}>
                  <TableCell>
                    <span className="text-fg">{g.propietarioName}</span>
                    {g.transferReference && (
                      <p className="text-caption text-fg-muted">Ref. {g.transferReference}</p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{nombreDelMes(g.month)}</TableCell>
                  <TableCell className="whitespace-nowrap">{diaLegible(g.processedAt ?? null)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-fg">
                    {formatCurrency(g.netToPropietario)}
                  </TableCell>
                  <TableCell className="text-right">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      aria-label={`Bajar el extracto de ${g.propietarioName}`}
                      title="Bajar el extracto en PDF"
                      disabled={bajando === g.id}
                      onClick={() => void bajar(g)}
                      data-testid={`extracto-${g.id}`}
                      icon={<DownloadSimple className="h-4 w-4" />}
                    />
                  </TableCell>
                </TableRowAnimada>
              ))}
            </TableBodyAnimado>
          </Table>
        </div>
      )}
    </div>
  )
}
