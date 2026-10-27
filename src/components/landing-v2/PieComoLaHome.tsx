"use client";

import { useEffect, useRef } from "react";
import { useEnlace, useTx } from "@/lib/idioma/use-idioma";
import { dmMono, hostGrotesk } from "./fuentes-de-la-home";
import "./pie-como-la-home.css";

/**
 * El pie de la landing nueva (`public/landing/index.html`, `<footer class="pie">`)
 * en las páginas públicas en React (Nico, 27-10-2026: «hay muchas secciones que
 * cuando uno le da clic lo lleva a uno a la landing vieja»). Claro, con las
 * mismas columnas y la marca en puntos que llegan y esquivan el mouse, como
 * `public/landing/js/06-marca-del-pie.js`.
 *
 * El logo sale del `<symbol id="lfLogo">` que pone `LogoDefs` (lo monta
 * `LandingChrome`); sin él queda la marca dibujada en SVG, sin puntos.
 */
export function PieComoLaHome() {
  const tx = useTx();
  const enlace = useEnlace();
  const caja = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);

  useMarcaEnPuntos(caja, lienzo);

  return (
    <footer className={`pie-home ${hostGrotesk.variable} ${dmMono.variable}`} data-testid="pie-como-la-home">
      <div className="pie-home-wrap">
        <div className="pie-home-grid">
          <div>
            <a href={enlace("/")} className="pie-home-logo" aria-label={tx("Leasefy, inicio", "Leasefy, home")}>
              <svg viewBox="0 0 947 235" aria-hidden="true">
                <use href="#lfLogo" />
              </svg>
            </a>
            <p>
              {tx(
                "El sistema operativo inteligente para inmobiliarias: CRM, ERP y agentes AI para operar arriendos de punta a punta.",
                "The intelligent operating system for real estate agencies: CRM, ERP and AI agents to run rentals end to end.",
              )}
            </p>
            <span className="pie-home-estado">
              <i aria-hidden="true" />
              {tx("Operando con normalidad", "All systems normal")}
            </span>
          </div>
          <div>
            <h4>{tx("Producto", "Product")}</h4>
            <ul>
              <li><a href={enlace("/productos/crm")}>{tx("CRM inmobiliario", "Real estate CRM")}</a></li>
              <li><a href={enlace("/productos/erp")}>{tx("ERP de arriendos", "Rental ERP")}</a></li>
              <li><a href={enlace("/productos/asegurabilidad")}>{tx("Asegurabilidad", "Insurability")}</a></li>
              <li><a href={enlace("/productos/inquilino")}>{tx("Buró y validación", "Credit check and validation")}</a></li>
              <li><a href={enlace("/productos/matching")}>{tx("Afinidad", "Matching")}</a></li>
              <li><a href={enlace("/productos/cobranza")}>{tx("Cobranza", "Collections")}</a></li>
            </ul>
          </div>
          <div>
            <h4>{tx("Empresa", "Company")}</h4>
            <ul>
              <li><a href={enlace("/contacto")}>{tx("Contacto", "Contact")}</a></li>
              <li><a href="mailto:hola@leasefy.co">{tx("Soporte", "Support")}</a></li>
            </ul>
          </div>
          <div>
            <h4>{tx("Escríbenos", "Write to us")}</h4>
            <ul>
              <li><a href="mailto:hola@leasefy.co">hola@leasefy.co</a></li>
              <li>Medellín, Colombia</li>
            </ul>
          </div>
        </div>
        <div className="pie-home-marca" ref={caja} aria-hidden="true">
          <svg viewBox="0 0 947 235">
            <use href="#lfLogo" />
          </svg>
          <canvas ref={lienzo} />
        </div>
        <div className="pie-home-base">
          <span>{tx("© 2026 Leasefy. Todos los derechos reservados.", "© 2026 Leasefy. All rights reserved.")}</span>
          <nav aria-label={tx("Legal", "Legal")}>
            <a href={enlace("/terminos")}>{tx("Términos", "Terms")}</a>
            <a href={enlace("/privacidad")}>{tx("Privacidad", "Privacy")}</a>
          </nav>
          <span>Medellín, Colombia · CRM · ERP · {tx("Agentes AI", "AI agents")}</span>
          <a href="#top" className="pie-home-arriba" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            {tx("Volver arriba", "Back to top")}
          </a>
        </div>
      </div>
    </footer>
  );
}

