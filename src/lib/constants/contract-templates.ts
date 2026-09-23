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
    title: 'CLÁUSULA PRIMERA: Objeto del Contrato (Art. 3, Ley 820/2003)',
    content:
      'El ARRENDADOR entrega al ARRENDATARIO a título de arrendamiento el inmueble ubicado en la dirección indicada en este contrato, identificado con matrícula inmobiliaria y cédula catastral correspondientes, para ser destinado exclusivamente a vivienda urbana del ARRENDATARIO y su núcleo familiar, de conformidad con el Artículo 3 literal f) de la Ley 820 de 2003. Queda expresamente prohibido darle un uso diferente al pactado, subarrendar total o parcialmente, o ceder el contrato sin autorización previa y escrita del ARRENDADOR.',
    required: true,
  },
  {
    id: 'clause-canon',
    title: 'CLÁUSULA SEGUNDA: Canon de Arrendamiento (Art. 3d, 18 y 19, Ley 820/2003)',
    content:
      'El ARRENDATARIO se obliga a pagar al ARRENDADOR, como canon de arrendamiento, la suma mensual indicada en este contrato, pagadera por periodos mensuales anticipados dentro de los primeros cinco (5) días de cada mes, mediante transferencia bancaria o consignación a la cuenta designada por el ARRENDADOR. De conformidad con el Artículo 18 de la Ley 820 de 2003, el precio mensual del arrendamiento no podrá exceder el uno por ciento (1%) del valor comercial del inmueble, y dicho valor comercial no podrá superar el doble del avalúo catastral vigente (Art. 19). La mora en el pago superior a dos (2) meses constituirá causal de terminación del contrato conforme al Artículo 22 numeral 2.',
    required: true,
  },
  {
    id: 'clause-garantia',
    title: 'CLÁUSULA TERCERA: Garantia del Contrato (Art. 16, Ley 820/2003)',
    content:
      'De conformidad con el Artículo 16 de la Ley 820 de 2003, queda expresamente PROHIBIDO exigir depósitos en dinero efectivo, constituir garantías reales, o cualquier mecanismo directo o indirecto que implique depósito monetario como garantia del contrato. El cumplimiento de las obligaciones del presente contrato se garantiza mediante una de las siguientes modalidades legalmente permitidas: a) Póliza de seguro de arrendamiento expedida por compañía aseguradora autorizada por la Superintendencia Financiera; b) Fiador o codeudor solidario que cumpla los requisitos de solvencia económica. La garantia deberá mantenerse vigente durante toda la duración del contrato y sus prórrogas. PARÁGRAFO: Únicamente se permite depósito para servicios públicos domiciliarios por valor máximo de dos (2) periodos consecutivos de facturación, pagado directamente a la empresa de servicios, nunca al arrendador.',
    required: true,
  },
  {
    id: 'clause-duracion',
    title: 'CLÁUSULA CUARTA: Duración y Prórroga (Art. 5, 6 y 7, Ley 820/2003)',
    content:
      'El término de duración del presente contrato es de doce (12) meses, contados a partir de la fecha de inicio estipulada. De conformidad con el Artículo 6 de la Ley 820 de 2003, a su vencimiento el contrato se entenderá renovado automáticamente por un periodo igual al inicialmente pactado, en las mismas condiciones y términos, salvo que alguna de las partes comunique a la otra por escrito, con no menos de tres (3) meses de antelación al vencimiento del término o de su prórroga, su decision de no renovarlo. PARÁGRAFO: Conforme al Artículo 7, en caso de pluralidad de arrendadores o arrendatarios, las obligaciones del presente contrato serán solidarias.',
    required: true,
  },
  {
    id: 'clause-incremento',
    title: 'CLÁUSULA QUINTA: Reajuste del Canon (Art. 20, Ley 820/2003)',
    content:
      'De conformidad con el Artículo 20 de la Ley 820 de 2003, cada doce (12) meses de ejecución del contrato bajo un mismo precio, el ARRENDADOR podrá incrementar el canon de arrendamiento. Dicho incremento no podrá ser superior al ciento por ciento (100%) del Índice de Precios al Consumidor (IPC) del año calendario inmediatamente anterior, certificado por el Departamento Administrativo Nacional de Estadística (DANE). El ARRENDADOR deberá informar al ARRENDATARIO el monto del reajuste con no menos de un (1) mes de antelación a la fecha en que se haga efectivo. En ningún caso el canon reajustado podrá exceder el límite del uno por ciento (1%) del valor comercial del inmueble establecido en el Artículo 18.',
    required: true,
  },
  {
    id: 'clause-administracion',
    title: 'CLÁUSULA SEXTA: Cuota de Administracion (Ley 675/2001)',
    content:
      'Cuando el inmueble se encuentre sometido a régimen de propiedad horizontal conforme a la Ley 675 de 2001, las expensas comunes ordinarias (cuota de administración) serán asumidas por el ARRENDATARIO durante la vigencia del contrato. Las expensas comunes extraordinarias aprobadas por la asamblea de copropietarios serán de cargo del ARRENDADOR, salvo acuerdo expreso en contrario. PARÁGRAFO: De conformidad con el Artículo 29 de la Ley 675 de 2001, el propietario y el arrendatario del inmueble son solidariamente responsables de las obligaciones pecuniarias derivadas de las expensas comunes ordinarias.',
    required: true,
  },
  {
    id: 'clause-servicios',
    title: 'CLÁUSULA SÉPTIMA: Servicios Publicos Domiciliarios (Art. 3g, Ley 820/2003)',
    content:
      'De conformidad con el Artículo 3 literal g) de la Ley 820 de 2003, se establece que serán de cargo del ARRENDATARIO los servicios públicos domiciliarios de energía eléctrica, gas natural, acueducto, alcantarillado y aseo, así como los servicios de telecomunicaciones (teléfono, internet) que se causen durante la vigencia del contrato. El ARRENDATARIO deberá acreditar el pago oportuno de dichos servicios cuando el ARRENDADOR lo solicite. La suspensión o desconexión de servicios públicos por mora atribuible al ARRENDATARIO constituirá causal de terminación del contrato según el Artículo 22 numeral 2 de la Ley 820 de 2003.',
    required: true,
  },
  {
    id: 'clause-obligaciones-arrendador',
    title: 'CLÁUSULA OCTAVA: Obligaciones del Arrendador (Art. 8, Ley 820/2003)',
    content:
      'Son obligaciones del ARRENDADOR conforme al Artículo 8 de la Ley 820 de 2003: a) Entregar al ARRENDATARIO en la fecha convenida, o en el momento de la celebración del contrato, el inmueble dado en arrendamiento en buen estado de servicio, seguridad y sanidad, y poner a su disposición los servicios, cosas o usos conexos y adicionales convenidos. b) Mantener en el inmueble los servicios, las cosas y los usos conexos y adicionales en buen estado de servir para el fin convenido. c) Entregar al ARRENDATARIO una copia del contrato con firmas originales, dentro de los diez (10) días hábiles siguientes a su celebración. d) Cuando el inmueble se encuentre sometido a régimen de propiedad horizontal, entregar copia del reglamento interno al ARRENDATARIO. e) Garantizar el uso y goce pacífico del inmueble por parte del ARRENDATARIO. f) Realizar las reparaciones y mejoras necesarias que no sean locativas menores.',
    required: true,
  },
  {
    id: 'clause-obligaciones-arrendatario',
    title: 'CLÁUSULA NOVENA: Obligaciones del Arrendatario (Art. 9, Ley 820/2003)',
    content:
      'Son obligaciones del ARRENDATARIO conforme al Artículo 9 de la Ley 820 de 2003: a) Pagar el canon de arrendamiento dentro del plazo estipulado en el contrato, en el inmueble arrendado o en el lugar convenido. b) Cuidar el inmueble y las cosas recibidas en arrendamiento con la diligencia debida, y efectuar por su cuenta las reparaciones locativas menores conforme al Artículo 1998 del Código Civil. c) Pagar a tiempo los servicios públicos domiciliarios, cuotas de administración y demás servicios conexos. d) No subarrendar ni ceder el arriendo, total ni parcialmente, sin autorización previa y escrita del ARRENDADOR. e) Restituir el inmueble a la terminación del contrato en el estado en que fue entregado, salvo el deterioro proveniente del uso legítimo y del paso del tiempo. f) Cumplir las normas consagradas en los reglamentos de propiedad horizontal. g) Permitir al ARRENDADOR las reparaciones urgentes del inmueble.',
    required: true,
  },
  {
    id: 'clause-terminacion-arrendador',
    title: 'CLÁUSULA DÉCIMA: Terminacion por el Arrendador (Art. 22, Ley 820/2003)',
    content:
      'De conformidad con los Artículos 22 y 23 de la Ley 820 de 2003, el ARRENDADOR podrá dar por terminado unilateralmente el contrato por las siguientes causales: a) La no cancelación del canon de arrendamiento y reajustes dentro del término estipulado en el contrato, o la mora superior a dos (2) periodos consecutivos. b) La no cancelación de los servicios públicos que cause la desconexión o pérdida del servicio. c) El subarriendo total o parcial del inmueble, la cesión del contrato o del goce del inmueble, o el cambio de destinación del mismo, sin autorización previa y escrita del ARRENDADOR. d) El incumplimiento de las normas del reglamento de propiedad horizontal. e) La realización de mejoras, cambios o ampliaciones del inmueble sin autorización escrita del ARRENDADOR. f) La necesidad del ARRENDADOR de ocupar el inmueble para su propia habitación por un término no menor de un (1) año, previo aviso escrito con tres (3) meses de antelación e indemnización equivalente al precio de tres (3) meses de arrendamiento.',
    required: true,
  },
  {
    id: 'clause-terminacion-arrendatario',
    title: 'CLÁUSULA UNDÉCIMA: Terminacion por el Arrendatario (Art. 24, Ley 820/2003)',
    content:
      'De conformidad con el Artículo 24 de la Ley 820 de 2003, el ARRENDATARIO podrá dar por terminado unilateralmente el contrato por: a) La suspensión de la prestación de los servicios públicos al inmueble, por acción o negligencia del ARRENDADOR. b) La incursión reiterada del ARRENDADOR en las conductas descritas en el Artículo 8 de la Ley 820 de 2003 como obligaciones a su cargo. c) El desconocimiento por parte del ARRENDADOR de derechos reconocidos al ARRENDATARIO por la ley o por el contrato. PARÁGRAFO: Conforme al mismo Artículo 24, el ARRENDATARIO podrá dar por terminado unilateralmente el contrato de arrendamiento a la fecha de vencimiento del término inicial o de sus prórrogas, siempre que de previo aviso escrito al ARRENDADOR con tres (3) meses de antelación a la referida fecha de vencimiento. En caso de terminación anticipada sin justa causa, el ARRENDATARIO deberá pagar al ARRENDADOR una indemnización equivalente al precio de tres (3) meses de arrendamiento.',
    required: true,
  },
  {
    id: 'clause-clausula-penal',
    title: 'CLÁUSULA DUODÉCIMA: Cláusula Penal (Art. 1592–1601, Código Civil)',
    content:
      'En caso de incumplimiento de cualquiera de las obligaciones contenidas en el presente contrato, la parte incumplida pagará a la parte cumplida, a título de cláusula penal, una suma equivalente a tres (3) meses del canon de arrendamiento vigente al momento del incumplimiento, conforme a los Artículos 1592 a 1601 del Código Civil colombiano. Esta cláusula penal se hará efectiva sin perjuicio del pago de los cánones adeudados, servicios públicos, cuotas de administración y demás obligaciones pendientes. PARÁGRAFO: La exigibilidad de la cláusula penal no podrá hacerse de forma directa por el ARRENDADOR, requiriendo en caso de controversia la intervención de la autoridad judicial competente.',
    required: true,
  },
  {
    id: 'clause-solidaridad',
    title: 'CLÁUSULA DECIMOTERCERA: Solidaridad (Art. 7, Ley 820/2003)',
    content:
      'De conformidad con el Artículo 7 de la Ley 820 de 2003, los derechos y obligaciones derivados del presente contrato son solidarios. En caso de pluralidad de arrendatarios, todos responderán solidariamente por las obligaciones aquí pactadas. El codeudor o fiador designado como garante se obliga solidariamente con el ARRENDATARIO al cumplimiento de todas las obligaciones pecuniarias derivadas del presente contrato.',
    required: true,
  },
  {
    id: 'clause-notificaciones',
    title: 'CLÁUSULA DECIMOCUARTA: Domicilio y Notificaciones (Art. 3h, Ley 820/2003)',
    content:
      'De conformidad con el Artículo 3 literal h) de la Ley 820 de 2003, las partes señalan como domicilio para todos los efectos judiciales y extrajudiciales derivados del presente contrato las direcciones físicas y electrónicas indicadas en el encabezado. Se considerarán validas las notificaciones enviadas por servicio postal autorizado, correo electrónico con confirmación de lectura, o cualquier medio que permita acreditar su recepción. Cualquier cambio de domicilio deberá notificarse por escrito a la otra parte dentro de los cinco (5) días hábiles siguientes.',
    required: true,
  },
  {
    id: 'clause-lavado-activos',
    title: 'CLÁUSULA DECIMOQUINTA: Declaración de Origen Lícito de Recursos',
    content:
      'Las partes declaran bajo la gravedad del juramento que los recursos utilizados para el pago del canon de arrendamiento y demás obligaciones derivadas del presente contrato provienen de actividades lícitas y que no se encuentran vinculados a ninguna actividad relacionada con el lavado de activos, financiación del terrorismo, o cualquier actividad ilícita. Las partes se obligan a suministrar la información y documentación que la otra parte o las autoridades competentes requieran para dar cumplimiento a las normas sobre prevención de lavado de activos y financiación del terrorismo.',
    required: true,
  },
  {
    id: 'clause-datos-personales',
    title: 'CLÁUSULA DECIMOSEXTA: Protección de Datos Personales (Ley 1581/2012)',
    content:
      'En cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 sobre protección de datos personales, las partes autorizan de manera previa, expresa e informada el tratamiento de sus datos personales para los fines estrictamente relacionados con la celebración y ejecución del presente contrato, incluyendo: verificación de identidad, evaluación de riesgo crediticio, gestión de cobro, y comunicaciones contractuales. Los titulares podrán ejercer sus derechos de conocer, actualizar, rectificar y suprimir sus datos, así como revocar la autorización, dirigiéndose al responsable del tratamiento conforme a la política de privacidad de la plataforma.',
    required: true,
  },
  {
    id: 'clause-ley',
    title: 'CLÁUSULA DECIMOSEPTIMA: Legislación Aplicable y Resolución de Conflictos',
    content:
      'El presente contrato se rige por la Ley 820 de 2003 sobre arrendamiento de vivienda urbana, la Ley 675 de 2001 sobre propiedad horizontal en lo pertinente, el Código Civil colombiano, y demás normas concordantes y complementarias. Para la resolución de cualquier controversia derivada del presente contrato, las partes acuerdan: a) En primera instancia, intentar resolver el conflicto de manera directa y amigable. b) En caso de no lograrse acuerdo, acudir a los mecanismos alternativos de solución de conflictos (conciliación ante centro de conciliación autorizado). c) En última instancia, someterse a la jurisdicción de los jueces civiles municipales del domicilio del inmueble arrendado.',
    required: true,
  },
  {
    id: 'clause-firmas-electronicas',
    title: 'CLÁUSULA DECIMOCTAVA: Validez de Firmas Electrónicas (Ley 527/1999)',
    content:
      'De conformidad con la Ley 527 de 1999 sobre mensajes de datos y comercio electrónico, el Decreto 2364 de 2012, y el Artículo 10 de la Ley 527 que reconoce la admisibilidad y fuerza probatoria de los mensajes de datos, las partes aceptan expresamente que las firmas electrónicas estampadas en el presente contrato tienen la misma validez jurídica y efectos legales que las firmas manuscritas. Las partes reconocen que el presente contrato no podrá ser privado de efectos jurídicos, validez o fuerza obligatoria por la sola razón de haberse celebrado por medios electrónicos.',
    required: true,
  },
];

