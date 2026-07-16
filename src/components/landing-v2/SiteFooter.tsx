"use client";

import { useEffect, useRef } from "react";

/**
 * SiteFooter — footer compartido de la landing-v2 (home / producto / blog / contacto).
 * Self-contained: rellena su propio wordmark "Leasefy." y revela sus columnas.
 * Requiere que la página incluya <LogoDefs/> una vez (usa <use href="#lfLogo"/>).
 */
export default function SiteFooter() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // wordmark
    const wm = root.querySelector<HTMLElement>(".wm > div");
    if (wm && !wm.childElementCount) {
      "Leasefy.".split("").forEach((ch, i) => {
        const s = document.createElement("span");
        s.textContent = ch;
        s.style.setProperty("--d", `${0.1 + i * 0.05}s`);
        if (ch === ".") s.className = "bd";
        wm.appendChild(s);
      });
    }
    // reveals
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal],.wm"));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
        { rootMargin: "-8% 0px" }
      );
      items.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }
    items.forEach((el) => el.classList.add("in"));
  }, []);

  return (
    <footer ref={ref}>
      <div className="fstrip" aria-hidden="true"><div className="lbg" /></div>
      <div className="container">
        <div className="fgrid2">
          <div className="fbrand" data-reveal>
            <span className="logo flogo"><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></span>
            <p>El sistema operativo inteligente para inmobiliarias: CRM, ERP y agentes AI para operar arriendos de punta a punta.</p>
            <span className="fstatus">
              <span className="pingw" style={{ width: 6, height: 6 }}><span className="pinga" style={{ background: "rgba(52,211,153,.6)" }} /><span className="pingb" style={{ width: 6, height: 6, background: "#34d399" }} /></span>
              Operando con normalidad
            </span>
            <div className="btns">
              <a className="btn primary sm" href="http://localhost:3001/registro" target="_blank" rel="noopener">Empezar ahora</a>
              <a className="btn odark sm" href="https://wa.me/573000000000" target="_blank" rel="noopener">Escribir por WhatsApp</a>
            </div>
          </div>
          <div />
          <div className="fcol" data-reveal>
            <p className="k">Producto</p>
            <ul>
              <li><a href="/landing-v2/p/crm">CRM inmobiliario</a></li>
              <li><a href="/landing-v2/p/erp">ERP de arriendos</a></li>
              <li><a href="/landing-v2/p/asegurabilidad">Asegurabilidad</a></li>
              <li><a href="/landing-v2/p/matching">Matching</a></li>
              <li><a href="/landing-v2/p/cobranza">Cobranza</a></li>
            </ul>
          </div>
          <div className="fcol" data-reveal>
            <p className="k">Empresa</p>
            <ul>
              <li><a href="/landing-v2/blog">Blog</a></li>
              <li><a href="/landing-v2/contacto">Contacto</a></li>
              <li><a href="mailto:hola@leasefy.com">Soporte</a></li>
            </ul>
          </div>
        </div>
        <div className="wm" aria-hidden="true"><div /></div>
        <div className="fbot">
          <p>© 2026 Leasefy. Todos los derechos reservados.</p>
          <span className="fbr"><span>Medellín, Colombia · CRM · ERP · Agentes AI</span><a className="ftop" href="/landing-v2">Volver al inicio <span>↑</span></a></span>
        </div>
      </div>
    </footer>
  );
}
