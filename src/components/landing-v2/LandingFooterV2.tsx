"use client";

import type React from "react";
import type { CSSProperties } from "react";
import { Inter, Inter_Tight, IBM_Plex_Mono } from "next/font/google";
import { LandingRegistroCta } from "./LandingRegistroCta";
import { MarcaDelPie } from "./MarcaDelPie";
import { useEnlace, useTx } from "@/lib/idioma/use-idioma";

type CSSVars = React.CSSProperties & Record<string, string | number>;

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-inter-tight" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-ibm-plex-mono" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-inter" });

/**
 * El pie de la landing, extraído de `LandingHome` para poder reusarlo.
 *
 * Vivía incrustado dentro del home —que es un port de un HTML autónomo con su
 * propio header y footer— así que el resto de la landing usaba otro pie
 * distinto (uno azul, con boletín y un LEASEFY gigante, que ya no existe).
 * Seis páginas públicas mostraban un cierre que no era el nuestro (Nico,
 * 2026-09-05, mirando /terminos).
 *
 * Los estilos son los del CSS de la landing (`.fstrip`, `.fgrid2`, `.fbrand`…),
 * que `LandingChrome` ya carga. Por eso este componente sólo sirve dentro del
 * chrome de la landing: montarlo en el panel saldría sin estilo.
 *
 * Las columnas apuntan a rutas reales (`/productos/*`), no a las anclas
 * `#producto`/`#contacto` del home: montado en /blog o /terminos, un ancla a
 * una sección que no existe en esa página no hace nada. El pie viejo que
 * reemplaza sí llevaba a las rutas, así que dejarlas en ancla era regresión.
 *
 * `#top` es fragmento especial del HTML: el navegador sube al inicio del
 * documento aunque no exista un elemento con ese id, así que «Volver arriba»
 * funciona igual en las páginas internas.
 */
interface LandingFooterV2Props {
  /** La landing corre `initLandingFx`, que revela el wordmark al hacer scroll. */
  fxExterno?: boolean;
}

/**
 * El wordmark gigante del pie. `initLandingFx` lo construía en JS letra por
 * letra y lo revelaba al entrar en pantalla; fuera del home ese script no
 * corre, así que el pie terminaba con un hueco de alto cero donde va la firma
 * de la marca — el mismo pie, menos su elemento más visible.
 *
 * Ahora las letras vienen en el markup. En el home `initLandingFx` las
 * encuentra armadas (su guarda es `if(!wm.childElementCount)`) y sólo agrega
 * `.in` al hacer scroll, así que la animación queda igual; fuera del home
 * `.in` viene puesta y se ve quieto.
 */

export function LandingFooterV2({ fxExterno = false }: LandingFooterV2Props) {
  // Los bloques `[data-reveal]` arrancan en `opacity:0` y los revela el
  // observador de `initLandingFx`. Fuera del home ese script no corre, así que
  // la marca y las dos columnas de enlaces quedaban INVISIBLES: el pie se veía
  // sólo con el wordmark y la línea de copyright. Sin fx, ya vienen reveladas.
  const rev = fxExterno ? "" : " in";
  // En /en, en inglés; los enlaces van con el idioma de la página (16-10-2026).
  const tx = useTx();
  const enlace = useEnlace();
  return (
    <div
      className={`lv2 ${interTight.variable} ${ibmPlexMono.variable} ${inter.variable}`}
      style={
        {
          "--fd": "var(--font-inter-tight)",
          "--fb": "var(--font-inter)",
          "--fm": "var(--font-ibm-plex-mono)",
        } as CSSProperties
      }
    >
    <footer><div className="fstrip" aria-hidden="true"><div className="lbg"></div></div><div className="container"><div className="fgrid2"><div className={`fbrand${rev}`} data-reveal><span className="logo flogo"><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></span><p>{tx("El sistema operativo inteligente para inmobiliarias: captación, arriendos, cobranza y agentes de IA para operar de punta a punta.", "The intelligent operating system for real estate agencies: listings, rentals, collections and AI agents to run it all end to end.")}</p><span className="fstatus"><span className="pingw" style={{width:'6px',height:'6px'} as CSSVars}><span className="pinga" style={{background:'rgba(52,211,153,.6)'} as CSSVars}></span><span className="pingb" style={{width:'6px',height:'6px',background:'#34d399'} as CSSVars}></span></span>{tx("Operando con normalidad", "All systems normal")}</span><div className="btns"><LandingRegistroCta variant="banner" /><a className="btn odark sm" href="mailto:hola@leasefy.co">{tx("Escríbenos", "Write to us")}</a></div></div><div></div><div className={`fcol${rev}`} data-reveal style={{'--d':'.1s'} as CSSVars}><p className="k">{tx("Producto", "Product")}</p><ul><li><a href={enlace("/productos/crm")}>{tx("CRM inmobiliario", "Real estate CRM")}</a></li><li><a href={enlace("/productos/erp")}>{tx("ERP de arriendos", "Rental ERP")}</a></li><li><a href={enlace("/productos/asegurabilidad")}>{tx("Asegurabilidad", "Insurability")}</a></li><li><a href={enlace("/productos/matching")}>Matching</a></li><li><a href={enlace("/productos/cobranza")}>{tx("Cobranza", "Collections")}</a></li></ul></div><div className={`fcol${rev}`} data-reveal style={{'--d':'.18s'} as CSSVars}><p className="k">{tx("Empresa", "Company")}</p><ul><li><a href={enlace("/blog")}>Blog</a></li><li><a href={enlace("/contacto")}>{tx("Contacto", "Contact")}</a></li><li><a href="mailto:hola@leasefy.co">{tx("Soporte", "Support")}</a></li></ul></div></div><MarcaDelPie /><div className="fbot"><p>© 2026 Leasefy. {tx("Todos los derechos reservados.", "All rights reserved.")} <a href={enlace("/terminos")}>{tx("Términos", "Terms")}</a> · <a href={enlace("/privacidad")}>{tx("Privacidad", "Privacy")}</a></p><span className="fbr"><span>{tx("Medellín, Colombia · Captación, arriendos y cobranza · Agentes de IA", "Medellín, Colombia · Listings, rentals and collections · AI agents")}</span><a className="ftop" href="#top">{tx("Volver arriba", "Back to top")} <span>↑</span></a></span></div></div></footer>
    </div>
  );
}
