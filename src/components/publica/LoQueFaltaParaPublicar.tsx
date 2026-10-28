"use client";

/**
 * «Que si no tengo todo listo al dar publicar me muestre bien qué es lo que me falta» (Nico, 28-10-2026).
 *
 * Sale encima del pie al tocar «Publicar» cuando algún inmueble no está listo: cuántos y qué le falta a cada uno, con un
 * botón que lleva a ese inmueble. Si había listos, dice que ésos sí salieron y estos no. Se cierra con la ✕ o cuando ya
 * no falta nada.
 */

import { ArrowRight, WarningCircle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { motionDuration, motionEase } from "@leasefy/cadence";

import {
  fraseDeLoQueFalta,
  tituloDe,
  type CampoQueFalta,
  type InmuebleRapido,
} from "@/lib/publica/borrador";

export interface InmuebleConFaltantes {
  inmueble: InmuebleRapido;
  numero: number;
  faltan: CampoQueFalta[];
}

const A_LA_VISTA = 4;

export function LoQueFaltaParaPublicar({
  abierto,
  pendientes,
  publicadosAhora,
  alIr,
  alCerrar,
}: {
  abierto: boolean;
  pendientes: InmuebleConFaltantes[];
  /** Cuántos sí salieron en esta corrida (0 si no salió ninguno). */
  publicadosAhora: number;
  alIr: (clave: string) => void;
  alCerrar: () => void;
}) {
  const visible = abierto && pendientes.length > 0;
  const n = pendientes.length;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            y: 8,
            transition: {
              duration: motionDuration.fast,
              ease: motionEase.exit,
            },
          }}
          transition={{ duration: motionDuration.base, ease: motionEase.enter }}
          className="mx-auto mb-3 w-full max-w-[760px] overflow-hidden rounded-2xl border border-danger/30 bg-surface shadow-[0_24px_48px_-24px_rgba(20,19,15,0.35)]"
          role="alert"
          data-testid="lo-que-falta-para-publicar"
        >
          <div className="flex items-start gap-3 border-b border-border bg-danger-soft/60 px-4 py-3">
            <WarningCircle
              size={20}
              weight="fill"
              className="mt-0.5 shrink-0 text-danger"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-medium text-fg">
                {publicadosAhora > 0
                  ? `Publicamos ${publicadosAhora === 1 ? "1 inmueble" : `${publicadosAhora.toLocaleString("es-CO")} inmuebles`}. ${n === 1 ? "A 1 le falta algo" : `A ${n.toLocaleString("es-CO")} les falta algo`} para salir.`
                  : n === 1
                    ? "Antes de publicar, a tu inmueble le falta algo"
                    : `Antes de publicar, a ${n.toLocaleString("es-CO")} inmuebles les falta algo`}
              </p>
              <p className="mt-0.5 text-[13px] text-fg-muted">
                Complétalo y vuelve a tocar «Publicar».
              </p>
            </div>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar"
              className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <ul className="max-h-[40vh] divide-y divide-border overflow-y-auto">
            {pendientes.slice(0, A_LA_VISTA).map((p) => (
              <li
                key={p.inmueble.clave}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-7 shrink-0 font-mono text-[12px] text-fg-subtle">
                  {p.numero}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-fg">
                    {tituloDe(p.inmueble)}
                  </p>
                  <p className="text-[13px] text-danger">
                    {fraseDeLoQueFalta(p.faltan)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alIr(p.inmueble.clave)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-[13.5px] font-medium text-fg transition-colors hover:border-primary hover:text-primary"
                  data-testid={`ir-a-lo-que-falta-${p.numero}`}
                >
                  Completar
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {n > A_LA_VISTA && (
            <p className="border-t border-border px-4 py-2.5 text-[13px] text-fg-muted">
              Y {(n - A_LA_VISTA).toLocaleString("es-CO")} más: están en el
              filtro «Les falta algo».
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
