# Requirements — v7.0 Portal del Inquilino

> Milestone frontend-first + aditivo. El portal `/inquilino` ya existe (~55-60% real); v7.0 **suma** la capa de operación post-firma, **sube parcial→real** 3 pilares y **limpia** superficies fake. Fuente: `.planning/research/portal-inquilino/GAP-ANALYSIS.md`.
> **Regla frontend-first:** cada requisito = capacidad tenant-facing (UI + contrato api-client + empty-state honesto). Donde el backend/PSP/`agent` aún no exista, la UI entra con estado "Próximamente" honesto; la data real se cablea detrás (ver Dependencias externas).

## v7.0 Requirements

### PAGO — Pagos
- [ ] **PAGO-01**: El inquilino ve su estado de cuenta del arriendo (saldo vigente, próximo pago: fecha + monto) con data real del lease.
- [ ] **PAGO-02**: El inquilino paga su arriendo con Wompi/Bold real (PSE + tarjeta + Nequi) vía checkout hosted, reemplazando `/pse-mock`; el monto se resuelve server-side (ruta con hash de integridad, modelada en avalúos).
- [ ] **PAGO-03**: El inquilino ve el historial de pagos y descarga el comprobante/recibo PDF de cada pago.
- [ ] **PAGO-04**: El inquilino configura, cambia y cancela autopago (domiciliación tokenizada).
- [ ] **PAGO-05**: El saldo/estado de mora mostrado traza a `tenant-payment-requests` (única fuente de verdad), sin computar su propio número y sin dark patterns/guilt-tripping.

### SOLI — Solicitudes / PQRS
- [ ] **SOLI-01**: El inquilino abre una solicitud de mantenimiento/reparación con descripción + fotos.
- [ ] **SOLI-02**: El inquilino abre una PQRS formal (petición/queja/reclamo) tipada, reusando el contrato `pqrs.types.ts` (no forkear).
- [ ] **SOLI-03**: El inquilino sigue el estado de sus solicitudes/PQRS en un timeline, con el SLA (15 días hábiles, Ley 1480/2011) computado y visible.
- [ ] **SOLI-04**: La solicitud muestra transparencia de responsabilidad de costo (Ley 820: dueño/inquilino/split) y, cuando el costo es a cargo del inquilino, requiere aprobación de cotización antes de ejecutar.

### DOCU — Documentos
- [ ] **DOCU-01**: El inquilino accede a los documentos de su **arriendo** (contrato firmado, recibos de pago), no solo a los docs de la aplicación.
- [ ] **DOCU-02**: El inquilino descarga su paz y salvo self-service.
- [ ] **DOCU-03**: El inquilino obtiene su certificado de retención en la fuente (3.5%) auto-generado.
- [ ] **DOCU-04**: El acceso a documentos aplica Habeas Data: consentimiento por propósito, URLs firmadas/expiran (sin IDOR), y acción de borrar (ARCO).

### CASO — Estado de casos
- [ ] **CASO-01**: El inquilino ve "Mis casos": un hub unificado que agrega PQRS + mantenimiento + acuerdos + pagos abiertos, cada uno con estado y responsable (composición frontend de servicios existentes).
- [ ] **CASO-02**: Cada caso enlaza a su detalle (solicitud, acuerdo o conversación) y muestra su timeline de estados.
- [ ] **CASO-03**: El inquilino recibe notificación al cambiar el estado de un caso (in-app ya; push/WhatsApp cuando el canal esté disponible) — el fix directo de P1.

### ACUE — Acuerdos de pago
- [ ] **ACUE-01**: El inquilino ve los acuerdos de pago que la agencia le aprobó, con el plan de cuotas (fechas, montos, estado).
- [ ] **ACUE-02**: El inquilino acepta explícitamente un acuerdo (firma reusando `SignaturePad` + OTP generalizado); nunca se auto-aprueba ni fija términos (T-323/2024 + SIC 001/2025).
- [ ] **ACUE-03**: El inquilino paga una cuota de su acuerdo con el mismo rail Wompi (vía `agent` `cartera/payment-plans` → `paymentUrl`).
- [ ] **ACUE-04**: El inquilino puede solicitar un plan de pago pre-mora que alimenta el pipeline de aprobación de la agencia (propone, no fija términos).

