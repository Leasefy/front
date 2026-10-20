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
 */

import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Pill } from '@/components/admin/Pill'
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from '@/components/admin/screen/states'
import { ApiError } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import {
  fijarModulo,
  getMatrizDeModulos,
  type FilaDeLaMatriz,
  type MatrizDeModulos,
} from '@/lib/admin/modulos-pagos'
import { Alert, Card, Eyebrow } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { fmtFecha } from '@/lib/admin/format'

/** Lo que se va a cambiar, mientras el cajón pide el motivo. */
interface CambioPendiente {
  fila: FilaDeLaMatriz
  modulo: string
  nombreDelModulo: string
  prender: boolean
}

export default function ModulosPagosPage() {
  const [busqueda, setBusqueda] = useState('')
  const [aplicada, setAplicada] = useState('')
  const { data, isLoading, error, refetch } = useApiQuery<MatrizDeModulos>(
    (signal) => getMatrizDeModulos({ q: aplicada || undefined }, signal),
    [aplicada],
  )

  const [ocupado, setOcupado] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [soloConModulos, setSoloConModulos] = useState(false)

  const catalogo = data?.catalogo ?? []
  const agencias = useMemo(() => data?.agencias ?? [], [data])

  const conAlguno = useMemo(
    () =>
      agencias.filter((a) =>
        Object.values(a.modulos).some((m) => m.habilitado),
      ),
    [agencias],
  )
  const visibles = soloConModulos ? conAlguno : agencias

  const [pendiente, setPendiente] = useState<CambioPendiente | null>(null)
  const [motivo, setMotivo] = useState('')

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

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Módulos"
        description="Qué módulo de pago tiene comprado cada inmobiliaria, quién se lo prendió y cuándo. Prender o apagar desde acá es lo único que lo cambia: ninguna inmobiliaria puede activárselo sola."
      />

      {data && !data.disponible ? <Alert variant="warning">{data.motivo}</Alert> : null}

      {fallo && !pendiente ? <Alert variant="danger">{fallo}</Alert> : null}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setAplicada(busqueda.trim())
        }}
      >
        <Input
          
          placeholder="Buscar por nombre o NIT"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar inmobiliaria"
        />
        <Button variant="outline" hideArrow type="submit">
          Buscar
        </Button>
        <label className="ml-auto flex cursor-pointer select-none items-center gap-2.5 text-body-sm text-fg-muted">
          <Switch checked={soloConModulos} onCheckedChange={setSoloConModulos} aria-label="Sólo las que compraron algo" />
          Sólo las que compraron algo ({conAlguno.length})
        </label>
      </form>

      {isLoading ? (
        <LoadingBlock label="cargando inmobiliarias" />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : visibles.length === 0 ? (
        <EmptyBlock
          title={
            soloConModulos
              ? 'Ninguna inmobiliaria tiene módulos de pago'
              : 'Sin inmobiliarias'
          }
          hint={
            soloConModulos
              ? 'Desmarca el filtro para ver todas y prenderle el módulo a alguna.'
              : 'Ajusta la búsqueda.'
          }
        />
      ) : (
        <>
          <p className="text-caption text-fg-muted mb-3">
            Mostrando {visibles.length} de {agencias.length} inmobiliarias ·{' '}
            {conAlguno.length} con al menos un módulo comprado
          </p>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  {['Inmobiliaria', 'NIT', ...catalogo.map((c) => c.nombre)].map(
                    (h, i) => (
                      <TableHead
                        key={i}
                        
                      >
                        {h}
                      </TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((a) => (
                  <TableRow key={a.agencyId}>
                    <TableCell >{a.nombre}</TableCell>
                    <TableCell className="font-mono text-caption text-fg-muted">
                      {a.nit ?? '—'}
                    </TableCell>
                    {catalogo.map((c) => {
                      const m = a.modulos[c.modulo]
                      const llave = `${a.agencyId}:${c.modulo}`
                      return (
                        <TableCell key={c.modulo} className="px-3 py-2.5">
                          <div className="flex flex-col gap-1.5 items-start">
                            <Pill tone={m?.habilitado ? 'ok' : 'muted'}>
                              {m?.habilitado ? 'Comprado' : 'Apagado'}
                            </Pill>
                            {/* 🔴 Quién y cuándo: es lo que hace auditable la venta. */}
                            {m?.habilitadoPorEmail && (
                              <span className="text-[10px] text-fg-subtle leading-tight">
                                {m.habilitadoPorEmail} · {m.habilitadoAt ? fmtFecha(m.habilitadoAt) : '—'}
                                {m.motivo ? ` · ${m.motivo}` : ''}
                              </span>
                            )}
                            <Button variant="outline" hideArrow disabled={ocupado === llave || !data?.disponible}
                              onClick={() => void alternar(a, c.modulo, c.nombre)}
                            >
                              {ocupado === llave
                                ? '…'
                                : m?.habilitado
                                  ? 'Apagar'
                                  : 'Prender'}
                            </Button>
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4 mt-6">
            <Eyebrow className="mb-2">Qué es cada módulo</Eyebrow>
            <dl className="space-y-2">
              {catalogo.map((c) => (
                <div key={c.modulo}>
                  <dt className="text-sm text-fg">{c.nombre}</dt>
                  <dd className="text-caption text-fg-muted leading-relaxed">
                    {c.descripcion}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </>
      )}
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
            {pendiente && !pendiente.prender ? (
              <Alert variant="warning">Puede estar usándolo ahora mismo.</Alert>
            ) : null}
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
