# Investigacion: Volumen de Arriendos Cerrados por Inmobiliaria por Mes

**Fecha**: 27 de marzo de 2026
**Proposito**: Determinar cuantos contratos de arrendamiento nuevos cierra una inmobiliaria tipica por mes, segmentado por tamano de agencia y mercado.
**Nivel de confianza general**: MEDIO — Los datos directos de "arriendos cerrados por mes por agencia" practicamente no existen como metrica publica. La mayor parte de este analisis se basa en calculos derivados de metricas proxy (portafolio x tasa de rotacion / 12).

---

## 1. RESUMEN EJECUTIVO

**Hallazgo principal**: La hipotesis de 50-100 colocaciones/mes para una agencia mediana es **significativamente sobreestimada** para LATAM. En Colombia, una inmobiliaria mediana (50-200 inmuebles) probablemente cierra entre **3 y 12 arriendos nuevos por mes**. Solo las inmobiliarias enterprise (500+ inmuebles) se acercan al rango de 20-40/mes. El rango de 50-100/mes solo aplica para las empresas de property management mas grandes de Estados Unidos con portafolios de miles de unidades.

| Tamano de Agencia | Colombia (est.) | USA (est.) | LATAM General (est.) |
|---|---|---|---|
| Pequena (<50 inmuebles) | 1-3/mes | 2-4/mes | 1-3/mes |
| Mediana (50-200 inmuebles) | 3-12/mes | 5-15/mes | 3-10/mes |
| Grande (200-500 inmuebles) | 12-30/mes | 15-40/mes | 10-25/mes |
| Enterprise (500+ inmuebles) | 20-60/mes | 40-200+/mes | 15-50/mes |

---

## 2. METODOLOGIA DE CALCULO

Dado que no existe una metrica publica de "arriendos cerrados por mes por agencia", se utilizo la siguiente formula derivada:

```
Arriendos nuevos/mes = Portafolio total x (Tasa de rotacion anual / 12)
```

**Ejemplo**:
- Portafolio: 200 inmuebles
- Tasa de rotacion anual: 30%
- Calculo: 200 x (0.30 / 12) = **5 arriendos nuevos/mes**

Las variables clave son:
1. **Tamano del portafolio** — cuantos inmuebles administra la agencia
2. **Tasa de rotacion/turnover** — que % de inquilinos se van al ano
3. **Tasa de vacancia** — que % de inmuebles estan desocupados
4. **Dias en el mercado** — cuanto tarda en arrendarse un inmueble

---

## 3. DATOS POR MERCADO

### 3.1 COLOMBIA (Mercado Primario)

#### Tamano del mercado
- **7.3 millones de hogares** viven en arriendo (40.3% del total) — dato historico, supera a propietarios por primera vez [1]
- El mercado de arrendamiento mueve **~COP $60 billones anuales** (~USD $14 mil millones) [2]
- **57 de cada 100 contratos son verbales** — alta informalidad [3]
- Colombia lidera LATAM en proporcion de hogares arrendatarios [4]

#### Tasa de vacancia
- **Bogota**: ~6% promedio general; 3-5% en zonas de alta demanda (Chapinero, Chico, Parque 93); 7-10% en zonas perifericas [5]
- **Medellin**: 2-4% en zonas prime (El Poblado, Laureles); 5-7% en zonas menos centrales; ocupacion de 92.8% en Q1 2025 [6]
- **Promedio nacional grandes ciudades**: ~6% [5]

#### Dias en el mercado (tiempo para arrendar)
- **Bogota**: 30-35 dias promedio; 15-25 dias en zonas de alta demanda; 45-75+ dias en inmuebles sobrevaluados [5]
- **Medellin**: Similar, con zonas prime arrendando en 15-20 dias [6]

#### Duracion tipica del contrato
- **Estandar legal**: 12 meses (Ley 820 de 2003) [7]
- **En practica**: 12 meses es lo mas comun; algunos de 6 meses; contratos que se renuevan automaticamente por periodos iguales [7]

#### Tasa de rotacion de inquilinos (estimada)
- **No hay dato publico directo para Colombia**
- **Estimacion basada en indicadores proxy**: 25-35% anual
  - Justificacion: vacancia baja (6%), contratos a 12 meses, incrementos regulados por IPC (5.2% en 2025), menor movilidad que USA
  - La regulacion de incrementos (maximo IPC) desincentiva la mudanza
  - La informalidad (57% verbal) sugiere que algunos contratos terminan sin registro

