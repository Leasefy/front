"use client";

import { useEffect, useRef } from "react";

/**
 * ClosingBanner — banner de cierre (foto + "video" WebP con fundido) de la landing-v2.
 * Self-contained: carga diferida del WebP al entrar en viewport y funde a la foto.
 */
export default function ClosingBanner() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const banner = root.querySelector<HTMLElement>(".banner");
    const vid = root.querySelector<HTMLImageElement>(".banner-video");
    if (!banner || !vid) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { banner.classList.add("vdone"); return; }

    let fired = false;
    const finish = () => { if (!fired) { fired = true; banner.classList.add("vdone"); } };
    const onLoad = () => setTimeout(finish, 13200);
    vid.addEventListener("load", onLoad);
    vid.addEventListener("error", finish);
    const arm = () => { if (vid.src) return; const s = vid.getAttribute("data-vsrc"); if (s) { vid.src = s; vid.removeAttribute("data-vsrc"); } };
    let vio: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      vio = new IntersectionObserver((es) => { if (es[0]?.isIntersecting) { arm(); vio?.disconnect(); } }, { threshold: 0.2, rootMargin: "0px 0px 15% 0px" });
      vio.observe(banner);
    } else arm();

    return () => { vid.removeEventListener("load", onLoad); vid.removeEventListener("error", finish); vio?.disconnect(); };
  }, []);

  return (
    <section ref={ref} className="sec" id="pp-closer" style={{ padding: "80px 0 0" }}>
      <div className="container">
        <div className="banner in">
          <div className="banner-photo" aria-hidden="true" />
          <img className="banner-video" alt="" aria-hidden="true" data-vsrc="/landing-v2/assets/6eb389ad5e.webp" />
          <div className="banner-veil" aria-hidden="true" />
          <div className="banner-in">
            <h2 style={{ maxWidth: 760 }}>Pon tu operación en piloto&nbsp;automático y dedícate a traer clientes.</h2>
            <div className="bcta in">
              <a className="btn inverse lg" href="mailto:hola@leasefy.com">Hablemos</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
