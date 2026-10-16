"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Un clip del producto REAL en uso (Nico, 12-10-2026: «dale vida a la
 * plataforma… anímala, quizás haz un video ahí»): el panel del laboratorio
 * con «Tu Inmobiliaria», un cursor que hace clic y los cajones que se abren.
 * Grabado cuadro por cuadro con `.playwright-mcp/landing-1210/foto/clip.mjs`
 * (`public/landing-v2/producto/clips/<nombre>.{webm,mp4,webp}`).
 *
 * - No se baja hasta que se acerca (`preload="none"`) y sólo corre a la vista.
 * - Dentro del caso de seis pasos sólo corre el paso activo (`.scn.on`): los
 *   demás están apilados debajo y no gastan.
 * - Con «reducir movimiento» queda la primera imagen, quieta.
 */
export function ClipDelProducto({ nombre, alt, className }: { nombre: string; alt: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [quieto, setQuieto] = useState(false);
  const base = `/landing-v2/producto/clips/${nombre}`;

  useEffect(() => {
    setQuieto(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || quieto || typeof IntersectionObserver === "undefined") return;
    // React no pone el atributo `muted` al hidratar: sin esto Arc/Chrome niegan el autoplay
    // y el video se queda en su primer cuadro (Nico, 12-10-2026: «se queda así en blanco»).
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    const escena = v.closest(".scn");
    let aLaVista = false;
    const decidir = () => {
      const activo = aLaVista && (!escena || escena.classList.contains("on"));
      if (activo) {
        if (v.paused) {
          if (!escena || v.dataset.visto !== "1") v.currentTime = 0;
          v.dataset.visto = "1";
          v.play().catch(() => {});
        }
      } else if (!v.paused) {
        v.pause();
        if (escena) v.dataset.visto = "0";
      }
    };
    const io = new IntersectionObserver(
      (es) => {
        aLaVista = es.some((e) => e.isIntersecting);
        decidir();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    const mo = escena ? new MutationObserver(decidir) : null;
    if (escena && mo) mo.observe(escena, { attributes: true, attributeFilter: ["class"] });
    return () => {
      io.disconnect();
      mo?.disconnect();
    };
  }, [quieto]);

  if (quieto) return <img className={["clip", className ?? ""].join(" ").trim()} src={`${base}.webp`} alt={alt} loading="lazy" />;
  return (
    <video
      ref={ref}
      className={["clip", className ?? ""].join(" ").trim()}
      muted
      loop
      playsInline
      preload="none"
      poster={`${base}.webp`}
      aria-label={alt}
    >
      <source src={`${base}.webm`} type="video/webm" />
      <source src={`${base}.mp4`} type="video/mp4" />
    </video>
  );
}
