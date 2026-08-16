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

interface Props {
  /** Las filas seleccionadas, para saber qué se le puede aplicar al conjunto. */
  seleccionadas: FilaDeMigracion[]
  onListo: () => void
}

export function ResolucionMasiva({ seleccionadas, onListo }: Props) {
  const [modo, setModo] = useState<'uso' | 'propietario' | null>(null)
  const [uso, setUso] = useState<'VIVIENDA' | 'COMERCIAL' | ''>('')
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [comision, setComision] = useState('')
  const [corriendo, setCorriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoMasivo | null>(null)

  const ids = seleccionadas.map((f) => f.id)

  /*
   * Cuántas de las seleccionadas todavía no tienen inmueble. Registrarle el
   * propietario a una fila sin inmueble no puede funcionar —la consignación es
   * del inmueble— así que conviene decirlo ANTES y no como un fallo después.
   */
  const sinInmueble = seleccionadas.filter((f) => !f.propertyId).length

  async function aplicar() {
    setCorriendo(true)
    setError(null)
    setResultado(null)
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
      const r = await contractsApi.migracion.resolverMasivo(ids, cambios)
      setResultado(r)
      onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aplicar.')
    } finally {
      setCorriendo(false)
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
          {seleccionadas.length}{' '}
          {seleccionadas.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
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
              Uso para las {seleccionadas.length}
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {resultado ? (
        <div className="space-y-2 rounded-lg border border-border p-3" data-testid="resultado-masivo">
          <p className="text-sm text-foreground">
            {resultado.aplicadas} de {resultado.pedidas} resueltas.
          </p>
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
