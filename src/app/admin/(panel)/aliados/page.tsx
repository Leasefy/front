'use client'

/**
 * `/admin/aliados` — los enlaces de invitado de los aliados (Nico, 27-10-2026: Fianly, La Lonja, Fenalco regalan un
 * mes de Leasefy completo). Back `GET/PUT /api/v1/admin/alianzas`.
 *
 * Lo que se quiere saber de un vistazo: cuántos entraron por cada aliado, cuántos siguen en su mes gratis y cuántos ya
 * pagan (la conversión). Cada fila abre su cajón para editar; «Nuevo aliado» crea el enlace. Sin la migración del back
 * lo dice y no deja escribir.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Handshake } from '@phosphor-icons/react'
import { Alert, CopyButton } from '@leasefy/cadence'

import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { adminApi } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { fmtFecha, fmtNumero, fmtPorcentaje } from '@/lib/admin/format'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { claveDelAliado, logoDelAliado } from '@/lib/conversion/logo-del-aliado'
import { conversionDelAliado, estadoDelEnlace, type AlianzaDelAdmin, type RespuestaDeAlianzas } from '@/lib/admin/aliados'

interface Borrador {
  codigo: string
  nombre: string
  diasGratis: string
  activa: boolean
  validaHasta: string
  maxUsos: string
}

const NUEVO: Borrador = { codigo: '', nombre: '', diasGratis: '30', activa: true, validaHasta: '', maxUsos: '' }

function LogoONombre({ nombre }: { nombre: string }) {
  const logo = logoDelAliado(nombre)
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-white p-1">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo estático de public/aliados
          <img src={logo.src} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="font-mono text-[11px] uppercase text-fg-subtle">{nombre.slice(0, 2)}</span>
        )}
      </span>
      <span className="font-medium text-fg">{nombre}</span>
    </span>
  )
}

export default function AliadosDelAdmin() {
  const { data, isLoading, error, refetch } = useApiQuery<RespuestaDeAlianzas>((signal) => adminApi('/alianzas', { signal }), [])
  const [editando, setEditando] = useState<{ nuevo: boolean; b: Borrador } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const alianzas = data?.alianzas ?? []
  const usos = alianzas.reduce((t, a) => t + a.usos, 0)
  const vigentes = alianzas.reduce((t, a) => t + a.vigentes, 0)
  const pagan = alianzas.reduce((t, a) => t + a.pagan, 0)

  const abrir = (a: AlianzaDelAdmin | null) => {
    setFallo(null)
    setEditando(
      a
        ? {
            nuevo: false,
            b: {
              codigo: a.codigo,
              nombre: a.nombre,
              diasGratis: String(a.diasGratis),
              activa: a.activa,
              validaHasta: a.validaHasta ? a.validaHasta.slice(0, 10) : '',
              maxUsos: a.maxUsos === null ? '' : String(a.maxUsos),
            },
          }
        : { nuevo: true, b: NUEVO },
    )
  }
  const cambiar = (c: Partial<Borrador>) => setEditando((e) => (e ? { ...e, b: { ...e.b, ...c } } : e))

  async function guardar() {
    if (!editando) return
    const { b } = editando
    const codigo = claveDelAliado(b.codigo || b.nombre)
    if (b.nombre.trim().length < 2) return setFallo('Escribe el nombre del aliado.')
    if (!codigo) return setFallo('El código del enlace no puede quedar vacío.')
    const dias = Number(b.diasGratis)
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) return setFallo('Los días gratis van de 1 a 365.')
    setGuardando(true)
    setFallo(null)
    try {
      await adminApi(`/alianzas/${encodeURIComponent(codigo)}`, {
        method: 'PUT',
        body: {
          nombre: b.nombre.trim(),
          diasGratis: dias,
          activa: b.activa,
          validaHasta: b.validaHasta || null,
          maxUsos: b.maxUsos ? Number(b.maxUsos) : null,
        },
      })
      toast.success(editando.nuevo ? `Listo: el enlace de ${b.nombre.trim()} es leasefy.co/aliados/${codigo}` : `Listo: guardamos ${b.nombre.trim()}`)
      setEditando(null)
      refetch()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: 'guardar el aliado', porDefecto: 'No se pudo guardar el aliado.' }))
    } finally {
      setGuardando(false)
    }
  }

  const columnas: Column<AlianzaDelAdmin>[] = [
    { header: 'Aliado', orden: (a) => a.nombre, texto: (a) => a.nombre, cell: (a) => <LogoONombre nombre={a.nombre} /> },
    {
      header: 'Enlace',
      texto: (a) => a.enlace,
      cell: (a) => (
        <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="font-mono text-caption text-fg-muted">/aliados/{a.codigo}</span>
          <CopyButton text={a.enlace} label="Copiar" copiedLabel="Copiado" size="sm" variant="ghost" />
        </span>
      ),
    },
    { header: 'Regala', align: 'right', orden: (a) => a.diasGratis, texto: (a) => `${a.diasGratis} días`, cell: (a) => <span className="tabular-nums">{a.diasGratis} días</span> },
    {
      header: 'Entraron',
      align: 'right',
      orden: (a) => a.usos,
      ordenPrimero: 'desc',
      texto: (a) => (a.maxUsos === null ? fmtNumero(a.usos) : `${fmtNumero(a.usos)} de ${fmtNumero(a.maxUsos)}`),
      cell: (a) => (
        <span className="font-mono tabular-nums">
          {fmtNumero(a.usos)}
          {a.maxUsos !== null ? <span className="text-fg-subtle"> / {fmtNumero(a.maxUsos)}</span> : null}
        </span>
      ),
    },
    { header: 'En su mes', align: 'right', orden: (a) => a.vigentes, texto: (a) => fmtNumero(a.vigentes), cell: (a) => <span className="font-mono tabular-nums">{fmtNumero(a.vigentes)}</span> },
    {
      header: 'Ya pagan',
      align: 'right',
      orden: (a) => a.pagan,
      ordenPrimero: 'desc',
      texto: (a) => fmtNumero(a.pagan),
      cell: (a) => {
        const c = conversionDelAliado(a)
        return (
          <span className="font-mono tabular-nums">
            {fmtNumero(a.pagan)}
            {c !== null ? <span className="ml-1.5 text-caption text-success-ink">{fmtPorcentaje(c, 0)}</span> : null}
          </span>
        )
      },
    },
    { header: 'Vale hasta', texto: (a) => (a.validaHasta ? fmtFecha(a.validaHasta) : 'Sin fecha'), cell: (a) => <span className="text-fg-muted">{a.validaHasta ? fmtFecha(a.validaHasta) : 'Sin fecha'}</span> },
    {
      header: 'Estado',
      texto: (a) => estadoDelEnlace(a).texto,
      cell: (a) => {
        const e = estadoDelEnlace(a)
        return <Pill tone={e.tono}>{e.texto}</Pill>
      },
    },
  ]

  const b = editando?.b
  const codigoQueQueda = b ? claveDelAliado(b.codigo || b.nombre) : ''

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Aliados"
        description="Los enlaces con los que un aliado regala un mes de Leasefy completo, y cuántos ya pagan."
        principal={
          data?.disponible ? (
            <Button size="sm" hideArrow onClick={() => abrir(null)} data-testid="nuevo-aliado">
              Nuevo aliado
            </Button>
          ) : undefined
        }
      />

      {data && !data.disponible ? (
        <Alert variant="warning" data-testid="aliados-sin-migracion">
          Los enlaces de aliados todavía no están activos en esta base: falta la migración {data.migracion}.
        </Alert>
      ) : null}

      {data?.disponible && usos > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Entraron por un aliado"
            cifra={fmtNumero(usos)}
            contexto={pagan > 0 ? `${fmtPorcentaje((pagan / usos) * 100, 0)} ya paga` : 'todavía nadie paga'}
            tramos={[
              { clave: 'vigentes', etiqueta: 'En su mes gratis', monto: vigentes, tono: 'neutro', cifra: fmtNumero(vigentes), siempre: true },
              { clave: 'pagan', etiqueta: 'Ya pagan', monto: pagan, tono: 'exito', cifra: fmtNumero(pagan), siempre: true },
            ]}
            data-testid="aliados-resumen"
          />
        </div>
      ) : null}

      <DataTable
        columns={columnas}
        rows={data?.alianzas}
        getKey={(a) => a.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        onRowClick={data?.disponible ? (a) => abrir(a) : undefined}
        emptyTitle="Todavía no hay aliados"
        emptyIcon={<Handshake weight="duotone" />}
        aria-label="Aliados"
        queSon={['aliado', 'aliados']}
        exportar="aliados"
      />

      <Cajon abierto={editando !== null} onOpenChange={(a) => (a ? null : setEditando(null))}>
        <CajonCabecera
          titulo={editando?.nuevo ? 'Nuevo aliado' : b ? b.nombre : 'Aliado'}
          descripcion="El enlace queda en leasefy.co/aliados/<código>. Queda registrado con tu correo."
        />
        <CajonCuerpo>
          {b ? (
            <div className="space-y-4" data-testid="cajon-del-aliado">
              <div className="space-y-1.5">
                <label htmlFor="aliado-nombre" className="text-body-sm font-medium text-fg">
                  Nombre del aliado
                </label>
                <Input id="aliado-nombre" value={b.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} placeholder="La Lonja" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="aliado-codigo" className="text-body-sm font-medium text-fg">
                  Código del enlace
                </label>
                <Input
                  id="aliado-codigo"
                  value={b.codigo}
                  disabled={!editando?.nuevo}
                  onChange={(e) => cambiar({ codigo: e.target.value })}
                  placeholder={claveDelAliado(b.nombre) || 'la-lonja'}
                  className="font-mono"
                />
                <p className="text-caption text-fg-subtle">
                  {editando?.nuevo ? 'Queda así: ' : 'El código no se cambia: '}
                  <span className="font-mono text-fg-muted">leasefy.co/aliados/{codigoQueQueda || '…'}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="aliado-dias" className="text-body-sm font-medium text-fg">
                    Días gratis
                  </label>
                  <Input id="aliado-dias" inputMode="numeric" className="font-mono" value={b.diasGratis} onChange={(e) => cambiar({ diasGratis: e.target.value.replace(/[^\d]/g, '') })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="aliado-cupos" className="text-body-sm font-medium text-fg">
                    Cupos (vacío = sin tope)
                  </label>
                  <Input id="aliado-cupos" inputMode="numeric" className="font-mono" value={b.maxUsos} onChange={(e) => cambiar({ maxUsos: e.target.value.replace(/[^\d]/g, '') })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="aliado-hasta" className="text-body-sm font-medium text-fg">
                  El enlace vale hasta (vacío = sin fecha)
                </label>
                <Input id="aliado-hasta" type="date" value={b.validaHasta} onChange={(e) => cambiar({ validaHasta: e.target.value })} />
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span>
                  <span className="block text-body-sm font-medium text-fg">Enlace activo</span>
                  <span className="block text-caption text-fg-subtle">Apagado, quien lo abra ve que ya no está disponible.</span>
                </span>
                <Switch checked={b.activa} onCheckedChange={(v) => cambiar({ activa: v })} aria-label="Enlace activo" />
              </label>
              {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
            </div>
          ) : null}
        </CajonCuerpo>
        <CajonPie>
          <Button variant="outline" hideArrow onClick={() => setEditando(null)}>
            Cancelar
          </Button>
          <Button hideArrow disabled={guardando} isLoading={guardando} onClick={() => void guardar()} data-testid="guardar-aliado">
            {editando?.nuevo ? 'Crear el enlace' : 'Guardar'}
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
