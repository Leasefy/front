'use client'

/**
 * «Cargar una lista» — la puerta que la pantalla prometía y no existía.
 *
 * ── 🔴 Nico, 22-09 ─────────────────────────────────────────────────────────
 *
 * «Esto de listas restrictivas ni se entiende qué es, qué debe hacer el
 * usuario, se ve horrible; organiza y haz un glow up a eso.»
 *
 * Al abrirlo apareció algo peor que el diseño: el vacío decía «carga los
 * archivos oficiales de OFAC, ONU y UE para empezar a comparar» y NO HABÍA
 * DÓNDE. `captacionApi.cargarLista` estaba escrita en el cliente desde el
 * 18-09 y no la llamaba nadie. Es el mismo defecto de las plantillas de
 * documento y del convenio de recaudo: una pantalla que manda a hacer algo sin
 * la puerta para hacerlo. Y acá cuesta más que una molestia — sin lista
 * cargada NADA se verifica, y cada tercero que se crea queda «sin verificar».
 *
 * ── Lo que hace ────────────────────────────────────────────────────────────
 *
 * Toma el archivo tal como lo publica el organismo, encuentra solo cuál columna
 * es el nombre (`columnasDelArchivo`), MUESTRA lo que encontró con tres
 * ejemplos, y recién entonces deja cargar. Una lista mal leída bloquea a
 * clientes reales: acá no se carga nada a ciegas.
 */

