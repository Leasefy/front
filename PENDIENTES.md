# Pendientes para mejorar la experiencia

## Geocodificación de propiedades
- [ ] **Geocodificación por dirección completa**: Actualmente se usan las coordenadas del centro de la ciudad como fallback. Integrar un servicio de geocodificación (Nominatim/OSM gratuito o Google Geocoding API) para obtener coordenadas precisas a partir de la dirección completa (ciudad + barrio + dirección).
- [ ] **Mapa interactivo en el paso de ubicación**: Permitir al propietario arrastrar un pin en el mapa para ajustar la ubicación exacta de su propiedad durante el flujo de publicación.
- [ ] **Geocodificación en backend**: Mover la geocodificación al backend (al crear/actualizar propiedad) para no depender del frontend y poder re-geocodificar propiedades existentes.
- [ ] **Migrar propiedades sin coordenadas**: Script o endpoint para geocodificar propiedades existentes que tienen `latitude: null, longitude: null`.

## Endpoints del backend pendientes (inquilino)
- [ ] **`GET /leases` para TENANT**: El backend solo permite rol LANDLORD. Necesita soportar TENANT filtrando por `tenantId`.
- [ ] **`GET /tenant-payments/mine`**: Endpoint no implementado. Necesario para la página de arriendos del inquilino.
- [ ] **`GET /tenant-payments/lease/:leaseId`**: Verificar que TENANT pueda acceder a sus propios pagos.

## UX del mapa
- [ ] **Autocompletado de dirección**: Integrar autocompletado con Nominatim o Google Places en el campo de dirección del formulario de publicación.
- [ ] **Mostrar indicador en propiedades sin ubicación precisa**: En el listado, indicar visualmente cuando una propiedad solo tiene ubicación aproximada (centro de ciudad) vs ubicación exacta.

## Flujo post-aprobación (CRÍTICO)
- [ ] **Página de firma de contrato para inquilino**: El propietario firma el contrato y queda en `PENDING_TENANT`, pero el inquilino NO tiene UI para firmarlo. Necesita una página en `/inquilino/contrato/[contractId]` con: vista previa del contrato, formulario de firma con OTP, y confirmación. Endpoint: `POST /contracts/:id/sign`.
- [ ] **Notificación al inquilino cuando hay contrato pendiente**: En `/inquilino/aplicaciones/[id]`, cuando el contrato está en `PENDING_TENANT`, mostrar botón "Firmar contrato" en vez de solo "El propietario te contactará".
- [ ] **Creación automática de Lease en backend**: Verificar que cuando el contrato pasa a `ACTIVE` (ambos firmaron), el backend cree automáticamente el registro de Lease con pagos mensuales.
- [ ] **Vista de arriendos para propietario**: `/panel/leases` existe pero necesita mostrar arriendos activos del landlord con info de pagos recibidos.
- [ ] **Plantillas de contrato dinámicas**: Actualmente hardcoded en frontend. Crear `GET /contracts/templates` para cargarlas desde backend.
- [ ] **Integración de seguro**: El `InsuranceSelector` captura la selección pero no está claro si se envía/procesa en el backend.

## Autenticación y onboarding
- [ ] **`refreshUser()` puede colgar**: `supabase.auth.getSession()` a veces no resuelve. Considerar agregar timeout o usar el token almacenado en vez de llamar a getSession de nuevo.
- [ ] **Widget de onboarding en sidebar**: Actualmente usa 4 pasos hardcoded pero el onboarding real solo tiene 2 pasos. Alinear los pasos del sidebar con el flujo real, o eliminar el widget cuando el backend confirme `onboardingCompleted`.
