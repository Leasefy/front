'use client';

/**
 * 🔴 «Incrementos» — todos los incrementos de un mes, renovados o no
 * (Portofino, departamento financiero, 22-10-2026).
 *
 * «El módulo de renovaciones le sirve mucho a operaciones porque salen todos
 * los que están por terminar, pero debería tener uno solo de incrementos en
 * donde por fecha se filtre cuáles tienen incremento renovado o no renovado,
 * porque hay contratos que ya están renovados pero faltaría esa notificación.»
 * Su ejemplo, el contrato 515 (aniversario el 1 de noviembre, contrato ya
 * renovado hasta abril), no salía en Renovaciones (sólo lista lo que vence) ni
 * en la cola de cartas.
 *
 * Esta pantalla reemplaza la cola de cartas (`/contratos/renovaciones/cartas`
 * redirige acá con su `?estado=`): se elige el MES y salen todos los contratos
 * con aniversario en él, con el canon que sube, si el contrato está por renovar
 * o ya renovado, y en qué va la carta. La carta se ve y se envía en su cajón,
 * como siempre. Los que no suben (falta el IPC, un local sin incremento) salen
 * también, diciendo por qué: nada se esconde en silencio.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TrendUp } from '@phosphor-icons/react';
import { CrossFade, Presence, SearchInput, SegmentedControl, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';
import { CartaDelIncrementoCajon, type CartaQueSeAbre } from '@/components/contratos/CartaDelIncrementoCajon';
import { PESOS, fechaCorta, tipoDeLaCarta } from '@/components/contratos/BandejaDeCartasDelIncremento';
import { cicloDeVidaApi, type BandejaDeCartas, type CartaEnLaBandeja } from '@/lib/api/ciclo-de-vida.service';
import {
  GRUPOS_DE_LA_CARTA,
  LO_DE_AHORA,
  SITUACIONES_DEL_CONTRATO,
  coincideConLaBusqueda,
  grupoDeLaCarta,
  grupoDeLaUrl,
  mesDeLaUrl,
  mesesParaElegir,
  nombreDelMes,
  periodoPedido,
  porcentajeDelIncremento,
  situacionDelContrato,
  type GrupoDeLaCarta,
  type SituacionDelContrato,
} from '@/lib/contratos/incrementos-del-periodo';

const RUTA_DEL_CONTRATO = '/panel/inmobiliaria/contratos';

/** «+5,1 %». */
function textoDelPorcentaje(c: CartaEnLaBandeja): string | null {
  const pct = porcentajeDelIncremento(c);
  if (pct === null) return null;
  // Espacio que no se parte: «+5,1» y «%» nunca quedan en renglones distintos.
  return `+${pct.toLocaleString(localeDeLasCifras(), { maximumFractionDigits: 2 })}\u00a0%`;
}

