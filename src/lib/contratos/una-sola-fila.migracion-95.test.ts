/**
 * MP-07 (QA-MIGRACION-95, 06-10-2026): con UN contrato sin correo, el resumen
 * decía «1 fila no trae correo: esos inquilinos no reciben…». Singular.
 */
import { describe, it, expect } from 'vitest'
import { mapearColumnas } from './columnas-de-contrato'
import { resumenDeLectura } from './vista-previa-de-migracion'

describe('MP-07 · un solo inquilino sin correo', () => {
  it('«ese inquilino no recibe», no «esos inquilinos no reciben»', () => {
    const filas = [{ Inquilino: 'Ana', 'Cédula inquilino': '1036000001', Correo: '', Canon: '1000000', _rowIndex: 1 }]
    const r = resumenDeLectura(filas, mapearColumnas(['Inquilino', 'Cédula inquilino', 'Correo', 'Canon']))
    const porque = r.renglones.find((x) => x.que === 'Inquilino con correo')!.porque
    expect(porque).toContain('ese inquilino no recibe la invitación')
    expect(porque).not.toContain('esos inquilinos')
  })
})
