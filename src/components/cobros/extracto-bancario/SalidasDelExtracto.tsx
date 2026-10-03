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
} from '@/lib/api/salidas-del-extracto';
import { useAparecer } from './cuentas-del-extracto';

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

  const aplicar = async () => {
    setAplicando(true);
    try {
      const r = await salidasDelExtractoApi.aplicarSeguras();
      toast.success(
        r.aplicadas === 0
          ? 'No había salidas seguras para conciliar: las que quedan las decide una persona.'
          : `${r.aplicadas === 1 ? 'Se concilió 1 salida segura' : `Se conciliaron ${r.aplicadas} salidas seguras`}. ${
              r.quedanParaUnaPersona > 0 ? `Quedan ${r.quedanParaUnaPersona} para revisar una por una.` : ''
            }`.trim(),
      );
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
            onClick={() => setConfirmando(true)}
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
          <DialogFooter>
            <Button variant="ghost" hideArrow onClick={() => setConfirmando(false)} disabled={aplicando}>
              Cancelar
            </Button>
            <Button hideArrow isLoading={aplicando} onClick={() => void aplicar()} data-testid="confirmar-salidas-seguras">
              Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
