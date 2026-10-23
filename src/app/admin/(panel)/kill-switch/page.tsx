'use client'

import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { toast } from 'sonner'
import { useState } from 'react'
import { CheckCircle, Power } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { fmtDateTime } from '@/lib/admin/format'
import type { RespuestaDeBanderas, BanderasDeLaInmobiliaria } from '@/lib/admin/banderas'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'

const SEGMENTOS: Segmento<BanderasDeLaInmobiliaria>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  { valor: 'pausa', nombre: 'En pausa', cumple: (f) => f.pausada },
  { valor: 'funcionando', nombre: 'Funcionando', cumple: (f) => !f.pausada },
]

/**
 * /admin/kill-switch — Pausa de emergencia (19-10-2026, Nico: «por
 * inmobiliaria, todos sus agentes, con motivo y registro; la inmobiliaria no se
 * la quita»). Era una maqueta. Pone o quita la llave `pausa_de_emergencia` en
 * `agent.agency_policies.agentes_habilitados`; el micro, con ella, no corre
 * ningún agente (`agent/src/piloto/habilitacion.ts`).
 */
export default function PausaDeEmergenciaPage() {
  const { data, isLoading, error, refetch } = useApiQuery<RespuestaDeBanderas>((s) => adminApi('/banderas', { signal: s }), [])
  // Ronda 26 (revisora r25): «Pausar todo» UNA vez arriba (antes un botón por fila en las 35) y la fila
  // abre el mismo cajón con su inmobiliaria elegida; en la fila sólo queda «Reanudar», en las pausadas.
  const [cajon, setCajon] = useState<{ tenantId: string } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const filas = (data?.inmobiliarias ?? []).filter((f) => f.lista !== null)
  const enPausa = filas.filter((f) => f.pausada).length
  const funcionando = filas.filter((f) => !f.pausada)
  const objetivo = cajon ? filas.find((f) => f.tenant_id === cajon.tenantId) ?? null : null
  const pausar = objetivo ? !objetivo.pausada : true
  const abrir = (tenantId = '') => {
    setCajon({ tenantId })
    setMotivo('')
    setFallo(null)
  }
  const cerrar = () => setCajon(null)

  async function confirmar() {
    if (!objetivo || motivo.trim().length < 5) return
    setGuardando(true)
    setFallo(null)
    try {
      await adminApi(`/banderas/${objetivo.tenant_id}/pausa`, { method: 'PUT', body: { pausada: pausar, motivo: motivo.trim() } })
      // Ronda 26 (T10): aviso al terminar.
      toast.success(pausar ? `Listo: los agentes de ${objetivo.nombre} quedaron en pausa` : `Listo: los agentes de ${objetivo.nombre} volvieron a funcionar`)
      cerrar()
      refetch()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: pausar ? 'pausar los agentes' : 'reanudar los agentes', porDefecto: 'No se pudo guardar.' }))
    } finally {
      setGuardando(false)
    }
  }

  const columnas: Column<BanderasDeLaInmobiliaria>[] = [
    { header: 'Inmobiliaria', orden: (f) => f.nombre, texto: (f) => f.nombre, cell: (f) => <span className="font-medium text-fg">{f.nombre}</span> },
    {
      header: 'Sus agentes',
      orden: (f) => (f.pausada ? 0 : 1),
      texto: (f) =>
        f.pausada
          ? ['En pausa', f.pausa ? `desde ${fmtDateTime(f.pausa.cuando)}` : '', f.pausa?.quien ?? '', f.pausa?.motivo ?? ''].filter(Boolean).join(' · ')
          : 'Funcionando',
      cell: (f) =>
        f.pausada ? (
          <div className="space-y-1">
            <Pill tone="bad" dot>En pausa</Pill>
            {f.pausa ? (
              <p className="text-caption text-fg-muted">
                Desde <span className="font-mono tabular-nums">{fmtDateTime(f.pausa.cuando)}</span>
                {f.pausa.quien ? ` · ${f.pausa.quien}` : ''}
                {f.pausa.motivo ? ` · «${f.pausa.motivo}»` : ''}
              </p>
            ) : null}
          </div>
        ) : (
          // Lo normal, callado: el rojo de la pausa es lo que se tiene que ver.
          <span className="text-body-sm text-fg-muted">Funcionando</span>
        ),
    },
    {
      header: '',
      align: 'right',
      cell: (f) =>
        f.pausada ? (
          <Button
            size="sm"
            variant="outline"
            hideArrow
            onClick={(e) => {
              e.stopPropagation()
              abrir(f.tenant_id)
            }}
          >
            Reanudar
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Pausa de emergencia"
        description="Detiene de inmediato todos los agentes de una inmobiliaria."
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="La pausa de emergencia" variante="secundario">
            <p className="text-body-sm text-fg-muted">Para las llamadas, los mensajes y el piloto automático. Pide un motivo, queda registrado y sólo Leasefy la quita.</p>
          </ParaEntenderMas>
        }
        acciones={
          funcionando.length > 0 ? (
            <Button size="sm" variant="outline" hideArrow onClick={() => abrir()} data-testid="pausa-pausar-todo">
              Pausar todo
            </Button>
          ) : undefined
        }
      />
      {/* Glow up 22-10: LA RESPUESTA (cuántas están en pausa) en una cifra con su barra; antes, 2 cajas. Ronda 26
          (T6): casi siempre es 0, y entonces es UNA línea (antes un «0» de 40 px con su barra en cero). */}
      {data && filas.length > 0 && enPausa === 0 ? (
        <p
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-4 text-body-sm text-fg"
          data-testid="pausa-en-pausa"
        >
          <CheckCircle className="h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
          <span>
            Todo corre normal: los agentes de{' '}
            {filas.length === 1 ? 'la inmobiliaria' : `las ${filas.length.toLocaleString('es-CO')} inmobiliarias`} funcionan.
          </span>
        </p>
      ) : null}
      {data && filas.length > 0 && enPausa > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="En pausa de emergencia"
            cifra={enPausa.toLocaleString('es-CO')}
            contexto={`de ${filas.length.toLocaleString('es-CO')} ${filas.length === 1 ? 'inmobiliaria' : 'inmobiliarias'} con agentes`}
            tramos={[
              { clave: 'funcionando', etiqueta: 'Funcionando', monto: filas.length - enPausa, tono: 'exito', cifra: (filas.length - enPausa).toLocaleString('es-CO'), siempre: true },
              { clave: 'pausa', etiqueta: 'En pausa', monto: enPausa, tono: 'critico', cifra: enPausa.toLocaleString('es-CO') },
            ]}
            total={filas.length}
            data-testid="pausa-en-pausa"
          />
        </div>
      ) : null}
      <DataTable
        columns={columnas}
        rows={data ? filas : undefined}
        getKey={(f) => f.tenant_id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        rowClassName={(f) => (f.pausada ? 'bg-danger/5' : undefined)}
        onRowClick={(f) => abrir(f.tenant_id)}
        emptyTitle="Ninguna inmobiliaria está conectada al asistente de agentes"
        emptyIcon={<Power weight="duotone" />}
        aria-label="Pausa de emergencia por inmobiliaria"
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar inmobiliaria"
        segmentos={enPausa > 0 ? SEGMENTOS : undefined}
        ordenInicial={{ columna: 1, sentido: 'asc' }}
        exportar="pausa-de-emergencia"
      />

      <Cajon abierto={cajon !== null} onOpenChange={(a) => (a ? null : cerrar())}>
        <CajonCabecera
          titulo={
            objetivo
              ? `${pausar ? 'Pausar todos los agentes de' : 'Reanudar los agentes de'} ${objetivo.nombre}`
              : 'Pausar todos los agentes de una inmobiliaria'
          }
          descripcion={
            pausar
              ? 'Ningún agente vuelve a llamar, escribir ni actuar por esta inmobiliaria hasta que la reanudes. Lo que está en curso termina.'
              : 'Sus agentes vuelven a funcionar como los tenía antes de la pausa.'
          }
        />
        <CajonCuerpo>
          <div className="space-y-4">
            {pausar ? (
              <div className="space-y-1.5">
                <label htmlFor="inmobiliaria-pausa" className="text-body-sm font-medium text-fg">
                  Inmobiliaria <span className="text-danger">*</span>
                </label>
                <Select value={objetivo && !objetivo.pausada ? objetivo.tenant_id : ''} onValueChange={(v) => setCajon({ tenantId: v })}>
                  <SelectTrigger id="inmobiliaria-pausa" aria-required="true">
                    <SelectValue placeholder="Elige la inmobiliaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...funcionando]
                      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                      .map((f) => (
                        <SelectItem key={f.tenant_id} value={f.tenant_id}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {pausar ? <Alert variant="warning">La inmobiliaria no puede quitarse la pausa desde su panel.</Alert> : null}
            <div className="space-y-1.5">
              <label htmlFor="motivo-pausa" className="text-body-sm font-medium text-fg">
                ¿Por qué? <span className="text-danger">*</span>
              </label>
              <Textarea
                id="motivo-pausa"
                aria-required="true"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={pausar ? 'Ej.: quejas de inquilinos por llamadas' : 'Ej.: revisado con la inmobiliaria'}
              />
              <p className="text-caption text-fg-subtle">Queda guardado con tu correo y la fecha.</p>
            </div>
            {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
          </div>
        </CajonCuerpo>
        <CajonPie
          ayuda={
            !objetivo ? 'Elige la inmobiliaria.' : motivo.trim().length < 5 ? 'Escribe el motivo (al menos 5 letras).' : undefined
          }
        >
          <Button variant="outline" hideArrow onClick={cerrar}>
            Cancelar
          </Button>
          <Button hideArrow variant={pausar ? 'destructive' : 'default'} disabled={!objetivo || motivo.trim().length < 5 || guardando} isLoading={guardando} onClick={() => void confirmar()}>
            {guardando ? 'Guardando…' : pausar ? 'Pausar todo' : 'Reanudar'}
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
