# Auditoría de estados de carga — medida el 2026-08-09

Las cuatro primitivas ya existen (`EstadoDeDatos`, `FalloDeCarga`,
`EsqueletoTabla`, más los `not-found.tsx`/`error.tsx` de Next). Lo que falta es
aplicarlas ruta por ruta.

## El tamaño real

| | |
|---|---|
| Rutas totales (`page.tsx`) | **285** |
| Piden datos y no distinguen los cuatro estados | **63** |
| Ya usan las primitivas | 7 |

El número que se venía repitiendo («~120 rutas») era una estimación. **Son 63.**

## Cómo se midió

```bash
for f in $(grep -rl "useEffect\|useState" src/app --include="page.tsx"); do
  grep -q "EstadoDeDatos\|FalloDeCarga\|EsqueletoTabla\|EsqueletoTarjetas" "$f" && continue
  grep -qE "apiClient|Api\.|agentFetch|fetch\(" "$f" || continue   # que de verdad pidan datos
  echo "$f"
done
```

⚠️ Esto detecta **ausencia de las primitivas**, no si la pantalla está mal.
Muchas tienen su propio manejo con `ErrorState`, que es correcto aunque no use
la primitiva nueva. La columna «error» de abajo distingue las dos cosas.

## Lo que NO es deuda

- **PQRS y tesorería**: son andamiaje honesto, dicen «ejemplo ilustrativo».
- Rutas con `ErrorState` propio: funcionan. Migrarlas es consistencia, no
  corrección.

## Por dónde empezar

El defecto que importa no es «no usa la primitiva», es **un fallo leído como
ausencia**: la pantalla concluye algo sobre datos que nunca llegaron.

Ya corregido, y era el peor: `inquilino/page.tsx` decidía
`isNewUser = sin arriendos && sin postulaciones` sin mirar el error, así que
con el back caído saludaba como recién llegado a alguien con arriendo activo.

El grep que caza ese patrón:

```bash
grep -rn "length === 0" src/app --include="page.tsx" | grep -v test
```

Cada resultado hay que mirarlo: si el arreglo puede estar vacío **porque falló
la carga**, la conclusión es falsa.

## Inventario

| Ruta | ¿maneja error? | ¿tiene estado vacío? |
|---|---|---|
| `admin/(panel)/approvals/[id]/page.tsx` | sí | sí |
| `admin/(panel)/audits/page.tsx` | sí | sí |
| `admin/(panel)/avaluos/[id]/page.tsx` | sí | sí |
| `admin/(panel)/escalations/[id]/page.tsx` | sí | no |
| `admin/(panel)/health/page.tsx` | NO | no |
| `admin/(panel)/registration-profiles/page.tsx` | sí | no |
| `aplicar/[propertyId]/page.tsx` | sí | no |
| `arco/verify/[token]/page.tsx` | sí | no |
| `auth/update-password/page.tsx` | sí | no |
| `inquilino/aplicaciones/[applicationId]/completar/page.tsx` | sí | no |
| `inquilino/aplicaciones/[applicationId]/page.tsx` | sí | sí |
| `inquilino/arriendo/[leaseId]/page.tsx` | sí | no |
| `inquilino/configuracion/page.tsx` | sí | sí |
| `inquilino/documentos/page.tsx` | sí | sí |
| `inquilino/perfil/page.tsx` | sí | no |
| `invitacion/[token]/page.tsx` | sí | no |
| `onboarding/propietario/page.tsx` | sí | no |
| `panel/(landlord)/[propertyId]/page.tsx` | sí | no |
| `panel/(landlord)/candidatos/page.tsx` | sí | sí |
| `panel/(landlord)/configuracion/page.tsx` | sí | no |
| `panel/(landlord)/perfil/page.tsx` | sí | no |
| `panel/(landlord)/visitas/page.tsx` | NO | sí |
| `panel/inmobiliaria/agenda/page.tsx` | sí | sí |
| `panel/inmobiliaria/agentes/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/asegurabilidad/[quoteId]/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/asegurabilidad/aseguradoras/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/asegurabilidad/nueva/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/avaluos/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/cobranza/acuerdos/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/cobranza/arco/[id]/page.tsx` | sí | no |
| `panel/inmobiliaria/ai/cobranza/arco/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/cobranza/compliance/audit/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/cobranza/compliance/ley-2300/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/cobranza/compliance/opt-out/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/cobranza/configuracion/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/cobranza/disputas/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/cobranza/escalaciones/[id]/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/cobranza/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/cobranza/plantillas/[id]/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/cobranza/plantillas/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/cobranza/reporte/suscripcion/page.tsx` | sí | sí |
| `panel/inmobiliaria/ai/cobranza/reportes-propietarios/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/conciliacion/cola/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/conciliacion/liquidaciones/page.tsx` | NO | sí |
| `panel/inmobiliaria/ai/conciliacion/movimientos/page.tsx` | sí | sí |
| `panel/inmobiliaria/checkout/page.tsx` | sí | sí |
| `panel/inmobiliaria/cobros/page.tsx` | sí | no |
| `panel/inmobiliaria/configuracion/page.tsx` | sí | sí |
| `panel/inmobiliaria/contratos/[id]/page.tsx` | sí | sí |
| `panel/inmobiliaria/contratos/nuevo/page.tsx` | sí | sí |
| `panel/inmobiliaria/dispersiones/page.tsx` | sí | no |
| `panel/inmobiliaria/documentos/page.tsx` | sí | sí |
| `panel/inmobiliaria/operaciones/page.tsx` | sí | no |
| `panel/inmobiliaria/perfil/page.tsx` | sí | no |
| `panel/inmobiliaria/pipeline/page.tsx` | sí | no |
| `panel/inmobiliaria/portafolio/[id]/page.tsx` | sí | sí |
| `panel/inmobiliaria/propiedades/nueva/page.tsx` | sí | no |
| `panel/inmobiliaria/propietarios/page.tsx` | sí | no |
| `panel/inmobiliaria/renovaciones/page.tsx` | sí | no |
| `panel/inmobiliaria/reportes/page.tsx` | sí | sí |
| `panel/inmobiliaria/tesoreria/ap/[id]/page.tsx` | sí | no |
| `pse-mock/page.tsx` | sí | no |
| `registro/page.tsx` | sí | no |
