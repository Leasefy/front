'use client';

/**
 * «Giros a propietarios» en UNA pantalla (Nico, 31-10-2026: «no se sabe qué es
 * primero, segundo, se pierden en las navegaciones, muy mala»; «quiero un botón
 * grande de Girar»; «sí o sí lo autoriza un administrador»).
 *
 * Antes eran cuatro rutas con un riel arriba (Liquidar → Revisar y aprobar →
 * Archivo del banco → Marcar pagado), y el paso 2 pedía aprobar los giros «uno
 * por uno antes de armar el lote»: el lote sólo toma las liquidaciones SIN
 * aprobar, así que aprobarlas las mandaba a giro suelto y salían del lote («solo
 * aprobé 488 de 506»). Ahora el trabajo del mes son TRES pasos, aquí mismo:
 *
 *   1 Liquidar el mes            → lo que le toca a cada propietario.
 *   2 Girar                      → el botón grande: desde qué cuenta, y lo
 *                                  autoriza un administrador con el código de
 *                                  su aplicación; sale el archivo del banco.
 *   3 Confirmar que el banco pagó → «Ya el banco pagó».
 *
 * Las pantallas de antes siguen (hay enlaces a ellas en toda la plataforma) y
 * se abren desde «Ver el detalle» para lo que no es del día a día.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowsClockwise, Bank, CheckCircle, PaperPlaneTilt, ShieldCheck } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { PasosDeLaTarea, type PasoDeLaTarea } from '@/components/pantalla/PasosDeLaTarea';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { CampoDelCodigoDeLaApp } from '@/components/seguridad/CodigoDeLaApp';
import { ElegirBancoDeOrigen, type EleccionDelBanco } from '@/components/dispersiones/lotes/ElegirBancoDeOrigen';
import { ElegirAQuienPagarle, type EleccionDelLote } from '@/components/dispersiones/lotes/ElegirAQuienPagarle';
import { ArchivoDialog, MarcarPagadoDialog } from '@/components/dispersiones/lotes/DetalleDelLote';
import { ComoSaleUnLote } from '@/components/dispersiones/lotes/ComoSaleUnLote';
import { guardarArchivo } from '@/components/dispersiones/lotes/estado-del-lote';
import { useNombresDelEquipo } from '@/components/dispersiones/lotes/use-nombres-del-equipo';
import { MesDeLosGiros } from './MesDeLosGiros';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useRefrescoAutomatico } from '@/lib/hooks/use-refresco-automatico';
import { useLotesDeDispersion } from '@/lib/hooks/use-lotes-de-dispersion';
import { dispersionesApi } from '@/lib/api/inmobiliaria.service';
import {
  lotesDeDispersionApi,
  RECURSO_DE_LOTES,
  type CandidatosDeDispersion,
} from '@/lib/api/lotes-de-dispersion.service';
import type { LoteResumen, TipoDeExclusion, VistaDelLote } from '@/lib/api/lotes-de-dispersion.types';
import type { LiquidacionDelMesCompleto } from '@/lib/liquidaciones/liquidacion-del-mes';
import { lanzarEnElCentro } from '@/lib/procesos/en-el-centro';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { nombreDelMes } from '@/lib/utils/mes';
import { esMesDeLosGiros } from '@/lib/giros/meses-de-los-giros';
import { mesActual } from '@/lib/recaudo/meses';
import { useTr } from '@/lib/i18n/use-tr';

const RAIZ = '/panel/inmobiliaria/pagos';
const EN_CURSO: readonly LoteResumen['estado'][] = ['BORRADOR', 'ESPERANDO_APROBACION', 'APROBADO'];
const EN_EL_BANCO: readonly LoteResumen['estado'][] = ['ARCHIVO_GENERADO', 'EN_WOMPI'];

/** Por qué una liquidación no va en el giro, en palabras de la persona. */
const POR_QUE_NO_VA: Record<TipoDeExclusion, [string, string]> = {
  SIN_CUENTA: ['sin cuenta bancaria', 'sin cuenta bancaria'],
  DATO_BANCARIO: ['con la cuenta incompleta', 'con la cuenta incompleta'],
  RETENIDA_GIRO_DEVUELTO: ['con un giro devuelto por el banco', 'con un giro devuelto por el banco'],
  RETENIDA_CAMBIO_DE_CUENTA: ['con un cambio de cuenta por aprobar', 'con un cambio de cuenta por aprobar'],
  SE_COMPENSA: ['se cierra en $ 0 (las deducciones cubren el mes)', 'se cierran en $ 0 (las deducciones cubren el mes)'],
};