const FURNISHED_CLAUSES: ContractClause[] = [
  {
    id: 'clause-inventario',
    title: 'CLÁUSULA ADICIONAL: Inventario de Bienes Muebles',
    content:
      'El inmueble se entrega amoblado con los bienes muebles, enseres, electrodomésticos y demás elementos detallados en el INVENTARIO ANEXO, el cual forma parte integral e inseparable del presente contrato. Dicho inventario deberá contener: a) Descripción detallada de cada bien. b) Estado de conservación al momento de la entrega. c) Valor estimado de reposición de cada bien. d) Registro fotografico. El inventario será firmado por ambas partes al momento de la entrega del inmueble y servirá como medio probatorio en caso de controversia sobre el estado de los bienes.',
    required: true,
  },
  {
    id: 'clause-daños-muebles',
    title: 'CLÁUSULA ADICIONAL: Responsabilidad por Bienes Muebles',
    content:
      'El ARRENDATARIO se obliga a conservar y cuidar los bienes muebles entregados con la diligencia de un buen padre de familia. Los daños, deterioros o pérdidas de bienes muebles que excedan el desgaste natural por uso legítimo y paso del tiempo serán de exclusiva responsabilidad del ARRENDATARIO, quien deberá asumir el costo de reparación o reposición a valor de mercado vigente. Al momento de la restitución del inmueble, se realizará un inventario de devolución comparativo con el inventario inicial para determinar las diferencias.',
    required: true,
  },
];

