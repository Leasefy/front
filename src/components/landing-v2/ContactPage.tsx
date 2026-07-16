"use client";

import { useState } from "react";
import LogoDefs from "./LogoDefs";
import SiteFooter from "./SiteFooter";

/**
 * ContactPage — port de la pantalla de contacto (#contactPage) del standalone a una
 * ruta real. Form controlado que compone un mailto (equivale al handler cfsend del
 * script original). Reusa las clases .cp-* de landing.css; .cp-route saca el
 * contenedor del modo overlay a flujo normal.
 */
const CHIPS = ["CRM", "ERP", "Agentes AI", "Todo el sistema"];

export default function ContactPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [inmobiliaria, setInmobiliaria] = useState("");
  const [interes, setInteres] = useState("Todo el sistema");
  const [frena, setFrena] = useState("");

  function send() {
    const body =
      `Nombre: ${nombre}\nEmail: ${email}\nInmobiliaria: ${inmobiliaria}\n` +
      `Interés: ${interes}\nQué queremos resolver: ${frena}`;
    window.location.href =
      "mailto:hola@leasefy.com?subject=" +
      encodeURIComponent("Empezar con Leasefy") +
      "&body=" +
      encodeURIComponent(body);
  }

  return (
    <div id="contactPage" className="cp-route">
      <LogoDefs />
      <div className="cp-grid container">
        <div className="cp-left">
          <p className="fomk cp-kick">
            <span className="pingw" style={{ width: 6, height: 6, marginRight: 10 }}>
              <span className="pinga" style={{ background: "rgba(52,211,153,.6)" }} />
              <span className="pingb" style={{ width: 6, height: 6, background: "#34d399" }} />
            </span>
            Contacto · Respondemos el mismo día
          </p>
          <h1>Hablemos de tu operación<span className="cp-dot">.</span></h1>
          <p className="cp-lead">Cuéntanos cómo opera tu inmobiliaria hoy y te mostramos, con tus propios casos, cómo se ve en piloto automático.</p>
          <div className="cp-ch">
            <a className="cp-chan" href="mailto:hola@leasefy.com"><span className="k">Email</span><span className="v">hola@leasefy.com</span></a>
            <a className="cp-chan" href="https://wa.me/573000000000" target="_blank" rel="noopener"><span className="k">WhatsApp</span><span className="v">+57 300 000 0000</span></a>
            <div className="cp-chan"><span className="k">Base</span><span className="v">Medellín, Colombia</span></div>
          </div>
        </div>
        <div className="cp-card">
          <div className="cp-chead"><span>Nueva conversación</span><span>L-01</span></div>
          <label className="cp-f"><span>Nombre</span><input type="text" placeholder="Tu nombre" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label className="cp-f"><span>Email</span><input type="email" placeholder="tu@inmobiliaria.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="cp-f"><span>Inmobiliaria</span><input type="text" placeholder="Nombre de tu inmobiliaria" autoComplete="organization" value={inmobiliaria} onChange={(e) => setInmobiliaria(e.target.value)} /></label>
          <div className="cp-f">
            <span>Me interesa</span>
            <div className="cp-chips">
              {CHIPS.map((c) => (
                <button key={c} type="button" className={interes === c ? "on" : ""} onClick={() => setInteres(c)}>{c}</button>
              ))}
            </div>
          </div>
          <label className="cp-f"><span>¿Qué te frena hoy?</span><textarea rows={4} placeholder="Cobranza manual, cierres eternos, propietarios sin informes…" value={frena} onChange={(e) => setFrena(e.target.value)} /></label>
          <button className="btn primary lg cp-send" onClick={send}>Enviar mensaje</button>
          <p className="cp-note">Se abre tu correo con el mensaje listo. Sin spam, sin listas.</p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
