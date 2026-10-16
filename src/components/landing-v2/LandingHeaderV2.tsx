"use client";
/* eslint-disable */

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { LandingAuthCta } from "./LandingAuthCta";
import { LandingRegistroCta } from "./LandingRegistroCta";
import { useCuentaParaPublicar } from "@/components/marketplace/CuentaParaPublicar";

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
 * «Buscar inmueble» abre el marketplace publico y se le muestra a TODOS, con
 * sesion o sin ella, tambien a la inmobiliaria (Juan, Portofino, 15-10-2026:
 * «al iniciar sesión desaparece Buscar inmuebles»; antes se le escondia a la
 * inmobiliaria). Va en el nav de escritorio y en el menu movil, que en
 * telefono ES el nav.
 *
 * «Publicar inmueble» si depende de quien es. Manda el contexto activo antes
 * que el rol personal, igual que en `getUserHomeRoute`: una cuenta dual
 * parada en su agencia es una agencia. Mientras la sesion carga se trata como
 * anonimo: `useAuth()` arranca en
 * `{ user: null, isLoading: true }` en servidor y en el primer render de
 * cliente, asi que esconderlo por defecto haria parpadear el nav para todos.
 *
 * ## Scope
 *
 * Las reglas de `landing-v2.css` estan todas bajo `.lv2`, asi que quien lo use
 * fuera del grupo `(landing)` tiene que envolverlo en ese scope Y cargar la
 * hoja. `LandingChrome` hace las dos cosas.
 */
/**
 * «Ver planes» (y «Planes» en el menú del celular) se ocultan por ahora
 * (Nico, 12-10-2026: «ocultemos esto por ahora»). La sección #planes sigue en
 * el home; para volver a mostrarlos basta con poner esto en `true`.
 */
