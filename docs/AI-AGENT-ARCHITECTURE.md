# Arquitectura AI-Agent de Leasefy

**Version:** 1.0
**Fecha:** 2026-02-10
**Autor:** Equipo de Producto
**Audiencia:** Desarrollador Backend
**Status:** Especificación de diseño (pre-implementación)

---

## Visión

Leasefy no es un software de administración de arriendos con features de AI.
Leasefy es un **equipo de agentes autónomos** que administra arriendos.
El usuario habla, los agentes ejecutan.

La experiencia objetivo es similar a Claude Code: el usuario tiene una conversación natural con la plataforma, y de esa conversación se disparan agentes especializados que ejecutan tareas en paralelo, se coordinan entre sí, y vuelven con resultados y decisiones pendientes.

El dashboard web existe como **vista de lo que los agentes hicieron**, no como herramienta principal de trabajo.

---

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [El Orquestador Central](#2-el-orquestador-central)
3. [Sistema de Agentes](#3-sistema-de-agentes)
4. [Memoria y Aprendizaje](#4-memoria-y-aprendizaje)
5. [Capa de Comunicación](#5-capa-de-comunicación)
6. [Flujos Clave](#6-flujos-clave)
7. [Stack Tecnológico](#7-stack-tecnológico)
8. [Modelos de Datos AI](#8-modelos-de-datos-ai)
9. [API del Orquestador](#9-api-del-orquestador)
10. [Seguridad y Permisos](#10-seguridad-y-permisos)
11. [Roadmap de Implementación](#11-roadmap-de-implementación)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CAPA DE INTERACCIÓN                          │
├────────────┬────────────┬────────────┬──────────────┬──────────────┤
│  WhatsApp  │   Web App  │   Email    │  Llamadas    │   SMS        │
│  (Twilio)  │  (Next.js) │ (SendGrid) │  (Bland.ai)  │  (Twilio)   │
└─────┬──────┴─────┬──────┴─────┬──────┴──────┬───────┴──────┬───────┘
      │            │            │             │              │
      └────────────┴────────┬───┴─────────────┴──────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GATEWAY DE MENSAJES                              │
│            (Normaliza todos los canales a un formato único)         │
│                                                                     │
│  Input:  { channel, userId, message, attachments, metadata }       │
│  Output: { intent, entities, context, priority }                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    ORQUESTADOR CENTRAL                              │
│                    (Claude + Tool Use)                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CONTEXTO COMPLETO DEL USUARIO                              │   │
│  │  • Propiedades, inquilinos, contratos, pagos, historial     │   │
│  │  • Preferencias aprendidas, patrones de decisión            │   │
│  │  • Conversaciones previas, acuerdos, reglas personalizadas  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Decide:                                                            │
│  1. Qué agentes disparar                                           │
│  2. En qué orden o en paralelo                                     │
│  3. Qué información pasarle a cada uno                             │
│  4. Cómo combinar las respuestas                                   │
│  5. Qué requiere decisión humana vs qué puede ejecutar solo       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  AGENTES ESPECIALIZADOS (Tools del Orquestador)                    │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Cobranza │ │ Pipeline │ │ Mantenim.│ │ Docs     │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Legal    │ │ Comunic. │ │ Precios  │ │ Reportes │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
│  ┌──────────┐ ┌──────────┐                                        │
│  │ Scoring  │ │ Proactivo│                                        │
│  └──────────┘ └──────────┘                                        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPA DE HERRAMIENTAS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Datos:                  Servicios externos:                        │
│  • PostgreSQL            • PSE/Nequi/Daviplata (pagos)             │
│  • Redis (cache/queues)  • DocuSign/SignNow (firmas)               │
│  • S3 (documentos)       • Google Calendar (agendamiento)          │
│  • Vector DB (memoria)   • SendGrid (email)                        │
│                          • Twilio (WhatsApp/SMS/llamadas)          │
│  Internos:               • Bland.ai (llamadas AI)                  │
│  • OCR (Claude Vision)   • DataCrédito (consulta crediticia)       │
│  • Generador de docs     • RUNT, Procuraduría (antecedentes)      │
│  • Motor de scoring      • Mapbox (geolocalización)                │
│  • Analytics engine      • PostHog (analytics producto)            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. El Orquestador Central

El orquestador NO es un chatbot con respuestas predefinidas. Es una instancia de Claude con **tool use** que tiene acceso a todas las herramientas (agentes) del sistema.

### Cómo funciona

```
Usuario dice: "Acabo de comprar un apto en Chapinero,
               2 habitaciones, quiero arrendarlo"

                         │
                         ▼

Orquestador (Claude) recibe:
├── Mensaje del usuario
├── Contexto cargado:
│   ├── Perfil del usuario (propietario, 3 propiedades actuales)
│   ├── Historial de conversaciones
│   ├── Preferencias (siempre arrienda amoblado, precio premium)
│   └── Patrones aprendidos (acepta candidatos score >75)
│
├── Tools disponibles:
│   ├── tool: crear_propiedad(datos)
│   ├── tool: generar_descripcion(propiedad)
│   ├── tool: analizar_precio_mercado(zona, tipo, habitaciones)
│   ├── tool: publicar_en_portales(propiedad_id)
│   ├── tool: agendar_servicio(tipo, propiedad_id, fecha)
│   ├── tool: generar_contrato(template, propiedad_id)
│   ├── tool: enviar_mensaje(canal, destinatario, mensaje)
│   └── ... (todos los agentes expuestos como tools)
│
└── Claude decide AUTÓNOMAMENTE:
    ├── Llamar analizar_precio_mercado("Chapinero", "apartamento", 2)
    │   → Resultado: $2.5M-$3.1M, mediana $2.8M
    │
    ├── Llamar crear_propiedad({zona: "Chapinero", ...})
    │   → Resultado: propiedad_id: "prop-047"
    │
    ├── Llamar generar_descripcion("prop-047")
    │   → Resultado: descripción optimizada para portales
    │
    ├── Llamar agendar_servicio("fotografia", "prop-047", "próximo jueves")
    │   → Resultado: agenda confirmada
    │
    ├── Llamar generar_contrato("arriendo_chapinero", "prop-047")
    │   → Resultado: borrador de contrato listo
    │
    └── Responde al usuario:
        "Listo. Creé la propiedad y la publiqué a $2.8M/mes
         (percentil 75 para Chapinero). Agenté fotógrafo para
         el jueves. El contrato base ya está listo con las
         cláusulas que usas normalmente. ¿Quieres ajustar algo?"
```

### Patrón técnico: Claude con Tool Use

```python
# Pseudocódigo del orquestador

import anthropic

client = anthropic.Anthropic()

# Definición de tools (cada agente es un tool)
AGENT_TOOLS = [
    {
        "name": "cobro_agent",
        "description": "Gestiona cobranza de arriendos. Envía recordatorios, "
                       "registra pagos, detecta moras, escala casos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["enviar_recordatorio", "registrar_pago",
                             "verificar_comprobante", "escalar_mora",
                             "estado_cobros"]
                },
                "propiedad_id": {"type": "string"},
                "inquilino_id": {"type": "string"},
                "monto": {"type": "number"},
                "comprobante_url": {"type": "string"},
            },
            "required": ["action"]
        }
    },
    {
        "name": "pipeline_agent",
        "description": "Gestiona candidatos a arrendar. Califica, agenda visitas, "
                       "mueve candidatos por etapas del pipeline.",
        "input_schema": {
            # ... definición del schema
        }
    },
    {
        "name": "mantenimiento_agent",
        "description": "Coordina reparaciones y mantenimiento preventivo. "
                       "Contacta proveedores, gestiona presupuestos.",
        "input_schema": {
            # ... definición del schema
        }
    },
    {
        "name": "documento_agent",
        "description": "Genera contratos, cartas, certificados. "
                       "Personaliza cláusulas según contexto.",
        "input_schema": {
            # ... definición del schema
        }
    },
    {
        "name": "comunicacion_agent",
        "description": "Envía mensajes por WhatsApp, email, SMS. "
                       "Puede comunicarse con inquilinos y propietarios.",
        "input_schema": {
            # ... definición del schema
        }
    },
    {
        "name": "precio_agent",
        "description": "Analiza precios de mercado, sugiere ajustes, "
                       "benchmarking de zona.",
        "input_schema": {
            # ... definición del schema
        }
    },
    {
        "name": "scoring_agent",
        "description": "Evalúa candidatos: documentos, antecedentes, "
                       "capacidad de pago, score de riesgo.",
        "input_schema": {
            # ... definición del schema
        }
    },
    {
        "name": "legal_agent",
        "description": "Gestiona procesos legales: cartas de cobro, "
                       "pre-jurídicos, terminación de contratos.",
        "input_schema": {
            # ... definición del schema
        }
    },
    {
        "name": "query_data",
        "description": "Consulta datos del sistema: propiedades, inquilinos, "
                       "pagos, contratos, historial.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query_type": {
                    "type": "string",
                    "enum": ["propiedades", "inquilinos", "pagos",
                             "contratos", "mora", "mantenimiento",
                             "pipeline", "analytics"]
                },
                "filters": {"type": "object"},
            },
            "required": ["query_type"]
        }
    },
]


def handle_user_message(user_id: str, message: str, channel: str):
    """Punto de entrada principal. Recibe mensaje, ejecuta orquestador."""

    # 1. Cargar contexto completo del usuario
    context = load_user_context(user_id)

    # 2. Construir system prompt con contexto
    system_prompt = build_system_prompt(context)

    # 3. Cargar historial de conversación
    conversation = load_conversation_history(user_id, limit=20)
    conversation.append({"role": "user", "content": message})

    # 4. Ejecutar orquestador (loop de tool use)
    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",  # o el modelo apropiado
        max_tokens=4096,
        system=system_prompt,
        tools=AGENT_TOOLS,
        messages=conversation,
    )

    # 5. Procesar tool calls en loop
    while response.stop_reason == "tool_use":
        tool_results = []

        for block in response.content:
            if block.type == "tool_use":
                # Ejecutar el agente correspondiente
                result = execute_agent(
                    agent_name=block.name,
                    input_data=block.input,
                    user_context=context,
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        # Continuar la conversación con los resultados
        conversation.append({"role": "assistant", "content": response.content})
        conversation.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=system_prompt,
            tools=AGENT_TOOLS,
            messages=conversation,
        )

    # 6. Extraer respuesta final
    final_text = extract_text_response(response)

    # 7. Guardar conversación y actualizar memoria
    save_conversation(user_id, conversation)
    update_memory(user_id, message, final_text, tool_calls_made)

    # 8. Enviar respuesta por el canal correspondiente
    send_response(user_id, channel, final_text)

    return final_text
```

### System Prompt del Orquestador

```python
def build_system_prompt(context: UserContext) -> str:
    return f"""
Eres el asistente de administración de arriendos de {context.user_name} en Leasefy.

## Tu Rol
No eres un chatbot. Eres el gerente operativo de las propiedades de {context.user_name}.
Tomas acción autónomamente cuando puedes. Solo consultas al usuario cuando necesitas
una DECISIÓN que no puedes tomar por ti mismo.

## Contexto Actual

### Propiedades ({len(context.properties)} activas)
{format_properties(context.properties)}

### Inquilinos Activos
{format_tenants(context.active_tenants)}

### Estado de Cobros (este mes)
{format_payment_status(context.current_month_payments)}

### Contratos Próximos a Vencer (90 días)
{format_upcoming_expirations(context.expiring_contracts)}

### Mantenimiento Pendiente
{format_pending_maintenance(context.maintenance_queue)}

### Pipeline de Candidatos
{format_pipeline(context.active_pipeline)}

### Preferencias Aprendidas
{format_learned_preferences(context.preferences)}
- Tono preferido: {context.communication_tone}
- Umbral de aprobación de candidatos: Score >= {context.approval_threshold}
- Política de mora: {context.late_payment_policy}
- Proveedores preferidos: {format_preferred_vendors(context.vendors)}

### Patrones Detectados
{format_patterns(context.detected_patterns)}

## Reglas de Autonomía

### Puedes hacer SIN preguntar:
- Enviar recordatorios de pago (según calendario establecido)
- Registrar pagos confirmados (cuando el comprobante es claro)
- Agendar visitas con candidatos que el pipeline acepta
- Responder consultas de inquilinos (FAQ, estado de cuenta, etc.)
- Generar reportes solicitados
- Coordinar mantenimiento menor (< $500.000 COP)

### DEBES preguntar antes de:
- Aprobar o rechazar un candidato (mostrar score y recomendación)
- Iniciar proceso legal o pre-jurídico
- Autorizar mantenimiento mayor (>= $500.000 COP)
- Modificar precio de arriendo
- Terminar o no renovar un contrato
- Cualquier decisión financiera significativa

## Comunicación
- Responde en español colombiano natural
- Sé conciso pero completo
- Cuando reportes resultados de múltiples agentes, hazlo de forma estructurada
- Si ejecutaste acciones, dile al usuario QUÉ hiciste, no solo qué encontraste
- Siempre ofrece opciones cuando hay una decisión pendiente
"""
```

---

## 3. Sistema de Agentes

Cada agente es una función que el orquestador puede llamar. Los agentes NO son instancias de Claude separadas — son funciones Python/Node que ejecutan lógica de negocio.

### 3.1 Agente de Cobranza

```
Responsabilidades:
├── Detectar vencimientos próximos (cron diario)
├── Enviar recordatorios escalonados
│   ├── 3 días antes: recordatorio amigable (WhatsApp)
│   ├── Día del vencimiento: recordatorio formal (WhatsApp + Email)
│   ├── 3 días después: aviso de mora (WhatsApp + Email)
│   └── 15 días después: escalar al orquestador → usuario decide
├── Procesar comprobantes de pago
│   ├── Recibir imagen por WhatsApp
│   ├── OCR con Claude Vision
│   ├── Validar monto, fecha, referencia
│   └── Registrar pago o pedir aclaración
├── Analizar patrones de pago por inquilino
│   └── "María paga día 5 (3 días tarde), pero siempre paga"
│   └── "Juan ha pagado cada vez más tarde los últimos 3 meses"
└── Generar reporte de estado de cobros
```

```python
# Interfaz del agente
class CobranzaAgent:

    def enviar_recordatorio(self, inquilino_id: str, tipo: str) -> dict:
        """Envía recordatorio adaptado al historial del inquilino."""
        inquilino = self.db.get_inquilino(inquilino_id)
        patron = self.memory.get_payment_pattern(inquilino_id)

        # Personalizar mensaje según patrón
        if patron.siempre_paga_tarde_pero_paga:
            tono = "amigable"
            urgencia = "baja"
        elif patron.tendencia_deterioro:
            tono = "firme"
            urgencia = "alta"
        else:
            tono = "neutral"
            urgencia = "media"

        mensaje = self.generar_mensaje(inquilino, tono, urgencia)
        canal = patron.canal_preferido or "whatsapp"

        return self.comunicacion.enviar(canal, inquilino.telefono, mensaje)

    def verificar_comprobante(self, imagen_url: str, pago_esperado: dict) -> dict:
        """Usa Claude Vision para verificar comprobante de pago."""
        resultado = claude_vision.analizar(
            imagen_url,
            prompt=f"Extrae: monto, fecha, banco, referencia. "
                   f"Compara con pago esperado: {pago_esperado}"
        )

        if resultado.coincide:
            self.db.registrar_pago(pago_esperado['id'], resultado)
            return {"status": "pago_registrado", "detalles": resultado}
        else:
            return {"status": "requiere_verificacion", "discrepancia": resultado.diferencias}

    def estado_cobros(self, periodo: str = "mes_actual") -> dict:
        """Retorna resumen de cobros para el orquestador."""
        return {
            "total_esperado": ...,
            "total_cobrado": ...,
            "pendientes": [...],
            "en_mora": [...],
            "patrones_preocupantes": [...],
        }
```

### 3.2 Agente de Pipeline (Candidatos)

```
Responsabilidades:
├── Recibir nuevas aplicaciones (web o WhatsApp)
├── Extraer datos automáticamente
│   ├── OCR de documentos (cédula, carta laboral, extractos)
│   ├── NLP de mensajes de WhatsApp
│   └── Parsing de formularios web
├── Calificar candidatos
│   ├── Score financiero (ingresos vs arriendo)
│   ├── Score documental (completitud y validez)
│   ├── Score de antecedentes (DataCrédito, RUNT, Procuraduría)
│   ├── Score de estabilidad (tiempo en empleo, historial)
│   └── Score compuesto con explicación
├── Mover candidatos automáticamente por etapas
│   ├── Aplicó → Documentos completos → En revisión →
│   │   Calificado → Visita agendada → Aprobado/Rechazado
│   └── Transiciones automáticas cuando condiciones se cumplen
├── Agendar visitas
│   └── Coordinar disponibilidad propiedad + candidato
└── Presentar candidato al usuario con recomendación
    └── "Score 87/100. Ingresos 4.2x arriendo. Recomendación: Aprobar.
         Riesgo: empresa < 2 años."
```

### 3.3 Agente de Mantenimiento

```
Responsabilidades:
├── Recibir reportes de inquilinos (texto + foto)
│   ├── Clasificar urgencia (AI: emergencia/urgente/normal/cosmético)
│   ├── Categorizar tipo (plomería, eléctrico, estructura, etc.)
│   └── Crear ticket automáticamente
├── Asignar proveedor
│   ├── Buscar en base de proveedores verificados
│   ├── Considerar: precio, rating, disponibilidad, zona
│   └── Para menor, asignar automáticamente
│   └── Para mayor, pedir autorización al propietario
├── Coordinar reparación
│   ├── Contactar proveedor
│   ├── Agendar con inquilino
│   └── Hacer seguimiento hasta cierre
├── Mantenimiento predictivo
│   ├── Analizar edad de equipos e historial
│   ├── Detectar patrones en reportes
│   └── Sugerir mantenimiento preventivo
└── Evaluar proveedores
    ├── Tracking de tiempo de respuesta
    ├── Calidad del trabajo (feedback inquilino)
    └── Costo vs mercado
```

### 3.4 Agente de Documentos

```
Responsabilidades:
├── Generar contratos
│   ├── Templates por tipo (arriendo, renovación, terminación)
│   ├── Personalizar cláusulas según contexto
│   │   └── Zona, tipo de inmueble, acuerdos previos, mascotas, etc.
│   ├── Calcular incrementos legales (IPC)
│   └── Enviar para firma digital
├── Generar certificados
│   ├── Carta de arrendamiento
│   ├── Paz y salvo
│   └── Certificado de pagos
├── Procesar documentos de candidatos
│   ├── Validar autenticidad (detección de fraude)
│   ├── Extraer datos relevantes
│   └── Verificar contra fuentes oficiales
└── Gestionar vencimientos
    ├── Detectar contratos próximos a vencer
    └── Trigger renovación automática
```

### 3.5 Agente de Comunicación

```
Responsabilidades:
├── Multi-canal
│   ├── WhatsApp (principal en Colombia)
│   ├── Email
│   ├── SMS (fallback)
│   └── Llamada AI (Bland.ai para casos especiales)
├── Personalización
│   ├── Adaptar tono según relación y contexto
│   ├── Usar canal preferido del destinatario
│   └── Respetar horarios apropiados
├── Responder a inquilinos 24/7
│   ├── FAQ automatizado
│   ├── Estado de cuenta
│   ├── Recibir reportes de mantenimiento
│   └── Escalar a humano cuando necesario
└── Gestionar hilos de conversación
    ├── Mantener contexto de la conversación
    ├── Saber cuándo un tema se cerró
    └── Hacer follow-up automático
```

### 3.6 Agente Proactivo (Background)

Este agente corre en **cron jobs** sin que nadie le diga. Genera briefings y detecta situaciones.

```
Responsabilidades:
├── Briefing diario/semanal
│   ├── Resumen de cobros
│   ├── Pipeline updates
│   ├── Mantenimiento pendiente
│   └── Decisiones que requieren atención
├── Detección de anomalías
│   ├── Inquilino que siempre pagaba puntual empezó a atrasarse
│   ├── Propiedad lleva más de X días vacía
│   ├── Precio de arriendo desalineado con mercado
│   └── Proveedor con patrón de cancelaciones
├── Sugerencias proactivas
│   ├── "Contrato vence en 60 días. ¿Renuevo?"
│   ├── "Mercado subió 8%. Sugerir aumento en renovación?"
│   ├── "Calentador tiene 9 años. ¿Reemplazo preventivo?"
│   └── "Fotos profesionales reducen tiempo vacío 40%"
└── Ejecución autónoma (dentro de reglas)
    ├── Enviar recordatorios programados
    ├── Mover pipeline candidatos con docs completos
    └── Asignar mantenimiento menor a proveedor
```

---

## 4. Memoria y Aprendizaje

El sistema tiene 3 niveles de memoria:

### 4.1 Memoria de Corto Plazo (Conversación)

```
Almacén:   Redis / PostgreSQL
Duración:  Sesión activa + últimas 20 interacciones
Contenido: Mensajes, contexto inmediato, tool calls recientes
Uso:       El orquestador la recibe como messages[] en cada llamada
```

### 4.2 Memoria de Mediano Plazo (Resúmenes)

```
Almacén:   PostgreSQL
Duración:  Permanente, comprimida periódicamente
Contenido: Resúmenes de conversaciones pasadas, decisiones tomadas,
           acuerdos con inquilinos, preferencias expresadas
Uso:       Se inyecta en el system prompt del orquestador
```

```python
# Ejemplo de resumen almacenado
{
    "user_id": "user-001",
    "type": "decision_summary",
    "date": "2026-01-15",
    "content": "Usuario decidió no renovar contrato con Pedro (inquilino-023) "
               "porque tuvo 4 moras en 12 meses. Prefiere buscar nuevo inquilino "
               "aunque implique 1-2 meses de vacancia. Política: no tolera más "
               "de 2 moras por año.",
    "tags": ["politica_mora", "inquilino-023", "renovacion"],
    "learned_rule": {
        "trigger": "inquilino con >2 moras/año",
        "action": "recomendar no renovar",
        "confidence": 0.8
    }
}
```

### 4.3 Memoria de Largo Plazo (Patrones y Conocimiento)

```
Almacén:   Vector DB (Pinecone / pgvector)
Duración:  Permanente
Contenido: Patrones aprendidos, benchmarks, conocimiento de zonas,
           comportamiento de inquilinos, rendimiento de proveedores
Uso:       Búsqueda semántica cuando el orquestador necesita contexto
           relevante que no cabe en el system prompt
```

```python
# Ejemplo: cuando el orquestador necesita contexto de una zona
def get_relevant_context(query: str, user_id: str) -> list[str]:
    """Busca en memoria de largo plazo contexto relevante."""
    results = vector_db.search(
        query=query,
        filter={"user_id": user_id},
        top_k=5,
    )
    return [r.content for r in results]

# Se usa así en el system prompt:
# "Contexto relevante de memoria: {get_relevant_context(user_message, user_id)}"
```

### 4.4 Aprendizaje Continuo

```python
# Después de cada interacción, el sistema aprende
def update_memory(user_id, message, response, tool_calls, outcome):

    # 1. Si el usuario corrigió algo, aprender la preferencia
    if detected_correction(message):
        store_preference(user_id, extract_preference(message))
        # Ej: "No, siempre cobra 3 días antes" → preference: reminder_days_before=3

    # 2. Si el usuario tomó una decisión, registrar el patrón
    if detected_decision(message):
        store_decision_pattern(user_id, decision_context, decision_outcome)
        # Ej: "Rechazó candidato con score 72" → threshold puede ser ~75

    # 3. Actualizar patrones de inquilinos
    for tool_call in tool_calls:
        if tool_call.name == "cobro_agent" and tool_call.result.get("pago_registrado"):
            update_tenant_payment_pattern(tool_call.input.inquilino_id)

    # 4. Generar resumen de la interacción para memoria de mediano plazo
    if is_significant_interaction(tool_calls):
        summary = generate_interaction_summary(message, response, tool_calls)
        store_medium_term_memory(user_id, summary)
```

---

## 5. Capa de Comunicación

### 5.1 WhatsApp como Canal Principal

En Colombia, WhatsApp es el canal dominante. El sistema debe funcionar completamente por WhatsApp.

```
┌───────────────────────────────────────────────────┐
│                   FLUJO WHATSAPP                   │
├───────────────────────────────────────────────────┤
│                                                    │
│  Inquilino envía foto de comprobante por WhatsApp  │
│                     │                              │
│                     ▼                              │
│  Twilio webhook → Gateway de Mensajes              │
│                     │                              │
│                     ▼                              │
│  Gateway identifica:                               │
│  ├── channel: "whatsapp"                           │
│  ├── user_type: "inquilino" (por número)           │
│  ├── has_image: true                               │
│  └── linked_property: "prop-012"                   │
│                     │                              │
│                     ▼                              │
│  Orquestador recibe y decide:                      │
│  "Imagen de inquilino conocido → probablemente     │
│   comprobante de pago"                             │
│                     │                              │
│                     ▼                              │
│  Llama: cobro_agent.verificar_comprobante(imagen)  │
│                     │                              │
│        ┌────────────┴────────────┐                 │
│        ▼                         ▼                 │
│   Coincide ✓                No coincide ✗          │
│   "Pago registrado.         "El monto no           │
│    Gracias María!"           coincide.              │
│                              Esperaba $2.8M,        │
│                              el comprobante          │
│                              muestra $2.5M.          │
│                              ¿Puedes verificar?"     │
│                                                    │
│  + Notifica al propietario:                        │
│  "María pagó el arriendo del apto 301. ✓"          │
│                                                    │
└───────────────────────────────────────────────────┘
```

### 5.2 Gateway de Mensajes

```python
class MessageGateway:
    """Normaliza mensajes de todos los canales."""

    def process_incoming(self, raw_message: dict, channel: str) -> NormalizedMessage:
        # 1. Identificar usuario
        user = self.identify_user(raw_message, channel)

        # 2. Extraer contenido
        content = self.extract_content(raw_message, channel)

        # 3. Determinar contexto
        context = self.build_context(user, content)

        return NormalizedMessage(
            user_id=user.id,
            user_type=user.type,  # "propietario" | "inquilino" | "agente"
            channel=channel,
            text=content.text,
            attachments=content.attachments,  # imágenes, documentos
            reply_to=content.reply_to,  # si es respuesta a un mensaje previo
            metadata={
                "linked_properties": user.properties,
                "linked_contracts": user.active_contracts,
                "conversation_history_id": content.thread_id,
            }
        )

    def send_outgoing(self, user_id: str, channel: str, message: str,
                      attachments: list = None):
        """Envía mensaje por el canal apropiado."""
        if channel == "whatsapp":
            self.twilio.send_whatsapp(user.phone, message, attachments)
        elif channel == "email":
            self.sendgrid.send(user.email, message, attachments)
        elif channel == "sms":
            self.twilio.send_sms(user.phone, message)
        elif channel == "web":
            self.websocket.push(user_id, message, attachments)
```

---

## 6. Flujos Clave

### 6.1 Flujo: Coordinación entre agentes (mora → legal → pipeline)

```
Cron diario (Agente Proactivo):
│
├── Detecta: inquilino Juan, 90 días de mora
│
├── Orquestador evalúa contexto:
│   ├── Memoria: "Juan tuvo problemas económicos (conversación del 15/ene)"
│   ├── Patrón: mora creciente, último pago parcial
│   └── Política del propietario: "máximo 2 moras, luego proceso"
│
├── Orquestador decide ejecutar 3 agentes EN PARALELO:
│
│   ┌─ Agente Legal:
│   │  └── Genera carta pre-jurídica
│   │  └── Calcula liquidación de deuda
│   │
│   ├─ Agente Pipeline:
│   │  └── Busca candidatos activos para esa propiedad
│   │  └── Encuentra 2 candidatos calificados
│   │
│   └─ Agente Comunicación:
│      └── Prepara notificación para el propietario
│      └── (NO envía aún — espera decisión)
│
├── Orquestador combina resultados y presenta al propietario:
│
│   "Juan lleva 90 días de mora ($8.4M acumulados).
│
│    Ya tengo:
│    ✅ Carta pre-jurídica lista para enviar
│    ✅ 2 candidatos calificados de respaldo (score 82 y 78)
│
│    Opciones:
│    A) Enviar carta pre-jurídica y dar 15 días de plazo
│    B) Llamar a Juan primero (tiene historial de cumplir acuerdos)
│    C) Iniciar proceso de terminación inmediata
│
│    Mi recomendación: A. Le damos una última oportunidad formal."
│
└── Propietario elige → Orquestador ejecuta la opción
```

### 6.2 Flujo: Onboarding de nueva propiedad (completo)

```
Propietario: "Tengo un apto nuevo en el Poblado,
              3 habitaciones, piso 12 con vista"

Orquestador (en secuencia):

1. query_data → Verificar perfil del propietario
   └── Resultado: tiene 4 propiedades, 3 en Medellín

2. precio_agent.analizar_mercado("El Poblado", "apto", 3_hab, piso_12, vista)
   └── Resultado: rango $3.5M-$4.5M, mediana $3.9M
   └── Propiedades similares: 12 publicadas, promedio 18 días para arrendar

3. documento_agent.crear_propiedad({
       zona: "El Poblado", tipo: "apartamento", habitaciones: 3,
       piso: 12, caracteristicas: ["vista"],
       precio_sugerido: 3_900_000
   })
   └── Resultado: propiedad_id: "prop-048"

4. documento_agent.generar_descripcion("prop-048", estilo="premium")
   └── Resultado: descripción optimizada para portales

5. comunicacion_agent.agendar_servicio("fotografia", "prop-048")
   └── Resultado: fotógrafo disponible jueves 14:00

6. documento_agent.preparar_contrato_base("prop-048", {
       clausulas_zona: "El Poblado",
       politicas_propietario: context.preferences
   })
   └── Resultado: contrato borrador listo

Respuesta al propietario:
"Listo, tu apartamento en el Poblado ya está configurado.

 📍 Precio sugerido: $3.900.000/mes (percentil 70 de la zona)
    — Hay 12 similares publicados, se arriendan en ~18 días
 📸 Fotógrafo agendado para el jueves a las 2pm
 📄 Contrato base listo con tus cláusulas habituales
 📝 Descripción creada (te la muestro si quieres revisarla)

 ¿Publico ya o prefieres ajustar algo primero?"
```

### 6.3 Flujo: Briefing proactivo semanal

```
Lunes 7:00am (Agente Proactivo dispara):

1. Agente Cobranza → estado_cobros(periodo="semana")
2. Agente Pipeline → candidatos_activos()
3. Agente Mantenimiento → tickets_pendientes()
4. Agente Proactivo → anomalias_detectadas()
5. query_data → contratos_por_vencer(dias=90)

El Orquestador combina todo en un briefing:

"Buenos días, Nicolás. Tu resumen semanal:

 💰 COBROS
 ├── 8/10 pagados ($22.4M cobrados de $28M)
 ├── María (Apto 301): pagó ayer, 2 días tarde como siempre ✓
 └── ⚠️ Pedro (Apto 502): mora de 45 días. $5.6M pendientes.
     Opción: [Enviar recordatorio] [Escalar a pre-jurídico]

 🏠 PROPIEDADES
 ├── Apto 204 lleva 25 días vacío (promedio zona: 15 días)
 │   └── Sugerencia: ¿bajo el precio 5%? ($2.8M → $2.66M)
 └── Todas las demás ocupadas y al día ✓

 👤 PIPELINE
 ├── 3 candidatos nuevos esta semana para Apto 204
 ├── Mejor: Carolina M. (score 89, ingresos 4.8x)
 └── ¿Quieres que agende visita con Carolina?

 🔧 MANTENIMIENTO
 ├── Gotera Apto 502 reparada (Proveedor Y, $180K) ✓
 └── Calentador Apto 201 cumple 9 años el mes entrante
     └── ¿Reemplazo preventivo? Costo estimado: $450K

 📋 PRÓXIMOS VENCIMIENTOS
 └── Contrato Laura (Usaquén) vence en 45 días
     Mercado subió 8% desde su contrato.
     └── ¿Inicio proceso de renovación?

 1 decisión urgente | 3 sugerencias | 1 renovación pendiente"
```

---

## 7. Stack Tecnológico

### Core

| Componente | Tecnología | Justificación |
|---|---|---|
| **Orquestador AI** | Claude API (Anthropic) | Tool use nativo, contexto largo, razonamiento superior |
| **Backend API** | Python (FastAPI) o Node (NestJS) | Async nativo, buena integración con AI SDKs |
| **Base de datos** | PostgreSQL + pgvector | Relacional + vector search para memoria AI |
| **Cache/Queue** | Redis | Conversaciones, rate limiting, job queues |
| **Background Jobs** | Celery (Python) o BullMQ (Node) | Agente proactivo, crons, procesamiento async |
| **Storage** | S3 / Cloudflare R2 | Documentos, imágenes, comprobantes |

### Comunicación

| Canal | Proveedor | Uso |
|---|---|---|
| **WhatsApp** | Twilio WhatsApp API | Canal principal para inquilinos y propietarios |
| **Email** | SendGrid | Notificaciones formales, contratos, reportes |
| **SMS** | Twilio | Fallback, OTPs, alertas urgentes |
| **Llamadas AI** | Bland.ai | Verificación de referencias, cobranza escalada |
| **Web real-time** | WebSockets (Socket.io) | Dashboard, chat web, notificaciones push |

### AI y Procesamiento

| Función | Tecnología | Uso |
|---|---|---|
| **Orquestador** | Claude Sonnet 4.5 | Razonamiento, decisiones, coordinación |
| **OCR/Visión** | Claude Vision | Comprobantes de pago, documentos, fotos |
| **Embeddings** | Voyage AI / OpenAI | Memoria de largo plazo, búsqueda semántica |
| **Vector DB** | pgvector (en PostgreSQL) | Almacenamiento y búsqueda de embeddings |

### Servicios Externos Colombia

| Servicio | Proveedor | Uso |
|---|---|---|
| **Pagos** | PSE (ACH Colombia), Nequi, Daviplata | Cobro de arriendos |
| **Firma digital** | DocuSign / SignNow / Firma local | Contratos |
| **Antecedentes** | DataCrédito, Procuraduría, RUNT | Verificación de candidatos |
| **Calendario** | Google Calendar API | Agendamiento de visitas |

---

## 8. Modelos de Datos AI

Estos modelos se suman a los que ya existen en `BACKEND-INTEGRATION.md` e `INMOBILIARIA-BACKEND.md`.

```sql
-- Conversaciones con el orquestador
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'web', 'email'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed'
    summary TEXT, -- resumen generado por AI al cerrar
    metadata JSONB
);

-- Mensajes individuales en una conversación
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id),
    role VARCHAR(10) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    attachments JSONB, -- URLs de imágenes, documentos
    tool_calls JSONB, -- qué agentes se ejecutaron
    tool_results JSONB, -- qué retornaron los agentes
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memoria de mediano plazo (resúmenes y decisiones)
CREATE TABLE ai_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(30) NOT NULL, -- 'decision', 'preference', 'pattern', 'summary'
    content TEXT NOT NULL,
    tags TEXT[], -- para búsqueda
    related_entities JSONB, -- {inquilino_id, propiedad_id, etc.}
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL = permanente
    is_active BOOLEAN DEFAULT TRUE
);

-- Memoria de largo plazo (embeddings para búsqueda semántica)
CREATE TABLE ai_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    embedding vector(1536), -- pgvector
    type VARCHAR(30), -- 'interaction', 'pattern', 'knowledge'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda de vectores
CREATE INDEX ON ai_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Preferencias aprendidas del usuario
CREATE TABLE ai_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    category VARCHAR(50) NOT NULL, -- 'cobro', 'pipeline', 'mantenimiento', etc.
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    learned_from TEXT, -- referencia a la interacción donde se aprendió
    confidence FLOAT DEFAULT 0.5, -- sube con confirmaciones
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category, key)
);

-- Ejemplo de preferencias aprendidas:
-- { category: 'cobro', key: 'reminder_days_before', value: 3 }
-- { category: 'pipeline', key: 'min_approval_score', value: 75 }
-- { category: 'mantenimiento', key: 'auto_approve_under', value: 500000 }
-- { category: 'comunicacion', key: 'preferred_channel', value: 'whatsapp' }
-- { category: 'renovacion', key: 'max_increase_pct', value: 8 }

-- Patrones detectados por inquilino
CREATE TABLE ai_tenant_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquilino_id UUID REFERENCES inquilinos(id),
    pattern_type VARCHAR(50), -- 'payment_timing', 'communication', 'maintenance'
    description TEXT,
    data JSONB, -- datos del patrón
    -- Ej: { avg_days_late: 3, always_pays: true, preferred_channel: 'whatsapp' }
    confidence FLOAT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Ejecuciones de agentes (log para auditoría y aprendizaje)
CREATE TABLE ai_agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id),
    agent_name VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    status VARCHAR(20), -- 'success', 'error', 'pending_human'
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Briefings proactivos generados
CREATE TABLE ai_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(20), -- 'daily', 'weekly', 'alert'
    content TEXT NOT NULL,
    decisions_pending JSONB, -- [{id, description, options}]
    was_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    channel VARCHAR(20), -- por dónde se envió
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. API del Orquestador

### 9.1 Endpoints principales

```
POST   /api/v1/ai/message              # Enviar mensaje al orquestador
GET    /api/v1/ai/conversations         # Listar conversaciones
GET    /api/v1/ai/conversations/:id     # Historial de una conversación
POST   /api/v1/ai/decision              # Responder a una decisión pendiente
GET    /api/v1/ai/briefing/latest       # Último briefing generado
GET    /api/v1/ai/memory/preferences    # Preferencias aprendidas del usuario

# Webhooks entrantes (canales externos)
POST   /api/v1/webhooks/twilio          # WhatsApp / SMS entrante
POST   /api/v1/webhooks/email           # Email entrante (SendGrid inbound parse)
```

### 9.2 Contrato: Enviar mensaje

```typescript
// POST /api/v1/ai/message
// Request
{
    "message": "¿Cómo va la propiedad de Usaquén?",
    "channel": "web",
    "conversation_id": "conv-uuid-123", // opcional, para continuar conversación
    "attachments": [] // opcional, URLs de archivos
}

// Response (streaming recomendado para UX)
{
    "conversation_id": "conv-uuid-123",
    "message_id": "msg-uuid-456",
    "response": "El contrato de Laura vence en 45 días...",
    "agents_executed": [
        {
            "agent": "query_data",
            "action": "contratos",
            "duration_ms": 120
        },
        {
            "agent": "precio_agent",
            "action": "benchmark_zona",
            "duration_ms": 850
        }
    ],
    "pending_decisions": [
        {
            "id": "dec-789",
            "description": "¿Renovar contrato de Laura?",
            "options": [
                {"id": "A", "label": "Mismo precio", "detail": "Retención segura"},
                {"id": "B", "label": "+5%", "detail": "Probable aceptación"},
                {"id": "C", "label": "+8% (mercado)", "detail": "Riesgo de salida"}
            ],
            "recommendation": "B",
            "recommendation_reason": "Laura paga puntual hace 2 años..."
        }
    ]
}
```

### 9.3 Contrato: Webhook WhatsApp

```typescript
// POST /api/v1/webhooks/twilio
// Twilio envía el mensaje del usuario
// El backend:
// 1. Identifica usuario por número de teléfono
// 2. Determina tipo (propietario/inquilino)
// 3. Pasa al orquestador con contexto
// 4. Responde por WhatsApp con la respuesta del orquestador
```

### 9.4 Contrato: Decisión pendiente

```typescript
// POST /api/v1/ai/decision
{
    "decision_id": "dec-789",
    "selected_option": "B",
    "additional_context": "Pero dile que el parqueadero sube $50K" // opcional
}

// Response
{
    "status": "executing",
    "actions_triggered": [
        "Generando contrato con +5% y parqueadero +$50K",
        "Enviando propuesta a Laura por WhatsApp"
    ]
}
```

---

## 10. Seguridad y Permisos

### 10.1 Reglas de Autonomía por Tipo de Usuario

```yaml
propietario_diy:
  # Administra sus propiedades directamente
  ai_can_do_autonomously:
    - enviar recordatorios de pago
    - registrar pagos verificados
    - responder FAQ a inquilinos
    - generar reportes
    - crear tickets de mantenimiento

  ai_requires_approval:
    - aprobar/rechazar candidatos
    - autorizar gastos > $500K COP
    - iniciar procesos legales
    - modificar precio de arriendo
    - terminar contratos
    - enviar comunicaciones formales (cartas legales)

propietario_handsoff:
  # Administración completa por Leasefy
  ai_can_do_autonomously:
    - todo lo de propietario_diy, más:
    - aprobar candidatos con score >= umbral configurado
    - autorizar mantenimiento menor (< $500K COP)
    - renovar contratos con incremento <= IPC
    - asignar proveedores de mantenimiento

  ai_requires_approval:
    - rechazar candidatos (siempre informar)
    - autorizar gastos > $500K COP
    - iniciar procesos legales
    - renovar con incremento > IPC
    - decisiones que afecten valor del inmueble

inmobiliaria:
  # Gestiona múltiples propiedades de terceros
  ai_can_do_autonomously:
    - todo lo operativo (cobros, recordatorios, tickets)
    - pipeline de candidatos (hasta presentación)
    - comunicación con inquilinos
    - reportes y analytics

  ai_requires_approval:
    - decisiones que afecten propietarios
    - gastos por encima del presupuesto autorizado
    - cambios de precio
    - procesos legales
```

### 10.2 Auditoría

Cada acción del orquestador y sus agentes queda registrada en `ai_agent_executions`. Esto permite:

- **Trazabilidad**: saber exactamente qué hizo el sistema y por qué
- **Auditoría legal**: registro de comunicaciones con inquilinos
- **Mejora continua**: analizar qué agentes fallan, qué decisiones toman los usuarios
- **Rollback**: si un agente ejecutó algo incorrecto, poder deshacer

---

## 11. Roadmap de Implementación

### Fase 1: Fundación (4-6 semanas)

```
Objetivo: Orquestador básico funcionando con 2 agentes

├── Setup Claude API con tool use
├── Gateway de mensajes (solo web, sin WhatsApp aún)
├── Agente de consulta de datos (query_data)
│   └── El usuario pregunta, el AI responde con datos del sistema
├── Agente de documentos (básico)
│   └── Generar cartas, certificados
├── Memoria de corto plazo (conversaciones en PostgreSQL)
├── API REST para el frontend (/ai/message, /ai/conversations)
└── UI de chat en el dashboard web

Resultado: El usuario puede hablar con la plataforma y preguntar
cosas como "¿Cuánto me deben?" o "Genera un paz y salvo para María"
```

### Fase 2: Agentes Core (6-8 semanas)

```
Objetivo: Automatización de cobranza y pipeline

├── Agente de cobranza completo
│   ├── Recordatorios automáticos
│   ├── OCR de comprobantes (Claude Vision)
│   └── Registro de pagos
├── Agente de pipeline
│   ├── Scoring de candidatos
│   ├── Verificación de documentos
│   └── Movimiento automático por etapas
├── Integración WhatsApp (Twilio)
│   └── Inquilinos y propietarios por WhatsApp
├── Memoria de mediano plazo (resúmenes, decisiones)
└── Sistema de decisiones pendientes

Resultado: Cobranza semi-autónoma, candidatos se califican solos,
funciona por WhatsApp
```

### Fase 3: Coordinación y Proactividad (6-8 semanas)

```
Objetivo: Agentes que se coordinan + briefings proactivos

├── Agente de mantenimiento
├── Agente de comunicación multi-canal
├── Agente proactivo (cron jobs)
│   ├── Briefings diarios/semanales
│   ├── Detección de anomalías
│   └── Sugerencias automáticas
├── Coordinación entre agentes (mora → legal → pipeline)
├── Memoria de largo plazo (pgvector + embeddings)
├── Aprendizaje de preferencias
└── Integración email (SendGrid)

Resultado: La plataforma trabaja sola y reporta.
El propietario recibe briefings y solo toma decisiones.
```

### Fase 4: Autonomía Completa (8-12 semanas)

```
Objetivo: "Hablo y se hace"

├── Agente legal
├── Agente de precios (benchmarking de mercado)
├── Llamadas AI (Bland.ai para verificación de referencias)
├── Negociación automática de renovaciones
├── Gestión autónoma de proveedores
├── Dashboard que muestra "lo que hicieron los agentes"
│   └── Timeline de acciones AI con opción de revertir
├── Onboarding conversacional
│   └── "Cuéntame de tu propiedad" → todo configurado
└── Fine-tuning de preferencias por uso

Resultado: Propietario puede operar 100% por chat.
El dashboard es para ver, no para operar.
```

---

## Anexo: Diferencia con Competidores

```
┌─────────────────┬─────────────────────┬───────────────────────┐
│                 │ COMPETENCIA          │ LEASEFY               │
│                 │ (proptech LATAM)     │ (visión agentes)      │
├─────────────────┼─────────────────────┼───────────────────────┤
│ Interfaz        │ Dashboard + clics    │ Conversación natural  │
│ Automatización  │ Notificaciones       │ Agentes autónomos     │
│ AI              │ Feature (scoring)    │ El producto completo  │
│ Aprendizaje     │ No existe            │ Memoria + patrones    │
│ Proactividad    │ Alertas básicas      │ Briefings + acciones  │
│ Coordinación    │ Manual               │ Agentes se coordinan  │
│ Escalamiento    │ Más humanos          │ Mismos humanos, más AI│
│ Canales         │ Solo web             │ WhatsApp + web + email│
└─────────────────┴─────────────────────┴───────────────────────┘

Pitch: "Tu equipo de administración de arriendos.
        Hablas, ellos ejecutan."
```
