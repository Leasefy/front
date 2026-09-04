'use client'

/**
 * Aplicar la misma resolución a muchas filas.
 *
 * En una cartera real doscientos contratos son del mismo propietario y casi
 * todos son de vivienda. De a uno, eso son doscientas veces el mismo nombre y
 * el mismo documento — y una migración que cuesta eso se abandona a la mitad.
 *
 * Lo que NO hace: decir «listo» y seguir. El back procesa fila por fila y
 * devuelve cuáles fallaron con su número de línea del archivo; acá se muestran
 * todas. Una masiva que reporta éxito tapando lo que no pudo deja a la
 * inmobiliaria creyendo que migró todo, y el hueco aparece cuando no le llega
 * la plata.
 *
 * T-0033 §3.2.G2 — con selección de todo el lote, `ids` puede ser miles: se
 * trocea en tandas de `CHUNK_MASIVA = 100` (bajo el `@ArrayMaxSize(200)` del
 * DTO) y se manda SECUENCIAL, no en paralelo — dos tandas a la vez competirían
 * por el mismo `upsert` de `Propietario` y por `recalcular()` de las mismas
 * filas. Un trozo que falla a mitad de camino NO borra lo que los anteriores
 * ya aplicaron: `resultado` se actualiza tanda por tanda, nunca sólo al final.
 */

import { useState } from 'react'
import { Users, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  contractsApi,
  type FilaDeMigracion,
  type ResultadoMasivo,
} from '@/lib/api/contracts.service'

/**
 * Frozen en contract.md §3.2.G2 — 1.365 filas ⇒ 14 requests secuenciales.
 * Debe quedar ≤ `@ArrayMaxSize(200)` del back; 100 deja margen.
 */
const CHUNK_MASIVA = 100

interface Props {
  /**
   * Los ids a los que aplicar — de `seleccion` directamente (§3.2.G4), NUNCA
   * derivados de `seleccionadas`: con selección de todo el lote la mayoría no
   * está cargada en la página actual.
   */
  ids: string[]
  /**
   * Sólo las filas de la página actual que están seleccionadas — se usa
   * ÚNICAMENTE para la vista previa de "sin inmueble" antes de aplicar
   * (§3.2.G4, "kept"): con selección de todo el lote es un subconjunto, y el
   * conteo exacto lo da `omitidas` en el resultado, después de aplicar.
   */
  seleccionadas: FilaDeMigracion[]
  onListo: () => void
}

/** Junta el resultado de una tanda al acumulado, sin pisar lo anterior. */
function acumular(acc: ResultadoMasivo, tanda: ResultadoMasivo): ResultadoMasivo {
  return {
    pedidas: acc.pedidas + tanda.pedidas,
    aplicadas: acc.aplicadas + tanda.aplicadas,
    fallidas: [...acc.fallidas, ...tanda.fallidas],
    omitidas: [...(acc.omitidas ?? []), ...(tanda.omitidas ?? [])],
  }
}