const VER_PLANES = false;

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
  const { user, isLoading, activeContext, agencyRole } = useAuth();
  // Solo cuando SABEMOS que es inmobiliaria. Ante la duda (sesion cargando,
  // anonimo, inquilino, propietario) «Publicar» va al asistente publico.
  const esInmobiliaria = !isLoading && (activeContext === "agency" || user?.role === "agency");
  // «Publicar inmueble» también para la inmobiliaria (Nico, 09-10-2026: «que el
  // menú de arriba también muestre publicar inmueble»): ella publica desde su
  // panel. Su contador o una cuenta de sólo lectura no publican: no se ofrece.
  const hrefPublicar = !esInmobiliaria
    ? "/publicar"
    : agencyRole === "CONTADOR" || agencyRole === "VIEWER"
      ? null
      : "/panel/inmobiliaria/inmuebles/nuevo";
  // Sin sesión, «Publicar inmueble» abre la cuenta ENCIMA y explica por qué (Nico, 09-10-2026).
  const { alTocar: alTocarPublicar, ventana: ventanaPublicar } = useCuentaParaPublicar(hrefPublicar ?? "/publicar");

  // «Ver planes», «Producto» y «Agentes AI» apuntan a secciones que viven en
  // el home. Desde /blog o /terminos un `#planes` pelado no lleva a ningun
  // lado: hay que ir al home Y a la seccion. En el home se dejan tal cual
  // para que el scroll suave de `initLandingFx` los siga atendiendo.
  const alHome = fxExterno ? "" : "/";

  // El menu movil se arma desde una lista para que el numerito quede derivado
  // del orden real: escondiendo un item a mano quedaba 02..07 y el menu se lee
  // roto. Los numeros son parte del diseno, no decoracion.
  const itemsMovil: { href: string; label: string; clave?: LandingHeaderV2Props["activo"] }[] = [
    { href: "/propiedades", label: "Buscar inmueble", clave: "inmuebles" },
    // Marketplace (Nico, 09-10-2026): publicar vuelve al menú público, también para la inmobiliaria.
    ...(hrefPublicar ? [{ href: hrefPublicar, label: "Publicar inmueble" }] : []),
    { href: `${alHome}#producto`, label: "Producto" },
    { href: `${alHome}#producto`, label: "Agentes AI" },
    ...(VER_PLANES ? [{ href: `${alHome}#contacto`, label: "Planes" }] : []),
    { href: "/avaluo", label: "Avalúos", clave: "avaluo" },
    { href: "/blog", label: "Blog", clave: "blog" },
    { href: "/contacto", label: "Contacto", clave: "contacto" },
  ];

  // La pastilla del menú: se desliza bajo el enlace que se señala (con o sin
  // la landing alrededor; no depende de `initLandingFx`).
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("#hdr nav.main");
    if (!nav) return;
    const pastilla = document.createElement("span");
    pastilla.className = "nav-pastilla";
    pastilla.setAttribute("aria-hidden", "true");
    nav.prepend(pastilla);
    const mover = (a: HTMLElement) => {
      pastilla.style.width = `${a.offsetWidth}px`;
      pastilla.style.transform = `translateX(${a.offsetLeft}px)`;
      pastilla.dataset.visible = "true";
    };
    const alEntrar = (e: Event) => mover(e.currentTarget as HTMLElement);
    const alSalir = () => {
      pastilla.dataset.visible = "false";
    };
    const enlaces = [...nav.querySelectorAll<HTMLElement>("a")];
    enlaces.forEach((a) => {
      a.addEventListener("mouseenter", alEntrar);
      a.addEventListener("focus", alEntrar);
    });
    nav.addEventListener("mouseleave", alSalir);
    return () => {
      enlaces.forEach((a) => {
        a.removeEventListener("mouseenter", alEntrar);
        a.removeEventListener("focus", alEntrar);
      });
      nav.removeEventListener("mouseleave", alSalir);
      pastilla.remove();
    };
  }, [hrefPublicar]);

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
    // El mega-menu de «Producto» lo abre `initLandingFx` alternando `pm-open`
    // en el <html>. Fuera de la landing ese script no corre: sin esto el
    // enlace no abre nada, y el header viejo que este reemplaza SI tenia su
    // mega-menu funcionando en /blog y /productos/*.
    const raiz = document.documentElement;
    const trigger = document.getElementById("pmTrigger");
    const cerrarProducto = () => raiz.classList.remove("pm-open");
    const alternarProducto = (e: MouseEvent) => {
      e.preventDefault();
      raiz.classList.toggle("pm-open");
    };
    const cerrarSiEsAfuera = (e: MouseEvent) => {
      if (!raiz.classList.contains("pm-open")) return;
      const donde = e.target as Element | null;
      if (donde?.closest?.("#pmenu") || donde?.closest?.("#pmTrigger")) return;
      cerrarProducto();
    };

    const conEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      cerrar();
      cerrarProducto();
    };

    menuBtn.addEventListener("click", abrir);
    closeBtn.addEventListener("click", cerrar);
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", cerrar));
    trigger?.addEventListener("click", alternarProducto);
    document.addEventListener("click", cerrarSiEsAfuera);
    document.addEventListener("keydown", conEsc);

    return () => {
      menuBtn.removeEventListener("click", abrir);
      closeBtn.removeEventListener("click", cerrar);
      menu.querySelectorAll("a").forEach((a) => a.removeEventListener("click", cerrar));
      trigger?.removeEventListener("click", alternarProducto);
      document.removeEventListener("click", cerrarSiEsAfuera);
      document.removeEventListener("keydown", conEsc);
      cerrar();
      cerrarProducto();
    };
  }, [fxExterno]);

  return (
    <>
<header id="hdr"><div className="container hrow"><a href="/" className="logo" aria-label="Leasefy — inicio"><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></a><nav className="main"><a href={`${alHome}#producto`} id="pmTrigger" data-nav="producto">Producto <i className="pm-ar" aria-hidden="true">▾</i></a><a href="/propiedades" data-nav="inmuebles" aria-current={activo === "inmuebles" ? "page" : undefined}>Buscar inmueble</a>{hrefPublicar && <a href={hrefPublicar} data-nav="publicar" onClick={alTocarPublicar}>Publicar inmueble</a>}<a href="/avaluo" data-nav="avaluo" aria-current={activo === "avaluo" ? "page" : undefined}>Avalúos</a><a href="/blog" data-nav="blog" aria-current={activo === "blog" ? "page" : undefined}>Blog</a><a href="/contacto" data-nav="contacto" aria-current={activo === "contacto" ? "page" : undefined}>Contacto</a></nav><div className="hcta">{VER_PLANES && <a className="lnk" href={`${alHome}#planes`}>Ver planes</a>}<LandingAuthCta variant="header" /><LandingRegistroCta variant="header" /></div><button className="mbtn" id="menuBtn" aria-label="Abrir menú">Menú <span className="bars"><span></span><span></span></span></button></div><div id="pmenu" aria-hidden="true"><div className="container pm-grid"><div className="pm-sys"><p className="pm-k">El sistema</p><a className="pm-big" href="/productos/crm"><span className="pm-gn" aria-hidden="true">01</span><b>CRM inmobiliario</b><span>Tu comercial de punta a punta</span><i>Ver producto →</i></a><a className="pm-big" href="/productos/erp"><span className="pm-gn" aria-hidden="true">02</span><b>ERP de arriendos</b><span>La plata en orden, sola</span><i>Ver producto →</i></a></div><div className="pm-agents"><p className="pm-k">Agentes AI</p><div className="pm-list"><a href="/productos/cobranza"><b>Cobranza</b><span>La mora se persigue sola</span></a><a href="/productos/inquilino"><b>Estudio del inquilino</b><span>Verificación en minutos</span></a><a href="/productos/avaluos"><b>Avalúos</b><span>El precio correcto</span></a><a href="/productos/conciliacion"><b>Conciliación</b><span>Cuadre contra el banco</span></a><a href="/productos/matching"><b>Matching</b><span>Opciones el mismo día</span></a><a href="/productos/asegurabilidad"><b>Asegurabilidad</b><span>Contratos protegidos</span></a></div></div><div className="pm-foot"><a href={`${alHome}#producto`}>Visión general en el home ↓</a>{VER_PLANES && <a href={`${alHome}#planes`}>Ver planes →</a>}</div></div></div></header><div className="mmenu" id="mmenu"><div className="top"><span className="logo mlogo"><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></span><button id="closeBtn" aria-label="Cerrar menú">Cerrar ✕</button></div><nav>{itemsMovil.map((it, i) => (<a key={`${it.href}-${it.label}`} href={it.href} onClick={it.href === hrefPublicar ? alTocarPublicar : undefined} aria-current={it.clave && activo === it.clave ? "page" : undefined}><span className="n">{String(i + 1).padStart(2, "0")}</span><span className="t">{it.label}</span></a>))}</nav><div className="bottom"><LandingAuthCta variant="mobile" /><LandingRegistroCta variant="mobile" />{VER_PLANES && <a className="btn outline lg" href={`${alHome}#planes`}>Ver planes</a>}</div></div>
{ventanaPublicar}
    </>
  );
}
