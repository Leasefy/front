'use client'

/**
 * RequisitosClient — qué le pide esta inmobiliaria a cada tipo de inquilino.
 *
 * ── F-05 (18-09-2026) ──────────────────────────────────────────────────────
 *
 * «Los requisitos por tipo de inquilino LOS DEFINE CADA INMOBILIARIA.»
 *
 * ── Las dos cosas que esta pantalla deja claras ────────────────────────────
 *
 *   1. **cuando todavía es el sugerido, lo dice**. Una lista que parece propia y
 *      no lo es hace que nadie la revise, y el día que el candidato sube los
 *      papeles equivocados nadie entiende por qué.
 *   2. 🔴 **el estudio de Leasefy no se puede apagar** (F-08: «nunca se firma o
 *      postula sin el estudio»). Se muestra con candado y sin interruptor, no
 *      con un interruptor que después devuelve un 409: un control deshabilitado
 *      con su porqué al lado enseña la regla; uno que falla, enseña a
 *      desconfiar de la pantalla.
 */

import { useState } from 'react'
import { ListChecks, Lock } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@/components/ui'
import { postulacionesApi } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'

const CLASE: Record<string, string> = {
  DOCUMENTO: 'Sube un archivo',
  DATO: 'Escribe un dato',
  ACCION: 'Hace algo',
}

export function RequisitosClient() {
  const { canAccess } = usePermissions()
  const puedeEditar = canAccess('configuracion', 'edit')

  const [perfil, setPerfil] = useState<string | null>(null)
  const datos = useCrm(
    () => postulacionesApi.requisitos(perfil ?? undefined),
    [perfil],
    ['postulaciones'],
  )
  const [sembrando, setSembrando] = useState(false)
  const [tocando, setTocando] = useState<string | null>(null)

  const requisitos = datos.datos?.requisitos ?? []
  const perfiles = datos.datos?.perfiles ?? []
  const esElPreset = datos.datos?.esElPreset ?? false

  async function sembrar() {
    setSembrando(true)
    try {
      await postulacionesApi.sembrarPreset()
      invalidar('postulaciones')
    } finally {
      setSembrando(false)
    }
  }

  async function alternarObligatorio(id: string, obligatorio: boolean) {
    setTocando(id)
    try {
      await postulacionesApi.editarRequisito(id, { obligatorio })
      invalidar('postulaciones')
    } finally {
      setTocando(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Requisitos por tipo de inquilino
        </h1>
        <p className="text-muted-foreground text-sm">
          La lista de papeles que se le pide a cada perfil. La define esta
          inmobiliaria.
        </p>
      </header>

      {datos.noHabilitado ? (
        <Card>
          <CardContent className="py-6">
            <p
              className="text-muted-foreground text-sm"
              data-testid="requisitos-no-habilitados"
            >
              Próximamente: {datos.noHabilitado}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {esElPreset ? (
            <Card data-testid="aviso-preset">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <p className="text-sm">
                  Esta lista es la <strong>sugerida</strong>, todavía no la de
                  esta inmobiliaria. Guárdala para poder editarla, o arma la tuya
                  desde cero.
                </p>
                {puedeEditar ? (
                  <Button
                    onClick={sembrar}
                    disabled={sembrando}
                    data-testid="sembrar-preset"
                  >
                    {sembrando ? 'Guardando…' : 'Usar esta lista'}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {perfiles.length > 0 ? (
            <div className="flex flex-wrap gap-2" data-testid="filtro-perfiles">
              <Button
                size="sm"
                variant={perfil === null ? 'default' : 'outline'}
                onClick={() => setPerfil(null)}
              >
                Todos
              </Button>
              {perfiles.map((p) => (
                <Button
                  key={p.perfil}
                  size="sm"
                  variant={perfil === p.perfil ? 'default' : 'outline'}
                  onClick={() => setPerfil(p.perfil)}
                  data-testid={`perfil-${p.perfil}`}
                >
                  {p.nombre}
                </Button>
              ))}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {perfil
                  ? (perfiles.find((p) => p.perfil === perfil)?.nombre ?? perfil)
                  : 'Todos los perfiles'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EstadoDeDatos
                cargando={datos.cargando}
                error={datos.errorCrudo}
                vacio={requisitos.length === 0}
                queEs="los requisitos"
                onReintentar={datos.refetch}
                conservarContenido
                esqueleto={<EsqueletoTabla filas={6} columnas={3} />}
                cuandoVacio={
                  <EmptyState
                    icon={ListChecks}
                    title="Todavía no hay requisitos"
                    description="Empieza con la lista sugerida y edítala: es la política de riesgo de esta inmobiliaria, no una plantilla."
                  />
                }
              >
                <ul className="divide-y" data-testid="lista-de-requisitos">
                  {requisitos.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3"
                      data-testid={`requisito-${r.id}`}
                    >
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-2 font-medium">
                          {r.etiqueta}
                          {r.esElEstudio ? (
                            <Lock
                              className="text-muted-foreground h-4 w-4"
                              aria-label="No se puede apagar"
                            />
                          ) : null}
                        </p>
                        {r.detalle ? (
                          <p className="text-muted-foreground text-sm">
                            {r.detalle}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground text-xs">
                          {perfil ? null : `${r.perfil} · `}
                          {CLASE[r.clase] ?? r.clase}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.obligatorio ? 'default' : 'secondary'}>
                          {r.obligatorio ? 'Obligatorio' : 'Opcional'}
                        </Badge>
                        {/* 🔴 F-08: el estudio no lleva interruptor. El porqué
                            va al lado, no en un error después del clic. */}
                        {r.esElEstudio ? (
                          <span
                            className="text-muted-foreground text-xs"
                            data-testid={`estudio-candado-${r.id}`}
                          >
                            Nadie se postula ni firma sin estudio
                          </span>
                        ) : puedeEditar && !esElPreset ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={tocando === r.id}
                            onClick={() =>
                              alternarObligatorio(r.id, !r.obligatorio)
                            }
                            data-testid={`alternar-${r.id}`}
                          >
                            {r.obligatorio ? 'Volver opcional' : 'Volver obligatorio'}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </EstadoDeDatos>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