/**
 * Los puntos de la marca: el mismo cálculo de `06-marca-del-pie.js` (cada punto
 * sale de un lugar al azar, llega a su sitio del logo al entrar el pie en
 * pantalla y se aparta del mouse). Con movimiento reducido, quietos en su sitio.
 */
function useMarcaEnPuntos(
  cajaRef: React.RefObject<HTMLDivElement | null>,
  lienzoRef: React.RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const caja = cajaRef.current;
    const cv = lienzoRef.current;
    const simbolo = typeof document !== "undefined" ? document.getElementById("lfLogo") : null;
    if (!caja || !cv || !simbolo || !cv.getContext) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    type Punto = { tx: number; ty: number; sx: number; sy: number; x: number; y: number; c: string; s: number };
    let puntos: Punto[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const raton = { x: -9999, y: -9999 };
    let llegada = 0;
    let objetivo = 0;
    let cuadroId = 0;
    let vivo = true;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const armar = () => {
      const W = caja.clientWidth;
      const H = Math.round((W * 235) / 947);
      if (!W) return;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 947 235" width="${W}" height="${H}"><g fill="#000">${simbolo.innerHTML}</g></svg>`;
      const img = new Image();
      img.onload = () => {
        const o = document.createElement("canvas");
        o.width = W;
        o.height = H;
        const oc = o.getContext("2d");
        if (!oc) return;
        oc.drawImage(img, 0, 0, W, H);
        const d = oc.getImageData(0, 0, W, H).data;
        const paso = Math.max(4, Math.round(W / 190));
        puntos = [];
        for (let y = 0; y < H; y += paso) {
          for (let x = 0; x < W; x += paso) {
            if (d[(y * W + x) * 4 + 3] > 128) {
              const a = Math.random() * Math.PI * 2;
              const r = W * (0.3 + Math.random() * 0.6);
              puntos.push({ tx: x, ty: y, sx: x + Math.cos(a) * r, sy: y + Math.sin(a) * r * 0.6, x, y, c: Math.random() < 0.7 ? "#1A40FF" : "#5C76FF", s: paso * 0.72 });
            }
          }
        }
        caja.classList.add("con-puntos");
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    const cuadro = () => {
      if (!vivo) return;
      llegada += (objetivo - llegada) * 0.05;
      const e = quieto ? 1 : 1 - Math.pow(1 - Math.min(1, llegada), 3);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of puntos) {
        let bx = p.sx + (p.tx - p.sx) * e;
        let by = p.sy + (p.ty - p.sy) * e;
        const dx = bx - raton.x;
        const dy = by - raton.y;
        const dd = dx * dx + dy * dy;
        const R = 90;
        if (dd < R * R) {
          const k = (1 - Math.sqrt(dd) / R) * 26;
          bx += (dx / (Math.sqrt(dd) + 0.01)) * k;
          by += (dy / (Math.sqrt(dd) + 0.01)) * k;
        }
        p.x += (bx - p.x) * 0.2;
        p.y += (by - p.y) * 0.2;
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.35 + 0.65 * e;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      }
      ctx.globalAlpha = 1;
      cuadroId = requestAnimationFrame(cuadro);
    };

    const alMover = (ev: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      raton.x = ev.clientX - r.left;
      raton.y = ev.clientY - r.top;
    };
    const alSalir = () => {
      raton.x = -9999;
      raton.y = -9999;
    };
    caja.addEventListener("pointermove", alMover);
    caja.addEventListener("pointerleave", alSalir);
    const observador =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((en) => {
            if (en[0]?.isIntersecting) objetivo = 1;
          }, { threshold: 0.25 })
        : null;
    observador?.observe(caja);
    if (!observador) objetivo = 1;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const alCambiar = () => {
      clearTimeout(espera);
      espera = setTimeout(armar, 200);
    };
    window.addEventListener("resize", alCambiar);
    armar();
    cuadroId = requestAnimationFrame(cuadro);

    return () => {
      vivo = false;
      cancelAnimationFrame(cuadroId);
      clearTimeout(espera);
      observador?.disconnect();
      window.removeEventListener("resize", alCambiar);
      caja.removeEventListener("pointermove", alMover);
      caja.removeEventListener("pointerleave", alSalir);
    };
  }, [cajaRef, lienzoRef]);
}