function dias(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? 'día' : 'días'}`;
}

/** La insignia de la carta: el estado en una palabra y su detalle debajo. */
function EstadoDeLaCarta({ carta }: { carta: CartaEnLaBandeja }) {
  const { estado } = carta;
  const [tono, rotulo, detalle] =
    estado === 'ENVIADA'
      ? (['success', 'Notificada', carta.enviadaAt ? `El ${fechaCorta(carta.enviadaAt)}` : null] as const)
      : estado === 'VENCIDA_SIN_CONSTANCIA'
        ? (['critical', 'Sin constancia', `Pasó hace ${dias(-carta.diasParaElAniversario)}`] as const)
        : estado === 'SIN_INCREMENTO'
          ? (['neutral', 'No sube', null] as const)
          : carta.diasParaElAniversario <= 0
            ? (['warning', 'Por notificar', 'Es hoy'] as const)
            : (['warning', 'Por notificar', `Faltan ${dias(carta.diasParaElAniversario)}`] as const);
  const enviada = estado === 'ENVIADA';
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge tone={tono} data-testid={`estado-${carta.contractId}`}>
        {rotulo}
      </StatusBadge>
      {detalle && <span className="text-caption text-fg-muted">{detalle}</span>}
      {estado !== 'SIN_INCREMENTO' && (
        // Juan (19-10): «no me salió qué tipo de carta enviamos».
        <span className="max-w-[240px] text-caption text-fg-muted" data-testid={`tipo-de-carta-${carta.contractId}`}>
          {tipoDeLaCarta(carta)}
        </span>
      )}
      {carta.ultimoIntento && !enviada && (
        <span className="text-caption text-fg-muted">
          Último intento: <span className="font-mono">{fechaCorta(carta.ultimoIntento)}</span>
        </span>
      )}
      {!carta.correoDelInquilino && !enviada && estado !== 'SIN_INCREMENTO' && (
        <span className="max-w-[240px] text-caption text-fg-muted" data-testid={`sin-correo-${carta.contractId}`}>
          Sin correo del inquilino: entrégala por otro medio y registra la constancia en el contrato.
        </span>
      )}
    </div>
  );
}

/** «Ya renovado · vence el 30 abr 2027» o «Por renovar · vence el 4 nov 2026». */
function SituacionDelContratoCelda({ carta }: { carta: CartaEnLaBandeja }) {
  if (!carta.finDelContrato) return <span className="text-fg-muted">—</span>;
  const porRenovar = situacionDelContrato(carta) === 'por-renovar';
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={cn('text-body-sm', porRenovar ? 'text-warning-700 dark:text-warning-100' : 'text-fg')}>
        {porRenovar ? 'Por renovar' : 'Ya renovado'}
      </span>
      <span className="text-caption text-fg-muted">
        Vence el <span className="font-mono tabular-nums">{fechaCorta(carta.finDelContrato)}</span>
      </span>
    </div>
  );
}

function CanonCelda({ carta }: { carta: CartaEnLaBandeja }) {
  if (carta.estado === 'SIN_INCREMENTO') {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-mono tabular-nums text-fg">{PESOS.format(carta.canonAnteriorCop)}</span>
        <span className="max-w-[260px] text-caption text-fg-muted">{carta.motivo ?? 'Este aniversario no sube el canon.'}</span>
      </div>
    );
  }
  const pct = textoDelPorcentaje(carta);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono tabular-nums text-fg-muted line-through decoration-fg-subtle/60">
        {PESOS.format(carta.canonAnteriorCop)}
      </span>
      <span className="font-mono tabular-nums text-fg">
        {PESOS.format(carta.canonNuevoCop)}
        {pct && <span className="ml-1.5 whitespace-nowrap text-caption text-success">{pct}</span>}
      </span>
    </div>
  );
}

function AccionDeLaCarta({
  carta,
  editable,
  onAbrir,
}: {
  carta: CartaEnLaBandeja;
  editable: boolean;
  onAbrir: (c: CartaEnLaBandeja) => void;
}) {
  if (carta.estado === 'SIN_INCREMENTO') {
    return (
      <Button asChild size="sm" variant="ghost">
        <Link href={`${RUTA_DEL_CONTRATO}/${carta.contractId}`}>Ver el contrato</Link>
      </Button>
    );
  }
  const enviada = carta.estado === 'ENVIADA';
  // Una sola chispa por pantalla: la carta de cada fila se abre en arena; la que
  // falta por notificar la marca su estado, no un botón azul por fila.
  return (
    <Button
      size="sm"
      variant={enviada || !editable ? 'ghost' : 'outline'}
      onClick={() => onAbrir(carta)}
      data-testid={`abrir-carta-${carta.contractId}`}
    >
      {enviada ? 'Ver la carta enviada' : editable ? 'Ver y enviar la carta' : 'Ver la carta'}
    </Button>
  );
}

function NombreDelContrato({ carta }: { carta: CartaEnLaBandeja }) {
  return (
    <div className="min-w-0">
      <Link
        href={`${RUTA_DEL_CONTRATO}/${carta.contractId}`}
        className="text-fg underline-offset-2 hover:underline"
      >
        <span className="font-mono">#{carta.externalId ?? carta.code}</span> · {carta.inquilino ?? 'Sin inquilino'}
      </Link>
      <p className="truncate text-caption text-fg-muted">
        {carta.documentoDelInquilino ? `C.C. ${carta.documentoDelInquilino} · ` : ''}
        {carta.inmueble ?? 'Sin dirección'}
      </p>
    </div>
  );
}

export function IncrementosDelPeriodo() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('contratos', 'edit');
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const hoy = useMemo(() => new Date(), []);

  const mes = mesDeLaUrl(params?.get('mes'), hoy);
  const meses = useMemo(() => mesesParaElegir(hoy), [hoy]);
  const [grupo, setGrupo] = useState<GrupoDeLaCarta | 'todas'>(() => grupoDeLaUrl(params?.get('estado')));
  const [situacion, setSituacion] = useState<SituacionDelContrato | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState<BandejaDeCartas | null>(null);
  const [cargadoPara, setCargadoPara] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cartaAbierta, setCartaAbierta] = useState<CartaQueSeAbre | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await cicloDeVidaApi.bandejaDeCartas(periodoPedido(mes));
      setDatos(r);
      setCargadoPara(mes);
    } catch (e) {
      setError(e);
    }
  }, [mes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** El mes vive en la URL: se comparte y sobrevive a recargar. */
  const elegirMes = (valor: string) => {
    const siguiente = new URLSearchParams(params?.toString() ?? '');
    siguiente.set('mes', valor);
    router.replace(`${ruta}?${siguiente.toString()}`, { scroll: false });
  };

  /*
   * 🔴 Un back anterior al 22-10 ignora el período y devuelve la bandeja de
   * siempre (sin `periodo`): se dice, en vez de mostrar lo de otros meses como
   * si fuera el elegido.
   */
  const backSinPeriodo = mes !== LO_DE_AHORA && cargadoPara === mes && datos !== null && !datos.periodo;
  const todas = useMemo(() => (cargadoPara === mes && datos ? datos.cartas : []), [datos, cargadoPara, mes]);

  const conteos = useMemo(() => {
    const n: Record<string, number> = { todas: todas.length };
    for (const g of GRUPOS_DE_LA_CARTA) n[g.clave] = 0;
    for (const c of todas) n[grupoDeLaCarta(c.estado)] += 1;
    return n;
  }, [todas]);

  const visibles = useMemo(
    () =>
      todas.filter(
        (c) =>
          (grupo === 'todas' || grupoDeLaCarta(c.estado) === grupo) &&
          (situacion === 'todos' || situacionDelContrato(c) === situacion) &&
          coincideConLaBusqueda(c, busqueda),
      ),
    [todas, grupo, situacion, busqueda],
  );

  const hayFiltros = grupo !== 'todas' || situacion !== 'todos' || busqueda.trim() !== '';
  const limpiar = () => {
    setGrupo('todas');
    setSituacion('todos');
    setBusqueda('');
  };

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } = useTablePagination(visibles, {
    resetKey: `${mes}|${grupo}|${situacion}|${busqueda}`,
  });

  const abrir = (c: CartaEnLaBandeja) =>
    setCartaAbierta({
      contractId: c.contractId,
      desde: c.desde,
      titulo: `#${c.externalId ?? c.code} · ${c.inquilino ?? 'Sin inquilino'}`,
    });

  const cargando = !error && cargadoPara !== mes;
  const diasAntes = datos?.diasAntes ?? 30;

  /*
   * Glow up (23-10): lo que falta notificar va primero —las que ya pasaron sin
   * constancia, luego las por notificar—; lo hecho y lo que no sube, al final.
   * Mientras carga, sin números (nunca un 0 inventado).
   */
  const ORDEN: GrupoDeLaCarta[] = ['sin-constancia', 'por-notificar', 'notificadas', 'no-suben'];
  const pestanas = [
    { valor: 'todas' as const, etiqueta: 'Todas', cuantos: cargando ? null : conteos.todas, fija: true },
    ...ORDEN.map((clave) => ({
      valor: clave,
      etiqueta: GRUPOS_DE_LA_CARTA.find((g) => g.clave === clave)?.rotulo ?? clave,
      cuantos: cargando ? null : (conteos[clave] ?? 0),
      tono: clave === 'sin-constancia' ? ('aviso' as const) : undefined,
      testid: `grupo-${clave}`,
    })),
  ];

  /** El mes que sigue al elegido, para la salida del vacío («Ver noviembre de 2026»). */
  const posicionDelMes = meses.findIndex((m) => m.valor === mes);
  const mesSiguiente = posicionDelMes >= 0 ? (meses[posicionDelMes + 1] ?? null) : null;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Operación"
        titulo="Incrementos"
        descripcion="Los contratos que suben de canon en el mes que elijas, renovados o no, y en qué va la carta de cada uno."
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: incrementos" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                Elige el mes y salen todos los contratos con aniversario en él, estén por renovar o ya renovados. El
                canon sube en la fecha; la carta es la constancia de que se le avisó al inquilino.
              </p>
              <p>
                Abre la carta de cada contrato para verla tal como sale y enviarla. Los que no suben (falta el IPC, un
                local sin incremento) salen también, con el porqué.
              </p>
            </div>
          </ParaEntenderMas>
        }
      />

      {error ? (
        <FalloDeCarga error={error} queEs="los incrementos" onReintentar={cargar} />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          {datos && !datos.disponible && (
            <p className="border-b border-border bg-warning-soft px-4 py-3 text-caption text-fg md:px-5">
              Falta una actualización de la base: se ven los incrementos, pero todavía no se pueden enviar las cartas.
            </p>
          )}
          {backSinPeriodo && (
            <p className="border-b border-border bg-warning-soft px-4 py-3 text-caption text-fg md:px-5" data-testid="sin-periodo">
              Leasefy todavía no filtra por mes: se ven las cartas de los próximos {diasAntes} días.
            </p>
          )}

          {/* El control de la tarea a la vista: el mes (de él sale todo) y el buscador. */}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <label htmlFor="mes-del-incremento" className="shrink-0 text-body-sm text-fg-muted">
                Mes del incremento
              </label>
              <Select value={mes} onValueChange={elegirMes}>
                <SelectTrigger id="mes-del-incremento" className="w-full sm:w-[240px]" data-testid="mes-del-incremento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LO_DE_AHORA}>Próximos {diasAntes} días y vencidas</SelectItem>
                  {meses.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>
                      {m.rotulo.charAt(0).toUpperCase() + m.rotulo.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* El ancho va en una caja: la clase de SearchInput le cae al campo, no a su envoltorio. */}
            <div className="w-full md:w-80">
              <SearchInput
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onClear={() => setBusqueda('')}
                placeholder="Contrato, inquilino, cédula o inmueble"
                aria-label="Buscar incrementos"
                inputSize="md"
                data-testid="buscar-incrementos"
              />
            </div>
          </div>

          {/* En qué va la carta (pestañas con su conteo) y, aparte, si el contrato está renovado. */}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
            <PestanasDeEstado<GrupoDeLaCarta | 'todas'>
              etiqueta="Filtrar por el estado de la carta"
              pestanas={pestanas}
              valor={grupo}
              onCambio={setGrupo}
            />
            <SegmentedControl<SituacionDelContrato | 'todos'>
              aria-label="Filtrar por la vigencia del contrato"
              value={situacion}
              onChange={setSituacion}
              className="shrink-0 self-start md:self-auto"
              options={[
                { value: 'todos', label: 'Todos', ariaLabel: 'Todos los contratos' },
                ...SITUACIONES_DEL_CONTRATO.map((s) => ({
                  value: s.clave,
                  ariaLabel: s.rotulo,
                  label: <span data-testid={`situacion-${s.clave}`}>{s.rotulo}</span>,
                })),
              ]}
            />
          </div>

          <Presence
            show={hayFiltros && !cargando}
            initial={false}
            distance="xs"
            as="p"
            className="border-b border-border px-4 py-2 text-caption text-fg-muted md:px-5"
            data-testid="alcance-de-incrementos"
          >
            <span className="font-mono tabular-nums">
              {visibles.length} de {todas.length}
            </span>{' '}
            en {nombreDelMes(mes)}.{' '}
            <button
              type="button"
              onClick={limpiar}
              className="text-primary underline-offset-4 hover:underline"
              data-testid="limpiar-filtros-incrementos"
            >
              Quitar los filtros
            </button>
          </Presence>

          <CrossFade
            swapKey={cargando ? 'cargando' : visibles.length === 0 ? 'vacio' : `lista-${mes}`}
            mode="popLayout"
            direction="none"
          >
            {cargando ? (
              <div className="p-4 md:p-5" aria-busy="true">
                <EsqueletoTabla columnas={5} filas={6} />
              </div>
            ) : visibles.length === 0 ? (
              <SinDatos
                hayFiltros={hayFiltros}
                queSon="incrementos"
                icono={TrendUp}
                ilustracion="monedas"
                titulo={
                  mes === LO_DE_AHORA
                    ? 'No hay ninguna carta pendiente'
                    : `Ningún contrato tiene incremento en ${nombreDelMes(mes)}`
                }
                descripcion={
                  mes === LO_DE_AHORA
                    ? `Cada carta aparece sola ${diasAntes} días antes del aniversario de su contrato.`
                    : 'Los contratos aparecen aquí en el mes de su aniversario. Elige otro mes para ver sus incrementos.'
                }
                accion={
                  mesSiguiente ? (
                    <Button variant="outline" onClick={() => elegirMes(mesSiguiente.valor)}>
                      Ver {mesSiguiente.rotulo}
                    </Button>
                  ) : undefined
                }
                onLimpiarFiltros={hayFiltros ? limpiar : undefined}
              />
            ) : (
              <>
                {/* Escritorio y tableta: la tabla. */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-5">Contrato</TableHead>
                        <TableHead className="whitespace-nowrap">Sube el</TableHead>
                        <TableHead className="whitespace-nowrap">Canon</TableHead>
                        <TableHead className="whitespace-nowrap">Vigencia</TableHead>
                        <TableHead className="whitespace-nowrap">Carta</TableHead>
                        <TableHead className="pr-5 text-right">
                          <span className="sr-only">Acción</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((c) => (
                        <TableRow key={`${c.contractId}-${c.desde}`} data-testid={`incremento-${c.contractId}`}>
                          <TableCell className="max-w-[320px] px-5 py-4">
                            <NombreDelContrato carta={c} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-4 font-mono tabular-nums">{fechaCorta(c.desde)}</TableCell>
                          <TableCell className="py-4">
                            <CanonCelda carta={c} />
                          </TableCell>
                          <TableCell className="py-4">
                            <SituacionDelContratoCelda carta={c} />
                          </TableCell>
                          <TableCell className="py-4">
                            <EstadoDeLaCarta carta={c} />
                          </TableCell>
                          <TableCell className="py-4 pr-5 text-right">
                            <AccionDeLaCarta carta={c} editable={puedeEditar && !!datos?.disponible} onAbrir={abrir} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Celular: una tarjeta por contrato. */}
                <ul className="divide-y divide-border md:hidden" data-testid="tarjetas-de-incrementos">
                  {pageItems.map((c) => (
                    <li key={`${c.contractId}-${c.desde}`} className="space-y-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <NombreDelContrato carta={c} />
                        <EstadoDeLaCarta carta={c} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-caption text-fg-muted">Sube el</p>
                          <p className="font-mono text-body-sm tabular-nums text-fg">{fechaCorta(c.desde)}</p>
                        </div>
                        <SituacionDelContratoCelda carta={c} />
                      </div>
                      <CanonCelda carta={c} />
                      <div className="flex">
                        <AccionDeLaCarta carta={c} editable={puedeEditar && !!datos?.disponible} onAbrir={abrir} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CrossFade>

          {shouldPaginate && !cargando && (
            <div className="border-t border-border px-4 py-3 md:px-5">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </section>
      )}

      <CartaDelIncrementoCajon
        carta={cartaAbierta}
        onCerrar={() => setCartaAbierta(null)}
        puedeEnviar={puedeEditar}
        onEnviada={cargar}
      />
    </div>
  );
}
