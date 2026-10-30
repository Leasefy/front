import type { NombreIlustracion } from '@leasefy/cadence';
import type { ClaveDelPaso } from '@/lib/api/habilitacion-de-facturacion.service';

/**
 * Lo que dice cada paso de «Activa tu facturación electrónica» (Nico, 28-10-2026). Los nombres de los botones van TAL
 * COMO salen en la DIAN (instructivo de registro y habilitación y autorización de numeración; guías de Alegra y The
 * Factory). Fuentes en `memory/archivos/dian-habilitacion/investigacion.md`.
 */
export interface TextoDelPaso {
  titulo: string;
  /** Una línea: por qué. */
  porque: string;
  /** Cuánto toma (aprox.). */
  tiempo: string;
  ilustracion: NombreIlustracion;
  /** Las instrucciones, en orden. `**…**` = el botón o menú exacto de la DIAN. */
  instrucciones: string[];
  /** Lo que conviene saber antes de hacerlo. */
  ojo?: string[];
  /** Qué se espera después y de quién. */
  espera?: string;
  /** El enlace que abre (llave de `enlaces` de la vista). */
  abre?: 'habilitacion' | 'facturando' | 'muisca';
  textoDelEnlace?: string;
}

export const PASOS_DE_LA_GUIA: Record<ClaveDelPaso, TextoDelPaso> = {
  antes: {
    titulo: 'Ten esto a la mano',
    porque: 'La DIAN te manda un código al correo del RUT y te pide firmar con tu firma electrónica. Sin esto te quedas a mitad.',
    tiempo: '2 min',
    ilustracion: 'portapapeles',
    instrucciones: [
      'Tu **RUT** actualizado, con el **correo** de la empresa y el del **representante legal** al día.',
      'Acceso a ese correo **ahora mismo**: el código de la DIAN dura unos 60 minutos.',
      'El **usuario de la DIAN (MUISCA)** del representante legal y su **firma electrónica** (contraseña de firma). Si no la tiene: en MUISCA, **Emitir Firma Electrónica** → acepta el acuerdo → código al correo → preguntas de seguridad → crea la contraseña.',
    ],
    ojo: ['Si tu RUT tiene un correo viejo, actualízalo primero en la DIAN: es a ese correo que llega todo.'],
  },
  rut: {
    titulo: 'Sube tu RUT',
    porque: 'Con él, Feel te da de alta como facturador. Leasefy se lo manda solo: tú no le escribes a nadie.',
    tiempo: '1 min',
    ilustracion: 'cedula',
    instrucciones: [
      'Descarga tu RUT en PDF de la DIAN (o usa el que ya tienes, si está al día).',
      'Súbelo aquí. Leasefy se lo envía a Feel con tus datos y los prefijos que vas a pedir.',
    ],
  },
  alta: {
    titulo: 'Feel te da de alta',
    porque: 'Feel crea tu facturador en su sistema. Toma unos minutos de su lado.',
    tiempo: 'Lo hace Feel',
    ilustracion: 'correo_enviado',
    instrucciones: [
      'No tienes que hacer nada. Apenas Feel termine, este paso se marca solo.',
      'Mientras tanto, sigue con el registro en la DIAN (paso 4): no depende de esto.',
    ],
    espera: 'Feel está creando tu facturador. Te avisamos por correo apenas esté.',
  },
  registro: {
    titulo: 'Regístrate como facturador en la DIAN',
    porque: 'Le dices a la DIAN que vas a facturar electrónicamente y a qué correo te llegan las facturas.',
    tiempo: '10 min',
    ilustracion: 'sello',
    abre: 'habilitacion',
    textoDelEnlace: 'Abrir la DIAN · Habilitación',
    instrucciones: [
      'Entra a **Habilitación** de la DIAN y elige **Empresa** (cédula del representante legal y NIT) o **Persona**.',
      'Toca **Entrar**: te llega un **token** al correo del RUT (en empresas, al del representante legal). Ábrelo y toca **Ingrese aquí**.',
      'Ve a **Registro y habilitación** → **Documentos electrónicos**.',
      'Escribe el **correo de recepción** de facturas electrónicas, toca **Registrar** y luego **Aceptar**.',
      'Sal y vuelve a entrar con un **token nuevo**: la DIAN lo pide para que se actualice.',
    ],
    ojo: ['El token vence en unos 60 minutos: si se venció, pide otro con **Entrar**.'],
  },
  proveedor: {
    titulo: 'Conecta con el proveedor y copia el código del set de pruebas',
    porque: 'Le dices a la DIAN que tu proveedor tecnológico es BPM Consulting, con su software Feel. La DIAN te da un código para las pruebas.',
    tiempo: '5 min',
    ilustracion: 'llaves',
    abre: 'habilitacion',
    textoDelEnlace: 'Abrir la DIAN · Habilitación',
    instrucciones: [
      'En **Registro y habilitación** → **Documentos electrónicos** → **Factura electrónica**, toca **Configurar modos de operación**.',
      'En el modo de operación elige **Software de un proveedor tecnológico**.',
      'En la empresa proveedora elige **BPM CONSULTING S.A.S.** (NIT 900011395) y el software **FEEL**. Toca **Asociar**.',
      'En la tabla, toca el **ojito** de **Detalles del set de pruebas** y copia el **TestSetId**.',
      'Pégalo aquí abajo. Leasefy se lo manda a Feel para que corra las pruebas.',
    ],
    ojo: ['Copia y pega: un espacio de más o una letra cambiada y la DIAN no lo reconoce.'],
  },
  pruebas: {
    titulo: 'Feel corre las pruebas y quedas «Habilitado»',
    porque: 'Feel manda a la DIAN 8 facturas, 1 nota débito y 1 nota crédito de prueba. Si pasan, quedas habilitado.',
    tiempo: 'Lo hace Feel',
    ilustracion: 'lupa_estudio',
    abre: 'habilitacion',
    textoDelEnlace: 'Abrir la DIAN · Habilitación',
    instrucciones: [
      'Cuando Feel termine, entra otra vez a **Habilitación** de la DIAN.',
      'Tu estado debe pasar de **Registrado** a **Habilitado**.',
      'Te sale una ventana para la **fecha de inicio** de facturación: escoge hoy (o cuando vayas a empezar) y toca **Aceptar**. Ese día la DIAN te pone la responsabilidad **52 — Facturador electrónico** en el RUT.',
      'Vuelve aquí y toca **Ya me aparece «Habilitado»**.',
    ],
    ojo: ['Si cerraste la ventana de la fecha, sal y vuelve a entrar a Habilitación: aparece otra vez.'],
    espera: 'Feel está corriendo tus pruebas con la DIAN. Cuando termine, confirma tu estado en la DIAN.',
  },
  numeracion: {
    titulo: 'Pide tus numeraciones en la DIAN',
    porque: 'La DIAN autoriza un prefijo y un rango por cada tipo de factura. Leasefy factura canon, comisión y otros por separado.',
    tiempo: '15 min',
    ilustracion: 'calculadora',
    abre: 'muisca',
    textoDelEnlace: 'Abrir la DIAN · MUISCA',
    instrucciones: [
      'Entra a **MUISCA** como **Usuario registrado** (a nombre de la empresa).',
      'Ve a **Numeración de facturación** → **Solicitar numeración de facturación**. Revisa que tu RUT esté al día y toca **Ingresar**.',
      'Toca **Autorizar rangos** y llena: el **prefijo**, tipo **Factura electrónica de venta**, **rango desde** y **rango hasta** (abajo te decimos cuáles). Toca **Agregar**. Repite por cada prefijo.',
      'Toca **Borrador** → **Aceptar** → **Definitivo**.',
      'Firma: toca **Solicítela aquí**, copia la **clave dinámica** que te llega al correo y escribe tu **contraseña de firma electrónica**. Toca **Firmar**.',
      'En **Formalice la solicitud de numeración de facturación** toca **Firmar** otra vez (con otra clave dinámica).',
      'Descarga el PDF de la resolución: empieza por **1876**.',
    ],
    ojo: ['Pide de sobra: la numeración electrónica no cuesta y quedarte corto te obliga a pedir otra.'],
  },
  resolucion: {
    titulo: 'Carga tus resoluciones en Leasefy',
    porque: 'Con ellas Leasefy numera cada factura con el prefijo y el rango que te autorizó la DIAN.',
    tiempo: '3 min',
    ilustracion: 'carpeta',
    instrucciones: [
      'Abre **Cargar la resolución** y llena número, fecha, prefijo, rango y vigencia de cada una (vienen en el PDF 1876).',
      'Escoge a qué tipo corresponde cada prefijo (canon, comisión u otros).',
    ],
  },
  asociar: {
    titulo: 'Asocia tus prefijos al proveedor en la DIAN',
    porque: 'El último paso: la DIAN tiene que saber que cada prefijo lo transmite tu proveedor, BPM Consulting (Feel).',
    tiempo: '5 min',
    ilustracion: 'factura',
    abre: 'facturando',
    textoDelEnlace: 'Abrir la DIAN · Facturando electrónicamente',
    instrucciones: [
      'Espera 1 o 2 horas después de pedir la numeración: es lo que tarda en aparecer.',
      'Entra a **Facturando electrónicamente** de la DIAN (con token, como antes).',
      'Ve a **Configuración** → **Rangos de numeración**.',
      'En **Proveedor – Software** elige **BPM CONSULTING S.A.S. – FEEL**, escoge el **prefijo** y toca **Agregar** → **Aceptar**. Repite con cada prefijo.',
      'Vuelve aquí y toca **Ya los asocié**. Leasefy confirma con Feel que ve tu numeración.',
    ],
    ojo: [
      'Si no te aparece la numeración o el proveedor, en **Habilitación** toca **Sincronizar contribuyente** y vuelve a intentar.',
      'Si facturabas con otro proveedor, quita la asociación vieja y asocia el prefijo a FEEL.',
    ],
  },
};

/** El texto del botón «Ya lo hice» de cada paso que se marca. */
export const BOTON_DE_HECHO: Partial<Record<ClaveDelPaso, string>> = {
  antes: 'Lo tengo',
  registro: 'Ya me registré',
  pruebas: 'Ya me aparece «Habilitado»',
  numeracion: 'Ya las pedí',
  asociar: 'Ya los asocié',
};
