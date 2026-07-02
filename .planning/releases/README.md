# Tren de versiones — cómo entregamos a integración sin frenar

**Convención Leasefy. Vale para CUALQUIER repo y CUALQUIER agente.** Este `README` es idéntico
en todos los repos (`agent`, `mvp`/front, `avaluo`, `leasefy-manus`, …). Cada repo tiene su
**propio** tren de versiones.

**Problema que resuelve:** producimos más rápido de lo que integración (Victor) consume. La
solución NO es parar de mandar PRs — es *desacoplar*. Se sigue empujando sobre la rama de
integración; cada versión es un **corte congelado** (tag) que Victor integra a su ritmo,
mientras la rama sigue avanzando más allá del corte.

```
integración ──PRs──PRs──[ TAG v1 ]──PRs──PRs──[ TAG v2 ]──►  (sigue avanzando)
                            ▲                     ▲
                     Victor integra v1     ya se trabaja en v2
```

## Reglas

1. **Nunca se para.** Los PRs se siguen apilando igual que siempre.
2. **Una versión = un FREEZE, no una pausa.** Cuando Victor avisa "tomo hasta acá", se corta un
   tag `git tag vN <commit>` (o rama `release/vN`). Todo ≤ tag es vN; lo de arriba pasa a vN+1.
3. **El manifiesto es la fuente de verdad.** Un archivo `vN.md` por versión con: PRs en orden
   bottom‑up, migraciones, secrets, flags, smoke. Es el "ledger de Victor" partido por versión.
4. **El stack lineal protege del rebase.** Victor mergea de abajo hacia arriba; los PRs de más
   arriba se reapuntan solos a la rama de integración cuando sus bases caen. No se rebasea "por
   Victor" — solo la higiene normal del stack.

## Flujo operativo

- **Al terminar algo:** abrí el PR como siempre y agregá una fila en el manifiesto de la
  versión **ABIERTA** (la de mayor `N` sin tag). No decidas cortes.
- **Cortar versión (cuando Victor confirma):**
  ```bash
  git tag vN <commit-del-tope-de-vN> && git push origin vN
  ```
  Marcá `vN.md` como `CONGELADA (tag vN)` y abrí `v(N+1).md` para lo nuevo.
- **Victor (a su ritmo):** integra los PRs de `vN.md` en orden, aplica migraciones/secrets/flags,
  corre el smoke. Al terminar, esa versión queda `INTEGRADA`.

## Estados de una versión

`ABIERTA` (acumulando PRs) → `CONGELADA (tag)` → `INTEGRADA (Victor)`.
**Solo una versión `ABIERTA` a la vez** por repo (donde caen los PRs nuevos).

## Coordinación entre repos

Cada repo versiona **independiente** (su propio `vN`). Un release del producto puede emparejar,
p.ej., `agent v3` + `front v2`: anotá el emparejamiento en el encabezado del manifiesto
(`Emparejado con:`), no mezcles PRs de un repo en el manifiesto de otro.
