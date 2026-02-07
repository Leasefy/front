# Sistema de Precios - Evaluación de Inquilinos

> Última actualización: Febrero 2026

## Resumen

Arriendo Fácil ofrece dos modelos de pricing para evaluación de inquilinos:

1. **B2C (Individuos)**: Precios fijos por evaluación o pase
2. **B2B (Inmobiliarias/Agentes)**: Precios por volumen con descuentos progresivos

---

## Precios B2C (Individuos)

### Planes Disponibles

| Plan | Precio | Validez | Ideal para |
|------|--------|---------|------------|
| **Evaluación Básica** | $24,900 COP | 1 evaluación | Propietarios con un candidato |
| **Evaluación Completa** | $39,900 COP | 1 evaluación | Máxima seguridad por candidato |
| **Arriendo Pass** | $59,900 COP | 60 días ilimitados | Inquilinos en búsqueda activa |

### Detalle de cada plan

#### Evaluación Básica ($24,900)
- Verificación de identidad
- Historial crediticio (DataCrédito)
- Score de riesgo con IA
- Reporte PDF descargable

#### Evaluación Completa ($39,900)
- Todo en Básica
- Verificación de antecedentes judiciales
- Referencias laborales verificadas
- Verificación de ingresos
- Score IA avanzado con recomendación

#### Arriendo Pass ($59,900)
- Todo en Evaluación Completa
- **Aplicaciones ilimitadas por 60 días**
- Badge "Inquilino Verificado"
- Prioridad con propietarios

---

## Precios B2B (Volumen)

### Calculadora para Vendedores

**URL**: `/pricing/empresas`

> ⚠️ Esta página NO está visible en la navegación pública. Es una herramienta interna para el equipo de ventas.

### Tabla de Precios - Evaluación Básica

| Evaluaciones/mes | Precio Unitario | Descuento | Ejemplo 50 evals |
|------------------|-----------------|-----------|------------------|
| 1-10 | $24,900 | 0% | — |
| 11-25 | $19,900 | 20% | — |
| 26-50 | $16,900 | 32% | $845,000 |
| 51-100 | $14,900 | 40% | — |
| 101-200 | $12,900 | 48% | — |
| 201+ | $9,900 | 60% | — |

### Tabla de Precios - Evaluación Completa

| Evaluaciones/mes | Precio Unitario | Descuento | Ejemplo 50 evals |
|------------------|-----------------|-----------|------------------|
| 1-10 | $39,900 | 0% | — |
| 11-25 | $34,900 | 13% | — |
| 26-50 | $29,900 | 25% | $1,495,000 |
| 51-100 | $24,900 | 38% | — |
| 101-200 | $19,900 | 50% | — |
| 201+ | $14,900 | 63% | — |

### Uso de la Calculadora

1. Ir a `/pricing/empresas`
2. Seleccionar tipo de evaluación (Básica o Completa)
3. Ajustar cantidad de evaluaciones mensuales
4. Ver precio unitario, total y ahorro
5. Clic en "Copiar cotización" para enviar al cliente

### Plan Enterprise (100+ evaluaciones)

Para clientes con más de 100 evaluaciones mensuales:
- Precio personalizado
- Facturación consolidada
- Gerente de cuenta dedicado
- Contacto: ventas@arriendofacil.co

---

## Páginas donde aparece el pricing

| Página | Ruta | Contenido |
|--------|------|-----------|
| Pricing principal | `/pricing` | Selector de tipo de usuario + planes B2C |
| Producto Evaluación | `/productos/evaluacion` | Detalle del servicio + planes B2C |
| Para Inquilinos | `/para/inquilinos` | Bento con visual de Arriendo Pass |
| Calculadora B2B | `/pricing/empresas` | Herramienta de ventas (oculta) |

---

## Archivos de código relacionados

```
src/app/pricing/page.tsx              # Página principal de precios
src/app/pricing/empresas/page.tsx     # Calculadora B2B (ventas)
src/app/productos/evaluacion/page.tsx # Página de producto evaluación
src/app/para/inquilinos/page.tsx      # Página para inquilinos (visual)
```

---

## Modelo de negocio

### ¿Quién paga?
El **inquilino/candidato** paga por su propia evaluación (modelo estándar en la industria, similar a RentSpree en USA).

### Beneficios del modelo
- **Propietarios**: Reciben candidatos pre-verificados sin costo
- **Inquilinos**: Demuestran seriedad y compromiso
- **Con Arriendo Pass**: Pagan una vez, aplican a muchas propiedades

### Comparación con competencia

| Servicio | Precio por screening | Mercado |
|----------|---------------------|---------|
| RentSpree (USA) | ~$40-50 USD (~$170K COP) | Estados Unidos |
| **Arriendo Fácil** | $24,900 - $39,900 COP | Colombia |

> Somos ~70-85% más económicos que alternativas internacionales.

---

## Contactos

- **Ventas B2B**: ventas@arriendofacil.co
- **Soporte**: info@arriendofacil.co
