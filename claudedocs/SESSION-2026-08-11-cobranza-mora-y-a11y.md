# Cobranza: la mora de la plataforma, la carta con ceros y el contraste

**2026-08-10/11.** Continúa `SESSION-2026-08-10-merge-a-develop-y-cobranza-invisible.md`.

**Siete PRs, los siete en develop. Cero abiertos.**

| repo | PR | qué |
|---|---|---|
| front | #68 | Cobranza desaparecía del menú |
| front | #69 | «Aprobar» carta estaba muerto sin decir por qué |
| front | #70 | contraste de `--fg-subtle` en oscuro |
| back | #19 | enum de plan con `@map` (destrabó el login) |
| back | #20 | cron 02:00 que empuja la mora al agente |
| back | #21 | tipo enum nativo en Postgres |
| agent | #86 | `agent.obligations` + ingesta de mora |
| agent | #87 | la carta con cifras reales |
| cadence | #1 | el mismo token de contraste en el DS |

---

## 1. El agente sólo llamaba lo que se subía a mano

Nico lo intuyó y el código lo confirmó: lo **único** que creaba deudores era la
importación CSV, y su propia cabecera dice que *«never starts a cadence»*. En
el back, cobranza sólo aparece en `src/admin/*` — vistas de solo lectura.

### El bloqueador de fondo

**El agente no tenía el concepto de deuda exigible.** `v_debtor_delinquency`
calculaba la mora SÓLO desde `payment_promises`, y esas filas las crea una
única cosa: `record-promise.ts`, que corre **durante una llamada**.

> Para tener mora hace falta una llamada; para que haya llamada hace falta mora.

Por eso un deudor importado quedaba en 0 días / COP 0 **para siempre**.

### Por qué tabla nueva y no reusar promesas

Meter cada canon vencido en `payment_promises` habría hecho que todo impago
contara como **«promesa incumplida»**, arruinando el KPI de cumplimiento y el
perfil de comportamiento que alimenta la priorización. Una promesa es un
compromiso que el deudor asumió; un canon vencido no.

### Cómo quedó

```
public.cobros vencidos          (back, cron 02:00 Bogotá)
   ↓ POST /internal/cartera/mora-sync   (AGENT_API_KEY, ADR-028)
agent.debtors + agent.obligations
   ↓ v_debtor_delinquency = obligaciones ∪ promesas
computeStageTransition → debtor_states → cadencia 06:30 → llamadas
```

Las 02:00 van antes del ERP sync (03:00), del pre-bureau (04:30) y de la
cadencia (06:30), para que el plan del día vea la mora del día.

**Verificado contra la base de dev**, no en teoría:

```
Carlos Andrés Zapata   36 días   $2.450.000
Marcela Ríos            5 días     $900.000   ← pago parcial reflejado
Víctor / Laura / Nicolás — venían por promesas, siguen igual
Reingesta del mismo lote → creados 0, actualizados 2
```

### Decisiones que quedaron tomadas

- **Alta automática**: el deudor entra y la cadencia lo toma esa noche. Se
  advirtió por Ley 2300, habeas data y Choi et al. (NBER 2025). Nico eligió
  automático. **El alta no saltea ninguna compuerta**: ventana horaria, topes
  de 1/día y 1/canal/semana y opt-out siguen aplicando.
- **Sin cédula se omite la fila con motivo**, nunca se inventa un identificador.
- Se manda el **saldo**, nunca el total facturado.

---

## 2. La carta de Ley 1266 salía con COP 0 — tres capas tapándose

Lo que Nico vio en pantalla: «mora de 0 días», «saldo COP 0», «Dirección sin
registrar».

1. **Campos que no existen**: `payment.findMany({ orderBy: { dueDate } })` — y
   `Payment` no tiene `dueDate`. Prisma **lanzaba** en cada llamada. También
   leía `p.amountCop` (es `amount`).
2. **Un `catch {}` vacío** se comía el error y el snapshot se quedaba en ceros.
3. **El mock del test inventaba la forma**: devolvía `amountCop`, `dueDate`,
   `paidAt` — calzaba con el código, no con la base. Verde para siempre. Y
   ninguna prueba miraba las CIFRAS, sólo que el PDF empezara con `%PDF-`.

> Un `catch` vacío sobre una consulta convierte un error en un dato falso. En
> una pantalla es feo; en una carta de cobro es un problema legal.

**Sigue abierto**: `contractNumber` y `ciudad` no tienen fuente en el agente.

---

## 3. Accesibilidad: el arreglo no estaba donde parecía

Medido en `/ai/cobranza/deudores`, tema oscuro: cabeceras a **11px** con
**3.72:1** (AA pide 4.5). No era de cobranza — `TableHead` de Cadence trae
horneado `text-label text-fg-subtle`, o sea **74 archivos del panel**.

**Los tokens están DUPLICADOS**: `~/rent/cadence/src/styles/tokens.css` y
`~/rent/mvp/src/app/globals.css`. Tocar sólo el DS **no cambia nada en
pantalla**. Hay que tocar los dos.

```
oscuro   #7e7a72 → #8d8980    3.72 → 4.56  ✓
claro    #726e68 sin tocar           4.86  ✓
fallos AA en esa pantalla        9 → 3
```

Defecto **exclusivo del oscuro**: en claro `fg-subtle` y `fg-muted` son casi
hermanos; en oscuro la paleta separó subtle muy por debajo y se pasó.

⚠️ **Medir contraste exige componer el alfa.** Tomar el primer
`backgroundColor` no transparente del padre falla con píldoras (mismo tono al
16%): da 1:1 y parece texto invisible. Me generó 3 falsos positivos.

⚠️ **`.text-label` mide 11px, no 12**: `globals.css:758` define una clase de
marca que le gana al token del DS.

**Queda fallando**: la píldora de peligro, `#e0664d` sobre `#3b261f` = 4.15:1.

---

## 4. Lo demás

- **«Aprobar» carta** (#69): no estaba roto, exigía dos campos que nunca se
  anunciaban obligatorios, y el `title` sólo cubría el caso de permisos. Al
  escribir las pruebas salió que **«Test 3» pasaba por la razón equivocada**:
  `carta-send-method` es el `SelectTrigger` de Radix (un `<button>`), no un
  `<select>`.
- **Auditoría de mocks y Cadence**: cobranza limpia. Cero fixtures, cero
  `setTimeout` que finja éxito, cero tokens inexistentes, cero colores crudos.
- **Enum de plan** (#21): el tipo **ya existía** en dev, aplicado a mano, con
  un registro en `_prisma_migrations` **sin archivo en el repo** — un entorno
  nuevo se habría quedado sin el cambio. La migración quedó idempotente.

## Entorno

`:3005` front develop · `:3010` back · `:4200` agente develop (worktree
`~/rent/agent-terms`). `:3001` y `:4100` son de Nico, intactos. `:3000` lo
tomó otro proyecto suyo (`sa-domain-client`), por eso el back va en :3010.

⚠️ La **sesión única** invalida los tokens sacados por curl: exige un
`POST /auth/session/claim` que sólo hace el front. Para probar endpoints
autenticados, usar el navegador.
