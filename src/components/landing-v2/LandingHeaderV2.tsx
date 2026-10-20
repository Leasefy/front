"use client";
/* eslint-disable */

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/use-auth";
import { LandingAuthCta } from "./LandingAuthCta";
import { LandingRegistroCta } from "./LandingRegistroCta";
import { useCuentaParaPublicar } from "@/components/marketplace/CuentaParaPublicar";
import { CuentaDelMarketplace, FranjaDelMarketplace, useFranjaDelMarketplace } from "./marketplace/FranjaDelMarketplace";
import "./marketplace/marketplace.css";
import { SelectorDeIdioma } from "./SelectorDeIdioma";
import { useEnlace, useTx } from "@/lib/idioma/use-idioma";

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
 * ## El marketplace primero (Nico, 15 → 16-10-2026)
 *
 * El menú va en la mono de la landing, en mayúsculas, y abre con
 * «■ Marketplace [N]» y «Publicar gratis» (antes «Buscar inmueble» y
 * «Publicar inmueble», después de «Producto»). Es el MISMO en la landing y en
 * cada página pública: «cuando entren al marketplace que no cambie la
 * disposición de los elementos en la topbar». Encima va la franja del
 * marketplace (`FranjaDelMarketplace`), que se puede cerrar.
 *
 * ## Que ve cada quien
 *
 * «Marketplace» abre el marketplace publico y se le muestra a TODOS, con
 * sesion o sin ella, tambien a la inmobiliaria (Juan, Portofino, 15-10-2026:
 * «al iniciar sesión desaparece Buscar inmuebles»; antes se le escondia a la
 * inmobiliaria). Va en el nav de escritorio y en el menu movil, que en
 * telefono ES el nav.
 *
 * «Publicar gratis» si depende de quien es. Manda el contexto activo antes
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
  const franja = useFranjaDelMarketplace();
  // ES / EN (Nico, 16-10-2026): los textos en pares y los enlaces con el idioma de la página.
  const tx = useTx();
  const enlace = useEnlace();
  const { user, isLoading, activeContext, agencyRole } = useAuth();
  // Solo cuando SABEMOS que es inmobiliaria. Ante la duda (sesion cargando,
  // anonimo, inquilino, propietario) «Publicar» va al publicador rápido.
  const esInmobiliaria = !isLoading && (activeContext === "agency" || user?.role === "agency");
  // «Publicar inmueble» también para la inmobiliaria (Nico, 09-10-2026: «que el
  // menú de arriba también muestre publicar inmueble»). Desde aquí TODOS publican
  // con el publicador rápido, también la inmobiliaria que ya usa Leasefy (Nico,
  // 20-10-2026: «el rápido es para cuando publican desde el marketplace»; dentro
  // del panel sigue el formulario de siempre). Su contador o una cuenta de sólo
  // lectura no publican: no se ofrece.
  const hrefPublicar = esInmobiliaria && (agencyRole === "CONTADOR" || agencyRole === "VIEWER") ? null : "/publica";
  // Sin sesión, «Publicar inmueble» abre la cuenta ENCIMA y explica por qué (Nico, 09-10-2026).
  const { alTocar: alTocarPublicar, ventana: ventanaPublicar } = useCuentaParaPublicar(hrefPublicar ?? "/publica");

  // «Ver planes», «Producto» y «Agentes AI» apuntan a secciones que viven en
  // el home. Desde /blog o /terminos un `#planes` pelado no lleva a ningun
  // lado: hay que ir al home Y a la seccion. En el home se dejan tal cual
  // para que el scroll suave de `initLandingFx` los siga atendiendo.
  const alHome = fxExterno ? "" : "/";

  // El menu movil se arma desde una lista para que el numerito quede derivado
  // del orden real: escondiendo un item a mano quedaba 02..07 y el menu se lee
  // roto. Los numeros son parte del diseno, no decoracion.
  const itemsMovil: { href: string; label: string; clave?: LandingHeaderV2Props["activo"] }[] = [
    { href: "/propiedades", label: tx("Marketplace", "Marketplace"), clave: "inmuebles" },
    // Marketplace (Nico, 09-10-2026): publicar vuelve al menú público, también para la inmobiliaria.
    ...(hrefPublicar ? [{ href: hrefPublicar, label: tx("Publicar gratis", "List for free") }] : []),
    { href: `${alHome}#producto`, label: tx("Producto", "Product") },
    { href: `${alHome}#producto`, label: tx("Agentes AI", "AI agents") },
    ...(VER_PLANES ? [{ href: `${alHome}#contacto`, label: tx("Planes", "Plans") }] : []),
    { href: "/avaluo", label: tx("Avalúos", "Appraisals"), clave: "avaluo" },
    { href: "/blog", label: "Blog", clave: "blog" },
    { href: "/contacto", label: tx("Contacto", "Contact"), clave: "contacto" },
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
<AnimatePresence initial={false}>{franja.visible && <FranjaDelMarketplace key="franja" hrefPublicar={hrefPublicar ?? "/publica"} alTocarPublicar={alTocarPublicar} alCerrar={franja.cerrar} />}</AnimatePresence><header id="hdr" data-franja={franja.visible || undefined} data-cerrando={franja.cerrando || undefined}><div className="container hrow"><a href={enlace("/")} className="logo" aria-label={tx("Leasefy — inicio", "Leasefy — home")}><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></a><nav className="main"><a href={enlace("/propiedades")} data-nav="inmuebles" className="mk-nav-mkt" aria-current={activo === "inmuebles" ? "page" : undefined}><i className="mk-cuadro" aria-hidden="true" />Marketplace<CuentaDelMarketplace /></a>{hrefPublicar && <a href={hrefPublicar} data-nav="publicar" onClick={alTocarPublicar}>{tx("Publicar gratis", "List for free")}</a>}<a href={enlace(`${alHome}#producto`)} id="pmTrigger" data-nav="producto">{tx("Producto", "Product")} <i className="pm-ar" aria-hidden="true">▾</i></a><a href={enlace("/avaluo")} data-nav="avaluo" aria-current={activo === "avaluo" ? "page" : undefined}>{tx("Avalúos", "Appraisals")}</a><a href={enlace("/blog")} data-nav="blog" aria-current={activo === "blog" ? "page" : undefined}>Blog</a><a href={enlace("/contacto")} data-nav="contacto" aria-current={activo === "contacto" ? "page" : undefined}>{tx("Contacto", "Contact")}</a></nav><div className="hcta"><SelectorDeIdioma />{VER_PLANES && <a className="lnk" href={enlace(`${alHome}#planes`)}>{tx("Ver planes", "See plans")}</a>}<LandingAuthCta variant="header" /><LandingRegistroCta variant="header" /></div><button className="mbtn" id="menuBtn" aria-label={tx("Abrir menú", "Open menu")}>{tx("Menú", "Menu")} <span className="bars"><span></span><span></span></span></button></div><div id="pmenu" aria-hidden="true"><div className="container pm-grid"><div className="pm-sys"><p className="pm-k">{tx("El sistema", "The system")}</p><a className="pm-big" href={enlace("/productos/crm")}><span className="pm-gn" aria-hidden="true">01</span><b>{tx("CRM inmobiliario", "Real estate CRM")}</b><span>{tx("Tu comercial de punta a punta", "Your sales, end to end")}</span><i>{tx("Ver producto →", "See product →")}</i></a><a className="pm-big" href={enlace("/productos/erp")}><span className="pm-gn" aria-hidden="true">02</span><b>{tx("ERP de arriendos", "Rental ERP")}</b><span>{tx("La plata en orden, sola", "Your money in order, on its own")}</span><i>{tx("Ver producto →", "See product →")}</i></a></div><div className="pm-agents"><p className="pm-k">{tx("Agentes AI", "AI agents")}</p><div className="pm-list"><a href={enlace("/productos/cobranza")}><b>{tx("Cobranza", "Collections")}</b><span>{tx("La mora se persigue sola", "Late rent chases itself")}</span></a><a href={enlace("/productos/inquilino")}><b>{tx("Estudio del inquilino", "Tenant screening")}</b><span>{tx("Verificación en minutos", "Verified in minutes")}</span></a><a href={enlace("/productos/avaluos")}><b>{tx("Avalúos", "Appraisals")}</b><span>{tx("El precio correcto", "The right price")}</span></a><a href={enlace("/productos/conciliacion")}><b>{tx("Conciliación", "Reconciliation")}</b><span>{tx("Cuadre contra el banco", "Matched against the bank")}</span></a><a href={enlace("/productos/matching")}><b>{tx("Matching", "Matching")}</b><span>{tx("Opciones el mismo día", "Options the same day")}</span></a><a href={enlace("/productos/asegurabilidad")}><b>{tx("Asegurabilidad", "Insurability")}</b><span>{tx("Contratos protegidos", "Protected leases")}</span></a></div></div><div className="pm-foot"><a href={enlace(`${alHome}#producto`)}>{tx("Visión general en el home ↓", "Overview on the home page ↓")}</a>{VER_PLANES && <a href={enlace(`${alHome}#planes`)}>{tx("Ver planes →", "See plans →")}</a>}</div></div></div></header><div className="mmenu" id="mmenu"><div className="top"><span className="logo mlogo"><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></span><button id="closeBtn" aria-label={tx("Cerrar menú", "Close menu")}>{tx("Cerrar ✕", "Close ✕")}</button></div><nav>{itemsMovil.map((it, i) => (<a key={`${it.href}-${it.label}`} href={enlace(it.href)} onClick={it.href === hrefPublicar ? alTocarPublicar : undefined} aria-current={it.clave && activo === it.clave ? "page" : undefined}><span className="n">{String(i + 1).padStart(2, "0")}</span><span className="t">{it.label}</span></a>))}</nav><div className="bottom"><SelectorDeIdioma /><LandingAuthCta variant="mobile" /><LandingRegistroCta variant="mobile" />{VER_PLANES && <a className="btn outline lg" href={enlace(`${alHome}#planes`)}>{tx("Ver planes", "See plans")}</a>}</div></div>
{ventanaPublicar}
    </>
  );
}
