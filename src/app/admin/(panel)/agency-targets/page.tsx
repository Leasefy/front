'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { Target } from '@phosphor-icons/react'
import { Alert, Cifra, FranjaDeCifras } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { fmtCOP, fmtNumero } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'

interface Meta {
  inmobiliariasNuevas: number | null
  ingresoMensualCop: number | null
  contratosVigentes: number | null
  inmuebles: number | null
}
interface MesDeMetas {
  mes: string
  enCurso: boolean
  meta: Meta | null
  real: Meta
}

const CAMPOS: Array<{ clave: keyof Meta; nombre: string; plata?: boolean }> = [
  { clave: 'inmobiliariasNuevas', nombre: 'Inmobiliarias nuevas' },
  { clave: 'ingresoMensualCop', nombre: 'Ingreso mensual de planes', plata: true },
  { clave: 'contratosVigentes', nombre: 'Contratos vigentes' },
  { clave: 'inmuebles', nombre: 'Inmuebles' },
]

const nombreDelMes = (clave: string) => {
  const [y, m] = clave.split('-').map(Number)
  const t = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const cifra = (v: number | null, plata?: boolean) => (v == null ? '—' : plata ? fmtCOP(v) : fmtNumero(v))

/**
 * /admin/agency-targets — Metas de Leasefy como negocio (19-10-2026, Nico). Era
 * una maqueta. Por mes, lo que el equipo se propone contra lo real: las
 * inmobiliarias nuevas se cuentan en cualquier mes; ingreso, contratos e
 * inmuebles sólo se saben hoy (mes en curso). Back: `api/v1/admin/metas`.
 */
export default function MetasPage() {
  const { data, isLoading, error, refetch } = useApiQuery<{ disponible: boolean; meses: MesDeMetas[] }>(
    (s) => adminApi('/metas', { signal: s }),
    [],
  )
  const [editando, setEditando] = useState<MesDeMetas | null>(null)
  const [valores, setValores] = useState<Record<keyof Meta, string>>({ inmobiliariasNuevas: '', ingresoMensualCop: '', contratosVigentes: '', inmuebles: '' })
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const abrir = (m: MesDeMetas) => {
    setEditando(m)
    setFallo(null)
    setValores({
      inmobiliariasNuevas: m.meta?.inmobiliariasNuevas?.toString() ?? '',
      ingresoMensualCop: m.meta?.ingresoMensualCop?.toString() ?? '',
      contratosVigentes: m.meta?.contratosVigentes?.toString() ?? '',
      inmuebles: m.meta?.inmuebles?.toString() ?? '',
    })
  }

  async function guardar() {
    if (!editando) return
    setGuardando(true)
    setFallo(null)
    try {
      const cuerpo = Object.fromEntries(CAMPOS.map((c) => [c.clave, valores[c.clave] === '' ? null : Number(valores[c.clave])]))
      await adminApi(`/metas/${editando.mes}`, { method: 'PUT', body: cuerpo })
      // Ronda 26 (T10): aviso al terminar, con lo que cambió.
      toast.success(`Listo: quedaron las metas de ${nombreDelMes(editando.mes).toLowerCase()}`)
      setEditando(null)
      refetch()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: 'guardar las metas', porDefecto: 'No se pudieron guardar las metas.' }))
    } finally {
      setGuardando(false)
    }
  }

  const enCurso = data?.meses.find((m) => m.enCurso) ?? null

  const columnas: Column<MesDeMetas>[] = [
    {
      header: 'Mes',
      orden: (m) => m.mes,
      texto: (m) => nombreDelMes(m.mes),
      cell: (m) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-fg">{nombreDelMes(m.mes)}</span>
          {m.enCurso ? <Pill tone="neutral">Este mes</Pill> : null}
        </div>
      ),
    },
    ...CAMPOS.map<Column<MesDeMetas>>((c) => ({
      header: c.nombre,
      align: 'right',
      orden: (m) => m.real[c.clave],
      ordenPrimero: 'desc' as const,
      texto: (m) => m.real[c.clave],
      cell: (m) => {
        const meta = m.meta?.[c.clave] ?? null
        const real = m.real[c.clave]
        const llego = meta != null && real != null && real >= meta
        return (
          <div className="whitespace-nowrap">
            <div className={`font-mono tabular-nums ${llego ? 'text-success' : 'text-fg'}`}>{cifra(real, c.plata)}</div>
            <div className="text-caption text-fg-muted">
              Meta <span className="font-mono tabular-nums">{cifra(meta, c.plata)}</span>
            </div>
          </div>
        )
      },
    })),
    {
      header: '',
      align: 'right',
      cell: (m) => (
        <Button size="sm" variant="outline" hideArrow disabled={!data?.disponible} onClick={() => abrir(m)}>
          {m.meta ? 'Cambiar' : 'Poner metas'}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Metas"
        description="Lo que Leasefy se propone cada mes contra lo que pasó."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo se cuentan" titulo="Las metas del mes" variante="secundario">
            <p className="text-body-sm text-fg-muted">
              Las inmobiliarias nuevas se cuentan en cualquier mes; el ingreso de planes, los contratos y los inmuebles
              sólo se saben hoy, así que se comparan en el mes en curso. Deja vacío lo que no quieras medir.
            </p>
          </ParaEntenderMas>
        }
        principal={
          enCurso && data?.disponible ? (
            <Button size="sm" hideArrow onClick={() => abrir(enCurso)}>
              {enCurso.meta ? 'Cambiar las metas del mes' : 'Poner las metas del mes'}
            </Button>
          ) : undefined
        }
      />
      {data && !data.disponible ? (
        <Alert variant="warning" title="Todavía no se pueden poner metas">
          Falta preparar la base para las metas. Mientras tanto se ve lo real.
        </Alert>
      ) : null}

      {/* Glow up 22-10: LA RESPUESTA arriba —cómo va el mes en curso contra su meta— y las otras tres cifras. */}
      {enCurso ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <CifraHeroe
              rotulo={`Inmobiliarias nuevas · ${nombreDelMes(enCurso.mes).toLowerCase()}`}
              cifra={cifra(enCurso.real.inmobiliariasNuevas)}
              contexto={
                enCurso.meta?.inmobiliariasNuevas != null
                  ? `de una meta de ${fmtNumero(enCurso.meta.inmobiliariasNuevas)}`
                  : 'sin meta para este mes'
              }
              tramos={
                enCurso.meta?.inmobiliariasNuevas
                  ? [
                      {
                        clave: 'van',
                        etiqueta: 'Van',
                        monto: Math.min(enCurso.real.inmobiliariasNuevas ?? 0, enCurso.meta.inmobiliariasNuevas),
                        tono: 'exito',
                        cifra: cifra(enCurso.real.inmobiliariasNuevas),
                        siempre: true,
                      },
                      {
                        clave: 'faltan',
                        etiqueta: 'Faltan',
                        monto: Math.max(0, enCurso.meta.inmobiliariasNuevas - (enCurso.real.inmobiliariasNuevas ?? 0)),
                        tono: 'neutro',
                        cifra: fmtNumero(Math.max(0, enCurso.meta.inmobiliariasNuevas - (enCurso.real.inmobiliariasNuevas ?? 0))),
                      },
                    ]
                  : []
              }
              total={enCurso.meta?.inmobiliariasNuevas ?? undefined}
              data-testid="metas-del-mes"
            />
          </div>
          <FranjaDeCifras fila="lg" columnas={3} aria-label="Las otras metas del mes">
            {CAMPOS.filter((c) => c.clave !== 'inmobiliariasNuevas').map((c) => {
              const meta = enCurso.meta?.[c.clave] ?? null
              const real = enCurso.real[c.clave]
              return (
                <Cifra
                  key={c.clave}
                  etiqueta={c.nombre}
                  valor={cifra(real, c.plata)}
                  detalle={meta != null ? `meta ${cifra(meta, c.plata)}` : 'sin meta'}
                  tono={meta != null && real != null && real >= meta ? 'exito' : undefined}
                />
              )
            })}
          </FranjaDeCifras>
        </div>
      ) : null}

      <DataTable
        errorTitulo="No pudimos cargar las metas"
        columns={columnas}
        rows={data?.meses}
        getKey={(m) => m.mes}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        rowClassName={(m) => (m.enCurso ? 'bg-surface-muted' : undefined)}
        emptyTitle="Sin meses"
        emptyIcon={<Target weight="duotone" />}
        aria-label="Metas por mes"
        queSon={['mes', 'meses']}
        // Ronda 30 (mandato: toda tabla con buscador): se busca el mes por su nombre.
        buscar="Buscar un mes"
        exportar="metas-de-leasefy"
        masEnElExcel={CAMPOS.map((c) => ({ header: `Meta · ${c.nombre}`, texto: (m: MesDeMetas) => m.meta?.[c.clave] ?? null }))}
        onRowClick={data?.disponible ? abrir : undefined}
      />

      <Cajon abierto={editando !== null} onOpenChange={(a) => (a ? null : setEditando(null))}>
        <CajonCabecera titulo={editando ? `Metas de ${nombreDelMes(editando.mes).toLowerCase()}` : 'Metas'} descripcion="Deja vacío lo que no quieras medir. Queda registrado con tu correo." />
        <CajonCuerpo>
          <div className="space-y-4">
            {CAMPOS.map((c) => (
              <div key={c.clave} className="space-y-1.5">
                <label htmlFor={`meta-${c.clave}`} className="text-body-sm font-medium text-fg">
                  {c.nombre}
                  {c.plata ? ' (pesos)' : ''}
                </label>
                <Input
                  id={`meta-${c.clave}`}
                  inputMode="numeric"
                  className="font-mono tabular-nums"
                  value={valores[c.clave]}
                  onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value.replace(/[^\d]/g, '') }))}
                />
              </div>
            ))}
            {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
          </div>
        </CajonCuerpo>
        <CajonPie>
          <Button variant="outline" hideArrow onClick={() => setEditando(null)}>
            Cancelar
          </Button>
          <Button hideArrow disabled={guardando} isLoading={guardando} onClick={() => void guardar()}>
            {guardando ? 'Guardando…' : 'Guardar las metas'}
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
