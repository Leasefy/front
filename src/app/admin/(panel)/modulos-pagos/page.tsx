'use client'

/**
 * /admin/modulos-pagos — inmobiliarias × módulos de PAGO.
 *
 * Nico (17-09): «pantalla de administración de Leasefy con inmobiliarias ×
 * módulos comprados, prender y apagar, y registro de quién lo hizo y cuándo. Que
 * viva detrás del mismo gate de dueño».
 *
 * ── 🔴 Tres decisiones de esta pantalla ────────────────────────────────────
 *
 * 1. **Trae TODAS las inmobiliarias**, no sólo las que compraron algo: la
 *    pregunta que se hace desde acá es «¿a quién falta venderle?», y una lista
 *    que sólo muestra clientes no la contesta.
 * 2. **Pide MOTIVO para prender o apagar.** El back no lo exige; esta pantalla
 *    sí. Un entitlement de pago que nadie explicó es imposible de auditar seis
 *    meses después — y el que lo va a leer es alguien que no estaba ese día.
 * 3. **Prender y apagar pasan por un cajón** que pide el motivo y dice qué va a
 *    pasar (19-10-2026: antes eran `window.confirm` + `window.prompt`, que
 *    ignoran el tema y algunos navegadores suprimen). Apagar se avisa en
 *    amarillo: le quita la pantalla a alguien que puede estar usándola.
 *
 * 20-10-2026: la matriz va en `DataTable` (buscar en vivo, pestañas «Sin
 * ningún módulo» / «Con …» por módulo, ordenar, Excel con quién y cuándo).
 */

import { useMemo, useState } from 'react'
import { SquaresFour } from '@phosphor-icons/react'
import { Alert, Card, Eyebrow } from '@leasefy/cadence'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import {
  fijarModulo,
  getMatrizDeModulos,
  type FilaDeLaMatriz,
  type MatrizDeModulos,
} from '@/lib/admin/modulos-pagos'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { fmtFecha } from '@/lib/admin/format'

/** El back corta la matriz en 500 (`modulos-pagos.service.ts`): se pide todo eso y se busca en vivo. */
const TOPE_DE_LA_MATRIZ = 500

/** Lo que se va a cambiar, mientras el cajón pide el motivo. */
interface CambioPendiente {
  fila: FilaDeLaMatriz
  modulo: string
  nombreDelModulo: string
  prender: boolean
}

const tieneAlguno = (a: FilaDeLaMatriz) => Object.values(a.modulos).some((m) => m.habilitado)

