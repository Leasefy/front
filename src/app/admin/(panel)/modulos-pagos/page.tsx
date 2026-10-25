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

import { toast } from 'sonner'
import { useMemo, useState } from 'react'
import { SquaresFour } from '@phosphor-icons/react'
import { Alert, Cifra, FranjaDeCifras } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'

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
  // Ronda 26 (revisora r25): la fila abre su cajón con los módulos y ahí se prende o apaga (antes 35
  // «Apagado» + 35 «Prender» en la tabla).
  const [abierta, setAbierta] = useState<FilaDeLaMatriz | null>(null)
  const [motivo, setMotivo] = useState('')

  const catalogo = useMemo(() => data?.catalogo ?? [], [data])
  const agencias = data?.agencias
  const conAlguno = (agencias ?? []).filter((a) => catalogo.some((c) => a.modulos[c.modulo]?.habilitado)).length

  function alternar(fila: FilaDeLaMatriz, modulo: string, nombreDelModulo: string) {
    setFallo(null)
    setMotivo('')
    setAbierta(null)
    setPendiente({ fila, modulo, nombreDelModulo, prender: !fila.modulos[modulo]?.habilitado })
  }

  async function confirmarElCambio() {
    if (!pendiente || motivo.trim().length < 3) return
    const { fila, modulo, prender, nombreDelModulo } = pendiente
    const llave = `${fila.agencyId}:${modulo}`
    setOcupado(llave)
    try {
      await fijarModulo(fila.agencyId, modulo, { habilitado: prender, motivo: motivo.trim() })
      setPendiente(null)
      toast.success(`Listo: «${nombreDelModulo}» quedó ${prender ? 'prendido' : 'apagado'} para ${fila.nombre}.`)
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
        nombre: `Con ${c.nombre.charAt(0).toLowerCase()}${c.nombre.slice(1)}`,
        cumple: (a: FilaDeLaMatriz) => Boolean(a.modulos[c.modulo]?.habilitado),
      })),
    ],
    [catalogo],
  )

  const columnas = useMemo<Column<FilaDeLaMatriz>[]>(
    () => [
      {
        header: 'Inmobiliaria',
        // Ronda 30 (revisora r27, T15): el NIT bajo el nombre cuando lo hay (antes su columna con «—» en 34 de 35).
        cell: (a) => (
          <div className="min-w-0">
            <span className="font-medium text-fg">{a.nombre}</span>
            {a.nit ? <span className="block font-mono text-caption tabular-nums text-fg-muted">NIT {a.nit}</span> : null}
          </div>
        ),
        orden: (a) => a.nombre,
        texto: (a) => [a.nombre, a.nit].filter(Boolean).join(' '),
      },
      ...catalogo.map<Column<FilaDeLaMatriz>>((c) => ({
        header: c.nombre,
        className: 'min-w-[180px]',
        orden: (a) => (a.modulos[c.modulo]?.habilitado ? 1 : 0),
        ordenPrimero: 'desc',
        texto: (a) => (a.modulos[c.modulo]?.habilitado ? 'Comprado' : 'Apagado'),
        cell: (a) => {
          const m = a.modulos[c.modulo]
          return m?.habilitado ? (
            <div className="flex flex-col items-start gap-1">
              <Pill tone="ok">Comprado</Pill>
              {/* 🔴 Quién y cuándo: es lo que hace auditable la venta. */}
              {m.habilitadoPorEmail ? (
                <span className="text-caption leading-tight text-fg-subtle">
                  {m.habilitadoPorEmail} · {m.habilitadoAt ? fmtFecha(m.habilitadoAt) : '—'}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-fg-subtle" title="Apagado">
              <span aria-hidden="true">—</span>
              <span className="sr-only">Apagado</span>
            </span>
          )
        },
      })),
    ],
    [catalogo],
  )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Módulos"
        description="Qué módulos de pago tiene cada inmobiliaria y quién se los prendió."
        ayuda={
          <ParaEntenderMas etiqueta="Qué es cada módulo" titulo="Los módulos de pago" variante="secundario">
            <div className="space-y-4 text-body-sm">
              <p className="text-fg-muted">
                Prender o apagar desde aquí es lo único que lo cambia: ninguna inmobiliaria puede activárselo sola. Cada
                cambio pide un motivo y queda guardado con tu correo y la fecha.
              </p>
              {catalogo.length > 0 ? (
                <dl className="space-y-3">
                  {catalogo.map((c) => (
                    <div key={c.modulo}>
                      <dt className="font-medium text-fg">{c.nombre}</dt>
                      <dd className="leading-relaxed text-fg-muted">{c.descripcion}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10: LA RESPUESTA (cuántas tienen algún módulo) y, debajo, cuántas tiene cada módulo. */}
      {agencias && agencias.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <CifraHeroe
              rotulo="Con algún módulo de pago"
              cifra={conAlguno.toLocaleString('es-CO')}
              contexto={`de ${agencias.length.toLocaleString('es-CO')} ${agencias.length === 1 ? 'inmobiliaria' : 'inmobiliarias'}`}
              tramos={[
                { clave: 'con', etiqueta: 'Con algún módulo', monto: conAlguno, tono: 'exito', siempre: true, cifra: conAlguno.toLocaleString('es-CO') },
                {
                  clave: 'sin',
                  etiqueta: 'Sin módulos',
                  monto: agencias.length - conAlguno,
                  tono: 'neutro',
                  cifra: (agencias.length - conAlguno).toLocaleString('es-CO'),
                },
              ]}
              total={agencias.length}
              data-testid="modulos-con-alguno"
            />
          </div>
          {/* Con un solo módulo, la franja repetía la cifra de arriba («Nómina 1»). */}
          {catalogo.length > 1 && catalogo.length <= 4 ? (
            <FranjaDeCifras fila="md" columnas={catalogo.length} aria-label="Cuántas tienen cada módulo">
              {catalogo.map((c) => (
                <Cifra
                  key={c.modulo}
                  etiqueta={c.nombre}
                  valor={agencias.filter((a) => a.modulos[c.modulo]?.habilitado).length}
                  detalle={agencias.filter((a) => a.modulos[c.modulo]?.habilitado).length === 1 ? 'inmobiliaria' : 'inmobiliarias'}
                />
              ))}
            </FranjaDeCifras>
          ) : null}
        </div>
      ) : null}

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
        emptyIcon={<SquaresFour weight="duotone" />}
        aria-label="Módulos de pago por inmobiliaria"
        filaMarcada={(a) => a.agencyId === (pendiente?.fila.agencyId ?? abierta?.agencyId)}
        onRowClick={(a) => {
          setFallo(null)
          setAbierta(a)
        }}
        // Lo comprado primero (antes la única con Nómina quedaba en la página 2).
        ordenInicial={catalogo.length > 0 ? { columna: 1, sentido: 'desc' } : undefined}
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar por nombre o NIT"
        segmentos={segmentos}
        exportar="modulos-de-pago"
        masEnElExcel={[{ header: 'NIT', texto: (a: FilaDeLaMatriz) => a.nit ?? '' }, ...catalogo.flatMap((c) => [
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
        ])]}
      />

      <Cajon abierto={abierta !== null && pendiente === null} onOpenChange={(v) => (v ? null : setAbierta(null))}>
        <CajonCabecera
          titulo={abierta ? `Módulos de ${abierta.nombre}` : 'Módulos'}
          descripcion="Prender o apagar desde aquí es lo único que lo cambia; cada cambio pide un motivo."
        />
        <CajonCuerpo>
          {abierta ? (
            <ul className="divide-y divide-border">
              {catalogo.map((c) => {
                const m = abierta.modulos[c.modulo]
                const llave = `${abierta.agencyId}:${c.modulo}`
                return (
                  <li key={c.modulo} className="flex items-start justify-between gap-4 py-3.5">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body-sm font-medium text-fg">{c.nombre}</span>
                        <Pill tone={m?.habilitado ? 'ok' : 'muted'}>{m?.habilitado ? 'Comprado' : 'Apagado'}</Pill>
                      </div>
                      {m?.habilitadoPorEmail ? (
                        <p className="text-caption text-fg-subtle">
                          {m.habilitadoPorEmail} · {m.habilitadoAt ? fmtFecha(m.habilitadoAt) : '—'}
                          {m.motivo ? ` · ${m.motivo}` : ''}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      hideArrow
                      disabled={ocupado === llave || !data?.disponible}
                      onClick={() => alternar(abierta, c.modulo, c.nombre)}
                      data-testid={`modulo-${c.modulo}-${abierta.agencyId}`}
                    >
                      {ocupado === llave ? 'Guardando…' : m?.habilitado ? 'Apagar' : 'Prender'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </CajonCuerpo>
      </Cajon>

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
