'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { ChatText } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { fmtFecha } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'

/** `GET /api/v1/admin/plantillas` (19-10-2026). */
interface PlantillaDelAviso {
  code: string
  nombre: string
  descripcion: string | null
  pushTitulo: string | null
  pushTexto: string | null
  activa: boolean
  actualizada: string
  correo: { asunto: string } | null
}

const SEGMENTOS: Segmento<PlantillaDelAviso>[] = [
  { valor: 'todos', nombre: 'Todos', cumple: () => true },
  { valor: 'activos', nombre: 'Activos', cumple: (t) => t.activa },
  { valor: 'apagados', nombre: 'Apagados', cumple: (t) => !t.activa },
  { valor: 'con-correo', nombre: 'Con correo', cumple: (t) => t.correo !== null },
]

/**
 * /admin/templates — los avisos de Leasefy (19-10-2026, Nico: «construirlas de
 * verdad»). Era una maqueta. Cada aviso tiene su correo (vive en el código: se
 * ve el asunto) y su push (lo que muestra la campana: se edita acá). Apagar un
 * aviso detiene su push.
 */
export default function PlantillasPage() {
  const { data, isLoading, error, refetch } = useApiQuery<PlantillaDelAviso[]>((s) => adminApi('/plantillas', { signal: s }), [])
  const [abierta, setAbierta] = useState<PlantillaDelAviso | null>(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [activa, setActiva] = useState(true)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)


  const abrir = (t: PlantillaDelAviso) => {
    setAbierta(t)
    setTitulo(t.pushTitulo ?? '')
    setTexto(t.pushTexto ?? '')
    setActiva(t.activa)
    setMotivo('')
    setFallo(null)
  }
  const hayCambio =
    abierta !== null && (titulo.trim() !== (abierta.pushTitulo ?? '') || texto.trim() !== (abierta.pushTexto ?? '') || activa !== abierta.activa)

  async function guardar() {
    if (!abierta || !hayCambio || motivo.trim().length < 5) return
    setGuardando(true)
    setFallo(null)
    try {
      await adminApi(`/plantillas/${encodeURIComponent(abierta.code)}`, {
        method: 'PATCH',
        body: { pushTitulo: titulo.trim(), pushTexto: texto.trim(), activa, motivo: motivo.trim() },
      })
      // Ronda 26 (T10): aviso al terminar.
      toast.success('Listo: el aviso quedó guardado')
      setAbierta(null)
      refetch()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: 'guardar el aviso', porDefecto: 'No se pudo guardar el aviso.' }))
    } finally {
      setGuardando(false)
    }
  }

  // Las variables que el aviso abierto usa hoy (en su texto original): ésas son las que el envío llena.
  const variables = abierta
    ? Array.from(
        new Set(
          [abierta.pushTitulo ?? '', abierta.pushTexto ?? '']
            .join(' ')
            .match(/\{\{\s*([\w.]+)\s*\}\}/g)
            ?.map((m) => m.replace(/[{}\s]/g, '')) ?? [],
        ),
      )
    : []

  const columnas: Column<PlantillaDelAviso>[] = [
    {
      header: 'Aviso',
      className: 'min-w-[220px]',
      orden: (t) => t.nombre,
      texto: (t) => t.nombre,
      cell: (t) => (
        <div className="min-w-0 max-w-xs">
          <div className="font-medium text-fg">{t.nombre}</div>
        </div>
      ),
    },
    {
      header: 'Notificación (la campana)',
      texto: (t) => [t.pushTitulo, t.pushTexto].filter(Boolean).join(' — '),
      cell: (t) => (
        <div className="max-w-sm text-caption">
          <div className="text-fg">{t.pushTitulo || '—'}</div>
          <div className="line-clamp-2 text-fg-muted">{t.pushTexto || ''}</div>
        </div>
      ),
    },
    {
      header: 'Correo',
      texto: (t) => t.correo?.asunto ?? 'Sin correo',
      cell: (t) =>
        t.correo ? (
          <span className="line-clamp-2 max-w-xs text-caption text-fg-muted">{t.correo.asunto}</span>
        ) : (
          <span className="text-caption text-fg-subtle">Sin correo</span>
        ),
    },
    { header: 'Estado', orden: (t) => (t.activa ? 0 : 1), texto: (t) => (t.activa ? 'Activo' : 'Apagado'), cell: (t) => <Pill tone={t.activa ? 'ok' : 'muted'}>{t.activa ? 'Activo' : 'Apagado'}</Pill> },
    { header: 'Último cambio', orden: (t) => t.actualizada, ordenPrimero: 'desc', texto: (t) => fmtFecha(t.actualizada), cell: (t) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtFecha(t.actualizada)}</span> },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Avisos"
        description="Los avisos que manda Leasefy. Toca uno para editar lo que dice la campana."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo funciona" titulo="Los avisos de Leasefy" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>La notificación (lo que muestra la campana) se edita aquí. El correo vive en el código: aquí se ve su asunto.</p>
              <p>Apagar un aviso detiene su notificación. Cada cambio pide un motivo y queda registrado con tu correo.</p>
            </div>
          </ParaEntenderMas>
        }
        junto={
          data && data.some((t) => !t.activa) ? (
            <Pill tone="warn" dot>
              {data.filter((t) => !t.activa).length === 1 ? '1 apagado' : `${data.filter((t) => !t.activa).length} apagados`}
            </Pill>
          ) : null
        }
      />
      <DataTable
        errorTitulo="No pudimos cargar los avisos"
        columns={columnas}
        rows={data}
        getKey={(t) => t.code}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="No hay avisos"
        emptyIcon={<ChatText weight="duotone" />}
        aria-label="Avisos de Leasefy"
        onRowClick={abrir}
        filaMarcada={(t) => t.code === abierta?.code}
        queSon={['aviso', 'avisos']}
        buscar="Nombre o texto"
        textoExtra={(t) => `${t.code} ${t.descripcion ?? ''}`}
        segmentos={SEGMENTOS}
        exportar="avisos-de-leasefy"
        masEnElExcel={[{ header: 'Código', texto: (t) => t.code }]}
      />

      <Cajon abierto={abierta !== null} onOpenChange={(a) => (a ? null : setAbierta(null))}>
        <CajonCabecera titulo={abierta?.nombre ?? 'Aviso'} descripcion={abierta?.descripcion ?? undefined} />
        <CajonCuerpo>
          <div className="space-y-4">
            {abierta?.correo ? (
              <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-caption text-fg-muted">
                <div className="font-medium text-fg">Asunto del correo</div>
                {abierta.correo.asunto}
                <div className="mt-1 text-fg-subtle">El correo no se edita aquí: lo cambia el equipo técnico.</div>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <label htmlFor="push-titulo" className="text-body-sm font-medium text-fg">Título de la notificación</label>
              <Input id="push-titulo" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="push-texto" className="text-body-sm font-medium text-fg">Texto de la notificación</label>
              <Textarea id="push-texto" rows={3} value={texto} maxLength={500} onChange={(e) => setTexto(e.target.value)} />
              {/* Ronda 26 (revisora r25): cuáles hay, no «las {{variables}}» a secas. */}
              {variables.length > 0 ? (
                <p className="text-caption text-fg-subtle">
                  Se llenan solas al mandarlo:{' '}
                  {variables.map((v, i) => (
                    <span key={v}>
                      {i > 0 ? ', ' : ''}
                      <span className="font-mono">{`{{${v}}}`}</span>
                    </span>
                  ))}
                  .
                </p>
              ) : (
                <p className="text-caption text-fg-subtle">Este aviso no usa datos que se llenen solos.</p>
              )}
            </div>
            <label className="flex items-center gap-2.5 text-body-sm text-fg">
              <Switch checked={activa} onCheckedChange={setActiva} aria-label="Aviso activo" />
              Aviso activo
            </label>
            {hayCambio ? (
              <div className="space-y-1.5">
                <label htmlFor="motivo-aviso" className="text-body-sm font-medium text-fg">
                  ¿Por qué lo cambias? <span className="text-danger">*</span>
                </label>
                <Textarea id="motivo-aviso" aria-required="true" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </div>
            ) : null}
            {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
          </div>
        </CajonCuerpo>
        <CajonPie ayuda={hayCambio && motivo.trim().length < 5 ? 'Escribe el motivo (al menos 5 letras).' : undefined}>
          <Button variant="outline" hideArrow onClick={() => setAbierta(null)}>
            Cerrar
          </Button>
          <Button hideArrow disabled={!hayCambio || motivo.trim().length < 5 || guardando} onClick={() => void guardar()}>
            {guardando ? 'Guardando…' : 'Guardar el aviso'}
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
