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
import { leadsApi, type RenglonPorOrigen } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { useCrm } from '@/lib/hooks/use-crm'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  PLAZO_PARA_RESPONDER_MAXIMO_HORAS,
  PLAZO_PARA_RESPONDER_MINIMO_HORAS,
  revisarPlazoParaResponder,
} from '@/lib/pipeline/limites-del-lead'
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/** El primer día del mes en curso, en `YYYY-MM-DD`. */
function primeroDelMes(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function OrigenesClient() {
  // Ronda 21 (390): una tarjeta por portal con interesados; la tabla se encogía y cortaba «Interesados».
  const esCelular = useIsMobile()
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
                No hay costo por interesado: Leasefy no sabe cuánto pagas por cada portal, y un costo inventado sería peor que
                no tenerlo.
              </p>
            </div>
          </ParaEntenderMas>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Por portal</CardTitle>
          {/* Ronda 21: una barra, «Entró: [desde] – [hasta]» (antes dos campos con la etiqueta flotando encima). */}
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto" role="group" aria-label="Cuándo entraron los interesados">
            {/* Ronda 22 (390): «Entró» en su renglón; las dos fechas se reparten el ancho (salían «1 oct 2…»). */}
            <span className="col-span-3 text-body-sm text-fg-muted sm:col-span-1">Entró</span>
            <Label htmlFor="desde" className="sr-only">Desde</Label>
            <CampoDeDia
              id="desde"
              value={desde}
              onChange={(v) => setDesde(v)}
              className="w-full sm:w-40"
              testid="filtro-desde"
            />
            <span className="text-fg-subtle" aria-hidden="true">–</span>
            <Label htmlFor="hasta" className="sr-only">Hasta</Label>
            <CampoDeDia
              id="hasta"
              value={hasta}
              onChange={(v) => setHasta(v)}
              className="w-full sm:w-40"
              testid="filtro-hasta"
            />
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
                // Revisora r22 (#3): la lectura en renglones con su punto, sin caja con borde dentro de la tarjeta.
                <div className="mb-4 space-y-1 text-sm text-fg-muted" data-testid="lectura">
                  {mejor ? (
                    <p className="flex items-baseline gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                      <span>
                      Lo que más produjo: <strong>{mejor.nombre}</strong>, con{' '}
                      {mejor.cerrados} arriendo{mejor.cerrados === 1 ? '' : 's'}{' '}
                      de {mejor.leads} {mejor.leads === 1 ? 'interesado' : 'interesados'}.
                      </span>
                    </p>
                  ) : null}
                  {peor ? (
                    <p className="flex items-baseline gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                      <span>
                      <strong>{peor.nombre}</strong> trajo {peor.leads} {peor.leads === 1 ? 'interesado' : 'interesados'}{' '}
                      y no cerró ninguno en este
                      rango. Míralo antes de renovar esa cuenta.
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
              {esCelular ? (
                <PortalesEnTarjetas renglones={renglones} />
              ) : (
              // Revisora r22 (Orígenes #2): el `Table` de Cadence (cabeceras en mono MAYÚSCULA, como todas) y el
              // total también en mono, en vez de un <table> hecho a mano.
              <Table data-testid="tabla-por-origen">
                <TableHeader>
                  <TableRow>
                    <TableHead>Origen</TableHead>
                    {/* 🔴 «Cerrados» primero: es la columna que decide. */}
                    <TableHead className="text-right">Arriendos cerrados</TableHead>
                    <TableHead className="text-right">Interesados</TableHead>
                    <TableHead className="text-right">Conversión</TableHead>
                    <TableHead className="text-right">Abiertos</TableHead>
                    <TableHead className="text-right">Perdidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renglones.map((r) => (
                    <TableRow key={r.origen} data-testid={`fila-${r.origen}`}>
                      {/* Ronda 21: un portal sin interesados sale en CERO (decisión), pero atenuado; y en
                          vez de «0 %», la conversión dice «sin interesados» (un 0 % sin nadie no es un dato). */}
                      <TableCell className={cn(r.leads === 0 && 'text-fg-muted')}>{r.nombre}</TableCell>
                      <TableCell className={cn('text-right font-mono tabular-nums', r.leads === 0 ? 'text-fg-subtle' : 'font-medium text-fg')}>
                        {r.cerrados}
                      </TableCell>
                      <TableCell className={cn('text-right font-mono tabular-nums', r.leads === 0 && 'text-fg-subtle')}>
                        {r.leads}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.leads === 0 ? (
                          <span className="text-caption text-fg-subtle">sin interesados</span>
                        ) : (
                          <span className="font-mono">{r.conversion} %</span>
                        )}
                      </TableCell>
                      <TableCell className={cn('text-right font-mono tabular-nums', r.leads === 0 && 'text-fg-subtle')}>
                        {r.abiertos}
                      </TableCell>
                      <TableCell className={cn('text-right font-mono tabular-nums', r.leads === 0 && 'text-fg-subtle')}>
                        {r.perdidos}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {totales ? (
                  <TableFooter>
                    <TableRow data-testid="fila-totales">
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-medium">{totales.cerrados}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{totales.leads}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{totales.conversion} %</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{totales.abiertos}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{totales.perdidos}</TableCell>
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
              )}

            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>

      {/* El plazo de respuesta (B-01). Va en la misma pantalla porque es la otra
          mitad del tema (de nada sirve saber qué portal trae leads si nadie los
          contesta), pero DESPUÉS del informe: se configura una vez y el informe
          se consulta cada mes (glow up 21-10). */}
      {/* Ronda 21: es un ajuste, no parte del informe: plegado debajo. */}
      <MasDetalles etiqueta="Ajuste: cuánto tiene el asesor para responder" montadoSiempre>
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
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {/* Ronda 21: las pastillas dicen para qué son. */}
                  <span className="text-caption text-fg-muted">Orígenes que se registran:</span>
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
      </MasDetalles>

    </div>
  )
}

type RenglonDeOrigen = RenglonPorOrigen

/** A 390: una tarjeta por portal con interesados; los que no trajeron nada, en un renglón. */
function PortalesEnTarjetas({ renglones }: { renglones: readonly RenglonDeOrigen[] }) {
  const conGente = renglones.filter((r) => r.leads > 0)
  const enCero = renglones.filter((r) => r.leads === 0)
  return (
    // Revisora r22 (#3): sin cajas con borde dentro de la tarjeta: cada portal separado por una línea.
    <div className="divide-y divide-border-faint" data-testid="portales-en-tarjetas">
      {conGente.map((r) => (
        <div key={r.origen} className="py-3 first:pt-0" data-testid={`tarjeta-${r.origen}`}>
          <p className="font-medium text-fg">{r.nombre}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-body-sm">
            <div>
              <dt className="text-caption text-fg-muted">Cerrados</dt>
              <dd className="font-mono font-semibold tabular-nums text-fg">{r.cerrados}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">Interesados</dt>
              <dd className="font-mono tabular-nums text-fg">{r.leads}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">Conversión</dt>
              <dd className="font-mono tabular-nums text-fg">{r.conversion} %</dd>
            </div>
          </dl>
        </div>
      ))}
      {enCero.length > 0 ? (
        <p className="text-caption text-fg-muted">
          Sin interesados: {enCero.map((r) => r.nombre).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