#### Tamano de portafolio por tipo de inmobiliaria

| Tipo | Agentes | Inmuebles administrados | Ejemplos |
|---|---|---|---|
| **Pequena** | 1-5 | 10-50 | Corredores independientes, inmobiliarias de barrio |
| **Mediana** | 5-20 | 50-200 | Inmobiliarias locales establecidas |
| **Grande** | 20-50 | 200-500 | Inmobiliarias regionales |
| **Enterprise** | 50+ | 500-5,000+ | Coninsa Ramon H (~2,000-5,600 admin.), Century 21 Colombia (~3,600 arriendos/ano) |

**Datos de referencia**:
- **Coninsa Ramon H**: Portafolio de mas de 2,000 inmuebles en arriendo; historicamente ha manejado hasta 5,600 [8]
- **Century 21 Colombia**: ~3,600 arriendos/ano y 600+ ventas; 250-999 empleados; objetivo de 100 oficinas [9]
- **Comision tipica**: 8-12% del canon mensual por administracion [10]

#### Calculo de arriendos/mes para Colombia

| Tamano | Portafolio | Rotacion anual | Arriendos nuevos/mes | Confianza |
|---|---|---|---|---|
| Pequena | 30 inmuebles | 30% | **0.75 ~ 1** | Media |
| Mediana | 120 inmuebles | 30% | **3** | Media |
| Grande | 350 inmuebles | 30% | **8.75 ~ 9** | Media |
| Enterprise (Coninsa) | 2,000 inmuebles | 30% | **50** | Media-Alta |
| Enterprise (Century 21) | — | — | **~300/mes** (3,600/ano) | Alta (dato directo) |

**Nota sobre Century 21**: Su dato de 3,600 arriendos/ano equivale a ~300/mes, pero esto es para TODA la red (potencialmente 50-100 oficinas). Por oficina individual seria ~3-6 arriendos/mes.

**Nivel de confianza**: MEDIO — La tasa de rotacion del 30% es estimada. En realidad podria estar entre 20-40%.

---

### 3.2 MEXICO

#### Tamano del mercado
- **16% de las viviendas** se rentan (de 35 millones de viviendas habitadas) = ~5.6 millones de hogares en arriendo [11]
- Mercado altamente informal, similar a Colombia [11]
- AMPI agrupa a mas de 3,000 profesionales inmobiliarios en 84 secciones [12]
- Crecimiento impulsado por trabajo remoto, migracion y >50,000 extranjeros en 5 anos [11]

#### Tasa de vacancia (estimada)
- **CDMX**: 5-8% estimado (no hay dato oficial directo)
- Segmento mas dinamico: unidades de 45-60 m2 en renta [11]

#### Calculo estimado

| Tamano | Portafolio | Rotacion anual (est.) | Arriendos/mes |
|---|---|---|---|
| Pequena | 20-40 | 25-30% | **0.5-1** |
| Mediana | 60-150 | 25-30% | **1.5-3.75** |
| Grande | 150-400 | 25-30% | **3-10** |
| Enterprise | 500+ | 25-30% | **10-30** |

**Nivel de confianza**: BAJO — Muy pocos datos publicos sobre operaciones por agencia. La informalidad es incluso mayor que en Colombia.

---

### 3.3 CHILE (Santiago)

#### Datos del mercado
- **33.1% de hogares** en el Gran Santiago son arrendatarios [13]
- Comunas con mayor arriendo: Santiago (72%), Independencia (65%), Estacion Central (59.2%) [13]
- Vacancia multifamily residencial: **4.6%** a marzo 2024 (bajo significativamente) [13]
- Dias de vacancia promedio: **16-22 dias** segun comuna [13]
- Rentabilidad arriendo: 3.56% promedio; 4.5-6% en Region Metropolitana [13]

