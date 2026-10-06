'use client'

/**
 * /panel/inmobiliaria/piloto/propuestas — FASE 1 del centro de mando del
 * piloto automático (Nico, 05-10-2026: «que se sienta la UI y la UX como si
 * fuera Jarvis, algo increíblemente wow»).
 *
 * Tres direcciones para que Nico elija, cada una una página completa:
 *   A · Núcleo · B · Cabina · C · Misión del día
 * (`src/components/inmobiliaria/piloto/mando/`). La que gane se implementa TAL
 * CUAL en `/panel/inmobiliaria/piloto` (fase 2) y esta ruta se borra.
 *
 * Dos fuentes, con un conmutador junto al A / B / C:
 *   · «Real»: los MISMOS hooks de la torre (pulso, Bandeja, actividad, briefing,
 *     flota, director) y el MISMO cajón, con sus acciones reales;
 *   · «Muestra encendida»: datos inventados (`mando/muestra.ts`) para ver el
 *     panel encendido y con trabajo en un laboratorio que lo tiene apagado. Con
 *     ella se ve el distintivo «MUESTRA — no son datos reales» y ningún caso se
 *     abre. Se borra en la fase 2.
 *
 * La elección queda en la URL (`?d=A|B|C&f=real|muestra`) para poder mandar el
 * enlace y recargar sin perderla.
 *
 * Mismo contenedor y encabezado que las hermanas del panel (`p-6 lg:p-8
 * space-y-6`, h1 `text-h2`): el carácter vive DENTRO (lección del 31-08).
 */

import { Suspense, useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Flask } from '@phosphor-icons/react'
import { CrossFade, SegmentedControl } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { PilotoActivacion } from '@/components/inmobiliaria/piloto/PilotoActivacion'
import { PilotoCajon, type PilotoApertura } from '@/components/inmobiliaria/piloto/PilotoCajon'
import { RUTA_PILOTO } from '@/components/inmobiliaria/piloto/rutas-del-piloto'
import { DireccionNucleo } from '@/components/inmobiliaria/piloto/mando/DireccionNucleo'
import { DireccionCabina } from '@/components/inmobiliaria/piloto/mando/DireccionCabina'
import { DireccionMision } from '@/components/inmobiliaria/piloto/mando/DireccionMision'
import { DireccionElegida } from '@/components/inmobiliaria/piloto/mando/DireccionElegida'
import { esDeLaMuestra } from '@/components/inmobiliaria/piloto/mando/muestra'
import { controlDeLaMuestra } from '@/components/inmobiliaria/piloto/mando/control-de-agentes'
import { TEXTOS, type Direccion, type Fuente } from '@/components/inmobiliaria/piloto/mando/textos'
import type { AccionesDelMando, PropsDeDireccion } from '@/components/inmobiliaria/piloto/mando/tipos'
import { useDatosReales, useMuestraViva } from '@/components/inmobiliaria/piloto/mando/use-datos-del-mando'
import type { PulsoAlerta } from '@/lib/api/piloto'
import { useDirectorHoy, useDirectorMetas } from '@/lib/hooks/piloto/use-piloto-director'

const DIRECCIONES: Record<Direccion, (p: PropsDeDireccion) => React.ReactNode> = {
  A: DireccionNucleo,
  B: DireccionCabina,
  C: DireccionMision,
  // La que escogió Nico (05-10 17:05). Ya es la pantalla real de /piloto; aquí
  // queda sólo para verla con la MUESTRA y compararla con A, B y C. Esta ruta
  // se borra cuando Nico apruebe la pantalla real.
  E: DireccionElegida,
}

const esDireccion = (v: string | null): v is Direccion => v === 'A' || v === 'B' || v === 'C' || v === 'E'

