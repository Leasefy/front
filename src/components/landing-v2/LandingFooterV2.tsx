import type React from "react";
import type { CSSProperties } from "react";
import { Inter, Inter_Tight, IBM_Plex_Mono } from "next/font/google";
import { LandingRegistroCta } from "./LandingRegistroCta";

type CSSVars = React.CSSProperties & Record<string, string | number>;

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-inter-tight" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-ibm-plex-mono" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-inter" });

/**
 * El pie de la landing, extraído de `LandingHome` para poder reusarlo.
 *
 * Vivía incrustado dentro del home —que es un port de un HTML autónomo con su
 * propio header y footer— así que el resto de la landing usaba otro pie
 * distinto: `components/layout/Footer`, azul, con boletín y un LEASEFY
 * gigante. Seis páginas públicas mostraban un cierre que no era el nuestro
 * (Nico, 2026-09-05, mirando /terminos).
 *
 * Los estilos son los del CSS de la landing (`.fstrip`, `.fgrid2`, `.fbrand`…),
 * que `LandingChrome` ya carga. Por eso este componente sólo sirve dentro del
 * chrome de la landing: montarlo en el panel saldría sin estilo.
 *
 * `#top` es fragmento especial del HTML: el navegador sube al inicio del
 * documento aunque no exista un elemento con ese id, así que «Volver arriba»
 * funciona igual en las páginas internas.
 */
export function LandingFooterV2() {
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
    <footer><div className="fstrip" aria-hidden="true"><div className="lbg"></div></div><div className="container"><div className="fgrid2"><div className="fbrand" data-reveal><span className="logo flogo"><svg viewBox="0 0 947 235"><use href="#lfLogo" /></svg></span><p>El sistema operativo inteligente para inmobiliarias: CRM, ERP y agentes AI para operar arriendos de punta a punta.</p><span className="fstatus"><span className="pingw" style={{width:'6px',height:'6px'} as CSSVars}><span className="pinga" style={{background:'rgba(52,211,153,.6)'} as CSSVars}></span><span className="pingb" style={{width:'6px',height:'6px',background:'#34d399'} as CSSVars}></span></span>Operando con normalidad</span><div className="btns"><LandingRegistroCta variant="banner" /><a className="btn odark sm" href="https://wa.me/573000000000" target="_blank" rel="noopener">Escribir por WhatsApp</a></div></div><div></div><div className="fcol" data-reveal style={{'--d':'.1s'} as CSSVars}><p className="k">Producto</p><ul><li><a href="#contacto">CRM inmobiliario</a></li><li><a href="#contacto">ERP de arriendos</a></li><li><a href="#producto">Asegurabilidad</a></li><li><a href="#producto">Matching</a></li><li><a href="#producto">Cobranza</a></li></ul></div><div className="fcol" data-reveal style={{'--d':'.18s'} as CSSVars}><p className="k">Empresa</p><ul><li><a href="/blog">Blog</a></li><li><a href="/contacto">Contacto</a></li><li><a href="mailto:hola@leasefy.com">Soporte</a></li></ul></div></div><div className="wm" id="wm" aria-hidden="true"><div></div></div><div className="fbot"><p>© 2026 Leasefy. Todos los derechos reservados. <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a></p><span className="fbr"><span>Medellín, Colombia · CRM · ERP · Agentes AI</span><a className="ftop" href="#top">Volver arriba <span>↑</span></a></span></div></div></footer>
    </div>
  );
}
