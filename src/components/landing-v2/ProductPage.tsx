"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";
import { PRODUCTS, TEXOF } from "./products-data";
import LogoDefs from "./LogoDefs";
import SiteFooter from "./SiteFooter";
import ClosingBanner from "./ClosingBanner";

/**
 * ProductPage — port fiel de las páginas internas de producto (estilo Cohere) del
 * index.html standalone. Reemplaza el renderer imperativo `__renderProduct` + `VG`
 * por JSX declarativo desde la data (products-data.ts). Reusa las clases `.pp-*` /
 * `.vgc` de landing.css. Como es una ruta real (no el overlay `#productPage`), el
 * bloque de override en landing.css lo saca del modo overlay a flujo normal, y los
 * reveals se disparan con IntersectionObserver sobre el scroll de la ventana.
 */

// span con HTML inline (los datos traen <em>/<b>/<span class="lb">…)
function H({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ---- renderers de visualización (VG del standalone) ----
const SHV: Record<string, string> = { sys: "sh-erp", ag: "sh-agent", chat: "sh-chat" };

function VgHead({ hd }: { hd: any[] }) {
  return (
    <div className={`schead ${SHV[hd[2]] || "sh-chat"}`}>
      <span className="shl">
        <span className="adot pingw"><span className="pinga" /><span className="pingb" /></span>
        <span className="shm">{hd[0]}</span>
      </span>
      <span className="shr">{hd[1] || ""}</span>
    </div>
  );
}

function VgBody({ v }: { v: any }) {
  const d = v.d;
  switch (v.t) {
    case "rows":
      return (
        <>
          {d.r.map((rr: any[], i: number) => (
            <div className="srow" key={i}><span>{rr[0]}</span><b className={rr[2] || ""}>{rr[1]}</b></div>
          ))}
        </>
      );
    case "chat":
      return (
        <div className="pchat">
          {d.m.map((mm: any[], i: number) => (
            <div key={i} style={{ display: "contents" }}>
              <div className={`pb ${mm[0] === "out" ? "pbb" : "pba"}`}>{mm[1]}</div>
              {mm[2] ? <div className={`pmeta${mm[0] === "out" ? "" : " pml"}`}>{mm[2]}</div> : null}
            </div>
          ))}
        </div>
      );
    case "steps":
      return (
        <div className="vg-steps">
          {d.s.map((ss: any[], i: number) => (
            <div className={`st ${ss[2] || ""}`} key={i}>
              <span className="dot" />
              <div><b>{ss[0]}</b>{ss[1] ? <span>{ss[1]}</span> : null}</div>
            </div>
          ))}
        </div>
      );
    case "stat":
      return (
        <div className="vg-stat">
          <span className="big"><H html={d.big} /></span>
          <span className="lb2">{d.l}</span>
          {d.s ? <span className="sb">{d.s}</span> : null}
        </div>
      );
    case "ledger":
      return (
        <div className="vg-ledger">
          <div className="lgr lgh"><span>{d.c[0]}</span><span>{d.c[1]}</span><span>{d.c[2]}</span></div>
          {d.r.map((rr: any[], i: number) => (
            <div className="lgr" key={i}><b>{rr[0]}</b><span>{rr[1]}</span><span className={rr[3] || ""}>{rr[2]}</span></div>
          ))}
        </div>
      );
    case "doc":
      return (
        <div className="vg-doc">
          <h4>{d.t}</h4>
          <div className="dl">{d.l.map((xx: string, i: number) => <span key={i}>{xx}</span>)}</div>
        </div>
      );
    default:
      return null;
  }
}

function VgCard({ v }: { v: any }) {
  if (!v || !["rows", "chat", "steps", "stat", "ledger", "doc"].includes(v.t)) return null;
  return (
    <div className="scard vgc">
      <VgHead hd={v.hd} />
      <div className="scbody"><VgBody v={v} /></div>
      {v.st ? <span className="stamp sm">{v.st}</span> : null}
    </div>
  );
}

const SHEAD = {
  feats: { k: "Por qué importa", h: "Lo que cambia en tu operación", l: "Tres cambios que se sienten desde la primera semana de operación." },
  caps: { k: "Capacidades", h: "Qué hace por ti", l: "Lo esencial, sin letra menuda." },
  spec: { k: "Snapshot", h: "La ficha, sin adornos", l: "Los datos duros para decidir rápido — qué es, qué reemplaza y cuándo está operando." },
  steps: { k: "Puesta en marcha", h: "Así entra a operar", l: "Sin proyectos eternos: se prende por fases, contigo al volante." },
};

export default function ProductPage({ slug }: { slug: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const d = PRODUCTS[slug] || PRODUCTS.crm;
  const ptex = TEXOF[slug] || "t5";

  useEffect(() => {
    const host = rootRef.current;
    if (!host) return;
    const disposers: Array<() => void> = [];

    // Reveals de las secciones (equivale a ppReveal/ppMark, sobre scroll de ventana)
    const sel = ".pp-shead,.pp-story,.pp-cap,.pp-step,.pp-spec .sr,.pp-npanel";
    const items = Array.from(host.querySelectorAll<HTMLElement>(sel));
    items.forEach((el, i) => el.style.setProperty("--pi", `${(i % 5) * 0.06}s`));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("pin"); io.unobserve(e.target); } }),
        { rootMargin: "-8% 0px" }
      );
      items.forEach((el) => io.observe(el));
      disposers.push(() => io.disconnect());
    } else {
      items.forEach((el) => el.classList.add("pin"));
    }

    return () => { for (const dp of disposers) { try { dp(); } catch { /* noop */ } } };
  }, [slug]);

  return (
    <div id="productPage" className="pp-route" ref={rootRef}>
      <LogoDefs />

      <div className="pp-hero container">
        <div className="pp-cover" aria-hidden="true">
          <span className={`bg ${ptex}`} /><span className="cshade" /><i>{d.k}</i><b>{d.t}</b>
        </div>
        <p className="pp-eyebrow">
          <span className="fomk cp-kick" style={{ margin: 0 }}>{d.k}</span>
          <span className="pp-badge">{d.badge}</span>
        </p>
        <h1>{d.promise}<span className="cp-dot">.</span></h1>
        <p>{d.lead}</p>
        <div className="pp-ctas">
          <a className="btn primary lg" href="/landing-v2/contacto">Agendar una demo</a>
          <a className="pp-ghost" href="/landing-v2#planes">Ver planes <i>→</i></a>
        </div>
        <div className="pp-art" aria-hidden="true">
          <div className="pp-win">
            <div className="wbar">
              <span className="wt"><span className="wdots"><i /><i /><i /></span>{d.win.t}</span>
              <span className="wtag">{d.win.tag}</span>
            </div>
            <div className="wbody">{d.win.v.map((v: any, i: number) => <VgCard v={v} key={i} />)}</div>
          </div>
        </div>
      </div>

      <div className="pp-body container">
        <section className="pp-sec">
          <div className="pp-shead split">
            <div><p className="fomk">{SHEAD.feats.k}</p><h2 className="pp-h2">{SHEAD.feats.h}</h2></div>
            <p className="pp-slede">{SHEAD.feats.l}</p>
          </div>
          <div className="pp-stories">
            {d.feats.map((f2: any, fi: number) => (
              <div className={`pp-story${fi % 2 === 1 ? " alt" : ""}`} key={fi}>
                <div><p className="sk">{f2.k}</p><h3>{f2.h}</h3><p>{f2.p}</p></div>
                <div className="pp-pane"><VgCard v={f2.v} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="pp-sec">
          <div className="pp-shead center">
            <p className="fomk">{SHEAD.caps.k}</p><h2 className="pp-h2">{SHEAD.caps.h}</h2><p className="pp-slede">{SHEAD.caps.l}</p>
          </div>
          <div className="pp-caps">
            {d.caps.map((c2: any[], ci: number) => (
              <div className="pp-cap" key={ci}><i>C-0{ci + 1}</i><b>{c2[0]}</b><p>{c2[1]}</p></div>
            ))}
          </div>
        </section>

        <section className="pp-sec">
          <div className="pp-side2">
            <div className="pp-shead">
              <p className="fomk">{SHEAD.spec.k}</p><h2 className="pp-h2">{SHEAD.spec.h}</h2><p className="pp-slede">{SHEAD.spec.l}</p>
            </div>
            <div className="pp-spec">
              {d.specs.map((s5: any[], i: number) => (
                <div className="sr" key={i}><span className="sk">{s5[0]}</span><span className="sv"><H html={s5[1]} /></span></div>
              ))}
            </div>
          </div>
        </section>

        <section className="pp-sec">
          <div className="pp-shead right">
            <p className="fomk">{SHEAD.steps.k}</p><h2 className="pp-h2">{SHEAD.steps.h}</h2><p className="pp-slede">{SHEAD.steps.l}</p>
          </div>
          <div className="pp-steps">
            {d.steps.map((s6: any[], si: number) => (
              <div className="pp-step" key={si}><i>Paso 0{si + 1}</i><b>{s6[0]}</b><p>{s6[1]}</p></div>
            ))}
          </div>
        </section>
      </div>

      <div className="pp-night">
        <div className="container">
          <div className="pp-npanel">
            <span className={`bg ${ptex}`} aria-hidden="true" />
            <span className="shade" aria-hidden="true" />
            <span className="nwm" aria-hidden="true">{d.night.logs?.[0]?.[0] || ""}</span>
            <div className="ntext">
              <p className="fomk">{d.night.k}</p>
              <h2 className="pp-h2" dangerouslySetInnerHTML={{ __html: d.night.h }} />
              <p className="nq">{d.night.q}</p>
            </div>
            <div className="nlogw">
              <div className="pp-log">
                <div className="lh"><span>Registro de actividad · {d.t}</span><b>En vivo</b></div>
                {d.night.logs.map((l2: any[], i: number) => (
                  <div className="lr" key={i}><span className="lt">{l2[0]}</span><H html={l2[1]} /></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClosingBanner />
      <SiteFooter />
    </div>
  );
}
