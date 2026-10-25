# Voz y tono de Leasefy

Cómo escribe Leasefy en cada rincón: pantallas, botones, errores, correos, WhatsApp y los agentes. **La misma voz en todo
lado; el tono cambia con el momento.** Quien escriba un texto nuevo —Nico, Víctor, una persona del equipo o un agente— empieza
aquí. Fuente: la identidad Cadence 2 v4 (página de revisión, sección «Voz y tono», 20-10-2026) más lo que dejaron las
revisiones de diseño de Operación y Dinero (21 y 22-10-2026). La skill `revisor-de-diseno` reprueba un texto que rompa esto.

## 1. Cuatro principios

| Principio | Qué significa | Ejemplo |
|---|---|---|
| **Claro** | Dice qué pasa y qué hacer. Una idea por frase, la acción primero. | «Faltan 2 pasos para facturar. Sigue con el documento de 3 propietarios.» |
| **Cercano** | De tú, en español de Colombia, sin jerga ni anglicismos. | «Tu inmobiliaria», nunca «el usuario». |
| **Preciso** | Con la cifra, el nombre y la fecha exactos. Nada de «algunos» o «pronto». | «Se giran $ 64.380.200 a 38 propietarios hoy a las 4:00 p. m.» |
| **Sereno** | Sin alarmas ni culpas. Lo grave se dice claro, no a gritos. | «La resolución de la DIAN vence en 12 días. Renuévala antes del 2 de noviembre.» |

## 2. Dónde · sí · no

| Dónde | Sí | No | Por qué |
|---|---|---|---|
| Botones | «Eliminar 3 borradores» · «Registrar el pago» · «Proponer el traslado de $ 1.007.135» | «Aceptar», «Enviar», «Continuar» a secas | El botón dice lo que hace, con la cifra si la hay. |
| Títulos de modal | «¿Aprobar la liquidación de octubre?» | «Confirmación» | El título es la pregunta o la acción. |
| Error de un campo | «Le falta un número: el NIT tiene 9, más el de verificación.» | «Campo inválido» | Qué pasó y cómo arreglarlo, debajo del campo. |
| Error nuestro (5xx) | «Algo falló de nuestro lado. Ya lo estamos revisando. Referencia LSF-7Q2K.» | «Error 500. Revisa tu conexión.» | «Conexión» sólo si no hubo respuesta. Nunca culpar a la persona. |
| Sin respuesta | «No hay conexión con Leasefy. Lo que llevabas quedó guardado.» | «¡Ups! Algo salió mal» | Sin «ups», sin emojis, sin signos de más. |
| Estado vacío | «Cuando un inquilino reporte un daño, Fixi lo abre aquí con fotos.» | «No hay datos» | Qué va a aparecer, quién lo trae y cómo empezar (UNA acción). |
| Éxito | «Listo: salieron las 214 cartas.» | «¡Operación exitosa!» | Sobrio y con la cifra. «Listo» y punto. |
| Lo que no se deshace | «Se borran con sus documentos y no se pueden recuperar.» | «¿Estás seguro?» | Decir qué se pierde, no preguntar si está seguro. |
| Cobranza | «Tu canon de octubre sigue pendiente. ¿Te sirve pagarlo hoy o prefieres un acuerdo?» | «Su cuenta está en mora. Evite acciones legales.» | Firme y respetuoso; ofrece una salida, nunca amenaza. |
| Descripción de pantalla | Una línea: para qué sirve. | Dos párrafos con la ley | Lo largo va en «¿Cómo funciona?». |
| Aviso | «3 cosas afectan esta cifra · Ver» | Tres franjas amarillas apiladas | Un renglón, junto a lo que afecta. |

## 3. Las palabras de Leasefy

| Se dice | No se dice | Nota |
|---|---|---|
| Inmueble | propiedad, unidad | |
| Canon | renta | Lo que se paga cada mes. |
| Inquilino · propietario | arrendatario, arrendador | Éstas, sólo en el texto del contrato. |
| Recaudo · giro · liquidación | dispersión (en frases), payout | Entra el recaudo; al propietario se le gira lo de su liquidación. |
| Mora · al día · paz y salvo | «saldo pendiente» como eufemismo | Sin eufemismos. |
| Documento | «CC» inventada, «parece un celular» | Si no se sabe el tipo, «Documento». |
| El chat · el piloto automático | «preguntas al Piloto» | Son dos cosas: en el chat se le pide algo a Ori; el piloto trabaja solo. |
| Mandato (con el propietario) · contrato (con el inquilino) | «consignación» y «contrato de consignación» mezclados | En una misma pantalla, un solo nombre para lo mismo. |
| Vence · en 9 días | SLA | |
| Tablero · lista · tarjetas | Kanban, cards, view | |
| Cargar los conceptos sugeridos | sembrar, motor, seed | |
| Pasar a jurídico | escalar, triage | |
| Calificación | score | |
| Pendientes de aplicar | «Pendiente» (singular) en un riel y plural en otro | El riel, el menú y el título dicen lo mismo. |

