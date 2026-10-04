'use client'

/**
 * «Cargar una resolución» — el formulario, detrás de un CTA.
 *
 * ── 🔴 Por qué dejó de estar puesto en la pantalla (Nico, 21-09) ───────────
 *
 * «No entiendo esos filtros por allá abajo. Eso de carga resolución ni se
 * entiende, creo que eso debería ser un CTA, y así hay muchas cosas no sólo en
 * estas tablas dentro de facturación que deberían ser mejor un CTA que saque
 * toda la información y ya funcione desde ahí.»
 *
 * Los leyó como FILTROS. Y tenía razón en leerlos así: nueve campos en rejilla
 * debajo de una tabla, con fechas y rangos, es exactamente la forma de una
 * barra de filtros. No lo eran: era el alta de una resolución de la DIAN, algo
 * que una inmobiliaria hace una o dos veces al año. Lo que se hace dos veces al
 * año no puede ocupar media pantalla todos los días ni parecer que gobierna la
 * tabla de arriba.
 *
 * Ahora es un botón en la cabecera de la tabla —donde vive lo que se puede
 * hacer con esa tabla— y el formulario entero vive en el cajón de la casa.
 *
 * Lo que NO cambió: las cuatro validaciones al lado del campo (auditoría 13-09,
 * F5), que el back sigue aplicando igual, y que una resolución no se edita.
 *
 * 🔴 QA-FACT (03-10-2026): las tres fechas usan el selector de fecha del DS
 * (`CampoDeFecha`), no el `type="date"` del navegador (FA-R29); la descripción
 * dice «Por facturar» (FA-14), y «Nota crédito» ya no se ofrece como tipo:
 * ninguna nota crédito usa resolución, llevan su consecutivo propio (NC-1).
 */

import { useEffect, useState } from 'react'
import { Certificate } from '@phosphor-icons/react'

import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { Checkbox } from '@/components/ui/checkbox'
import { CampoDeFecha } from './CampoDeFecha'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  erroresDeLaResolucion,
  hayErrores,
} from '@/lib/facturacion/errores-de-la-resolucion'

/** Los campos que pueden traer un error (del navegador o del back). */
type CampoConError =
  | 'numero'
  | 'fechaResolucion'
  | 'prefijo'
  | 'desde'
  | 'hasta'
  | 'vigenteDesde'
  | 'vigenteHasta'
  | 'ultimoNumeroUsado'

const CAMPOS_CON_ERROR: readonly CampoConError[] = [
  'numero',
  'fechaResolucion',
  'prefijo',
  'desde',
  'hasta',
  'vigenteDesde',
  'vigenteHasta',
  'ultimoNumeroUsado',
]

/** El `id` del input de cada campo (para el foco y el `aria-describedby`). */
const ID_DEL_CAMPO: Record<CampoConError, string> = {
  numero: 'resolucion-numero',
  fechaResolucion: 'resolucion-fecha',
  prefijo: 'resolucion-prefijo',
  desde: 'resolucion-desde',
  hasta: 'resolucion-hasta',
  vigenteDesde: 'resolucion-vigente-desde',
  vigenteHasta: 'resolucion-vigente-hasta',
  ultimoNumeroUsado: 'resolucion-ultimo',
}

/** El `id` del error de cada campo. Los de siempre se conservan. */
const ID_DEL_ERROR: Record<CampoConError, string> = {
  numero: 'resolucion-error-numero',
  fechaResolucion: 'resolucion-error-fecha',
  prefijo: 'resolucion-error-prefijo',
  desde: 'resolucion-error-desde',
  hasta: 'resolucion-error-hasta',
  vigenteDesde: 'resolucion-error-vigente-desde',
  vigenteHasta: 'resolucion-error-vigente-hasta',
  ultimoNumeroUsado: 'resolucion-error-ultimo',
}
import { toast } from '@/components/ui/toast'
import {
  facturacionPorMesService,
  type ResolucionesDeLaAgencia,
  type SugerenciaDeLaResolucion,
} from '@/lib/api/facturacion-por-mes.service'
import {
  NOMBRE_DEL_TIPO,
  TIPOS_EN_ORDEN,
  type TipoDeDocumento,
} from '@/lib/api/facturacion-electronica.service'

