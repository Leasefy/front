# Vocabulario de producto — Leasefy

Fuente de verdad de **cómo se llaman las cosas** en la UI. Compañero de `DESIGN.md`:
ese dice cómo se ven, este dice cómo se llaman.

Cerrado el 2026-08-07 a partir de la reunión de módulos (Juan · Víctor · Nico).

> **Regla madre: un nombre, una cosa.** Si un concepto necesita dos palabras según quién
> lo lea, se documenta acá con las dos. Si dos conceptos comparten una palabra, uno de los
> dos se renombra. Sin excepciones.

---

## Por qué existe este documento

En la reunión, Víctor (que construyó el producto) y Juan (que opera una inmobiliaria)
discutieron cuarenta minutos qué significa "estudio". No se entendieron porque **la palabra
nombra tres cosas distintas**, y una de ellas ni siquiera salió en la conversación:

1. La consulta a las aseguradoras (¿te respaldan y hasta cuánto?)
2. Nuestro scoring propio A/B/C/D (¿cuál de estos candidatos elijo?)
3. **Un tipo de inmueble** — `propertyType.studio = "Estudio"`, o sea un apartaestudio

Un usuario en `/propiedades` filtrando por "Estudio" y un asesor en el panel abriendo
"Estudio del inquilino" están viendo la misma palabra para cosas sin relación.

---

## Los términos que quedan

### Aprobación / Asegurabilidad — la consulta a las aseguradoras

Una persona se estudia **una vez, sin propiedad**, y el resultado sirve para postularse a
todas las que quepan bajo su tope.

| Audiencia | Término | Notas |
|---|---|---|
| **Inquilino** | **"aprobación"** | Nunca "asegurabilidad" — es palabra de seguros, no de arriendo |
| Inquilino · el número | **"tope aprobado"** | *"Estás aprobado hasta $2.400.000"* |
| Inquilino · su panel | **"Mi tope de arriendo"** | "Mi aprobación" era ambiguo: en el mismo sidebar está "Mis postulaciones", **que también se aprueban**. Decir de qué es el tope lo desambigua y conserva la palabra del inquilino. Cambiado 2026-08-08 |
| Inquilino · la acción | *"Conoce hasta cuánto te arrendamos"* | **Nunca "estúdiate ahora"** — suena a academia (Nico) |
| **Agencia** | **"asegurabilidad"** | Ya establecido, la agencia sí es letrada en seguros |
| Agencia · el número | **"máximo afianzable"** | El término de Juan |
| Agencia · el envío | **"solicitud de aprobación"** | El link que se le manda al candidato |

### Evaluación — nuestro scoring A/B/C/D

Sirve para **elegir entre varios candidatos** de una misma propiedad. Es posterior a la
aprobación y solo existe del lado de la agencia.

- **"Evaluación de candidatos"** — antes "Estudio del inquilino"
- **Nunca** se le muestra al inquilino con esta palabra ni comparte pantalla con la aprobación

### Postulación — la persona se ofrece para una propiedad

**Una sola palabra: "postulación".** Muere "aplicación" en toda la UI en español: se lee
como *app* (*"no falta el que diga aplicaciones, aplicaciones web"* — Víctor).

- Inquilino: **"Mis postulaciones"** · "Ver postulación" · "Retirar postulación"
- Agencia: **"Postulaciones"** (ya estaba bien)
- En inglés `application` sigue siendo correcto — el problema es solo del español
- Los identificadores de código (`applications.service`, `ApplicationStatus`) **no cambian**:
  son contrato con el backend

### Soportes — los papeles que adjunta el candidato

Cédula, comprobante de ingresos, carta laboral, extracto bancario, desprendible de nómina.
**"Soportes"** es el término colombiano y no choca con el archivo de la agencia.

| Dónde | Término | Notas |
|---|---|---|
| Agencia · el menú | **"Soportes de candidatos"** | Antes "Documentos · revisión". Cambiado 2026-08-08 |
| Agencia · el archivo | **"Documentos"** | Documentos de propiedades, plantillas y actas de entrega |

