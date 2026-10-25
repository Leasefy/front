'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Buildings } from '@phosphor-icons/react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtFecha, fmtNumero } from '@/lib/admin/format'
import { pasaLosFiltros, type InmobiliariaDeLaLista } from '@/lib/admin/inmobiliarias-de-la-lista'
import { estadoDelPlan } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Cifra, FranjaDeCifras } from '@leasefy/cadence'
import { CifraHeroe, type TramoDeLaCifra } from '@/components/pantalla/CifraHeroe'
import { LoadingBlock } from '@/components/admin/screen/states'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { Pill } from '@/components/admin/Pill'
import { RegistrosSinAsistente } from '@/components/admin/RegistrosSinAsistente'

const estadoDe = (f: InmobiliariaDeLaLista) => f.plan?.estado ?? 'sin-plan'

/** Las pestañas por estado del plan, con su conteo. */
const SEGMENTOS: Segmento<InmobiliariaDeLaLista>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  { valor: 'ACTIVE', nombre: 'Al día', cumple: (f) => estadoDe(f) === 'ACTIVE' },
  { valor: 'PAST_DUE', nombre: 'En mora', cumple: (f) => estadoDe(f) === 'PAST_DUE' },
  { valor: 'SUSPENDED', nombre: 'Suspendidas', cumple: (f) => estadoDe(f) === 'SUSPENDED' },
  { valor: 'CANCELLED', nombre: 'Canceladas', cumple: (f) => estadoDe(f) === 'CANCELLED' },
  { valor: 'sin-plan', nombre: 'Sin plan', cumple: (f) => estadoDe(f) === 'sin-plan' },
]

/** Los tramos de la barra: de lo sano a lo perdido (los conteos los dicen las pestañas). */
const TRAMOS: Array<{ valor: string; nombre: string; tono: TramoDeLaCifra['tono'] }> = [
  { valor: 'ACTIVE', nombre: 'Al día', tono: 'exito' },
  { valor: 'PAST_DUE', nombre: 'En mora', tono: 'aviso' },
  { valor: 'SUSPENDED', nombre: 'Suspendidas', tono: 'critico' },
  { valor: 'CANCELLED', nombre: 'Canceladas', tono: 'neutro' },
  { valor: 'sin-plan', nombre: 'Sin plan', tono: 'neutro' },
]

const FILTRO_DE_MIGRACION = [
  { valor: 'pendiente', nombre: 'Pendiente' },
  { valor: 'completada', nombre: 'Completada' },
  { valor: 'omitida', nombre: 'No la hizo' },
]

// 20-10-2026 (Nico: «márcalas»): de dónde llegó.
const FILTRO_DE_ORIGEN = [
  { valor: 'marketplace', nombre: 'Del marketplace' },
  { valor: 'registro', nombre: 'Registro completo' },
]

const FILTRO_DE_COBRANZA = [
  { valor: 'si', nombre: 'Con cobranza por voz' },
  { valor: 'no', nombre: 'Sin cobranza por voz' },
]

// ---------- Page ----------

/**
 * /admin/tenants — todas las inmobiliarias de Leasefy.
 *
 * 🔴 19-10-2026 (Nico: «que sí traiga la información de cada cosa»). Antes la
 * lista era la de la cobranza por voz (`agent.agencies`): 2 de 8 en el lab, con
 * columnas de deudores y llamadas. Ahora es la plataforma: plan, contratos,
 * inmuebles y equipo, y la cobranza por voz como un dato más.
 *
 * El endpoint devuelve el arreglo entero (no pagina): el filtro y el recorte
 * van en el cliente, con los filtros en la URL para poder compartir el enlace.
 */
/** Ronda 26 (revisora r25): el cero de una columna, callado («—» atenuado), para que se vea lo que sí tiene. */
function Cero({ titulo = 'Ninguno' }: { titulo?: string }) {
  return (
    <span className="text-fg-subtle" title={titulo}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{titulo}</span>
    </span>
  )
}

