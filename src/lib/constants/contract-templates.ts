/**
 * Contract templates and legal clauses
 * Based on Ley 820 de 2003 (Colombia)
 * These are static legal data, not mock data
 */

import type { ContractClause, ContractTemplate, ContractType } from '@/lib/types/contract';

// ============================================================================
// Contract Clauses by Type - Based on Ley 820 de 2003
// ============================================================================

/**
 * IMPORTANT LEGAL NOTES:
 * - Cash deposits are PROHIBITED in Colombia (Art. 16, Ley 820/2003)
 * - Must use codeudor (co-signer) or poliza de arrendamiento instead
 * - Rent increases limited to 100% of IPC annually (Art. 20)
 * - 3 months notice required for termination (Art. 22-24)
 */

const COMMON_CLAUSES: ContractClause[] = [
  {
    id: 'clause-objeto',
    title: 'CLAUSULA PRIMERA: Objeto del Contrato (Art. 3, Ley 820/2003)',
    content:
      'El ARRENDADOR entrega al ARRENDATARIO a titulo de arrendamiento el inmueble ubicado en la direccion indicada en este contrato, identificado con matricula inmobiliaria y cedula catastral correspondientes, para ser destinado exclusivamente a vivienda urbana del ARRENDATARIO y su nucleo familiar, de conformidad con el Articulo 3 literal f) de la Ley 820 de 2003. Queda expresamente prohibido darle un uso diferente al pactado, subarrendar total o parcialmente, o ceder el contrato sin autorizacion previa y escrita del ARRENDADOR.',
    required: true,
  },
  {
    id: 'clause-canon',
    title: 'CLAUSULA SEGUNDA: Canon de Arrendamiento (Art. 3d, 18 y 19, Ley 820/2003)',
    content:
      'El ARRENDATARIO se obliga a pagar al ARRENDADOR, como canon de arrendamiento, la suma mensual indicada en este contrato, pagadera por periodos mensuales anticipados dentro de los primeros cinco (5) dias de cada mes, mediante transferencia bancaria o consignacion a la cuenta designada por el ARRENDADOR. De conformidad con el Articulo 18 de la Ley 820 de 2003, el precio mensual del arrendamiento no podra exceder el uno por ciento (1%) del valor comercial del inmueble, y dicho valor comercial no podra superar el doble del avaluo catastral vigente (Art. 19). La mora en el pago superior a dos (2) meses constituira causal de terminacion del contrato conforme al Articulo 22 numeral 2.',
    required: true,
  },
  {
    id: 'clause-garantia',
    title: 'CLAUSULA TERCERA: Garantia del Contrato (Art. 16, Ley 820/2003)',
    content:
      'De conformidad con el Articulo 16 de la Ley 820 de 2003, queda expresamente PROHIBIDO exigir depositos en dinero efectivo, constituir garantias reales, o cualquier mecanismo directo o indirecto que implique deposito monetario como garantia del contrato. El cumplimiento de las obligaciones del presente contrato se garantiza mediante una de las siguientes modalidades legalmente permitidas: a) Poliza de seguro de arrendamiento expedida por compania aseguradora autorizada por la Superintendencia Financiera; b) Fiador o codeudor solidario que cumpla los requisitos de solvencia economica. La garantia debera mantenerse vigente durante toda la duración del contrato y sus prorrogas. PARAGRAFO: Unicamente se permite deposito para servicios publicos domiciliarios por valor maximo de dos (2) periodos consecutivos de facturacion, pagado directamente a la empresa de servicios, nunca al arrendador.',
    required: true,
  },
  {
    id: 'clause-duracion',
    title: 'CLAUSULA CUARTA: Duración y Prórroga (Art. 5, 6 y 7, Ley 820/2003)',
    content:
      'El término de duración del presente contrato es de doce (12) meses, contados a partir de la fecha de inicio estipulada. De conformidad con el Articulo 6 de la Ley 820 de 2003, a su vencimiento el contrato se entendera renovado automaticamente por un periodo igual al inicialmente pactado, en las mismas condiciones y terminos, salvo que alguna de las partes comunique a la otra por escrito, con no menos de tres (3) meses de antelacion al vencimiento del termino o de su prorroga, su decision de no renovarlo. PARAGRAFO: Conforme al Articulo 7, en caso de pluralidad de arrendadores o arrendatarios, las obligaciones del presente contrato seran solidarias.',
    required: true,
  },
  {
    id: 'clause-incremento',
    title: 'CLAUSULA QUINTA: Reajuste del Canon (Art. 20, Ley 820/2003)',
    content:
      'De conformidad con el Articulo 20 de la Ley 820 de 2003, cada doce (12) meses de ejecucion del contrato bajo un mismo precio, el ARRENDADOR podra incrementar el canon de arrendamiento. Dicho incremento no podra ser superior al ciento por ciento (100%) del Indice de Precios al Consumidor (IPC) del ano calendario inmediatamente anterior, certificado por el Departamento Administrativo Nacional de Estadistica (DANE). El ARRENDADOR debera informar al ARRENDATARIO el monto del reajuste con no menos de un (1) mes de antelacion a la fecha en que se haga efectivo. En ningun caso el canon reajustado podra exceder el limite del uno por ciento (1%) del valor comercial del inmueble establecido en el Articulo 18.',
    required: true,
  },
  {
    id: 'clause-administracion',
    title: 'CLAUSULA SEXTA: Cuota de Administracion (Ley 675/2001)',
    content:
      'Cuando el inmueble se encuentre sometido a regimen de propiedad horizontal conforme a la Ley 675 de 2001, las expensas comunes ordinarias (cuota de administracion) seran asumidas por el ARRENDATARIO durante la vigencia del contrato. Las expensas comunes extraordinarias aprobadas por la asamblea de copropietarios seran de cargo del ARRENDADOR, salvo acuerdo expreso en contrario. PARAGRAFO: De conformidad con el Articulo 29 de la Ley 675 de 2001, el propietario y el arrendatario del inmueble son solidariamente responsables de las obligaciones pecuniarias derivadas de las expensas comunes ordinarias.',
    required: true,
  },
  {
    id: 'clause-servicios',
    title: 'CLAUSULA SEPTIMA: Servicios Publicos Domiciliarios (Art. 3g, Ley 820/2003)',
    content:
      'De conformidad con el Articulo 3 literal g) de la Ley 820 de 2003, se establece que seran de cargo del ARRENDATARIO los servicios publicos domiciliarios de energia electrica, gas natural, acueducto, alcantarillado y aseo, asi como los servicios de telecomunicaciones (telefono, internet) que se causen durante la vigencia del contrato. El ARRENDATARIO debera acreditar el pago oportuno de dichos servicios cuando el ARRENDADOR lo solicite. La suspension o desconexion de servicios publicos por mora atribuible al ARRENDATARIO constituira causal de terminacion del contrato segun el Articulo 22 numeral 2 de la Ley 820 de 2003.',
    required: true,
  },
  {
    id: 'clause-obligaciones-arrendador',
    title: 'CLAUSULA OCTAVA: Obligaciones del Arrendador (Art. 8, Ley 820/2003)',
    content:
      'Son obligaciones del ARRENDADOR conforme al Articulo 8 de la Ley 820 de 2003: a) Entregar al ARRENDATARIO en la fecha convenida, o en el momento de la celebracion del contrato, el inmueble dado en arrendamiento en buen estado de servicio, seguridad y sanidad, y poner a su disposicion los servicios, cosas o usos conexos y adicionales convenidos. b) Mantener en el inmueble los servicios, las cosas y los usos conexos y adicionales en buen estado de servir para el fin convenido. c) Entregar al ARRENDATARIO una copia del contrato con firmas originales, dentro de los diez (10) dias habiles siguientes a su celebracion. d) Cuando el inmueble se encuentre sometido a regimen de propiedad horizontal, entregar copia del reglamento interno al ARRENDATARIO. e) Garantizar el uso y goce pacifico del inmueble por parte del ARRENDATARIO. f) Realizar las reparaciones y mejoras necesarias que no sean locativas menores.',
    required: true,
  },
  {
    id: 'clause-obligaciones-arrendatario',
    title: 'CLAUSULA NOVENA: Obligaciones del Arrendatario (Art. 9, Ley 820/2003)',
    content:
      'Son obligaciones del ARRENDATARIO conforme al Articulo 9 de la Ley 820 de 2003: a) Pagar el canon de arrendamiento dentro del plazo estipulado en el contrato, en el inmueble arrendado o en el lugar convenido. b) Cuidar el inmueble y las cosas recibidas en arrendamiento con la diligencia debida, y efectuar por su cuenta las reparaciones locativas menores conforme al Articulo 1998 del Codigo Civil. c) Pagar a tiempo los servicios publicos domiciliarios, cuotas de administracion y demas servicios conexos. d) No subarrendar ni ceder el arriendo, total ni parcialmente, sin autorizacion previa y escrita del ARRENDADOR. e) Restituir el inmueble a la terminacion del contrato en el estado en que fue entregado, salvo el deterioro proveniente del uso legitimo y del paso del tiempo. f) Cumplir las normas consagradas en los reglamentos de propiedad horizontal. g) Permitir al ARRENDADOR las reparaciones urgentes del inmueble.',
    required: true,
  },
  {
    id: 'clause-terminacion-arrendador',
    title: 'CLAUSULA DECIMA: Terminacion por el Arrendador (Art. 22, Ley 820/2003)',
    content:
      'De conformidad con los Articulos 22 y 23 de la Ley 820 de 2003, el ARRENDADOR podra dar por terminado unilateralmente el contrato por las siguientes causales: a) La no cancelacion del canon de arrendamiento y reajustes dentro del termino estipulado en el contrato, o la mora superior a dos (2) periodos consecutivos. b) La no cancelacion de los servicios publicos que cause la desconexion o perdida del servicio. c) El subarriendo total o parcial del inmueble, la cesion del contrato o del goce del inmueble, o el cambio de destinacion del mismo, sin autorizacion previa y escrita del ARRENDADOR. d) El incumplimiento de las normas del reglamento de propiedad horizontal. e) La realizacion de mejoras, cambios o ampliaciones del inmueble sin autorizacion escrita del ARRENDADOR. f) La necesidad del ARRENDADOR de ocupar el inmueble para su propia habitacion por un termino no menor de un (1) ano, previo aviso escrito con tres (3) meses de antelacion e indemnizacion equivalente al precio de tres (3) meses de arrendamiento.',
    required: true,
  },
  {
    id: 'clause-terminacion-arrendatario',
    title: 'CLAUSULA UNDECIMA: Terminacion por el Arrendatario (Art. 24, Ley 820/2003)',
    content:
      'De conformidad con el Articulo 24 de la Ley 820 de 2003, el ARRENDATARIO podra dar por terminado unilateralmente el contrato por: a) La suspension de la prestacion de los servicios publicos al inmueble, por accion o negligencia del ARRENDADOR. b) La incursion reiterada del ARRENDADOR en las conductas descritas en el Articulo 8 de la Ley 820 de 2003 como obligaciones a su cargo. c) El desconocimiento por parte del ARRENDADOR de derechos reconocidos al ARRENDATARIO por la ley o por el contrato. PARAGRAFO: Conforme al mismo Articulo 24, el ARRENDATARIO podra dar por terminado unilateralmente el contrato de arrendamiento a la fecha de vencimiento del termino inicial o de sus prorrogas, siempre que de previo aviso escrito al ARRENDADOR con tres (3) meses de antelacion a la referida fecha de vencimiento. En caso de terminacion anticipada sin justa causa, el ARRENDATARIO debera pagar al ARRENDADOR una indemnizacion equivalente al precio de tres (3) meses de arrendamiento.',
    required: true,
  },
  {
    id: 'clause-clausula-penal',
    title: 'CLAUSULA DUODECIMA: Clausula Penal (Art. 1592–1601, Codigo Civil)',
    content:
      'En caso de incumplimiento de cualquiera de las obligaciones contenidas en el presente contrato, la parte incumplida pagara a la parte cumplida, a titulo de clausula penal, una suma equivalente a tres (3) meses del canon de arrendamiento vigente al momento del incumplimiento, conforme a los Articulos 1592 a 1601 del Codigo Civil colombiano. Esta clausula penal se hara efectiva sin perjuicio del pago de los canones adeudados, servicios publicos, cuotas de administracion y demas obligaciones pendientes. PARAGRAFO: La exigibilidad de la clausula penal no podra hacerse de forma directa por el ARRENDADOR, requiriendo en caso de controversia la intervencion de la autoridad judicial competente.',
    required: true,
  },
  {
    id: 'clause-solidaridad',
    title: 'CLAUSULA DECIMOTERCERA: Solidaridad (Art. 7, Ley 820/2003)',
    content:
      'De conformidad con el Articulo 7 de la Ley 820 de 2003, los derechos y obligaciones derivados del presente contrato son solidarios. En caso de pluralidad de arrendatarios, todos responderan solidariamente por las obligaciones aqui pactadas. El codeudor o fiador designado como garante se obliga solidariamente con el ARRENDATARIO al cumplimiento de todas las obligaciones pecuniarias derivadas del presente contrato.',
    required: true,
  },
  {
    id: 'clause-notificaciones',
    title: 'CLAUSULA DECIMOCUARTA: Domicilio y Notificaciones (Art. 3h, Ley 820/2003)',
    content:
      'De conformidad con el Articulo 3 literal h) de la Ley 820 de 2003, las partes senalan como domicilio para todos los efectos judiciales y extrajudiciales derivados del presente contrato las direcciones fisicas y electronicas indicadas en el encabezado. Se consideraran validas las notificaciones enviadas por servicio postal autorizado, correo electronico con confirmacion de lectura, o cualquier medio que permita acreditar su recepcion. Cualquier cambio de domicilio debera notificarse por escrito a la otra parte dentro de los cinco (5) dias habiles siguientes.',
    required: true,
  },
  {
    id: 'clause-lavado-activos',
    title: 'CLAUSULA DECIMOQUINTA: Declaracion de Origen Licito de Recursos',
    content:
      'Las partes declaran bajo la gravedad del juramento que los recursos utilizados para el pago del canon de arrendamiento y demas obligaciones derivadas del presente contrato provienen de actividades licitas y que no se encuentran vinculados a ninguna actividad relacionada con el lavado de activos, financiacion del terrorismo, o cualquier actividad ilicita. Las partes se obligan a suministrar la informacion y documentacion que la otra parte o las autoridades competentes requieran para dar cumplimiento a las normas sobre prevencion de lavado de activos y financiacion del terrorismo.',
    required: true,
  },
  {
    id: 'clause-datos-personales',
    title: 'CLAUSULA DECIMOSEXTA: Proteccion de Datos Personales (Ley 1581/2012)',
    content:
      'En cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 sobre proteccion de datos personales, las partes autorizan de manera previa, expresa e informada el tratamiento de sus datos personales para los fines estrictamente relacionados con la celebracion y ejecucion del presente contrato, incluyendo: verificacion de identidad, evaluacion de riesgo crediticio, gestion de cobro, y comunicaciones contractuales. Los titulares podran ejercer sus derechos de conocer, actualizar, rectificar y suprimir sus datos, asi como revocar la autorizacion, dirigiendose al responsable del tratamiento conforme a la politica de privacidad de la plataforma.',
    required: true,
  },
  {
    id: 'clause-ley',
    title: 'CLAUSULA DECIMOSEPTIMA: Legislacion Aplicable y Resolucion de Conflictos',
    content:
      'El presente contrato se rige por la Ley 820 de 2003 sobre arrendamiento de vivienda urbana, la Ley 675 de 2001 sobre propiedad horizontal en lo pertinente, el Codigo Civil colombiano, y demas normas concordantes y complementarias. Para la resolucion de cualquier controversia derivada del presente contrato, las partes acuerdan: a) En primera instancia, intentar resolver el conflicto de manera directa y amigable. b) En caso de no lograrse acuerdo, acudir a los mecanismos alternativos de solucion de conflictos (conciliacion ante centro de conciliacion autorizado). c) En ultima instancia, someterse a la jurisdiccion de los jueces civiles municipales del domicilio del inmueble arrendado.',
    required: true,
  },
  {
    id: 'clause-firmas-electronicas',
    title: 'CLAUSULA DECIMOCTAVA: Validez de Firmas Electronicas (Ley 527/1999)',
    content:
      'De conformidad con la Ley 527 de 1999 sobre mensajes de datos y comercio electronico, el Decreto 2364 de 2012, y el Articulo 10 de la Ley 527 que reconoce la admisibilidad y fuerza probatoria de los mensajes de datos, las partes aceptan expresamente que las firmas electronicas estampadas en el presente contrato tienen la misma validez juridica y efectos legales que las firmas manuscritas. Las partes reconocen que el presente contrato no podra ser privado de efectos juridicos, validez o fuerza obligatoria por la sola razon de haberse celebrado por medios electronicos.',
    required: true,
  },
];

