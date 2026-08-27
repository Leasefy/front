/**
 * columnas-de-contrato — leer el export de contratos de otro sistema.
 *
 * ── Por qué esto NO reusa el mapeo de inmuebles ─────────────────────────────
 *
 * El importador de inmuebles **bloquea a propósito** las columnas del
 * inquilino: `arrendatario`, `inquilino`, `codeudor`, `deudor solidario`,
 * `fiador` están en `ENCABEZADOS_SIN_CAMPO`. Se pusieron ahí porque
 * «Celular arrendatario» se auto-mapeaba a `ownerPhone` con confianza 0.92 —
 * el teléfono del inquilino terminaba guardado como el del propietario.
 *
 * Para un contrato, esas columnas son **justo lo que necesitamos**. El bloqueo
 * no se borra: se vuelve condicional al tipo de importación, porque en un
 * import de inmuebles sigue siendo correcto.
 *
 * ── La trampa que ya nos costó caro ─────────────────────────────────────────
 *
 * `arrendador` (el propietario) y `arrendatario` (el inquilino) se diferencian
 * en dos letras y significan lo contrario. Acá el orden importa: se evalúa
 * `arrendatario` ANTES que `arrendador`, porque el segundo es prefijo del
 * primero y la comparación es por `includes`.
 */

/** Los campos de un contrato migrado que se pueden llenar desde un archivo. */
export type CampoDeContrato =
  | 'direccionInmueble'
  | 'inquilinoNombre'
  | 'inquilinoCorreo'
  | 'inquilinoTelefono'
  | 'inquilinoDocumento'
  | 'fechaInicio'
  | 'fechaFin'
  | 'canon'
  | 'deposito'
  | 'diaDePago'
  | 'uso'
  | 'periodicidad'
  | 'comision'

/**
 * Sinónimos por campo, del más específico al más genérico.
 *
 * ⚠️ El orden de las CLAVES importa: gana la primera que empate. `inquilino*`
 * va antes que cualquier cosa con `arrendador` para que «Teléfono del
 * arrendatario» no caiga en un campo del propietario.
 */
export const SINONIMOS: Array<{ campo: CampoDeContrato; terminos: string[] }> = [
  {
    campo: 'inquilinoCorreo',
    terminos: [
      'correo del arrendatario', 'correo arrendatario', 'email arrendatario',
      'correo del inquilino', 'correo inquilino', 'email inquilino',
      'mail inquilino', 'e-mail inquilino',
    ],
  },
  {
    campo: 'inquilinoTelefono',
    terminos: [
      'telefono del arrendatario', 'celular del arrendatario', 'telefono arrendatario',
      'celular arrendatario', 'whatsapp arrendatario', 'movil arrendatario',
      'telefono del inquilino', 'celular del inquilino', 'telefono inquilino',
      'celular inquilino', 'whatsapp inquilino',
    ],
  },
  {
    campo: 'inquilinoDocumento',
    terminos: [
      'cedula del arrendatario', 'documento del arrendatario', 'cedula arrendatario',
      'documento arrendatario', 'nit arrendatario', 'identificacion arrendatario',
      'cedula del inquilino', 'documento del inquilino', 'cedula inquilino',
      'documento inquilino', 'identificacion inquilino',
    ],
  },
  {
    campo: 'inquilinoNombre',
    terminos: [
      'nombre del arrendatario', 'nombre arrendatario', 'arrendatario',
      'nombre del inquilino', 'nombre inquilino', 'inquilino', 'tenant',
    ],
  },
  {
    campo: 'fechaInicio',
    terminos: [
      'fecha de inicio', 'fecha inicio', 'inicio del contrato', 'inicio contrato',
      'desde', 'vigencia desde', 'start date',
    ],
  },
  {
    campo: 'fechaFin',
    terminos: [
      'fecha de terminacion', 'fecha de fin', 'fecha fin', 'fin del contrato',
      'fin contrato', 'hasta', 'vigencia hasta', 'vencimiento', 'end date',
    ],
  },
  {
    campo: 'deposito',
    terminos: ['deposito', 'garantia', 'deposito de garantia'],
  },
  {
    campo: 'canon',
    terminos: [
      'canon de arrendamiento', 'canon mensual', 'valor del canon', 'valor canon',
      'canon', 'arriendo', 'valor arriendo', 'renta mensual', 'rent',
    ],
  },
  {
    campo: 'diaDePago',
    terminos: [
      'dia de pago', 'dia pago', 'dia de plazo', 'plazo de pago', 'dia limite',
      'fecha de pago',
    ],
  },
  {
    campo: 'uso',
    terminos: ['uso del inmueble', 'uso', 'destinacion', 'destino'],
  },
  {
    campo: 'periodicidad',
    terminos: ['periodicidad', 'frecuencia de pago', 'frecuencia'],
  },
  {
    campo: 'comision',
    terminos: [
      'comision de administracion', 'porcentaje de comision', 'comision',
      '% administracion', 'honorarios',
    ],
  },
  {
    /*
     * Va de última y SIN `inmueble` ni `predio` a secas. Con esos términos,
     * «Uso del inmueble» se mapeaba a la dirección: una palabra genérica
     * empata con encabezados que hablan de otra cosa, y el auto-mapeo no
     * duda — asigna y sigue. Lo agarró el test, no la lectura del código.
     */
    campo: 'direccionInmueble',
    terminos: [
      'direccion del inmueble', 'direccion inmueble', 'direccion del predio',
      'direccion', 'address',
    ],
  },
]

