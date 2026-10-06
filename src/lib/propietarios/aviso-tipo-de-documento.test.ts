/**
 * AVISO-TIPO-DOC (05-10-2026): la regla del aviso y del filtro de Propietarios.
 *  · la misma regla y el mismo orden del freno del back (sin número → sin
 *    documento; sin tipo → sin tipo; «CC» con forma de NIT → por revisar), y
 *    sólo con mandato;
 *  · quién lo ve: administrador, o contador que edita propietarios (el asesor
 *    edita propietarios pero no ve la facturación);
 *  · lo que manda el back se lee sin inventar;
 *  · `?falta=tipo-de-documento` filtra la lista con esa regla.
 */
import { describe, expect, it } from 'vitest'
import {
  FALTA_TIPO_DE_DOCUMENTO,
  PARAMETRO_FALTA,
  QUE_FALTA_EN_PALABRAS,
  RUTA_DE_LOS_QUE_FALTAN,
  faltaDelDocumentoDelPropietario,
  hayAviso,
  leerAviso,
  puedeVerElAviso,
} from './aviso-tipo-de-documento'
import { CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE } from '@/lib/facturacion/por-facturar'
import {
  FILTROS_INICIALES,
  conteosDePropietarios,
  filtrarPropietarios,
  hayFiltros,
} from './filtrar-propietarios'
import type { Propietario } from '@/lib/types/inmobiliaria'

function p(over: Partial<Propietario> & { id: string }): Propietario {
  return {
    name: over.id,
    email: null,
    phone: null,
    documentType: 'CC',
    documentNumber: '43123456',
    propertyCount: 1,
    copropiedadesCount: 0,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    datosPendientes: [],
    ...over,
  } as Propietario
}

describe('AVISO-TIPO-DOC · la regla (espejo del freno)', () => {
  it('🔴 en el orden del freno y con los códigos del back', () => {
    expect(faltaDelDocumentoDelPropietario(p({ id: 'a', datosPendientes: ['documento', 'tipoDocumento'] }))).toBe('MANDANTE_SIN_DOCUMENTO')
    expect(faltaDelDocumentoDelPropietario(p({ id: 'b', datosPendientes: ['tipoDocumento', 'cuentaBancaria'] }))).toBe('MANDANTE_SIN_TIPO_DE_DOCUMENTO')
    expect(faltaDelDocumentoDelPropietario(p({ id: 'c', datosPendientes: ['tipoDocumentoPorRevisar'] }))).toBe('MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR')
    expect(faltaDelDocumentoDelPropietario(p({ id: 'd', datosPendientes: ['cuentaBancaria'] }))).toBeNull()
    // Los tres códigos son los del freno, uno a uno.
    expect(Object.keys(QUE_FALTA_EN_PALABRAS).sort()).toEqual([...CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE].sort())
  })

  it('🔴 sin mandato no frena ninguna factura por mandato: no cuenta', () => {
    expect(faltaDelDocumentoDelPropietario(p({ id: 'e', propertyCount: 0, copropiedadesCount: 0, datosPendientes: ['tipoDocumento'] }))).toBeNull()
    // Una copropiedad sí es un mandato suyo.
    expect(faltaDelDocumentoDelPropietario(p({ id: 'f', propertyCount: 0, copropiedadesCount: 1, datosPendientes: ['tipoDocumento'] }))).toBe('MANDANTE_SIN_TIPO_DE_DOCUMENTO')
  })

  it('los rótulos son los de la fila frenada en Facturación', () => {
    expect(QUE_FALTA_EN_PALABRAS).toEqual({
      MANDANTE_SIN_DOCUMENTO: 'Falta el documento del propietario',
      MANDANTE_SIN_TIPO_DE_DOCUMENTO: 'Falta el tipo de documento del propietario',
      MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR: 'Revisa el tipo de documento del propietario',
    })
    expect(RUTA_DE_LOS_QUE_FALTAN).toBe(`/panel/inmobiliaria/propietarios?${PARAMETRO_FALTA}=${FALTA_TIPO_DE_DOCUMENTO}`)
  })
})

describe('AVISO-TIPO-DOC · quién lo ve', () => {
  const con = (permitidos: string[]) => (m: string, a: string) => permitidos.includes(`${m}:${a}`)
  it('🔴 administrador siempre; contador sólo si edita propietarios; nadie más', () => {
    expect(puedeVerElAviso({ isAdmin: true, agencyRole: 'ADMIN', canAccess: con([]) })).toBe(true)
    expect(puedeVerElAviso({ isAdmin: false, agencyRole: 'CONTADOR', canAccess: con(['propietarios:edit']) })).toBe(true)
    expect(puedeVerElAviso({ isAdmin: false, agencyRole: 'CONTADOR', canAccess: con(['propietarios:view']) })).toBe(false)
    // El asesor edita propietarios, pero la facturación no es suya.
    expect(puedeVerElAviso({ isAdmin: false, agencyRole: 'AGENTE', canAccess: con(['propietarios:edit']) })).toBe(false)
    expect(puedeVerElAviso({ isAdmin: false, agencyRole: null, canAccess: con(['propietarios:edit']) })).toBe(false)
  })
})

