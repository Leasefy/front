/**
 * Qué pide CADA portal para conectarse de verdad — y qué se anota mientras tanto.
 *
 * ── Por qué existe este archivo (Nico, 19-09-2026) ──────────────────────────
 *
 * «¿Estás seguro que eso es todo lo que se necesita para poder conectar con una
 * cuenta de esos portales? Creo que hasta para conectar con cada portal puede
 * ser diferente cada portal. Revisa bien.»
 *
 * Tenía razón, y de paso destapó que una afirmación del propio código era
 * falsa. El diálogo pedía los MISMOS tres campos para los seis portales
 * —«cómo la llamas», «usuario o código», «notas»— como si conectarse a
 * Metrocuadrado y a Mercado Libre fuera lo mismo. No lo es:
 *
 *   · Metrocuadrado pide CUATRO credenciales y, además, son distintas de las
 *     de entrar al portal: pedirle a alguien «el usuario con el que entras a
 *     su panel» lo manda derecho a escribir el dato equivocado.
 *   · Mercado Libre no pide usuario ni clave: es OAuth con un botón.
 *   · Ciencuadras la genera la propia inmobiliaria en 30 segundos desde su
 *     panel — y nadie se lo estaba diciendo.
 *
 * ── 🔴 Lo que esta pantalla ES hoy, dicho sin vueltas ───────────────────────
 *
 * Una LIBRETA. Leasefy todavía no publica en ningún portal de afuera: lo que se
 * guarda acá es a nombre de quién está la cuenta, para que quien carga el
 * archivo en el panel del portal sepa con qué usuario entrar. Por eso no se
 * piden contraseñas y por eso el modo es siempre `EXPORTACION`.
 *
 * Lo que este archivo agrega es que la libreta DEJE DE MENTIR por omisión:
 * cada portal dice con qué se lo identifica y qué haría falta el día que se
 * conecte de verdad. Nadie descubre a mitad de camino que su portal pedía
 * cuatro datos y no uno.
 *
 * ── Procedencia, y con qué confianza ────────────────────────────────────────
 *
 * Verificado el 19-09-2026. Mercado Libre y Proppit documentan OFICIALMENTE
 * (developers.mercadolibre.com.co «Publica Inmuebles», act. 28-08-2026 ·
 * info.proppit.com, spec de Colombia act. 06-08-2026). Fincaraíz,
 * Metrocuadrado y Ciencuadras NO tienen documentación pública propia: lo de
 * acá sale de la documentación de dos integradores reales que coinciden entre
 * sí (Nuby/Arrendasoft y Wasi). Por eso la pantalla no afirma «el portal pide
 * X»: dice «pídele a tu asesor X», que es la acción correcta aunque el nombre
 * exacto del campo haya cambiado.
 *
 * 🔴 Y cambia: Fincaraíz ya mudó su esquema al menos dos veces (usuario/clave
 * de seguridad → api key → ID de Cliente). Este archivo es el único lugar que
 * hay que tocar cuando vuelva a cambiar.
 */

export interface ComoSeConecta {
  /** Con qué dato se identifica la cuenta en ese portal, en sus palabras. */
  rotuloDelIdentificador: string
  /** Qué escribir en ese campo, como ejemplo. */
  ejemploDelIdentificador: string
  /** Una línea que evita el error más común de ese portal. */
  cuidado?: string
  /**
   * Qué haría falta el día que se conecte de verdad. Se muestra en la tarjeta
   * del portal, detrás del botón «Qué pide …» que abre un modal (21-09: antes
   * estaba plegado dentro del diálogo de la cuenta, o sea a dos clics de donde
   * se decide). Hoy no se pide nada de esto, pero saberlo cambia a quién se
   * llama.
   */
  paraConectarloDeVerdad: readonly string[]
  /** Dónde lo dice el portal (o quien lo integra). */
  fuente: string
}

