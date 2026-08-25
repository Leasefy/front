/**
 * Vista previa de una plantilla de WhatsApp.
 *
 * El operador estaba mandando mensajes a deudores reales sin ver el texto:
 * el modal sólo mostraba el id de la plantilla (`reminder_soft_co`) y cajas
 * vacías con nombres de variable en snake_case. Esto arma el mensaje que va a
 * salir para poder leerlo ANTES de enviarlo.
 *
 * ── Dos sintaxis, porque el registro del agente tiene dos ─────────────────
 *
 *  - **Numerada** `{{1}}`, `{{2}}` — las plantillas que se suben a Meta. El
 *    número es la POSICIÓN en `variables`, empezando en 1.
 *  - **Nombrada** `{deudor}`, `{link_pago}` — las de cartera, que el agente
 *    renderiza del lado del servidor y manda como texto plano.
 *
 * Una misma plantilla usa una sola de las dos, pero acá se soportan ambas
 * porque el modal las lista todas juntas.
 *
 * ⚠️ Esto es una PREVISUALIZACIÓN, no el renderizador de producción: quien
 * arma el mensaje que sale de verdad es el agente. Si el registro cambia de
 * sintaxis, esto queda corto — por eso los huecos se marcan en vez de
 * inventarse.
 */

/** Un placeholder que la vista previa no pudo llenar. */
export interface HuecoDePlantilla {
  /** Nombre de la variable (`overdue_month`) o su posición (`1`) si es numerada. */
  clave: string
  /** Texto legible para mostrar en el hueco, si lo hay. */
  etiqueta: string
}

export interface VistaPreviaPlantilla {
  /** El mensaje con los valores puestos. Los huecos quedan como `⟨Etiqueta⟩`. */
  texto: string
  /** Las variables que siguen sin valor. Vacío = el mensaje está completo. */
  huecos: HuecoDePlantilla[]
}

const NUMERADA = /\{\{(\d+)\}\}/g
const NOMBRADA = /\{([a-z_][a-z0-9_]*)\}/gi

/**
 * @param body        Cuerpo crudo de la plantilla, tal como lo manda el agente.
 * @param variables   Nombres de las variables EN ORDEN (`{{1}}` → `variables[0]`).
 * @param valores     Lo que escribió/heredó el operador, por nombre de variable.
 * @param etiquetas   Nombre legible por variable (`debtor_first_name` →
 *                    «Nombre del deudor»). Opcional: sin esto el hueco muestra
 *                    el nombre crudo, que es feo pero sigue siendo cierto.
 */
export function construirVistaPrevia(
  body: string,
  variables: readonly string[],
  valores: Readonly<Record<string, string>>,
  etiquetas: Readonly<Record<string, string>> = {},
): VistaPreviaPlantilla {
  const huecos: HuecoDePlantilla[] = []
  const yaMarcado = new Set<string>()

  const marcarHueco = (clave: string): string => {
    const etiqueta = etiquetas[clave] ?? clave
    if (!yaMarcado.has(clave)) {
      yaMarcado.add(clave)
      huecos.push({ clave, etiqueta })
    }
    return `⟨${etiqueta}⟩`
  }

  const valorDe = (nombre: string): string | null => {
    const v = valores[nombre]
    return typeof v === 'string' && v.trim().length > 0 ? v : null
  }

  let texto = body.replace(NUMERADA, (_coincidencia, n: string) => {
    const indice = Number(n) - 1
    const nombre = variables[indice]
    // Un `{{7}}` en una plantilla de 6 variables no es un hueco del operador:
    // es una plantilla mal declarada. Se deja tal cual para que se vea.
    if (nombre === undefined) return `{{${n}}}`
    return valorDe(nombre) ?? marcarHueco(nombre)
  })

  texto = texto.replace(NOMBRADA, (coincidencia, nombre: string) => {
    // Sólo se tocan los `{…}` que la plantilla declaró como variables. Cualquier
    // otra llave es texto del mensaje y se respeta.
    if (!variables.includes(nombre)) return coincidencia
    return valorDe(nombre) ?? marcarHueco(nombre)
  })

  return { texto, huecos }
}

/**
 * Primer nombre, para las plantillas que saludan («Hola {{1}}»).
 * `'Nicolás García Pérez'` → `'Nicolás'`.
 */
export function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] ?? ''
}