/**
 * Encabezados para los que NO tenemos campo en un contrato.
 *
 * Sin campo es un resultado válido: la persona lo mapea a mano si quiere. Lo
 * que no puede pasar es que se auto-asignen a otra cosa con confianza alta —
 * ese error se comete UNA vez y sale en la factura.
 */
export const SIN_CAMPO_EN_CONTRATO = [
  'matricula inmobiliaria', 'chip catastral', 'estrato',
  'consecutivo', 'referencia interna',
  'observaciones', 'notas',
]

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface MapeoDeColumna {
  columna: string
  campo: CampoDeContrato | null
  /** Qué término del diccionario empató. Vacío si no empató nada. */
  porque: string
  /** La persona lo corrigió a mano — no es el resultado del auto-mapeo. */
  isManual?: boolean
}

/**
 * Mapea los encabezados de un archivo a campos de contrato.
 *
 * Devuelve SIEMPRE el motivo del empate. El auto-mapeo se equivoca con
 * confianza alta —así fue como «Celular arrendatario» terminó de teléfono del
 * propietario—, y un número sin explicación no se puede revisar: la persona
 * sólo puede confiar o no confiar.
 */
export function mapearColumnas(encabezados: string[]): MapeoDeColumna[] {
  const usados = new Set<CampoDeContrato>()

  return encabezados.map((columna) => {
    const n = normalizar(columna)

    if (SIN_CAMPO_EN_CONTRATO.some((t) => n.includes(t))) {
      return { columna, campo: null, porque: '' }
    }

    for (const { campo, terminos } of SINONIMOS) {
      // Un campo se llena una vez: si el archivo trae dos columnas parecidas,
      // la segunda queda sin mapear en vez de pisar a la primera en silencio.
      if (usados.has(campo)) continue
      const termino = terminos.find((t) => n.includes(t))
      if (termino) {
        usados.add(campo)
        return { columna, campo, porque: termino }
      }
    }

    return { columna, campo: null, porque: '' }
  })
}

/**
 * Los campos que más importan para poder liquidar y facturar un contrato.
 *
 * Ya NO bloquean el import — «no puedo exigir un archivo estándar porque
 * todos los clientes pueden subir Excel diferentes» (owner). Sólo alimentan
 * el aviso informativo: qué conviene completar después de revisar. `uso` no
 * es capricho: vivienda va sin IVA y comercial no, y una factura sin IVA se
 * ve idéntica a una a la que se le olvidó el IVA.
 */
export const CAMPOS_CLAVE: CampoDeContrato[] = [
  'direccionInmueble',
  'inquilinoNombre',
  'inquilinoCorreo',
  'fechaInicio',
  'fechaFin',
  'canon',
  'diaDePago',
  'uso',
]

/**
 * Qué campos clave no se mapearon a ninguna columna. Informativo, no bloquea:
 * la lista de trabajo (`FaltantesDeFila`) es donde se completan fila por
 * fila después.
 */
export function sinMapear(mapeo: MapeoDeColumna[]): CampoDeContrato[] {
  const mapeados = new Set(mapeo.map((m) => m.campo).filter(Boolean))
  return CAMPOS_CLAVE.filter((c) => !mapeados.has(c))
}

/**
 * Aplica un remapeo manual de UNA columna.
 *
 * Puerto de la interacción de `StepColumnMapping.tsx` (importador de
 * inmuebles) a este diccionario — `CampoDeContrato`/`MapeoDeColumna`, nunca
 * `ColumnMapping`/`TARGET_FIELDS`, que bloquea a propósito palabras de
 * inquilino que acá son justo lo que se necesita.
 *
 * Si el campo elegido ya lo reclamaba otra columna, esa otra lo pierde: dos
 * columnas apuntando al mismo campo pisarían el dato en silencio, igual que
 * en el auto-mapeo.
 */
export function remapear(
  mapeo: MapeoDeColumna[],
  columna: string,
  campo: CampoDeContrato | null,
): MapeoDeColumna[] {
  return mapeo.map((m) => {
    if (m.columna === columna) {
      return { columna, campo, porque: '', isManual: true }
    }
    if (campo && m.campo === campo && m.columna !== columna) {
      return { ...m, campo: null, porque: '', isManual: true }
    }
    return m
  })
}
