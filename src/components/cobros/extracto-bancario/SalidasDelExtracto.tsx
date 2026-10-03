'use client';

/**
 * 🔴 LAS SALIDAS DEL EXTRACTO (Nico, P5, 03-10-2026: «se concilian TODAS:
 * giros a propietarios, egresos/proveedores, 4×1000, comisiones bancarias y
 * devoluciones»).
 *
 *   · `SalidasDeLaPagina` (proveedor): le pregunta al back, UNA vez por página,
 *     qué puede ser cada salida (y cada entrada que habla de un reverso) y con
 *     qué quedó conciliada. Cada fila lo lee con `useSalidaDeLaFila`.
 *   · `AvisosDeLasSalidas` (tarjeta arriba de la tabla): el giro que no salió o
 *     que salió dos veces se AVISA, y «Conciliar las salidas seguras» concilia
 *     de un golpe lo `alta` + único (regla P7), con confirmación.
 *
 * 🔴 Seguimiento 6 (Nico, C2-SALIDAS Q3: «también lo aprieta una persona, con
 * confirmación»): el diálogo primero pregunta al back CUÁLES son, cuántas y
 * cuánto suman (`GET …/salidas/seguras`) y lo muestra; confirmar manda esa
 * lista y el back concilia sólo lo que la persona vio y sigue siendo seguro.
 * El clic queda en la bitácora con la persona.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowsLeftRight, CheckCircle, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type { MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import {
  hayQuePreguntarPorLaLinea,
  salidasDelExtractoApi,
  type AvisoDeSalida,
  type SalidaDeLaPagina,
  type SalidasDeLaPagina,
  type VistaPreviaDeLasSeguras,
} from '@/lib/api/salidas-del-extracto';
import { useAparecer } from './cuentas-del-extracto';
import { diaLegible, plata } from './formato';

interface Contexto {
  datos: SalidasDeLaPagina | null;
  /** Falta la migración del vínculo: se ve, no se concilia. */
  sinTabla: boolean;
  marcarSinTabla: () => void;
}

const ContextoDeLasSalidas = createContext<Contexto | null>(null);