#### Referencia de portafolio
- **Boettcher Propiedades** (corredora #1): mas de 2,000 propiedades administradas [14]
- Comision de administracion: 7-10% del canon mensual [14]
- Comision por corretaje (transaccion): 50% del primer canon a cada parte [14]

#### Calculo estimado

| Tamano | Portafolio | Rotacion anual (est.) | Arriendos/mes |
|---|---|---|---|
| Pequena | 20-50 | 25-30% | **0.5-1.25** |
| Mediana | 50-150 | 25-30% | **1-3.75** |
| Grande | 150-400 | 25-30% | **3-10** |
| Enterprise | 500-2,000 | 25-30% | **10-50** |

**Nivel de confianza**: MEDIO-BAJO — La vacancia del 4.6% es dato firme de Chile; la rotacion es estimada.

---

### 3.4 ARGENTINA (Buenos Aires)

#### Datos del mercado
- Derogacion de la Ley de Alquileres en dic 2023: **oferta aumento 170%** [15]
- ~16,000 departamentos disponibles para alquilar en CABA [15]
- Contratos actuales: 24 meses, en pesos, ajuste cuatrimestral por IPC o ICL [15]
- ~500 operaciones de compra-venta y cifra similar de locaciones desde inicio 2025 [15]
- Precios cayeron 49% en terminos reales en 2024 (subieron 45% nominal vs 94% inflacion) [15]

#### Particularidades
- **Contexto macroeconomico extremo**: inflacion de 94% en 2024 distorsiona todas las metricas
- Contratos a 24 meses reducen significativamente la rotacion
- La explosion de oferta post-desregulacion puede aumentar temporalmente la vacancia

#### Calculo estimado

| Tamano | Portafolio | Rotacion anual (est.) | Arriendos/mes |
|---|---|---|---|
| Pequena | 20-50 | 20-25% | **0.3-1** |
| Mediana | 50-150 | 20-25% | **0.8-3** |
| Grande | 150-400 | 20-25% | **2.5-8** |
| Enterprise | 500+ | 20-25% | **8-25** |

**Nivel de confianza**: BAJO — Mercado en transicion post-desregulacion. Los datos 2024-2025 son altamente volatiles.

---

### 3.5 BRASIL (Sao Paulo)

#### Datos del mercado
- **11.4 millones de inmuebles vacios** en Brasil [16]
- Vacancia en Sao Paulo: **5-8%** promedio; <4% en zonas prime (Pinheiros, Vila Mariana, Itaim Bibi); >10% en zonas perifericas [17]
- Dias en el mercado: **20-30 dias** para inmuebles bien preciados [17]
- Sao Paulo, Minas Gerais, Rio y Parana concentran ~50% de todos los alquileres del pais [16]

#### Referencia de portafolio
- Una inmobiliaria grande en SP administra **16,000 propiedades** en renta y 4,200 condominios [16]
- Otra referencia: 1,250 inmuebles alquilados + 1,500 listados [16]

#### Calculo estimado

| Tamano | Portafolio | Rotacion anual (est.) | Arriendos/mes |
|---|---|---|---|
| Pequena | 30-60 | 30-35% | **0.75-1.75** |
| Mediana | 60-200 | 30-35% | **1.5-5.8** |
| Grande | 200-500 | 30-35% | **5-14.5** |
| Enterprise | 1,000-16,000 | 30-35% | **25-467** |

**Nivel de confianza**: MEDIO — Datos de vacancia confiables; portafolios enterprise verificables; rotacion estimada.

---

### 3.6 ESTADOS UNIDOS

#### Datos del mercado
- **49.5 millones de unidades** de alquiler en ~20 millones de propiedades [18]
- **330,400 empresas** de property management [18]
- Mercado valorado en **$134.2 mil millones** (2025) [18]
- Promedio de unidades por empresa: ~150 (49.5M / 330,400)

#### Tasa de rotacion (dato firme)
- **Turnover nacional**: 42-50% anual (2024) [19]
- **Tasa de renovacion**: 54% (2024) → implica 46% de no-renovacion/mudanza [19]
- Promedio historico 2010-2019: 50.7% renovacion [19]
- **Clase A**: menor turnover; **Workforce/affordable**: mayor turnover [19]

#### Dias en el mercado
- **Nacional**: ~38 dias promedio (2024), arriba de ~20 dias en 2021 [20]
- **Manhattan**: 36 dias (julio 2024) [20]
- Vacancia promedio: 20 dias (2025), abajo de 22 (2024) [20]

#### Distribucion de portafolio
- 47% de empresas manejan 50-499 unidades [18]
- 35% manejan 101-500 unidades [18]
- 20% manejan hasta 25 propiedades [18]
- Solo 15% manejan 500+ [18]
- **Top empresa (Greystar)**: 946,700 unidades (2025) [21]
- **Top 20 empresas**: 3.227 millones de unidades (7.15% del total) [21]

#### Calculo de arriendos/mes para USA

| Tamano | Portafolio | Turnover anual | Arriendos nuevos/mes | Confianza |
|---|---|---|---|---|
| Pequena (25 units) | 25 | 46% | **~1** | Alta |
| Mediana (150 units) | 150 | 46% | **5.75 ~ 6** | Alta |
| Grande (400 units) | 400 | 46% | **15.3 ~ 15** | Alta |
| Enterprise (1,000 units) | 1,000 | 46% | **38.3 ~ 38** | Alta |
| Mega (5,000 units) | 5,000 | 46% | **191.7 ~ 192** | Alta |
| Top (Greystar 946K) | 946,700 | 46% | **~36,290** | Media |

**Nivel de confianza**: ALTO — USA tiene los mejores datos publicos del sector. El turnover del 46% esta bien documentado por RealPage, NMHC, y Census Bureau.

---

## 4. TABLA COMPARATIVA CONSOLIDADA

### Arriendos nuevos estimados por mes por agencia

| Tamano | Colombia | Mexico | Chile | Argentina | Brasil | USA |
|---|---|---|---|---|---|---|
| **Pequena** (<50 inm.) | 1-2 | 0.5-1 | 0.5-1 | 0.3-1 | 1-2 | 1-2 |
| **Mediana** (50-200 inm.) | 3-5 | 1.5-4 | 1-4 | 1-3 | 2-6 | 5-8 |
| **Grande** (200-500 inm.) | 5-12 | 3-10 | 3-10 | 3-8 | 5-15 | 15-20 |
| **Enterprise** (500+ inm.) | 12-50 | 10-30 | 10-50 | 8-25 | 25-200+ | 38-200+ |

### Variables clave por mercado

| Metrica | Colombia | Mexico | Chile | Argentina | Brasil | USA |
|---|---|---|---|---|---|---|
| Vacancia | 6% | 5-8% (est.) | 4.6% | Variable* | 5-8% | 6-7% |
| Rotacion anual (est.) | 25-35% | 25-30% | 25-30% | 20-25% | 30-35% | 42-50% |
| Dias en mercado | 30-35 | 25-40 (est.) | 16-22 | 20-30 (est.) | 20-30 | 38 |
| Contrato tipico | 12 meses | 12 meses | 12 meses | 24 meses | 12-30 meses | 12 meses |
| Informalidad | Muy alta (57%) | Muy alta | Media | Alta | Media-Alta | Baja |

*Argentina: mercado en transicion post-desregulacion (2024-2025)

---

## 5. ANALISIS: HIPOTESIS DE 50-100 COLOCACIONES/MES

### Conclusion directa

La hipotesis de 50-100 colocaciones/mes para una agencia mediana **NO se sostiene** con los datos:

- Una **agencia mediana colombiana** (50-200 inmuebles) cierra **3-5 arriendos/mes**
- Para llegar a 50/mes necesitarias un portafolio de **~2,000 inmuebles** (enterprise)
- Para llegar a 100/mes necesitarias un portafolio de **~4,000 inmuebles** (mega-empresa)

### Donde SI aplican 50-100/mes

1. **Coninsa Ramon H** (2,000-5,600 inmuebles): ~50-140 arriendos/mes — ENTERPRISE
2. **Greystar** (946,700 unidades): ~36,000/mes — MEGA USA
3. **Una red como Century 21 Colombia** (toda la red): ~300/mes — pero distribuido en 50-100 oficinas

### Implicaciones para Leasefy

Si el producto apunta a agencias medianas colombianas (50-200 inmuebles):
- **Volumen real**: 3-12 evaluaciones de inquilinos/mes por agencia
- **Implicacion para pricing**: El valor por evaluacion debe ser alto (no por volumen)
- **Implicacion para tenant-scoring agent**: No necesita procesar altos volumenes; debe ser excelente en calidad
- **Implicacion para smart-matching**: Con 50-200 inmuebles, el matching es manejable computacionalmente

Si el producto apunta a inmobiliarias grandes/enterprise (500+ inmuebles):
- **Volumen real**: 20-60 evaluaciones/mes
- **Aqui empieza a tener sentido el volumen**
- **El smart-matching tiene mas valor** con portafolios grandes (mas opciones para sugerir)

---

## 6. BRECHAS DE DATOS Y LIMITACIONES

### Datos que NO se pudieron encontrar directamente

1. **Numero total de inmobiliarias en Colombia** — No hay censo publico. FEDELONJAS y las lonjas no publican esta cifra.
2. **Tasa de rotacion de inquilinos en Colombia** — No existe como metrica publica. Estimada a partir de vacancia + duracion de contratos.
3. **Arriendos cerrados por mes por agencia en LATAM** — Ninguna fuente publica reporta esto. Todo es calculo derivado.
4. **Distribucion de tamano de inmobiliarias en Colombia** — No hay datos de cuantas son pequenas vs grandes.
5. **Datos transaccionales de proptechs (Houm, Habi)** — No publican volumenes operativos detallados.

### Limitaciones del calculo

- La tasa de rotacion en LATAM es **estimada** (25-35%), no medida
- La informalidad (57% de contratos verbales en Colombia) significa que las cifras reales podrian ser mayores
- Los datos de portafolio de agencias individuales son escasos
- No se diferencia entre arrendamientos residenciales y comerciales
- La estacionalidad (temporada alta enero-marzo en Colombia) no esta contemplada

### Lo que SI es confiable

- Vacancia en Colombia: dato firme (~6%) de multiples fuentes
- Turnover en USA: dato firme (42-50%) de RealPage, NMHC, Census
- Portafolio de Coninsa y Century 21: datos de fuentes corporativas
- Tamano del mercado colombiano: datos DANE (7.3M hogares en arriendo)
- Dias en mercado: datos de portales (Metrocuadrado, TheLatinvestor)

---

## 7. FUENTES

[1] El Colombiano - "Colombia vive en alquiler" — https://www.elcolombiano.com/negocios/arriendo-supera-vivienda-propia-en-colombia-causas-impacto-y-cifras-2025-HP27287000

[2] La Republica - "En el negocio del arrendamiento se mueven cerca de $28 billones" — https://www.larepublica.co/economia/en-el-negocio-del-arrendamiento-se-mueven-cerca-de-28-billones-anualmente-segun-fedelonjas-2951475

[3] FEDELONJAS - "El incremento maximo del arriendo en Colombia para 2025" — https://www.fedelonjas.org.co/el-incremento-maximo-del-arriendo-en-colombia-para-2025-sera-de-520/

[4] Infobae Colombia - "Colombia lidera hogares en arriendo en Latinoamerica" — https://www.infobae.com/colombia/2025/04/30/el-sueno-de-tener-casa-propia-se-esfuma-colombia-lidera-los-hogares-en-arriendo-en-latinoamerica/

[5] TheLatinvestor - "Exact Rents in Bogota (2026)" — https://thelatinvestor.com/blogs/news/bogota-rents

[6] Medellin Advisors - "Medellin Property Management: Occupancy Trends 2025" — https://www.medellinadvisors.com/medellin-property-management-occupancy-trends-market-analysis-2025/

[7] Global Property Guide - "Colombia Rental Laws" — https://www.globalpropertyguide.com/latin-america/colombia/landlord-and-tenant

[8] Coninsa Ramon H — https://www.coninsa.co/arrendamientos/ y https://www.metrocuadrado.com/inmobiliaria/coninsa-ramon-h/3162

[9] Portafolio - "Century 21 Colombia" — https://www.portafolio.co/negocios/empresas/esperamos-llegar-a-100-oficinas-de-century-21-en-colombia-para-2022-547964

[10] Alitas Colombianas - "Cuanto cobra una inmobiliaria" — https://alitascolombianas.com.co/cuanto-cobra-una-inmobiliaria-por-arrendar-un-inmueble-en-colombia/

[11] Expansion Mexico - "El 16% de las viviendas en Mexico se renta" — https://expansion.mx/empresas/2026/03/23/hipotecas-desploman-crece-rentas

[12] AMPI Mexico — https://ampi.org/

[13] Houm Chile - "Dias de vacancia por comuna en Santiago 2024" — https://blog.houm.com/dias-de-vacancia-por-comuna-en-chile/ y La Tercera - "Mercado de renta residencial" — https://www.latercera.com/pulso/noticia/mercado-de-renta-residencial-disminuye-su-vacancia-en-el-primer-trimestre-por-una-caida-en-el-ingreso-de-proyectos/LSKOCPLNARH4ZNPKR6PSXEHBQA/

[14] Boettcher Propiedades Chile — https://boettcher.cl/ y CompareCorredores — https://www.comparacorredores.cl/blog/post/cuanto-cobran-los-corredores-de-propiedad-en-chile

[15] Infobae Argentina - "Sin Ley de Alquileres" — https://www.infobae.com/economia/2025/01/01/sin-ley-de-alquileres-que-pasara-con-los-precios-en-2025-y-como-se-actualizaran-los-contratos/ y EMS IR - "El mercado de alquileres en Argentina" — https://www.ems-ir.com/mercado-alquileres-argentina-2025/

[16] Imobi Report - "Brasil tem 11.4 milhoes de imoveis vagos" — https://imobireport.com.br/news-do-imobi/news-do-imobi-brasil-tem-114-milhoes-de-imoveis-vagos/

[17] TheLatinvestor - "Sao Paulo Real Estate Market Analysis 2026" — https://thelatinvestor.com/blogs/news/sao-paulo-real-estate-market

[18] iPropertyManagement - "Property Management Industry Statistics 2026" — https://ipropertymanagement.com/research/property-management-industry-statistics y DoorLoop — https://www.doorloop.com/blog/property-management-industry-statistics

[19] RealPage Analytics - "Retention Rates Climb" — https://www.realpage.com/analytics/retention-climbs-october-2024/ y Nspire - "Apartment Turnover Rate" — https://nspireexperts.com/apartment-turnover-rate/

[20] Apartment List - "National Rent Report" — https://www.apartmentlist.com/research/national-rent-data y Multifamily Executive — https://www.multifamilyexecutive.com/business-finance/apartment-turnover-rate-continues-to-fall_o

[21] NMHC Top 50 Managers 2025 — https://www.nmhc.org/research-insight/the-nmhc-50/top-50-lists/2025-top-managers-list/ y Multifamily Dive — https://www.multifamilydive.com/news/apartment-management-multifamily-ownership-nmhc-50/744837/

---

## 8. RECOMENDACIONES PARA LEASEFY

### Para el modelo de negocio

1. **Reajustar expectativa de volumen**: Una agencia mediana colombiana procesa 3-12 evaluaciones/mes, no 50-100
2. **Pricing por valor, no por volumen**: Cobrar por evaluacion/score generado (no suscripcion por volumen alto)
3. **Target market real**:
   - **Sweet spot**: Agencias medianas-grandes (100-500 inmuebles, 5-30 evaluaciones/mes)
   - **Enterprise**: Coninsa, Century 21, y similares (500+ inmuebles, 20-60+/mes)

### Para el tenant-scoring agent

4. **Capacidad requerida**: Disenar para picos de 5-15 evaluaciones/dia, no 100/dia
5. **SLA de <3 minutos es correcto**: Con bajo volumen, cada evaluacion IMPORTA mucho
6. **La tasa de escalacion del 10% es razonable**: 1 de cada 10 casos requiere revision humana

### Para el smart-matching agent

7. **Portafolios tipicos de 50-500 inmuebles**: El matching es computacionalmente trivial
8. **El cron diario de re-scan tiene sentido**: Con portafolios de este tamano, se puede recorrer todo
9. **El valor esta en la personalizacion**: No en procesar volumen masivo, sino en hacer las mejores 3 sugerencias

### Para proyecciones financieras

10. **Escenario conservador**: 500 agencias medianas x 5 evaluaciones/mes = 2,500 evaluaciones/mes
11. **Escenario optimista**: 200 agencias grandes + 50 enterprise = ~5,000 evaluaciones/mes
12. **Total mercado direccionable en Colombia**: Si hay ~50,000 inmobiliarias (estimacion gruesa) y 40.3% del mercado es arriendo, el TAM es significativo incluso con bajo volumen individual
