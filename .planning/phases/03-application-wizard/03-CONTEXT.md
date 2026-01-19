# Phase 3: Application Wizard + AI Search - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<vision>
## How This Should Work

### Application Wizard (CORE)
Cuando un usuario quiere postularse a una propiedad, entra a un wizard de 6 pasos que se siente rápido y sin fricción. El usuario entiende que cada pregunta tiene un propósito - está construyendo su perfil para que el AI pueda evaluarlo justamente.

El flujo es: Personal → Empleo → Ingresos → Referencias → Documentos → Review

La subida de documentos es **rápida y minimalista** - arrastra, suelta, listo. Sin explicaciones largas ni fricción innecesaria.

Al final, ve un **resumen de todo lo enviado + qué sigue**. Sabe exactamente qué esperar.

**Crítico**: Toda la información recolectada alimenta el Risk Score AI. Si falta algo para hacer un buen scoring, se agrega. El wizard no es solo un formulario - es la base del análisis de riesgo.

### AI-Powered Property Search (ADDITION)
En `/propiedades`, el usuario puede escribir en **lenguaje natural** lo que busca:
> "Apto en Medellín, 80m2, relativamente nuevo, entre 1 y 2 millones"

Un **campo grande estilo prompt** (como ChatGPT) invita a escribir. También puede usar los filtros tradicionales - **híbrido**, ambos funcionan.

### Personalización para Usuarios Logueados
Cuando conocemos el perfil financiero del usuario:
1. **Filtro automático** - Solo ve propiedades donde califica
2. **Indicadores visuales** - Badges sutiles de "califica" / "no califica"
3. **Carrusel "Para ti"** - Arriba del grid, las mejores matches destacadas

</vision>

<essential>
## What Must Be Nailed

- **El wizard de postulación** - Flujo completo de 6 pasos, sin fricción, que recolecta todo lo necesario para el scoring
- **Documentos sin fricción** - Subida rápida, minimalista, drag & drop
- **Confirmación clara** - Resumen + próximos pasos al terminar
- **Data completa para scoring** - Cada campo tiene propósito para el risk assessment

</essential>

<specifics>
## Specific Ideas

**Wizard:**
- 6 pasos como en roadmap: Personal → Empleo → Ingresos → Referencias → Documentos → Review
- Progress indicator visible
- Document upload = drag & drop, minimalista
- Review step muestra todo antes de enviar
- Confirmación = resumen de lo enviado + explicación de qué sigue
- Form state en localStorage (puede retomar)

**AI Search:**
- Campo de input grande estilo ChatGPT en /propiedades
- Híbrido: puede escribir natural O usar filtros tradicionales
- Parsea intent y muestra resultados matching

**Personalización:**
- Carrusel "Para ti" arriba del grid con perfect matches
- Propiedades donde no califica tienen indicator sutil
- Filtro automático basado en capacidad de pago

**Scoring Data Requirements (Claude determina):**
- Personal: identidad, estabilidad, tiempo en dirección actual
- Empleo: tipo contrato, antigüedad, empresa, industria
- Ingresos: salario base + adicionales, total mensual
- Obligaciones: deudas, créditos, otros arriendos
- Referencias: arrendadores previos, laborales
- Documentos: soportes de todo lo anterior
- Historial crediticio: consulta o declaración
- Opción co-deudor/fiador si aplica

</specifics>

<notes>
## Additional Context

- El wizard es el CORE de esta fase - la búsqueda AI y personalización son importantes pero secundarias
- La experiencia debe sentirse premium, no como llenar un formulario de banco
- El usuario debe entender que cada pregunta ayuda a que el AI lo evalúe justamente
- Todo es frontend con mock - el backend (y el scoring real) lo hace otra persona

</notes>

---

*Phase: 03-application-wizard*
*Context gathered: 2026-01-19*
