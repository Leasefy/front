'use client'

/**
 * Listas restrictivas — a quién NO se le puede arrendar, y por qué.
 *
 * ── 🔴 Nico, 22-09 ─────────────────────────────────────────────────────────
 *
 * «Esto de listas restrictivas ni se entiende qué es, qué debe hacer el
 * usuario, se ve horrible; organiza y haz un glow up a eso.»
 *
 * Tenía razón en las tres cosas, y la peor no era la última:
 *
 *   1. NO SE ENTIENDE QUÉ ES. «Listas restrictivas» no le dice nada a nadie.
 *      Es la obligación de SARLAFT: antes de firmarle a un cliente hay que
 *      comprobar que no esté en las listas de sanciones (la Clinton de la OFAC,
 *      la del Consejo de Seguridad de la ONU, la de la UE). Ahora la pantalla
 *      lo dice en una frase y el porqué completo vive detrás de un botón.
 *
 *   2. NO SE SABE QUÉ HACER. El vacío decía «carga los archivos oficiales de
 *      OFAC, ONU y UE» y NO HABÍA DÓNDE: `cargarLista` estaba en el cliente y
 *      no la llamaba nadie. Y el encabezado prometía «una coincidencia bloquea
 *      hasta que un administrador la revise», pero `revisarConsulta` tampoco
 *      la llamaba nadie: un bloqueado se quedaba bloqueado para siempre.
 *      Las dos puertas existen ahora (`CajonDeLaLista`, `CajonDeLaConsulta`).
 *
 *   3. SE VE HORRIBLE. Dos tarjetas apiladas con dos vacíos gigantes, sin
 *      resumen, sin buscador y sin paginación. Ahora: una frase que dice en qué
 *      estado está la agencia, y UNA tarjeta con las dos listas en pestañas,
 *      su buscador y su paginación (el molde).
 */

import { useMemo, useState } from 'react'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { MagnifyingGlass, ShieldWarning, UploadSimple, Warning } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { SinDatos } from '@/components/estado/SinDatos'
import { SectionLabel } from '@/components/ui/section-label'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { Badge, Button } from '@/components/ui'
import { captacionApi, type ConsultaDeListas } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'
import { CajonDeLaLista } from './CajonDeLaLista'
import { CajonDeLaConsulta } from './CajonDeLaConsulta'

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