function Propuestas() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const direccion: Direccion = esDireccion(params.get('d')) ? (params.get('d') as Direccion) : 'E'
  const fuente: Fuente = params.get('f') === 'muestra' ? 'muestra' : 'real'

  const ir = useCallback(
    (d: Direccion, f: Fuente) => router.replace(`${pathname}?d=${d}&f=${f}`, { scroll: false }),
    [router, pathname],
  )

  const info = TEXTOS.pagina.direcciones[direccion]

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="piloto-propuestas">
      <header className="space-y-1">
        <Button asChild variant="link" size="sm" hideArrow className="-ml-2 h-auto px-2 text-fg-muted">
          <Link href={RUTA_PILOTO}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {TEXTOS.pagina.volver}
          </Link>
        </Button>
        <h1 className="text-h2 text-fg">{TEXTOS.pagina.titulo}</h1>
        <p className="max-w-2xl text-sm text-fg-muted">{TEXTOS.pagina.bajada}</p>
      </header>

      {/* El selector A / B / C y la fuente de los datos. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <SegmentedControl<Direccion>
            aria-label={TEXTOS.pagina.selector}
            value={direccion}
            onChange={(d) => ir(d, fuente)}
            options={(['E', 'A', 'B', 'C'] as const).map((d) => ({
              value: d,
              label: (
                <span>
                  <span className="font-mono">{TEXTOS.pagina.direcciones[d].letra}</span> · {TEXTOS.pagina.direcciones[d].nombre}
                </span>
              ),
              ariaLabel: `${TEXTOS.pagina.direcciones[d].letra} · ${TEXTOS.pagina.direcciones[d].nombre}`,
            }))}
          />
          <CrossFade swapKey={direccion} mode="popLayout" className="min-w-0">
            <p className="text-caption text-fg-muted">{info.idea}</p>
          </CrossFade>
        </div>
        <SegmentedControl<Fuente>
          aria-label={TEXTOS.pagina.fuente}
          size="sm"
          value={fuente}
          onChange={(f) => ir(direccion, f)}
          options={[
            { value: 'real', label: TEXTOS.pagina.real },
            { value: 'muestra', label: TEXTOS.pagina.muestra },
          ]}
        />
      </div>

      {fuente === 'muestra' && <DistintivoDeMuestra />}

      {fuente === 'real' ? <ConDatosReales direccion={direccion} /> : <ConMuestra direccion={direccion} />}
    </div>
  )
}

/** Fijo arriba mientras se mira la muestra: nunca se confunde con datos reales. */
function DistintivoDeMuestra() {
  return (
    <div
      role="note"
      className="sticky top-2 z-20 flex flex-col gap-1 rounded-lg border border-warning bg-warning-soft px-4 py-3 shadow-md sm:flex-row sm:items-center sm:gap-3"
      data-testid="mando-distintivo-muestra"
    >
      <span className="inline-flex items-center gap-2 font-mono text-label font-semibold uppercase tracking-wide text-[color:var(--warning-ink)]">
        <Flask weight="fill" className="h-4 w-4" aria-hidden="true" />
        {TEXTOS.muestra.distintivo}
      </span>
      <span className="text-caption text-fg">{TEXTOS.muestra.explicacion}</span>
    </div>
  )
}

function VistaDeLaDireccion({ direccion, datos, acciones, activacion }: { direccion: Direccion } & PropsDeDireccion) {
  const Vista = DIRECCIONES[direccion]
  return (
    <CrossFade swapKey={`${direccion}-${datos.fuente}`} direction="up">
      <Vista datos={datos} acciones={acciones} {...(activacion ? { activacion } : {})} />
    </CrossFade>
  )
}

function ConMuestra({ direccion }: { direccion: Direccion }) {
  const datos = useMuestraViva(true)
  const acciones = useMemo<AccionesDelMando>(
    () => ({
      abrirItem: (id) => {
        if (esDeLaMuestra(id)) toast.info(TEXTOS.muestra.noSeAbre)
      },
      abrirAlerta: () => toast.info(TEXTOS.muestra.noSeAbre),
      // El popover de cada agente se ve completo; su botón avisa que es la muestra y no ejecuta.
      agentes: controlDeLaMuestra(),
    }),
    [],
  )
  return <VistaDeLaDireccion direccion={direccion} datos={datos} acciones={acciones} />
}

/**
 * Los datos reales y el MISMO cajón de la torre, con su pila (cada salto
 * recuerda de dónde vino) y el refresco tras una acción.
 */
function ConDatosReales({ direccion }: { direccion: Direccion }) {
  const hoy = useDirectorHoy()
  const metas = useDirectorMetas()
  const datos = useDatosReales({ hoy, metas })
  const [pila, setPila] = useState<PilotoApertura[]>([])
  const apertura = pila.length > 0 ? (pila[pila.length - 1] as PilotoApertura) : null

  const abrirItem = useCallback(
    (id: string, accion?: string) => setPila((p) => [...p, accion ? { tipo: 'item', id, accion } : { tipo: 'item', id }]),
    [],
  )
  /** Una alerta con UN solo caso abre ese caso directo (la regla de la torre, 31-08). */
  const abrirAlerta = useCallback((alerta: PulsoAlerta) => {
    const unico = alerta.items?.length === 1 ? alerta.items[0] : undefined
    setPila((p) => [...p, unico ? { tipo: 'item', id: unico.id } : { tipo: 'alerta', alerta }])
  }, [])
  const acciones = useMemo<AccionesDelMando>(() => ({ abrirItem, abrirAlerta }), [abrirItem, abrirAlerta])

  const porQueDeRespaldo = useMemo(() => {
    if (apertura?.tipo !== 'item') return null
    if (apertura.porQue) return apertura.porQue
    const fila = datos.bandeja.data?.items.find((i) => i.id === apertura.id)
    return fila ? { director: fila.director ?? null, motivo: fila.motivo ?? null } : null
  }, [apertura, datos.bandeja.data])

  const refrescar = useCallback(async () => {
    await Promise.allSettled([datos.bandeja.reintentar?.(), datos.actividad.reintentar?.(), datos.pulso.reintentar?.()])
  }, [datos.bandeja, datos.actividad, datos.pulso])

  return (
    <>
      <VistaDeLaDireccion direccion={direccion} datos={datos} acciones={acciones} activacion={<PilotoActivacion />} />
      <PilotoCajon
        apertura={apertura}
        onClose={() => setPila([])}
        {...(pila.length > 1 ? { onVolver: () => setPila((p) => p.slice(0, -1)) } : {})}
        onAbrirItem={(id) => abrirItem(id)}
        onAccionEjecutada={refrescar}
        porQueDeRespaldo={porQueDeRespaldo}
      />
    </>
  )
}

/*
 * `PageGuard` SIN módulo, como la torre: el piloto automático es el inicio de
 * todo miembro y cada pieza se defiende sola.
 */
export default function PilotoPropuestasPage() {
  return (
    <PageGuard>
      <Suspense fallback={null}>
        <Propuestas />
      </Suspense>
    </PageGuard>
  )
}