export function ResolucionMasiva({ ids, seleccionadas, onListo }: Props) {
  const [modo, setModo] = useState<'uso' | 'propietario' | null>(null)
  const [uso, setUso] = useState<'VIVIENDA' | 'COMERCIAL' | ''>('')
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [comision, setComision] = useState('')
  const [corriendo, setCorriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoMasivo | null>(null)
  /** Cuántas filas ya pasaron por una tanda (aplicada, fallida u omitida). */
  const [hechas, setHechas] = useState(0)

  /*
   * Cuántas de las seleccionadas (cargadas) todavía no tienen inmueble.
   * Registrarle el propietario a una fila sin inmueble no puede funcionar —la
   * consignación es del inmueble— así que conviene decirlo ANTES. Con
   * selección de todo el lote esto sólo ve la página actual: el conteo
   * exacto de TODA la selección llega en `resultado.omitidas`, después de
   * aplicar.
   */
  const sinInmueble = seleccionadas.filter((f) => !f.propertyId).length

  async function aplicar() {
    setCorriendo(true)
    setError(null)
    setHechas(0)
    let acumulado: ResultadoMasivo = { pedidas: 0, aplicadas: 0, fallidas: [], omitidas: [] }
    setResultado(acumulado)
    try {
      const cambios =
        modo === 'uso'
          ? { usoInmueble: uso === '' ? undefined : uso }
          : {
              propietario: {
                nombre: nombre.trim(),
                documento: documento.trim(),
                comisionPorcentaje:
                  comision.trim() === '' ? undefined : Number(comision),
              },
            }

      for (let i = 0; i < ids.length; i += CHUNK_MASIVA) {
        const trozo = ids.slice(i, i + CHUNK_MASIVA)
        const r = await contractsApi.migracion.resolverMasivo(trozo, cambios)
        acumulado = acumular(acumulado, r)
        setResultado(acumulado)
        setHechas(Math.min(i + trozo.length, ids.length))
      }
    } catch (e) {
      // Una tanda puede fallar a mitad de camino: lo que las anteriores ya
      // aplicaron QUEDA en `resultado` (nunca se pisa acá) — el error dice
      // hasta dónde llegó, para que nunca sea "no sabemos qué pasó".
      setError(
        `${e instanceof Error ? e.message : 'No se pudo aplicar'} — se alcanzaron a aplicar ${acumulado.aplicadas} de ${ids.length} antes de este error.`,
      )
    } finally {
      setCorriendo(false)
      // Refresca la lista de trabajo si al menos una tanda llegó a procesarse,
      // aunque una tanda posterior haya fallado — lo que se aplicó ya cambió
      // filas reales.
      if (acumulado.pedidas > 0) onListo()
    }
  }

  const puedeAplicar =
    modo === 'uso'
      ? uso !== ''
      : modo === 'propietario'
        ? nombre.trim() !== '' && documento.trim() !== ''
        : false

  return (
    <Card className="space-y-4 border-primary/30 p-5" data-testid="resolucion-masiva">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {ids.length} {ids.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
        </p>
        <div className="flex gap-2">
          <Button
            variant={modo === 'uso' ? 'default' : 'outline'}
            size="sm"
            hideArrow
            onClick={() => setModo(modo === 'uso' ? null : 'uso')}
          >
            Definir el uso
          </Button>
          <Button
            variant={modo === 'propietario' ? 'default' : 'outline'}
            size="sm"
            hideArrow
            onClick={() => setModo(modo === 'propietario' ? null : 'propietario')}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Mismo propietario
          </Button>
        </div>
      </div>

      {modo === 'uso' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground">
              Uso para las {ids.length}
            </label>
            <Select value={uso} onValueChange={(v) => setUso(v as 'VIVIENDA' | 'COMERCIAL')}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí el uso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIVIENDA">Vivienda</SelectItem>
                <SelectItem value="COMERCIAL">Comercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {modo === 'propietario' ? (
        <div className="space-y-3">
          {sinInmueble > 0 ? (
            <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-2.5 text-xs text-foreground">
              <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              {sinInmueble} de las seleccionadas todavía no tienen inmueble. La
              consignación es del inmueble, así que esas van a quedar sin
              registrar — aparecen listadas abajo con su fila.
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1">
              <label className="text-xs text-muted-foreground">Nombre del propietario</label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Documento</label>
              <Input value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </div>
            <div className="w-24">
              <label className="text-xs text-muted-foreground">Comisión %</label>
              <Input
                type="number"
                value={comision}
                onChange={(e) => setComision(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {modo ? (
        <Button
          size="sm"
          hideArrow
          disabled={!puedeAplicar || corriendo || ids.length === 0}
          isLoading={corriendo}
          onClick={() => void aplicar()}
        >
          Aplicar a {ids.length}
        </Button>
      ) : null}

      {/* §3.2.G2 — progreso legible mientras corren las tandas secuenciales:
          con 1.365 filas en 14 requests, un botón que gira sin decir nada es
          indistinguible de uno colgado. */}
      {corriendo ? (
        <p className="text-xs text-muted-foreground" data-testid="progreso-masivo">
          Aplicando {hechas}/{ids.length}…
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" data-testid="error-masivo">
          {error}
        </p>
      ) : null}

      {resultado ? (
        <div className="space-y-2 rounded-lg border border-border p-3" data-testid="resultado-masivo">
          <p className="text-sm text-foreground">
            {resultado.aplicadas} de {resultado.pedidas} resueltas.
          </p>
          {/* §3.2.G3 — una fila sin inmueble a la que se le pidió propietario
              NO es un fallo: registrarPropietario la rechaza siempre, y en un
              lote real son la mayoría de las filas. Reportarla junto con
              `fallidas` entrenaría a ignorar el reporte. */}
          {resultado.omitidas && resultado.omitidas.length > 0
            ? Object.entries(
                resultado.omitidas.reduce<Record<string, number>>((acc, o) => {
                  acc[o.motivo] = (acc[o.motivo] ?? 0) + 1
                  return acc
                }, {}),
              ).map(([motivo, n]) => (
                <p key={motivo} className="text-xs text-muted-foreground" data-testid="omitidas-masivo">
                  {n} {n === 1 ? 'fila' : 'filas'} — {motivo}
                </p>
              ))
            : null}
          {resultado.fallidas.length > 0 ? (
            <>
              <p className="text-xs font-medium text-destructive">
                {resultado.fallidas.length} no se pudieron:
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {resultado.fallidas.map((f) => (
                  <li key={f.id}>
                    {/* +2: en el archivo la primera fila de datos es la 2. */}
                    {f.fila != null ? `Fila ${f.fila + 2}` : 'Una fila'}: {f.motivo}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