export default function ModulosPagosPage() {
  const { data, isLoading, error, refetch } = useApiQuery<MatrizDeModulos>(
    (signal) => getMatrizDeModulos({ limite: TOPE_DE_LA_MATRIZ }, signal),
    [],
  )

  const [ocupado, setOcupado] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<CambioPendiente | null>(null)
  const [motivo, setMotivo] = useState('')

  const catalogo = useMemo(() => data?.catalogo ?? [], [data])
  const agencias = data?.agencias

  function alternar(fila: FilaDeLaMatriz, modulo: string, nombreDelModulo: string) {
    setFallo(null)
    setMotivo('')
    setPendiente({ fila, modulo, nombreDelModulo, prender: !fila.modulos[modulo]?.habilitado })
  }

  async function confirmarElCambio() {
    if (!pendiente || motivo.trim().length < 3) return
    const { fila, modulo, prender } = pendiente
    const llave = `${fila.agencyId}:${modulo}`
    setOcupado(llave)
    try {
      await fijarModulo(fila.agencyId, modulo, { habilitado: prender, motivo: motivo.trim() })
      setPendiente(null)
      refetch()
    } catch (err) {
      setFallo(
        mensajeDelAdmin(err, {
          accion: `${prender ? 'prender' : 'apagar'} el módulo`,
          porDefecto: `No se pudo ${prender ? 'prender' : 'apagar'} el módulo.`,
        }),
      )
    } finally {
      setOcupado(null)
    }
  }

  const segmentos = useMemo<Segmento<FilaDeLaMatriz>[]>(
    () => [
      { valor: 'todas', nombre: 'Todas', cumple: () => true },
      { valor: 'sin-modulos', nombre: 'Sin ningún módulo', cumple: (a) => !tieneAlguno(a) },
      ...catalogo.map((c) => ({
        valor: c.modulo,
        nombre: `Con ${c.nombre}`,
        cumple: (a: FilaDeLaMatriz) => Boolean(a.modulos[c.modulo]?.habilitado),
      })),
    ],
    [catalogo],
  )

  const columnas = useMemo<Column<FilaDeLaMatriz>[]>(
    () => [
      {
        header: 'Inmobiliaria',
        cell: (a) => <span className="font-medium text-fg">{a.nombre}</span>,
        orden: (a) => a.nombre,
        texto: (a) => a.nombre,
      },
      {
        header: 'NIT',
        cell: (a) => <span className="font-mono text-caption text-fg-muted">{a.nit ?? '—'}</span>,
        texto: (a) => a.nit ?? '',
      },
      ...catalogo.map<Column<FilaDeLaMatriz>>((c) => ({
        header: c.nombre,
        className: 'min-w-[180px]',
        orden: (a) => (a.modulos[c.modulo]?.habilitado ? 1 : 0),
        ordenPrimero: 'desc',
        texto: (a) => (a.modulos[c.modulo]?.habilitado ? 'Comprado' : 'Apagado'),
        cell: (a) => {
          const m = a.modulos[c.modulo]
          const llave = `${a.agencyId}:${c.modulo}`
          return (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Pill tone={m?.habilitado ? 'ok' : 'muted'}>{m?.habilitado ? 'Comprado' : 'Apagado'}</Pill>
              {/* 🔴 Quién y cuándo: es lo que hace auditable la venta. */}
              {m?.habilitadoPorEmail ? (
                <span className="order-last basis-full text-caption leading-tight text-fg-subtle">
                  {m.habilitadoPorEmail} · {m.habilitadoAt ? fmtFecha(m.habilitadoAt) : '—'}
                  {m.motivo ? ` · ${m.motivo}` : ''}
                </span>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={ocupado === llave || !data?.disponible}
                onClick={(e) => {
                  e.stopPropagation()
                  alternar(a, c.modulo, c.nombre)
                }}
                data-testid={`modulo-${c.modulo}-${a.agencyId}`}
              >
                {ocupado === llave ? 'Guardando…' : m?.habilitado ? 'Apagar' : 'Prender'}
              </Button>
            </div>
          )
        },
      })),
    ],
    [catalogo, data?.disponible, ocupado],
  )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Módulos"
        description="Qué módulo de pago tiene comprado cada inmobiliaria, quién se lo prendió y cuándo. Prender o apagar desde acá es lo único que lo cambia: ninguna inmobiliaria puede activárselo sola."
      />

      {data && !data.disponible ? <Alert variant="warning">{data.motivo}</Alert> : null}
      {fallo && !pendiente ? <Alert variant="danger">{fallo}</Alert> : null}
      {agencias && agencias.length >= TOPE_DE_LA_MATRIZ ? (
        <Alert variant="info">
          Se ven las primeras {TOPE_DE_LA_MATRIZ} inmobiliarias por nombre: es lo más que manda el servidor de una vez.
        </Alert>
      ) : null}

      <DataTable
        columns={columnas}
        rows={agencias}
        getKey={(a) => a.agencyId}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="Sin inmobiliarias"
        emptyIcon={<SquaresFour weight="bold" />}
        aria-label="Módulos de pago por inmobiliaria"
        filaMarcada={(a) => a.agencyId === pendiente?.fila.agencyId}
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar por nombre o NIT"
        segmentos={segmentos}
        exportar="modulos-de-pago"
        masEnElExcel={catalogo.flatMap((c) => [
          {
            header: `${c.nombre}: quién`,
            texto: (a: FilaDeLaMatriz) => a.modulos[c.modulo]?.habilitadoPorEmail ?? '',
          },
          {
            header: `${c.nombre}: cuándo`,
            texto: (a: FilaDeLaMatriz) => (a.modulos[c.modulo]?.habilitadoAt ? fmtFecha(a.modulos[c.modulo]!.habilitadoAt!) : ''),
          },
          {
            header: `${c.nombre}: motivo`,
            texto: (a: FilaDeLaMatriz) => a.modulos[c.modulo]?.motivo ?? '',
          },
        ])}
      />

      {catalogo.length > 0 ? (
        <Card className="p-4">
          <Eyebrow className="mb-2">Qué es cada módulo</Eyebrow>
          <dl className="space-y-2">
            {catalogo.map((c) => (
              <div key={c.modulo}>
                <dt className="text-sm text-fg">{c.nombre}</dt>
                <dd className="text-caption leading-relaxed text-fg-muted">{c.descripcion}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      <Cajon abierto={pendiente !== null} onOpenChange={(abierto) => (abierto ? null : setPendiente(null))}>
        <CajonCabecera
          titulo={
            pendiente
              ? `${pendiente.prender ? 'Prender' : 'Apagar'} «${pendiente.nombreDelModulo}» a ${pendiente.fila.nombre}`
              : 'Módulo'
          }
          descripcion={
            pendiente?.prender
              ? 'La inmobiliaria ve el módulo en su menú desde ya.'
              : 'Deja de ver el módulo y sus pantallas no abren. No se borra nada: si se vuelve a prender, está todo como estaba.'
          }
        />
        <CajonCuerpo>
          <div className="space-y-4">
            {pendiente && !pendiente.prender ? <Alert variant="warning">Puede estar usándolo ahora mismo.</Alert> : null}
            <div className="space-y-1.5">
              <label htmlFor="motivo-del-modulo" className="text-body-sm font-medium text-fg">
                ¿Por qué? <span className="text-danger">*</span>
              </label>
              <Textarea
                id="motivo-del-modulo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={pendiente?.prender ? 'Ej.: contrato firmado el 17 de septiembre' : 'Ej.: mora de 3 meses'}
                aria-required="true"
              />
              <p className="text-caption text-fg-subtle">Queda guardado con tu correo y la fecha.</p>
            </div>
            {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
          </div>
        </CajonCuerpo>
        <CajonPie ayuda={motivo.trim().length < 3 ? 'Escribe el motivo para seguir.' : undefined}>
          <Button variant="outline" hideArrow onClick={() => setPendiente(null)}>
            Cancelar
          </Button>
          <Button
            hideArrow
            variant={pendiente?.prender ? 'default' : 'destructive'}
            disabled={!pendiente || motivo.trim().length < 3 || ocupado !== null}
            onClick={() => void confirmarElCambio()}
          >
            {ocupado ? 'Guardando…' : pendiente?.prender ? 'Prender el módulo' : 'Apagar el módulo'}
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
