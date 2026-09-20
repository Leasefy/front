'use client'

/**
 * ListasClient — las listas restrictivas cargadas y la BANDEJA.
 *
 * ── C-06 con la corrección de Nico (18-09-2026) ────────────────────────────
 *
 * «Bloquear sólo cuando hay lista cargada y hay coincidencia. Si la
 * inmobiliaria no tiene ninguna lista cargada, crear un tercero NO se bloquea —
 * se crea con un aviso visible de "sin verificar en listas" y queda en una
 * bandeja para revisar cuando se carguen.»
 *
 * ── Por qué la bandeja va ARRIBA y con número ──────────────────────────────
 *
 * Porque es una deuda, no una lista: cada fila es un tercero que está operando
 * sin que nadie lo haya comprobado. El número tiene que bajar a cero cuando se
 * cargue la lista, y por eso «Volver a revisar» está al lado — no escondido en
 * un menú. Una bandeja sin contador es una bandeja que nadie abre.
 */

import { useState } from 'react'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { ShieldWarning, Warning } from '@phosphor-icons/react'

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
import { captacionApi, type ConsultaDeListas } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'

/** Cómo se lee cada estado, y con qué tono. Sólo uno es rojo. */
const ROTULO: Record<
  ConsultaDeListas['estado'],
  { texto: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  BLOQUEADO: { texto: 'Bloqueado', variant: 'destructive' },
  SIN_VERIFICAR: { texto: 'Sin verificar', variant: 'outline' },
  LIBERADO: { texto: 'Liberado', variant: 'secondary' },
  CONFIRMADO: { texto: 'Confirmado en lista', variant: 'destructive' },
  SIN_BLOQUEO: { texto: 'Sin coincidencias', variant: 'secondary' },
}

const PORQUE: Record<ConsultaDeListas['resultado'], string> = {
  LIBRE: 'Se comparó contra las listas cargadas y no coincidió con ninguna.',
  COINCIDENCIA: 'Coincide con una lista: un administrador tiene que revisarlo.',
  SIN_LISTA:
    'No había ninguna lista cargada cuando se creó: nadie lo comprobó todavía.',
  ERROR: 'La consulta falló. Hay que volver a intentarla.',
}