## 4. Formatos

| Qué | Así | Nunca |
|---|---|---|
| Plata | `$ 2.450.000` (espacio duro después de `$`, en DM Mono) | `$2450000`, `COP 2.450.000`, `-$ 770.000` |
| Negativos | `− $ 770.000` | `$ -770.000`, `-$770.000` |
| Decimales | Los mismos en toda una columna o franja | `$ 52.580.500,50` al lado de `$ 6.410.000` |
| Cero en una tabla | `—` atenuado | `$ 0` repetido en cada fila |
| Fechas en frase | «20 de octubre de 2026» · «octubre de 2026» | «2026-10», «Octubre» con mayúscula a media frase |
| Fechas en tabla | «20 oct 2026» | «20/10/2026», «dd/mm/aaaa» |
| Distancia | «en 4 meses», «hace 3 días», «vence hoy» | «En 130 días», «Hace 1.639 días» |
| Horas | «4:00 p. m.» | «16:00 hrs» |
| Porcentajes | «72,4 %» (espacio antes) | «72.4%» |
| Conteos | «1.893 contratos» (punto de miles) | «4998» |
| Mayúsculas | Sólo la inicial: «Liquidaciones de octubre». DM Mono en mayúscula sólo en rótulos cortos. | «En Progreso», «Arriendo Actual» |
| Signos | Comillas «», raya —, N.º. Sin punto en botones ni títulos. | "comillas rectas", Nº, N° |
| Identificadores | Lo que la persona reconoce: «Contrato 1686», «Pago en línea · Wompi» | UUID, «cobro-087319b9-…», ids de migración |

## 5. Los agentes

| Agente | Cómo habla |
|---|---|
| **Ori** | Orquesta. Primera persona y dice qué revisó: «Revisé los 214 contratos…». |
| **Mori** | La cobranza en la plataforma. Con el inquilino —llamadas, WhatsApp, cartas— se presenta como **Laura**. |
| **Fixi · Niti · Cuenti** | Mantenimiento, avisos y contabilidad. Dicen lo que hicieron y con qué datos. |
| **Siempre** | Lo que decide la persona se deja a la persona: el agente propone, no da por hecho. Nunca «✨ IA». |

## 6. Plantillas para copiar

| Caso | Título | Texto | Botón |
|---|---|---|---|
| Vacío | Todavía no hay {cosas}. | Cuando {quién} {haga qué}, aparece aquí. | {Acción para empezar} |
| Éxito | Listo: {qué pasó, con la cifra}. | {Dónde se ve o qué sigue}. | — |
| Confirmar | ¿{Acción} {qué}? | {Qué pasa y cuándo}. {Si se puede reversar, hasta cuándo}. | «{Acción} {qué}» |
| Destructivo | ¿Eliminar {N cosas}? | {Qué se pierde}. No se puede deshacer. | «Eliminar {N cosas}» |
| Error de un campo | — | {Qué le falta o sobra}: {la regla}. Ej.: {un ejemplo válido}. | — |
| Error nuestro | No pudimos {acción}. | Algo falló de nuestro lado. Referencia {código}. | «Reintentar» |
| Lo pendiente | Para {tarea} te faltan {N} pasos | {El que sigue}, con su porqué en una línea. | {La acción del paso} |
| Aviso | {N} cosas afectan {esta cifra} | — | «Ver» (abre un cajón) |

## 7. Lista de chequeo antes de publicar un texto

1. ¿El botón dice lo que pasa (verbo + objeto + cifra)?
2. ¿Hay alguna palabra de la columna «No se dice» o algo en inglés?
3. ¿Las cifras siguen los formatos (plata, fecha, %, miles)?
4. ¿La descripción de la pantalla cabe en una línea?
5. ¿El error dice cómo arreglarlo y no culpa a nadie?
6. ¿Se muestra algún id interno o código del sistema?
7. ¿El mismo concepto tiene un solo nombre en el riel, el título y la tabla?
