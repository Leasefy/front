import Link from 'next/link'
import { fmtCOP } from '@/lib/admin/format'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ESTADO_DE_CONTRATO,
  ESTADO_DE_INMUEBLE,
  ESTADO_DE_REPARACION,
  NIVEL_DE_RIESGO,
  PRIORIDAD_DE_REPARACION,
  QUIEN_PAGA,
  TIPO_DE_REPARACION,
  type ContratoDelHistorial,
  type HistorialDelInmueble,
  type NivelDeRiesgo,
  type ReparacionDelHistorial,
} from '@/lib/admin/inmuebles'
import type { PillTone } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { Card, Eyebrow, FranjaDeCifras, MonoLabel } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'

const TONO_DEL_NIVEL: Record<NivelDeRiesgo, PillTone> = {
  sin_datos: 'muted',
  bajo: 'ok',
  medio: 'warn',
  alto: 'bad',
}

const COLOR_DEL_NIVEL: Record<NivelDeRiesgo, string> = {
  sin_datos: 'text-fg-subtle',
  bajo: 'text-success',
  medio: 'text-warning',
  alto: 'text-danger',
}

const BARRA_DEL_NIVEL: Record<NivelDeRiesgo, string> = {
  sin_datos: 'bg-border-strong',
  bajo: 'bg-success',
  medio: 'bg-warning',
  alto: 'bg-danger',
}

const TONO_DEL_CONTRATO: Record<ContratoDelHistorial['status'], PillTone> = {
  ACTIVE: 'ok',
  EXPIRED: 'neutral',
  SIGNED: 'info',
  DRAFT: 'muted',
  PENDING_LANDLORD_SIGNATURE: 'warn',
  PENDING_TENANT_SIGNATURE: 'warn',
  REJECTED_PENDING_MODIFICATIONS: 'warn',
  CANCELLED: 'bad',
}

const TONO_DE_LA_PRIORIDAD: Record<ReparacionDelHistorial['prioridad'], PillTone> = {
  LOW: 'muted',
  MEDIUM: 'neutral',
  HIGH: 'warn',
  EMERGENCY: 'bad',
}

