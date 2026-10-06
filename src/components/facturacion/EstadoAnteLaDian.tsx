'use client'

/**
 * DIAN-FEEL (04-10-2026) — ¿Leasefy ya transmite las facturas de ESTA
 * inmobiliaria a la DIAN? Si no, qué le falta.
 *
 * Nico (04-10, TAL CUAL): «una sola cuenta FEEL de Leasefy que transmite por
 * todas las inmobiliarias». La inmobiliaria NO abre una cuenta en FEEL ni
 * escribe credenciales: la cuenta es de Leasefy. Lo que sí hace ella está en
 * los pasos (`GET /inmobiliaria/facturacion/electronica`):
 *
 *   1. sus datos (NIT y razón social),
 *   2. escoger a FEEL como su proveedor tecnológico en el portal de la DIAN,
 *   3. su resolución vigente con prefijo, cargada en Leasefy,
 *   4. Leasefy la registra en su cuenta de FEEL y prueba la conexión,
 *   5. la resolución de Leasefy y la de FEEL son la misma.
 *
 * Tres piezas:
 *   · `useEstadoAnteLaDian` — lo pide una vez; un back sin la ruta = `null`
 *     (cada pantalla vuelve a lo de antes).
 *   · `BannerDeLaDian` — el aviso de Facturación: con FEEL prendido y la
 *     inmobiliaria lista, desaparece; si no, dice qué le falta a ESTA
 *     inmobiliaria (reemplaza el «todavía no se transmiten» fijo).
 *   · `PasosParaTransmitir` — la sección de Configuración → Facturación.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Circle, CloudArrowUp, Info, Warning } from '@phosphor-icons/react'

import { useAparecer } from '@/components/cobros/extracto-bancario/cuentas-del-extracto'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import {
  facturacionElectronicaService,
  seTransmiteDeVerdad,
  type EstadoAnteLaDian,
} from '@/lib/api/facturacion-electronica.service'

const RUTA_DE_LOS_PASOS = '/panel/inmobiliaria/configuracion/facturacion'

export function useEstadoAnteLaDian(): {
  estado: EstadoAnteLaDian | null
  cargando: boolean
  error: unknown
  recargar: () => Promise<void>
} {
  const [estado, setEstado] = useState<EstadoAnteLaDian | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // Un back sin la ruta (o una prueba que no la simula): como antes.
      const pedir = facturacionElectronicaService.estadoAnteLaDian
      setEstado(typeof pedir === 'function' ? await pedir() : null)
    } catch (e) {
      setError(e)
      setEstado(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { estado, cargando, error, recargar }
}

/** «Ver los pasos» para el administrador; el contador no entra a Configuración. */
function QueHacer({ estado }: { estado: EstadoAnteLaDian }) {
  const permisos = usePermissionsContextSafe()
  if (estado.estado === 'APAGADA') return null
  return permisos?.isAdmin ? (
    <Link
      href={RUTA_DE_LOS_PASOS}
      className="text-caption font-semibold text-primary underline-offset-2 hover:underline"
      data-testid="dian-ver-pasos"
    >
      Ver los pasos
    </Link>
  ) : (
    <span className="text-caption text-fg-muted" data-testid="dian-pidele-al-administrador">
      Los pasos los ve el administrador en Configuración → Facturación.
    </span>
  )
}

/**
 * El aviso de Facturación. Con FEEL prendido y la inmobiliaria lista (y en
 * producción), no se pinta. Sin respuesta del back, el texto de siempre.
 */
export function BannerDeLaDian({ textoDeAntes }: { textoDeAntes: { titulo: string; descripcion: string } }) {
  const { estado, cargando } = useEstadoAnteLaDian()
  const aparecer = useAparecer()
  if (cargando || seTransmiteDeVerdad(estado)) return null
  const titulo = estado?.titulo ?? textoDeAntes.titulo
  const descripcion = estado?.descripcion ?? textoDeAntes.descripcion
  const enPruebas = estado?.estado === 'LISTA' && estado.ambiente === 'PRUEBAS'
  return (
    <motion.div
      {...aparecer}
      className="rounded-lg bg-primary-soft border border-primary/30 p-3 flex items-start gap-2.5"
      data-testid="banner-dian"
      data-estado={estado?.estado ?? 'SIN_DATOS'}
    >
      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
      <div className="min-w-0 space-y-1">
        <p className="text-caption font-semibold text-primary">
          {enPruebas ? 'Transmitiendo en el ambiente de pruebas de la DIAN' : titulo}
        </p>
        <p className="text-caption text-primary/90">{descripcion}</p>
        {estado && <QueHacer estado={estado} />}
      </div>
    </motion.div>
  )
}

