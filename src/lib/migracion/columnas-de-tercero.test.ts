/**
 * columnas-de-tercero.test.ts — el mapeo del Excel ajeno.
 *
 * Lo que se prueba acá no es «¿mapea?», es **a qué mapea cuando dos columnas
 * se parecen**. Ese es el error caro: el importador de contratos ya guardó
 * «Celular arrendatario» como teléfono del propietario, con confianza alta y
 * sin decir por qué. Un mapeo equivocado no falla — guarda el dato en el campo
 * de al lado, y se descubre el día del pago.
 *
 * La plantilla de los casos es una copia recortada de
 * `back-erp/src/inmobiliaria/migracion-terceros/plantillas-terceros.ts`: si se
 * importara del back no habría repo compartido, y si se importara del servicio
 * el test compararía el mapeo contra sí mismo.
 */

import { describe, it, expect } from 'vitest';

import {
  normalizarEncabezado,
  mapearColumnas,
  remapear,
  obligatoriasSinMapear,
  columnasNoSoportadas,
  armarFila,
  nombreDeLoteSugerido,
} from './columnas-de-tercero';
import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service';

/** Recorte fiel de `PLANTILLAS_DE_TERCEROS.PROPIETARIO`. */
const PLANTILLA_PROPIETARIO: ColumnaDePlantilla[] = [
  {
    campo: 'tipoDocumento',
    titulo: 'Tipo de documento',
    obligatoria: true,
    ejemplo: 'CC',
    opciones: ['CC', 'CE', 'NIT', 'PASAPORTE'],
    alias: ['tipo doc', 'tipo de identificacion', 'tipo id', 'clase documento'],
  },
  {
    campo: 'documento',
    titulo: 'Número de documento',
    obligatoria: true,
    ejemplo: '1020304050',
    alias: [
      'documento', 'cedula', 'cc', 'nit', 'identificacion', 'nro documento',
      'numero documento', 'numero de documento', 'no documento', 'no de documento',
      'numero de identificacion', 'documento de identidad',
    ],
  },
  {
    campo: 'nombre',
    titulo: 'Nombre completo',
    obligatoria: true,
    ejemplo: 'Jorge Restrepo Vélez',
    alias: [
      'nombre', 'nombres', 'nombre completo', 'razon social', 'nombre y apellidos',
      'propietario', 'inquilino', 'arrendatario',
    ],
  },
  {
    campo: 'correo',
    titulo: 'Correo',
    obligatoria: false,
    ejemplo: 'jorge@correo.co',
    alias: ['correo', 'email', 'e mail', 'correo electronico'],
  },
  {
    campo: 'telefono',
    titulo: 'Teléfono',
    obligatoria: false,
    ejemplo: '3105551234',
    alias: ['telefono', 'celular', 'movil', 'contacto', 'tel'],
  },
  {
    campo: 'banco',
    titulo: 'Banco',
    obligatoria: true,
    ejemplo: 'BANCOLOMBIA',
    opciones: ['BANCOLOMBIA', 'DAVIVIENDA'],
    alias: ['banco', 'entidad bancaria', 'entidad'],
  },
  {
    campo: 'tipoCuenta',
    titulo: 'Tipo de cuenta',
    obligatoria: true,
    ejemplo: 'AHORROS',
    opciones: ['AHORROS', 'CORRIENTE'],
    alias: ['tipo cuenta', 'tipo de cuenta bancaria', 'clase de cuenta'],
  },
  {
    campo: 'numeroCuenta',
    titulo: 'Número de cuenta',
    obligatoria: true,
    ejemplo: '12345678901',
    alias: [
      'numero cuenta', 'numero de cuenta', 'nro cuenta', 'no cuenta',
      'no de cuenta', 'cuenta', 'cuenta bancaria',
    ],
  },
  {
    campo: 'titularCuenta',
    titulo: 'Titular de la cuenta',
    obligatoria: false,
    ejemplo: 'Jorge Restrepo Vélez',
    alias: ['titular', 'titular cuenta', 'a nombre de'],
  },
  {
    campo: 'notas',
    titulo: 'Notas',
    obligatoria: false,
    ejemplo: 'Prefiere WhatsApp',
    alias: ['notas', 'observaciones', 'comentarios'],
  },
];

/** Devuelve el campo al que quedó mapeada una columna. */
function campoDe(mapeo: ReturnType<typeof mapearColumnas>, columna: string): string | null {
  return mapeo.find((m) => m.columna === columna)?.campo ?? null;
}

// ── normalizarEncabezado ─────────────────────────────────────────────────────

