'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowsClockwise, CheckCircle } from '@phosphor-icons/react'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtNumero } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LaPlataforma, type ResumenDeLaPlataforma } from '@/components/admin/LaPlataforma'
import { CobranzaPorVoz, type DashboardResponse } from '@/components/admin/CobranzaPorVoz'
import { PestanasDeLaFicha } from '@/components/pantalla/PestanasDeLaFicha'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LoQueEspera {
  clave: string
  frase: string
  href: string
  tono: 'aviso' | 'critico'
}

/**
 * Lo que espera a alguien, sacado de lo que ya llegó: escalaciones abiertas,
 * cobros de plan que fallaron e inmobiliarias en mora o suspendidas. Sólo lo
 * que hay; sin nada, una línea.
 */
function loQueEspera(plataforma?: ResumenDeLaPlataforma, cobranza?: DashboardResponse): LoQueEspera[] {
  const lista: LoQueEspera[] = []
  const escalaciones = cobranza?.openEscalations?.length ?? 0
  if (escalaciones > 0)
    lista.push({
      clave: 'escalaciones',
      frase: `${fmtNumero(escalaciones)} ${escalaciones === 1 ? 'escalación abierta espera' : 'escalaciones abiertas esperan'} a una persona`,
      href: '/admin/escalations',
      tono: 'critico',
    })
  const fallidos = plataforma?.ingresos.cobrosFallidosEsteMes ?? 0
  if (fallidos > 0)
    lista.push({
      clave: 'cobros-fallidos',
      frase: `${fmtNumero(fallidos)} ${fallidos === 1 ? 'cobro de plan falló' : 'cobros de plan fallaron'} este mes`,
      href: '/admin/billing',
      tono: 'aviso',
    })
  const enMora = plataforma?.inmobiliarias.porEstadoDelPlan.PAST_DUE ?? 0
  if (enMora > 0)
    lista.push({
      clave: 'en-mora',
      frase: `${fmtNumero(enMora)} ${enMora === 1 ? 'inmobiliaria está en mora' : 'inmobiliarias están en mora'} con su plan`,
      href: '/admin/tenants?vista=PAST_DUE',
      tono: 'aviso',
    })
  const suspendidas = plataforma?.inmobiliarias.porEstadoDelPlan.SUSPENDED ?? 0
  if (suspendidas > 0)
    lista.push({
      clave: 'suspendidas',
      frase: `${fmtNumero(suspendidas)} ${suspendidas === 1 ? 'inmobiliaria está suspendida' : 'inmobiliarias están suspendidas'}`,
      href: '/admin/tenants?vista=SUSPENDED',
      tono: 'critico',
    })
  return lista
}

/**
 * /admin — Resumen (glow up, 22-10-2026). Responde «¿cómo va Leasefy hoy?»:
 * arriba lo que espera a alguien; después dos pestañas, «Plataforma» (las
 * inmobiliarias y su plata) y «Cobranza por voz» (lo que hizo Mori), cada una
 * con su cifra. Antes eran ~21 cifras del mismo peso, estados en código
 * («approved», «live») y un «En vivo» que no se refrescaba.
 */
export default function AdminDashboard() {
  const router = useRouter()
  const dash = useApiQuery<DashboardResponse>((signal) => adminApi('/dashboard', { signal }), [])
  // (19-10-2026) Lo de Leasefy, aparte: si la cobranza por voz falla, la
  // plataforma igual se ve (y al revés).
  const plataforma = useApiQuery<ResumenDeLaPlataforma>((signal) => adminApi('/plataforma', { signal }), [])

  const cargando = dash.isLoading || plataforma.isLoading
  const pendientes = loQueEspera(plataforma.data, dash.data)
  const yaSeSabe = !cargando && (plataforma.data || dash.data)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Resumen"
        description="Cómo va Leasefy hoy: las inmobiliarias, su plata y lo que espera a alguien."
        acciones={
          <Button
            variant="outline"
            size="sm"
            hideArrow
            isLoading={cargando}
            onClick={() => {
              dash.refetch()
              plataforma.refetch()
            }}
            className="gap-2"
          >
            {cargando ? null : <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
            Actualizar
          </Button>
        }
        principal={
          <Button size="sm" hideArrow asChild>
            <Link href="/admin/tenants">Ver las inmobiliarias</Link>
          </Button>
        }
      />

      {yaSeSabe ? (
        pendientes.length === 0 ? (
          <p className="flex items-center gap-2 text-body-sm text-fg-muted" data-testid="resumen-nada-espera">
            <CheckCircle weight="fill" className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            Nada espera a nadie hoy.
          </p>
        ) : (
          <section aria-label="Lo que espera a alguien" className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="resumen-lo-que-espera">
            <h2 className="px-5 pb-1 pt-4 font-mono text-caption uppercase tracking-[0.12em] text-fg-subtle">Lo que espera a alguien</h2>
            <ul className="divide-y divide-border-faint">
              {pendientes.map((p) => (
                <li key={p.clave}>
                  <Link
                    href={p.href}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-body-sm text-fg transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                    data-testid={`resumen-espera-${p.clave}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn('h-2 w-2 shrink-0 rounded-full', p.tono === 'critico' ? 'bg-error-500' : 'bg-warning-500')}
                        aria-hidden="true"
                      />
                      {p.frase}
                    </span>
                    <span className="shrink-0 text-caption text-fg-muted">Abrir</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      ) : null}

      <PestanasDeLaFicha
        etiqueta="Vistas del resumen"
        data-testid="resumen-pestanas"
        pestanas={[
          {
            id: 'plataforma',
            etiqueta: 'Plataforma',
            contenido: (
              <LaPlataforma
                estado={plataforma}
                onInmobiliarias={(plan) => router.push(plan ? `/admin/tenants?vista=${plan}` : '/admin/tenants')}
              />
            ),
          },
          { id: 'cobranza', etiqueta: 'Cobranza por voz', contenido: <CobranzaPorVoz estado={dash} /> },
        ]}
      />
    </div>
  )
}
