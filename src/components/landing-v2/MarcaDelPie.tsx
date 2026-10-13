"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { AgentOrb } from "@leasefy/cadence";
import { ORBE_DEL_ORQUESTADOR } from "@/lib/agentes/nombre-del-orquestador";

/**
 * El «Leasefy.» grande del pie (Nico, 12-10-2026: «ese logo de abajo podrías
 * hacerle alguna animación y esa orbe del lado que sea Ori»).
 *
 * - Al aparecer, las letras suben una tras otra y Ori cae como el punto, con
 *   un rebote.
 * - Con el puntero encima, las letras cercanas se levantan un poco, como una
 *   ola, y Ori se asoma hacia donde está el puntero.
 * - Con «reducir movimiento» queda la marca quieta, con Ori en su lugar.
 *
 * Ori es el orbe del producto (`AgentOrb`, paleta y semilla del orquestador).
 */

const LETRAS = "Leasefy".split("");
const EASE = [0.22, 1, 0.36, 1] as const;

export function MarcaDelPie() {
  const ref = useRef<HTMLDivElement>(null);
  const letras = useRef<Array<HTMLSpanElement | null>>([]);
  const reducido = useReducedMotion() ?? false;
  const enVista = useInView(ref, { amount: 0.35, once: true });
  const visible = enVista || reducido;
  // Ya entraron las letras y cayó Ori: de ahí en adelante todo es resorte, sin demoras.
  const [entro, setEntro] = useState(false);
  const [alzas, setAlzas] = useState<number[]>(() => LETRAS.map(() => 0));
  const [asomo, setAsomo] = useState(0);
  const [lado, setLado] = useState(40);

  // El orbe mide lo que mide el punto de la letra (la marca cambia de tamaño con la ventana).
  useEffect(() => {
    const fila = ref.current?.firstElementChild as HTMLElement | null;
    if (!fila) return;
    const medir = () => setLado(Math.max(18, Math.round(parseFloat(getComputedStyle(fila).fontSize) * 0.19)));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(fila);
    return () => ro.disconnect();
  }, []);

  const alMover = (e: React.PointerEvent) => {
    if (reducido || !entro) return;
    setAlzas(
      letras.current.map((el) => {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        return Math.max(0, 1 - d / (r.width * 1.6));
      }),
    );
    const caja = ref.current!.getBoundingClientRect();
    setAsomo(((e.clientX - caja.left) / caja.width - 0.5) * 2);
  };
  const alSalir = () => {
    setAlzas(LETRAS.map(() => 0));
    setAsomo(0);
  };

  return (
    <div className="wm2" ref={ref} aria-hidden="true" onPointerMove={alMover} onPointerLeave={alSalir}>
      <div className="wm2-fila">
        {LETRAS.map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            ref={(el) => {
              letras.current[i] = el;
            }}
            className="wm2-l"
            initial={reducido ? false : { y: "60%", opacity: 0 }}
            animate={visible ? { y: `${-14 * alzas[i]}%`, opacity: 1 } : undefined}
            transition={
              entro ? { type: "spring", stiffness: 300, damping: 22 } : { duration: 0.9, ease: EASE, delay: 0.1 + i * 0.06 }
            }
            style={{ color: alzas[i] > 0.05 ? `rgba(244,241,234,${(0.11 + 0.1 * alzas[i]).toFixed(3)})` : undefined }}
          >
            {ch}
          </motion.span>
        ))}
        <motion.span
          className="wm2-ori"
          style={{ width: lado, height: lado }}
          initial={reducido ? false : { y: "-260%", opacity: 0 }}
          animate={visible ? { y: "0%", x: asomo * 8, opacity: 1 } : undefined}
          transition={{ type: "spring", stiffness: 240, damping: 11, delay: entro ? 0 : 0.1 + LETRAS.length * 0.06 + 0.2 }}
          onAnimationComplete={() => {
            if (visible) setEntro(true);
          }}
        >
          <AgentOrb
            palette={ORBE_DEL_ORQUESTADOR.paleta}
            seed={ORBE_DEL_ORQUESTADOR.semilla}
            variant="orchestrator"
            state="working"
            size={lado}
            label={null}
          />
        </motion.span>
      </div>
    </div>
  );
}
