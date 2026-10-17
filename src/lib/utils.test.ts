import { describe, expect, it } from "vitest"
import { cn, TAMANOS_DE_LETRA_DEL_DS } from "./utils"

// FRONT-1 (QA de agentes 16-10): `cn` borraba el tamaño de letra del DS cuando
// iba junto a un color de texto, porque tailwind-merge creía que los dos eran
// colores. El texto salía a 16 px en vez de 13.
describe("cn con los tamaños de letra del DS", () => {
  it.each(TAMANOS_DE_LETRA_DEL_DS)("conserva text-%s junto a un color", (tamano) => {
    const clases = cn(`text-${tamano}`, "text-fg-muted").split(" ")
    expect(clases).toContain(`text-${tamano}`)
    expect(clases).toContain("text-fg-muted")
  })

  it("conserva el color junto al tamaño en cualquier orden", () => {
    expect(cn("text-danger", "text-caption")).toBe("text-danger text-caption")
  })

  it("dos tamaños: gana el último, como siempre", () => {
    expect(cn("text-caption", "text-body-sm")).toBe("text-body-sm")
    expect(cn("text-sm", "text-caption")).toBe("text-caption")
  })

  it("dos colores: gana el último, como siempre", () => {
    expect(cn("text-fg", "text-fg-muted")).toBe("text-fg-muted")
  })

  it("no confunde un color que empieza igual que un tamaño", () => {
    expect(cn("text-body", "text-fg-subtle", "text-ink-fg")).toBe("text-body text-ink-fg")
  })
})
