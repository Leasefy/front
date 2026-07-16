"use client";

import { useState } from "react";
import LogoDefs from "./LogoDefs";
import SiteFooter from "./SiteFooter";

/**
 * BlogPage — port de la pantalla de blog (#blogPage) del standalone a una ruta real.
 * Filtro por categoría con tabs (equivale al handler bpTabs del script). Reusa las
 * clases .bp-* de landing.css; .bp-route saca el contenedor del modo overlay.
 * Los artículos enlazan al blog real del app (/blog/…).
 */
const TABS = ["*", "Inversiones", "Contratos", "Lifestyle", "Propietarios"];
const TAB_LABEL: Record<string, string> = { "*": "Todos" };

const FEAT = {
  cat: "Inversiones", tex: "t1", n: "01", href: "/blog/invertir-propiedades-colombia",
  meta: "Ene 15, 2026 · 6 min de lectura",
  title: "Las mejores formas de invertir en propiedades en Colombia en 2026",
  x: "Desde apartaestudios en Medellín hasta locales comerciales en Bogotá, te mostramos dónde está la rentabilidad real.",
};

const CARDS = [
  { cat: "Contratos", tex: "t4", n: "02", href: "/blog/verificar-contrato-arriendo", meta: "Dic 22, 2025 · 5 min", title: "Guía completa: qué verificar antes de firmar un contrato de arriendo", x: "Los 8 puntos que todo inquilino debe revisar antes de firmar. Protege tu depósito y tus derechos." },
  { cat: "Lifestyle", tex: "t6", n: "03", href: "/blog/colombia-mejor-opcion", meta: "Nov 8, 2025 · 4 min", title: "Por qué Colombia sigue siendo la mejor opción para nuevos residentes", x: "Calidad de vida, costos accesibles y un mercado inmobiliario en crecimiento constante." },
  { cat: "Propietarios", tex: "t2", n: "04", href: "/blog/preparar-apartamento-arriendo", meta: "Oct 3, 2025 · 7 min", title: "Cómo preparar tu apartamento para arrendar más rápido", x: "Staging, fotografía profesional y pricing correcto: la fórmula para arrendar en menos de 2 semanas." },
];

export default function BlogPage() {
  const [filter, setFilter] = useState("*");
  const shown = (cat: string) => filter === "*" || cat === filter;

  return (
    <div id="blogPage" className="bp-route">
      <LogoDefs />
      <div className="bp-wrap container">
        <header className="bp-head">
          <p className="fomk cp-kick">Blog</p>
          <h1>Ideas, guías y tendencias del mercado inmobiliario<span className="cp-dot">.</span></h1>
          <div className="bp-tabs">
            {TABS.map((t) => (
              <button key={t} type="button" className={filter === t ? "on" : ""} onClick={() => setFilter(t)}>
                {TAB_LABEL[t] || t}
              </button>
            ))}
          </div>
        </header>

        {/* key incluye el filtro para re-disparar la animación al filtrar */}
        <div key={filter} style={{ display: "contents" }}>
          <a className={`bp-feat bp-pop${shown(FEAT.cat) ? "" : " bp-hidden"}`} href={FEAT.href} target="_blank" rel="noopener">
            <div className={`bp-media ${FEAT.tex}`}><span className="bp-gn" aria-hidden="true">{FEAT.n}</span><span className="bp-cat">{FEAT.cat}</span></div>
            <div className="bp-fbody">
              <p className="bp-meta">{FEAT.meta}</p>
              <h2>{FEAT.title}</h2>
              <p className="bp-x">{FEAT.x}</p>
              <span className="bp-more">Leer artículo <i>→</i></span>
            </div>
          </a>

          <div className="bp-grid">
            {CARDS.map((c) => (
              <a key={c.n} className={`bp-card bp-pop${shown(c.cat) ? "" : " bp-hidden"}`} href={c.href} target="_blank" rel="noopener">
                <div className={`bp-media ${c.tex}`}><span className="bp-gn" aria-hidden="true">{c.n}</span><span className="bp-cat">{c.cat}</span></div>
                <div className="bp-body">
                  <p className="bp-meta">{c.meta}</p>
                  <h3>{c.title}</h3>
                  <p className="bp-x">{c.x}</p>
                  <span className="bp-more">Leer <i>→</i></span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
