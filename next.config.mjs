import path from "path";
// Plain-ESM data file (not the .ts wrapper): next.config.mjs runs under
// Node with no TypeScript loader on Next.js 14.2. See
// src/lib/landing/legacy-redirects.ts for the typed re-export + rationale.
import { LEGACY_PRODUCT_REDIRECTS_DATA } from "./src/lib/landing/legacy-redirects.data.mjs";
import { RUTAS_POR_CICLO_DE_VIDA_DATA } from "./src/lib/nav/rutas-por-ciclo-de-vida.data.mjs";
import { RUTAS_UNIFICADAS_DEL_PANEL_DATA } from "./src/lib/nav/rutas-unificadas-del-panel.data.mjs";
import { CONCILIACION_EN_UN_SOLO_LUGAR_DATA } from "./src/lib/nav/conciliacion-en-un-solo-lugar.data.mjs";
import { UN_SOLO_MODULO_DE_PLATA_DATA } from "./src/lib/nav/un-solo-modulo-de-plata.data.mjs";
import { LA_SALA_DE_PAGOS_SE_FUE_DATA } from "./src/lib/nav/la-sala-de-pagos-se-fue.data.mjs";
import { LOS_NOMBRES_QUE_NO_DECIAN_NADA_DATA } from "./src/lib/nav/los-nombres-que-no-decian-nada.data.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite validar el build de producción sin matar un `next dev` que esté
  // corriendo: los dos escriben en `.next` y se pisan. Con
  // `NEXT_DIST_DIR=.next-build pnpm build` cada uno usa el suyo.
  // Por defecto no cambia nada.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // @leasefy/cadence is symlinked (file:../cadence) and resolves its own copy of
  // @radix-ui/react-accordion from ../cadence/node_modules, while this app's
  // accordion adapter (src/components/ui/accordion.tsx) uses the local copy.
  // Two module instances create two Radix contexts and crash at runtime with
  // "`Accordion` must be used within `Accordion`". Alias to a single copy.
  // REMOVE together with the temporary flags below once cadence is published.
  webpack: (config) => {
    config.resolve.alias["@radix-ui/react-accordion"] = path.resolve(
      process.cwd(),
      "node_modules/@radix-ui/react-accordion"
    );
    return config;
  },
  // `src/lib/utils/sanitize-html.ts` importa `isomorphic-dompurify`, que en el
  // servidor arrastra jsdom. jsdom YA viene en la lista de externos que trae Next
  // (`next/dist/lib/server-external-packages.json`), pero con pnpm no se puede
  // resolver desde la raíz del proyecto: es dependencia TRANSITIVA y vive bajo
  // `node_modules/.pnpm/`. El `baseResolveCheck` de Next descarta el externo cuando
  // la resolución desde la raíz no coincide con la real, así que termina
  // empaquetando jsdom en el bundle de servidor. Empaquetado, webpack reescribe
  // `__dirname` y jsdom busca su hoja de estilos por defecto en
  // `.next/browser/default-stylesheet.css`, que no existe: CUALQUIER render de
  // servidor de una ruta que importe ese módulo —abrir
  // /panel/inmobiliaria/contratos/<id> por URL directa o recargar la página—
  // moría con ENOENT y 500. Entrando por clic desde la lista no se veía, porque
  // esa es navegación de cliente.
  // `isomorphic-dompurify` SÍ es dependencia directa (resuelve desde la raíz), así
  // que marcarlo como externo del servidor pasa el chequeo y jsdom nunca entra al
  // bundle: en el servidor se carga por `require` normal desde node_modules.
  // En Next 14 la clave es `experimental.serverComponentsExternalPackages`; al
  // subir a Next 15 se llama `serverExternalPackages` (nivel raíz).
  experimental: {
    serverComponentsExternalPackages: ['isomorphic-dompurify'],
  },
  // TEMPORARY (stg-demo integration): the redesign depends on @leasefy/cadence, linked
  // locally via `file:../cadence` (no real pnpm workspace, no published tarball yet).
  // That linkage still surfaces type errors and some lint noise. We let `next build`
  // produce a runnable bundle meanwhile.
  // REMOVE both flags once @leasefy/cadence ships as a published/versioned package.
  // `tsc --noEmit` still reports the linkage-induced errors, so nothing is hidden in CI.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Google OAuth avatars (users who sign in with Google get their
      // profile photo served from googleusercontent.com)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
    ];

    // Report-only CSP in production. NOT enforcing: the app relies on Next.js
    // inline hydration, JsonLd inline scripts, and signing pages — a strict
    // enforcing CSP would break them. Report-only lets us observe violations
    // before tightening to an enforced policy later.
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Content-Security-Policy-Report-Only",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // SLICE 8 (landing-react-port): 301 the retired /productos/* taxonomy
  // (evaluacion/pagos/contratos/aplicaciones/seguro/api) to their nearest
  // equivalent in the new 8-product taxonomy. Map + rationale live in
  // src/lib/landing/legacy-redirects.ts (unit-tested); this file just
  // wires the same data into Next's redirects() (build-validated, not
  // vitest-covered). CSP/security headers above are untouched.
  // Las del panel van PRIMERO: son las que reciben enlaces guardados de
  // /portafolio y /propiedades, unificados en /inmuebles. Ver
  // src/lib/nav/rutas-unificadas-del-panel.ts para el porqué (con test).
  // La conciliación bancaria también quedó en UN solo lugar: la vieja
  // /cobros/extracto-bancario ahora vive dentro del workspace del agente. Ver
  // src/lib/nav/conciliacion-en-un-solo-lugar.ts para el porqué (con test).
  // Y la plata quedó en UN solo módulo: «Cobros» desapareció del sidebar y sus
  // pantallas viven bajo /pagos. Ver src/lib/nav/un-solo-modulo-de-plata.ts.
  async redirects() {
    return [
      // 🔴 PRIMERA de todas: las seis pantallas que dejó la Sala del agente de
      // Pagos al irse (2026-09-16). Sus fuentes son LITERALES —no tapan nada—
      // y declaran también el gemelo /ai/pagos/<x>, que si no se lo comería
      // /ai/pagos/:path* de la tabla siguiente y el salto sería doble. Ver
      // src/lib/nav/la-sala-de-pagos-se-fue.data.mjs (con test que lee ESTE
      // archivo para exigir el orden).
      ...LA_SALA_DE_PAGOS_SE_FUE_DATA,
      // Las dos pestañas del Pipeline que se renombraron el 21-09 («Calce» →
      // «Qué ofrecer», «Visitas» → «Preparar visitas»). Fuentes literales, así
      // que van arriba sin tapar nada. Ver
      // src/lib/nav/los-nombres-que-no-decian-nada.data.mjs.
      ...LOS_NOMBRES_QUE_NO_DECIAN_NADA_DATA,
      // La arquitectura por ciclo de vida (2026-09) va después: Next aplica la
      // primera regla que calza y estas son las más generales del panel. Ver
      // src/lib/nav/rutas-por-ciclo-de-vida.data.mjs (con test).
      ...RUTAS_POR_CICLO_DE_VIDA_DATA,
      ...RUTAS_UNIFICADAS_DEL_PANEL_DATA,
      ...CONCILIACION_EN_UN_SOLO_LUGAR_DATA,
      // 🔴 DESPUÉS de la conciliación, a propósito: `/cobros/extracto-bancario`
      // ya redirige al workspace de Conciliación desde la tanda anterior, y
      // `/cobros/:path*` de acá se lo comería. Ver
      // src/lib/nav/un-solo-modulo-de-plata.data.mjs (con test que lee ESTE
      // archivo para exigir el orden).
      ...UN_SOLO_MODULO_DE_PLATA_DATA,
      ...LEGACY_PRODUCT_REDIRECTS_DATA,
    ];
  },
};

export default nextConfig;
