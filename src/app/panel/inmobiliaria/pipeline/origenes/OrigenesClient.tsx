'use client'

/**
 * OrigenesClient — leads y arriendos cerrados POR PORTAL, y la configuración
 * comercial de la inmobiliaria.
 *
 * ── Qué contesta esta pantalla ─────────────────────────────────────────────
 *
 * «Informe por origen (leads y arriendos cerrados por portal) para saber qué
 * portal vale la pena pagar» (Nico, 17-09-2026) y B-07 del formulario.
 *
 * ── Las dos decisiones de presentación ─────────────────────────────────────
 *
 *   1. **la columna que se lee primero es «cerrados», no «leads»**. Un portal
 *      que trae 400 leads y no cierra ninguno es peor que uno que trae 12 y
 *      cierra 3, y ordenar por volumen invita a la conclusión contraria.
 *   2. **un portal configurado que no trajo nada sale en CERO, no desaparece**.
 *      «Metrocuadrado: 0 leads este mes» es exactamente el dato por el que se
 *      cancela una cuenta, y una fila ausente no se lee.
 *
 * 🔴 No hay costo por lead ni retorno: la inmobiliaria no le dice a Leasefy
 * cuánto paga por cada portal, y un «costo por lead» inventado es peor que no
 * tenerlo.
 */

import { useMemo, useState } from 'react'
import { TrendUp } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { KpiValor } from '@/components/estado/KpiValor'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
} from '@/components/ui'
import { leadsApi } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { useCrm } from '@/lib/hooks/use-crm'

/** El primer día del mes en curso, en `YYYY-MM-DD`. */
function primeroDelMes(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function OrigenesClient() {
  const [desde, setDesde] = useState(primeroDelMes)
  const [hasta, setHasta] = useState(hoyIso)

  const informe = useCrm(
    () => leadsApi.informePorOrigen({ desde, hasta }),
    [desde, hasta],
    ['pipeline'],
  )
  const configuracion = useCrm(() => leadsApi.configuracion(), [], ['pipeline'])

  const [guardando, setGuardando] = useState(false)
  const [horas, setHoras] = useState<string>('')

  const renglones = informe.datos?.renglones ?? []
  const totales = informe.datos?.totales
  const vacio = renglones.length === 0

  const mejor = useMemo(
    () => renglones.find((r) => r.cerrados > 0) ?? null,
    [renglones],
  )
  const peor = useMemo(
    () =>
      [...renglones]
        .filter((r) => r.leads > 0 && r.cerrados === 0)
        .sort((a, b) => b.leads - a.leads)[0] ?? null,
    [renglones],
  )

  async function guardarPlazo() {
    const n = Number.parseInt(horas, 10)
    if (!Number.isInteger(n) || n < 1) return
    setGuardando(true)
    try {
      await leadsApi.guardarConfiguracion({ horasParaResponderLead: n })
      invalidar('pipeline')
      setHoras('')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Origen de los leads
        </h1>
        <p className="text-muted-foreground text-sm">
          Cuántos leads trajo cada portal y cuántos terminaron en arriendo. Es
          con lo que se decide qué cuenta seguir pagando.
        </p>
      </header>

      {/* El plazo de respuesta (B-01). Va acá porque es la otra mitad del
          mismo tema: de nada sirve saber qué portal trae leads si nadie los
          contesta. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Cuánto tiene el asesor para responder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {configuracion.noHabilitado ? (
            <p className="text-muted-foreground text-sm" data-testid="config-no-habilitada">
              Próximamente: {configuracion.noHabilitado}
            </p>
          ) : (
            <>
              <p className="text-sm">
                Hoy:{' '}
                <strong>
                  <KpiValor
                    cargando={configuracion.cargando}
                    fallo={configuracion.errorCrudo}
                  >
                    {configuracion.datos?.horasParaResponderLead} horas
                  </KpiValor>
                </strong>
                . Pasado el plazo, el lead pasa al siguiente asesor del turno y
                queda el registro de quién lo tenía.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="horas-lead">Horas</Label>
                  <Input
                    id="horas-lead"
                    type="number"
                    min={1}
                    max={720}
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                    placeholder={String(
                      configuracion.datos?.horasParaResponderLead ?? 24,
                    )}
                    className="w-28"
                    data-testid="input-horas-lead"
                  />
                </div>
                <Button
                  onClick={guardarPlazo}
                  disabled={guardando || horas.trim() === ''}
                  data-testid="guardar-horas-lead"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
              {configuracion.datos?.origenesDeLead?.length ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {configuracion.datos.origenesDeLead.map((o) => (
                    <Badge key={o} variant="secondary">
                      {o}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle className="text-base">Por portal</CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="desde">Desde</Label>
              <Input
                id="desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-40"
                data-testid="filtro-desde"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hasta">Hasta</Label>
              <Input
                id="hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-40"
                data-testid="filtro-hasta"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {informe.noHabilitado ? (
            <p className="text-muted-foreground text-sm" data-testid="informe-no-habilitado">
              Próximamente: {informe.noHabilitado}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={informe.cargando}
              error={informe.errorCrudo}
              vacio={vacio}
              queEs="el informe por origen"
              onReintentar={informe.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={5} columnas={6} />}
              cuandoVacio={
                <EmptyState
                  icon={TrendUp}
                  title="Todavía no hay leads en este rango"
                  description="Cuando entren leads con su origen, acá se ve cuántos trajo cada portal y cuántos cerraron."
                />
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="tabla-por-origen">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left">
                      <th className="py-2 pr-4 font-medium">Origen</th>
                      {/* 🔴 «Cerrados» primero: es la columna que decide. */}
                      <th className="py-2 pr-4 text-right font-medium">
                        Arriendos cerrados
                      </th>
                      <th className="py-2 pr-4 text-right font-medium">Leads</th>
                      <th className="py-2 pr-4 text-right font-medium">
                        Conversión
                      </th>
                      <th className="py-2 pr-4 text-right font-medium">Abiertos</th>
                      <th className="py-2 text-right font-medium">Perdidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renglones.map((r) => (
                      <tr
                        key={r.origen}
                        className="border-b last:border-0"
                        data-testid={`fila-${r.origen}`}
                      >
                        <td className="py-2 pr-4">
                          {r.nombre}
                          {r.leads === 0 ? (
                            <Badge variant="outline" className="ml-2">
                              sin leads
                            </Badge>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                          {r.cerrados}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {r.leads}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {r.conversion} %
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {r.abiertos}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {r.perdidos}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totales ? (
                    <tfoot>
                      <tr className="font-medium" data-testid="fila-totales">
                        <td className="py-2 pr-4">Total</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {totales.cerrados}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {totales.leads}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {totales.conversion} %
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {totales.abiertos}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {totales.perdidos}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>

              {/* La lectura, dicha en palabras: el número solo no decide. */}
              {mejor || peor ? (
                <div className="text-muted-foreground mt-4 space-y-1 text-sm" data-testid="lectura">
                  {mejor ? (
                    <p>
                      Lo que más produjo: <strong>{mejor.nombre}</strong>, con{' '}
                      {mejor.cerrados} arriendo{mejor.cerrados === 1 ? '' : 's'}{' '}
                      de {mejor.leads} lead{mejor.leads === 1 ? '' : 's'}.
                    </p>
                  ) : null}
                  {peor ? (
                    <p>
                      <strong>{peor.nombre}</strong> trajo {peor.leads} lead
                      {peor.leads === 1 ? '' : 's'} y no cerró ninguno en este
                      rango. Míralo antes de renovar esa cuenta.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
