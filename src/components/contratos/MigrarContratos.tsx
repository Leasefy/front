'use client'

/**
 * MigrarContratos — traer la cartera viva desde otro sistema.
 *
 * Es la puerta por la que entra una inmobiliaria que ya viene arrendando: sus
 * contratos activos nunca pasaron por una postulación acá, así que el flujo
 * normal no les sirve.
 *
 * ── Tres cosas que la pantalla hace a propósito ─────────────────────────────
 *
 * 1. **Muestra POR QUÉ mapeó cada columna.** El auto-mapeo se equivoca con
 *    confianza alta —«Celular arrendatario» ya terminó guardado como teléfono
 *    del propietario— y un mapeo sin explicación sólo se puede aceptar o
 *    rechazar entero.
 * 2. **No deja importar sin el uso del inmueble.** Vivienda va sin IVA y
 *    comercial con IVA: un contrato sin ese dato no se puede liquidar, y las
 *    dos facturas se ven igual de correctas.
 * 3. **El reporte final distingue creado / omitido / fallido, con la fila.**
 *    Un "1.200 procesados" que esconde 300 saltados es peor que un error.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle,
  FileArrowUp,
  Info,
  Warning,
  XCircle,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile'
import {
  faltantes,
  mapearColumnas,
  type CampoDeContrato,
  type MapeoDeColumna,
} from '@/lib/contratos/columnas-de-contrato'
import {
  contractsApi,
  type ContratoAMigrar,
  type ResumenMigracion,
} from '@/lib/api/contracts.service'
import { propertiesApi } from '@/lib/api/properties.service'
import {
  comoEntero,
  comoFecha,
  comoUso,
  normalizar,
  textoOpcional,
  valorDe,
} from '@/lib/contratos/leer-celdas'

const NOMBRE_DE_CAMPO: Record<CampoDeContrato, string> = {
  direccionInmueble: 'Dirección del inmueble',
  inquilinoNombre: 'Nombre del inquilino',
  inquilinoCorreo: 'Correo del inquilino',
  inquilinoTelefono: 'Teléfono del inquilino',
  inquilinoDocumento: 'Documento del inquilino',
  fechaInicio: 'Fecha de inicio',
  fechaFin: 'Fecha de terminación',
  canon: 'Canon',
  deposito: 'Depósito',
  diaDePago: 'Día de pago',
  uso: 'Uso del inmueble',
  periodicidad: 'Periodicidad',
  comision: 'Comisión',
}

type Fila = Record<string, unknown>

export function MigrarContratos() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([])
  const [invitar, setInvitar] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenMigracion | null>(null)

  const faltan = useMemo(() => faltantes(mapeo), [mapeo])

  const leerArchivo = useCallback(async (archivo: File) => {
    setError(null)
    setResumen(null)
    try {
      const { rows, headers } = await parseSpreadsheetFile(archivo)
      setFilas(rows as Fila[])
      setMapeo(mapearColumnas(headers))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos leer el archivo.')
      setFilas([])
      setMapeo([])
    }
  }, [])

  const importar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      /*
       * El archivo trae la DIRECCIÓN del inmueble, no su id: el sistema viejo
       * no conoce nuestros uuid. Hay que resolverla contra el portafolio ya
       * cargado — por eso migrar inmuebles va primero.
       */
      const inmuebles = await propertiesApi.getMine()
      const porDireccion = new Map(
        inmuebles.map((p) => [normalizar(p.address ?? ''), p.id]),
      )

      const contratos: ContratoAMigrar[] = []
      const sinInmueble: number[] = []

      filas.forEach((fila, i) => {
        const v = (campo: CampoDeContrato) => valorDe(fila, mapeo, campo)
        const direccion = normalizar(String(v('direccionInmueble') ?? ''))
        const propertyId = porDireccion.get(direccion)
        if (!propertyId) {
          sinInmueble.push(i)
          return
        }
        contratos.push({
          propertyId,
          inquilino: {
            nombre: String(v('inquilinoNombre') ?? ''),
            correo: String(v('inquilinoCorreo') ?? ''),
            telefono: textoOpcional(v('inquilinoTelefono')),
            documento: textoOpcional(v('inquilinoDocumento')),
          },
          startDate: comoFecha(v('fechaInicio')),
          endDate: comoFecha(v('fechaFin')),
          monthlyRent: comoEntero(v('canon')),
          deposit: v('deposito') != null ? comoEntero(v('deposito')) : undefined,
          paymentDay: comoEntero(v('diaDePago')) || 1,
          usoInmueble: comoUso(v('uso')),
          comisionPorcentaje:
            v('comision') != null ? Number(v('comision')) || undefined : undefined,
          invitar,
        })
      })

      const r = await contractsApi.migrar(contratos)

      /*
       * Las filas cuyo inmueble no encontramos NO llegaron al back, así que su
       * ausencia no aparecería en el resumen. Sumarlas acá es lo que evita que
       * la pantalla diga "800 procesados" cuando el archivo traía 1.200.
       */
      setResumen({
        ...r,
        total: filas.length,
        fallidos: r.fallidos + sinInmueble.length,
        sinCartera: r.sinCartera,
        resultados: [
          ...r.resultados,
          ...sinInmueble.map((fila) => ({
            fila,
            estado: 'fallido' as const,
            inquilinoInvitado: false,
            motivo: 'No encontramos ese inmueble en tu portafolio',
          })),
        ],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos importar los contratos.')
    } finally {
      setCargando(false)
    }
  }, [filas, mapeo, invitar])

  if (resumen) {
    return <Reporte resumen={resumen} onVolver={() => setResumen(null)} />
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center hover:bg-muted/40">
          <FileArrowUp className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Subí el archivo de contratos
            </p>
            <p className="text-xs text-muted-foreground">
              Excel o CSV exportado de tu sistema actual
            </p>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.txt,.tsv,.ods"
            className="sr-only"
            data-testid="archivo-contratos"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void leerArchivo(f)
            }}
          />
        </label>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-foreground">{error}</p>
          </div>
        ) : null}
      </Card>

      {mapeo.length > 0 ? (
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-sm font-medium text-foreground">
              Así entendimos tus columnas
            </h2>
            <p className="text-xs text-muted-foreground">
              {filas.length} contratos en el archivo. Revisá el mapeo antes de
              importar: «arrendador» es el propietario y «arrendatario» es el
              inquilino, y se parecen demasiado.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna del archivo</TableHead>
                  <TableHead>Campo del contrato</TableHead>
                  <TableHead>Por qué</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapeo.map((m) => (
                  <TableRow key={m.columna}>
                    <TableCell className="font-medium">{m.columna}</TableCell>
                    <TableCell>
                      {m.campo ? (
                        NOMBRE_DE_CAMPO[m.campo]
                      ) : (
                        <span className="text-muted-foreground">Sin usar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.porque ? `coincidió con «${m.porque}»` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {faltan.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft p-3">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="space-y-1 text-sm text-foreground">
                <p className="font-medium">
                  Falta {faltan.length === 1 ? 'una columna' : `${faltan.length} columnas`}
                </p>
                <p className="text-muted-foreground">
                  {faltan.map((c) => NOMBRE_DE_CAMPO[c]).join(' · ')}
                </p>
                {faltan.includes('uso') ? (
                  <p className="text-xs text-muted-foreground">
                    Sin el uso del inmueble no podemos liquidar: el arrendamiento
                    de vivienda está excluido de IVA y el comercial no.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
            <Checkbox
              id="invitar-inquilinos"
              checked={invitar}
              onCheckedChange={(c) => setInvitar(c === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground/80">
              Invitar a los inquilinos al portal
              <span className="block text-xs text-muted-foreground">
                Se manda por tandas, no todo de golpe. Si lo dejás apagado, los
                inquilinos quedan creados con su contrato pero sin recibir nada.
              </span>
            </span>
          </label>

          <Button
            onClick={() => void importar()}
            disabled={faltan.length > 0 || filas.length === 0 || cargando}
            isLoading={cargando}
            hideArrow
          >
            Importar {filas.length} contratos
          </Button>
        </Card>
      ) : null}
    </div>
  )
}

function Reporte({
  resumen,
  onVolver,
}: {
  resumen: ResumenMigracion
  onVolver: () => void
}) {
  const problemas = resumen.resultados.filter((r) => r.estado !== 'creado')

  return (
    <Card className="space-y-5 p-6" data-testid="reporte-migracion">
      <div className="grid gap-3 sm:grid-cols-4">
        <Dato etiqueta="En el archivo" valor={resumen.total} />
        <Dato etiqueta="Creados" valor={resumen.creados} tono="ok" />
        <Dato etiqueta="Ya estaban" valor={resumen.omitidos} />
        <Dato etiqueta="Fallaron" valor={resumen.fallidos} tono="mal" />
      </div>

      {resumen.sinCartera > 0 ? (
        /*
         * Los cobros se generan desde la consignación del inmueble, no desde
         * el contrato. Callar esto dejaría a la inmobiliaria mirando una
         * cartera vacía que se lee igual que "nadie te debe nada".
         */
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="space-y-1 text-sm text-foreground">
            <p className="font-medium">
              {resumen.sinCartera}{' '}
              {resumen.sinCartera === 1 ? 'contrato entró' : 'contratos entraron'} sin
              cartera
            </p>
            <p className="text-muted-foreground">
              Sus inmuebles no tienen una consignación activa, y los cobros se
              generan desde ahí. Los contratos quedaron cargados, pero no van a
              producir cobros hasta que consignes esos inmuebles.
            </p>
          </div>
        </div>
      ) : null}

      {resumen.invitados > 0 ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Se invitaron {resumen.invitados} inquilinos al portal.
        </p>
      ) : null}

      {problemas.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Qué revisar</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>Qué pasó</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problemas.map((r) => (
                  <TableRow key={`${r.fila}-${r.estado}`}>
                    {/* +1: en el archivo la primera fila de datos es la 2, no la 0. */}
                    <TableCell className="tabular-nums">{r.fila + 2}</TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        {r.estado === 'fallido' ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Info className="h-4 w-4 text-muted-foreground" />
                        )}
                        {r.motivo}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Corregí esas filas y volvé a subir el mismo archivo: los que ya
            entraron no se duplican.
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle className="h-4 w-4 text-success" weight="fill" />
          Entraron todos.
        </p>
      )}

      <Button variant="outline" onClick={onVolver} hideArrow>
        Importar otro archivo
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </Card>
  )
}

function Dato({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string
  valor: number
  tono?: 'ok' | 'mal'
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p
        className={`text-xl font-semibold tabular-nums ${
          tono === 'ok' && valor > 0
            ? 'text-success'
            : tono === 'mal' && valor > 0
              ? 'text-destructive'
              : 'text-foreground'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}