const TONO_DEL_ESTADO: Record<EstadoAnteLaDian['estado'], string> = {
  LISTA: 'border-success/30 bg-success-soft',
  APAGADA: 'border-border bg-surface-muted',
  FALTAN_DATOS: 'border-warning/30 bg-warning-soft',
  FALTA_RESOLUCION: 'border-warning/30 bg-warning-soft',
  FALTA_HABILITAR: 'border-warning/30 bg-warning-soft',
  NO_COINCIDE: 'border-warning/30 bg-warning-soft',
}

/** La sección de Configuración → Facturación: el estado y los pasos. */
export function PasosParaTransmitir() {
  const { estado, cargando, error, recargar } = useEstadoAnteLaDian()
  const aparecer = useAparecer()

  return (
    <motion.section
      {...aparecer}
      initial={false}
      className="space-y-4 rounded-lg border border-border bg-surface p-5"
      data-testid="pasos-para-transmitir"
    >
      <header className="space-y-1">
        <h2 className="text-h4 text-fg">Factura electrónica ante la DIAN</h2>
        <p className="text-caption text-fg-muted max-w-2xl">
          Leasefy transmite tus facturas a la DIAN con FEEL, su proveedor tecnológico. La cuenta de
          FEEL es de Leasefy: no tienes que abrir una ni darnos claves.
        </p>
      </header>

      {cargando && !estado ? (
        <div className="h-24 rounded-md bg-surface-muted animate-pulse" aria-busy="true" />
      ) : error ? (
        <FalloDeCarga
          error={error}
          queEs="el estado de tu facturación electrónica"
          onReintentar={() => void recargar()}
        />
      ) : !estado ? (
        <p className="text-caption text-fg-muted" data-testid="pasos-sin-datos">
          Todavía no podemos mostrar en qué va tu habilitación. Escríbenos si la necesitas ya.
        </p>
      ) : (
        <>
          <div
            className={`rounded-lg border p-3 flex items-start gap-2.5 ${TONO_DEL_ESTADO[estado.estado]}`}
            data-testid="pasos-estado"
            data-estado={estado.estado}
          >
            {estado.estado === 'LISTA' ? (
              <CloudArrowUp className="w-5 h-5 text-success flex-shrink-0 mt-0.5" weight="fill" />
            ) : (
              <Warning className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" weight="fill" />
            )}
            <div className="space-y-0.5">
              <p className="text-body font-semibold text-fg">{estado.titulo}</p>
              <p className="text-caption text-fg-muted">{estado.descripcion}</p>
            </div>
          </div>

          <ol className="space-y-2" data-testid="pasos-lista">
            {estado.pasos.map((paso, i) => (
              <motion.li
                key={paso.id}
                {...aparecer}
                transition={{ ...(aparecer.animate as { transition?: object }).transition, delay: i * 0.04 }}
                className="flex items-start gap-3 rounded-md border border-border p-3"
                data-testid={`paso-${paso.id}`}
                data-hecho={paso.hecho ? 'si' : 'no'}
              >
                {paso.hecho ? (
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" weight="fill" aria-label="Hecho" />
                ) : (
                  <Circle className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5" aria-label="Pendiente" />
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className={`text-body font-medium ${paso.hecho ? 'text-fg-muted' : 'text-fg'}`}>
                      {i + 1}. {paso.titulo}
                    </p>
                    <span className="text-caption text-fg-subtle">
                      {paso.quien === 'LEASEFY' ? 'Lo hace Leasefy' : 'Lo haces tú'}
                    </span>
                  </div>
                  <p className="text-caption text-fg-muted">{paso.detalle}</p>
                  {paso.accion && (
                    <Link
                      href={paso.accion.href}
                      className="inline-block text-caption font-semibold text-primary underline-offset-2 hover:underline"
                      data-testid={`paso-accion-${paso.id}`}
                    >
                      {paso.accion.texto}
                    </Link>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>

          <AnimatePresence initial={false}>
            {estado.avisos.length > 0 && (
              <motion.ul {...aparecer} className="space-y-1" data-testid="pasos-avisos">
                {estado.avisos.map((aviso) => (
                  <li key={aviso} className="text-caption text-fg-muted flex items-start gap-1.5">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{aviso}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.section>
  )
}
