'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { Flag } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import type { RespuestaDeBanderas, BanderasDeLaInmobiliaria } from '@/lib/admin/banderas'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'

const SEGMENTOS: Segmento<BanderasDeLaInmobiliaria>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  { valor: 'todos', nombre: 'Todos los agentes', cumple: (f) => f.lista !== null && f.hereda },
  { valor: 'propia', nombre: 'Lista propia', cumple: (f) => f.lista !== null && !f.hereda },
  { valor: 'pausa', nombre: 'En pausa', cumple: (f) => f.pausada },
  { valor: 'sin-micro', nombre: 'Sin conectar al asistente', cumple: (f) => f.lista === null },
]

/**
 * /admin/feature-flags — Banderas: qué agentes corren para cada inmobiliaria
 * (19-10-2026, Nico: «construirlas de verdad», «por inmobiliaria»). Era una
 * maqueta con filas inventadas. Back: `api/v1/admin/banderas` sobre
 * `agent.agency_policies.agentes_habilitados`, con la misma regla del micro.
 */
export default function BanderasPage() {
  const { data, isLoading, error, refetch } = useApiQuery<RespuestaDeBanderas>((s) => adminApi('/banderas', { signal: s }), [])
  const [abierta, setAbierta] = useState<BanderasDeLaInmobiliaria | null>(null)
  const [cambio, setCambio] = useState<{ agente: string; encendido: boolean } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const total = data?.agentes.length ?? 0
  // Cada inmobiliaria en un solo tramo: la pausa manda; después, si hereda todos o tiene lista propia.
  const filas = data?.inmobiliarias ?? []
  const cuenta = {
    pausa: filas.filter((f) => f.pausada).length,
    sin: filas.filter((f) => !f.pausada && f.lista === null).length,
    todos: filas.filter((f) => !f.pausada && f.lista !== null && f.hereda).length,
    propia: filas.filter((f) => !f.pausada && f.lista !== null && !f.hereda).length,
  }
  const conAgentes = cuenta.todos + cuenta.propia

  async function guardar() {
    if (!abierta || !cambio || motivo.trim().length < 5) return
    setGuardando(true)
    setFallo(null)
    try {
      const fila = await adminApi<BanderasDeLaInmobiliaria>(`/banderas/${abierta.tenant_id}/${cambio.agente}`, {
        method: 'PUT',
        body: { encendido: cambio.encendido, motivo: motivo.trim() },
      })
      setAbierta({ ...abierta, ...fila })
      // Ronda 26 (T10): aviso al terminar.
      toast.success(cambio.encendido ? 'Listo: el agente quedó prendido' : 'Listo: el agente quedó apagado')
      setCambio(null)
      setMotivo('')
      refetch()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: 'cambiar el agente', porDefecto: 'No se pudo cambiar el agente.' }))
    } finally {
      setGuardando(false)
    }
  }

  const algunaEnPausa = (data?.inmobiliarias ?? []).some((f) => f.pausada)
  const columnas: Column<BanderasDeLaInmobiliaria>[] = [
    { header: 'Inmobiliaria', orden: (f) => f.nombre, texto: (f) => f.nombre, cell: (f) => <span className="font-medium text-fg">{f.nombre}</span> },
    {
      header: 'Agentes',
      orden: (f) => (f.lista === null ? null : Object.values(f.encendidos).filter(Boolean).length),
      ordenPrimero: 'desc',
      texto: (f) =>
        f.lista === null
          ? 'Sin conectar al asistente'
          : f.hereda
            ? `Todos (${total})`
            : `${Object.values(f.encendidos).filter(Boolean).length} de ${total}`,
      cell: (f) => {
        const n = Object.values(f.encendidos).filter(Boolean).length
        return f.lista === null ? (
          <span className="text-caption text-fg-muted">Sin conectar al asistente</span>
        ) : f.hereda ? (
          <span className="text-body-sm text-fg">Todos ({total}) · como viene por defecto</span>
        ) : (
          <span className="text-body-sm text-fg">
            {n} de {total} encendidos
          </span>
        )
      },
    },
    // Ronda 26 (revisora r25): la columna «Pausa de emergencia» sólo cuando alguna está en pausa (antes «No» en
    // todas); al Excel va siempre. Sin «Ver sus agentes» por fila: tocar la fila hace lo mismo.
    ...(algunaEnPausa
      ? [
          {
            header: 'Pausa de emergencia',
            orden: (f: BanderasDeLaInmobiliaria) => (f.pausada ? 0 : 1),
            texto: (f: BanderasDeLaInmobiliaria) => (f.pausada ? 'En pausa' : 'No'),
            cell: (f: BanderasDeLaInmobiliaria) =>
              f.pausada ? <Pill tone="bad" dot>En pausa</Pill> : <span className="text-fg-subtle">—</span>,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Banderas"
        description="Qué agentes corren para cada inmobiliaria; toca una para prender o apagar."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo funciona" titulo="Las banderas de los agentes" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>Cada cambio pide un motivo y queda registrado con tu correo y la fecha.</p>
              <p>Además, cada agente tiene un interruptor general en el servidor: si está apagado allá, no corre para nadie aunque aquí esté encendido.</p>
              <p>La pausa de emergencia manda sobre todo: con ella, ningún agente corre.</p>
            </div>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10: LA RESPUESTA (para cuántas corren los agentes) con la barra de cómo está cada una. */}
      {data && data.inmobiliarias.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Con agentes corriendo"
            cifra={conAgentes.toLocaleString('es-CO')}
            contexto={`de ${data.inmobiliarias.length.toLocaleString('es-CO')} ${data.inmobiliarias.length === 1 ? 'inmobiliaria' : 'inmobiliarias'}`}
            tramos={[
              { clave: 'todos', etiqueta: 'Todos los agentes', monto: cuenta.todos, tono: 'exito', cifra: cuenta.todos.toLocaleString('es-CO'), siempre: true },
              { clave: 'propia', etiqueta: 'Lista propia', monto: cuenta.propia, tono: 'neutro', cifra: cuenta.propia.toLocaleString('es-CO') },
              { clave: 'pausa', etiqueta: 'En pausa', monto: cuenta.pausa, tono: 'critico', cifra: cuenta.pausa.toLocaleString('es-CO') },
              { clave: 'sin', etiqueta: 'Sin conectar', monto: cuenta.sin, tono: 'neutro', cifra: cuenta.sin.toLocaleString('es-CO') },
            ]}
            total={data.inmobiliarias.length}
            data-testid="banderas-con-agentes"
          />
        </div>
      ) : null}
      <DataTable
        errorTitulo="No pudimos cargar las banderas"
        columns={columnas}
        rows={data?.inmobiliarias}
        getKey={(f) => f.tenant_id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="Ninguna inmobiliaria está conectada al asistente de agentes"
        emptyIcon={<Flag weight="duotone" />}
        aria-label="Banderas por inmobiliaria"
        onRowClick={(f) => {
          if (f.lista === null) return
          setAbierta(f)
          setCambio(null)
          setMotivo('')
          setFallo(null)
        }}
        filaMarcada={(f) => f.tenant_id === abierta?.tenant_id}
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar inmobiliaria"
        segmentos={SEGMENTOS}
        exportar="banderas"
        masEnElExcel={[
          ...(algunaEnPausa
            ? []
            : [{ header: 'Pausa de emergencia', texto: (f: BanderasDeLaInmobiliaria) => (f.pausada ? 'En pausa' : 'No') }]),
          ...(data?.agentes ?? []).map((a) => ({
          header: a.nombre,
          texto: (f: BanderasDeLaInmobiliaria) => (f.lista === null ? '' : Boolean(f.encendidos[a.agente])),
          })),
        ]}
      />

      <Cajon abierto={abierta !== null} onOpenChange={(a) => (a ? null : setAbierta(null))}>
        <CajonCabecera
          titulo={abierta ? `Agentes de ${abierta.nombre}` : 'Agentes'}
          descripcion={abierta?.hereda ? 'Hoy tiene todos encendidos, como viene por defecto.' : 'Tiene una lista propia de agentes.'}
        />
        <CajonCuerpo>
          <div className="space-y-4">
            {abierta?.pausada ? <Alert variant="danger">Está en pausa de emergencia: ningún agente corre aunque esté encendido.</Alert> : null}
            <ul className="divide-y divide-border rounded-lg border border-border">
              {(data?.agentes ?? []).map((a) => {
                const encendido = cambio?.agente === a.agente ? cambio.encendido : Boolean(abierta?.encendidos[a.agente])
                return (
                  <li key={a.agente} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-body-sm font-medium text-fg">{a.nombre}</div>
                      <div className="text-caption text-fg-muted">{a.queHace}</div>
                    </div>
                    <Switch
                      checked={encendido}
                      disabled={guardando || (cambio !== null && cambio.agente !== a.agente)}
                      onCheckedChange={(v) => {
                        setFallo(null)
                        setCambio(v === Boolean(abierta?.encendidos[a.agente]) ? null : { agente: a.agente, encendido: v })
                      }}
                      aria-label={`${a.nombre} para ${abierta?.nombre ?? ''}`}
                    />
                  </li>
                )
              })}
            </ul>
            {cambio ? (
              <div className="space-y-1.5">
                <label htmlFor="motivo-bandera" className="text-body-sm font-medium text-fg">
                  ¿Por qué lo {cambio.encendido ? 'prendes' : 'apagas'}? <span className="text-danger">*</span>
                </label>
                <Textarea id="motivo-bandera" aria-required="true" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <p className="text-caption text-fg-subtle">Queda guardado con tu correo y la fecha.</p>
              </div>
            ) : null}
            {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
          </div>
        </CajonCuerpo>
        <CajonPie ayuda={cambio && motivo.trim().length < 5 ? 'Escribe el motivo (al menos 5 letras).' : undefined}>
          <Button variant="outline" hideArrow onClick={() => (cambio ? setCambio(null) : setAbierta(null))}>
            {cambio ? 'Deshacer' : 'Cerrar'}
          </Button>
          {cambio ? (
            <Button hideArrow disabled={motivo.trim().length < 5 || guardando} isLoading={guardando} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Guardar el cambio'}
            </Button>
          ) : null}
        </CajonPie>
      </Cajon>
    </div>
  )
}
