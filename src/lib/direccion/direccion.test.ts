import { describe, expect, it } from 'vitest'
import {
  CODIGO_DANE_DEL_DEPARTAMENTO,
  departamentoConocido,
  errorDeCodigoPostal,
  errorDeDireccion,
  limpiarCodigoPostalAlEscribir,
  limpiarDireccion,
} from './direccion'
import { DEPARTAMENTO_NOMBRES } from '@/lib/constants/colombia-geo'

describe('errorDeDireccion — direcciones colombianas reales pasan', () => {
  it.each([
    'Calle 10 # 43-20',
    'Cra. 76 No. 32-15 Apto 301',
    'Km 5 Vía Las Palmas',
    'Diagonal 75B Bis # 2A-80',
    'Av. Calle 26 # 69D-91 Of. 302',
    'Transversal 93 # 53-48 (Torre 2)',
    'Carrera 7 N° 71-21',
    'Carrera 7 Nº 71-21, Edificio Pijao',
    'Calle 5 Sur # 24-15 Int. 3/4',
    'Cl 72 # 10-07 Piso 4, Bogotá',
    'Vereda El Peñol Km 2',
    'Carrera 43A # 1A Sur-100',
    'Avenida Güemes 12-30',
  ])('«%s»', (direccion) => {
    expect(errorDeDireccion(direccion)).toBeNull()
  })

  it('acepta la tilde suelta del teclado del Mac (NFD) como la letra con tilde', () => {
    expect(errorDeDireccion('Km 5 Vía Las Palmas')).toBeNull()
  })

  it('vacía no es error: si es obligatoria lo dice el formulario', () => {
    expect(errorDeDireccion('')).toBeNull()
    expect(errorDeDireccion('   ')).toBeNull()
  })
})

describe('errorDeDireccion — la basura no pasa', () => {
  it('la del reporte de QA: «!@#$%^&*()(*&^%$»', () => {
    const mensaje = errorDeDireccion('!@#$%^&*()(*&^%$')
    expect(mensaje).toMatch(/no van en una dirección/)
    expect(mensaje).toContain('«!»')
    expect(mensaje).toContain('Calle 10 # 43-20')
  })

  it.each([
    ['Calle 10 @ 43-20', '«@»'],
    ['Calle 10 # 43-20 😀', '«😀»'],
    ['<script>alert(1)</script> 5', '«<»'],
    ['Calle 10 & 43', '«&»'],
    ['Calle {10} # 43', '«{»'],
    ['Calle 10 | 43', '«|»'],
    ['Calle 10 = 43 + 2', '«=»'],
    ['Calle 10 ~ 43', '«~»'],
    ['Calle 10 \\ 43', '«\\»'],
    ['Calle 10 # 43-20 $', '«$»'],
    ['Calle 10 # 43-20 %', '«%»'],
    ['Calle 10 # 43-20 *', '«*»'],
    ['Calle "10"', '«"»'],
  ])('«%s» → señala %s', (direccion, senalado) => {
    const mensaje = errorDeDireccion(direccion)
    expect(mensaje).not.toBeNull()
    expect(mensaje).toContain(senalado)
  })

  it('sin letras: le falta la vía', () => {
    expect(errorDeDireccion('12345')).toMatch(/le falta la vía/)
    expect(errorDeDireccion('# 43-20')).toMatch(/le falta la vía/)
  })

  it('sin números: le falta el número', () => {
    expect(errorDeDireccion('Calle sin número')).toMatch(/le falta el número/)
  })

  it('más de 120 caracteres: muy larga', () => {
    expect(errorDeDireccion(`Calle 10 # 43-20 ${'Torre '.repeat(20)}`)).toMatch(/muy larga/)
  })

  it('un salto de línea pegado cuenta como espacio, no como símbolo', () => {
    expect(limpiarDireccion('Calle 10\n# 43-20')).toBe('Calle 10 # 43-20')
    expect(errorDeDireccion('Calle 10\n# 43-20')).toBeNull()
  })
})

describe('limpiarCodigoPostalAlEscribir', () => {
  it('deja sólo dígitos y corta en seis, en vez del maxLength del navegador', () => {
    expect(limpiarCodigoPostalAlEscribir('05a0-02 1')).toBe('050021')
    expect(limpiarCodigoPostalAlEscribir('11011199')).toBe('110111')
    expect(limpiarCodigoPostalAlEscribir('!@#')).toBe('')
  })
})

describe('errorDeCodigoPostal', () => {
  it('vacío está bien: es opcional', () => {
    expect(errorDeCodigoPostal('')).toBeNull()
    expect(errorDeCodigoPostal('', 'Antioquia')).toBeNull()
  })

  it.each([
    ['050021', 'Antioquia'],
    ['110111', 'Bogotá D.C.'],
    ['110111', 'Bogota'],
    ['760001', 'Valle del Cauca'],
    ['080001', 'Atlántico'],
    ['250251', 'Cundinamarca'],
    ['880001', 'San Andrés y Providencia'],
    ['990001', 'Vichada'],
  ])('%s con %s pasa', (codigo, departamento) => {
    expect(errorDeCodigoPostal(codigo, departamento)).toBeNull()
  })

  it('el prefijo de otro departamento es error y dice cuál', () => {
    expect(errorDeCodigoPostal('110111', 'Antioquia')).toBe(
      'Ese código postal es de Bogotá D.C. Los de Antioquia empiezan por 05.',
    )
    expect(errorDeCodigoPostal('250251', 'Bogotá D.C.')).toMatch(/es de Cundinamarca/)
  })

  it('un prefijo que no es de ningún departamento es error', () => {
    expect(errorDeCodigoPostal('120000')).toMatch(/Ningún código postal de Colombia empieza por 12/)
    expect(errorDeCodigoPostal('000000')).toMatch(/empieza por 00/)
  })

  it('sin departamento reconocible: sólo los seis dígitos', () => {
    expect(errorDeCodigoPostal('050021')).toBeNull()
    expect(errorDeCodigoPostal('050021', 'Departamento inventado')).toBeNull()
  })

  it('largo y caracteres', () => {
    expect(errorDeCodigoPostal('12345')).toBe('El código postal tiene 6 dígitos; este tiene 5.')
    expect(errorDeCodigoPostal('0500211')).toBe('El código postal tiene 6 dígitos; este tiene 7.')
    expect(errorDeCodigoPostal('ab1234')).toMatch(/sólo lleva números/)
  })
})

describe('departamentos', () => {
  it('los 33 departamentos del selector del registro tienen su código DANE', () => {
    for (const nombre of DEPARTAMENTO_NOMBRES) {
      expect(departamentoConocido(nombre)?.codigo, nombre).toMatch(/^\d{2}$/)
    }
    expect(Object.keys(CODIGO_DANE_DEL_DEPARTAMENTO)).toHaveLength(33)
    expect(new Set(Object.values(CODIGO_DANE_DEL_DEPARTAMENTO)).size).toBe(33)
  })

  it('reconoce cómo lo guardan otras pantallas', () => {
    expect(departamentoConocido('ANTIOQUIA')?.codigo).toBe('05')
    expect(departamentoConocido('Bogotá')?.codigo).toBe('11')
    expect(departamentoConocido('Bogota D.C')?.codigo).toBe('11')
    expect(departamentoConocido('Valle')?.codigo).toBe('76')
    expect(departamentoConocido('Atlantico')?.codigo).toBe('08')
    expect(departamentoConocido('')).toBeNull()
    expect(departamentoConocido('Texas')).toBeNull()
  })
})