/** El formulario, con los campos como los trae el papel de la DIAN. */
export interface Formulario {
  numero: string
  fechaResolucion: string
  prefijo: string
  desde: string
  hasta: string
  vigenteDesde: string
  vigenteHasta: string
  ultimoNumeroUsado: string
  /**
   * 🔴 Qué TIPO de documento numera (17-09-2026). Vacío = cualquiera, que es lo
   * que hacen las resoluciones ya cargadas: no hay valor por defecto, porque
   * elegir uno le cambiaría la numeración a quien no pidió nada.
   */
  tipoDeDocumento: string
  /** Nico (03-10): una resolución de PRUEBA no le entrega nada a ningún cliente. */
  esDePrueba: boolean
}

export const VACIO: Formulario = {
  numero: '',
  fechaResolucion: '',
  prefijo: '',
  desde: '',
  hasta: '',
  vigenteDesde: '',
  vigenteHasta: '',
  ultimoNumeroUsado: '',
  tipoDeDocumento: '',
  esDePrueba: false,
}

/**
 * 🔴 El `Select` del DS no acepta `''` como valor (Radix lo reserva para
 * «sin selección»), así que «cualquier tipo» viaja con una clave propia y se
 * traduce a «no mandes el campo» al guardar.
 */
const CUALQUIER_TIPO = 'CUALQUIERA'

export interface CajonDeLaResolucionProps {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  /** La lectura de hoy: dice si esta base ya sabe numerar por tipo. */
  datos: ResolucionesDeLaAgencia | null
  /** Se llama cuando el back confirmó: la pantalla vuelve a leer. */
  onCargada: () => void | Promise<void>
}