export const COMO_SE_CONECTA: Record<string, ComoSeConecta> = {
  FINCARAIZ: {
    rotuloDelIdentificador: 'ID de Cliente',
    ejemploDelIdentificador: 'El que te dio tu ejecutivo de Fincaraíz',
    cuidado:
      'El correo de contacto de los avisos tiene que estar dado de alta como asesor en tu cuenta del portal, o Fincaraíz los rechaza.',
    paraConectarloDeVerdad: [
      'Que Fincaraíz habilite la opción «Integración» en tu usuario.',
      'El ID de Cliente, que entrega tu ejecutivo comercial (no se saca del panel).',
      'Los teléfonos y correos de contacto de los avisos, ya registrados como asesores.',
    ],
    fuente: 'Sin documentación pública del portal; verificado con Nuby/Arrendasoft y Wasi.',
  },
  METROCUADRADO: {
    rotuloDelIdentificador: 'Usuario de integración',
    ejemploDelIdentificador: 'El que te dio tu asesor de Metrocuadrado',
    cuidado:
      'No son tus datos de entrar al portal: Metrocuadrado entrega credenciales aparte, sólo para integración.',
    paraConectarloDeVerdad: [
      'Que Metrocuadrado habilite la opción «Integración» en tu usuario.',
      'Cuatro datos del asesor: usuario, contraseña, identificación (tu NIT) y API Key.',
      'Ninguno de los cuatro es el usuario con el que entras a metrocuadrado.com.',
    ],
    fuente: 'Sin documentación pública del portal; verificado con Nuby/Arrendasoft y Wasi.',
  },
  CIENCUADRAS: {
    rotuloDelIdentificador: 'Correo con el que entras a Ciencuadras',
    ejemploDelIdentificador: 'arriendos@tuinmobiliaria.com',
    cuidado:
      'Es el único portal donde la contraseña de integración la generas tú: en Ciencuadras, Mis datos → «Generar accesos integrador WS3». Se muestra UNA sola vez.',
    paraConectarloDeVerdad: [
      'Tu correo de acceso al portal (el mismo con el que entras).',
      'La contraseña de integración que generas en Mis datos → «Generar accesos integrador WS3».',
      'Si el botón no aparece, pídele a tu asesor que habilite la integración.',
    ],
    fuente: 'Sin documentación pública del portal; verificado con Nuby/Arrendasoft y Wasi.',
  },
  MERCADO_LIBRE: {
    rotuloDelIdentificador: 'Usuario de Mercado Libre',
    ejemploDelIdentificador: 'El de la cuenta ADMINISTRADORA, no la de un colaborador',
    cuidado:
      'Mercado Libre no se conecta con usuario y clave: se autoriza con un botón. Acá sólo anotamos de quién es la cuenta.',
    paraConectarloDeVerdad: [
      'Autorizar a Leasefy desde tu cuenta administradora (un botón, no una clave).',
      'Tener tu usuario activado como inmobiliaria: se pide por el formulario de soporte de Mercado Libre.',
      'Un paquete de publicaciones vigente. Sin cupos disponibles, el aviso no se crea.',
    ],
    fuente: 'developers.mercadolibre.com.co · guía «Publica Inmuebles», 28-08-2026.',
  },
  PROPERATI: {
    rotuloDelIdentificador: 'Cuenta de Proppit',
    ejemploDelIdentificador: 'El nombre de tu cuenta en Proppit',
    cuidado:
      'En Properati no se publica directo: se publica en Proppit, que reparte a Properati y a sus otros sitios.',
    paraConectarloDeVerdad: [
      'Una suscripción activa a Proppit (LIFULL Connect).',
      'Que Leasefy le entregue a Proppit una dirección con tu catálogo en XML; ellos la leen UNA vez al día.',
      'Que el soporte de Proppit habilite la conexión: no se activa solo.',
    ],
    fuente: 'info.proppit.com · spec de Colombia, 06-08-2026.',
  },
  SITIO_PROPIO: {
    rotuloDelIdentificador: 'Nombre del catálogo',
    ejemploDelIdentificador: 'El sitio de tu inmobiliaria',
    paraConectarloDeVerdad: [
      'Nada: el catálogo de Leasefy es nuestro y publica solo.',
    ],
    fuente: 'Es nuestro.',
  },
}

/** Lo genérico, para un portal que todavía no esté en la tabla. */
export const CONEXION_GENERICA: ComoSeConecta = {
  rotuloDelIdentificador: 'Usuario o código en el portal',
  ejemploDelIdentificador: 'El usuario con el que entras a su panel',
  paraConectarloDeVerdad: [
    'Pregúntale a tu asesor del portal qué pide para integrarse con un sistema externo.',
  ],
  fuente: 'Sin verificar.',
}

export function comoSeConecta(portal: string): ComoSeConecta {
  return COMO_SE_CONECTA[portal] ?? CONEXION_GENERICA
}
