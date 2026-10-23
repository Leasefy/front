'use client'

import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { useMemo, useState } from 'react'
import { Airplane } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { useApiQuery } from '@/lib/admin/use-api-query'
import {
  EL_ESTADO,
  ESTADOS_DEL_PILOTO,
  cambiarElPiloto,
  listarElPiloto,
  mensajeDelFalloDelPiloto,
  type EstadoDelPilotoPorLeasefy,
  type PilotoDeLaInmobiliaria,
} from '@/lib/admin/piloto-de-las-inmobiliarias'

const cuando = (iso: string | null) => {
  if (!iso) return 'nunca'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? 'nunca'
    : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })
}

/**
 * Cada opción del selector de la fila, corta para que las tres quepan en una línea (el nombre entero va en
 * `aria-label`). Ronda 26 (revisora r25): son ESTADOS, no verbos («Prueba» era un sustantivo suelto y «Apagar»
 * se ofrecía a lo que nunca se encendió).
 */
const ACCION: Record<EstadoDelPilotoPorLeasefy, string> = { prueba: 'En prueba', contratado: 'Contratado', apagado: 'Apagado' }

const tono = (e: EstadoDelPilotoPorLeasefy) => (e === 'contratado' ? 'ok' : e === 'apagado' ? 'bad' : 'warn')

const SEGMENTOS: Segmento<PilotoDeLaInmobiliaria>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  ...ESTADOS_DEL_PILOTO.map((e) => ({ valor: e, nombre: EL_ESTADO[e].nombre, cumple: (f: PilotoDeLaInmobiliaria) => f.estado === e })),
  { valor: 'encendido', nombre: 'Encendido', cumple: (f) => f.activo },
]

/** Lo que se está cambiando: la inmobiliaria, a qué estado y el motivo (obligatorio). */
interface Cambio {
  fila: PilotoDeLaInmobiliaria
  estado: EstadoDelPilotoPorLeasefy
  motivo: string
}

/**
 * /admin/piloto — el Piloto automático de cada inmobiliaria (ACT-09, Nico
 * 05-10-2026). Leasefy lo deja en prueba, contratado o apagado, con un motivo
 * que queda en la bitácora. Es el único lugar donde se cambia el plan del
 * Piloto: la pantalla de la inmobiliaria sólo lo prende y lo apaga dentro de lo
 * que Leasefy deja.
 *
 * 20-10-2026 (Nico: «que las tablas tengan paginación, filtros y todo lo que
 * tienen las tablas de la plataforma»): la lista va en `DataTable` (buscar,
 * pestañas por estado, ordenar, Excel) y el cambio se confirma en un cajón.
 */
