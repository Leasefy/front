"use client";
/* eslint-disable */

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { LandingAuthCta } from "./LandingAuthCta";
import { LandingRegistroCta } from "./LandingRegistroCta";

/**
 * LandingHeaderV2 — el header de la landing, uno solo.
 *
 * Vivia embebido dentro del JSX gigante de `LandingHome`, asi que cualquier
 * otra pantalla que quisiera "el mismo header" terminaba con OTRO header. Eso
 * es lo que pasaba en `/propiedades`: el mega-menu viejo (`layout/Navbar`),
 * con otras rutas, otra tipografia y otra forma. Dos headers para un mismo
 * sitio son dos sitios.
 *
 * El markup es el mismo de siempre, movido tal cual (port 1:1 del standalone).
 *
 * ## Comportamiento
 *
 * En la landing lo maneja `initLandingFx` —que ademas monta el shader, los
 * reveals y los scrubbers— y por eso alli se pasa `fxExterno`. Fuera de la
 * landing no se puede llamar a `initLandingFx` (busca nodos que no existen y
 * revienta), asi que el componente se encarga solo de lo suyo: el estado
 * `scrolled`, el reveal inicial y el menu movil. Un solo dueño en cada caso.
 *
 * ## Que ve cada quien
 *
 * «Buscar inmueble» abre el marketplace publico: sirve al que busca donde
 * vivir, no al que publica. A una inmobiliaria ese enlace le ofrece el
 * inventario de la competencia dentro de su propio header, asi que no se le
 * muestra —ni en el nav de escritorio ni en el menu movil, que en telefono ES
 * el nav—. Manda el contexto activo antes que el rol personal, igual que en
 * `getUserHomeRoute`: una cuenta dual parada en su agencia es una agencia.
 *
 * Mientras la sesion carga se muestra: `useAuth()` arranca en
 * `{ user: null, isLoading: true }` en servidor y en el primer render de
 * cliente, asi que esconderlo por defecto haria parpadear el nav para todos.
 *
 * ## Scope
 *
 * Las reglas de `landing-v2.css` estan todas bajo `.lv2`, asi que quien lo use
 * fuera del grupo `(landing)` tiene que envolverlo en ese scope Y cargar la
 * hoja. `LandingChrome` hace las dos cosas.
 */
interface LandingHeaderV2Props {
  /**
   * Que enlace del nav esta activo. Se marca con `aria-current="page"` —
   * la forma que ya entienden los lectores de pantalla— y el CSS lo pinta
   * igual que el hover permanente.
   */
  activo?: "producto" | "inmuebles" | "avaluo" | "blog" | "contacto";
  /** La landing ya monta estos comportamientos desde `initLandingFx`. */
  fxExterno?: boolean;
}

