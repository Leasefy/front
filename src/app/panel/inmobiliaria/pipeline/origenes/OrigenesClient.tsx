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

import { nombreDelOrigen } from '@/lib/pipeline/nombre-del-origen';
import { useMemo, useState } from 'react'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { TrendUp } from '@phosphor-icons/react'

import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
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
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  PLAZO_PARA_RESPONDER_MAXIMO_HORAS,
  PLAZO_PARA_RESPONDER_MINIMO_HORAS,
  revisarPlazoParaResponder,
} from '@/lib/pipeline/limites-del-lead'
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';

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
  // Lo que el servidor rechazó al guardar (02-10-2026). Antes no había
  // `catch`: un 400 o un 500 dejaban la promesa sin atrapar y la pantalla
  // callada, como si se hubiera guardado.
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null)
  // El mismo rango que el back (`GuardarConfiguracionComercialDto`), antes de mandar.
  const errorDelCliente = revisarPlazoParaResponder(horas)
  const errorDelPlazo = errorDelCliente ?? falloAlGuardar ?? undefined

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
    if (revisarPlazoParaResponder(horas)) return
    const n = Number(horas.trim())
    setGuardando(true)
    setFalloAlGuardar(null)
    try {
      await leadsApi.guardarConfiguracion({ horasParaResponderLead: n })
      invalidar('pipeline')
      setHoras('')
    } catch (e) {
      // Un solo campo: lo del servidor (por campo o suelto) va debajo de él.
      const reparto = repartirErroresDelServidor(e, {
        campos: ['horasParaResponderLead'],
        porDefecto: 'No se pudo guardar el plazo. Prueba de nuevo en un momento.',
        accion: 'guardar el plazo',
      })
      setFalloAlGuardar(reparto.porCampo.horasParaResponderLead ?? reparto.sueltos.join(' · '))
      document.getElementById('horas-lead')?.focus()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Captación y arriendo"
        titulo="Origen de los interesados"
        descripcion="Cuántos interesados trajo cada portal y cuántos terminaron en arriendo: con eso se decide qué cuenta seguir pagando."
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: origen de los interesados" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                La columna que decide es «Arriendos cerrados», no «Interesados»: un portal que trae 400 interesados y no cierra
                ninguno vale menos que uno que trae 12 y cierra 3.
              </p>
              <p>
                Un portal configurado que no trajo nada sale en cero, no desaparece: ese cero es el dato con el que se
                cancela una cuenta.
              </p>
              <p>
                No hay costo por lead: Leasefy no sabe cuánto pagas por cada portal, y un costo inventado sería peor que
                no tenerlo.
              </p>
            </div>
          </ParaEntenderMas>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle className="text-base">Por portal</CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="desde">Desde</Label>
              <CampoDeDia
                id="desde"
                value={desde}
                onChange={(v) => setDesde(v)}
                className="w-40"
                testid="filtro-desde"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hasta">Hasta</Label>
              <CampoDeDia
                id="hasta"
                value={hasta}
                onChange={(v) => setHasta(v)}
                className="w-40"
                testid="filtro-hasta"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {informe.noHabilitado ? (
            <p className="text-muted-foreground text-sm" data-testid="informe-no-habilitado">
              {motivoEnCristiano(informe.noHabilitado)}
            </p>
          ) : (
            <EstadoDeDatos
              principal
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
                  title="Todavía no hay interesados en este rango"
                  description="Cuando entren interesados con su origen, aquí se ve cuántos trajo cada portal y cuántos cerraron."
                />
              }
            >
              {/* La lectura, dicha en palabras y ANTES de la tabla (glow up 21-10):
                  la conclusión es lo que se vino a buscar; la tabla la respalda. */}
              {mejor || peor ? (
                <div className="mb-4 space-y-1 rounded-lg border border-border bg-surface p-4 text-sm text-fg-muted" data-testid="lectura">
                  {mejor ? (
                    <p>
                      Lo que más produjo: <strong>{mejor.nombre}</strong>, con{' '}
                      {mejor.cerrados} arriendo{mejor.cerrados === 1 ? '' : 's'}{' '}
                      de {mejor.leads} lead{mejor.leads === 1 ? '' : 's'}.
                    </p>
                  ) : null}
                  {peor ? (
                    <p>
                      <strong>{peor.nombre}</strong> trajo {peor.leads} {peor.leads === 1 ? 'interesado' : 'interesados'}{' '}
                      y no cerró ninguno en este
                      rango. Míralo antes de renovar esa cuenta.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="tabla-por-origen">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left">
                      <th className="py-2 pr-4 font-medium">Origen</th>
                      {/* 🔴 «Cerrados» primero: es la columna que decide. */}
                      <th className="py-2 pr-4 text-right font-medium">
                        Arriendos cerrados
                      </th>
                      <th className="py-2 pr-4 text-right font-medium">Interesados</th>
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
                              sin interesados
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

            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>

      {/* El plazo de respuesta (B-01). Va en la misma pantalla porque es la otra
          mitad del tema (de nada sirve saber qué portal trae leads si nadie los
          contesta), pero DESPUÉS del informe: se configura una vez y el informe
          se consulta cada mes (glow up 21-10). */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Cuánto tiene el asesor para responder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {configuracion.noHabilitado ? (
            <p className="text-muted-foreground text-sm" data-testid="config-no-habilitada">
              {motivoEnCristiano(configuracion.noHabilitado)}
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
                . Pasado el plazo, el interesado pasa al siguiente asesor del turno y
                queda el registro de quién lo tenía.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="horas-lead">Horas</Label>
                  <Input
                    id="horas-lead"
                    type="number"
                    min={PLAZO_PARA_RESPONDER_MINIMO_HORAS}
                    max={PLAZO_PARA_RESPONDER_MAXIMO_HORAS}
                    value={horas}
                    onChange={(e) => {
                      setHoras(e.target.value)
                      setFalloAlGuardar(null)
                    }}
                    aria-invalid={errorDelPlazo ? true : undefined}
                    aria-describedby={errorDelPlazo ? 'horas-lead-error' : undefined}
                    placeholder={String(
                      configuracion.datos?.horasParaResponderLead ?? 24,
                    )}
                    className="w-28"
                    data-testid="input-horas-lead"
                  />
                </div>
                <Button
                  onClick={guardarPlazo}
                  disabled={guardando || horas.trim() === '' || Boolean(errorDelCliente)}
                  data-testid="guardar-horas-lead"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
              <ErrorDelCampo id="horas-lead-error" mensaje={errorDelPlazo} className="mt-0" />
              {configuracion.datos?.origenesDeLead?.length ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {configuracion.datos.origenesDeLead.map((o) => (
                    <Badge key={o} variant="secondary">
                      {nombreDelOrigen(o)}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
