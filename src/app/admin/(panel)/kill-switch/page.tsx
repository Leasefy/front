'use client'

import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { toast } from 'sonner'
import { useState } from 'react'
import { Power } from '@phosphor-icons/react'
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
  const [objetivo, setObjetivo] = useState<BanderasDeLaInmobiliaria | null>(null)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const filas = (data?.inmobiliarias ?? []).filter((f) => f.lista !== null)
  const enPausa = filas.filter((f) => f.pausada).length
  const pausar = objetivo ? !objetivo.pausada : true

  async function confirmar() {
    if (!objetivo || motivo.trim().length < 5) return
    setGuardando(true)
    setFallo(null)
    try {
      await adminApi(`/banderas/${objetivo.tenant_id}/pausa`, { method: 'PUT', body: { pausada: pausar, motivo: motivo.trim() } })
      // Ronda 26 (T10): aviso al terminar.
      toast.success(pausar ? `Listo: los agentes de ${objetivo.nombre} quedaron en pausa` : `Listo: los agentes de ${objetivo.nombre} volvieron a funcionar`)
      setObjetivo(null)
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
          <Pill tone="ok" dot>Funcionando</Pill>
        ),
    },
    {
      header: '',
      align: 'right',
      cell: (f) => (
        // Glow up 22-10: en la fila, botones callados; el rojo va en la confirmación del cajón.
        <Button
          size="sm"
          variant="outline"
          hideArrow
          onClick={() => { setObjetivo(f); setMotivo(''); setFallo(null) }}
        >
          {f.pausada ? 'Reanudar' : 'Pausar todo'}
        </Button>
      ),
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
      />
      {/* Glow up 22-10: LA RESPUESTA (cuántas están en pausa) en una cifra con su barra; antes, 2 cajas. */}
      {data && filas.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="En pausa de emergencia"
            cifra={enPausa.toLocaleString('es-CO')}
            contexto={
              enPausa > 0
                ? `de ${filas.length.toLocaleString('es-CO')} ${filas.length === 1 ? 'inmobiliaria' : 'inmobiliarias'} con agentes`
                : `ninguna: los agentes de las ${filas.length.toLocaleString('es-CO')} funcionan`
            }
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
        emptyTitle="Ninguna inmobiliaria está conectada al asistente de agentes"
        emptyIcon={<Power weight="duotone" />}
        aria-label="Pausa de emergencia por inmobiliaria"
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar inmobiliaria"
        segmentos={SEGMENTOS}
        ordenInicial={{ columna: 1, sentido: 'asc' }}
        exportar="pausa-de-emergencia"
      />

      <Cajon abierto={objetivo !== null} onOpenChange={(a) => (a ? null : setObjetivo(null))}>
        <CajonCabecera
          titulo={objetivo ? `${pausar ? 'Pausar todos los agentes de' : 'Reanudar los agentes de'} ${objetivo.nombre}` : 'Pausa de emergencia'}
          descripcion={
            pausar
              ? 'Ningún agente vuelve a llamar, escribir ni actuar por esta inmobiliaria hasta que la reanudes. Lo que está en curso termina.'
              : 'Sus agentes vuelven a funcionar como los tenía antes de la pausa.'
          }
        />
        <CajonCuerpo>
          <div className="space-y-4">
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
        <CajonPie ayuda={motivo.trim().length < 5 ? 'Escribe el motivo (al menos 5 letras).' : undefined}>
          <Button variant="outline" hideArrow onClick={() => setObjetivo(null)}>
            Cancelar
          </Button>
          <Button hideArrow variant={pausar ? 'destructive' : 'default'} disabled={motivo.trim().length < 5 || guardando} isLoading={guardando} onClick={() => void confirmar()}>
            {guardando ? 'Guardando…' : pausar ? 'Pausar todo' : 'Reanudar'}
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