export function LandingHeaderV2({ activo, fxExterno = false }: LandingHeaderV2Props) {
  const { user, isLoading, activeContext } = useAuth();
  // Solo escondemos cuando SABEMOS que es inmobiliaria. Ante la duda (sesion
  // cargando, anonimo, inquilino, propietario) el enlace se muestra.
  const esInmobiliaria = !isLoading && (activeContext === "agency" || user?.role === "agency");
  const verMarketplace = !esInmobiliaria;

  // El menu movil se arma desde una lista para que el numerito quede derivado
  // del orden real: escondiendo un item a mano quedaba 02..07 y el menu se lee
  // roto. Los numeros son parte del diseno, no decoracion.
  const itemsMovil: { href: string; label: string; clave?: LandingHeaderV2Props["activo"] }[] = [
    ...(verMarketplace
      ? [{ href: "/propiedades", label: "Buscar inmueble", clave: "inmuebles" as const }]
      : []),
    { href: "#producto", label: "Producto" },
    { href: "#producto", label: "Agentes AI" },
    { href: "#contacto", label: "Planes" },
    { href: "/avaluo", label: "Avalúos", clave: "avaluo" },
    { href: "/blog", label: "Blog", clave: "blog" },
    { href: "/contacto", label: "Contacto", clave: "contacto" },
  ];

  useEffect(() => {
    if (fxExterno) return;

    const hdr = document.getElementById("hdr");
    const menu = document.getElementById("mmenu");
    const menuBtn = document.getElementById("menuBtn");
    const closeBtn = document.getElementById("closeBtn");
    if (!hdr || !menu || !menuBtn || !closeBtn) return;

    // Fuera de la landing no hay hero oscuro detras: el header arranca y se
    // queda en su estado claro. Sin esto el texto sale blanco sobre blanco.
    hdr.classList.add("on", "scrolled");

    const abrir = () => {
      menu.classList.add("open");
      document.documentElement.classList.add("menu-open");
    };
    const cerrar = () => {
      menu.classList.remove("open");
      document.documentElement.classList.remove("menu-open");
    };
    const conEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };

    menuBtn.addEventListener("click", abrir);
    closeBtn.addEventListener("click", cerrar);
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", cerrar));
    document.addEventListener("keydown", conEsc);

    return () => {
      menuBtn.removeEventListener("click", abrir);
      closeBtn.removeEventListener("click", cerrar);
      menu.querySelectorAll("a").forEach((a) => a.removeEventListener("click", cerrar));
      document.removeEventListener("keydown", conEsc);
      cerrar();
    };
  }, [fxExterno]);

  return (
    <>
<header id="hdr"><div className="container hrow"><a href="#top" className="logo" aria-label="Leasefy — inicio"><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></a><nav className="main"><a href="#producto" id="pmTrigger" data-nav="producto">Producto <i className="pm-ar" aria-hidden="true">▾</i></a>{verMarketplace && <a href="/propiedades" data-nav="inmuebles" aria-current={activo === "inmuebles" ? "page" : undefined}>Buscar inmueble</a>}<a href="/avaluo" data-nav="avaluo" aria-current={activo === "avaluo" ? "page" : undefined}>Avalúos</a><a href="/blog" data-nav="blog" aria-current={activo === "blog" ? "page" : undefined}>Blog</a><a href="/contacto" data-nav="contacto" aria-current={activo === "contacto" ? "page" : undefined}>Contacto</a></nav><div className="hcta"><a className="lnk" href="#planes">Ver planes</a><LandingAuthCta variant="header" /><LandingRegistroCta variant="header" /></div><button className="mbtn" id="menuBtn" aria-label="Abrir menú">Menú <span className="bars"><span></span><span></span></span></button></div><div id="pmenu" aria-hidden="true"><div className="container pm-grid"><div className="pm-sys"><p className="pm-k">El sistema</p><a className="pm-big" href="/productos/crm"><span className="pm-gn" aria-hidden="true">01</span><b>CRM inmobiliario</b><span>Tu comercial de punta a punta</span><i>Ver producto →</i></a><a className="pm-big" href="/productos/erp"><span className="pm-gn" aria-hidden="true">02</span><b>ERP de arriendos</b><span>La plata en orden, sola</span><i>Ver producto →</i></a></div><div className="pm-agents"><p className="pm-k">Agentes AI</p><div className="pm-list"><a href="/productos/cobranza"><b>Cobranza</b><span>La mora se persigue sola</span></a><a href="/productos/inquilino"><b>Estudio del inquilino</b><span>Verificación en minutos</span></a><a href="/productos/avaluos"><b>Avalúos</b><span>El precio correcto</span></a><a href="/productos/conciliacion"><b>Conciliación</b><span>Cuadre contra el banco</span></a><a href="/productos/matching"><b>Matching</b><span>Opciones el mismo día</span></a><a href="/productos/asegurabilidad"><b>Asegurabilidad</b><span>Contratos protegidos</span></a></div></div><div className="pm-foot"><a href="#producto">Visión general en el home ↓</a><a href="#planes">Ver planes →</a></div></div></div></header><div className="mmenu" id="mmenu"><div className="top"><span className="logo mlogo"><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></span><button id="closeBtn" aria-label="Cerrar menú">Cerrar ✕</button></div><nav>{itemsMovil.map((it, i) => (<a key={`${it.href}-${it.label}`} href={it.href} aria-current={it.clave && activo === it.clave ? "page" : undefined}><span className="n">{String(i + 1).padStart(2, "0")}</span><span className="t">{it.label}</span></a>))}</nav><div className="bottom"><LandingAuthCta variant="mobile" /><LandingRegistroCta variant="mobile" /><a className="btn outline lg" href="#planes">Ver planes</a></div></div>
    </>
  );
}
