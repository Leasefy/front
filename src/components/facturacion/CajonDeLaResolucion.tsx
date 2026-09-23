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
 */

import { useState } from 'react'
import { Certificate } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
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
import { toast } from '@/components/ui/toast'
import {
  facturacionPorMesService,
  type ResolucionesDeLaAgencia,
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

  const campo = (clave: keyof Formulario) => (valor: string) =>
    setForm((previo) => ({ ...previo, [clave]: valor }))

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

  const completo =
    form.numero.trim() !== '' &&
    form.fechaResolucion !== '' &&
    form.desde !== '' &&
    form.hasta !== '' &&
    form.vigenteDesde !== '' &&
    form.vigenteHasta !== ''

  async function guardar() {
    if (!completo || hayErrores(errores) || guardando) return
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
      })
      toast.success('Resolución cargada')
      setForm(VACIO)
      onOpenChange(false)
      await onCargada()
    } catch (e) {
      // El cajón queda abierto y con lo escrito: reintentar no obliga a
      // copiar el papel de la DIAN otra vez.
      toast.error(
        e instanceof Error ? e.message : 'No se pudo cargar la resolución.',
      )
    } finally {
      setGuardando(false)
    }
  }

  /** Qué falta, dicho en el pie: el botón apagado solo no lo explica. */
  const ayuda = hayErrores(errores)
    ? 'Hay un dato que no cuadra: está señalado arriba.'
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
        descripcion="Copia los datos tal cual están en la resolución que te dio la DIAN. Con ella, «Nueva factura» numera; sin ella no emite nada."
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
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-fecha">Fecha de la resolución</Label>
            <Input
              id="resolucion-fecha"
              type="date"
              value={form.fechaResolucion}
              onChange={(e) => campo('fechaResolucion')(e.target.value)}
              data-testid="resolucion-campo-fecha"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-prefijo">Prefijo</Label>
            <Input
              id="resolucion-prefijo"
              value={form.prefijo}
              onChange={(e) => campo('prefijo')(e.target.value)}
              placeholder="FE"
              data-testid="resolucion-campo-prefijo"
            />
            <p className="text-caption text-fg-muted">
              Déjalo vacío si tu resolución no tiene prefijo.
            </p>
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
                  {TIPOS_EN_ORDEN.map((t) => (
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
              aria-invalid={errores.desde ? true : undefined}
              aria-describedby={errores.desde ? 'resolucion-error-desde' : undefined}
            />
            {errores.desde ? (
              <p
                id="resolucion-error-desde"
                role="alert"
                className="text-caption text-danger"
                data-testid="resolucion-error-desde"
              >
                {errores.desde}
              </p>
            ) : null}
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
              aria-invalid={errores.hasta ? true : undefined}
              aria-describedby={errores.hasta ? 'resolucion-error-hasta' : undefined}
            />
            {errores.hasta ? (
              <p
                id="resolucion-error-hasta"
                role="alert"
                className="text-caption text-danger"
                data-testid="resolucion-error-hasta"
              >
                {errores.hasta}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-vigente-desde">Vigente desde</Label>
            <Input
              id="resolucion-vigente-desde"
              type="date"
              value={form.vigenteDesde}
              onChange={(e) => campo('vigenteDesde')(e.target.value)}
              data-testid="resolucion-campo-vigente-desde"
              aria-invalid={errores.vigenteDesde ? true : undefined}
              aria-describedby={
                errores.vigenteDesde ? 'resolucion-error-vigente-desde' : undefined
              }
            />
            {errores.vigenteDesde ? (
              <p
                id="resolucion-error-vigente-desde"
                role="alert"
                className="text-caption text-danger"
                data-testid="resolucion-error-vigente-desde"
              >
                {errores.vigenteDesde}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-vigente-hasta">Vigente hasta</Label>
            <Input
              id="resolucion-vigente-hasta"
              type="date"
              value={form.vigenteHasta}
              onChange={(e) => campo('vigenteHasta')(e.target.value)}
              data-testid="resolucion-campo-vigente-hasta"
              aria-invalid={errores.vigenteHasta ? true : undefined}
              aria-describedby={
                errores.vigenteHasta ? 'resolucion-error-vigente-hasta' : undefined
              }
            />
            {errores.vigenteHasta ? (
              <p
                id="resolucion-error-vigente-hasta"
                role="alert"
                className="text-caption text-danger"
                data-testid="resolucion-error-vigente-hasta"
              >
                {errores.vigenteHasta}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="resolucion-ultimo">Último número ya usado</Label>
            <Input
              id="resolucion-ultimo"
              type="number"
              value={form.ultimoNumeroUsado}
              onChange={(e) => campo('ultimoNumeroUsado')(e.target.value)}
              placeholder="opcional"
              data-testid="resolucion-campo-ultimo"
            />
            <p className="text-caption text-fg-muted">
              Sólo si ya gastaste parte del rango en otro sistema. Con esto, la
              próxima factura sigue desde ahí y no desde el principio del rango.
            </p>
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
          disabled={!completo || guardando || hayErrores(errores)}
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
