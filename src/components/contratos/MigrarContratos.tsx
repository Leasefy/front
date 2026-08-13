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
  type FilaAMigrar,
  type FilaDeMigracion,
  type ResumenActivacion,
  type ResumenLote,
} from '@/lib/api/contracts.service'
import { FaltantesDeFila } from './FaltantesDeFila'
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
  const [lote, setLote] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenLote | null>(null)
  const [pendientes, setPendientes] = useState<FilaDeMigracion[]>([])
  const [activacion, setActivacion] = useState<ResumenActivacion | null>(null)

  const faltan = useMemo(() => faltantes(mapeo), [mapeo])

  const leerArchivo = useCallback(async (archivo: File) => {
    setError(null)
    setActivacion(null)
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

  const refrescar = useCallback(async (elLote: string) => {
    const [r, f] = await Promise.all([
      contractsApi.migracion.resumen(elLote),
      contractsApi.migracion.filas(elLote),
    ])
    setResumen(r)
    setPendientes(f.filter((x) => x.estado === 'PENDIENTE'))
  }, [])

  /**
   * Paso 1: preparar. NO crea contratos.
   *
   * La dirección viaja como texto, no como uuid: el sistema del que se migra
   * no conoce nuestros ids, y resolverla es justamente lo que el back hace con
   * cuidado —pidiendo desempatar cuando dos inmuebles comparten dirección en
   * vez de elegir uno y quedar perfecto y equivocado.
   */
  const preparar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const aMigrar: FilaAMigrar[] = filas.map((fila) => {
        const v = (campo: CampoDeContrato) => valorDe(fila, mapeo, campo)
        return {
          direccion: String(v('direccionInmueble') ?? ''),
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
        }
      })

      const elLote = `lote-${filas.length}-${aMigrar[0]?.direccion?.slice(0, 8) ?? 'x'}`
      const r = await contractsApi.migracion.preparar(aMigrar, elLote)
      setLote(elLote)
      setResumen(r)
      await refrescar(elLote)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos preparar la migración.')
    } finally {
      setCargando(false)
    }
  }, [filas, mapeo, refrescar])

  const activar = useCallback(async () => {
    if (!lote) return
    setCargando(true)
    setError(null)
    try {
      setActivacion(await contractsApi.migracion.activar(lote, invitar))
      await refrescar(lote)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos activar.')
    } finally {
      setCargando(false)
    }
  }, [lote, invitar, refrescar])

  // ── Ya se preparó: lista de trabajo ──────────────────────────────────────
  if (resumen && lote) {
    return (
      <ListaDeTrabajo
        resumen={resumen}
        pendientes={pendientes}
        activacion={activacion}
        invitar={invitar}
        setInvitar={setInvitar}
        cargando={cargando}
        error={error}
        onActivar={() => void activar()}
        onFilaResuelta={() => void refrescar(lote)}
        onOtroArchivo={() => {
          setResumen(null)
          setLote(null)
          setFilas([])
          setMapeo([])
          setActivacion(null)
        }}
      />
    )
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
              seguir: «arrendador» es el propietario y «arrendatario» es el
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
              </div>
            </div>
          ) : null}

          {/* No dice "importar": todavía no se crea nada. */}
          <Button
            onClick={() => void preparar()}
            disabled={faltan.length > 0 || filas.length === 0 || cargando}
            isLoading={cargando}
            hideArrow
          >
            Revisar {filas.length} contratos
          </Button>
        </Card>
      ) : null}
    </div>
  )
}

/**
 * La lista de trabajo.
 *
 * Es el corazón del rediseño: en vez de un reporte de lo que falló, una lista
 * de lo que falta con la salida al lado. Nada se perdió y nada se creó todavía.
 */
function ListaDeTrabajo({
  resumen,
  pendientes,
  activacion,
  invitar,
  setInvitar,
  cargando,
  error,
  onActivar,
  onFilaResuelta,
  onOtroArchivo,
}: {
  resumen: ResumenLote
  pendientes: FilaDeMigracion[]
  activacion: ResumenActivacion | null
  invitar: boolean
  setInvitar: (v: boolean) => void
  cargando: boolean
  error: string | null
  onActivar: () => void
  onFilaResuelta: () => void
  onOtroArchivo: () => void
}) {
  return (
    <div className="space-y-6" data-testid="lista-de-trabajo">
      <Card className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Dato etiqueta="En el archivo" valor={resumen.total} />
          <Dato etiqueta="Listos" valor={resumen.listos} tono="ok" />
          <Dato etiqueta="Les falta algo" valor={resumen.pendientes} tono="mal" />
          <Dato etiqueta="Ya activados" valor={resumen.activados} />
        </div>

        {resumen.listos > 0 ? (
          <>
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
                  Se manda por tandas, no todo de golpe.
                </span>
              </span>
            </label>
            <Button onClick={onActivar} disabled={cargando} isLoading={cargando} hideArrow>
              Activar {resumen.listos} contratos
            </Button>
          </>
        ) : null}

        {resumen.listos === 0 && resumen.pendientes > 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguno se puede activar todavía. Resolvé lo de abajo y van pasando
            a listos solos.
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </Card>

      {activacion ? (
        <Card className="space-y-2 p-6" data-testid="resultado-activacion">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle className="h-4 w-4 text-success" weight="fill" />
            {activacion.activadas} contratos activados
            {activacion.invitados > 0 ? ` · ${activacion.invitados} inquilinos invitados` : ''}
          </p>
          {activacion.fallidas > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {activacion.resultados
                .filter((r) => r.estado === 'fallido')
                .map((r) => (
                  <li key={r.fila}>Fila {r.fila + 2}: {r.motivo}</li>
                ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {pendientes.map((f) => (
        <Card key={f.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {/* +2: en el archivo la primera fila de datos es la 2. */}
              Fila {f.fila + 2} · {f.datos.inquilino?.nombre || 'sin nombre'}
            </p>
            <p className="text-xs text-muted-foreground">{f.datos.direccion}</p>
          </div>
          <FaltantesDeFila fila={f} onResuelta={onFilaResuelta} />
        </Card>
      ))}

      <Button variant="outline" onClick={onOtroArchivo} hideArrow>
        Subir otro archivo
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
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