export default function PilotoDeLasInmobiliariasPage() {
  const { data, isLoading, error, refetch } = useApiQuery<PilotoDeLaInmobiliaria[]>((signal) => listarElPiloto(signal), [])
  const [cambio, setCambio] = useState<Cambio | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)

  const conteo = useMemo(() => {
    const c = { prueba: 0, contratado: 0, apagado: 0, activos: 0 }
    for (const f of data ?? []) {
      c[f.estado] += 1
      if (f.activo) c.activos += 1
    }
    return c
  }, [data])

  const motivoValido = (cambio?.motivo.trim().length ?? 0) >= 5

  function abrir(fila: PilotoDeLaInmobiliaria, estado: EstadoDelPilotoPorLeasefy) {
    setHecho(null)
    setFallo(null)
    setCambio({ fila, estado, motivo: '' })
  }

  async function guardar() {
    if (!cambio || !motivoValido) return
    setGuardando(true)
    setFallo(null)
    try {
      const nueva = await cambiarElPiloto(cambio.fila.tenant_id, cambio.estado, cambio.motivo.trim())
      setHecho(`${nueva.legal_name}: ${EL_ESTADO[nueva.estado].nombre.toLowerCase()}. ${nueva.detalle}`)
      setCambio(null)
      refetch()
    } catch (err) {
      setFallo(mensajeDelFalloDelPiloto(err))
    } finally {
      setGuardando(false)
    }
  }

  const detalleComun =
    data && data.length > 1 && data.every((f) => f.detalle === data[0].detalle) ? data[0].detalle : null

  const columnas: Column<PilotoDeLaInmobiliaria>[] = [
    {
      header: 'Inmobiliaria',
      // Ronda 26 (revisora r25): «Cómo está hoy» ya no es una columna con la misma frase larga en cada fila;
      // va callada debajo del nombre.
      cell: (f) => (
        <div className="min-w-0">
          <span className="text-body-sm font-medium text-fg">{f.legal_name}</span>
          {/* Ronda 30 (revisora r27): si la frase es la misma en todas, se dice una vez arriba de la tabla y aquí
              queda sólo para lectores de pantalla (mismo data-testid). */}
          <span
            className={detalleComun ? 'sr-only' : 'block text-caption text-fg-muted'}
            data-testid={`admin-piloto-detalle-${f.tenant_id}`}
          >
            {f.detalle}
          </span>
        </div>
      ),
      orden: (f) => f.legal_name,
      texto: (f) => f.legal_name,
    },
    {
      // Ronda 30 (revisora r27): UNA columna «En prueba · sin encender» (antes «Plan del piloto» y «En la
      // inmobiliaria» en dos columnas, que parecían contradecirse).
      header: 'Estado',
      cell: (f) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <Pill tone={tono(f.estado)}>{EL_ESTADO[f.estado].nombre}</Pill>
          <span className={f.activo ? 'text-caption text-success' : 'text-caption text-fg-muted'}>
            {f.activo ? 'encendido' : 'sin encender'}
          </span>
        </span>
      ),
      orden: (f) => `${EL_ESTADO[f.estado].nombre}-${f.activo ? 1 : 0}`,
      texto: (f) => `${EL_ESTADO[f.estado].nombre} · ${f.activo ? 'Encendido' : 'Sin encender'}`,
    },
    {
      header: 'Último cambio',
      cell: (f) => (
        <span className="text-caption text-fg-muted">
          {f.updated_at ? (
            <span className="font-mono tabular-nums">{cuando(f.updated_at)}</span>
          ) : (
            <span className="text-fg-subtle" title="Nadie lo ha cambiado">
              <span aria-hidden="true">—</span>
              <span className="sr-only">Nadie lo ha cambiado</span>
            </span>
          )}
          {f.updated_by ? <span className="block">{f.updated_by}</span> : null}
        </span>
      ),
      orden: (f) => f.updated_at ?? '',
      ordenPrimero: 'desc',
      texto: (f) => (f.updated_at ? `${cuando(f.updated_at)}${f.updated_by ? ` · ${f.updated_by}` : ''}` : ''),
    },
    {
      header: '',
      cell: (f) => (
        // Un selector de tres (se ve como uno): la opción de hoy marcada y sin acción; las otras abren el cajón.
        <div
          className="inline-flex gap-0.5 whitespace-nowrap rounded-md border border-border bg-surface-muted p-0.5"
          role="group"
          aria-label={`Cambiar el plan del piloto de ${f.legal_name}`}
        >
          {ESTADOS_DEL_PILOTO.map((e) => (
            <Button
              key={e}
              type="button"
              variant={f.estado === e ? 'secondary' : 'ghost'}
              size="sm"
              hideArrow
              aria-pressed={f.estado === e}
              aria-label={f.estado === e ? `Hoy está en «${EL_ESTADO[e].nombre}»` : `Dejarlo en «${EL_ESTADO[e].nombre}»`}
              title={EL_ESTADO[e].nombre}
              disabled={guardando || f.estado === e}
              onClick={(ev) => {
                ev.stopPropagation()
                abrir(f, e)
              }}
              data-testid={`admin-piloto-${e}-${f.tenant_id}`}
            >
              {ACCION[e]}
            </Button>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="admin-piloto">
      <PageHeader
        title="Piloto automático"
        description="El piloto automático de cada inmobiliaria: en prueba, contratado o apagado."
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="El piloto automático" variante="secundario">
            <p className="text-body-sm text-fg-muted">En prueba dura 30 días; contratado no vence; apagado lo decide Leasefy. Cada cambio pide un motivo y queda en la bitácora con quién lo hizo.</p>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10: LA RESPUESTA (para cuántas corre el piloto); antes una frase con cinco cifras del mismo peso. */}
      {!isLoading && data && data.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6" data-testid="admin-piloto-conteo">
          <CifraHeroe
            rotulo="Con el piloto encendido"
            cifra={conteo.activos.toLocaleString('es-CO')}
            contexto={`de ${data.length.toLocaleString('es-CO')} ${data.length === 1 ? 'inmobiliaria' : 'inmobiliarias'}`}
            // Ronda 26 (revisora r25): la barra cuenta lo MISMO que la cifra (encendido o no); antes contaba el plan
            // y no se leían juntas. El plan, en las pestañas de la tabla.
            tramos={[
              { clave: 'encendido', etiqueta: 'Encendido', monto: conteo.activos, tono: 'exito', cifra: conteo.activos.toLocaleString('es-CO'), siempre: true },
              {
                clave: 'sin-encender',
                etiqueta: 'Sin encender',
                monto: data.length - conteo.activos,
                tono: 'neutro',
                cifra: (data.length - conteo.activos).toLocaleString('es-CO'),
              },
            ]}
            total={data.length}
            // Ronda 28 (revisora r27, T6): con ninguna encendida, UNA frase (antes «0 de 5» con barra gris y
            // leyenda 0 / 5).
            esCero={conteo.activos === 0}
            cuandoEsCero={
              data.length === 1
                ? 'La inmobiliaria todavía no tiene el piloto encendido.'
                : `Ninguna de las ${data.length.toLocaleString('es-CO')} inmobiliarias tiene el piloto encendido todavía.`
            }
          />
        </div>
      ) : null}

      {hecho && (
        <Alert variant="success" role="status" data-testid="admin-piloto-hecho">
          {hecho}
        </Alert>
      )}

      {detalleComun ? (
        <p className="text-body-sm text-fg-muted" data-testid="admin-piloto-detalle-comun">
          En todas: {detalleComun.charAt(0).toLowerCase() + detalleComun.slice(1)}
        </p>
      ) : null}

      <DataTable
        columns={columnas}
        rows={data}
        getKey={(f) => f.tenant_id}
        isLoading={isLoading}
        error={error ? new Error(mensajeDelFalloDelPiloto(error)) : null}
        onReintentar={refetch}
        emptyTitle="Todavía no hay inmobiliarias"
        emptyIcon={<Airplane weight="duotone" />}
        aria-label="El piloto automático de cada inmobiliaria"
        filaTestid={(f) => `admin-piloto-fila-${f.tenant_id}`}
        filaMarcada={(f) => f.tenant_id === cambio?.fila.tenant_id}
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar una inmobiliaria"
        segmentos={SEGMENTOS}
        exportar="piloto-automatico"
        masEnElExcel={[{ header: 'Cómo está hoy', texto: (f) => f.detalle }]}
      />

      <Cajon
        abierto={cambio !== null}
        onOpenChange={(abierto) => (abierto || guardando ? null : setCambio(null))}
        data-testid="admin-piloto-confirmar"
      >
        <CajonCabecera
          titulo={cambio ? `¿Dejar el Piloto de ${cambio.fila.legal_name} en «${EL_ESTADO[cambio.estado].nombre}»?` : 'Piloto automático'}
          descripcion={cambio ? EL_ESTADO[cambio.estado].queHace : undefined}
        />
        <CajonCuerpo>
          <div className="space-y-4">
            {cambio ? (
              <p className="text-body-sm text-fg-muted">
                <span className="font-medium text-fg">Hoy: </span>
                {cambio.fila.detalle}
              </p>
            ) : null}
            {cambio?.estado === 'apagado' ? (
              <Alert variant="warning">Si la inmobiliaria lo tiene encendido, deja de correr desde ya.</Alert>
            ) : null}
            <div className="space-y-1.5">
              <label htmlFor="motivo-del-piloto" className="text-body-sm font-medium text-fg">
                ¿Por qué? <span className="text-danger">*</span>
              </label>
              <Textarea
                id="motivo-del-piloto"
                value={cambio?.motivo ?? ''}
                onChange={(e) => (cambio ? setCambio({ ...cambio, motivo: e.target.value }) : null)}
                maxLength={500}
                rows={3}
                aria-required="true"
                placeholder="Ej.: firmó el contrato del Piloto el 20 de octubre"
                data-testid="admin-piloto-motivo"
              />
              <p className="text-caption text-fg-subtle">Queda en la bitácora con tu correo y la fecha.</p>
            </div>
            {fallo ? (
              <Alert variant="danger" role="alert" data-testid="admin-piloto-fallo">
                {fallo}
              </Alert>
            ) : null}
          </div>
        </CajonCuerpo>
        <CajonPie ayuda={motivoValido ? undefined : 'Escribe al menos 5 letras.'}>
          <Button variant="outline" hideArrow type="button" onClick={() => setCambio(null)} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            type="button"
            variant={cambio?.estado === 'apagado' ? 'destructive' : 'default'}
            onClick={() => void guardar()}
            disabled={!motivoValido || guardando}
            isLoading={guardando}
            data-testid="admin-piloto-guardar"
          >
            {guardando ? 'Guardando…' : 'Sí, cambiarlo'}
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
