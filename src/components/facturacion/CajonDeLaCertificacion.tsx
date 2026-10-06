'use client'

/**
 * «Generar una certificación» — detrás de un CTA, y con el propietario ELEGIDO.
 *
 * ── 🔴 21-09 · Lo que estaba mal, y no era el tamaño ───────────────────────
 *
 * Nico: «esto es horrible, un listado infinito por allá abajo y no se sabe bien
 * qué hacer y qué se puede hacer dentro de mandato y correos».
 *
 * Lo del listado se arregló paginando. Pero lo que de verdad hacía imposible
 * «saber qué hacer» era el primer campo del formulario:
 *
 *     Propietario (id)   [ id del propietario ]
 *
 * Un campo de texto pidiendo un UUID de la base. Nadie sabe el id de un
 * propietario; ni la persona que factura, ni el contador, ni Nico. Era una
 * pantalla que sólo podía usar quien tuviera una consulta SQL al lado. Las
 * migraciones de Portofino trajeron 1.733 propietarios: el dato que la persona
 * tiene es el NOMBRE, o la cédula.
 *
 * Ahora se busca por nombre o documento contra `GET /inmobiliaria/propietarios`
 * —el mismo buscador que usa la lista de propietarios— y se elige de los
 * resultados. El id nunca se escribe: se deduce de a quién elegiste.
 *
 * Y el formulario entero se fue al cajón de la casa, detrás del botón de la
 * cabecera de la tabla: generar la certificación de un propietario es algo que
 * se hace de vez en cuando, no un filtro de la tabla que está arriba.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Certificate, MagnifyingGlass, User } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { propietariosApi } from '@/lib/api/inmobiliaria.service'
import type { Propietario } from '@/lib/types/inmobiliaria'
import {
  facturacionElectronicaService,
  type CertificacionGenerada,
} from '@/lib/api/facturacion-electronica.service'
import { comoCsv } from './certificacion-en-csv'
import { CampoDeFecha } from './CampoDeFecha'
import { formatCurrency } from '@/lib/format'
import { BotonPdfDeLaCertificacion } from './BotonPdfDeLaCertificacion'

/** Cuántos resultados se muestran: es un buscador, no un listado. */
const CUANTOS_RESULTADOS = 8

/** Desde cuántas letras vale la pena preguntarle al back. */
const MINIMO_PARA_BUSCAR = 2

export interface CajonDeLaCertificacionProps {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  /** Precarga el propietario cuando se abre desde su ficha. */
  propietario?: { id: string; nombre: string }
  /** Se llama cuando el back confirmó: la tabla vuelve a leer. */
  onGenerada: () => void | Promise<void>
}

