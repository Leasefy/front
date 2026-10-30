'use client'

/**
 * `/admin/gestiones` — los inmuebles de propietarios sin inmobiliaria que gestiona Leasefy (MODELO-DE-NEGOCIO.md
 * §3.11; Nico, 27-10-2026: el 5 % de lo recaudado, «construirlo apagado»). Back `/api/v1/admin/gestiones-de-leasefy`.
 *
 * El mes con lo cobrado, el porcentaje de Leasefy y lo que se le gira al propietario; «Nueva gestión» marca un
 * inmueble y cada fila se puede terminar desde una fecha. Con la llave COBRO_PROPIETARIO_DIRECTO apagada lo dice y no
 * deja escribir (el back responde 409).
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { CaretLeft, CaretRight, HouseLine } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'

import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { adminApi } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { fmtCOP, fmtFecha } from '@/lib/admin/format'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import {
  esIdDeInmueble,
  mesDeHoyEnColombia,
  moverElMes,
  nombreDelMesDeLaGestion,
  porcentajeDeLaGestion,
  type GestionDeLeasefy,
  type RespuestaDeGestiones,
} from '@/lib/admin/gestiones-de-leasefy'

const hoy = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10)

export default function GestionesDeLeasefy() {
  const { get, setFilters } = useUrlFilters()
  const mes = get('mes') || mesDeHoyEnColombia()
  const { data, isLoading, error, refetch } = useApiQuery<RespuestaDeGestiones>(
    (signal) => adminApi('/gestiones-de-leasefy', { query: { mes }, signal }),
    [mes],
  )
  const [nueva, setNueva] = useState<{ propertyId: string; desde: string; porcentaje: string; notas: string } | null>(null)
  const [terminando, setTerminando] = useState<{ g: GestionDeLeasefy; hasta: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const sePuedeEscribir = Boolean(data?.prendido && data.disponible)
  const totales = data?.totales

  async function crear() {
    if (!nueva) return
    if (!esIdDeInmueble(nueva.propertyId)) return setFallo('Pega el id del inmueble (lo ves en Admin → Inmuebles).')
    if (!nueva.desde) return setFallo('Elige desde cuándo la gestiona Leasefy.')
    const porcentaje = nueva.porcentaje ? Number(nueva.porcentaje.replace(',', '.')) : null
    if (porcentaje !== null && (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 20)) {
      return setFallo('El porcentaje va de 0 a 20.')
    }
    setGuardando(true)
    setFallo(null)
    try {
      await adminApi('/gestiones-de-leasefy', {
        method: 'POST',
        body: {
          propertyId: nueva.propertyId.trim(),
          desde: nueva.desde,
          ...(porcentaje !== null ? { porcentajeBps: Math.round(porcentaje * 100) } : {}),
          ...(nueva.notas.trim() ? { notas: nueva.notas.trim() } : {}),
        },
      })
      toast.success('Listo: Leasefy gestiona ese inmueble')
      setNueva(null)
      refetch()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: 'crear la gestión', porDefecto: 'No se pudo crear la gestión.' }))
    } finally {
      setGuardando(false)
    }
  }

  async function terminar() {
    if (!terminando) return
    setGuardando(true)
    setFallo(null)
    try {
      await adminApi(`/gestiones-de-leasefy/${terminando.g.id}/terminar`, { method: 'POST', body: { hasta: terminando.hasta } })
      toast.success(`Listo: Leasefy deja de gestionar ${terminando.g.inmueble ?? 'el inmueble'} el ${fmtFecha(terminando.hasta)}`)
      setTerminando(null)
      refetch()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: 'terminar la gestión', porDefecto: 'No se pudo terminar la gestión.' }))
    } finally {
      setGuardando(false)
    }
  }

  const columnas: Column<GestionDeLeasefy>[] = [
    { header: 'Inmueble', orden: (g) => g.inmueble ?? '', texto: (g) => g.inmueble, cell: (g) => <span className="block max-w-[240px] truncate font-medium text-fg">{g.inmueble ?? 'Sin dirección'}</span> },
    { header: 'Propietario', texto: (g) => g.propietario, cell: (g) => <span className="text-fg-muted">{g.propietario ?? '—'}</span> },
    {
      header: 'Desde',
      orden: (g) => g.desde,
      texto: (g) => fmtFecha(g.desde),
      cell: (g) => (
        <span className="flex items-center gap-2 whitespace-nowrap text-fg-muted">
          {fmtFecha(g.desde)}
          {g.hasta ? <Pill tone="neutral">Hasta {fmtFecha(g.hasta)}</Pill> : null}
        </span>
      ),
    },
    { header: 'Leasefy', align: 'right', texto: (g) => porcentajeDeLaGestion(g.porcentajeBps), cell: (g) => <span className="tabular-nums">{porcentajeDeLaGestion(g.porcentajeBps)}</span> },
    { header: 'Cobrado', align: 'right', orden: (g) => g.cobradoCop, ordenPrimero: 'desc', texto: (g) => fmtCOP(g.cobradoCop), cell: (g) => <span className="font-mono tabular-nums">{fmtCOP(g.cobradoCop)}</span> },
    { header: 'Para Leasefy', align: 'right', orden: (g) => g.comisionCop, texto: (g) => fmtCOP(g.comisionCop), cell: (g) => <span className="font-mono tabular-nums text-primary">{fmtCOP(g.comisionCop)}</span> },
    { header: 'Al propietario', align: 'right', orden: (g) => g.netoCop, texto: (g) => fmtCOP(g.netoCop), cell: (g) => <span className="font-mono tabular-nums">{fmtCOP(g.netoCop)}</span> },
    {
      header: '',
      texto: () => '',
      cell: (g) =>
        sePuedeEscribir && !g.hasta ? (
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            onClick={(e) => {
              e.stopPropagation()
              setFallo(null)
              setTerminando({ g, hasta: hoy() })
            }}
          >
            Terminar
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Gestiones de Leasefy"
        description="Inmuebles de propietarios sin inmobiliaria que gestiona Leasefy: lo cobrado, lo de Leasefy y lo que se le gira al propietario."
        principal={
          sePuedeEscribir ? (
            <Button
              size="sm"
              hideArrow
              onClick={() => {
                setFallo(null)
                setNueva({ propertyId: '', desde: hoy(), porcentaje: '', notas: '' })
              }}
              data-testid="nueva-gestion"
            >
              Nueva gestión
            </Button>
          ) : undefined
        }
      />

      {/* El mes que se mira: con flechas, como el resto de los meses del admin. */}
      <div className="flex items-center gap-2" data-testid="mes-de-las-gestiones">
        <Button size="sm" variant="outline" hideArrow aria-label="Mes anterior" onClick={() => setFilters({ mes: moverElMes(mes, -1) })}>
          <CaretLeft size={14} aria-hidden="true" />
        </Button>
        <span className="min-w-[10rem] text-center text-body-sm font-medium text-fg">
          {nombreDelMesDeLaGestion(mes).charAt(0).toUpperCase() + nombreDelMesDeLaGestion(mes).slice(1)}
        </span>
        <Button size="sm" variant="outline" hideArrow aria-label="Mes siguiente" disabled={mes >= mesDeHoyEnColombia()} onClick={() => setFilters({ mes: moverElMes(mes, 1) })}>
          <CaretRight size={14} aria-hidden="true" />
        </Button>
      </div>

      {data && !data.prendido ? (
        <Alert variant="info" data-testid="gestiones-apagadas">
          La gestión de Leasefy para propietarios sin inmobiliaria está apagada (llave COBRO_PROPIETARIO_DIRECTO). Se ve vacía y
          no se puede marcar ningún inmueble hasta que Leasefy la prenda.
        </Alert>
      ) : null}
      {data && data.prendido && !data.disponible ? (
        <Alert variant="warning" data-testid="gestiones-sin-migracion">
          Falta la migración {data.migracion ?? 'de las gestiones'} en esta base.
        </Alert>
      ) : null}

      {totales && totales.cobradoCop > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo={`Cobrado en ${nombreDelMesDeLaGestion(mes)}`}
            cifra={fmtCOP(totales.cobradoCop)}
            contexto={`Leasefy se queda con el ${porcentajeDeLaGestion(data?.porcentajeBps ?? 500)}`}
            tramos={[
              { clave: 'leasefy', etiqueta: 'Para Leasefy', monto: totales.comisionCop, tono: 'neutro', cifra: fmtCOP(totales.comisionCop), siempre: true },
              { clave: 'propietarios', etiqueta: 'A los propietarios', monto: totales.netoCop, tono: 'exito', cifra: fmtCOP(totales.netoCop), siempre: true },
            ]}
            data-testid="gestiones-resumen"
          />
        </div>
      ) : null}

      <DataTable
        columns={columnas}
        rows={data?.gestiones}
        getKey={(g) => g.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle={data && !data.prendido ? 'La gestión de Leasefy está apagada' : `Leasefy no gestionó inmuebles en ${nombreDelMesDeLaGestion(mes)}`}
        emptyIcon={<HouseLine weight="duotone" />}
        aria-label="Gestiones de Leasefy"
        queSon={['gestión', 'gestiones']}
        filtrosEnLaUrl={['mes']}
        exportar={`gestiones-de-leasefy-${mes}`}
      />

      <Cajon abierto={nueva !== null} onOpenChange={(a) => (a ? null : setNueva(null))}>
        <CajonCabecera titulo="Nueva gestión" descripcion="Leasefy empieza a gestionar el inmueble de un propietario sin inmobiliaria. Queda registrado con tu correo." />
        <CajonCuerpo>
          {nueva ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="gestion-inmueble" className="text-body-sm font-medium text-fg">
                  Id del inmueble
                </label>
                <Input id="gestion-inmueble" className="font-mono" value={nueva.propertyId} onChange={(e) => setNueva({ ...nueva, propertyId: e.target.value })} placeholder="0f8fad5b-d9cb-469f-a165-…" />
                <p className="text-caption text-fg-subtle">Lo ves en Admin → Inmuebles. Tiene que ser de un propietario, no de una inmobiliaria.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="gestion-desde" className="text-body-sm font-medium text-fg">
                    Desde
                  </label>
                  <Input id="gestion-desde" type="date" value={nueva.desde} onChange={(e) => setNueva({ ...nueva, desde: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="gestion-porcentaje" className="text-body-sm font-medium text-fg">
                    Porcentaje (vacío = {porcentajeDeLaGestion(data?.porcentajeBps ?? 500)})
                  </label>
                  <Input id="gestion-porcentaje" inputMode="decimal" className="font-mono" value={nueva.porcentaje} onChange={(e) => setNueva({ ...nueva, porcentaje: e.target.value.replace(/[^\d,.]/g, '') })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="gestion-notas" className="text-body-sm font-medium text-fg">
                  Notas (opcional)
                </label>
                <Input id="gestion-notas" value={nueva.notas} maxLength={500} onChange={(e) => setNueva({ ...nueva, notas: e.target.value })} />
              </div>
              {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
            </div>
          ) : null}
        </CajonCuerpo>
        <CajonPie>
          <Button variant="outline" hideArrow onClick={() => setNueva(null)}>
            Cancelar
          </Button>
          <Button hideArrow disabled={guardando} isLoading={guardando} onClick={() => void crear()}>
            Empezar a gestionarlo
          </Button>
        </CajonPie>
      </Cajon>

      <Cajon abierto={terminando !== null} onOpenChange={(a) => (a ? null : setTerminando(null))}>
        <CajonCabecera titulo="Terminar la gestión" descripcion={terminando ? `${terminando.g.inmueble ?? 'El inmueble'} deja de cobrar el porcentaje de Leasefy desde esa fecha.` : ''} />
        <CajonCuerpo>
          {terminando ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="gestion-hasta" className="text-body-sm font-medium text-fg">
                  Hasta
                </label>
                <Input id="gestion-hasta" type="date" min={terminando.g.desde.slice(0, 10)} value={terminando.hasta} onChange={(e) => setTerminando({ ...terminando, hasta: e.target.value })} />
              </div>
              {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
            </div>
          ) : null}
        </CajonCuerpo>
        <CajonPie>
          <Button variant="outline" hideArrow onClick={() => setTerminando(null)}>
            Cancelar
          </Button>
          <Button hideArrow variant="destructive" disabled={guardando} isLoading={guardando} onClick={() => void terminar()}>
            Terminar la gestión
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
