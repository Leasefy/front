"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { getRoleHomeRoute } from "@/lib/auth/role-routes";
import { useCuentaParaPublicar } from "@/components/marketplace/CuentaParaPublicar";
import { useEnlace, useTx } from "@/lib/idioma/use-idioma";
import { CuentaDelMarketplace } from "./marketplace/FranjaDelMarketplace";
import { SelectorDeIdioma } from "./SelectorDeIdioma";
import { dmMono, hostGrotesk } from "./fuentes-de-la-home";
import "./barra-de-la-home.css";

/**
 * La barra de la landing nueva en las páginas públicas en React.
 *
 * 🔴 Nico, 27-10-2026: «cuando uno entra a otro lado que no es el home toma cosas
 * de la landing vieja… solo debe haber una landing y es la nueva, con todo lo que
 * es la landing nueva!!!». Antes estas páginas llevaban la barra vieja repintada
 * (su mega menú de «Producto» seguía siendo el viejo). Ahora es la MISMA de
 * `public/landing/index.html`: el mismo marcado (`.hdr`, `.nav`, `.pm`, `.hdr-cta`,
 * `.mbtn`, `.menu`), las mismas reglas (`barra-de-la-home.css`) y el mismo
 * comportamiento (`08-mega-menu.js` y el menú de `04-infraestructura.js`):
 *
 * - «Producto» abre al pasar el mouse, al tocar y con Enter o Espacio; flecha abajo
 *   entra a la primera opción; Escape cierra y devuelve el foco; si lo abrió el
 *   mouse, un clic lo deja fijo.
 * - En el celular, «Menú» abre la lista a pantalla completa y «Producto» se
 *   despliega adentro.
 * - El filete de abajo aparece al bajar.
 *
 * Lo que la home resuelve con `conexion.js` aquí sale de React: la sesión
 * (`useAuth`), el número del marketplace (`CuentaDelMarketplace`), el idioma
 * (`SelectorDeIdioma`) y «Publicar gratis», que sin sesión abre la cuenta encima.
 */

type Activo = "producto" | "inmuebles" | "avaluo" | "blog" | "contacto";

interface Opcion {
  href: string;
  titulo: [string, string];
  linea: [string, string];
}

const SISTEMA: (Opcion & { n: string })[] = [
  { n: "01", href: "/productos/crm", titulo: ["CRM inmobiliario", "Real estate CRM"], linea: ["Tu comercial de punta a punta", "Your sales, end to end"] },
  { n: "02", href: "/productos/erp", titulo: ["ERP de arriendos", "Rental ERP"], linea: ["La plata en orden, sola", "Your money in order, on its own"] },
];

const AGENTES: Opcion[] = [
  { href: "/productos/cobranza", titulo: ["Cobranza", "Collections"], linea: ["La mora se persigue sola", "Late rent chases itself"] },
  { href: "/productos/inquilino", titulo: ["Estudio del inquilino", "Tenant screening"], linea: ["Verificación en minutos", "Verified in minutes"] },
  { href: "/productos/avaluos", titulo: ["Avalúos", "Appraisals"], linea: ["El precio correcto", "The right price"] },
  { href: "/productos/conciliacion", titulo: ["Conciliación", "Reconciliation"], linea: ["Cuadre contra el banco", "Matched against the bank"] },
  { href: "/productos/matching", titulo: ["Matching", "Matching"], linea: ["Opciones el mismo día", "Options the same day"] },
  { href: "/productos/asegurabilidad", titulo: ["Asegurabilidad", "Insurability"], linea: ["Contratos protegidos", "Protected leases"] },
];

const PARA_QUIEN: Opcion[] = [
  { href: "/para/inmobiliarias", titulo: ["Inmobiliarias", "Agencies"], linea: ["Escala tu operación con tecnología e IA", "Scale your operation with tech and AI"] },
  { href: "/para/propietarios", titulo: ["Propietarios", "Owners"], linea: ["Arrienda tu propiedad sin comisiones", "Rent your property with no commission"] },
  { href: "/para/inquilinos", titulo: ["Inquilinos", "Tenants"], linea: ["Encuentra y aplica a propiedades verificadas", "Find and apply to verified properties"] },
  { href: "/para/agentes", titulo: ["Agentes inmobiliarios", "Real estate agents"], linea: ["Herramientas para cerrar más arriendos", "Tools to close more rentals"] },
];

