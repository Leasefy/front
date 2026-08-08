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

### Apartaestudio — el tipo de inmueble

`propertyType.studio` deja de ser "Estudio" y pasa a **"Apartaestudio"**, que además es el
término estándar en Colombia. Con esto el choque de tres vías queda resuelto.

---

## Palabras muertas

| Muere | Por qué | Qué se usa |
|---|---|---|
| **"Pre-aprobado"** | *"pero preaprobar qué"* (Juan). Estado interno filtrado al usuario | **"En revisión"** mientras el backend siga mandando `PREAPPROVED`; el arreglo real es que deje de emitirlo |
| **"Reevaluar"** | Acción con costo real y etiqueta que nadie supo explicar | Nada — desaparece del inmueble (D10) |
| **"Aplicación"** (es) | Se lee como *app* | **"Postulación"** |
| **"Estudio"** | Nombra tres cosas | **"aprobación"** · **"evaluación"** · **"apartaestudio"** según cuál |
| **"Estúdiate ahora"** | Suena a academia | *"Conoce hasta cuánto te arrendamos"* |

---

## Deuda conocida

- El módulo de asegurabilidad vive bajo el namespace **`cotizador`** (`inmobiliaria.ai.cotizador.*`,
  `use-carrier-registry`, rutas `/ai/asegurabilidad`). Interno y ya divergido de la etiqueta.
  Renombrarlo es mecánico y toca muchos archivos: **no se hace ahora**, se anota.
- `PREAPPROVED` sigue existiendo como valor del backend en `applications.types.ts`. Acá solo se
  cambia la etiqueta; sacarlo del contrato es del lado de Víctor.
- **El panel de propietario (`panel/(landlord)`) quedó sin tocar a propósito.** Ahí
  "Pre-aprobados" es una pestaña dentro de un embudo coherente
  (Pendientes → Pre-aprobados → Aprobados) y renombrarla a "En revisión" chocaría con
  "Pendientes". Es otra audiencia y otra superficie: la reunión fue sobre la inmobiliaria.
  Decidirlo aparte, con el mismo criterio.

## Cómo se aplica

1. Toda copy nueva sale de este documento.
2. Si falta un término, se agrega acá **antes** de escribirlo en un componente.
3. Los textos viven en `src/lib/i18n/locales/{es,en}.json`, no hardcodeados.
