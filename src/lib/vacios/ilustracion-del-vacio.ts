import type { NombreIlustracion } from '@leasefy/cadence';

/**
 * La ilustración 3D de un estado vacío (Nico, 23-10-2026: «todo empty state debe tener sí o sí una ilustración 3D
 * asociada»). Cuando la pantalla no elige una, se deduce de lo que falta: el título, lo que son («pagos»,
 * «contratos») o la descripción. La primera regla que calza gana, por eso las más específicas van primero
 * («nota crédito» es factura antes que «nota»; «pago en línea» es datáfono antes que «pago»).
 */
const REGLAS: ReadonlyArray<readonly [RegExp, NombreIlustracion]> = [
  [/servicios? p[uú]blicos?|energ[ií]a|acueducto|\bagua\b|\bgas\b/, 'bombillo'],
  [/pagos? en l[ií]nea|pasarela|wompi|dat[aá]fono|medios? de (pago|recibo)/, 'datafono'],
  [/notas? (cr[eé]dito|d[eé]bito)|factura|resoluci[oó]n|recibo|electr[oó]nica/, 'factura'],
  [/\bipc\b|incremento|reajuste/, 'ipc'],
  [/aval[uú]o|canon|precio/, 'canon'],
  [/mora|vencid|atrasad|siniestro/, 'reloj_mora'],
  [/cobranza|deud|cartera|acuerdo|cobro jur[ií]dico|honorario|carta/, 'sobre_cobro'],
  [/cuota|calendario|vencimiento/, 'calendario_pago'],
  [/extracto|banc|concilia|dispersi|giro|traslado|transferencia/, 'banco'],
  [/liquidaci|impuest|retenci|contab|asiento|\bpuc\b|balance|ex[oó]gena|n[oó]mina|desprendible/, 'calculadora'],
  [/reporte|m[eé]trica|desempe[nñ]o|ranking|indicador|informe|estad[ií]stic|carga de trabajo|\bmeta|puntaje/, 'grafica'],
  [/comisi|ingreso|egreso|gasto|\bcaja\b|plata|saldo|anticipo|costo|ventas?\b/, 'monedas'],
  [/dep[oó]sito|ahorro|fondo/, 'alcancia'],
  [/pago|recaudo|cobro|abono/, 'billetera'],
  [/firma/, 'firma'],
  [/contrato|mandato|renovaci|cl[aá]usula|plantilla|pagar[eé]|terminaci/, 'contrato'],
  [/aprobaci|aprobad|certificad/, 'sello'],
  [/asegur|p[oó]liza|seguro|permiso|protecci[oó]n|habeas|\barco\b|seguridad|riesgo/, 'escudo'],
  [/estudio|evaluaci|calificaci|score|verificaci|bur[oó]/, 'lupa_estudio'],
  [/mantenimiento|reparaci|ticket|arreglo|da[nñ]o|proveedor/, 'llave_destornillador'],
  [/inventario|acta|entrega/, 'inventario'],
  [/mudanza|desocup|salida/, 'mudanza'],
  [/visita|agenda|\bcita/, 'visita'],
  [/recorrido|tour/, 'recorrido'],
  [/foto|video|imagen|galer[ií]a/, 'camara'],
  [/mapa|ubicaci|zona|barrio|direcci[oó]n/, 'mapa'],
  [/favorit|guardad|que sigues|seguid/, 'favorito'],
  [/prospect|captaci|\blead|campa[nñ]a|publicaci|anuncio|aviso de arriendo/, 'megafono'],
  [/notificaci|alerta|recordatorio|aviso/, 'campana'],
  [/llamada|mensaje|chat|conversaci|whatsapp|comentario|pregunta|lecci/, 'mensajes'],
  [/correo|env[ií]o|invitaci/, 'correo_enviado'],
  [/equipo|miembro|usuario|asesor|agente|abogado|especialista|sede/, 'equipo'],
  [/propietario|due[nñ]o|llave/, 'llaves'],
  [/inquilino|arrendatario|persona|cliente|tercero|deudor|codeudor|c[eé]dula/, 'cedula'],
  [/solicitud|postulaci|pqrs|requisito|tarea|pendiente|caso|escalaci|intento|bit[aá]cora|movimiento|historial|registro/, 'portapapeles'],
  [/parqueadero/, 'parqueadero'],
  [/bodega/, 'bodega'],
  [/local/, 'local'],
  [/lote/, 'lote'],
  [/edificio|inmobiliaria|torre/, 'edificio'],
  [/plan\b|suscripci/, 'plan_insignia'],
  [/novedad/, 'novedad_regalo'],
  [/bandeja|buz[oó]n|recibid/, 'buzon'],
  [/inmueble|propiedad|casa|apartamento|vivienda|arriendo|unidad/, 'casa'],
  [/documento|archivo|soporte|adjunto|carga|lote de/, 'carpeta'],
];

function normal(t: string): string {
  return t.toLowerCase();
}

/**
 * Elige la ilustración por los textos del vacío, en orden (lo primero que se pasa pesa más).
 * Sin ninguna pista: la carpeta.
 */
export function ilustracionDelVacio(...textos: Array<string | null | undefined>): NombreIlustracion {
  for (const texto of textos) {
    if (!texto) continue;
    const t = normal(texto);
    for (const [re, nombre] of REGLAS) if (re.test(t)) return nombre;
  }
  return 'carpeta';
}
