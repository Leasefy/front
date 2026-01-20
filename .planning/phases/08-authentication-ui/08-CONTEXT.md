# Phase 8: Authentication UI - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<vision>
## How This Should Work

Una experiencia de autenticación premium que sigue el diseño Luxterra establecido en Phase 7. El usuario debe sentir que está entrando a algo especial, no a un formulario genérico.

El diseño split-layout crea impacto visual: a la izquierda una imagen de propiedad con un testimonial overlay que genera confianza, a la derecha el formulario limpio y minimalista.

Login y registro deben ser tabs que alternan suavemente. Social login prominent (Google, Apple) para facilitar el acceso rápido. Email/password como alternativa tradicional.

</vision>

<essential>
## What Must Be Nailed

- **Split-layout design** - Imagen con testimonial (izquierda), formulario (derecha) en desktop
- **NO glass effects** - Diseño limpio y minimal, siguiendo Luxterra aesthetic
- **Login/Register toggle** - Tabs que alternan entre modos suavemente
- **Social login buttons** - Google, Apple prominentes y bien diseñados
- **Email/password form** - Validación clara, estados de error elegantes
- **Responsive** - En móvil se apila, en desktop split

</essential>

<specifics>
## Specific Design Elements

**Reference Image Analysis:**
- Left panel: Property image background con overlay oscuro
- Testimonial card flotante sobre la imagen
- Right panel: Fondo claro/blanco
- Tabs "Log In" / "Sign Up" para alternar
- Social buttons: Google, Apple (styled, no genéricos)
- Divider "or continue with email"
- Email input field
- Password input field con show/hide toggle
- Submit button prominente
- Link "Forgot password?" sutil

**Color Palette (Luxterra):**
- Background: #FBFBFB (light gray)
- Cards: white
- Primary: gradient accent (existing)
- Text: dark grays, not pure black

**Typography:**
- Seguir escala establecida en Phase 7
- Headings claros, body legible

**Spacing:**
- 4px grid system
- Generous padding en formularios
- Breathing room entre elementos

</specifics>

<notes>
## Additional Context

El usuario fue muy claro: "no uses glass, busca otra opcion". El diseño debe ser sólido, limpio, minimal - no efectos de cristal/blur.

La imagen de referencia muestra un estilo sofisticado pero accesible. El testimonial overlay agrega credibilidad y humaniza la experiencia.

Este es el frontend MVP - el auth es mock (localStorage). Pero la UI debe estar lista para conectar con un backend real (Clerk, Auth.js, etc.).

Las rutas protegidas deben funcionar: el dashboard/panel debe requerir "login" para acceder.

</notes>

---

*Phase: 08-authentication-ui*
*Context gathered: 2026-01-19*
