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

import { useEffect, useMemo, useRef, useState } from 'react'
import { Collapse, Presence, Stagger, StaggerItem } from '@leasefy/cadence'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import { errorEnCristiano, motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { MagnifyingGlass, ShieldWarning, UploadSimple, Warning } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { SinDatos } from '@/components/estado/SinDatos'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ListaParaEmpezar } from '@/components/pantalla/ListaParaEmpezar'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { Input } from '@/components/ui/input'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { useTr } from '@/lib/i18n/use-tr'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { Badge, Button } from '@/components/ui'
import { toast } from '@/components/ui/toast'
import { captacionApi, type ConsultaDeListas } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'
import { CajonDeLaLista } from './CajonDeLaLista'
import { CajonDeLaConsulta } from './CajonDeLaConsulta'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

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

/** Las pestañas de la tabla de consultas (revisora r24 #2): lo que espera una decisión va primero. */
type FiltroDeConsultas = 'todos' | 'por-revisar' | 'libres' | 'confirmados' | 'sin-verificar'
const DEL_FILTRO: Record<Exclude<FiltroDeConsultas, 'todos'>, (c: ConsultaDeListas) => boolean> = {
  'por-revisar': (c) => c.estado === 'BLOQUEADO',
  libres: (c) => c.estado === 'SIN_BLOQUEO' || c.estado === 'LIBERADO',
  confirmados: (c) => c.estado === 'CONFIRMADO',
  'sin-verificar': (c) => c.estado === 'SIN_VERIFICAR',
}