export function CajonDeLaCertificacion({
  abierto,
  onOpenChange,
  propietario,
  onGenerada,
}: CajonDeLaCertificacionProps) {
  const anio = new Date().getFullYear()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Propietario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [elegido, setElegido] = useState<{ id: string; nombre: string } | null>(
    propietario ?? null,
  )
  const [desde, setDesde] = useState(`${anio}-01-01`)
  const [hasta, setHasta] = useState(`${anio}-12-31`)
  const [generando, setGenerando] = useState(false)
  const [ultima, setUltima] = useState<CertificacionGenerada | null>(null)

  /*
   * 🔴 El buscador espera a que la persona deje de escribir. Sin esto, cada
   * letra es una consulta al back: «Ana» son tres, y la respuesta de la primera
   * puede llegar después de la tercera y pintar los resultados viejos.
   */
  const ultimaBusqueda = useRef(0)
  useEffect(() => {
    const termino = busqueda.trim()
    if (termino.length < MINIMO_PARA_BUSCAR) {
      setResultados([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    const mio = ++ultimaBusqueda.current
    const reloj = setTimeout(() => {
      void propietariosApi
        .getAll({ search: termino, limit: CUANTOS_RESULTADOS })
        .then((lista) => {
          // Una respuesta vieja no pisa a la nueva.
          if (mio !== ultimaBusqueda.current) return
          setResultados(lista.slice(0, CUANTOS_RESULTADOS))
        })
        .catch(() => {
          if (mio !== ultimaBusqueda.current) return
          setResultados([])
        })
        .finally(() => {
          if (mio === ultimaBusqueda.current) setBuscando(false)
        })
    }, 350)
    return () => clearTimeout(reloj)
  }, [busqueda])

  const cerrar = useCallback(
    (v: boolean) => {
      if (!v && generando) return
      if (!v) {
        // Se abre limpio la próxima vez: una certificación de otro propietario
        // no puede heredar el resultado de la anterior.
        setBusqueda('')
        setResultados([])
        setElegido(propietario ?? null)
        setUltima(null)
      }
      onOpenChange(v)
    },
    [generando, onOpenChange, propietario],
  )

  async function generar() {
    if (!elegido || generando) return
    setGenerando(true)
    try {
      const c = await facturacionElectronicaService.generarCertificacion(
        elegido.id,
        { desde, hasta },
      )
      setUltima(c)
      toast.success(
        // FA-23: «1 factura», no «1 facturas».
        `Certificación de ${c.propietario.nombre} generada (${c.facturasContadas.toLocaleString('es-CO')} ${c.facturasContadas === 1 ? 'factura' : 'facturas'})`,
      )
      await onGenerada()
    } catch (e) {
      // Con la regla de oro (02-10-2026): un 5xx dice «de nuestro lado» con
      // la referencia; «conexión», sólo sin respuesta.
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo generar la certificación.',
          accion: 'generar la certificación',
        }),
      )
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Cajon
      abierto={abierto}
      onOpenChange={cerrar}
      ancho="sm:max-w-xl"
      data-testid="cajon-de-la-certificacion"
    >
      <CajonCabecera
        titulo="Generar una certificación"
        descripcion="Suma lo que le facturaste a los inquilinos de un propietario POR SU CUENTA en el período, restando las notas crédito. Es lo que él necesita para declarar."
      />
      <CajonCuerpo className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="cert-propietario">Propietario</Label>
          {elegido ? (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3"
              data-testid="cert-elegido"
            >
              <div className="flex min-w-0 items-center gap-3">
                <User className="h-5 w-5 shrink-0 text-fg-muted" weight="fill" />
                <p className="truncate text-body text-fg">{elegido.nombre}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                hideArrow
                onClick={() => {
                  setElegido(null)
                  setUltima(null)
                }}
                data-testid="cert-cambiar-propietario"
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                  aria-hidden="true"
                />
                <Input
                  id="cert-propietario"
                  className="pl-9"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nombre o documento del propietario"
                  autoComplete="off"
                  data-testid="cert-propietario"
                />
              </div>
              {busqueda.trim().length < MINIMO_PARA_BUSCAR ? (
                <p className="text-caption text-fg-muted">
                  Escribe el nombre o la cédula. No hace falta saber ningún
                  código.
                </p>
              ) : buscando ? (
                <p
                  className="flex items-center gap-2 text-caption text-fg-muted"
                  data-testid="cert-buscando"
                >
                  <Spinner className="h-3.5 w-3.5" /> Buscando…
                </p>
              ) : resultados.length === 0 ? (
                <p className="text-caption text-fg-muted" data-testid="cert-sin-resultados">
                  Ningún propietario coincide con «{busqueda.trim()}».
                </p>
              ) : (
                <ul
                  className="divide-y divide-border overflow-hidden rounded-lg border border-border"
                  data-testid="cert-resultados"
                >
                  {resultados.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-muted"
                        onClick={() => setElegido({ id: p.id, nombre: p.name })}
                        data-testid={`cert-resultado-${p.id}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-body text-fg">
                            {p.name}
                          </span>
                          <span className="block font-mono text-caption tabular-nums text-fg-muted">
                            {p.documentNumber || '—'}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-caption tabular-nums text-fg-muted">
                          {p.propertyCount}{' '}
                          {p.propertyCount === 1 ? 'inmueble' : 'inmuebles'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cert-desde">Desde</Label>
            {/* FA-R29: el selector de fecha del DS, no el `type="date"` nativo. */}
            <CampoDeFecha id="cert-desde" value={desde} onChange={setDesde} testid="cert-desde" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-hasta">Hasta</Label>
            <CampoDeFecha id="cert-hasta" value={hasta} onChange={setHasta} testid="cert-hasta" />
          </div>
        </div>

        {ultima && (
          <div
            className="space-y-3 rounded-lg border border-border bg-surface-muted p-4"
            data-testid="cert-resultado"
          >
            <p className="text-body font-medium text-fg">
              {ultima.propietario.nombre} · {ultima.periodo.enPalabras}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                [
                  'Facturas',
                  `${ultima.facturasContadas.toLocaleString('es-CO')} ${ultima.facturasContadas === 1 ? 'factura' : 'facturas'}`,
                ],
                // FA-R28: la plata con un solo formato en toda la sección.
                ['Base', formatCurrency(ultima.baseCop)],
                ['IVA', formatCurrency(ultima.ivaCop)],
                /* 🔴 QA-FACT-CONTA-95 r2 (FA3-12): cada retención por su lado —
                   el propietario las declara en renglones distintos (el CSV ya
                   las separaba; el resumen las juntaba en «Retenciones»). */
                ['Retención en la fuente', formatCurrency(ultima.retefuenteCop)],
                ['Retención de IVA', formatCurrency(ultima.reteivaCop)],
                ['Retención de ICA', formatCurrency(ultima.reteicaCop)],
                ['Total', formatCurrency(ultima.totalCop)],
              ].map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="text-caption text-fg-muted">{rotulo}</dt>
                  <dd className="font-mono text-body tabular-nums text-fg">
                    {valor}
                  </dd>
                </div>
              ))}
            </dl>
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={() => {
                /*
                 * La descarga se arma acá, sin pedirle nada más al back: el
                 * detalle ya vino con la certificación. Es la misma idea del
                 * estado de cuenta — «qué tan fácil de distribuir sea».
                 */
                const blob = new Blob([comoCsv(ultima)], {
                  type: 'text/csv;charset=utf-8',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `certificacion-${ultima.propietario.nombre}-${ultima.periodo.desde.slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              data-testid="cert-exportar"
            >
              Descargar el detalle (CSV)
            </Button>
            {/* 🔴 QA-FACT-CONTA-95 r2 (FA-E-05): el documento para declarar. */}
            {ultima.id ? (
              <BotonPdfDeLaCertificacion
                id={ultima.id}
                propietario={ultima.propietario.nombre}
                desde={ultima.periodo.desde}
                hasta={ultima.periodo.hasta}
              />
            ) : null}
          </div>
        )}
      </CajonCuerpo>
      <CajonPie
        ayuda={
          elegido
            ? 'Volver a generarla ACTUALIZA la que había: hay una sola por propietario y período.'
            : 'Primero elige al propietario: la certificación es de él, no del mes.'
        }
      >
        <Button
          variant="outline"
          hideArrow
          disabled={generando}
          onClick={() => cerrar(false)}
          data-testid="cert-cerrar"
        >
          {ultima ? 'Cerrar' : 'Cancelar'}
        </Button>
        <Button
          hideArrow
          disabled={!elegido || generando}
          onClick={() => void generar()}
          data-testid="cert-generar"
        >
          {generando ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Certificate className="h-4 w-4" weight="bold" />
          )}
          {generando
            ? 'Generando…'
            : ultima
              ? 'Volver a generarla'
              : 'Generar la certificación'}
        </Button>
      </CajonPie>
    </Cajon>
  )
}