import { useCallback, useRef, useState } from 'react'
import { UploadSimple, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { toast } from '@/components/ui/toast'
import { leerCsvEnTrozos } from '@/lib/migracion/csv-en-trozos'
import {
  columnasDelArchivo,
  filaDeLaLista,
  type ColumnasDelArchivo,
  type FilaDeLaLista,
} from '@/lib/listas-restrictivas/columnas-del-archivo'
import { captacionApi } from '@/lib/api/crm.service'
import { errorEnCristiano } from '@/lib/errores/en-cristiano'

/**
 * Las tres que publica un organismo, más «propia». El código viaja al back como
 * `lista`; la etiqueta es lo que se lee en pantalla.
 */
const FUENTES = [
  {
    codigo: 'OFAC',
    nombre: 'OFAC (lista Clinton)',
    fuente: 'U.S. Department of the Treasury — SDN',
  },
  { codigo: 'ONU', nombre: 'ONU — Consejo de Seguridad', fuente: 'UN Security Council' },
  { codigo: 'UE', nombre: 'Unión Europea', fuente: 'EU Consolidated List' },
  { codigo: 'PROPIA', nombre: 'Una lista propia de la inmobiliaria', fuente: null },
] as const

export interface CajonDeLaListaProps {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  /** Se llama cuando el back confirmó: la pantalla vuelve a leer. */
  onCargada: () => void
}

/** Lo que se leyó del archivo, antes de mandar nada. */
interface LoQueSeLeyo {
  nombreDelArchivo: string
  columnas: ColumnasDelArchivo
  filas: FilaDeLaLista[]
  /** Filas del archivo que se descartaron por no tener nombre. */
  descartadas: number
}

export function CajonDeLaLista({ abierto, onOpenChange, onCargada }: CajonDeLaListaProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [codigo, setCodigo] = useState<string>('OFAC')
  const [vigenteDesde, setVigenteDesde] = useState(hoy)
  const [leyendo, setLeyendo] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [leido, setLeido] = useState<LoQueSeLeyo | null>(null)
  const archivoRef = useRef<HTMLInputElement>(null)

  const fuente = FUENTES.find((f) => f.codigo === codigo) ?? FUENTES[0]

  const limpiar = useCallback(() => {
    setLeido(null)
    if (archivoRef.current) archivoRef.current.value = ''
  }, [])

  async function leerArchivo(archivo: File) {
    setLeyendo(true)
    setLeido(null)
    try {
      let columnas: ColumnasDelArchivo = { nombre: null, documento: null, detalle: null }
      const filas: FilaDeLaLista[] = []
      let descartadas = 0
      await leerCsvEnTrozos(archivo, {
        onEncabezados: (encabezados) => {
          columnas = columnasDelArchivo(encabezados)
        },
        onLote: async (lote) => {
          for (const f of lote) {
            const fila = filaDeLaLista(f, columnas)
            if (fila) filas.push(fila)
            else descartadas++
          }
        },
      })
      setLeido({ nombreDelArchivo: archivo.name, columnas, filas, descartadas })
    } catch (e) {
      toast.error(errorEnCristiano(e, 'No se pudo leer el archivo.'))
    } finally {
      setLeyendo(false)
    }
  }

  async function cargar() {
    if (!leido || leido.filas.length === 0 || cargando) return
    setCargando(true)
    try {
      const r = await captacionApi.cargarLista({
        lista: fuente.codigo,
        etiqueta: fuente.nombre,
        vigenteDesde,
        ...(fuente.fuente ? { fuente: fuente.fuente } : {}),
        filas: leido.filas,
      })
      /*
       * 🔴 El back REVISA a los que estaban sin verificar en cuanto entra la
       * lista, y eso es lo que de verdad importa: decir «lista cargada» y
       * callar que a 40 terceros les acaba de cambiar el estado sería esconder
       * la consecuencia de la acción.
       */
      toast.success(
        r.revisados.revisados === 0
          ? `Lista cargada: ${r.lista.filas.toLocaleString('es-CO')} registros.`
          : `Lista cargada: ${r.lista.filas.toLocaleString('es-CO')} registros. Se revisaron ${r.revisados.revisados} terceros: ${r.revisados.bloqueados} quedaron bloqueados y ${r.revisados.liberados} sin coincidencias.`,
      )
      limpiar()
      onOpenChange(false)
      onCargada()
    } catch (e) {
      toast.error(errorEnCristiano(e, 'No se pudo cargar la lista.'))
    } finally {
      setCargando(false)
    }
  }

  const sinNombre = leido !== null && leido.columnas.nombre === null
  const listo = leido !== null && !sinNombre && leido.filas.length > 0

  return (
    <Cajon
      abierto={abierto}
      onOpenChange={(v) => {
        if (!v && cargando) return
        if (!v) limpiar()
        onOpenChange(v)
      }}
      ancho="sm:max-w-xl"
      data-testid="cajon-de-la-lista"
    >
      <CajonCabecera
        titulo="Cargar una lista restrictiva"
        descripcion="El archivo tal como lo publica el organismo. Leasefy busca sola cuál columna es el nombre y te muestra lo que encontró antes de cargar nada."
      />
      <CajonCuerpo className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="lista-fuente">Qué lista es</Label>
          <Select value={codigo} onValueChange={setCodigo}>
            <SelectTrigger id="lista-fuente" data-testid="lista-fuente">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUENTES.map((f) => (
                <SelectItem key={f.codigo} value={f.codigo}>
                  {f.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fuente.fuente && (
            <p className="text-caption text-fg-muted">Se guarda como «{fuente.fuente}».</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lista-vigente">Vigente desde</Label>
          <Input
            id="lista-vigente"
            type="date"
            value={vigenteDesde}
            onChange={(e) => setVigenteDesde(e.target.value)}
            data-testid="lista-vigente"
          />
          <p className="text-caption text-fg-muted">
            La fecha de publicación del archivo, no la de hoy: es lo que dice
            contra qué versión de la lista se comparó a cada tercero.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lista-archivo">El archivo (CSV)</Label>
          <Input
            ref={archivoRef}
            id="lista-archivo"
            type="file"
            accept=".csv,text/csv"
            disabled={leyendo || cargando}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) void leerArchivo(archivo)
            }}
            data-testid="lista-archivo"
          />
        </div>

        {leyendo && (
          <p className="flex items-center gap-2 text-sm text-fg-muted" data-testid="lista-leyendo">
            <Spinner className="h-4 w-4" /> Leyendo el archivo…
          </p>
        )}

        {/* 🔴 Lo que se encontró, ANTES de cargar. Una lista mal leída bloquea
            a clientes reales: nadie carga a ciegas. */}
        {leido && (
          <section
            className={`space-y-3 rounded-lg border p-4 ${
              sinNombre ? 'border-danger/40 bg-danger-soft' : 'border-border bg-surface-muted'
            }`}
            data-testid="lista-lectura"
          >
            {sinNombre ? (
              <p className="flex items-start gap-2 text-sm text-fg">
                <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" weight="fill" />
                En «{leido.nombreDelArchivo}» no encontré ninguna columna con el
                nombre. Sin nombre no hay contra qué comparar: revisa que el
                archivo tenga una columna «Nombre», «Name» o «SDN_Name».
              </p>
            ) : (
              <>
                <p className="text-sm text-fg">
                  <span className="font-mono font-semibold tabular-nums">
                    {leido.filas.length.toLocaleString('es-CO')}
                  </span>{' '}
                  registros en «{leido.nombreDelArchivo}». El nombre sale de la
                  columna «{leido.columnas.nombre}»
                  {leido.columnas.documento
                    ? `, el documento de «${leido.columnas.documento}»`
                    : ', sin columna de documento'}
                  .
                </p>
                {leido.descartadas > 0 && (
                  <p className="text-caption text-fg-muted">
                    {leido.descartadas.toLocaleString('es-CO')} filas se
                    descartaron por no tener nombre.
                  </p>
                )}
                <ul className="space-y-1" data-testid="lista-ejemplos">
                  {leido.filas.slice(0, 3).map((f, i) => (
                    <li key={i} className="truncate text-caption text-fg-muted">
                      {f.nombre}
                      {f.documento ? ` · ${f.documento}` : ''}
                      {f.detalle ? ` · ${f.detalle}` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </CajonCuerpo>
      <CajonPie
        ayuda={
          listo
            ? 'Al cargarla se vuelve a revisar sola a todos los terceros que estaban sin verificar.'
            : 'Elige el archivo: no se carga nada hasta que veas qué se leyó.'
        }
      >
        <Button
          variant="outline"
          hideArrow
          disabled={cargando}
          onClick={() => onOpenChange(false)}
          data-testid="lista-cancelar"
        >
          Cancelar
        </Button>
        <Button
          hideArrow
          disabled={!listo || cargando}
          onClick={() => void cargar()}
          data-testid="lista-cargar"
        >
          {cargando ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <UploadSimple className="h-4 w-4" weight="bold" />
          )}
          {cargando ? 'Cargando…' : 'Cargar la lista'}
        </Button>
      </CajonPie>
    </Cajon>
  )
}