/** Las tres listas de sanciones que se comparan (las mismas del cajón de carga). */
const LISTAS_OFICIALES = [
  { codigo: 'OFAC', nombre: 'la OFAC', detalle: 'La lista Clinton del Tesoro de Estados Unidos.' },
  { codigo: 'ONU', nombre: 'la ONU', detalle: 'La del Consejo de Seguridad de las Naciones Unidas.' },
  { codigo: 'UE', nombre: 'la Unión Europea', detalle: 'La lista consolidada de sanciones de la UE.' },
] as const

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
  const tr = useTr()
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
  const [filtro, setFiltro] = useState<FiltroDeConsultas>('todos')

  const consultas = bandeja.datos?.consultas ?? []
  const sinVerificar = bandeja.datos?.sinVerificar ?? 0
  // La bandeja se pliega con su altura al quedar en cero; mientras se va,
  // sigue diciendo cuántos había.
  const sinVerificarQueSeVe = useUltimoPresente(sinVerificar > 0 ? sinVerificar : null) ?? 0
  const resultadoQueSeVe = useUltimoPresente(resultado)
  const hayListaCargada = bandeja.datos?.hayListaCargada ?? false
  const listas = cargadas.datos?.listas ?? []

  const bloqueados = consultas.filter((c) => c.estado === 'BLOQUEADO').length
  const confirmados = consultas.filter((c) => c.estado === 'CONFIRMADO').length
  const libres = consultas.filter((c) => c.estado === 'SIN_BLOQUEO' || c.estado === 'LIBERADO').length
  const registros = listas.reduce((s, l) => s + l.filas, 0)
  // Las tres listas oficiales que todavía no están cargadas (activas).
  const faltanListas = LISTAS_OFICIALES.filter((l) => !listas.some((c) => c.lista === l.codigo && c.activa))
  const [codigoParaCargar, setCodigoParaCargar] = useState<string | undefined>(undefined)
  function abrirCargar(codigo?: string) {
    setCodigoParaCargar(codigo)
    setCargandoLista(true)
  }

  /* Abre en «Por revisar» cuando hay bloqueados (una sola vez, al llegar los datos). */
  const yaSeEligio = useRef(false)
  useEffect(() => {
    if (yaSeEligio.current || bandeja.cargando || !bandeja.datos) return
    yaSeEligio.current = true
    if (bloqueados > 0) setFiltro('por-revisar')
  }, [bandeja.cargando, bandeja.datos, bloqueados])

  const consultasVisibles = useMemo(() => {
    const q = normalizar(busqueda)
    const delFiltro = filtro === 'todos' ? consultas : consultas.filter(DEL_FILTRO[filtro])
    if (q === '') return delFiltro
    return delFiltro.filter((c) =>
      normalizar(`${c.nombre} ${c.documento ?? ''} ${c.terceroTipo}`).includes(q),
    )
  }, [consultas, busqueda, filtro])
  const paginado = useTablePagination(consultasVisibles, { resetKey: `${busqueda}|${filtro}` })
  /* Revisora r24 #1: sin listas ni consultas, la tarjeta de la tabla no se pinta (eran dos pestañas en
     cero y un vacío de 300 px debajo de la lista para empezar, diciendo lo mismo). */
  const mostrarTabla =
    consultas.length > 0 ||
    listas.length > 0 ||
    bandeja.cargando ||
    Boolean(bandeja.errorCrudo) ||
    Boolean(cargadas.errorCrudo) ||
    Boolean(bandeja.noHabilitado)
  const cuantosDe = (f: Exclude<FiltroDeConsultas, 'todos'>) => consultas.filter(DEL_FILTRO[f]).length

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
    } catch (e) {
      // Era un try/finally sin catch: el rechazo quedaba sin atrapar y el botón
      // volvía a «Volver a revisar» sin decir nada. Ahora se dice qué pasó, con
      // la regla de oro (conexión sólo sin respuesta; 5xx con la referencia).
      toast.error(errorEnCristiano(e, 'No se pudo volver a revisar a los terceros.'))
    } finally {
      setRevisando(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* GLOW UP 22-10 (UX, al nivel de Deuda del mes): el encabezado común; debajo, LA RESPUESTA —sin
          listas, lo que falta para empezar a comprobar (OFAC, ONU, UE, cada una con su botón); con listas,
          una cifra: cuántos bloqueados esperan revisión (o a cuántos se consultó), con la barra de cómo
          quedó cada consulta—. Antes era una frase con cuatro números del mismo peso. */}
      <EncabezadoDePantalla
        seccion="Directorio"
        titulo="Listas restrictivas"
        descripcion={tr('Comprobar que nadie a quien le firmas está en la OFAC, la ONU o la UE.')}
        ayuda={
              <ParaEntenderMas
                etiqueta={tr('¿Por qué es obligatorio?')}
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
                    descargan de su sitio y se cargan aquí. Sin ninguna lista
                    cargada no se bloquea a nadie —crear un tercero sigue
                    funcionando— pero todos quedan «sin verificar».
                  </p>
                </div>
              </ParaEntenderMas>
        }
        accionPrincipal={
          <Button size="sm" onClick={() => abrirCargar()} hideArrow data-testid="abrir-cargar-lista">
            <UploadSimple className="h-4 w-4" weight="bold" />
            Cargar una lista
          </Button>
        }
      />

      <div className="space-y-4" data-testid="estado-de-las-listas">
        {faltanListas.length > 0 && !cargadas.cargando ? (
          <ListaParaEmpezar
            paraQue={tr('comprobar contra las listas')}
            descripcion={
              !hayListaCargada ? (
                <>
                  {tr('Mientras tanto')}{' '}
                  <strong className="font-medium text-fg">{tr('no se está comprobando a nadie')}</strong>
                  {': '}
                  {tr('los propietarios, inquilinos y codeudores que crees quedan «sin verificar».')}
                </>
              ) : undefined
            }
            requisitos={LISTAS_OFICIALES.map((l) => ({
              id: l.codigo,
              titulo: `La lista de ${l.nombre}`,
              detalle: l.detalle,
              estado: listas.some((c) => c.lista === l.codigo && c.activa) ? ('listo' as const) : ('falta' as const),
              accion: (
                <Button size="sm" variant="outline" hideArrow onClick={() => abrirCargar(l.codigo)} data-testid={`cargar-lista-${l.codigo}`}>
                  {tr('Cargarla')}
                </Button>
              ),
            }))}
          />
        ) : null}
        {!hayListaCargada ? null : (
          <CifraHeroe
            rotulo={bloqueados > 0 ? 'Bloqueados por revisar' : 'Terceros consultados'}
            cifra={(bloqueados > 0 ? bloqueados : consultas.length).toLocaleString(localeDeLasCifras())}
            contexto={
              bloqueados > 0
                ? `de ${consultas.length.toLocaleString(localeDeLasCifras())} terceros consultados: esperan que un administrador decida si es un homónimo`
                : `contra ${listas.length} ${listas.length === 1 ? 'lista' : 'listas'} con ${registros.toLocaleString(localeDeLasCifras())} registros · ninguno quedó bloqueado`
            }
            tramos={[
              { clave: 'libres', etiqueta: 'Sin coincidencias', monto: libres, tono: 'exito', cifra: libres.toLocaleString(localeDeLasCifras()), siempre: true },
              { clave: 'sin-verificar', etiqueta: 'Sin verificar', monto: sinVerificar, tono: 'aviso', cifra: sinVerificar.toLocaleString(localeDeLasCifras()) },
              { clave: 'bloqueados', etiqueta: 'Bloqueados', monto: bloqueados, tono: 'critico', cifra: bloqueados.toLocaleString(localeDeLasCifras()) },
              { clave: 'confirmados', etiqueta: 'Confirmados en lista', monto: confirmados, tono: 'critico', cifra: confirmados.toLocaleString(localeDeLasCifras()) },
            ]}
            tamano="mediana"
            data-testid="cifra-de-las-listas"
          />
        )}
      </div>

      {/* 🔴 La bandeja, arriba y con número: es una deuda, no una lista. Cada
          fila es un tercero que está operando sin que nadie lo haya comprobado. */}
      <Collapse open={!bandeja.noHabilitado && sinVerificar > 0}>
        <section
          className="rounded-lg border border-warning/30 bg-warning-soft p-4"
          data-testid="bandeja-sin-verificar"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Warning className="mt-0.5 h-5 w-5 shrink-0 text-warning" weight="fill" />
              <div className="space-y-0.5">
                <p className="text-body font-medium text-fg">
                  {sinVerificarQueSeVe} tercero{sinVerificarQueSeVe === 1 ? '' : 's'} sin verificar
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
                size="sm"
                variant="outline"
                onClick={() => void revisar()}
                disabled={revisando}
                hideArrow
                data-testid="revisar-sin-verificar"
              >
                {revisando ? 'Revisando…' : 'Volver a revisar'}
              </Button>
            ) : null}
          </div>
          <Presence as="p" show={Boolean(resultado)} className="mt-3 text-sm text-fg" data-testid="resultado-revision">
            {resultadoQueSeVe}
          </Presence>
        </section>
      </Collapse>

      {/* 🔴 UNA tarjeta: pestañas, buscador y tabla (regla 2 del molde). Eran
          dos tarjetas apiladas, cada una con su vacío de 400 px. */}
      {mostrarTabla ? (
        <section className="overflow-x-clip rounded-lg border border-border bg-surface">
          {/* GLOW UP 22-10 (revisora r24 #2 y #5): UNA fila de pestañas —los estados de las consultas con su
              conteo en mono y, al final, las listas cargadas—; abre en «Por revisar» si hay bloqueados. Antes,
              un segmentado «A quién se consultó (0) · Listas cargadas (0)» y los bloqueados donde cayeran. */}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between empty:hidden">
            <PestanasDeEstado<FiltroDeConsultas | 'listas'>
              etiqueta={tr('Filtrar las consultas')}
              valor={parte === 'listas' ? 'listas' : filtro}
              onCambio={(v) => {
                if (v === 'listas') {
                  setParte('listas')
                  return
                }
                setParte('consultas')
                setFiltro(v)
              }}
              pestanas={[
                { valor: 'todos', etiqueta: tr('Todos'), cuantos: consultas.length, fija: true, testid: 'parte-consultas' },
                { valor: 'por-revisar', etiqueta: tr('Por revisar'), cuantos: cuantosDe('por-revisar'), tono: 'aviso', testid: 'filtro-por-revisar' },
                { valor: 'libres', etiqueta: tr('Sin coincidencias'), cuantos: cuantosDe('libres'), testid: 'filtro-libres' },
                { valor: 'confirmados', etiqueta: tr('Confirmados'), cuantos: cuantosDe('confirmados'), testid: 'filtro-confirmados' },
                { valor: 'sin-verificar', etiqueta: tr('Sin verificar'), cuantos: cuantosDe('sin-verificar'), testid: 'filtro-sin-verificar' },
                { valor: 'listas', etiqueta: tr('Listas cargadas'), cuantos: listas.length > 0 ? listas.length : null, fija: true, testid: 'parte-listas' },
              ]}
            />
            {/* El buscador es de las consultas: aparece y se va con la pestaña. */}
            <Presence
              show={parte === 'consultas' && consultas.length > 0}
              direction="none"
              className="relative w-full sm:max-w-xs"
            >
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder={tr('Nombre, documento o tipo')}
                  aria-label={tr('Buscar una consulta en listas')}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  data-testid="buscar-consulta"
                />
            </Presence>
          </div>

          {parte === 'consultas' ? (
            <>
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
                      consultas.length === 0
                        ? tr('Todavía no se ha consultado a nadie')
                        : busqueda.trim()
                          ? `${tr('Ninguna consulta coincide con')} «${busqueda.trim()}»`
                          : tr('Ninguna consulta en este estado')
                    }
                    descripcion={
                      consultas.length === 0
                        ? tr('Cuando crees un propietario, un inquilino o un codeudor, aparece aquí.')
                        : busqueda.trim()
                          ? tr('Buscamos por nombre, documento y tipo de tercero.')
                          : tr('Elige «Todos» para ver a todos los terceros consultados.')
                    }
                  />
                ) : (
                  <Stagger as="ul" layout={false} className="divide-y divide-border-faint" data-testid="lista-de-consultas">
                    {paginado.pageItems.map((c) => {
                      const rotulo = ROTULO[c.estado]
                      return (
                        <StaggerItem as="li" key={c.id}>
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
                        </StaggerItem>
                      )
                    })}
                  </Stagger>
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
            </>
          ) : (
            <>
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
                  <Stagger as="ul" className="divide-y divide-border-faint" data-testid="lista-de-listas">
                    {listas.map((l) => (
                      <StaggerItem as="li"
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
                              {l.filas.toLocaleString(localeDeLasCifras())}
                            </span>{' '}
                            registros · de {l.vigenteDesde.slice(0, 10)}
                            {l.fuente ? ` · ${l.fuente}` : ''}
                          </p>
                        </div>
                        {l.activa ? null : <Badge variant="outline">Desactivada</Badge>}
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </EstadoDeDatos>
            )}
            </>
          )}
        </section>
      ) : null}

      <CajonDeLaLista
        abierto={cargandoLista}
        codigoInicial={codigoParaCargar}
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