describe('normalizarEncabezado', () => {
  it('coincide con la regla del back, caso por caso', () => {
    /*
     * 🔴 Es una copia de `normalizarEncabezado()` en `plantillas-terceros.ts`.
     * Si las dos se separan, el front mapea una columna que el back no
     * reconocería (o al revés) y nadie se entera hasta que falta un dato.
     * Estos pares salen de los alias reales del back («No. Cuenta» → «no
     * cuenta» es el que motivó los alias `no cuenta` / `no de cuenta`).
     */
    expect(normalizarEncabezado('Nro. Documento')).toBe('nro documento');
    expect(normalizarEncabezado('No. Cuenta')).toBe('no cuenta');
    expect(normalizarEncabezado('  TELÉFONO  ')).toBe('telefono');
    expect(normalizarEncabezado('Razón Social')).toBe('razon social');
    expect(normalizarEncabezado('C.C.')).toBe('c c');
    expect(normalizarEncabezado('Correo electrónico')).toBe('correo electronico');
    expect(normalizarEncabezado('')).toBe('');
  });

  it('la eñe sobrevive como letra, no como espacio', () => {
    // `ñ` es `n` + combining tilde tras NFD. Si el rango de combinantes fuera
    // mal, «Año» quedaría en «a o» y ningún alias con eñe volvería a empatar —
    // la clase de bug que ya costó caro en el catálogo de cobranza.
    expect(normalizarEncabezado('Año de ingreso')).toBe('ano de ingreso');
  });
});

// ── mapearColumnas ───────────────────────────────────────────────────────────

describe('mapearColumnas — pasada exacta', () => {
  it('empata por título, por campo y por alias', () => {
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, [
      'Nombre completo',   // título
      'numeroCuenta',      // nombre del campo
      'Cédula',            // alias
    ]);

    expect(campoDe(mapeo, 'Nombre completo')).toBe('nombre');
    expect(campoDe(mapeo, 'numeroCuenta')).toBe('numeroCuenta');
    expect(campoDe(mapeo, 'Cédula')).toBe('documento');
    expect(mapeo.every((m) => m.exacto)).toBe(true);
  });

  it('distingue «Tipo de documento» de «Número de documento»', () => {
    // Los dos contienen «documento». La pasada exacta los separa sin dudar; si
    // alguna vez se resolviera sólo por contención, el tipo y el número
    // caerían en el mismo campo y el otro quedaría vacío.
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, [
      'Tipo de documento',
      'Número de documento',
    ]);
    expect(campoDe(mapeo, 'Tipo de documento')).toBe('tipoDocumento');
    expect(campoDe(mapeo, 'Número de documento')).toBe('documento');
  });
});

describe('mapearColumnas — pasada por contención', () => {
  it('reconoce el encabezado que un archivo real trae de verdad', () => {
    // Nadie exporta «Nombre completo». Exportan esto.
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, [
      'NOMBRE DEL PROPIETARIO',
      'CELULAR DE CONTACTO',
      'BANCO DONDE CONSIGNAR',
    ]);

    expect(campoDe(mapeo, 'NOMBRE DEL PROPIETARIO')).toBe('nombre');
    expect(campoDe(mapeo, 'CELULAR DE CONTACTO')).toBe('telefono');
    expect(campoDe(mapeo, 'BANCO DONDE CONSIGNAR')).toBe('banco');
    // Marcadas como inexactas: la pantalla dice «se parece a», no «coincide».
    expect(mapeo.every((m) => m.exacto)).toBe(false);
  });

  it('gana el alias más largo: «Titular de la cuenta» no es el número', () => {
    /*
     * 🔴 El caso que motiva la regla. «Titular de la cuenta» contiene
     * `titular` (7) y `cuenta` (6). Sin «gana el más largo» el resultado
     * depende del orden de la plantilla — y `numeroCuenta` va antes que
     * `titularCuenta`. El titular terminaría guardado como número de cuenta,
     * y la dispersión giraría a una cuenta llamada «Jorge Restrepo».
     */
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, ['Titular de la cuenta bancaria']);
    expect(campoDe(mapeo, 'Titular de la cuenta bancaria')).toBe('titularCuenta');
  });

  it('un alias de menos de 4 letras no se busca adentro de otra palabra', () => {
    // `cc`, `nit` y `tel` viven dentro de palabras que no significan nada
    // parecido. `Dirección` contiene «cc»; sin el piso de largo quedaría
    // mapeada al documento.
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, ['Dirección de correspondencia']);
    // Empata `correo`… no: «correspondencia» no contiene «correo». Queda sin
    // mapear, que es el resultado honesto — esta plantilla recortada no tiene
    // columna de dirección.
    expect(campoDe(mapeo, 'Dirección de correspondencia')).toBeNull();
  });

  it('un campo se llena UNA vez: la segunda columna parecida queda libre', () => {
    // Si el archivo trae dos teléfonos, el segundo no pisa al primero en
    // silencio: queda sin mapear y la persona decide.
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, [
      'Teléfono',
      'Teléfono alterno',
    ]);
    expect(campoDe(mapeo, 'Teléfono')).toBe('telefono');
    expect(campoDe(mapeo, 'Teléfono alterno')).toBeNull();
  });

  it('una columna sin nombre no se mapea a nada', () => {
    // `sheet_to_json` genera `__EMPTY` y columnas en blanco. Normalizadas
    // quedan vacías, y una cadena vacía está contenida en TODO.
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, ['', '   ']);
    expect(mapeo.map((m) => m.campo)).toEqual([null, null]);
  });
});

// ── remapear ─────────────────────────────────────────────────────────────────

