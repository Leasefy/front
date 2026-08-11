/**
 * «Le doy descargar plantilla y no descarga nada».
 *
 * `XLSX.writeFile()` es una función de **Node**: escribe con `fs`. Importada
 * como módulo en el navegador **no tira ningún error y tampoco baja nada** —
 * el clic se sentía muerto, sin consola, sin toast, sin archivo. Por eso el
 * defecto sobrevivió: no hay nada que atrapar.
 *
 * En el navegador la descarga se dispara a mano: bytes → Blob → <a download>.
 * Este test verifica justamente eso, porque es lo único que distingue «armó el
 * archivo» de «además lo entregó».
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadTemplate } from './parseFile'

let anclasClickeadas: Array<{ download: string; href: string }>
let crearOriginal: typeof document.createElement

beforeEach(() => {
  anclasClickeadas = []
  crearOriginal = document.createElement.bind(document)

  // URL.createObjectURL no existe en happy-dom.
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:leasefy/plantilla'),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
    writable: true,
  })

  vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...resto: unknown[]) => {
    const el = crearOriginal(tag as 'a', ...(resto as []))
    if (tag === 'a') {
      const a = el as HTMLAnchorElement
      a.click = () => anclasClickeadas.push({ download: a.download, href: a.href })
    }
    return el
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('descargar la plantilla', () => {
  it('entrega el archivo, no sólo lo arma', async () => {
    await downloadTemplate()

    expect(anclasClickeadas).toHaveLength(1)
    expect(anclasClickeadas[0].download).toBe('plantilla-leasefy.xlsx')
    expect(anclasClickeadas[0].href).toContain('blob:')
  })

  it('libera el object URL, para no dejar el blob colgado', async () => {
    await downloadTemplate()
    // Se revoca en el siguiente tick: revocarlo de inmediato cancela la
    // descarga en algunos navegadores.
    await new Promise((r) => setTimeout(r, 0))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:leasefy/plantilla')
  })

  it('no deja el <a> pegado en el documento', async () => {
    await downloadTemplate()
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })
})
