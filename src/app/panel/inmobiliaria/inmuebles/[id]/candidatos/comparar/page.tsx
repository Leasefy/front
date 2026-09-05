'use client'

/**
 * Paso 9 del recorrido: comparar candidatos lado a lado.
 *
 * Se llega desde la lista de candidatos con 2 a 4 seleccionados. Los ids van
 * en la URL para que la comparación se pueda compartir con el propietario,
 * que es quien normalmente decide.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Users, Info } from '@phosphor-icons/react'
import { BackButton, Callout } from '@leasefy/cadence'
import { EmptyState } from '@/components/ui'
import { PageGuard } from '@/components/auth/PageGuard'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { ComparadorCandidatos } from '@/components/inmobiliaria/ComparadorCandidatos'
import { construirComparacion } from '@/lib/inmobiliaria/comparacion'
import { ModalAvisarNoElegidos } from '@/components/inmobiliaria/ModalAvisarNoElegidos'
import { landlordApplicationsApi } from '@/lib/api/applications.service'
import { propertiesApi } from '@/lib/api/properties.service'
import { consignacionesApi } from '@/lib/api/inmobiliaria.service'
import {
  MAXIMO_A_COMPARAR,
  MINIMO_A_COMPARAR,
  type CandidatoComparado,
} from '@/lib/inmobiliaria/comparacion'
import type { LandlordCandidate } from '@/lib/api/applications.types'
import type { Property } from '@/lib/types/property'

const EN_CURSO = new Set(['pending', 'queued', 'running'])

function CompararContent() {
  const params = useParams()
  const router = useRouter()
  const buscador = useSearchParams()
  // `[id]` es el id de la CONSIGNACIÓN, igual que en toda la sección; el
  // inmueble sale del mandato. Ver la nota en `../page.tsx`.
  const consignacionId = params.id as string

  const idsPedidos = useMemo(
    () =>
      (buscador.get('ids') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAXIMO_A_COMPARAR),
    [buscador],
  )

  const [property, setProperty] = useState<Property | null>(null)
  const [entradas, setEntradas] = useState<CandidatoComparado[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [elegido, setElegido] = useState<LandlordCandidate | null>(null)

  const cargar = useCallback(async () => {
    if (idsPedidos.length === 0) {
      setCargando(false)
      return
    }
    setCargando(true)
    setError(null)
    try {
      const consignacion = await consignacionesApi.getById(consignacionId)
      if (!consignacion.propertyId) {
        // Mandato sin inmueble: no hay a quién comparar.
        setEntradas([])
        setProperty(null)
        return
      }
      const [inmueble, candidatos] = await Promise.all([
        propertiesApi.getById(consignacion.propertyId),
        landlordApplicationsApi.getCandidates(consignacion.propertyId),
      ])
      setProperty(inmueble)

      const seleccionados = idsPedidos
        .map((id) => candidatos.find((c) => c.id === id))
        .filter((c): c is LandlordCandidate => Boolean(c))

      // La evaluación de cada uno se pide en paralelo y por separado: que a
      // uno le falte el análisis no puede dejar sin comparación a los demás.
      const comparados = await Promise.all(
        seleccionados.map(async (candidato): Promise<CandidatoComparado> => {
          try {
            const evaluacion = await landlordApplicationsApi.getEvaluationResult(candidato.id)
            return {
              candidato,
              evaluacion,
              evaluacionEnCurso: EN_CURSO.has(evaluacion?.status ?? ''),
            }
          } catch {
            // Sin evaluación todavía. No es un error de la pantalla: es un
            // dato que aún no existe, y la comparación lo dice como tal.
            return { candidato, evaluacion: null, evaluacionEnCurso: false }
          }
        }),
      )
      setEntradas(comparados)
    } catch (err) {
      setError(err)
    } finally {
      setCargando(false)
    }
  }, [consignacionId, idsPedidos])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const volverALista = `/panel/inmobiliaria/inmuebles/${consignacionId}/candidatos`

  /*
   * «Lo verde es quien va mejor en esa fila» explicaba una convención que a
   * veces no está en pantalla. Verificado con tres candidatos sin evaluación:
   * el único dato comparable era la fecha, los tres empataban, no había un
   * solo verde — y arriba seguía la leyenda mandando a buscarlo.
   *
   * Se calcula acá lo mismo que pinta la tabla (función pura y memoizada, no
   * cuesta) para decir la leyenda sólo cuando hay algo que explicar.
   */
  const filas = useMemo(() => construirComparacion(entradas), [entradas])
  const hayDestacado = filas.some((f) => f.mejores.length > 0)
  /* Sin evaluaciones sólo queda la fecha: una tabla de una fila no es una
     comparación, y hay que decir por qué está vacía en vez de dejarla rara. */
  const sinEvaluaciones = entradas.length > 0 && filas.length <= 1

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-4">
        <BackButton label="Volver a candidatos" onClick={() => router.push(volverALista)} />
        <div>
          <h1 className="text-h2 text-fg">Comparar candidatos</h1>
          <p className="mt-0.5 text-sm text-fg-muted line-clamp-2 max-w-2xl">
            {property?.title ? `Postulantes a ${property.title}.` : 'Postulantes a esta propiedad.'}
            {hayDestacado && ' Lo verde es quien va mejor en esa fila.'}
          </p>
        </div>
      </div>

      {cargando ? (
        <EsqueletoTabla columnas={idsPedidos.length + 1} filas={8} />
      ) : error ? (
        <FalloDeCarga
          error={error}
          queEs="la comparación"
          onReintentar={cargar}
          volverA={{ label: 'Volver a candidatos', href: volverALista }}
        />
      ) : entradas.length < MINIMO_A_COMPARAR ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <EmptyState
            icon={Users}
            title={
              entradas.length === 0
                ? 'No elegiste a quién comparar'
                : 'Con uno solo no hay nada que comparar'
            }
            description={`Vuelve a la lista y marca entre ${MINIMO_A_COMPARAR} y ${MAXIMO_A_COMPARAR} postulantes.`}
            action={{ label: 'Volver a candidatos', href: volverALista }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {sinEvaluaciones && (
            <Callout
              icon={<Info weight="duotone" />}
              title="Todavía no hay evaluaciones de estos candidatos"
            >
              Por ahora sólo podemos comparar cuándo se postularon. La evaluación
              arranca sola cuando entra la postulación; cuando termine, acá
              aparecen nivel, ingresos y señales de riesgo.
            </Callout>
          )}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
          <ComparadorCandidatos
            entradas={entradas}
            onVerFicha={(id) => router.push(`${volverALista}?candidato=${encodeURIComponent(id)}`)}
            onElegir={(id) => {
              const c = entradas.find((e) => e.candidato.id === id)
              if (c) setElegido(c.candidato)
            }}
          />
          </div>
        </div>
      )}

      {elegido && (
        <ModalAvisarNoElegidos
          elegido={elegido}
          otros={entradas.map((e) => e.candidato).filter((c) => c.id !== elegido.id)}
          onCerrar={() => setElegido(null)}
          onListo={() => {
            setElegido(null)
            router.push(volverALista)
          }}
        />
      )}
    </div>
  )
}

export default function CompararCandidatosPage() {
  return (
    <PageGuard module="portafolio" action="view">
      <CompararContent />
    </PageGuard>
  )
}