**Por qué se renombró.** El menú tenía **dos filas llamadas "Documentos"** —una en
Administración y otra en General—, distinguidas solo por una nota al pie. Son dominios
distintos: una es una cola de trabajo sobre los papeles de una persona, la otra es el archivo
de la inmobiliaria. Se renombró la cola porque es la que tiene identidad propia; el archivo
se queda con el nombre genérico, que le calza.

⚠️ **No confundir con "soporte"** en singular, que es ayuda: eso es **"Solicitudes · PQRS"**.

### Apartaestudio — el tipo de inmueble

`propertyType.studio` deja de ser "Estudio" y pasa a **"Apartaestudio"**, que además es el
término estándar en Colombia. Con esto el choque de tres vías queda resuelto.

---

## Inmueble — la cosa. Consignación — el mandato sobre esa cosa

Había **cuatro nombres para dos pantallas**: el menú decía «Consignaciones» y el
H1 «Portafolio»; el menú decía «Inmuebles · catálogo» y el H1 «Propiedades». Y
las dos pantallas listaban lo mismo — medido el 2026-08-16: 10 consignaciones,
10 inmuebles, correspondencia 1:1, ningún huérfano de ningún lado, y el mismo
permiso (`portafolio`) protegiendo las dos.

| Palabra | Qué nombra | Dónde se ve |
|---|---|---|
| **Inmueble** | El bien: dirección, fotos, alcobas, estrato | El menú, el H1, la lista |
| **Consignación** | El **mandato** de la agencia sobre ese inmueble: comisión, fecha de contrato, término mínimo, acta de entrega | Adentro del inmueble |
| ~~Portafolio~~ | Era el H1 de «Consignaciones» | Muere como título. Sobrevive en *«retirar del portafolio»*, donde sí quiere decir algo: el conjunto de lo que administrás |
| ~~Propiedad~~ (en el panel) | Era el H1 del catálogo | Muere en el panel. Sigue viva en el marketplace público (`/propiedades`), que le habla a otra audiencia |

Dos reglas que salen de esto:

1. **Para una agencia, entrar un inmueble es siempre una consignación.** No
   existe el «inmueble suelto»: sin propietario y sin comisión no hay qué
   cobrar ni a quién liquidarle. Ya estaba escrito en
   `src/lib/inmobiliaria/flujos.ts`; ahora manda también sobre las palabras.
2. **`/panel/inmobiliaria/inmuebles/:id` es siempre un id de consignación.** Un
   mismo hueco de la URL no puede significar dos entidades.

---

## Palabras muertas

| Muere | Por qué | Qué se usa |
|---|---|---|
| **"Pre-aprobado"** | *"pero preaprobar qué"* (Juan). Estado interno filtrado al usuario. Resuelto en T-0023: el backend ya no tiene `PREAPPROVED` — no es solo la copy la que murió, el estado en sí dejó de existir | **"En revisión"** (`UNDER_REVIEW`) |
| **"Reevaluar"** | Acción con costo real y etiqueta que nadie supo explicar | Nada — desaparece del inmueble (D10) |
| **"Aplicación"** (es) | Se lee como *app* | **"Postulación"** |
| **"Estudio"** | Nombra tres cosas | **"aprobación"** · **"evaluación"** · **"apartaestudio"** según cuál |
| **"Estúdiate ahora"** | Suena a academia | *"Conoce hasta cuánto te arrendamos"* |

---

## Deuda conocida

- El módulo de asegurabilidad vive bajo el namespace **`cotizador`** (`inmobiliaria.ai.cotizador.*`,
  `use-carrier-registry`, rutas `/postulaciones/asegurabilidad`). Interno y ya divergido de la etiqueta.
  Renombrarlo es mecánico y toca muchos archivos: **no se hace ahora**, se anota.
- **El panel de propietario (`panel/(landlord)`) ya no tiene la pestaña "Pre-aprobados".**
  T-0023 quitó el estado del backend, así que el embudo (Pendientes → Pre-aprobados →
  Aprobados) que existía ahí quedó sin tercer estado que mostrar; el embudo pasa a ser
  Pendientes → Aprobados, igual que en inmobiliaria.

## Cómo se aplica

1. Toda copy nueva sale de este documento.
2. Si falta un término, se agrega acá **antes** de escribirlo en un componente.
3. Los textos viven en `src/lib/i18n/locales/{es,en}.json`, no hardcodeados.