export function ListasClient() {
  const { canAccess } = usePermissions()
  const puedeRevisar = canAccess('clientes', 'edit')

  const bandeja = useCrm(() => captacionApi.listas(), [], ['clientes'])
  const cargadas = useCrm(() => captacionApi.listasCargadas(), [], ['clientes'])
  const [revisando, setRevisando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

  const consultas = bandeja.datos?.consultas ?? []
  const sinVerificar = bandeja.datos?.sinVerificar ?? 0
  const hayListaCargada = bandeja.datos?.hayListaCargada ?? false
  const listas = cargadas.datos?.listas ?? []

  async function revisar() {
    setRevisando(true)
    setResultado(null)
    try {
      const r = await captacionApi.revisarSinVerificar()
      setResultado(
        r.revisados === 0
          ? 'No había nada que revisar.'
          : `Se revisaron ${r.revisados}: ${r.bloqueados} quedaron bloqueados y ${r.liberados} sin coincidencias.`,
      )
      invalidar('clientes')
    } finally {
      setRevisando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Listas restrictivas
        </h1>
        <p className="text-muted-foreground text-sm">
          Se consulta a cada propietario, inquilino y codeudor al crearlo. Una
          coincidencia bloquea hasta que un administrador la revise.
        </p>
      </header>

      {/* 🔴 La bandeja, arriba y con número: es una deuda, no una lista. */}
      {!bandeja.noHabilitado && sinVerificar > 0 ? (
        <Card data-testid="bandeja-sin-verificar">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3">
              <Warning className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-medium">
                  {sinVerificar} tercero{sinVerificar === 1 ? '' : 's'} sin
                  verificar
                </p>
                <p className="text-muted-foreground text-sm">
                  {hayListaCargada
                    ? 'La consulta falló cuando se crearon. Vuelve a revisarlos.'
                    : 'Se crearon antes de que hubiera ninguna lista cargada. Carga las listas y revísalos.'}
                </p>
              </div>
            </div>
            {puedeRevisar ? (
              <Button
                onClick={revisar}
                disabled={revisando}
                data-testid="revisar-sin-verificar"
              >
                {revisando ? 'Revisando…' : 'Volver a revisar'}
              </Button>
            ) : null}
          </CardContent>
          {resultado ? (
            <CardContent className="pt-0">
              <p className="text-sm" data-testid="resultado-revision">
                {resultado}
              </p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Las listas cargadas</CardTitle>
        </CardHeader>
        <CardContent>
          {cargadas.noHabilitado ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="listas-no-habilitadas"
            >
              {motivoEnCristiano(cargadas.noHabilitado)}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={cargadas.cargando}
              error={cargadas.errorCrudo}
              vacio={listas.length === 0}
              queEs="las listas cargadas"
              onReintentar={cargadas.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={3} columnas={3} />}
              cuandoVacio={
                <EmptyState
                  icon={ShieldWarning}
                  title="Todavía no hay ninguna lista cargada"
                  description="Mientras no haya lista, los terceros se crean igual y quedan «sin verificar». Carga los archivos oficiales de OFAC, ONU y UE para empezar a comparar."
                />
              }
            >
              <ul className="divide-y" data-testid="lista-de-listas">
                {listas.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                    data-testid={`lista-${l.lista}`}
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {l.etiqueta ?? l.lista}{' '}
                        {l.agencyId === null ? (
                          <Badge variant="secondary" className="ml-1">
                            de Leasefy
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {l.filas.toLocaleString('es-CO')} registros · de{' '}
                        {l.vigenteDesde.slice(0, 10)}
                        {l.fuente ? ` · ${l.fuente}` : ''}
                      </p>
                    </div>
                    {l.activa ? null : (
                      <Badge variant="outline">Desactivada</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Las consultas</CardTitle>
        </CardHeader>
        <CardContent>
          {bandeja.noHabilitado ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="consultas-no-habilitadas"
            >
              {motivoEnCristiano(bandeja.noHabilitado)}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={bandeja.cargando}
              error={bandeja.errorCrudo}
              vacio={consultas.length === 0}
              queEs="las consultas en listas"
              onReintentar={bandeja.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={5} columnas={4} />}
              cuandoVacio={
                <EmptyState
                  icon={ShieldWarning}
                  title="Todavía no se ha consultado a nadie"
                  description="La consulta corre sola cuando se crea un propietario, un inquilino o un codeudor."
                />
              }
            >
              <ul className="divide-y" data-testid="lista-de-consultas">
                {consultas.map((c) => {
                  const rotulo = ROTULO[c.estado]
                  return (
                    <li
                      key={c.id}
                      className="space-y-1 py-3"
                      data-testid={`consulta-${c.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {c.nombre}
                          <span className="text-muted-foreground ml-2 text-sm font-normal">
                            {c.terceroTipo.toLowerCase()}
                            {c.documento ? ` · ${c.documento}` : ''}
                          </span>
                        </p>
                        <Badge variant={rotulo.variant}>{rotulo.texto}</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {PORQUE[c.resultado]}
                      </p>
                      {c.coincidencias?.length ? (
                        <p className="text-muted-foreground text-sm">
                          Coincide con:{' '}
                          {c.coincidencias
                            .map(
                              (x) =>
                                `${x.nombreEnLaLista} (${x.lista}, ${x.parecido} %)`,
                            )
                            .join(' · ')}
                        </p>
                      ) : null}
                      {c.motivoDeLaRevision ? (
                        <p className="text-muted-foreground text-sm">
                          Revisión: {c.motivoDeLaRevision}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