function dias(n: number): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? 'día' : 'días'}`
}

function Seccion({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <Eyebrow className="mb-1">{label}</Eyebrow>
      <h2 className="text-lg font-semibold text-fg mb-3">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Vista pura del historial interno del inmueble: recibe el historial ya
 * calculado por el back y lo pinta. 🔴 Interno de Leasefy — la inmobiliaria no
 * ve nada de esto (Nico, 2026-09-12). Sin estado propio: se prueba sin red.
 */
export function HistorialView({ historial }: { historial: HistorialDelInmueble }) {
  const { inmueble, contratos, ocupacion, reparaciones, canon, riesgo } = historial

  const columnasDeContratos: Column<ContratoDelHistorial>[] = [
    {
      header: '# Leasefy',
      cell: (c) => <span className="font-mono text-caption tabular-nums text-fg">{c.code}</span>,
    },
    {
      header: '# inmobiliaria',
      cell: (c) => (
        <span className="font-mono text-caption tabular-nums text-fg-muted">{c.externalId ?? '—'}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (c) => <Pill tone={TONO_DEL_CONTRATO[c.status]}>{ESTADO_DE_CONTRATO[c.status]}</Pill>,
    },
    {
      header: 'Inicio',
      cell: (c) => <span className="font-mono text-caption tabular-nums">{c.inicio ?? '—'}</span>,
    },
    {
      header: 'Fin',
      cell: (c) => <span className="font-mono text-caption tabular-nums">{c.fin ?? '—'}</span>,
    },
    {
      header: 'Duración',
      align: 'right',
      cell: (c) => (
        <span className="font-mono text-caption tabular-nums">
          {c.duracionDias === null ? '—' : dias(c.duracionDias)}
        </span>
      ),
    },
    {
      header: 'Canon',
      align: 'right',
      cell: (c) => <span className="font-mono text-caption tabular-nums">{fmtCOP(c.canon)}</span>,
    },
    {
      header: 'Arrendó',
      align: 'center',
      cell: (c) => (
        <MonoLabel className={`${c.arrendo ? 'text-success' : 'text-fg-subtle'}`}>
          {c.arrendo ? 'sí' : 'no'}
        </MonoLabel>
      ),
    },
  ]

  const columnasDeReparaciones: Column<ReparacionDelHistorial>[] = [
    {
      header: 'Fecha',
      cell: (r) => <span className="font-mono text-caption tabular-nums">{r.creada}</span>,
    },
    {
      header: 'Tipo',
      cell: (r) => <span className="text-fg">{TIPO_DE_REPARACION[r.tipo]}</span>,
    },
    {
      header: 'Prioridad',
      cell: (r) => (
        <Pill tone={TONO_DE_LA_PRIORIDAD[r.prioridad]}>{PRIORIDAD_DE_REPARACION[r.prioridad]}</Pill>
      ),
    },
    {
      header: 'Qué pasó',
      cell: (r) => <span className="text-fg-muted">{r.titulo}</span>,
    },
    {
      header: 'Estado',
      cell: (r) => (
        <MonoLabel>
          {ESTADO_DE_REPARACION[r.estado]}
        </MonoLabel>
      ),
    },
    {
      header: 'Completada',
      cell: (r) => <span className="font-mono text-caption tabular-nums">{r.completada ?? '—'}</span>,
    },
    {
      header: 'Aprobado',
      align: 'right',
      cell: (r) => <span className="font-mono text-caption tabular-nums">{fmtCOP(r.montoAprobado)}</span>,
    },
    {
      header: 'Paga',
      cell: (r) => <span className="text-caption text-fg-muted">{QUIEN_PAGA[r.pagaQuien]}</span>,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/inmuebles" label="Volver a inmuebles" />

      <PageHeader
        title={`#${inmueble.code}${inmueble.externalId ? ` · ${inmueble.externalId} en la inmobiliaria` : ''}`}
        description={`${inmueble.address} · ${inmueble.city}${inmueble.agencia ? ` · ${inmueble.agencia.name}` : ''}`}
        right={<Pill tone="info">{ESTADO_DE_INMUEBLE[inmueble.status]}</Pill>}
      />

      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-danger flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-danger" />
        interno de leasefy · la inmobiliaria no ve esta pantalla
      </div>

      {/* Medidor de riesgo, con cada señal y sus puntos a la vista */}
      <Card className="p-5" data-testid="riesgo">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <MonoLabel className="block">riesgo</MonoLabel>
            <div className={`text-3xl font-semibold mt-1 ${COLOR_DEL_NIVEL[riesgo.nivel]}`}>
              {NIVEL_DE_RIESGO[riesgo.nivel]}
              {riesgo.nivel !== 'sin_datos' && (
                <span className="text-base font-normal text-fg-muted tabular-nums"> · {riesgo.puntaje} / 100</span>
              )}
            </div>
          </div>
          <Pill tone={TONO_DEL_NIVEL[riesgo.nivel]}>{riesgo.senales.length} señal{riesgo.senales.length === 1 ? '' : 'es'}</Pill>
        </div>
        <div className="h-1.5 w-full bg-surface-hover mt-4" aria-hidden>
          <div
            className={`h-full ${BARRA_DEL_NIVEL[riesgo.nivel]}`}
            style={{ width: `${Math.min(100, Math.max(riesgo.puntaje, riesgo.nivel === 'sin_datos' ? 0 : 3))}%` }}
          />
        </div>
        <ul className="mt-4 divide-y divide-border-faint">
          {riesgo.senales.map((s) => (
            <li key={s.clave} className="py-2.5 flex items-start justify-between gap-4 text-sm">
              <span className="text-fg">{s.texto}</span>
              <span className={`font-mono text-caption tabular-nums shrink-0 ${s.puntos > 0 ? 'text-danger' : 'text-fg-subtle'}`}>
                {s.puntos > 0 ? `+${s.puntos}` : '0'}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Los números que resumen la historia */}
      <FranjaDeCifras fila="lg">
        <KpiCard
          label="contratos"
          value={contratos.total}
          hint={`${contratos.activos} activo${contratos.activos === 1 ? '' : 's'} · ${contratos.terminados} terminado${contratos.terminados === 1 ? '' : 's'}`}
        />
        <KpiCard
          label="veces arrendado"
          value={contratos.vecesArrendado}
          hint={[
            contratos.rotacionPorAno === null
              ? 'historia corta para medir rotación'
              : `${contratos.rotacionPorAno} por año · dura ${contratos.duracionPromedioDias === null ? '—' : dias(contratos.duracionPromedioDias)}`,
            contratos.renovaciones > 0
              ? `${contratos.renovaciones} renovación${contratos.renovaciones === 1 ? '' : 'es'}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <KpiCard
          label="desocupado"
          value={ocupacion.porcentajeDesocupado === null ? '—' : `${ocupacion.porcentajeDesocupado} %`}
          tone={
            ocupacion.porcentajeDesocupado === null
              ? 'default'
              : ocupacion.porcentajeDesocupado >= 25
                ? 'bad'
                : ocupacion.porcentajeDesocupado >= 10
                  ? 'warn'
                  : 'ok'
          }
          hint={
            ocupacion.desde
              ? `${dias(ocupacion.diasDesocupado)} de ${dias(ocupacion.diasObservados)} desde ${ocupacion.desde}`
              : 'sin contratos que arrendaran'
          }
        />
        <KpiCard
          label="reparaciones"
          value={reparaciones.total}
          tone={reparaciones.emergencias > 0 ? 'bad' : reparaciones.total > 0 ? 'warn' : 'default'}
          hint={`${reparaciones.ultimos12Meses} en 12 meses · ${fmtCOP(reparaciones.montoAprobadoTotal)} aprobados`}
        />
        <KpiCard
          label="canon"
          value={fmtCOP(canon.actual)}
          hint={
            canon.variacionPct === null
              ? canon.inicial === null
                ? 'canon publicado'
                : 'sin variación medible'
              : `${canon.variacionPct >= 0 ? '+' : ''}${canon.variacionPct} % desde ${fmtCOP(canon.inicial)}`
          }
        />
      </FranjaDeCifras>

      <Seccion label="ocupación" title="Vacancias entre contratos">
        <Card className="p-4 mb-3 text-sm flex flex-wrap items-center gap-x-6 gap-y-1" data-testid="ocupacion-ahora">
          <MonoLabel className={`${ocupacion.desocupadoAhora ? 'text-danger' : 'text-success'}`}>
            {ocupacion.desocupadoAhora ? 'desocupado ahora' : ocupacion.desde ? 'ocupado ahora' : 'sin historia'}
          </MonoLabel>
          {ocupacion.desocupadoAhora && (
            <span className="text-fg">
              lleva {dias(ocupacion.diasDesocupadoActual)} sin contrato
            </span>
          )}
          {ocupacion.vacanciaPromedioDias !== null && (
            <span className="text-fg-muted">
              {ocupacion.vacancias.length} vacancia{ocupacion.vacancias.length === 1 ? '' : 's'} · {dias(ocupacion.vacanciaPromedioDias)} en promedio
            </span>
          )}
        </Card>
        {ocupacion.vacancias.length === 0 ? (
          <Card className="p-6 text-center text-sm text-fg-muted">
            {ocupacion.desde ? 'Ningún hueco entre un contrato y el siguiente.' : 'Todavía no arrendó.'}
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  {['Desde', 'Hasta', 'Días', 'Entre contratos'].map((h) => (
                    <TableHead key={h} >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ocupacion.vacancias.map((v) => (
                  <TableRow key={`${v.desde}-${v.hasta}`}>
                    <TableCell className="font-mono text-caption tabular-nums">{v.desde}</TableCell>
                    <TableCell className="font-mono text-caption tabular-nums">{v.hasta}</TableCell>
                    <TableCell className={`px-3 py-2.5 font-mono text-caption tabular-nums ${v.dias >= 60 ? 'text-danger' : v.dias >= 30 ? 'text-warning' : ''}`}>
                      {dias(v.dias)}
                    </TableCell>
                    <TableCell className="font-mono text-caption tabular-nums text-fg-muted">
                      #{v.entreContratos[0]} → #{v.entreContratos[1]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </Seccion>

      <Seccion label="contratos" title={`${contratos.total} contrato${contratos.total === 1 ? '' : 's'}`}>
        <DataTable
          columns={columnasDeContratos}
          rows={contratos.lista}
          getKey={(c) => c.id}
          emptyTitle="Sin contratos"
          emptyHint="Este inmueble no tiene ningún contrato cargado."
        />
      </Seccion>

      <Seccion label="reparaciones" title="Qué se le arregló, y cada cuánto">
        {reparaciones.porTipo.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3" data-testid="reparaciones-por-tipo">
            {reparaciones.porTipo.map((t) => (
              <div key={t.tipo} className={`card px-3 py-2 text-sm ${t.recurrente ? '' : ''}`}>
                <span className="font-medium text-fg">{TIPO_DE_REPARACION[t.tipo]}</span>
                <span className="text-fg-muted"> · {t.cantidad}</span>
                {t.cadaDias !== null && (
                  <span className={t.recurrente ? 'text-danger' : 'text-fg-muted'}> · cada {dias(t.cadaDias)}</span>
                )}
                {t.recurrente && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-danger">tendencia</span>
                )}
              </div>
            ))}
          </div>
        )}
        <DataTable
          columns={columnasDeReparaciones}
          rows={reparaciones.lista}
          getKey={(r) => r.id}
          emptyTitle="Sin reparaciones"
          emptyHint="Ninguna solicitud de mantenimiento registrada para este inmueble."
        />
      </Seccion>
    </div>
  )
}