export function CajonDeLaResolucion({
  abierto,
  onOpenChange,
  datos,
  onCargada,
}: CajonDeLaResolucionProps) {
  const [form, setForm] = useState<Formulario>(VACIO)
  const [guardando, setGuardando] = useState(false)
  /**
   * Lo que el BACK dijo de cada campo (02-10-2026): va debajo de su campo, no
   * en un toast. Se borra al corregir ese campo.
   */
  const [delServidor, setDelServidor] = useState<
    Partial<Record<CampoConError, string>>
  >({})

  /*
   * 🔴 Q10 (Nico, la recomendada): con el prefijo y el rango escritos, el back
   * propone el último número ya usado (lo migrado incluido) y dice si el rango
   * se cruza con otra resolución. Una inmobiliaria que viene de otro sistema
   * repetía números ya emitidos allá. Un back sin la ruta: silencio, como antes.
   */
  const [sugerencia, setSugerencia] = useState<SugerenciaDeLaResolucion | null>(null)
  useEffect(() => {
    const desde = Number(form.desde)
    const hasta = Number(form.hasta)
    const prefijo = form.prefijo.trim()
    if (
      !abierto ||
      !Number.isInteger(desde) ||
      !Number.isInteger(hasta) ||
      desde < 1 ||
      hasta < desde ||
      !/^[A-Za-z0-9]*$/.test(prefijo)
    ) {
      setSugerencia(null)
      return
    }
    let vivo = true
    const espera = setTimeout(() => {
      void (async () => {
        try {
          const s = await facturacionPorMesService.sugerenciaDeLaResolucion({ prefijo, desde, hasta })
          if (vivo) setSugerencia(s)
        } catch {
          if (vivo) setSugerencia(null)
        }
      })()
    }, 400)
    return () => {
      vivo = false
      clearTimeout(espera)
    }
  }, [abierto, form.prefijo, form.desde, form.hasta])
  const seCruza = sugerencia?.seCruza === true

  const campo = (clave: keyof Formulario) => (valor: string) => {
    setForm((previo) => ({ ...previo, [clave]: valor }))
    setDelServidor((previo) => {
      if (!(clave in previo)) return previo
      const { [clave as CampoConError]: _borrado, ...resto } = previo
      void _borrado
      return resto
    })
  }

  /*
   * El formulario está completo cuando están los seis campos obligatorios. El
   * prefijo NO lo es: hay resoluciones sin prefijo, y entonces el número va
   * pelado. `ultimoNumeroUsado` tampoco: sólo hace falta cuando la inmobiliaria
   * ya gastó parte del rango en otro sistema.
   */
  /*
   * 🔴 F5 (auditoría 13-09): lo que está mal se dice AL LADO DEL CAMPO, no en
   * un toast que se va solo a los cinco segundos justo cuando la persona baja
   * la vista al formulario. Son las mismas cuatro reglas del back, que las
   * sigue aplicando: esto no lo reemplaza, lo adelanta.
   */
  const errores = erroresDeLaResolucion(form)
  /** El error que se ve: el del navegador primero (el que se puede corregir ya). */
  const errorDe = (c: CampoConError): string | undefined =>
    (errores as Partial<Record<CampoConError, string>>)[c] ?? delServidor[c]
  /** Lo que el input dice de su error, para el lector de pantalla. */
  const aria = (c: CampoConError) => {
    const hay = Boolean(errorDe(c))
    return {
      'aria-invalid': hay ? true : undefined,
      'aria-describedby': hay ? ID_DEL_ERROR[c] : undefined,
    } as const
  }

  const completo =
    form.numero.trim() !== '' &&
    form.fechaResolucion !== '' &&
    form.desde !== '' &&
    form.hasta !== '' &&
    form.vigenteDesde !== '' &&
    form.vigenteHasta !== ''

  async function guardar() {
    if (!completo || hayErrores(errores) || guardando || seCruza) return
    setGuardando(true)
    try {
      await facturacionPorMesService.crearResolucion({
        numero: form.numero.trim(),
        fechaResolucion: form.fechaResolucion,
        prefijo: form.prefijo.trim(),
        desde: Number(form.desde),
        hasta: Number(form.hasta),
        vigenteDesde: form.vigenteDesde,
        vigenteHasta: form.vigenteHasta,
        ...(form.ultimoNumeroUsado !== ''
          ? { ultimoNumeroUsado: Number(form.ultimoNumeroUsado) }
          : {}),
        ...(form.tipoDeDocumento !== '' && form.tipoDeDocumento !== CUALQUIER_TIPO
          ? { tipoDeDocumento: form.tipoDeDocumento as TipoDeDocumento }
          : {}),
        ...(form.esDePrueba ? { esDePrueba: true } : {}),
      })
      toast.success('Resolución cargada')
      setForm(VACIO)
      onOpenChange(false)
      await onCargada()
    } catch (e) {
      // El cajón queda abierto y con lo escrito: reintentar no obliga a
      // copiar el papel de la DIAN otra vez. Lo que el back dijo de un campo
      // va debajo de él, con el foco en el primero; el resto, al toast, con la
      // regla de oro (un 5xx dice «de nuestro lado» con la referencia).
      const reparto = repartirErroresDelServidor<CampoConError>(e, {
        campos: CAMPOS_CON_ERROR,
        porDefecto: 'No se pudo cargar la resolución.',
        accion: 'cargar la resolución',
      })
      setDelServidor(reparto.porCampo)
      const primero = reparto.orden[0]
      if (primero) document.getElementById(ID_DEL_CAMPO[primero])?.focus()
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '))
    } finally {
      setGuardando(false)
    }
  }

  /** Qué falta, dicho en el pie: el botón apagado solo no lo explica. */
  const ayuda = hayErrores(errores)
    ? 'Hay un dato que no cuadra: está señalado arriba.'
    : seCruza
      ? 'El rango se cruza con otra resolución: dos autorizaciones no pueden numerar el mismo número.'
      : completo
      ? 'Una resolución no se edita después: se anula y se carga la siguiente.'
      : 'Faltan datos del papel de la DIAN: número, fecha, rango y vigencia.'

  return (
    <Cajon
      abierto={abierto}
      onOpenChange={(v) => {
        // Mientras la orden viaja no se cierra: cerrar a mitad dejaría sin
        // saber si la resolución quedó cargada.
        if (!v && guardando) return
        onOpenChange(v)
      }}
      ancho="sm:max-w-2xl"
      data-testid="cajon-de-la-resolucion"
    >
      <CajonCabecera
        titulo="Cargar una resolución"
        descripcion="Copia los datos tal cual están en la resolución que te dio la DIAN. Con ella, «Por facturar» numera; sin ella no emite nada."
      />
      <CajonCuerpo>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-numero">Número de la resolución</Label>
            <Input
              id="resolucion-numero"
              value={form.numero}
              onChange={(e) => campo('numero')(e.target.value)}
              placeholder="18764003394379"
              data-testid="resolucion-campo-numero"
              {...aria('numero')}
            />
            <ErrorDelCampo id={ID_DEL_ERROR.numero} mensaje={errorDe('numero')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-fecha">Fecha de la resolución</Label>
            <CampoDeFecha
              id="resolucion-fecha"
              value={form.fechaResolucion}
              onChange={campo('fechaResolucion')}
              invalido={Boolean(errorDe('fechaResolucion'))}
              testid="resolucion-campo-fecha"
            />
            <ErrorDelCampo id={ID_DEL_ERROR.fechaResolucion} mensaje={errorDe('fechaResolucion')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-prefijo">Prefijo</Label>
            <Input
              id="resolucion-prefijo"
              value={form.prefijo}
              onChange={(e) => campo('prefijo')(e.target.value)}
              placeholder="FE"
              data-testid="resolucion-campo-prefijo"
              {...aria('prefijo')}
            />
            <ErrorDelCampo
              id={ID_DEL_ERROR.prefijo}
              mensaje={errorDe('prefijo')}
              pista="Déjalo vacío si tu resolución no tiene prefijo."
            />
          </div>
          {datos?.porTipoDisponible && (
            <div className="space-y-1.5">
              <Label htmlFor="resolucion-tipo">Qué documento numera</Label>
              <Select
                value={form.tipoDeDocumento || CUALQUIER_TIPO}
                onValueChange={(v) =>
                  campo('tipoDeDocumento')(v === CUALQUIER_TIPO ? '' : v)
                }
              >
                <SelectTrigger
                  id="resolucion-tipo"
                  data-testid="resolucion-campo-tipo"
                  aria-label="Qué documento numera"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CUALQUIER_TIPO}>
                    Cualquier tipo de documento
                  </SelectItem>
                  {/* Ninguna nota crédito usa resolución (FA-R34): no se ofrece. */}
                  {TIPOS_EN_ORDEN.filter((t) => t !== 'NOTA_CREDITO').map((t) => (
                    <SelectItem key={t} value={t}>
                      {NOMBRE_DEL_TIPO[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-caption text-fg-muted">
                La DIAN autoriza un prefijo y un rango por tipo de documento.
                Déjalo en «cualquiera» si tienes una sola resolución para todo.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-desde">Rango desde</Label>
            <Input
              id="resolucion-desde"
              type="number"
              value={form.desde}
              onChange={(e) => campo('desde')(e.target.value)}
              placeholder="1"
              data-testid="resolucion-campo-desde"
              {...aria('desde')}
            />
            <ErrorDelCampo id={ID_DEL_ERROR.desde} mensaje={errorDe('desde')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-hasta">Rango hasta</Label>
            <Input
              id="resolucion-hasta"
              type="number"
              value={form.hasta}
              onChange={(e) => campo('hasta')(e.target.value)}
              placeholder="5000"
              data-testid="resolucion-campo-hasta"
              {...aria('hasta')}
            />
            <ErrorDelCampo id={ID_DEL_ERROR.hasta} mensaje={errorDe('hasta')} />
          </div>
          {seCruza && sugerencia?.explicacion && (
            <p
              className="text-caption text-danger sm:col-span-2"
              role="alert"
              data-testid="resolucion-se-cruza"
            >
              {sugerencia.explicacion}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-vigente-desde">Vigente desde</Label>
            <CampoDeFecha
              id="resolucion-vigente-desde"
              value={form.vigenteDesde}
              onChange={campo('vigenteDesde')}
              invalido={Boolean(errorDe('vigenteDesde'))}
              testid="resolucion-campo-vigente-desde"
            />
            <ErrorDelCampo id={ID_DEL_ERROR.vigenteDesde} mensaje={errorDe('vigenteDesde')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-vigente-hasta">Vigente hasta</Label>
            <CampoDeFecha
              id="resolucion-vigente-hasta"
              value={form.vigenteHasta}
              onChange={campo('vigenteHasta')}
              invalido={Boolean(errorDe('vigenteHasta'))}
              testid="resolucion-campo-vigente-hasta"
            />
            <ErrorDelCampo id={ID_DEL_ERROR.vigenteHasta} mensaje={errorDe('vigenteHasta')} />
          </div>
          {/* 🔴 Nico (03-10-2026, 19:4x): la resolución de prueba se marca
              aquí. Lo que numere lleva la marca de prueba en su PDF y no se le
              entrega a ningún cliente. */}
          <label
            htmlFor="resolucion-de-prueba"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 sm:col-span-2"
          >
            <Checkbox
              id="resolucion-de-prueba"
              checked={form.esDePrueba}
              onCheckedChange={(v) => setForm((previo) => ({ ...previo, esDePrueba: v === true }))}
              className="mt-0.5"
              data-testid="resolucion-campo-de-prueba"
            />
            <span>
              <span className="block text-sm text-fg">Es una resolución de prueba</span>
              <span className="block text-caption text-fg-muted">
                Lo que numere no se le entrega a ningún cliente.
              </span>
            </span>
          </label>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="resolucion-ultimo">Último número ya usado</Label>
            <Input
              id="resolucion-ultimo"
              type="number"
              value={form.ultimoNumeroUsado}
              onChange={(e) => campo('ultimoNumeroUsado')(e.target.value)}
              placeholder="opcional"
              data-testid="resolucion-campo-ultimo"
              {...aria('ultimoNumeroUsado')}
            />
            <ErrorDelCampo
              id={ID_DEL_ERROR.ultimoNumeroUsado}
              mensaje={errorDe('ultimoNumeroUsado')}
              pista="Sólo si ya gastaste parte del rango en otro sistema. Con esto, la próxima factura sigue desde ahí y no desde el principio del rango."
            />
            {!seCruza &&
              sugerencia?.explicacion &&
              sugerencia.mayorYaUsado !== null &&
              form.ultimoNumeroUsado !== String(sugerencia.ultimoNumeroPropuesto) && (
                <p className="text-caption text-fg" data-testid="resolucion-sugerencia">
                  {sugerencia.explicacion}{' '}
                  <button
                    type="button"
                    onClick={() => campo('ultimoNumeroUsado')(String(sugerencia.ultimoNumeroPropuesto))}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    data-testid="resolucion-usar-sugerencia"
                  >
                    Usar el {sugerencia.ultimoNumeroPropuesto.toLocaleString('es-CO')}
                  </button>
                </p>
              )}
          </div>
        </div>
      </CajonCuerpo>
      <CajonPie ayuda={ayuda}>
        <Button
          variant="outline"
          hideArrow
          disabled={guardando}
          onClick={() => onOpenChange(false)}
          data-testid="resolucion-cancelar"
        >
          Cancelar
        </Button>
        <Button
          hideArrow
          disabled={!completo || guardando || hayErrores(errores) || seCruza}
          onClick={() => void guardar()}
          data-testid="resolucion-guardar"
        >
          {guardando ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Certificate className="h-4 w-4" weight="bold" />
          )}
          {guardando ? 'Cargando…' : 'Cargar resolución'}
        </Button>
      </CajonPie>
    </Cajon>
  )
}
