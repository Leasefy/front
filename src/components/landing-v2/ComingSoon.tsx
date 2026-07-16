import Link from "next/link";

/**
 * Placeholder de las rutas internas de la landing-v2 aún no portadas
 * (producto/blog/contacto → Fase 2/3). Evita 404 en los links de nav y
 * hereda las fuentes + landing.css del layout de la sección.
 */
export default function ComingSoon({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        background: "var(--paper, #F8F7F5)",
        color: "var(--ink, #111)",
        fontFamily: "var(--fb, system-ui)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <p
          style={{
            fontFamily: "var(--fm, monospace)",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 12,
            color: "var(--blue, #1a40ff)",
            margin: 0,
          }}
        >
          {eyebrow}
        </p>
        <h1
          style={{
            fontFamily: "var(--fd, system-ui)",
            fontSize: "clamp(28px, 5vw, 44px)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: "16px 0 12px",
          }}
        >
          {title}
        </h1>
        <p style={{ opacity: 0.66, fontSize: 16, margin: "0 0 28px" }}>
          Esta pantalla se porta en la siguiente fase del rediseño. Por ahora podés volver al inicio.
        </p>
        <Link
          href="/landing-v2"
          style={{
            display: "inline-block",
            background: "var(--blue, #1a40ff)",
            color: "#fff",
            padding: "12px 22px",
            borderRadius: 999,
            fontFamily: "var(--fb, system-ui)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
