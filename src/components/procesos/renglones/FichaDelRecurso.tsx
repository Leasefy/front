'use client'

/**
 * La cosa que tocó un proceso, en un cajón (Nico, 20-10-2026: «todo lo que
 * sea con ver detalle de centro de procesos siempre lo abra con un drawer eso
 * en específico que hizo»). Se pide por su id y se muestra lo justo para
 * saber de qué se trata; si la cosa tiene su pantalla, el pie lleva a ella.
 *
 * Una ficha por tipo de recurso, todas con la misma forma: así el contrato,
 * el propietario, el cobro, el inmueble, el giro, el asiento, la postulación,
 * la renovación, la PQRS, el recibo y el lote de giros se leen igual.
 * La factura y el inquilino tienen su propio cajón (más completo).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { contractsApi } from '@/lib/api/contracts.service'
import { contabilidadApi } from '@/lib/api/contabilidad.service'
import { cobrosApi, dispersionesApi, mantenimientoApi, propietariosApi } from '@/lib/api/inmobiliaria.service'
import { propertiesApi } from '@/lib/api/properties.service'
import { formatCurrency, formatDate } from '@/lib/format'
import { CONTRACT_STATUS_LABELS } from '@/lib/types/contract'
import { getDispersionStatusLabel } from '@/lib/types/inmobiliaria'
import { mesEnTitulo } from '@/lib/utils/mes'
import { landlordApplicationsApi } from '@/lib/api/applications.service'
import { pqrsApi } from '@/lib/api/pqrs-agencia.service'
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service'
import { lotesDeDispersionApi } from '@/lib/api/lotes-de-dispersion.service'
import { renovacionesApi } from '@/lib/api/inmobiliaria.service'
import { getRenovacionStatusLabel } from '@/lib/types/inmobiliaria'
import { nombreDelCandidato } from '@/lib/contratos/nombre-del-candidato'
import { NOMBRE_DEL_ESTADO_DE_LA_POSTULACION } from '@/lib/postulaciones/estado-de-la-postulacion'
import { ESTADO_LABEL as ESTADO_DE_LA_PQRS, TIPO_LABEL as TIPO_DE_PQRS } from '@/components/inmobiliaria/pqrs/pqrs-reglas'
import { NOMBRE_DEL_ESTADO as ESTADO_DEL_LOTE } from '@/components/dispersiones/lotes/estado-del-lote'
import { medioLegible } from '@/components/cobros/extracto-bancario/muchos-a-uno'

interface Dato {
  etiqueta: string
  valor: string
  ancho?: boolean
}

interface LineaDelAsiento {
  cuenta: string
  debito: number
  credito: number
}

export interface Ficha {
  titulo: string
  descripcion?: string | null
  datos: Dato[]
  lineas?: LineaDelAsiento[]
  enlace?: { href: string; texto: string }
}

const o = (v: string | null | undefined, siNo = 'Sin registrar') => (v && v.trim() ? v.trim() : siNo)

const ESTADO_DEL_COBRO: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  late: 'En mora',
  partial: 'Parcial',
  defaulted: 'Incobrable',
}

const ESTADO_DEL_ARREGLO: Record<string, string> = {
  reported: 'Reportada',
  quoted: 'Cotizada',
  approved: 'Aprobada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

const PRIORIDAD_DEL_ARREGLO: Record<string, string> = {
  emergency: 'Emergencia',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const ESTADO_DEL_INMUEBLE: Record<string, string> = {
  available: 'Disponible',
  rented: 'Arrendado',
  pending: 'Pendiente',
}

/** Cómo se arma la ficha de cada tipo de recurso que anotan los procesos. */
const FICHAS: Record<string, (id: string) => Promise<Ficha>> = {
  async CONTRATO(id) {
    const c = await contractsApi.getById(id)
    const numero = c.externalId ? `#${c.externalId}` : c.code != null ? `#${c.code}` : null
    return {
      titulo: numero ? `Contrato ${numero}` : 'Contrato',
      descripcion: o(c.tenantName, 'Sin inquilino'),
      datos: [
        { etiqueta: 'Inmueble', valor: [c.propertyAddress, c.propertyCity].filter((x) => x?.trim()).join(' · ') || 'Sin inmueble', ancho: true },
        { etiqueta: 'Estado', valor: CONTRACT_STATUS_LABELS[c.status] ?? c.status },
        { etiqueta: 'Canon', valor: c.monthlyRent != null ? formatCurrency(c.monthlyRent) : 'Sin canon' },
        { etiqueta: 'Desde', valor: c.startDate ? formatDate(c.startDate) : 'Sin fecha' },
        { etiqueta: 'Hasta', valor: c.endDate ? formatDate(c.endDate) : 'Sin fecha' },
        { etiqueta: 'Correo del inquilino', valor: o(c.tenantEmail), ancho: true },
      ],
      enlace: { href: `/panel/inmobiliaria/contratos/${id}`, texto: 'Abrir el contrato' },
    }
  },

  async PROPIETARIO(id) {
    const p = await propietariosApi.getById(id)
    return {
      titulo: p.name,
      descripcion: 'Propietario',
      datos: [
        { etiqueta: 'Documento', valor: p.documentNumber ? `${p.documentType ?? ''} ${p.documentNumber}`.trim() : 'Sin registrar' },
        { etiqueta: 'Teléfono', valor: o(p.phone) },
        { etiqueta: 'Correo', valor: o(p.email), ancho: true },
      ],
      enlace: { href: `/panel/inmobiliaria/propietarios/${id}`, texto: 'Abrir la ficha del propietario' },
    }
  },

  async COBRO(id) {
    const c = await cobrosApi.getById(id)
    return {
      titulo: `Cobro de ${mesEnTitulo(c.month).toLowerCase()}`,
      descripcion: o(c.tenantName, 'Sin inquilino'),
      datos: [
        { etiqueta: 'Inmueble', valor: o(c.propertyAddress || c.propertyTitle, 'Sin inmueble'), ancho: true },
        { etiqueta: 'Estado', valor: ESTADO_DEL_COBRO[c.status] ?? c.status },
        { etiqueta: 'Vence', valor: c.dueDate ? formatDate(c.dueDate) : 'Sin fecha' },
        { etiqueta: 'Total', valor: formatCurrency(c.totalWithFees) },
        { etiqueta: 'Pagado', valor: formatCurrency(c.paidAmount) },
        { etiqueta: 'Recordatorios enviados', valor: String(c.remindersSent ?? 0) },
        { etiqueta: 'Último recordatorio', valor: c.lastReminderDate ? formatDate(c.lastReminderDate) : 'Ninguno' },
      ],
    }
  },

  async INMUEBLE(id) {
    const p = await propertiesApi.getById(id)
    return {
      titulo: o(p.title, p.address),
      descripcion: [p.address, p.neighborhood, p.city].filter((x) => x?.trim()).join(' · '),
      datos: [
        { etiqueta: 'Estado', valor: ESTADO_DEL_INMUEBLE[p.status] ?? p.status },
        {
          etiqueta: 'Canon',
          valor: p.canonPorConfirmar ? 'Por confirmar' : p.monthlyRent != null ? formatCurrency(p.monthlyRent) : 'Sin canon',
        },
      ],
      enlace: { href: `/panel/inmobiliaria/inmuebles/${id}`, texto: 'Abrir el inmueble' },
    }
  },

  async DISPERSION(id) {
    const d = await dispersionesApi.getById(id)
    return {
      titulo: `Giro de ${mesEnTitulo(d.month).toLowerCase()}`,
      descripcion: d.propietarioName,
      datos: [
        { etiqueta: 'Estado', valor: getDispersionStatusLabel(d.status) },
        { etiqueta: 'Neto a girar', valor: formatCurrency(d.netToPropietario) },
      ],
      enlace: { href: `/panel/inmobiliaria/propietarios/${d.propietarioId}`, texto: 'Abrir la ficha del propietario' },
    }
  },

  async MANTENIMIENTO(id) {
    const m = await mantenimientoApi.getById(id)
    return {
      titulo: o(m.title, 'Arreglo'),
      descripcion: o(m.propertyAddress || m.propertyTitle, 'Sin inmueble'),
      datos: [
        { etiqueta: 'Estado', valor: ESTADO_DEL_ARREGLO[m.status] ?? m.status },
        { etiqueta: 'Prioridad', valor: PRIORIDAD_DEL_ARREGLO[m.priority] ?? m.priority },
        { etiqueta: 'Inquilino', valor: o(m.tenantName, 'Sin inquilino') },
        { etiqueta: 'Valor aprobado', valor: m.approvedAmount != null ? formatCurrency(m.approvedAmount) : 'Sin aprobar' },
        ...(m.description?.trim() ? [{ etiqueta: 'Qué pasa', valor: m.description.trim(), ancho: true }] : []),
      ],
    }
  },

  async ASIENTO(id) {
    const a = await contabilidadApi.asientos.detalle(id)
    return {
      titulo: `Asiento N.º ${a.numero}`,
      descripcion: a.descripcion,
      datos: [
        { etiqueta: 'Fecha', valor: formatDate(a.fecha) },
        ...(a.origenLegible?.rotulo ? [{ etiqueta: 'Viene de', valor: a.origenLegible.rotulo }] : []),
      ],
      lineas: a.movimientos.map((m) => ({
        cuenta: m.cuenta ? `${m.cuenta.codigo} · ${m.cuenta.nombre}` : 'Cuenta',
        debito: m.debitoCop,
        credito: m.creditoCop,
      })),
    }
  },

  // 21-10-2026 (Nico: «sí, después de los roles»): lo que anotan las acciones en
  // bloque de Postulaciones, Solicitudes y Renovaciones, y el reproceso de asientos.
  async POSTULACION(id) {
    const a = await landlordApplicationsApi.getDetail(id)
    const nombre = nombreDelCandidato(a)
    return {
      titulo: nombre === '—' ? 'Postulación' : nombre,
      descripcion: o(a.property?.title, 'Sin inmueble'),
      datos: [
        { etiqueta: 'Estado', valor: NOMBRE_DEL_ESTADO_DE_LA_POSTULACION[a.status] ?? a.status },
        { etiqueta: 'Se postuló', valor: a.submittedAt ? formatDate(a.submittedAt) : 'Sin fecha' },
        { etiqueta: 'Canon', valor: a.property?.monthlyRent != null ? formatCurrency(a.property.monthlyRent) : 'Sin canon' },
        { etiqueta: 'Teléfono', valor: o(a.tenant?.phone) },
        { etiqueta: 'Correo', valor: o(a.tenant?.email ?? a.tenantEmail), ancho: true },
      ],
      enlace: { href: '/panel/inmobiliaria/postulaciones', texto: 'Ir a Postulaciones' },
    }
  },

  async RENOVACION(id) {
    const r = await renovacionesApi.getById(id)
    const propuesto = r.negotiatedRent ?? r.proposedRent
    return {
      titulo: `Renovación de ${o(r.tenantName, 'sin inquilino')}`,
      descripcion: o(r.propertyAddress || r.propertyTitle, 'Sin inmueble'),
      datos: [
        { etiqueta: 'Estado', valor: getRenovacionStatusLabel(r.status) },
        { etiqueta: 'El contrato vence', valor: r.leaseEndDate ? formatDate(r.leaseEndDate) : 'Sin fecha' },
        { etiqueta: 'Canon de hoy', valor: formatCurrency(r.currentRent) },
        { etiqueta: 'Canon propuesto', valor: propuesto != null ? formatCurrency(propuesto) : 'Sin proponer' },
        { etiqueta: 'Propietario', valor: o(r.propietarioName), ancho: true },
      ],
      enlace: { href: '/panel/inmobiliaria/contratos/renovaciones', texto: 'Ir a Renovaciones' },
    }
  },

  async PQRS(id) {
    const p = await pqrsApi.detalle(id)
    return {
      titulo: `${p.radicado} · ${TIPO_DE_PQRS[p.tipo] ?? p.tipo}`,
      descripcion: p.asunto,
      datos: [
        { etiqueta: 'Estado', valor: ESTADO_DE_LA_PQRS[p.estado] ?? p.estado },
        { etiqueta: 'Vence', valor: p.slaVenceAt ? formatDate(p.slaVenceAt) : 'Sin fecha' },
        { etiqueta: 'Quién la radicó', valor: o(p.solicitanteNombre) },
        { etiqueta: 'Responsable', valor: o(p.asignadoANombre, 'Sin asignar') },
        { etiqueta: 'Inmueble', valor: o(p.inmuebleLabel, 'Sin inmueble'), ancho: true },
        ...(p.descripcion?.trim() ? [{ etiqueta: 'Qué pidió', valor: p.descripcion.trim(), ancho: true }] : []),
      ],
      enlace: { href: '/panel/inmobiliaria/solicitudes', texto: 'Ir a Solicitudes' },
    }
  },

  async RECIBO(id) {
    const r = await recibosDeCajaApi.ver(id)
    return {
      titulo: `Recibo de caja N.º ${r.numero}`,
      descripcion: r.cobro ? o(r.cobro.tenantName, 'Sin inquilino') : 'Sin cobro asociado',
      datos: [
        { etiqueta: 'Valor', valor: formatCurrency(r.valorCop) },
        { etiqueta: 'Fecha', valor: r.fecha ? formatDate(r.fecha) : 'Sin fecha' },
        { etiqueta: 'Medio', valor: medioLegible(r.medio) ?? 'Sin medio' },
        { etiqueta: 'Estado', valor: r.anuladoAt ? `Anulado el ${formatDate(r.anuladoAt)}` : 'Vigente' },
        ...(r.cobro ? [{ etiqueta: 'Cobro', valor: mesEnTitulo(r.cobro.month) }] : []),
        ...(r.referencia?.trim() ? [{ etiqueta: 'Referencia', valor: r.referencia.trim() }] : []),
        ...(r.cobro?.propertyTitle?.trim() ? [{ etiqueta: 'Inmueble', valor: r.cobro.propertyTitle.trim(), ancho: true }] : []),
      ],
      enlace: { href: '/panel/inmobiliaria/pagos/recibos', texto: 'Ir a Recibos' },
    }
  },

  async LOTE_DE_DISPERSION(id) {
    const { lote } = await lotesDeDispersionApi.ver(id)
    return {
      titulo: `Lote de giros de ${mesEnTitulo(lote.month).toLowerCase()}`,
      descripcion: `${lote.cantidad} ${lote.cantidad === 1 ? 'giro' : 'giros'}`,
      datos: [
        { etiqueta: 'Estado', valor: ESTADO_DEL_LOTE[lote.estado] ?? lote.estado },
        { etiqueta: 'Total', valor: formatCurrency(lote.totalCop) },
        { etiqueta: 'Aprobado', valor: lote.aprobadoAt ? formatDate(lote.aprobadoAt) : 'Sin aprobar' },
        { etiqueta: 'Pagado', valor: lote.pagadoAt ? formatDate(lote.pagadoAt) : 'Sin pagar' },
      ],
      enlace: { href: `/panel/inmobiliaria/pagos/dispersiones/lotes/${id}`, texto: 'Abrir el lote' },
    }
  },
}