export function SalidasDeLaPagina({
  movimientos,
  version = 0,
  children,
}: {
  movimientos: readonly MovimientoBancario[] | null;
  /** Cambia cuando la lista se vuelve a leer. */
  version?: number;
  children: ReactNode;
}) {
  const [datos, setDatos] = useState<SalidasDeLaPagina | null>(null);
  const [sinTabla, setSinTabla] = useState(false);
  const ids = useMemo(
    () => (movimientos ?? []).filter(hayQuePreguntarPorLaLinea).map((m) => m.id),
    [movimientos],
  );
  const clave = ids.join(',');

  useEffect(() => {
    if (!clave) {
      setDatos(null);
      return;
    }
    let vivo = true;
    salidasDelExtractoApi
      .propuestas(clave.split(','))
      .then((r) => {
        if (!vivo) return;
        setDatos(r);
        if (!r.sePuedeAplicar) setSinTabla(true);
      })
      // Un back sin la ruta: las salidas se ven como antes (se pueden ignorar).
      .catch(() => vivo && setDatos(null));
    return () => {
      vivo = false;
    };
    // Cada lectura de la lista (conciliar, deshacer, otra página) vuelve a preguntar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, version, movimientos]);

  const marcarSinTabla = useCallback(() => setSinTabla(true), []);
  const valor = useMemo(() => ({ datos, sinTabla, marcarSinTabla }), [datos, sinTabla, marcarSinTabla]);
  return <ContextoDeLasSalidas.Provider value={valor}>{children}</ContextoDeLasSalidas.Provider>;
}

export function useSalidaDeLaFila(id: string): {
  salida: SalidaDeLaPagina | null;
  sinTabla: boolean;
  marcarSinTabla: () => void;
  leido: boolean;
} {
  const c = useContext(ContextoDeLasSalidas);
  return {
    salida: c?.datos?.porMovimiento[id] ?? null,
    sinTabla: c?.sinTabla ?? false,
    marcarSinTabla: c?.marcarSinTabla ?? (() => {}),
    leido: !!c?.datos,
  };
}

const MAXIMO_DE_AVISOS_A_LA_VISTA = 5;

/** «1 salida» / «3 salidas». */
function salidas(n: number): string {
  return n === 1 ? '1 salida' : `${n} salidas`;
}

/** Lo que dice el toast después de conciliar de un golpe. */
export function fraseDeLasSegurasAplicadas(r: {
  aplicadas: number;
  totalCop?: number;
  yaNoSonSeguras?: { movimientoId: string }[];
  quedanParaUnaPersona: number;
}): string {
  if (r.aplicadas === 0 && !(r.yaNoSonSeguras?.length ?? 0)) {
    return 'No había salidas seguras para conciliar: las que quedan las decide una persona.';
  }
  const partes: string[] = [];
  partes.push(
    r.aplicadas === 0
      ? 'No se concilió ninguna salida.'
      : `${r.aplicadas === 1 ? 'Se concilió 1 salida segura' : `Se conciliaron ${r.aplicadas} salidas seguras`}${
          r.totalCop ? ` por ${plata(r.totalCop)}` : ''
        }.`,
  );
  const ya = r.yaNoSonSeguras?.length ?? 0;
  if (ya > 0) {
    partes.push(
      ya === 1
        ? '1 ya no era segura (alguien la tocó o apareció otra respuesta): sigue en la tabla.'
        : `${ya} ya no eran seguras (alguien las tocó o apareció otra respuesta): siguen en la tabla.`,
    );
  }
  if (r.quedanParaUnaPersona > 0) partes.push(fraseDeLasQueQuedan(r.quedanParaUnaPersona, 'para revisar'));
  return partes.join(' ');
}

/**
 * «Queda 1 …» / «Quedan 3 …». 🔴 (03-10-2026) Antes decía «Quedan 1 sin
 * respuesta segura: ésas las decides una por una» con una sola.
 */
export function fraseDeLasQueQuedan(n: number, que: 'para revisar' | 'sin respuesta segura'): string {
  if (que === 'para revisar') {
    return n === 1 ? 'Queda 1 para revisar en la tabla.' : `Quedan ${n} para revisar una por una.`;
  }
  return n === 1
    ? 'Queda 1 sin respuesta segura: ésa la decides en la tabla.'
    : `Quedan ${n} sin respuesta segura: ésas las decides una por una.`;
}

/** La tarjeta de las salidas: los avisos y «Conciliar las salidas seguras». */
export function AvisosDeLasSalidas({
  version = 0,
  puedeConciliar,
  onCambio,
}: {
  version?: number;
  puedeConciliar: boolean;
  onCambio: () => void;
}) {
  const aparecer = useAparecer();
  const [avisos, setAvisos] = useState<AvisoDeSalida[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [lecturas, setLecturas] = useState(0);
  /** Lo que se le muestra a la persona antes de confirmar (`null` = mirando). */
  const [vista, setVista] = useState<VistaPreviaDeLasSeguras | null>(null);
  const [errorDeLaVista, setErrorDeLaVista] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    salidasDelExtractoApi
      .avisos()
      .then((r) => vivo && setAvisos(r.avisos ?? []))
      .catch(() => vivo && setAvisos([]));
    return () => {
      vivo = false;
    };
  }, [version, lecturas]);

  const mirarLasSeguras = useCallback(async () => {
    setVista(null);
    setErrorDeLaVista(null);
    try {
      setVista(await salidasDelExtractoApi.seguras());
    } catch (e) {
      setErrorDeLaVista(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo ver cuáles salidas son seguras.',
          accion: 'ver las salidas seguras',
        }),
      );
    }
  }, []);

  const abrir = () => {
    setConfirmando(true);
    void mirarLasSeguras();
  };

  const aplicar = async () => {
    if (!vista || vista.cantidad === 0) return;
    setAplicando(true);
    try {
      const r = await salidasDelExtractoApi.aplicarSeguras(vista);
      toast.success(fraseDeLasSegurasAplicadas(r));
      setConfirmando(false);
      setLecturas((n) => n + 1);
      onCambio();
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudieron conciliar las salidas seguras.',
          accion: 'conciliar las salidas seguras',
        }),
      );
    } finally {
      setAplicando(false);
    }
  };

  const aLaVista = avisos.slice(0, MAXIMO_DE_AVISOS_A_LA_VISTA);

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
      aria-label="Las salidas del extracto"
      data-testid="salidas-del-extracto"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 text-body font-semibold text-fg">
            <ArrowsLeftRight className="h-4 w-4" aria-hidden="true" />
            Salidas del banco
          </h2>
          <p className="text-body-sm text-fg-muted">
            Giros a propietarios, egresos, pagos a proveedores, 4×1000 y comisiones. Lo seguro y único se
            concilia de un golpe; lo demás, una por una en la tabla.
          </p>
        </div>
        {puedeConciliar && (
          <Button
            size="sm"
            variant="secondary"
            hideArrow
            className="shrink-0"
            onClick={abrir}
            data-testid="conciliar-salidas-seguras"
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Conciliar las salidas seguras
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {aLaVista.length > 0 && (
          <motion.ul
            key="avisos"
            {...aparecer}
            className="space-y-1.5"
            aria-label="Avisos de las salidas"
            data-testid="avisos-de-salidas"
          >
            {aLaVista.map((a) => (
              <li
                key={`${a.tipo}-${a.destinoTipo}-${a.destinoId}`}
                className="flex gap-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-body-sm text-fg"
                data-testid={`aviso-${a.tipo}-${a.destinoId}`}
              >
                <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span>
                  <strong className="font-medium">
                    {a.tipo === 'SALIO_DOS_VECES' ? 'Salió dos veces: ' : 'No aparece en el extracto: '}
                  </strong>
                  {a.mensaje}
                </span>
              </li>
            ))}
            {avisos.length > aLaVista.length && (
              <li className="text-body-sm text-fg-muted">
                Y {avisos.length - aLaVista.length} más. Revísalos con el banco.
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>

      <Dialog open={confirmando} onOpenChange={(v) => !v && !aplicando && setConfirmando(false)}>
        <DialogContent variant="confirm" icon={<CheckCircle weight="bold" />}>
          <DialogHeader>
            <DialogTitle>Conciliar las salidas seguras</DialogTitle>
            <DialogDescription>
              Se concilian las salidas pendientes de los últimos 120 días que tienen UNA sola respuesta segura:
              el giro, el egreso o el pago con el valor exacto y el nombre, el documento o la cuenta de quien lo
              recibió en la línea; el 4×1000 y las comisiones que el banco escribe con su nombre. Lo dudoso no se
              toca: queda en la tabla para que lo decidas.
            </DialogDescription>
          </DialogHeader>
          <AnimatePresence mode="wait" initial={false}>
            {errorDeLaVista ? (
              <motion.div key="error" {...aparecer} className="space-y-2" data-testid="seguras-error">
                <p className="text-body-sm text-danger">{errorDeLaVista}</p>
                <Button size="sm" variant="secondary" hideArrow onClick={() => void mirarLasSeguras()}>
                  Volver a intentar
                </Button>
              </motion.div>
            ) : !vista ? (
              <motion.p
                key="mirando"
                {...aparecer}
                className="flex items-center gap-2 text-body-sm text-fg-muted"
                data-testid="seguras-mirando"
              >
                <Spinner size="sm" /> Mirando cuáles son seguras…
              </motion.p>
            ) : !vista.sePuedeAplicar ? (
              <motion.p key="sin-tabla" {...aparecer} className="text-body-sm text-fg-muted" data-testid="seguras-sin-tabla">
                Hay {salidas(vista.cantidad)} seguras, pero conciliarlas necesita una actualización de la base que
                todavía no está. No se toca nada.
              </motion.p>
            ) : vista.cantidad === 0 ? (
              <motion.p key="ninguna" {...aparecer} className="text-body-sm text-fg-muted" data-testid="seguras-ninguna">
                No hay salidas seguras para conciliar.
                {vista.quedanParaUnaPersona === 1
                  ? ' La pendiente la decides en la tabla.'
                  : vista.quedanParaUnaPersona > 1
                    ? ` Las ${vista.quedanParaUnaPersona} pendientes las decides una por una en la tabla.`
                    : ''}
              </motion.p>
            ) : (
              <motion.div key="lista" {...aparecer} className="space-y-2" data-testid="seguras-lista">
                <p className="text-body font-medium text-fg" data-testid="seguras-resumen">
                  {salidas(vista.cantidad)} por {plata(vista.totalCop)}
                </p>
                <ul
                  className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-2"
                  aria-label="Las salidas que se van a conciliar"
                >
                  {vista.salidas.map((x) => (
                    <li
                      key={x.movimientoId}
                      className="flex items-start justify-between gap-3 text-body-sm"
                      data-testid={`segura-${x.movimientoId}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-fg" title={x.descripcion}>
                          {x.descripcion}
                        </span>
                        <span className="block text-caption text-fg-muted">
                          {diaLegible(x.fecha)} · {x.etiqueta}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-fg">{plata(x.valorCop)}</span>
                    </li>
                  ))}
                </ul>
                {vista.quedanParaUnaPersona > 0 && (
                  <p className="text-caption text-fg-muted">
                    {fraseDeLasQueQuedan(vista.quedanParaUnaPersona, 'sin respuesta segura')}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <DialogFooter>
            <Button variant="ghost" hideArrow onClick={() => setConfirmando(false)} disabled={aplicando}>
              Cancelar
            </Button>
            <Button
              hideArrow
              isLoading={aplicando}
              disabled={!vista || !vista.sePuedeAplicar || vista.cantidad === 0}
              onClick={() => void aplicar()}
              data-testid="confirmar-salidas-seguras"
            >
              {vista && vista.cantidad > 0 ? `Conciliar ${salidas(vista.cantidad)}` : 'Conciliar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