interface DatosDelMes {
  liquidacion: LiquidacionDelMesCompleto | null;
  candidatos: CandidatosDeDispersion | null;
  error: unknown;
}

function useDatosDelMes(mes: string) {
  const [datos, setDatos] = useState<DatosDelMes | null>(null);
  const leer = useCallback(async () => {
    const [liquidacion, candidatos] = await Promise.allSettled([
      dispersionesApi.liquidacionDelMes(mes),
      lotesDeDispersionApi.candidatos({ month: mes }),
    ]);
    setDatos({
      liquidacion: liquidacion.status === 'fulfilled' ? liquidacion.value : null,
      candidatos: candidatos.status === 'fulfilled' ? candidatos.value : null,
      error: liquidacion.status === 'rejected' ? liquidacion.reason : null,
    });
  }, [mes]);
  useEffect(() => {
    setDatos(null);
    void leer();
  }, [leer]);
  useRefrescoAutomatico(['dispersiones', RECURSO_DE_LOTES], leer);
  return { datos, leer };
}

function cuantos(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? uno : varios}`;
}

function conMayuscula(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function GirosDelMes() {
  const tr = useTr();
  const router = useRouter();
  const { isAdmin, canAccess } = usePermissions();
  const puedeEditar = canAccess('dispersiones', 'edit');
  const puedeArmar = canAccess('dispersiones', 'create');
  const { yo } = useNombresDelEquipo();

  // El mes viaja en la dirección (`?mes=`): recargar o volver de otra pantalla no lo pierde.
  const [mes, setMes] = useState(mesActual);
  useEffect(() => {
    const pedido = new URLSearchParams(window.location.search).get('mes');
    if (esMesDeLosGiros(pedido)) setMes(pedido);
  }, []);
  const cambiarMes = (nuevo: string) => {
    setMes(nuevo);
    try {
      window.history.replaceState(window.history.state, '', `?mes=${nuevo}`);
    } catch {
      /* la dirección es una cortesía */
    }
  };

  const { datos, leer } = useDatosDelMes(mes);
  const { lotes, refetch: releerLotes } = useLotesDeDispersion({ month: mes });
  const releer = useCallback(async () => {
    await Promise.all([leer(), releerLotes()]);
  }, [leer, releerLotes]);

  const delMes = nombreDelMes(mes);

  // ── Lo que hay en el mes ──────────────────────────────────────────────────
  const filas = datos?.liquidacion?.propietarios ?? null;
  const porGenerar = useMemo(
    () => (filas ?? []).filter((f) => f.estado === 'POR_GENERAR' || f.estado === 'GENERADA_EN_PARTE'),
    [filas],
  );
  const porGenerarCop = porGenerar.reduce((s, f) => s + Math.max(0, f.pendiente?.aGirarCop ?? 0), 0);
  const giros = useMemo(() => (filas ?? []).flatMap((f) => f.dispersiones), [filas]);
  const sueltos = giros.filter((d) => d.status === 'PROCESSING');
  const sueltosCop = sueltos.reduce((s, d) => s + Math.max(0, d.aGirarCop), 0);
  const borradores = giros.filter((d) => d.status === 'DISP_PENDING');
  const candidatos = datos?.candidatos?.candidatos ?? [];
  const listos = candidatos.filter((c) => c.motivoDeExclusion === null);
  const listosCop = listos.reduce((s, c) => s + Math.max(0, c.netoCop), 0);
  const noVan = useMemo(() => {
    const cuenta = new Map<TipoDeExclusion, number>();
    for (const c of candidatos) {
      if (c.motivoDeExclusion === null) continue;
      const tipo: TipoDeExclusion = c.seCompensa ? 'SE_COMPENSA' : (c.tipoDeExclusion ?? 'DATO_BANCARIO');
      cuenta.set(tipo, (cuenta.get(tipo) ?? 0) + 1);
    }
    return [...cuenta.entries()];
  }, [candidatos]);
  const enCurso = lotes.filter((l) => EN_CURSO.includes(l.estado));
  const enElBanco = lotes.filter((l) => EN_EL_BANCO.includes(l.estado));
  const pagados = lotes.filter((l) => l.estado === 'PAGADO');
  const faltaCop =
    filas === null
      ? null
      : porGenerarCop + giros.filter((d) => d.status !== 'DISP_COMPLETED').reduce((s, d) => s + Math.max(0, d.aGirarCop), 0);
  const faltanPropietarios =
    filas === null
      ? 0
      : filas.filter(
          (f) =>
            f.estado === 'POR_GENERAR' || f.estado === 'GENERADA_EN_PARTE' || f.dispersiones.some((d) => d.status !== 'DISP_COMPLETED'),
        ).length;

  // ── Diálogos ──────────────────────────────────────────────────────────────
  const [girando, setGirando] = useState(false);
  const [autorizando, setAutorizando] = useState<LoteResumen | null>(null);
  const [vistaDelLote, setVistaDelLote] = useState<{ vista: VistaDelLote; accion: 'archivo' | 'pagado' } | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const abrirLote = useCallback(
    async (id: string, accion: 'archivo' | 'pagado') => {
      try {
        setVistaDelLote({ vista: await lotesDeDispersionApi.ver(id), accion });
      } catch (e) {
        toast.error(tr('No se pudo abrir el lote'), {
          description: mensajeParaLaPersona(e, { accion: tr('abrir el lote') }),
        });
      }
    },
    [tr],
  );

  const pasarSueltosAlLote = async () => {
    try {
      await lanzarEnElCentro({
        titulo: tr('Pasar {n} al lote', { n: cuantos(sueltos.length, 'giro suelto', 'giros sueltos') }),
        tipoDeProceso: 'APROBACION_MASIVA',
        pedir: () => dispersionesApi.devolverAlLoteEnElCentro(sueltos.map((d) => d.id)),
        recursos: ['dispersiones', RECURSO_DE_LOTES],
        alTerminar: () => void releer(),
      });
    } catch (e) {
      toast.error(tr('No se pudieron pasar al lote'), {
        description: mensajeParaLaPersona(e, { accion: tr('pasar los giros al lote') }),
      });
    }
  };

  const cancelarBorradores = async () => {
    try {
      await lanzarEnElCentro({
        titulo: tr('Cancelar {n}', { n: cuantos(borradores.length, 'liquidación', 'liquidaciones') }),
        tipoDeProceso: 'APROBACION_MASIVA',
        pedir: () => dispersionesApi.descartarEnElCentro(borradores.map((d) => d.id)),
        recursos: ['dispersiones', RECURSO_DE_LOTES],
        alTerminar: () => void releer(),
      });
      setCancelando(false);
    } catch (e) {
      toast.error(tr('No se pudieron cancelar'), {
        description: mensajeParaLaPersona(e, { accion: tr('cancelar las liquidaciones') }),
      });
    }
  };

  // ── Carga y fallo ─────────────────────────────────────────────────────────
  const encabezado = (
    <EncabezadoDePantalla
      seccion={tr('Pagar a propietarios')}
      titulo={tr('Giros a propietarios')}
      descripcion={tr('Liquida el mes, gira y confirma que el banco pagó: tres pasos, en este orden.')}
      ayuda={<ComoSaleUnLote />}
      acciones={<MesDeLosGiros mes={mes} onCambiar={cambiarMes} />}
    />
  );
  if (datos === null) {
    return (
      <div className="space-y-6 p-6 lg:p-8" data-testid="giros-del-mes">
        {encabezado}
        <EsqueletoDePagina variante="list" />
      </div>
    );
  }
  if (filas === null) {
    return (
      <div className="space-y-6 p-6 lg:p-8" data-testid="giros-del-mes">
        {encabezado}
        <FalloDeCarga error={datos.error} queEs={tr('los giros del mes')} onReintentar={() => void releer()} />
      </div>
    );
  }

  // ── Los tres pasos ────────────────────────────────────────────────────────
  const liquidarHecho = porGenerar.length === 0;
  const hayQueGirar = listos.length > 0 || enCurso.length > 0 || sueltos.length > 0;
  const girarHecho = liquidarHecho && !hayQueGirar;
  const enElBancoAhora = enElBanco.length > 0;

  const pasoLiquidar: PasoDeLaTarea = {
    id: 'liquidar',
    titulo: tr('Liquidar el mes'),
    descripcion: tr('Lo que le toca a cada propietario: canon, comisión, deducciones y el neto.'),
    estado: liquidarHecho ? 'hecho' : 'actual',
    etiquetaDeCambio: tr('Ver'),
    resumen:
      filas.length === 0
        ? tr('{mes} no tiene nada que liquidar', { mes: conMayuscula(delMes) })
        : tr('{n} liquidados', { n: cuantos(filas.length, 'propietario', 'propietarios') }),
    contenido: (
      <div className="space-y-4" data-testid="paso-liquidar">
        {!liquidarHecho ? (
          <>
            <p className="text-body-sm text-fg">
              {tr('Faltan {n} por liquidar ({plata}).', {
                n: cuantos(porGenerar.length, 'propietario', 'propietarios'),
                plata: formatCurrency(porGenerarCop),
              })}
            </p>
            {puedeArmar ? (
              <Link
                href={`${RAIZ}/dispersiones/generar?mes=${mes}`}
                className={buttonVariants({ size: 'lg' })}
                data-testid="liquidar-el-mes"
              >
                {tr('Liquidar {mes}', { mes: delMes })}
              </Link>
            ) : (
              <p className="text-body-sm text-fg-muted">{tr('Lo liquida un administrador o el contador.')}</p>
            )}
          </>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm">
          <Link href={`${RAIZ}/liquidaciones?mes=${mes}`} className="text-primary underline-offset-4 hover:underline">
            {tr('Ver las liquidaciones')}
          </Link>
          {puedeEditar && borradores.length > 0 && enCurso.length === 0 ? (
            <button
              type="button"
              onClick={() => setCancelando(true)}
              className="text-fg-muted underline-offset-4 hover:text-fg hover:underline"
              data-testid="cancelar-liquidaciones"
            >
              {tr('Cancelar las {n} sin girar', { n: cuantos(borradores.length, 'liquidación', 'liquidaciones') })}
            </button>
          ) : null}
        </div>
      </div>
    ),
  };

  const pasoGirar: PasoDeLaTarea = {
    id: 'girar',
    titulo: tr('Girar'),
    descripcion: tr('Eliges desde qué cuenta sale la plata y lo autoriza un administrador con el código de su aplicación.'),
    estado: !liquidarHecho ? 'pendiente' : girarHecho ? 'hecho' : 'actual',
    bloqueadoPorque: tr('Primero liquida a los que faltan.'),
    resumen: filas.length === 0 ? tr('Nada que girar este mes') : tr('Todo lo del mes ya salió al banco'),
    contenido: (
      <div className="space-y-4" data-testid="paso-girar">
        {sueltos.length > 0 ? (
          <Banner variant="warning" title={tr('{n} quedaron fuera del lote', { n: cuantos(sueltos.length, 'giro', 'giros') })} data-testid="giros-sueltos">
            <span className="block">
              {tr('Se aprobaron uno por uno como giros sueltos ({plata}) y todavía no se han girado. Pásalos al lote para girarlos con el archivo del banco.', {
                plata: formatCurrency(sueltosCop),
              })}
            </span>
            {puedeEditar ? (
              <Button variant="outline" size="sm" hideArrow className="mt-3" onClick={() => void pasarSueltosAlLote()} data-testid="pasar-sueltos-al-lote">
                <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
                {tr('Pasarlos al lote')}
              </Button>
            ) : null}
          </Banner>
        ) : null}

        {enCurso.map((l) => (
          <LoteEnCurso
            key={l.id}
            lote={l}
            esAdmin={isAdmin}
            onAutorizar={() => setAutorizando(l)}
            onArchivo={() => void abrirLote(l.id, 'archivo')}
          />
        ))}

        {listos.length > 0 ? (
          <div className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5" data-testid="listos-para-girar">
            <CifraHeroe
              rotulo={tr('Listos para girar')}
              cifra={formatCurrency(listosCop)}
              contexto={tr('a {n}', { n: cuantos(listos.length, 'propietario', 'propietarios') })}
            />
            {noVan.length > 0 ? (
              <p className="text-body-sm text-fg-muted" data-testid="no-van-en-el-giro">
                {tr('No van en este giro:')}{' '}
                {noVan.map(([tipo, n]) => `${n.toLocaleString('es-CO')} ${POR_QUE_NO_VA[tipo][n === 1 ? 0 : 1]}`).join(' · ')}.{' '}
                <Link href={`${RAIZ}/dispersiones?mes=${mes}`} className="text-primary underline-offset-4 hover:underline">
                  {tr('Ver quiénes')}
                </Link>
              </p>
            ) : null}
            {puedeArmar ? (
              <Button size="lg" className="w-full sm:w-auto" onClick={() => setGirando(true)} data-testid="girar">
                <PaperPlaneTilt className="h-5 w-5" weight="bold" aria-hidden="true" />
                {tr('Girar {plata} a {n}', {
                  plata: formatCurrency(listosCop),
                  n: cuantos(listos.length, 'propietario', 'propietarios'),
                })}
              </Button>
            ) : (
              <p className="text-body-sm text-fg-muted">{tr('Gira un administrador o el contador.')}</p>
            )}
          </div>
        ) : null}
      </div>
    ),
  };

  const pasoBanco: PasoDeLaTarea = {
    id: 'banco',
    titulo: tr('Confirmar que el banco pagó'),
    descripcion: tr('Sube el archivo al portal de tu banco. Cuando el banco pague, márcalo aquí: así cada propietario queda al día.'),
    // Con lotes en el banco y nada más que girar, es lo que toca; si todavía hay qué girar, sus lotes igual se
    // ven y se marcan (`fijo`). Sin lotes en el banco: hecho si el banco ya pagó y no queda nada del mes.
    estado: enElBancoAhora
      ? liquidarHecho && !hayQueGirar
        ? 'actual'
        : 'pendiente'
      : girarHecho && pagados.length > 0
        ? 'hecho'
        : 'pendiente',
    bloqueadoPorque: enElBancoAhora ? undefined : tr('Cuando gires, aquí confirmas el pago.'),
    resumen: tr('El banco pagó {n} este mes', { n: cuantos(pagados.length, 'lote', 'lotes') }),
    fijo:
      enElBancoAhora ? (
        <ul className="space-y-2" data-testid="lotes-en-el-banco">
          {enElBanco.map((l) => (
            <li
              key={l.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-mono text-body-sm tabular-nums text-fg">{formatCurrency(l.totalCop)}</p>
                <p className="text-caption text-fg-muted">
                  {l.estado === 'EN_WOMPI'
                    ? tr('{n} · Wompi está pagando', { n: cuantos(l.cantidad, 'pago', 'pagos') })
                    : tr('{n} · el archivo ya salió para el banco', { n: cuantos(l.cantidad, 'pago', 'pagos') })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`${RAIZ}/dispersiones/lotes/${l.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  {tr('Ver el lote')}
                </Link>
                {l.estado === 'ARCHIVO_GENERADO' && puedeEditar ? (
                  <Button size="sm" hideArrow onClick={() => void abrirLote(l.id, 'pagado')} data-testid={`ya-pago-${l.id}`}>
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    {tr('Ya el banco pagó')}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : undefined,
  };

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="giros-del-mes">
      {encabezado}

      <CifraHeroe
        data-testid="falta-girar"
        rotulo={tr('Giros de {mes}', { mes: delMes })}
        cifra={faltaCop === 0 && filas.length > 0 ? tr('Girado completo') : formatCurrency(faltaCop ?? 0)}
        contexto={
          filas.length === 0
            ? tr('{mes} no tiene giros', { mes: conMayuscula(delMes) })
            : faltaCop === 0
              ? tr('Todos los propietarios del mes están al día')
              : tr('falta girar a {n}', { n: cuantos(faltanPropietarios, 'propietario', 'propietarios') })
        }
      />

      <PasosDeLaTarea pasos={[pasoLiquidar, pasoGirar, pasoBanco]} data-testid="pasos-de-los-giros" />

      <MasDetalles etiqueta={tr('Ver el detalle')} etiquetaAbierto={tr('Ocultar el detalle')}>
        <ul className="space-y-2 text-body-sm">
          <li>
            <Link href={`${RAIZ}/dispersiones?mes=${mes}`} className="text-primary underline-offset-4 hover:underline">
              {tr('Los giros del mes, uno por uno')}
            </Link>
          </li>
          <li>
            <Link href={`${RAIZ}/dispersiones/lotes?mes=${mes}`} className="text-primary underline-offset-4 hover:underline">
              {tr('Todos los lotes al banco')}
            </Link>
          </li>
        </ul>
      </MasDetalles>

      <GirarDialog
        abierto={girando}
        mes={mes}
        listos={listos.length}
        listosCop={listosCop}
        esAdmin={isAdmin}
        onCerrar={() => setGirando(false)}
        onListo={async (loteId, autorizado) => {
          setGirando(false);
          await releer();
          if (autorizado) await abrirLote(loteId, 'archivo');
        }}
        onVerLote={(id) => router.push(`${RAIZ}/dispersiones/lotes/${id}`)}
      />

      {autorizando ? (
        <AutorizarLoteDialog
          lote={autorizando}
          yo={yo}
          onCerrar={() => setAutorizando(null)}
          onListo={async () => {
            const id = autorizando.id;
            setAutorizando(null);
            await releer();
            await abrirLote(id, 'archivo');
          }}
          onVerLote={(id) => router.push(`${RAIZ}/dispersiones/lotes/${id}`)}
        />
      ) : null}

      {vistaDelLote ? (
        <>
          <ArchivoDialog
            abierto={vistaDelLote.accion === 'archivo'}
            lote={vistaDelLote.vista.lote}
            origen={vistaDelLote.vista.origen}
            guardar={guardarArchivo}
            onCerrar={() => setVistaDelLote(null)}
            onGenerado={() => void releer()}
          />
          <MarcarPagadoDialog
            abierto={vistaDelLote.accion === 'pagado'}
            lote={vistaDelLote.vista.lote}
            onCerrar={() => setVistaDelLote(null)}
            onListo={() => {
              setVistaDelLote(null);
              void releer();
            }}
          />
        </>
      ) : null}

      <AlertDialog open={cancelando} onOpenChange={(o) => !o && setCancelando(false)}>
        <AlertDialogContent data-testid="confirmar-cancelar-liquidaciones">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tr('¿Cancelar {n}?', { n: cuantos(borradores.length, 'liquidación sin girar', 'liquidaciones sin girar') })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tr('Sus cuotas vuelven a estar por girar y puedes liquidar el mes de nuevo. Corre en el centro de procesos: puedes seguir trabajando.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr('No cancelar')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void cancelarBorradores()}>{tr('Sí, cancelarlas')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Un lote del mes que todavía no sale al banco: espera la autorización o el archivo. */
function LoteEnCurso({
  lote,
  esAdmin,
  onAutorizar,
  onArchivo,
}: {
  lote: LoteResumen;
  esAdmin: boolean;
  onAutorizar: () => void;
  onArchivo: () => void;
}) {
  const tr = useTr();
  const autorizado = lote.estado === 'APROBADO';
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`lote-en-curso-${lote.id}`}
      data-estado={lote.estado}
    >
      <div className="min-w-0">
        <p className="text-body-sm text-fg">
          {autorizado
            ? tr('Giro autorizado: falta sacar el archivo para el banco')
            : tr('Un giro espera la autorización de un administrador')}
        </p>
        <p className="font-mono text-caption tabular-nums text-fg-muted">
          {formatCurrency(lote.totalCop)} · {cuantos(lote.cantidad, 'pago', 'pagos')}
        </p>
      </div>
      {autorizado ? (
        <Button size="sm" hideArrow onClick={onArchivo} data-testid={`archivo-${lote.id}`}>
          <Bank className="h-4 w-4" aria-hidden="true" />
          {tr('Sacar el archivo del banco')}
        </Button>
      ) : esAdmin ? (
        <Button size="sm" hideArrow onClick={onAutorizar} data-testid={`autorizar-${lote.id}`}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          {tr('Autorizar el giro')}
        </Button>
      ) : (
        <p className="text-caption text-fg-muted sm:max-w-xs sm:text-right">
          {tr('Les avisamos a los administradores: lo autorizan con el código de su aplicación.')}
        </p>
      )}
    </div>
  );
}

/**
 * El botón grande: desde qué cuenta sale la plata, a quién (opcional) y la
 * autorización. Un administrador la da aquí mismo con el código de su
 * aplicación; los demás piden la autorización y le llega a los administradores.
 */
function GirarDialog({
  abierto,
  mes,
  listos,
  listosCop,
  esAdmin,
  onCerrar,
  onListo,
  onVerLote,
}: {
  abierto: boolean;
  mes: string;
  listos: number;
  listosCop: number;
  esAdmin: boolean;
  onCerrar: () => void;
  onListo: (loteId: string, autorizado: boolean) => void | Promise<void>;
  onVerLote: (loteId: string) => void;
}) {
  const tr = useTr();
  const [banco, setBanco] = useState<EleccionDelBanco>({ origen: null, listo: false });
  const [eleccion, setEleccion] = useState<EleccionDelLote>({
    dispersionIds: [],
    orden: 'MENOR_A_MAYOR',
    totalCop: 0,
    descubiertoCop: 0,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!abierto) {
      setError(null);
      setEnviando(false);
    }
  }, [abierto]);

  const elegidos = eleccion.dispersionIds.length;
  const cuantosVan = elegidos > 0 ? elegidos : listos;
  const cuantoVa = elegidos > 0 ? eleccion.totalCop : listosCop;

  const girar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const { lote, mismoPaso } = await lotesDeDispersionApi.armar({
        month: mes,
        dispersionIds: elegidos > 0 ? eleccion.dispersionIds : undefined,
        orden: eleccion.orden,
        origen: banco.origen ?? undefined,
      });
      if (lote.estado === 'APROBADO') {
        toast.success(tr('Giro autorizado'), {
          description: tr('{plata} a {n}. Ahora saca el archivo para subirlo al portal del banco.', {
            plata: formatCurrency(lote.totalCop),
            n: cuantos(lote.cantidad, 'propietario', 'propietarios'),
          }),
        });
        await onListo(lote.id, true);
        return;
      }
      // No quedó autorizado en este paso: lo autoriza otra persona (el monto, o
      // quien lo pide no es administrador) o Giri pide revisar algo antes.
      if (!esAdmin || mismoPaso?.porQueNo === 'SOBRE_EL_MONTO') {
        const r = await lotesDeDispersionApi.solicitarAprobacion(lote.id);
        toast.success(tr('Les avisamos a los administradores'), {
          description:
            mismoPaso?.porQueNo === 'SOBRE_EL_MONTO'
              ? mismoPaso.nota
              : r.enviadoA.length > 0
                ? tr('Lo autorizan con el código de su aplicación: {a}.', { a: r.enviadoA.join(', ') })
                : tr('Lo autorizan con el código de su aplicación.'),
        });
        await onListo(lote.id, false);
        return;
      }
      toast.info(tr('El lote quedó armado, sin autorizar'), {
        description: mismoPaso?.nota ?? tr('Ábrelo para ver qué falta.'),
        action: { label: tr('Abrir el lote'), onClick: () => onVerLote(lote.id) },
      });
      await onListo(lote.id, false);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: tr('No se pudo girar.'), accion: tr('girar') }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !enviando && onCerrar()}>
      <DialogContent size="xl" data-testid="dialogo-girar">
        <DialogHeader>
          <DialogTitle>
            {tr('Girar {plata} a {n}', {
              plata: formatCurrency(cuantoVa),
              n: cuantos(cuantosVan, 'propietario', 'propietarios'),
            })}
          </DialogTitle>
          <DialogDescription>
            {tr('Giros de {mes}. Elige desde qué cuenta sale la plata; si no eliges a quién, se gira a todos los que están listos.', {
              mes: nombreDelMes(mes),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          {abierto ? <ElegirBancoDeOrigen onCambio={setBanco} /> : null}
          <MasDetalles etiqueta={tr('Elegir a quién le giras (opcional)')} etiquetaAbierto={tr('Girar a todos los listos')}>
            {abierto ? <ElegirAQuienPagarle mes={mes} onCambio={setEleccion} /> : null}
          </MasDetalles>
          {esAdmin ? (
            <section className="space-y-2 rounded-lg border border-border bg-surface-muted/40 p-4" data-testid="autorizar-con-el-codigo">
              <p className="text-body-sm text-fg">
                {banco.listo
                  ? tr('Autoriza el giro con el código de tu aplicación de autenticación. Al escribirlo, sale el giro.')
                  : tr('Primero elige desde qué cuenta sale la plata.')}
              </p>
              <CampoDelCodigoDeLaApp deshabilitado={!banco.listo || enviando} onVerificado={girar} />
            </section>
          ) : (
            <p className="text-body-sm text-fg-muted">
              {tr('Los giros los autoriza un administrador con el código de su aplicación de autenticación. Le avisamos al pedirlo.')}
            </p>
          )}
          {enviando ? <p className="text-caption text-fg-muted">{tr('Girando…')}</p> : null}
          {error ? <Banner variant="danger">{error}</Banner> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            {tr('Cancelar')}
          </Button>
          {!esAdmin ? (
            <Button hideArrow onClick={() => void girar()} isLoading={enviando} disabled={!banco.listo} data-testid="pedir-la-autorizacion">
              {tr('Pedir la autorización')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Autorizar un lote que espera: el administrador escribe el código de su aplicación. */
function AutorizarLoteDialog({
  lote,
  yo,
  onCerrar,
  onListo,
  onVerLote,
}: {
  lote: LoteResumen;
  yo: string | null;
  onCerrar: () => void;
  onListo: () => void | Promise<void>;
  onVerLote: (id: string) => void;
}) {
  const tr = useTr();
  const [error, setError] = useState<string | null>(null);
  const autorizar = async () => {
    setError(null);
    try {
      // El que él mismo armó (o uno en borrador) se autoriza al «pedir la aprobación»; el de otro, al aprobarlo.
      if (lote.estado === 'BORRADOR' || lote.creadoPorUserId === yo) {
        const r = await lotesDeDispersionApi.solicitarAprobacion(lote.id);
        if (r.lote.estado !== 'APROBADO') {
          toast.info(tr('Lo autoriza otro administrador'), { description: r.mismoPaso?.nota ?? undefined });
          onCerrar();
          return;
        }
      } else {
        await lotesDeDispersionApi.aprobar(lote.id);
      }
      toast.success(tr('Giro autorizado'), { description: tr('Ahora saca el archivo para subirlo al portal del banco.') });
      await onListo();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: tr('No se pudo autorizar el giro.'), accion: tr('autorizar el giro') }));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent size="sm" variant="confirm" icon={<ShieldCheck weight="bold" />} data-testid="dialogo-autorizar-lote">
        <DialogHeader>
          <DialogTitle>{tr('Autorizar el giro')}</DialogTitle>
          <DialogDescription>
            {formatCurrency(lote.totalCop)} · {cuantos(lote.cantidad, 'pago', 'pagos')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <CampoDelCodigoDeLaApp onVerificado={autorizar} />
          {error ? (
            <Banner variant="danger">
              {error}{' '}
              <button type="button" className="underline underline-offset-4" onClick={() => onVerLote(lote.id)}>
                {tr('Abrir el lote')}
              </button>
            </Banner>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar}>
            {tr('Cancelar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