### COMU — Comunicación
- [ ] **COMU-01**: El chat del inquilino con la inmobiliaria está atado al **arriendo/caso** (hoy solo a `applicationId`), extendiendo `messages.service.ts` a lease-scoped.
- [ ] **COMU-02**: El inquilino adjunta archivos/fotos en el chat (hoy inerte) y las acciones de conversación (archivar/reportar) funcionan de verdad (hoy `alert()`).
- [ ] **COMU-03**: WhatsApp es canal de primera; todo mensaje/recordatorio saliente respeta el gate de contacto del `agent` (Ley 2300/2023) — el frontend no envía por su cuenta ni pregunta "por qué" la mora.

### BASE — Limpieza / shell del portal
- [ ] **BASE-01**: El dashboard `/inquilino` muestra el estado real (arriendo activo, próximo pago, casos abiertos), eliminando los arrays hardcodeados vacíos (`TODO(Backend)`).
- [ ] **BASE-02**: El perfil del inquilino usa API real de get/update con datos de Colombia, eliminando los datos chilenos mock (RUT, `+56`).
- [ ] **BASE-03**: La configuración conecta a acciones reales donde exista backend (o empty-state honesto), eliminando los `setTimeout` theater (password/sesiones/descargar/borrar).
- [ ] **BASE-04**: La navegación del layout expone Notificaciones/Perfil/Configuración y se elimina el dead code (`TenantDashboardSidebar.tsx`).

## Future Requirements (deferred → v7.1+)

- **COMU-F1**: Inbox unificado WhatsApp + in-app (alto costo de infra — diferido).
- **PAGO-F1**: Pago de depósito y prorrateo de primera renta desde el portal (post-firma temprano; hoy cubierto parcialmente en el flujo de activación).
- **CASO-F1**: Push/WhatsApp proactivo real end-to-end (depende de rutas tenant en `agent` + gateway de mensajería).
- **ACUE-F1**: Persistencia real de acuerdos tenant-iniciados (depende de ruta+RLS tenant en `agent`; la propia página agency de acuerdos aún no tiene endpoint de persistencia).

## Out of Scope (v7.0)

- **Reescribir el portal `/inquilino` existente** — v7.0 es aditivo; las páginas que funcionan (arriendo, contratos, firma OTP, notificaciones) se conservan.
- **Forkear modelos de la agencia** — PQRS/acuerdos reusan los contratos existentes; no se crean shapes paralelos.
- **Motor de pagos/cobranza propio** — la lógica de acuerdos (condonación, escalada, gate de contacto) vive en `agent`; el portal solo la expone.
- **Flujo pre-firma (shopping)** — explorar/guardados/para-ti/aplicaciones ya existen y no son el foco de P1 (operación post-firma).
- **Multi-país** — solo Colombia (COP).
- **Autoservicio que decida lo que es humano-only** — el inquilino nunca fija descuentos/términos ni cierra PQRS sin confirmación ni asigna proveedores.

## Traceability

Cada REQ-ID mapea a exactamente una fase `v7-NN`. **27/27 mapeados ✓** — sin huérfanos, sin duplicados. Detalle de success criteria por fase: `.planning/ROADMAP.md`.