const SHARED_CLAUSES: ContractClause[] = [
  {
    id: 'clause-espacio-arrendado',
    title: 'CLÁUSULA ADICIONAL: Identificación del Espacio Arrendado (Art. 4c, Ley 820/2003)',
    content:
      'De conformidad con el Artículo 4 literal c) de la Ley 820 de 2003, el presente contrato corresponde a la modalidad de arrendamiento compartido. Se arrienda al ARRENDATARIO la parte del inmueble identificada como [habitación/espacio] con acceso a las siguientes áreas comunes compartidas: cocina, sala, baños, zona de lavado. El ARRENDATARIO comparte el uso de estas áreas con el ARRENDADOR y/u otros arrendatarios del inmueble.',
    required: true,
  },
  {
    id: 'clause-convivencia',
    title: 'CLÁUSULA ADICIONAL: Normas de Convivencia (Art. 13, Ley 820/2003)',
    content:
      'De conformidad con el Artículo 13 de la Ley 820 de 2003, el ARRENDATARIO se obliga a cumplir las normas de mantenimiento, conservación, uso y orden interno del inmueble, así como las disposiciones del Código de Policía. Las normas de convivencia incluyen: a) Horarios de silencio (10:00 PM a 7:00 AM). b) Limpieza y orden de áreas comunes después de su uso. c) Respeto a la privacidad y pertenencias de los demás ocupantes. d) Prohibición de ingreso de personas no autorizadas a pernoctar sin consentimiento del ARRENDADOR. El incumplimiento reiterado de estas normas constituirá causal de terminación del contrato.',
    required: true,
  },
  {
    id: 'clause-servicios-incluidos',
    title: 'CLÁUSULA ADICIONAL: Servicios Incluidos y Límite de Cobro (Art. 4c, Ley 820/2003)',
    content:
      'El canon de arrendamiento incluye los siguientes servicios básicos: agua, energía eléctrica, gas natural e internet. El valor de estos servicios adicionales no podrá exceder el cincuenta por ciento (50%) del precio del arrendamiento del espacio arrendado, conforme a lo establecido para la modalidad de arrendamiento compartido. Cualquier consumo excesivo o extraordinario imputable exclusivamente al ARRENDATARIO será facturado de manera proporcional y debidamente soportado.',
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
    name: 'Contrato Básico',
    description:
      'Arriendo estándar sin muebles. Ideal para inquilinos que tienen sus propios muebles y buscan un espacio vacío para personalizar.',
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
      'Arriendo de habitación con áreas comunes compartidas. Incluye normas de convivencia y servicios básicos.',
    clauses: [...COMMON_CLAUSES, ...SHARED_CLAUSES],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getTemplateById(templateId: string | undefined): ContractTemplate | undefined {
  if (!templateId) return undefined;
  return CONTRACT_TEMPLATES.find((t) => t.id === templateId);
}

export function getTemplateByType(type: ContractType): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.type === type);
}
