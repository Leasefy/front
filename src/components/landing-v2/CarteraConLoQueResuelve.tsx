"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { CarteraViva, type ZonaDeLaCartera } from "./CarteraViva";
import { useIdioma, useTx } from "@/lib/idioma/use-idioma";

/**
 * «Qué resuelve» pegado a la Cartera (Nico, 12-10-2026: «¿cómo juntamos eso
 * con esto?»). Antes eran seis tarjetas sueltas debajo del marco; ahora son la
 * franja de abajo del mismo marco gris y cada una ilumina la parte de la
 * Cartera que resuelve: los cobros que llegan, la mora, el cruce con el banco,
 * el pago del viernes y la proyección al cierre.
 *
 * - Pasan solas, una cada `DURACION` ms, mientras la tarjeta está a la vista.
 * - Al pasar el mouse (o con el teclado) se queda en esa y deja de correr.
 * - Con «reducir movimiento» no corre nada: sólo se ilumina la que se señala.
 */
const DURACION = 3200;

const PUNTOS: { zona: ZonaDeLaCartera; texto: string; en: string; total?: true }[] = [
  { zona: "cobros", texto: "Cobros y recordatorios automáticos", en: "Automatic charges and reminders" },
  { zona: "mora", texto: "La mora se persigue sola", en: "Late rent chases itself" },
  { zona: "banco", texto: "Cada pago cuadrado contra el banco", en: "Every payment matched against the bank" },
  { zona: "pago", texto: "Pagos a propietarios programados", en: "Scheduled owner payouts" },
  { zona: "pago", texto: "Comisiones calculadas solas", en: "Commissions calculated on their own" },
  { zona: "cierre", texto: "Cierre de mes sin sorpresas", en: "Month-end close with no surprises", total: true },
];

export function CarteraConLoQueResuelve() {
  const ref = useRef<HTMLDivElement>(null);
  const visto = useInView(ref, { amount: 0.25 });
  const reducido = useReducedMotion() ?? false;
  const [activo, setActivo] = useState(0);
  const [señalado, setSeñalado] = useState(false);
  const tx = useTx();
  const en = useIdioma() === "en";

  useEffect(() => {
    if (!visto || reducido || señalado) return;
    const reloj = window.setInterval(() => setActivo((a) => (a + 1) % PUNTOS.length), DURACION);
    return () => window.clearInterval(reloj);
  }, [visto, reducido, señalado]);

  const corre = visto && !reducido;
  const foco = señalado || corre ? PUNTOS[activo].zona : null;
  const señalar = (i: number) => {
    setActivo(i);
    setSeñalado(true);
  };

  return (
    <>
      <div className="fopanel">
        <CarteraViva foco={foco} />
      </div>
      <div
        className="fores"
        ref={ref}
        data-quieto={señalado || !corre ? "" : undefined}
        style={{ "--fores-t": `${DURACION}ms` } as React.CSSProperties}
        onMouseLeave={() => setSeñalado(false)}
      >
        <p className="fores-k">{tx("Qué resuelve", "What it solves")}</p>
        <ul>
          {PUNTOS.map((p, i) => (
            <li key={p.texto}>
              <button
                type="button"
                className={p.total ? "fores-p fores-p--total" : "fores-p"}
                aria-pressed={foco !== null && i === activo}
                onMouseEnter={() => señalar(i)}
                onFocus={() => señalar(i)}
                onBlur={() => setSeñalado(false)}
                onClick={() => señalar(i)}
              >
                <i>{p.total ? "=" : `0${i + 1}`}</i>
                <span>{en ? p.en : p.texto}</span>
                <span className="fores-barra" aria-hidden="true">
                  <b key={`${activo}-${i}`} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