/** Sin tildes y en minúsculas: nadie escribe «Ramírez» con tilde en un buscador. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function ListasClient() {
  const { canAccess } = usePermissions()
  const puedeRevisar = canAccess('clientes', 'edit')

  const bandeja = useCrm(() => captacionApi.listas(), [], ['clientes'])
  const cargadas = useCrm(() => captacionApi.listasCargadas(), [], ['clientes'])
  const [revisando, setRevisando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [cargandoLista, setCargandoLista] = useState(false)
  const [consultaAbierta, setConsultaAbierta] = useState<ConsultaDeListas | null>(null)
  const [parte, setParte] = useState<'consultas' | 'listas'>('consultas')
  const [busqueda, setBusqueda] = useState('')

  const consultas = bandeja.datos?.consultas ?? []
  const sinVerificar = bandeja.datos?.sinVerificar ?? 0
  const hayListaCargada = bandeja.datos?.hayListaCargada ?? false
  const listas = cargadas.datos?.listas ?? []

  const bloqueados = consultas.filter((c) => c.estado === 'BLOQUEADO').length
  const registros = listas.reduce((s, l) => s + l.filas, 0)

  const consultasVisibles = useMemo(() => {
    const q = normalizar(busqueda)
    if (q === '') return consultas
    return consultas.filter((c) =>
      normalizar(`${c.nombre} ${c.documento ?? ''} ${c.terceroTipo}`).includes(q),
    )
  }, [consultas, busqueda])
  const paginado = useTablePagination(consultasVisibles, { resetKey: busqueda })

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
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1.5">
        <SectionLabel>Directorio</SectionLabel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h2 text-fg">Listas restrictivas</h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* 🔴 El porqué completo detrás de un botón que abre un MODAL, no
                puesto sobre la pantalla: es la regla de la casa. */}
            <ParaEntenderMas
              etiqueta="Qué es esto y por qué es obligatorio"
              descripcion="Qué se compara, contra qué, y qué pasa cuando hay una coincidencia."
            >
              <div className="space-y-3 text-sm text-fg-muted">
                <p>
                  Antes de firmarle a alguien hay que comprobar que no esté en
                  las listas de sanciones internacionales: la{' '}
                  <strong className="text-fg">lista Clinton de la OFAC</strong>,
                  la del <strong className="text-fg">Consejo de Seguridad de la ONU</strong>{' '}
                  y la de la <strong className="text-fg">Unión Europea</strong>.
                </p>
                <p>
                  En Colombia no es opcional: el sector inmobiliario está
                  obligado a un sistema de prevención de lavado de activos
                  (SARLAFT) y a reportarle a la UIAF. Lo que un auditor viene a
                  mirar no es sólo que hayas comparado, sino{' '}
                  <strong className="text-fg">
                    qué decidiste cuando hubo una coincidencia y por qué
                  </strong>
                  .
                </p>
                <p>
                  Leasefy consulta sola a cada propietario, inquilino y codeudor
                  cuando se crea. Una coincidencia lo deja{' '}
                  <strong className="text-fg">bloqueado</strong> hasta que un
                  administrador la revise: puede{' '}
                  <strong className="text-fg">liberarlo</strong> —es un homónimo—
                  o <strong className="text-fg">confirmarlo</strong>, y en los dos
                  casos queda guardado quién decidió y por qué.
                </p>
                <p>
                  Los archivos los publican los organismos y cambian: se
                  descargan de su sitio y se cargan acá. Sin ninguna lista
                  cargada no se bloquea a nadie —crear un tercero sigue
                  funcionando— pero todos quedan «sin verificar».
                </p>
              </div>
            </ParaEntenderMas>
            <Button
              onClick={() => setCargandoLista(true)}
              hideArrow
              data-testid="abrir-cargar-lista"
            >
              <UploadSimple className="h-4 w-4" weight="bold" />
              Cargar una lista
            </Button>
          </div>
        </div>

        {/* 🔴 EL RESUMEN ES UNA FRASE (regla 1 del molde), y dice la relación
            entre lo que hay cargado y lo que eso deja sin comprobar. */}
        <p className="max-w-3xl text-body text-fg-muted" data-testid="estado-de-las-listas">
          {!hayListaCargada ? (
            <>
              No tienes ninguna lista cargada, así que{' '}
              <strong className="text-fg">no se está comprobando a nadie</strong>: los
              propietarios, inquilinos y codeudores que crees quedan «sin
              verificar». Carga los archivos de la OFAC, la ONU y la UE para
              empezar a comparar.
            </>
          ) : (
            <>
              Se compara contra{' '}
              <strong className="font-mono tabular-nums text-fg">{listas.length}</strong>{' '}
              {listas.length === 1 ? 'lista' : 'listas'} con{' '}
              <strong className="font-mono tabular-nums text-fg">
                {registros.toLocaleString('es-CO')}
              </strong>{' '}
              registros. Se consultó a{' '}
              <strong className="font-mono tabular-nums text-fg">{consultas.length}</strong>{' '}
              {consultas.length === 1 ? 'tercero' : 'terceros'}
              {bloqueados > 0 ? (
                <>
                  {' '}y hay{' '}
                  <strong className="font-mono tabular-nums text-danger">{bloqueados}</strong>{' '}
                  {bloqueados === 1 ? 'bloqueado' : 'bloqueados'} esperando que un
                  administrador los revise.
                </>
              ) : (
                <>, y ninguno quedó bloqueado.</>
              )}
            </>
          )}
        </p>
      </header>

      {/* 🔴 La bandeja, arriba y con número: es una deuda, no una lista. Cada
          fila es un tercero que está operando sin que nadie lo haya comprobado. */}
      {!bandeja.noHabilitado && sinVerificar > 0 ? (
        <section
          className="rounded-lg border border-warning/30 bg-warning-soft p-4"
          data-testid="bandeja-sin-verificar"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Warning className="mt-0.5 h-5 w-5 shrink-0 text-warning" weight="fill" />
              <div className="space-y-0.5">
                <p className="text-body font-medium text-fg">
                  {sinVerificar} tercero{sinVerificar === 1 ? '' : 's'} sin verificar
                </p>
                <p className="text-caption text-fg-muted">
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
                hideArrow
                data-testid="revisar-sin-verificar"
              >
                {revisando ? 'Revisando…' : 'Volver a revisar'}
              </Button>
            ) : null}
          </div>
          {resultado ? (
            <p className="mt-3 text-sm text-fg" data-testid="resultado-revision">
              {resultado}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* 🔴 UNA tarjeta: pestañas, buscador y tabla (regla 2 del molde). Eran
          dos tarjetas apiladas, cada una con su vacío de 400 px. */}
      <Tabs value={parte} onValueChange={(v) => setParte(v as 'consultas' | 'listas')}>
        <section className="overflow-x-clip rounded-lg border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="segmented" className="justify-start">
              <TabsTrigger value="consultas" className="whitespace-nowrap" data-testid="parte-consultas">
                A quién se consultó ({consultas.length})
              </TabsTrigger>
              <TabsTrigger value="listas" className="whitespace-nowrap" data-testid="parte-listas">
                Listas cargadas ({listas.length})
              </TabsTrigger>
            </TabsList>
            {parte === 'consultas' && consultas.length > 0 && (
              <div className="relative w-full sm:max-w-sm">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder="Nombre, documento o tipo"
                  aria-label="Buscar una consulta en listas"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  data-testid="buscar-consulta"
                />
              </div>
            )}
          </div>

          <TabsContent value="consultas" className="mt-0">
            {bandeja.noHabilitado ? (
              <p className="p-4 text-sm text-fg-muted" data-testid="consultas-no-habilitadas">
                {motivoEnCristiano(bandeja.noHabilitado)}
              </p>
            ) : (
              <EstadoDeDatos
                cargando={bandeja.cargando}
                error={bandeja.errorCrudo}
                vacio={false}
                queEs="las consultas en listas"
                onReintentar={bandeja.refetch}
                conservarContenido
                esqueleto={<EsqueletoTabla filas={5} columnas={4} />}
              >
                {paginado.pageItems.length === 0 ? (
                  <SinDatos
                    queSon="consultas en listas"
                    icono={ShieldWarning}
                    titulo={
                      consultas.length > 0
                        ? `Ninguna consulta coincide con «${busqueda.trim()}»`
                        : 'Todavía no se ha consultado a nadie'
                    }
                    descripcion={
                      consultas.length > 0
                        ? 'Buscamos por nombre, documento y tipo de tercero.'
                        : 'La consulta corre sola cuando se crea un propietario, un inquilino o un codeudor.'
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border-faint" data-testid="lista-de-consultas">
                    {paginado.pageItems.map((c) => {
                      const rotulo = ROTULO[c.estado]
                      return (
                        <li key={c.id}>
                          {/* 🔴 La fila abre el cajón con TODO y con la decisión.
                              La tabla no puede llevar dos botones por fila. */}
                          <button
                            type="button"
                            onClick={() => setConsultaAbierta(c)}
                            className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-surface-muted/60"
                            data-testid={`consulta-${c.id}`}
                          >
                            <span className="min-w-0 space-y-0.5">
                              <span className="block text-body text-fg">
                                {c.nombre}
                                <span className="ml-2 text-sm font-normal text-fg-muted">
                                  {c.terceroTipo.toLowerCase()}
                                  {c.documento ? ` · ${c.documento}` : ''}
                                </span>
                              </span>
                              <span className="block text-caption text-fg-muted">
                                {PORQUE[c.resultado]}
                              </span>
                            </span>
                            <Badge variant={rotulo.variant} className="shrink-0">
                              {rotulo.texto}
                            </Badge>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {paginado.shouldPaginate && (
                  <div className="border-t border-border px-4 py-3">
                    <TablePagination
                      total={paginado.total}
                      page={paginado.page}
                      pageSize={paginado.pageSize}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={paginado.setPage}
                      onPageSizeChange={paginado.setPageSize}
                    />
                  </div>
                )}
              </EstadoDeDatos>
            )}
          </TabsContent>

          <TabsContent value="listas" className="mt-0">
            {cargadas.noHabilitado ? (
              <p className="p-4 text-sm text-fg-muted" data-testid="listas-no-habilitadas">
                {motivoEnCristiano(cargadas.noHabilitado)}
              </p>
            ) : (
              <EstadoDeDatos
                cargando={cargadas.cargando}
                error={cargadas.errorCrudo}
                vacio={false}
                queEs="las listas cargadas"
                onReintentar={cargadas.refetch}
                conservarContenido
                esqueleto={<EsqueletoTabla filas={3} columnas={3} />}
              >
                {listas.length === 0 ? (
                  <SinDatos
                    queSon="listas restrictivas"
                    icono={ShieldWarning}
                    titulo="Todavía no hay ninguna lista cargada"
                    descripcion="Descarga el archivo del sitio de la OFAC, la ONU o la UE y cárgalo con el botón de arriba. Mientras no haya lista, los terceros se crean igual y quedan «sin verificar»."
                  />
                ) : (
                  <ul className="divide-y divide-border-faint" data-testid="lista-de-listas">
                    {listas.map((l) => (
                      <li
                        key={l.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5"
                        data-testid={`lista-${l.lista}`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-body text-fg">
                            {l.etiqueta ?? l.lista}{' '}
                            {l.agencyId === null ? (
                              <Badge variant="secondary" className="ml-1">
                                de Leasefy
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-caption text-fg-muted">
                            <span className="font-mono tabular-nums">
                              {l.filas.toLocaleString('es-CO')}
                            </span>{' '}
                            registros · de {l.vigenteDesde.slice(0, 10)}
                            {l.fuente ? ` · ${l.fuente}` : ''}
                          </p>
                        </div>
                        {l.activa ? null : <Badge variant="outline">Desactivada</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </EstadoDeDatos>
            )}
          </TabsContent>
        </section>
      </Tabs>

      <CajonDeLaLista
        abierto={cargandoLista}
        onOpenChange={setCargandoLista}
        onCargada={() => invalidar('clientes')}
      />

      <CajonDeLaConsulta
        consulta={consultaAbierta}
        onCerrar={() => setConsultaAbierta(null)}
        onRevisada={() => invalidar('clientes')}
        puedeRevisar={puedeRevisar}
        rotulo={consultaAbierta ? ROTULO[consultaAbierta.estado] : ROTULO.SIN_BLOQUEO}
        porque={consultaAbierta ? PORQUE[consultaAbierta.resultado] : ''}
      />
    </div>
  )
}
