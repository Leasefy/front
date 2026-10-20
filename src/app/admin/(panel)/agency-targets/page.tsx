'use client'

import { useState } from 'react'
import { Target } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
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
      setEditando(null)
      refetch()
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: 'guardar las metas', porDefecto: 'No se pudieron guardar las metas.' }))
    } finally {
      setGuardando(false)
    }
  }

  const columnas: Column<MesDeMetas>[] = [
    {
      header: 'Mes',
      orden: (m) => m.mes,
      texto: (m) => nombreDelMes(m.mes),
      cell: (m) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-fg">{nombreDelMes(m.mes)}</span>
          {m.enCurso ? <Pill tone="info">Este mes</Pill> : null}
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
          <div className="whitespace-nowrap tabular-nums">
            <div className={llego ? 'text-success' : 'text-fg'}>{cifra(real, c.plata)}</div>
            <div className="text-caption text-fg-subtle">Meta {cifra(meta, c.plata)}</div>
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
        description="Lo que Leasefy se propone cada mes contra lo que pasó. Las inmobiliarias nuevas se cuentan en cualquier mes; el ingreso de planes, los contratos y los inmuebles sólo se saben hoy, así que se comparan en el mes en curso."
      />
      {data && !data.disponible ? (
        <Alert variant="warning" title="Falta la tabla de metas en esta base">
          La crea la migración 20261019230000. Mientras tanto se ve lo real, pero no se pueden poner metas.
        </Alert>
      ) : null}
      <DataTable
        columns={columnas}
        rows={data?.meses}
        getKey={(m) => m.mes}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        rowClassName={(m) => (m.enCurso ? 'bg-primary/5' : undefined)}
        emptyTitle="Sin meses"
        emptyIcon={<Target weight="bold" />}
        aria-label="Metas por mes"
        queSon={['mes', 'meses']}
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
                  className="tabular-nums"
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
          <Button hideArrow disabled={guardando} onClick={() => void guardar()}>
            {guardando ? 'Guardando…' : 'Guardar las metas'}
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  )
}