| REQ-ID | Fase | Success criterion (resumen) |
|--------|------|-------------------|
| BASE-01 | v7-01 Fundación & Limpieza | Dashboard muestra arriendo/próximo pago/casos con data real, sin arrays hardcodeados |
| BASE-02 | v7-01 Fundación & Limpieza | Perfil vía API real con datos Colombia (cédula, +57); sin mock chileno (RUT, +56) |
| BASE-03 | v7-01 Fundación & Limpieza | Config ejecuta acciones reales o empty-state honesto; sin `setTimeout` theater |
| BASE-04 | v7-01 Fundación & Limpieza | Nav expone Notificaciones/Perfil/Config; dead code (`TenantDashboardSidebar.tsx`) eliminado |
| PAGO-01 | v7-01 Fundación & Limpieza | Estado de cuenta (saldo + próximo pago) traza a única fuente de verdad; sin dark patterns |
| DOCU-01 | v7-02 Documentos del Arriendo | Ve/abre docs del arriendo (contrato firmado, recibos), no solo de la aplicación |
| DOCU-02 | v7-02 Documentos del Arriendo | Descarga paz y salvo self-service |
| DOCU-03 | v7-02 Documentos del Arriendo | Obtiene cert. de retención en la fuente (3.5%) auto-generado |
| DOCU-04 | v7-02 Documentos del Arriendo | Habeas Data: URL firmada/expira (sin IDOR), consentimiento por propósito, borrar (ARCO) |
| CASO-01 | v7-03 Estado de Casos (Hub) | "Mis casos" agrega PQRS + mantenimiento + acuerdos + pagos, con estado y responsable |
| CASO-02 | v7-03 Estado de Casos (Hub) | Cada caso enlaza a detalle + timeline; solo ve sus propios casos (notas internas excluidas) |
| CASO-03 | v7-03 Estado de Casos (Hub) | Notificación in-app al cambiar estado; push/WhatsApp cuando el canal exista — fija P1 |
| PAGO-02 | v7-04 Pagos Reales (Wompi) | Paga con Wompi/Bold real (PSE+tarjeta+Nequi), monto server-side, reemplaza `/pse-mock` |
| PAGO-03 | v7-04 Pagos Reales (Wompi) | Historial + descarga comprobante PDF ("comprobante interno", no "factura") |
| PAGO-04 | v7-04 Pagos Reales (Wompi) | Configura/cambia/cancela autopago (domiciliación tokenizada) |
| PAGO-05 | v7-04 Pagos Reales (Wompi) | Saldo traza a única fuente de verdad; costo total antes de elegir método; sin dark patterns |
| COMU-01 | v7-05 Comunicación | Chat atado al arriendo/caso (no solo `applicationId`); `messages.service.ts` lease-scoped |
| COMU-02 | v7-05 Comunicación | Adjuntar archivos/fotos y acciones (archivar/reportar) funcionan de verdad |
| COMU-03 | v7-05 Comunicación | Saliente respeta el gate de contacto del `agent` (Ley 2300); no pregunta "por qué" la mora |
| SOLI-01 | v7-06 Solicitudes / PQRS | Abre solicitud de mantenimiento/reparación con descripción + fotos |
| SOLI-02 | v7-06 Solicitudes / PQRS | Abre PQRS formal tipada reusando `pqrs.types.ts` (no forkear) |
| SOLI-03 | v7-06 Solicitudes / PQRS | Timeline con SLA (15 días hábiles, Ley 1480/2011) computado y visible |
| SOLI-04 | v7-06 Solicitudes / PQRS | Transparencia de responsabilidad de costo (Ley 820); aprobación de cotización si es del inquilino |
| ACUE-01 | v7-07 Acuerdos de Pago | Ve acuerdos aprobados por agencia con plan de cuotas; traza al único registro del `agent` |
| ACUE-02 | v7-07 Acuerdos de Pago | Acepta explícitamente (SignaturePad + OTP); nunca auto-aprueba ni fija términos (T-323/SIC 001) |
| ACUE-03 | v7-07 Acuerdos de Pago | Paga una cuota con el mismo rail Wompi (`agent` `cartera/payment-plans` → `paymentUrl`) |
| ACUE-04 | v7-07 Acuerdos de Pago | Solicita plan pre-mora que alimenta el pipeline de aprobación (propone, no fija términos) |