describe('AVISO-TIPO-DOC · lo que manda el back', () => {
  const delBack = {
    mes: '2026-10',
    nombreDelMes: 'Octubre de 2026',
    total: 2,
    facturasDelMes: 3,
    propietarios: [
      { id: 'p-1', nombre: 'Inversiones Laboratorio S.A.S.', falta: 'MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR', queFalta: 'Revisa el tipo de documento del propietario', facturasDelMes: 2 },
      { id: 'p-2', nombre: 'QA-FACT E2', falta: 'MANDANTE_SIN_TIPO_DE_DOCUMENTO', queFalta: 'Falta el tipo de documento del propietario', facturasDelMes: 1 },
      { id: 'p-x', nombre: 'Raro', falta: 'OTRA_COSA', facturasDelMes: 9 },
    ],
    titulo: '2 propietarios con el documento por completar: sus facturas por mandato no se emiten hasta completarlo',
    detalle: 'En octubre de 2026 son 3 facturas por mandato que no se emiten por esto. Complétalo en la ficha de cada uno y se emiten.',
    enlace: '/panel/inmobiliaria/propietarios?falta=tipo-de-documento',
  }

  it('🔴 se lee tal cual; una fila que no se entiende no se pinta', () => {
    const a = leerAviso(delBack)
    expect(a).toMatchObject({ total: 2, facturasDelMes: 3, titulo: delBack.titulo, detalle: delBack.detalle, enlace: delBack.enlace })
    expect(a?.propietarios.map((x) => x.id)).toEqual(['p-1', 'p-2'])
    expect(hayAviso(a)).toBe(true)
  })

  it('sin propietarios, sin título o con basura: no hay aviso; un enlace raro vuelve a la lista', () => {
    expect(hayAviso(leerAviso({ ...delBack, total: 0, titulo: null }))).toBe(false)
    expect(hayAviso(leerAviso({ ...delBack, titulo: '' }))).toBe(false)
    expect(leerAviso(null)).toBeNull()
    expect(leerAviso({ titulo: 'x' })).toBeNull()
    expect(leerAviso({ ...delBack, enlace: 'https://afuera.example' })?.enlace).toBe(RUTA_DE_LOS_QUE_FALTAN)
    expect(leerAviso({ ...delBack, facturasDelMes: null })?.facturasDelMes).toBeNull()
  })
})

describe('AVISO-TIPO-DOC · el filtro de la lista', () => {
  const lista = [
    p({ id: 'sin-tipo', datosPendientes: ['tipoDocumento'] }),
    p({ id: 'por-revisar', datosPendientes: ['tipoDocumentoPorRevisar'] }),
    p({ id: 'sin-documento', datosPendientes: ['documento', 'tipoDocumento'] }),
    p({ id: 'completo' }),
    p({ id: 'sin-mandato', propertyCount: 0, datosPendientes: ['tipoDocumento'] }),
    p({ id: 'solo-cuenta', datosPendientes: ['cuentaBancaria'] }),
  ]

  it('🔴 `falta: tipoDocumento` deja exactamente a los que frenan', () => {
    const r = filtrarPropietarios(lista, { ...FILTROS_INICIALES, falta: 'tipoDocumento' })
    expect(r.map((x) => x.id).sort()).toEqual(['por-revisar', 'sin-documento', 'sin-tipo'])
    expect(hayFiltros({ ...FILTROS_INICIALES, falta: 'tipoDocumento' })).toBe(true)
  })

  it('sin el filtro, la lista entera (como siempre) y los conteos de los chips lo respetan', () => {
    expect(FILTROS_INICIALES.falta).toBeNull()
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false)
    expect(filtrarPropietarios(lista, FILTROS_INICIALES)).toHaveLength(6)
    expect(conteosDePropietarios(lista, { ...FILTROS_INICIALES, falta: 'tipoDocumento' }).todos).toBe(3)
    // Un filtro armado a mano sin `falta` (los de antes) sigue valiendo.
    const { falta: _f, ...sinFalta } = FILTROS_INICIALES
    void _f
    expect(filtrarPropietarios(lista, sinFalta)).toHaveLength(6)
  })
})