const FURNISHED_CLAUSES: ContractClause[] = [
  {
    id: 'clause-inventario',
    title: 'CLAUSULA ADICIONAL: Inventario de Bienes Muebles',
    content:
      'El inmueble se entrega amoblado con los bienes muebles, enseres, electrodomesticos y demas elementos detallados en el INVENTARIO ANEXO, el cual forma parte integral e inseparable del presente contrato. Dicho inventario debera contener: a) Descripcion detallada de cada bien. b) Estado de conservacion al momento de la entrega. c) Valor estimado de reposicion de cada bien. d) Registro fotografico. El inventario sera firmado por ambas partes al momento de la entrega del inmueble y servira como medio probatorio en caso de controversia sobre el estado de los bienes.',
    required: true,
  },
  {
    id: 'clause-daños-muebles',
    title: 'CLAUSULA ADICIONAL: Responsabilidad por Bienes Muebles',
    content:
      'El ARRENDATARIO se obliga a conservar y cuidar los bienes muebles entregados con la diligencia de un buen padre de familia. Los daños, deterioros o perdidas de bienes muebles que excedan el desgaste natural por uso legitimo y paso del tiempo seran de exclusiva responsabilidad del ARRENDATARIO, quien debera asumir el costo de reparacion o reposicion a valor de mercado vigente. Al momento de la restitucion del inmueble, se realizara un inventario de devolucion comparativo con el inventario inicial para determinar las diferencias.',
    required: true,
  },
];