/** Los recursos que se abren con esta ficha. */
export const TIPOS_CON_FICHA: ReadonlySet<string> = new Set(Object.keys(FICHAS))

export function FichaDelRecurso({
  recurso,
  onCerrar,
}: {
  recurso: { tipo: string; id: string } | null
  onCerrar: () => void
}) {
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [fallo, setFallo] = useState<unknown>(null)
  const [intento, setIntento] = useState(0)
  const armar = recurso ? FICHAS[recurso.tipo] : undefined
  const abierto = Boolean(recurso && armar)

  useEffect(() => {
    if (!recurso || !armar) return
    let vivo = true
    setFicha(null)
    setFallo(null)
    armar(recurso.id)
      .then((f) => vivo && setFicha(f))
      .catch((e) => vivo && setFallo(e))
    return () => {
      vivo = false
    }
  }, [recurso, armar, intento])

  return (
    <Cajon abierto={abierto} onOpenChange={(v) => !v && onCerrar()} data-testid="ficha-del-recurso">
      <CajonCabecera titulo={ficha?.titulo ?? 'Cargando…'} descripcion={ficha?.descripcion ?? undefined} />
      <CajonCuerpo className="space-y-5">
        {fallo ? (
          <FalloDeCarga error={fallo} onReintentar={() => setIntento((n) => n + 1)} />
        ) : !ficha ? (
          <div className="space-y-3" aria-label="Cargando" role="status">
            {[0, 1, 2].map((k) => (
              <div key={k} className="h-10 animate-pulse rounded-md bg-surface-muted" />
            ))}
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
              {ficha.datos.map((d) => (
                <div key={d.etiqueta} className={d.ancho ? 'col-span-2' : undefined}>
                  <dt className="text-caption text-fg-subtle">{d.etiqueta}</dt>
                  <dd className="break-words text-fg">{d.valor}</dd>
                </div>
              ))}
            </dl>
            {ficha.lineas && ficha.lineas.length > 0 && (
              <div>
                <p className="mb-2 text-label uppercase text-fg-subtle">Movimientos</p>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {ficha.lineas.map((l, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2 text-body-sm">
                      <span className="min-w-0 text-fg">{l.cuenta}</span>
                      <span className="shrink-0 font-mono tabular-nums text-fg">
                        {l.debito > 0 ? formatCurrency(l.debito) : `−${formatCurrency(l.credito)}`}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-caption text-fg-subtle">Débitos en positivo, créditos con «−».</p>
              </div>
            )}
          </>
        )}
      </CajonCuerpo>
      {ficha?.enlace && (
        <CajonPie>
          <Button asChild variant="secondary">
            <Link href={ficha.enlace.href} data-testid="ficha-del-recurso-enlace">
              {ficha.enlace.texto}
            </Link>
          </Button>
        </CajonPie>
      )}
    </Cajon>
  )
}