function Flecha() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10l5 5 5-5" />
    </svg>
  );
}

export function BarraDeLaHome({ activo }: { activo?: Activo }) {
  const tx = useTx();
  const enlace = useEnlace();
  const { user, isAuthenticated, isLoading, confirmacionDeLaSesion, activeContext, agencyRole } = useAuth();

  const conSesion = !isLoading && isAuthenticated && Boolean(user);
  // Con una sesión por confirmar los botones guardan su lugar sin verse (no saltan al llegar la respuesta).
  const esperando = isLoading && confirmacionDeLaSesion !== "sin-confirmar";
  const esInmobiliaria = !isLoading && (activeContext === "agency" || user?.role === "agency");
  // Su contador o una cuenta de sólo lectura no publican: no se ofrece.
  const hrefPublicar = esInmobiliaria && (agencyRole === "CONTADOR" || agencyRole === "VIEWER") ? null : "/publica";
  const { alTocar: alTocarPublicar, ventana: ventanaPublicar } = useCuentaParaPublicar(hrefPublicar ?? "/publica");

  /* ── el filete al bajar ── */
  const [conFilete, setConFilete] = useState(false);
  useEffect(() => {
    const alBajar = () => setConFilete(window.scrollY > 8);
    alBajar();
    window.addEventListener("scroll", alBajar, { passive: true });
    return () => window.removeEventListener("scroll", alBajar);
  }, []);

  /* ── el menú del celular ── */
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [productoEnElMenu, setProductoEnElMenu] = useState(false);
  const mbtnRef = useRef<HTMLButtonElement>(null);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  /* ── el mega menú de «Producto» (08-mega-menu.js) ── */
  const [pmAbierto, setPmAbierto] = useState(false);
  const abiertoRef = useRef(false);
  const porMouse = useRef(false);
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pmRef = useRef<HTMLDivElement>(null);
  const pmBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const abrir = useCallback((conMouse: boolean) => {
    clearTimeout(espera.current);
    if (abiertoRef.current) {
      if (!conMouse) porMouse.current = false;
      return;
    }
    abiertoRef.current = true;
    porMouse.current = conMouse;
    setPmAbierto(true);
  }, []);

  const cerrar = useCallback((devolverFoco: boolean) => {
    clearTimeout(espera.current);
    if (!abiertoRef.current) return;
    abiertoRef.current = false;
    porMouse.current = false;
    setPmAbierto(false);
    if (devolverFoco) pmBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const conTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (abiertoRef.current) cerrar(Boolean(pmRef.current?.contains(document.activeElement)));
      setMenuAbierto((abierto) => {
        if (abierto) mbtnRef.current?.focus();
        return false;
      });
    };
    const alTocarAfuera = (e: PointerEvent) => {
      if (abiertoRef.current && !pmRef.current?.contains(e.target as Node)) cerrar(false);
    };
    document.addEventListener("keydown", conTecla);
    document.addEventListener("pointerdown", alTocarAfuera);
    return () => {
      document.removeEventListener("keydown", conTecla);
      document.removeEventListener("pointerdown", alTocarAfuera);
      clearTimeout(espera.current);
    };
  }, [cerrar]);

  const opcion = (o: Opcion, clase: string) => (
    <a className={clase} href={enlace(o.href)}>
      <b>{tx(...o.titulo)}</b>
      <span>{tx(...o.linea)}</span>
    </a>
  );

  return (
    <div
      className={`lfh ${hostGrotesk.variable} ${dmMono.variable}${menuAbierto ? " menu-abierto" : ""}`}
      data-testid="barra-de-la-home"
    >
      <header className={`hdr${conFilete ? " con-filete" : ""}`} id="hdr">
        <div className="wrap">
          <a href={enlace("/")} className="logo" aria-label={tx("Leasefy, inicio", "Leasefy, home")}>
            <svg viewBox="0 0 947 235" aria-hidden="true">
              <use href="#lfLogo" />
            </svg>
          </a>
          <nav className="nav" aria-label={tx("Principal", "Main")}>
            <a href={enlace("/propiedades")} aria-current={activo === "inmuebles" ? "page" : undefined}>
              <i aria-hidden="true" />
              Marketplace
              <CuentaDelMarketplace />
            </a>
            <div
              className={`pm${pmAbierto ? " pm-abierto" : ""}`}
              ref={pmRef}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") abrir(true);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType !== "mouse" || !porMouse.current) return;
                clearTimeout(espera.current);
                espera.current = setTimeout(() => cerrar(false), 160);
              }}
              onBlur={(e) => {
                const destino = e.relatedTarget as Node | null;
                if (abiertoRef.current && destino && !pmRef.current?.contains(destino)) cerrar(false);
              }}
            >
              <button
                type="button"
                className="pm-btn"
                ref={pmBtnRef}
                aria-expanded={pmAbierto}
                aria-controls="pmPanel"
                aria-current={activo === "producto" ? "page" : undefined}
                onClick={() => {
                  if (abiertoRef.current && porMouse.current) {
                    porMouse.current = false;
                    return;
                  }
                  if (abiertoRef.current) cerrar(false);
                  else abrir(false);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowDown") return;
                  e.preventDefault();
                  abrir(false);
                  setTimeout(() => panelRef.current?.querySelector("a")?.focus(), 0);
                }}
              >
                {tx("Producto", "Product")}
                <Flecha />
              </button>
              <div
                className="pm-panel"
                id="pmPanel"
                ref={panelRef}
                role="region"
                aria-label={tx("Producto: el sistema, los agentes y para quién es", "Product: the system, the agents and who it is for")}
                onClick={(e) => {
                  if ((e.target as Element).closest?.("a")) cerrar(false);
                }}
              >
                <div className="wrap pm-grid">
                  <div className="pm-col pm-sis">
                    <p className="pm-k">
                      <i aria-hidden="true" />
                      {tx("El sistema", "The system")}
                    </p>
                    {SISTEMA.map((o) => (
                      <a key={o.href} className="pm-big" href={enlace(o.href)}>
                        <span className="pm-n" aria-hidden="true">
                          {o.n}
                        </span>
                        <b>{tx(...o.titulo)}</b>
                        <span>{tx(...o.linea)}</span>
                        <em>{tx("Ver producto →", "See product →")}</em>
                      </a>
                    ))}
                  </div>
                  <div className="pm-col pm-ag">
                    <p className="pm-k">
                      <i aria-hidden="true" />
                      {tx("Agentes AI", "AI agents")}
                    </p>
                    <ul className="pm-lista pm-dos">
                      {AGENTES.map((o) => (
                        <li key={o.href}>{opcion(o, "pm-it")}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pm-col pm-pub">
                    <p className="pm-k">
                      <i aria-hidden="true" />
                      {tx("Para quién", "Who it is for")}
                    </p>
                    <ul className="pm-lista">
                      {PARA_QUIEN.map((o) => (
                        <li key={o.href}>{opcion(o, "pm-it")}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pm-pie">
                    <a className="lnk" href={enlace("/#producto")}>
                      {tx("Visión general en el home ↓", "Overview on the home page ↓")}
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <a href={enlace("/#planes")}>{tx("Planes", "Plans")}</a>
            <a href={enlace("/avaluo")} aria-current={activo === "avaluo" ? "page" : undefined}>
              {tx("Avalúos", "Appraisals")}
            </a>
            <a href={enlace("/contacto")} aria-current={activo === "contacto" ? "page" : undefined}>
              {tx("Contacto", "Contact")}
            </a>
          </nav>
          <div className="hdr-cta">
            <SelectorDeIdioma />
            {hrefPublicar && (
              <a className="btn btn-s btn-sm pub" href={hrefPublicar} onClick={alTocarPublicar}>
                {tx("Publicar gratis", "List for free")}
              </a>
            )}
            {conSesion && user ? (
              <a className="btn btn-p btn-sm" href={getRoleHomeRoute(user.role)}>
                {tx("Ir al panel", "Go to dashboard")}
              </a>
            ) : (
              <>
                <a className="btn btn-s btn-sm" href="/auth" data-esperando={esperando || undefined} aria-hidden={esperando || undefined} tabIndex={esperando ? -1 : undefined}>
                  {tx("Entrar", "Sign in")}
                </a>
                <a className="btn btn-p btn-sm" href="/auth?mode=register" data-esperando={esperando || undefined} aria-hidden={esperando || undefined} tabIndex={esperando ? -1 : undefined}>
                  {tx("Crear cuenta", "Create account")}
                </a>
              </>
            )}
          </div>
          <button
            type="button"
            className="mbtn"
            ref={mbtnRef}
            aria-expanded={menuAbierto}
            aria-controls="menu"
            onClick={() => setMenuAbierto((a) => !a)}
          >
            {menuAbierto ? tx("Cerrar", "Close") : tx("Menú", "Menu")}
          </button>
        </div>
      </header>

      <div className="menu" id="menu" aria-label={tx("Menú", "Menu")} data-lenis-prevent>
        <a className="it" href={enlace("/propiedades")} onClick={cerrarMenu}>
          <span>01</span>Marketplace
        </a>
        <button
          type="button"
          className="it pm-m-btn"
          aria-expanded={productoEnElMenu}
          aria-controls="pmM"
          onClick={() => setProductoEnElMenu((a) => !a)}
        >
          <span>02</span>
          {tx("Producto", "Product")}
          <Flecha />
        </button>
        <div className="pm-m" id="pmM" hidden={!productoEnElMenu}>
          <p className="pm-k">
            <i aria-hidden="true" />
            {tx("El sistema", "The system")}
          </p>
          <ul className="pm-lista">
            {SISTEMA.map((o) => (
              <li key={o.href} onClick={cerrarMenu}>
                {opcion(o, "pm-it")}
              </li>
            ))}
          </ul>
          <p className="pm-k">
            <i aria-hidden="true" />
            {tx("Agentes AI", "AI agents")}
          </p>
          <ul className="pm-lista">
            {AGENTES.map((o) => (
              <li key={o.href} onClick={cerrarMenu}>
                {opcion(o, "pm-it")}
              </li>
            ))}
          </ul>
          <p className="pm-k">
            <i aria-hidden="true" />
            {tx("Para quién", "Who it is for")}
          </p>
          <ul className="pm-lista">
            {PARA_QUIEN.map((o) => (
              <li key={o.href} onClick={cerrarMenu}>
                {opcion(o, "pm-it")}
              </li>
            ))}
          </ul>
          <a className="lnk pm-m-pie" href={enlace("/#producto")} onClick={cerrarMenu}>
            {tx("Visión general en el home ↓", "Overview on the home page ↓")}
          </a>
        </div>
        <a className="it" href={enlace("/#planes")} onClick={cerrarMenu}>
          <span>03</span>
          {tx("Planes", "Plans")}
        </a>
        <a className="it" href={enlace("/avaluo")} onClick={cerrarMenu}>
          <span>04</span>
          {tx("Avalúos", "Appraisals")}
        </a>
        <a className="it" href={enlace("/contacto")} onClick={cerrarMenu}>
          <span>05</span>
          {tx("Contacto", "Contact")}
        </a>
        <SelectorDeIdioma />
        <div className="acc">
          {conSesion && user ? (
            <a className="btn btn-p" href={getRoleHomeRoute(user.role)}>
              {tx("Ir al panel", "Go to dashboard")}
            </a>
          ) : (
            <>
              <a className="btn btn-p" href="/auth?mode=register">
                {tx("Crear cuenta", "Create account")}
              </a>
              <a className="btn btn-s" href="/auth">
                {tx("Entrar", "Sign in")}
              </a>
            </>
          )}
          {hrefPublicar && (
            <a
              className="btn btn-s"
              href={hrefPublicar}
              onClick={(e) => {
                cerrarMenu();
                alTocarPublicar(e);
              }}
            >
              {tx("Publicar gratis", "List for free")}
            </a>
          )}
        </div>
      </div>
      {ventanaPublicar}
    </div>
  );
}