export default function TenantsPage() {
  const router = useRouter()
  const { get, setFilters } = useUrlFilters()
  const voz = get('voz')
  const migracion = get('migracion')
  const origen = get('origen')

  const tenants = useApiQuery<InmobiliariaDeLaLista[]>((signal) => adminApi('/tenants', { signal }))

  const todas = tenants.data
  const filtrar = useMemo(
    () => (f: InmobiliariaDeLaLista) =>
      pasaLosFiltros(f, { q: '', plan: '', voz }) &&
      (!migracion || f.migracion === migracion) &&
      (!origen || (origen === 'marketplace') === (f.del_marketplace === true)),
    [voz, migracion, origen],
  )

  const cifras = useMemo(() => {
    const filas = todas ?? []
    const suma = (k: 'contratos_activos' | 'inmuebles') => filas.reduce((s, f) => s + (f[k] ?? 0), 0)
    return {
      total: filas.length,
      porEstado: Object.fromEntries(TRAMOS.map((t) => [t.valor, filas.filter((f) => estadoDe(f) === t.valor).length])),
      conProblema: filas.filter((f) => f.plan && ['PAST_DUE', 'SUSPENDED'].includes(f.plan.estado)).length,
      conVoz: filas.filter((f) => f.en_cobranza_por_voz === true).length,
      contratos: suma('contratos_activos'),
      inmuebles: suma('inmuebles'),
    }
  }, [todas])

  const columns: Column<InmobiliariaDeLaLista>[] = [
    {
      header: 'Inmobiliaria',
      className: 'min-w-[220px]',
      orden: (r) => r.nombre ?? r.legal_name,
      texto: (r) => r.nombre ?? r.legal_name,
      cell: (r) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-fg">{r.nombre ?? r.legal_name}</span>
            {r.activa === false ? <Pill tone="muted">Inactiva</Pill> : null}
            {r.solo_en_el_agente ? <Pill tone="warn">Sólo en la cobranza</Pill> : null}
            {r.del_marketplace ? <Pill tone="neutral">Del marketplace</Pill> : null}
          </div>
          <div className="mt-0.5 text-caption text-fg-subtle">
            {[r.nit ? `NIT ${r.nit}` : 'Sin NIT', r.ciudad].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    },
    {
      header: 'Plan',
      orden: (r) => r.plan?.nombre ?? r.plan?.tier,
      texto: (r) => (r.plan ? `${r.plan.nombre ?? r.plan.tier} · ${estadoDelPlan(r.plan.estado).nombre}` : 'Sin plan'),
      cell: (r) => {
        const estado = estadoDelPlan(r.plan?.estado)
        return r.plan ? (
          <div className="flex flex-col items-start gap-1">
            <span className="text-body-sm text-fg">{r.plan.nombre ?? r.plan.tier}</span>
            <Pill tone={estado.tono} dot>
              {estado.nombre}
            </Pill>
          </div>
        ) : (
          <span className="text-caption text-fg-subtle">Sin plan</span>
        )
      },
    },
    {
      header: 'Contratos',
      align: 'right',
      orden: (r) => r.contratos_activos ?? 0,
      ordenPrimero: 'desc',
      texto: (r) => r.contratos_activos ?? 0,
      cell: (r) =>
        r.contratos_activos || r.contratos ? (
          <div className="font-mono tabular-nums">
            <span className="text-fg">{fmtNumero(r.contratos_activos ?? 0)}</span>
            {r.contratos ? <div className="text-caption text-fg-subtle">de {fmtNumero(r.contratos)}</div> : null}
          </div>
        ) : (
          <Cero />
        ),
    },
    {
      header: 'Inmuebles',
      align: 'right',
      orden: (r) => r.inmuebles ?? 0,
      ordenPrimero: 'desc',
      texto: (r) => r.inmuebles ?? 0,
      cell: (r) => (r.inmuebles ? <span className="font-mono tabular-nums">{fmtNumero(r.inmuebles)}</span> : <Cero />),
    },
    {
      header: 'Equipo',
      enCelular: false, // Ronda 30 (revisora r27, T16): a 390 la tarjeta lleva nombre, plan, contratos e inmuebles.
      align: 'right',
      orden: (r) => r.equipo ?? 0,
      ordenPrimero: 'desc',
      texto: (r) => r.equipo ?? 0,
      cell: (r) => (r.equipo ? <span className="font-mono tabular-nums">{fmtNumero(r.equipo)}</span> : <Cero />),
    },
    {
      header: 'Cobranza por voz',
      enCelular: false, // Ronda 30 (revisora r27, T16): a 390 la tarjeta lleva nombre, plan, contratos e inmuebles.
      orden: (r) => (r.en_cobranza_por_voz ? r.debtor_count : null),
      ordenPrimero: 'desc',
      texto: (r) =>
        r.en_cobranza_por_voz === true
          ? `${r.debtor_count} deudores · ${r.call_count} llamadas`
          : r.en_cobranza_por_voz === null
            ? 'No se pudo leer'
            : 'Sin conectar',
      cell: (r) =>
        r.en_cobranza_por_voz === true ? (
          <span className="text-caption text-fg-muted">
            <span className="font-mono tabular-nums">{fmtNumero(r.debtor_count)}</span> deudores ·{' '}
            <span className="font-mono tabular-nums">{fmtNumero(r.call_count)}</span> llamadas
          </span>
        ) : r.en_cobranza_por_voz === null ? (
          <span className="text-caption text-fg-subtle">No se pudo leer</span>
        ) : (
          <Cero titulo="Sin conectar" />
        ),
    },
    {
      header: 'Se registró',
      enCelular: false, // Ronda 30 (revisora r27, T16): a 390 la tarjeta lleva nombre, plan, contratos e inmuebles.
      align: 'right',
      orden: (r) => r.created_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtFecha(r.created_at),
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption text-fg-muted tabular-nums">{fmtFecha(r.created_at)}</span>
      ),
    },
  ]


  // Ronda 30 (revisora r27, T15): una columna que dice «—» en todas las filas no informa; sale de la tabla
  // (va al Excel) y vuelve en cuanto una inmobiliaria tenga algo.
  const vacia: Record<string, (r: InmobiliariaDeLaLista) => boolean> = {
    Contratos: (r) => !r.contratos_activos && !r.contratos,
    Inmuebles: (r) => !r.inmuebles,
    Equipo: (r) => !r.equipo,
    'Cobranza por voz': (r) => r.en_cobranza_por_voz === false,
  }
  const filasDeLaTabla = todas ?? []
  const columnasCalladas = filasDeLaTabla.length > 0
    ? columns.filter((c) => vacia[c.header] && filasDeLaTabla.every(vacia[c.header]))
    : []
  const columnasALaVista = columns.filter((c) => !columnasCalladas.includes(c))
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Inmobiliarias"
        description="Cada inmobiliaria de Leasefy con su plan, su operación y su equipo."
      />

      {/* (08-10-2026, Nico) Lo que quedó en «No pudimos abrir tu registro», con su motivo: lo que espera, primero. */}
      <RegistrosSinAsistente />

      {/* Glow up 22-10: LA RESPUESTA en una cifra (cuántas hay y cuántas necesitan algo) con la barra por estado
          del plan; los conteos de cada estado los dicen las pestañas de la tabla (antes, 5 cifras del mismo peso
          que repetían las pestañas). */}
      {tenants.isLoading && !todas ? (
        <LoadingBlock label="Cargando las inmobiliarias" filas={3} />
      ) : todas ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <CifraHeroe
              rotulo="Inmobiliarias en Leasefy"
              cifra={fmtNumero(cifras.total)}
              contexto={
                cifras.conProblema > 0
                  ? `${fmtNumero(cifras.conProblema)} en mora o suspendidas`
                  : cifras.total > 0
                    ? 'ninguna en mora ni suspendida'
                    : undefined
              }
              tramos={TRAMOS.map((t) => ({
                clave: t.valor,
                etiqueta: t.nombre,
                monto: cifras.porEstado[t.valor] ?? 0,
                tono: t.tono,
                cifra: fmtNumero(cifras.porEstado[t.valor] ?? 0),
              }))}
              total={cifras.total}
              data-testid="inmobiliarias-cifra"
            />
          </div>
          {/* Ronda 26 (revisora r25): tres ceros no informan; la franja sólo con operación, y «entre todas» una vez. */}
          {cifras.contratos + cifras.inmuebles + cifras.conVoz > 0 ? (
          <FranjaDeCifras fila="md" columnas={3} aria-label="La operación de las inmobiliarias, sumada entre todas">
            <Cifra etiqueta="Contratos vigentes" valor={cifras.contratos} detalle="entre todas las inmobiliarias" />
            <Cifra etiqueta="Inmuebles" valor={cifras.inmuebles} />
            <Cifra
              etiqueta="Con cobranza por voz"
              valor={cifras.conVoz}
              detalle={`de ${fmtNumero(cifras.total)} ${cifras.total === 1 ? 'inmobiliaria' : 'inmobiliarias'}`}
            />
          </FranjaDeCifras>
          ) : null}
        </div>
      ) : null}

      <DataTable
        columns={columnasALaVista}
        rows={todas}
        getKey={(r) => r.tenant_id}
        isLoading={tenants.isLoading}
        error={tenants.error}
        onReintentar={tenants.refetch}
        emptyTitle="Todavía no hay inmobiliarias"
        emptyHint="Cuando una se registre, aparece aquí."
        emptyIcon={<Buildings weight="bold" />}
        aria-label="Inmobiliarias"
        onRowClick={(r) => router.push(`/admin/tenants/${r.tenant_id}`)}
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Nombre, NIT, ciudad o correo"
        textoExtra={(r) => [r.legal_name, r.nit, r.ciudad, r.correo, r.primary_contact_email].filter(Boolean).join(' ')}
        segmentos={SEGMENTOS}
        filtrar={filtrar}
        filtrosEnLaUrl={['voz', 'migracion', 'origen']}
        ordenInicial={{ columna: Math.max(0, columnasALaVista.findIndex((c) => c.header === 'Se registró')), sentido: 'desc' }}
        cifraDelCelular="Contratos"
        exportar="inmobiliarias"
        masEnElExcel={[
          ...columnasCalladas.map((c) => ({ header: c.header, texto: c.texto! })),
          { header: 'NIT', texto: (r) => r.nit },
          { header: 'Ciudad', texto: (r) => r.ciudad },
          { header: 'Correo', texto: (r) => r.correo ?? r.primary_contact_email },
          { header: 'Contratos en total', texto: (r) => r.contratos ?? 0 },
          { header: 'Migración', texto: (r) => (r.migracion === 'completada' ? 'Completada' : r.migracion === 'omitida' ? 'No la hizo' : 'Pendiente') },
          { header: 'Activa', texto: (r) => r.activa !== false },
          { header: 'Del marketplace', texto: (r) => r.del_marketplace === true },
        ]}
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Cobranza por voz">
              <Desplegable
                value={voz}
                onChange={(v) => setFilters({ voz: v, page: undefined })}
                opciones={FILTRO_DE_COBRANZA}
                todas="Todas"
                aria-label="Cobranza por voz"
                data-testid="filtro-voz"
              />
            </Filtro>
            <Filtro etiqueta="Migración">
              <Desplegable
                value={migracion}
                onChange={(v) => setFilters({ migracion: v, page: undefined })}
                opciones={FILTRO_DE_MIGRACION}
                todas="Todas"
                aria-label="Migración"
                data-testid="filtro-migracion"
              />
            </Filtro>
            <Filtro etiqueta="Origen">
              <Desplegable
                value={origen}
                onChange={(v) => setFilters({ origen: v, page: undefined })}
                opciones={FILTRO_DE_ORIGEN}
                todas="Todas"
                aria-label="Origen"
                data-testid="filtro-origen"
              />
            </Filtro>
          </BarraDeFiltros>
        }
      />
    </div>
  )
}