describe('remapear', () => {
  it('el campo se lo lleva la columna nueva y la vieja lo pierde', () => {
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, ['Cédula', 'Documento del dueño']);
    expect(campoDe(mapeo, 'Cédula')).toBe('documento');

    const corregido = remapear(mapeo, 'Documento del dueño', 'documento');

    // Dos columnas al mismo campo pisarían el dato en silencio.
    expect(campoDe(corregido, 'Documento del dueño')).toBe('documento');
    expect(campoDe(corregido, 'Cédula')).toBeNull();
    expect(corregido.find((m) => m.columna === 'Documento del dueño')?.isManual).toBe(true);
  });

  it('«Ignorar» deja la columna sin campo sin tocar a las otras', () => {
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, ['Cédula', 'Correo']);
    const corregido = remapear(mapeo, 'Cédula', null);
    expect(campoDe(corregido, 'Cédula')).toBeNull();
    expect(campoDe(corregido, 'Correo')).toBe('correo');
  });
});

// ── obligatoriasSinMapear / columnasNoSoportadas ─────────────────────────────

describe('obligatoriasSinMapear', () => {
  it('lista lo que falta sin bloquear nada', () => {
    // Informativo a propósito: cualquier archivo tiene que poder llegar a la
    // lista de trabajo. Lo que falte se completa fila por fila.
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, ['Nombre completo', 'Cédula']);
    const faltan = obligatoriasSinMapear(PLANTILLA_PROPIETARIO, mapeo).map((c) => c.campo);
    expect(faltan.sort()).toEqual(['banco', 'numeroCuenta', 'tipoCuenta', 'tipoDocumento']);
  });
});

describe('columnasNoSoportadas', () => {
  it('está vacío contra la plantilla real', () => {
    expect(columnasNoSoportadas(PLANTILLA_PROPIETARIO)).toEqual([]);
  });

  it('delata una columna que el back agregó y este front no sabe mandar', () => {
    /*
     * Mandarla igual sería un 400 con el archivo entero adentro; filtrarla en
     * silencio sería perder el dato. La tercera salida —decirlo— necesita que
     * alguien la detecte, y ese alguien es esto.
     */
    const conNovedad: ColumnaDePlantilla[] = [
      ...PLANTILLA_PROPIETARIO,
      { campo: 'codigoCiiu', titulo: 'Código CIIU', obligatoria: false, ejemplo: '6810', alias: [] },
    ];
    expect(columnasNoSoportadas(conNovedad).map((c) => c.campo)).toEqual(['codigoCiiu']);
  });
});

// ── armarFila ────────────────────────────────────────────────────────────────

describe('armarFila', () => {
  it('lleva sólo lo mapeado, con la llave del back', () => {
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, [
      'NOMBRE DEL PROPIETARIO',
      'Cédula',
      'Consecutivo',
    ]);

    const fila = armarFila(
      { 'NOMBRE DEL PROPIETARIO': 'Jorge Restrepo', 'Cédula': 1020304050, Consecutivo: 77 },
      mapeo,
    );

    expect(fila).toEqual({ nombre: 'Jorge Restrepo', documento: '1020304050' });
    // `Consecutivo` no se mapeó: no puede colarse. Una clave que el DTO no
    // declara es un 400 con las 1.200 filas adentro.
    expect(fila).not.toHaveProperty('Consecutivo');
  });

  it('una celda vacía viaja ausente, no como un default inventado', () => {
    /*
     * Un tipo de documento vacío NO se cae a CC. El tipo de persona sale del
     * documento (NIT ⇒ jurídica) y de ahí sale el perfil tributario: dar CC
     * por sentado convierte a una inmobiliaria en persona natural y le deja de
     * retener lo que había que retenerle. Ausente es lo que deja al back
     * marcar `FALTA_TIPO_DOCUMENTO`.
     */
    const mapeo = mapearColumnas(PLANTILLA_PROPIETARIO, ['Tipo de documento', 'Nombre completo']);
    const fila = armarFila({ 'Tipo de documento': '', 'Nombre completo': 'Jorge' }, mapeo);

    expect(fila).toEqual({ nombre: 'Jorge' });
    expect('tipoDocumento' in fila).toBe(false);
  });
});

// ── nombreDeLoteSugerido ─────────────────────────────────────────────────────

describe('nombreDeLoteSugerido', () => {
  it('cabe en los 60 caracteres del DTO y dice de qué es', () => {
    const nombre = nombreDeLoteSugerido('PROPIETARIO', new Date('2026-08-31T14:05:00.000Z'));
    expect(nombre.length).toBeLessThanOrEqual(60);
    expect(nombre.startsWith('propietarios-')).toBe(true);
  });

  it('dos cargas del mismo día se distinguen', () => {
    // El back devuelve 409 `LOTE_YA_EXISTE` si se repite el nombre: sin la
    // hora, la segunda carga del día choca y parece un error del sistema.
    const a = nombreDeLoteSugerido('INQUILINO', new Date('2026-08-31T09:00:00.000Z'));
    const b = nombreDeLoteSugerido('INQUILINO', new Date('2026-08-31T16:30:00.000Z'));
    expect(a).not.toBe(b);
  });
});