const SHARED_CLAUSES: ContractClause[] = [
  {
    id: 'clause-espacio-arrendado',
    title: 'CLAUSULA ADICIONAL: Identificacion del Espacio Arrendado (Art. 4c, Ley 820/2003)',
    content:
      'De conformidad con el Articulo 4 literal c) de la Ley 820 de 2003, el presente contrato corresponde a la modalidad de arrendamiento compartido. Se arrienda al ARRENDATARIO la parte del inmueble identificada como [habitacion/espacio] con acceso a las siguientes areas comunes compartidas: cocina, sala, baños, zona de lavado. El ARRENDATARIO comparte el uso de estas areas con el ARRENDADOR y/u otros arrendatarios del inmueble.',
    required: true,
  },
  {
    id: 'clause-convivencia',
    title: 'CLAUSULA ADICIONAL: Normas de Convivencia (Art. 13, Ley 820/2003)',
    content:
      'De conformidad con el Articulo 13 de la Ley 820 de 2003, el ARRENDATARIO se obliga a cumplir las normas de mantenimiento, conservacion, uso y orden interno del inmueble, asi como las disposiciones del Codigo de Policia. Las normas de convivencia incluyen: a) Horarios de silencio (10:00 PM a 7:00 AM). b) Limpieza y orden de areas comunes despues de su uso. c) Respeto a la privacidad y pertenencias de los demas ocupantes. d) Prohibicion de ingreso de personas no autorizadas a pernoctar sin consentimiento del ARRENDADOR. El incumplimiento reiterado de estas normas constituira causal de terminacion del contrato.',
    required: true,
  },
  {
    id: 'clause-servicios-incluidos',
    title: 'CLAUSULA ADICIONAL: Servicios Incluidos y Limite de Cobro (Art. 4c, Ley 820/2003)',
    content:
      'El canon de arrendamiento incluye los siguientes servicios basicos: agua, energia electrica, gas natural e internet. El valor de estos servicios adicionales no podra exceder el cincuenta por ciento (50%) del precio del arrendamiento del espacio arrendado, conforme a lo establecido para la modalidad de arrendamiento compartido. Cualquier consumo excesivo o extraordinario imputable exclusivamente al ARRENDATARIO sera facturado de manera proporcional y debidamente soportado.',
    required: true,
  },
];

// ============================================================================
// Contract Templates
// ============================================================================

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'template-basico',
    type: 'basico',
    name: 'Contrato Basico',
    description:
      'Arriendo estandar sin muebles. Ideal para inquilinos que tienen sus propios muebles y buscan un espacio vacio para personalizar.',
    clauses: COMMON_CLAUSES,
  },
  {
    id: 'template-amoblado',
    type: 'amoblado',
    name: 'Contrato Amoblado',
    description:
      'Arriendo con muebles incluidos. Incluye inventario detallado de bienes y condiciones especiales para su cuidado.',
    clauses: [...COMMON_CLAUSES, ...FURNISHED_CLAUSES],
  },
  {
    id: 'template-compartido',
    type: 'compartido',
    name: 'Contrato Compartido',
    description:
      'Arriendo de habitacion con areas comunes compartidas. Incluye normas de convivencia y servicios basicos.',
    clauses: [...COMMON_CLAUSES, ...SHARED_CLAUSES],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getTemplateById(templateId: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === templateId);
}

export function getTemplateByType(type: ContractType): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.type === type);
}
