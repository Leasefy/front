#!/usr/bin/env node
/**
 * Genera un caso real de migración para probar el muro de punta a punta:
 * cinco archivos CSV consistentes entre sí, en el orden de los pasos.
 *
 *   01-propietarios.csv        paso 1 — terceros (propietarios)
 *   02-inquilinos.csv          paso 1 — terceros (inquilinos)
 *   03-inmuebles.csv           paso 2 — propiedades
 *   04-contratos.csv           paso 3 — contratos
 *   05-asientos-historicos.csv paso 5 — registros contables (histórico)
 *
 * (El paso 4, el PUC, no se carga por archivo: se siembra con el botón
 * «Cargar el plan de cuentas base». Los asientos de acá usan SÓLO códigos de
 * esa semilla.)
 *
 * ── Consistencia, que es lo que hace «real» al caso ────────────────────────
 *
 *   inmueble.Propietario  == propietario.«Nombre completo»  (y el teléfono)
 *   contrato.Dirección    == inmueble.Dirección              (exacta)
 *   contrato.arrendatario == inquilino (documento, correo, nombre, teléfono)
 *   asiento.Descripción   menciona la dirección del contrato que cobra
 *   asiento.Código        ∈ cuentas de movimiento del PUC semilla (55)
 *   cada comprobante      débitos == créditos
 *
 * Los encabezados son los TÍTULOS que cada importador publica, así que el
 * auto-mapeo los reconoce sin remapear nada a mano.
 *
 * Determinístico: misma semilla → mismos archivos. `--semilla=N` para otro
 * caso; `--propietarios=… --inquilinos=… --inmuebles=… --contratos=…` para
 * otros tamaños.
 *
 * Los correos son `@example.com` a propósito (RFC 2606): el correo del
 * inquilino es la llave de su cuenta del portal y NO queremos invitar a
 * nadie real por accidente.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ══════════════════════════════════════════════════════════════════════════
// Parámetros
// ══════════════════════════════════════════════════════════════════════════

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const SEMILLA = Number(args.semilla ?? 20260901);
const N = {
  propietarios: Number(args.propietarios ?? 60),
  inquilinos: Number(args.inquilinos ?? 110),
  inmuebles: Number(args.inmuebles ?? 120),
  contratos: Number(args.contratos ?? 90),
};
/** Los meses del histórico contable. Hoy es 2026-09-01. */
const MESES = ['2026-06', '2026-07', '2026-08'];
const HOY = new Date('2026-09-01T00:00:00Z');

const aqui = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(aqui, '..', 'claudedocs', 'erp-financiero', 'muestras');

// ══════════════════════════════════════════════════════════════════════════
// Azar con semilla
// ══════════════════════════════════════════════════════════════════════════

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEMILLA);
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const uno = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
/** Elige con pesos: [[valor, peso], …]. */
function pesado(pares) {
  const total = pares.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of pares) {
    r -= w;
    if (r <= 0) return v;
  }
  return pares[pares.length - 1][0];
}
const redondearA = (n, paso) => Math.round(n / paso) * paso;
const digitos = (n) => Array.from({ length: n }, () => entre(0, 9)).join('');

// ══════════════════════════════════════════════════════════════════════════
// Catálogos colombianos
// ══════════════════════════════════════════════════════════════════════════

const NOMBRES_M = ['Juan Camilo', 'Luis Alberto', 'Andrés Felipe', 'Jorge Iván', 'Carlos Andrés', 'Óscar Darío', 'Héctor Fabio', 'Julián David', 'Fabián', 'Wilmer', 'Santiago', 'Mateo', 'Sebastián', 'Daniel', 'Alejandro', 'Diego Fernando', 'Mauricio', 'Jaime', 'Álvaro', 'Gustavo Adolfo', 'Rodrigo', 'Nicolás', 'Esteban', 'Camilo', 'Felipe', 'Hernán', 'Iván Darío', 'Ricardo', 'Leonardo', 'Édgar'];
const NOMBRES_F = ['María Fernanda', 'Sandra Milena', 'Diana Carolina', 'Claudia Patricia', 'Luz Marina', 'Paula Andrea', 'Gloria Inés', 'Mónica Liliana', 'Nataly', 'Yesica', 'Valentina', 'Isabella', 'Camila', 'Laura', 'Juliana', 'Daniela', 'Catalina', 'Manuela', 'Mariana', 'Ana María', 'Luisa Fernanda', 'Angélica', 'Carolina', 'Adriana', 'Beatriz Elena', 'Marcela', 'Lina María', 'Yolanda', 'Marta Cecilia', 'Rosa Elvira'];
const APELLIDOS = ['Restrepo', 'Vélez', 'Ospina', 'Gómez', 'Rodríguez', 'Martínez', 'García', 'López', 'Hernández', 'Ramírez', 'Torres', 'Muñoz', 'Castaño', 'Cardona', 'Zapata', 'Arango', 'Mejía', 'Botero', 'Uribe', 'Echeverri', 'Jaramillo', 'Montoya', 'Giraldo', 'Valencia', 'Rojas', 'Moreno', 'Sánchez', 'Díaz', 'Pérez', 'Quintero', 'Salazar', 'Herrera', 'Osorio', 'Vargas', 'Castro', 'Bedoya', 'Londoño', 'Duque', 'Henao', 'Marín', 'Agudelo', 'Betancur', 'Correa', 'Escobar', 'Franco', 'Gallego', 'Hoyos', 'Ochoa', 'Palacio', 'Toro'];
const EMPRESAS = ['Inversiones Los Cerezos S.A.S.', 'Constructora Altavista S.A.', 'Fiduciaria del Valle S.A.', 'Inmobiliaria Santa Ana Ltda.', 'Rentas Urbanas del Norte S.A.S.', 'Patrimonio Familiar Restrepo & Cía. S. en C.', 'Promotora Guayacanes S.A.S.', 'Arrendamientos La Cabaña S.A.S.', 'Grupo Empresarial Sotomayor S.A.', 'Bienes Raíces El Tesoro S.A.S.'];

const CIUDADES = [
  { ciudad: 'Bogotá', depto: 'Cundinamarca', peso: 40, barrios: ['Chapinero Alto', 'Usaquén', 'Cedritos', 'Chicó Norte', 'Ciudad Salitre', 'Teusaquillo', 'Santa Bárbara', 'La Soledad', 'Modelia', 'Rosales', 'Nicolás de Federmán', 'Colina Campestre'], factor: 1.15 },
  { ciudad: 'Medellín', depto: 'Antioquia', peso: 25, barrios: ['El Poblado', 'Laureles', 'Belén', 'La América', 'Estadio', 'Conquistadores', 'Loma de los Bernal', 'Provenza'], factor: 1.0 },
  { ciudad: 'Envigado', depto: 'Antioquia', peso: 6, barrios: ['Zúñiga', 'Loma del Escobero', 'El Dorado', 'Jardines'], factor: 1.0 },
  { ciudad: 'Sabaneta', depto: 'Antioquia', peso: 4, barrios: ['Aves María', 'Calle Larga', 'Las Lomitas'], factor: 0.85 },
  { ciudad: 'Cali', depto: 'Valle del Cauca', peso: 10, barrios: ['Granada', 'San Fernando', 'Ciudad Jardín', 'El Peñón', 'Pance', 'Santa Mónica'], factor: 0.8 },
  { ciudad: 'Barranquilla', depto: 'Atlántico', peso: 6, barrios: ['Alto Prado', 'Villa Country', 'Riomar', 'El Golf'], factor: 0.85 },
  { ciudad: 'Bucaramanga', depto: 'Santander', peso: 5, barrios: ['Cabecera del Llano', 'Sotomayor', 'La Floresta'], factor: 0.75 },
  { ciudad: 'Pereira', depto: 'Risaralda', peso: 4, barrios: ['Pinares de San Martín', 'Álamos', 'Circunvalar'], factor: 0.7 },
];

const BANCOS = [['BANCOLOMBIA', 40], ['DAVIVIENDA', 15], ['BANCO_BOGOTA', 10], ['BBVA', 8], ['NEQUI', 8], ['BANCO_OCCIDENTE', 4], ['BANCO_AV_VILLAS', 3], ['BANCO_CAJA_SOCIAL', 3], ['SCOTIABANK', 3], ['ITAU', 2], ['DAVIPLATA', 2], ['BANCOOMEVA', 1], ['BANCO_POPULAR', 1]];
const PREFIJOS_CEL = ['300', '301', '302', '304', '305', '310', '311', '312', '313', '314', '315', '316', '317', '318', '320', '321', '322', '323', '350'];

const TIPOS = [
  { tipo: 'Apartamento', peso: 58, uso: 'VIVIENDA', canon: [1_300_000, 4_600_000], area: [48, 140], hab: [1, 4], banos: [1, 3], admin: [180_000, 650_000], complemento: (r) => `Apto ${entre(1, 18)}0${entre(1, 4)}` },
  { tipo: 'Casa', peso: 14, uso: 'VIVIENDA', canon: [2_000_000, 6_500_000], area: [95, 280], hab: [3, 5], banos: [2, 4], admin: [0, 0], complemento: () => (chance(0.4) ? `Casa ${entre(1, 40)}` : '') },
  { tipo: 'Estudio', peso: 4, uso: 'VIVIENDA', canon: [900_000, 1_700_000], area: [28, 45], hab: [1, 1], banos: [1, 1], admin: [120_000, 260_000], complemento: () => `Apto ${entre(1, 12)}0${entre(1, 6)}` },
  { tipo: 'Local comercial', peso: 11, uso: 'COMERCIAL', canon: [2_200_000, 9_500_000], area: [30, 220], hab: [0, 0], banos: [1, 2], admin: [0, 480_000], complemento: () => `Local ${entre(1, 24)}` },
  { tipo: 'Oficina', peso: 9, uso: 'COMERCIAL', canon: [1_800_000, 7_000_000], area: [26, 130], hab: [0, 0], banos: [1, 2], admin: [150_000, 700_000], complemento: () => `Of. ${entre(2, 15)}0${entre(1, 8)}` },
  { tipo: 'Bodega', peso: 4, uso: 'COMERCIAL', canon: [4_000_000, 14_000_000], area: [220, 950], hab: [0, 0], banos: [1, 2], admin: [0, 350_000], complemento: () => `Bodega ${entre(1, 30)}` },
];
const VIAS = [['Calle', 34], ['Carrera', 34], ['Transversal', 8], ['Diagonal', 8], ['Avenida', 6], ['Circular', 3], ['Calle', 7]];

// ══════════════════════════════════════════════════════════════════════════
// Personas y documentos únicos
// ══════════════════════════════════════════════════════════════════════════

const usados = { documento: new Set(), correo: new Set(), telefono: new Set(), nombre: new Set(), direccion: new Set(), numeros: new Set() };
function unico(conjunto, fabricar) {
  for (let i = 0; i < 500; i++) {
    const v = fabricar();
    if (!usados[conjunto].has(v)) {
      usados[conjunto].add(v);
      return v;
    }
  }
  throw new Error(`No pude generar un valor único para ${conjunto}`);
}
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n').replace(/Ñ/g, 'N');

function persona() {
  const mujer = chance(0.52);
  const nombre = unico('nombre', () => `${uno(mujer ? NOMBRES_F : NOMBRES_M)} ${uno(APELLIDOS)} ${uno(APELLIDOS)}`);
  const partes = sinTildes(nombre).toLowerCase().split(' ');
  const primerNombre = partes[0];
  const primerApellido = partes[partes.length - 2];
  const correo = unico('correo', () => {
    const sufijo = chance(0.35) ? String(entre(70, 99)) : '';
    return `${primerNombre}.${primerApellido}${sufijo}@example.com`;
  });
  const telefono = unico('telefono', () => `${uno(PREFIJOS_CEL)}${digitos(7)}`);
  return { nombre, correo, telefono, mujer };
}

/** Cédulas con la forma que tienen de verdad según la edad y la región. */
function cedula() {
  return unico('documento', () =>
    pesado([
      [() => `10${digitos(8)}`, 45], // nacidos después de 2000 / expedidas desde 2003
      [() => `${uno(['43', '71', '70', '32'])}${digitos(6)}`, 20], // Antioquia
      [() => `${uno(['79', '52', '80', '51', '19', '41'])}${digitos(6)}`, 25], // Bogotá
      [() => `${uno(['16', '94', '31', '66'])}${digitos(6)}`, 10], // Valle
    ])(),
  );
}
const cedulaExtranjeria = () => unico('documento', () => `${entre(3, 9)}${digitos(5)}`);
const nit = () => unico('documento', () => `${uno(['900', '901', '800', '890'])}${digitos(6)}`);

function cuentaBancaria(banco, telefono, tipo) {
  if (banco === 'NEQUI' || banco === 'DAVIPLATA') return telefono;
  const largo = { BANCOLOMBIA: 11, DAVIVIENDA: 12, BBVA: 12, BANCO_BOGOTA: 9, BANCO_OCCIDENTE: 9, BANCO_AV_VILLAS: 12, BANCO_CAJA_SOCIAL: 11, SCOTIABANK: 10, ITAU: 12, BANCOOMEVA: 10, BANCO_POPULAR: 9 }[banco] ?? 10;
  const prefijo = banco === 'BANCOLOMBIA' ? (tipo === 'AHORROS' ? uno(['912', '256', '407', '651']) : uno(['184', '289', '755'])) : '';
  return prefijo + digitos(largo - prefijo.length);
}

// ══════════════════════════════════════════════════════════════════════════
// 1. Propietarios
// ══════════════════════════════════════════════════════════════════════════

const NOTAS_PROPIETARIO = ['Prefiere que le escriban por WhatsApp', 'Vive en el exterior; contacto sólo por correo', 'Pide el certificado de retención cada enero', 'Girar después del 5 de cada mes', 'La cuenta es de la esposa, ver titular', 'Representante legal: ver correo', 'No llamar después de las 6 p. m.'];

const propietarios = [];
const nEmpresas = Math.max(1, Math.round(N.propietarios * 0.1));
const nExtranjeros = Math.max(1, Math.round(N.propietarios * 0.05));
for (let i = 0; i < N.propietarios; i++) {
  const esEmpresa = i < nEmpresas;
  const esExtranjero = !esEmpresa && i < nEmpresas + nExtranjeros;
  const casa = pesado(CIUDADES.map((c) => [c, c.peso]));
  let nombre, tipoDoc, documento, correo, telefono;
  if (esEmpresa) {
    nombre = EMPRESAS[i % EMPRESAS.length];
    tipoDoc = 'NIT';
    documento = nit();
    telefono = unico('telefono', () => `${uno(['601', '604', '602', '605', '607'])}${digitos(7)}`);
    const clave = sinTildes(nombre).toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter((p) => p.length > 3).slice(0, 2).join('');
    correo = unico('correo', () => `pagos@${clave}${chance(0.5) ? '' : entre(1, 9)}.example.com`);
    usados.nombre.add(nombre);
  } else {
    const p = persona();
    nombre = p.nombre;
    correo = p.correo;
    telefono = p.telefono;
    tipoDoc = esExtranjero ? 'CE' : 'CC';
    documento = esExtranjero ? cedulaExtranjeria() : cedula();
  }
  const banco = pesado(BANCOS);
  const tipoCuenta = banco === 'NEQUI' || banco === 'DAVIPLATA' ? 'AHORROS' : esEmpresa ? pesado([['CORRIENTE', 70], ['AHORROS', 30]]) : pesado([['AHORROS', 82], ['CORRIENTE', 18]]);
  const otroTitular = !esEmpresa && chance(0.08);
  const titular = otroTitular ? persona().nombre : nombre;
  const viaTexto = pesado(VIAS);
  propietarios.push({
    tipoDoc, documento, nombre, telefono, correo,
    direccion: `${viaTexto} ${entre(4, 150)} # ${entre(3, 99)}-${entre(2, 80)}`,
    ciudad: casa.ciudad,
    banco, tipoCuenta,
    numeroCuenta: cuentaBancaria(banco, telefono, tipoCuenta),
    titular,
    responsableIva: esEmpresa ? 'Sí' : chance(0.1) ? 'Sí' : 'No',
    retRenta: esEmpresa ? (chance(0.6) ? 'Sí' : 'No') : 'No',
    retIva: esEmpresa ? (chance(0.3) ? 'Sí' : 'No') : 'No',
    retIca: esEmpresa ? (chance(0.4) ? 'Sí' : 'No') : 'No',
    notas: otroTitular ? 'La cuenta es de la esposa, ver titular' : chance(0.22) ? uno(NOTAS_PROPIETARIO) : '',
    esEmpresa,
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 2. Inquilinos
// ══════════════════════════════════════════════════════════════════════════

const inquilinos = [];
for (let i = 0; i < N.inquilinos; i++) {
  const p = persona();
  const extranjero = chance(0.04);
  inquilinos.push({
    tipoDoc: extranjero ? 'CE' : 'CC',
    documento: extranjero ? cedulaExtranjeria() : cedula(),
    nombre: p.nombre,
    correo: p.correo,
    telefono: chance(0.93) ? p.telefono : '',
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 3. Inmuebles
// ══════════════════════════════════════════════════════════════════════════

const OBSERVACIONES = ['Parqueadero cubierto', 'Incluye cuarto útil', 'Amoblado', 'Se aceptan mascotas', 'Cuarto piso sin ascensor', 'Con terraza', 'Recién remodelado', 'Dos parqueaderos', 'Vista exterior', 'Gas natural', 'Piso 12 con balcón', 'Zona de lavandería'];

function direccionUnica(ciudad) {
  return unico('direccion', () => {
    const via = pesado(VIAS);
    const letra = chance(0.3) ? uno(['A', 'B', 'C', 'D', 'Sur', 'Bis']) : '';
    const principal = ciudad === 'Bogotá' ? entre(6, 170) : entre(4, 90);
    const d = `${via} ${principal}${letra ? (letra === 'Sur' || letra === 'Bis' ? ` ${letra}` : letra) : ''} # ${entre(3, 99)}-${entre(2, 96)}`;
    // Los números son lo que distingue una dirección de otra para el
    // migrador de contratos: que no haya dos con los mismos.
    const numeros = d.match(/\d+/g).join('-');
    if (usados.numeros.has(numeros)) return `__repetida__${rnd()}`;
    usados.numeros.add(numeros);
    return d;
  });
}

const fechaISO = (d) => d.toISOString().slice(0, 10);
function fechaEntre(desdeISO, hastaISO) {
  const a = new Date(desdeISO).getTime();
  const b = new Date(hastaISO).getTime();
  return new Date(a + rnd() * (b - a));
}

const inmuebles = [];
// Reparto de dueños: las empresas y unos pocos particulares tienen varios.
const duenos = [];
for (const p of propietarios) {
  const cuantos = p.esEmpresa ? entre(3, 6) : chance(0.2) ? entre(2, 4) : 1;
  for (let k = 0; k < cuantos; k++) duenos.push(p);
}
while (duenos.length < N.inmuebles) duenos.push(uno(propietarios));
// barajar
for (let i = duenos.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [duenos[i], duenos[j]] = [duenos[j], duenos[i]];
}

for (let i = 0; i < N.inmuebles; i++) {
  const dueno = duenos[i];
  const ciudad = pesado(CIUDADES.map((c) => [c, c.peso]));
  const t = pesado(TIPOS.map((x) => [x, x.peso]));
  const enVenta = i >= N.contratos && chance(0.2);
  const canonBase = redondearA(entre(t.canon[0], t.canon[1]) * ciudad.factor, 50_000);
  const admin = t.admin[1] === 0 ? 0 : redondearA(entre(t.admin[0], t.admin[1]), 10_000);
  const barrio = uno(ciudad.barrios);
  const dir = direccionUnica(ciudad.ciudad);
  const complemento = t.complemento();
  const direccion = complemento ? `${dir} ${complemento}` : dir;
  inmuebles.push({
    titulo: `${t.tipo} en ${barrio}`,
    direccion,
    ciudad: ciudad.ciudad,
    barrio,
    depto: ciudad.depto,
    tipo: t.tipo,
    uso: t.uso,
    negocio: enVenta ? 'Venta' : 'Arriendo',
    canon: enVenta ? '' : canonBase,
    precioVenta: enVenta ? redondearA(canonBase * entre(150, 260), 5_000_000) : '',
    admin,
    comision: pesado([[10, 55], [9, 20], [8, 25]]),
    area: entre(t.area[0], t.area[1]),
    habitaciones: entre(t.hab[0], t.hab[1]),
    banos: entre(t.banos[0], t.banos[1]),
    propietario: dueno,
    estado: i < N.contratos ? 'Arrendado' : 'Disponible',
    observaciones: chance(0.32) ? uno(OBSERVACIONES) : '',
    consignadoEl: fechaISO(fechaEntre('2022-02-01', '2026-07-15')),
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 4. Contratos — los primeros N.contratos inmuebles, un inquilino cada uno
// ══════════════════════════════════════════════════════════════════════════

function sumarMeses(iso, meses) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + meses);
  return fechaISO(d);
}

const contratos = [];
for (let i = 0; i < N.contratos; i++) {
  const inm = inmuebles[i];
  const inq = inquilinos[i];
  const inicioMes = fechaEntre('2024-01-01', '2026-07-01');
  const dia = uno([1, 1, 5, 5, 10, 15, 20]);
  const inicio = fechaISO(new Date(Date.UTC(inicioMes.getUTCFullYear(), inicioMes.getUTCMonth(), dia)));
  let fin = sumarMeses(inicio, 12);
  while (new Date(fin) <= HOY) fin = sumarMeses(fin, 12); // prorrogado por períodos iguales
  const comercial = inm.uso === 'COMERCIAL';
  contratos.push({
    direccion: inm.direccion,
    inquilino: inq,
    inicio, fin,
    canon: inm.canon,
    // Ley 820 de 2003, art. 16: en vivienda urbana NO se puede exigir depósito.
    deposito: comercial ? inm.canon * uno([1, 1, 2]) : 0,
    diaDePago: uno([1, 5, 5, 5, 3, 7, 10, 15]),
    uso: inm.uso,
    periodicidad: comercial && chance(0.12) ? 'BIMESTRAL' : 'MENSUAL',
    comision: inm.comision,
    inmueble: inm,
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 5. Asientos históricos — tres meses del libro diario de la inmobiliaria
// ══════════════════════════════════════════════════════════════════════════

/** Las cuentas de movimiento de la semilla que se usan acá (todas existen en el PUC base). */
const CTA = {
  bancos: '111005', // Bancos — moneda nacional
  recaudoCanon: '28150505', // Canon recaudado para propietarios
  recaudoAdmin: '28150510', // Cuotas de administración recaudadas para la copropiedad
  comision: '415510', // Ingresos — inmobiliarias por retribución o contrata
  ivaGenerado: '240805',
  gmf: '511580', // Gravamen a los movimientos financieros (4×1000)
  nomina: '510506',
  arriendoOficina: '512010',
  energia: '513530',
  telefono: '513535',
  papeleria: '519530',
  gastosBancarios: '530505',
  vigilancia: '513505',
  cajaMenor: '110510',
};
const CUENTAS_SEMILLA = new Set(['110505', '110510', '111005', '112005', '130505', '134515', '135515', '135517', '135518', '138025', '138095', '139005', '139905', '233525', '233535', '233595', '236515', '236520', '236525', '236530', '236540', '236705', '236805', '238095', '240805', '240810', '241205', '280505', '281020', '28150505', '28150510', '28150515', '281510', '415505', '415510', '422530', '429505', '510506', '511025', '511095', '511505', '511580', '511595', '512010', '513505', '513530', '513535', '513595', '514510', '519530', '519595', '530505', '530515', '530520', '530595']);

const MES_NOMBRE = { '2026-06': 'junio', '2026-07': 'julio', '2026-08': 'agosto' };
const asientos = []; // { numero, fecha, descripcion, lineas: [{cuenta, debito, credito, detalle}] }
const seq = {};
function numero(prefijo, mes) {
  const k = `${prefijo}-${mes.replace('-', '')}`;
  seq[k] = (seq[k] ?? 0) + 1;
  return `${k}-${String(seq[k]).padStart(4, '0')}`;
}
const fechaDe = (mes, dia) => `${mes}-${String(Math.min(dia, 28)).padStart(2, '0')}`;
const nombreCorto = (n) => n.split(' ').slice(0, 2).join(' ');

function cobrarMes(c, mesContable, mesQueSeCobra, atrasado) {
  const etiqueta = `${MES_NOMBRE[mesQueSeCobra]}${atrasado ? ' (atrasado)' : ''}`;
  const dia = c.diaDePago + (atrasado ? entre(0, 6) : chance(0.15) ? entre(1, 4) : 0);
  const fecha = fechaDe(mesContable, dia);
  const admin = c.inmueble.admin;
  const canon = c.canon;

  // Recaudo: entra a bancos, queda debiendo al propietario (y a la copropiedad).
  asientos.push({
    numero: numero('RC', mesContable), fecha,
    descripcion: `Recaudo canon ${etiqueta} — ${c.direccion}`,
    lineas: [
      { cuenta: CTA.bancos, debito: canon + admin, credito: 0, detalle: `Pago de ${nombreCorto(c.inquilino.nombre)}` },
      { cuenta: CTA.recaudoCanon, debito: 0, credito: canon, detalle: 'Canon' },
      ...(admin > 0 ? [{ cuenta: CTA.recaudoAdmin, debito: 0, credito: admin, detalle: 'Cuota de administración' }] : []),
    ],
  });

  // Comisión de la inmobiliaria, con IVA del 19 %, descontada del recaudo.
  const comision = Math.round((canon * c.comision) / 100);
  const iva = Math.round(comision * 0.19);
  asientos.push({
    numero: numero('CI', mesContable), fecha,
    descripcion: `Comisión ${c.comision}% ${etiqueta} — ${c.direccion}`,
    lineas: [
      { cuenta: CTA.recaudoCanon, debito: comision + iva, credito: 0, detalle: 'Descuento de comisión e IVA' },
      { cuenta: CTA.comision, debito: 0, credito: comision, detalle: 'Comisión de administración' },
      { cuenta: CTA.ivaGenerado, debito: 0, credito: iva, detalle: 'IVA 19 % sobre la comisión' },
    ],
  });

  // Giro al propietario dos días después, con el 4×1000 que cobra el banco.
  const giro = canon - comision - iva;
  const gmf = Math.round(giro * 0.004);
  asientos.push({
    numero: numero('CE', mesContable), fecha: fechaDe(mesContable, dia + 2),
    descripcion: `Giro a propietario ${etiqueta} — ${c.direccion}`,
    lineas: [
      { cuenta: CTA.recaudoCanon, debito: giro, credito: 0, detalle: `Giro a ${nombreCorto(c.inmueble.propietario.nombre)}` },
      { cuenta: CTA.gmf, debito: gmf, credito: 0, detalle: 'GMF 4×1000' },
      { cuenta: CTA.bancos, debito: 0, credito: giro + gmf, detalle: `${c.inmueble.propietario.banco} ${c.inmueble.propietario.numeroCuenta}` },
    ],
  });

  // Y la administración se le paga a la copropiedad.
  if (admin > 0) {
    asientos.push({
      numero: numero('CA', mesContable), fecha: fechaDe(mesContable, dia + 3),
      descripcion: `Pago administración ${etiqueta} — ${c.direccion}`,
      lineas: [
        { cuenta: CTA.recaudoAdmin, debito: admin, credito: 0, detalle: 'Cuota de administración' },
        { cuenta: CTA.bancos, debito: 0, credito: admin, detalle: 'Transferencia a la copropiedad' },
      ],
    });
  }
}

const morosos = new Set(); // los que se atrasan un mes y pagan al siguiente
for (let m = 0; m < MESES.length; m++) {
  const mes = MESES[m];
  for (const c of contratos) {
    // Los bimestrales cobran cada dos meses.
    if (c.periodicidad === 'BIMESTRAL' && m % 2 === 1) continue;
    if (morosos.has(c)) {
      cobrarMes(c, mes, MESES[m - 1], true);
      morosos.delete(c);
    }
    if (m < MESES.length - 1 && chance(0.08)) {
      morosos.add(c); // este mes no paga; lo hace el que viene
      continue;
    }
    cobrarMes(c, mes, mes, false);
  }

  // Gastos propios de la inmobiliaria, una vez al mes.
  const gastos = [
    [CTA.nomina, redondearA(entre(9_500_000, 12_800_000), 10_000), 'Nómina del mes', 28],
    [CTA.arriendoOficina, 3_400_000, 'Arriendo de la oficina', 5],
    [CTA.energia, redondearA(entre(280_000, 410_000), 1_000), 'Energía eléctrica (EPM/Enel)', 12],
    [CTA.telefono, 219_900, 'Telefonía e internet', 10],
    [CTA.papeleria, redondearA(entre(90_000, 260_000), 1_000), 'Papelería y fotocopias', 18],
    [CTA.gastosBancarios, redondearA(entre(120_000, 240_000), 1_000), 'Cuota de manejo y transferencias', 27],
    [CTA.vigilancia, 890_000, 'Aseo y vigilancia del edificio', 8],
  ];
  for (const [cuenta, valor, concepto, dia] of gastos) {
    asientos.push({
      numero: numero('CE', mes), fecha: fechaDe(mes, dia),
      descripcion: `${concepto} ${MES_NOMBRE[mes]}`,
      lineas: [
        { cuenta, debito: valor, credito: 0, detalle: '' },
        { cuenta: CTA.bancos, debito: 0, credito: valor, detalle: '' },
      ],
    });
  }
  // Reposición de la caja menor.
  asientos.push({
    numero: numero('CE', mes), fecha: fechaDe(mes, 15),
    descripcion: `Reposición caja menor ${MES_NOMBRE[mes]}`,
    lineas: [
      { cuenta: CTA.cajaMenor, debito: 400_000, credito: 0, detalle: '' },
      { cuenta: CTA.bancos, debito: 0, credito: 400_000, detalle: '' },
    ],
  });
}
// Por fecha, y dentro del día en el orden en que pasan las cosas:
// recaudo → comisión → giro → administración → gastos.
const RANGO = { RC: 0, CI: 1, CE: 2, CA: 3 };
asientos.sort((a, b) => {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  const ra = RANGO[a.numero.slice(0, 2)] ?? 9;
  const rb = RANGO[b.numero.slice(0, 2)] ?? 9;
  if (ra !== rb) return ra - rb;
  return a.numero < b.numero ? -1 : 1;
});

// ══════════════════════════════════════════════════════════════════════════
// Validación: si esto no pasa, los archivos no salen
// ══════════════════════════════════════════════════════════════════════════

const fallas = [];
const nombresDePropietario = new Set(propietarios.map((p) => p.nombre));
for (const i of inmuebles) if (!nombresDePropietario.has(i.propietario.nombre)) fallas.push(`inmueble sin dueño en 01: ${i.direccion}`);
const direcciones = new Set(inmuebles.map((i) => i.direccion));
const inquilinosPorDoc = new Set(inquilinos.map((q) => q.documento));
for (const c of contratos) {
  if (!direcciones.has(c.direccion)) fallas.push(`contrato con dirección que no está en 03: ${c.direccion}`);
  if (!inquilinosPorDoc.has(c.inquilino.documento)) fallas.push(`contrato con inquilino que no está en 02: ${c.inquilino.nombre}`);
  if (!(new Date(c.fin) > HOY)) fallas.push(`contrato vencido: ${c.direccion} ${c.fin}`);
  if (c.uso === 'VIVIENDA' && c.deposito !== 0) fallas.push(`depósito en vivienda (Ley 820): ${c.direccion}`);
}
for (const a of asientos) {
  const d = a.lineas.reduce((s, l) => s + l.debito, 0);
  const c = a.lineas.reduce((s, l) => s + l.credito, 0);
  if (d !== c) fallas.push(`asiento descuadrado ${a.numero}: ${d} vs ${c}`);
  for (const l of a.lineas) {
    if (!CUENTAS_SEMILLA.has(l.cuenta)) fallas.push(`cuenta fuera de la semilla: ${l.cuenta} en ${a.numero}`);
    if (l.debito > 0 && l.credito > 0) fallas.push(`línea con débito y crédito: ${a.numero}`);
    if (l.debito === 0 && l.credito === 0) fallas.push(`línea en cero: ${a.numero}`);
    if (!Number.isInteger(l.debito) || !Number.isInteger(l.credito)) fallas.push(`monto no entero: ${a.numero}`);
    if (l.debito > 2_147_483_647 || l.credito > 2_147_483_647) fallas.push(`monto sobre el tope: ${a.numero}`);
  }
}
if (new Set(asientos.map((a) => a.numero)).size !== asientos.length) fallas.push('números de comprobante repetidos');
if (fallas.length) {
  console.error('❌ El caso no es consistente:\n' + fallas.slice(0, 20).map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}

// ══════════════════════════════════════════════════════════════════════════
// Escritura: CSV con BOM (Excel abre las tildes bien), coma, CRLF
// ══════════════════════════════════════════════════════════════════════════

function csv(encabezados, filas) {
  const celda = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [encabezados, ...filas].map((f) => f.map(celda).join(',')).join('\r\n') + '\r\n';
}
mkdirSync(SALIDA, { recursive: true });
const escribir = (nombre, contenido) => writeFileSync(resolve(SALIDA, nombre), contenido, 'utf8');

escribir('01-propietarios.csv', csv(
  ['Tipo de documento', 'Número de documento', 'Nombre completo', 'Correo', 'Teléfono', 'Dirección', 'Ciudad', 'Banco', 'Tipo de cuenta', 'Número de cuenta', 'Titular de la cuenta', 'Responsable de IVA', 'Agente retenedor de renta', 'Agente retenedor de IVA', 'Agente retenedor de ICA', 'Notas'],
  propietarios.map((p) => [p.tipoDoc, p.documento, p.nombre, p.correo, p.telefono, p.direccion, p.ciudad, p.banco, p.tipoCuenta, p.numeroCuenta, p.titular, p.responsableIva, p.retRenta, p.retIva, p.retIca, p.notas]),
));

escribir('02-inquilinos.csv', csv(
  ['Tipo de documento', 'Número de documento', 'Nombre completo', 'Correo', 'Teléfono'],
  inquilinos.map((q) => [q.tipoDoc, q.documento, q.nombre, q.correo, q.telefono]),
));

escribir('03-inmuebles.csv', csv(
  ['Título', 'Dirección', 'Ciudad', 'Barrio', 'Departamento', 'Tipo Inmueble', 'Tipo de Negocio', 'Canon Mensual', 'Precio de Venta', 'Administración', 'Comisión %', 'Área m2', 'Habitaciones', 'Baños', 'Propietario', 'Tel Propietario', 'Estado', 'Observaciones', 'Fecha de Consignación'],
  inmuebles.map((i) => [i.titulo, i.direccion, i.ciudad, i.barrio, i.depto, i.tipo, i.negocio, i.canon, i.precioVenta, i.admin || '', i.comision, i.area, i.habitaciones, i.banos, i.propietario.nombre, i.propietario.telefono, i.estado, i.observaciones, i.consignadoEl]),
));

escribir('04-contratos.csv', csv(
  ['Dirección del inmueble', 'Nombre del arrendatario', 'Cédula del arrendatario', 'Correo del arrendatario', 'Teléfono del arrendatario', 'Fecha de inicio', 'Fecha de terminación', 'Canon de arrendamiento', 'Depósito', 'Día de pago', 'Uso del inmueble', 'Periodicidad', 'Comisión de administración'],
  contratos.map((c) => [c.direccion, c.inquilino.nombre, c.inquilino.documento, c.inquilino.correo, c.inquilino.telefono, c.inicio, c.fin, c.canon, c.deposito, c.diaDePago, c.uso, c.periodicidad, c.comision]),
));

const filasDeAsientos = [];
for (const a of asientos) for (const l of a.lineas) filasDeAsientos.push([a.numero, a.fecha, a.descripcion, l.cuenta, l.debito || '', l.credito || '', l.detalle]);
escribir('05-asientos-historicos.csv', csv(
  ['Número del comprobante', 'Fecha', 'Descripción', 'Código de cuenta', 'Débito', 'Crédito', 'Detalle de la línea'],
  filasDeAsientos,
));

// ── Resumen para el LEEME y para la consola ────────────────────────────────
const totalRecaudado = asientos.filter((a) => a.numero.startsWith('RC')).reduce((s, a) => s + a.lineas[0].debito, 0);
const totalComision = asientos.filter((a) => a.numero.startsWith('CI')).reduce((s, a) => s + a.lineas[1].credito, 0);
const resumen = {
  semilla: SEMILLA,
  propietarios: propietarios.length,
  empresas: propietarios.filter((p) => p.esEmpresa).length,
  inquilinos: inquilinos.length,
  inmuebles: inmuebles.length,
  enVenta: inmuebles.filter((i) => i.negocio === 'Venta').length,
  contratos: contratos.length,
  comerciales: contratos.filter((c) => c.uso === 'COMERCIAL').length,
  asientos: asientos.length,
  lineas: filasDeAsientos.length,
  meses: MESES.join(', '),
  recaudado: totalRecaudado,
  comision: totalComision,
  ciudades: Object.entries(inmuebles.reduce((acc, i) => ((acc[i.ciudad] = (acc[i.ciudad] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(' · '),
};
const cop = (n) => '$' + n.toLocaleString('es-CO');

escribir('00-LEEME.md', `# Caso de muestra para la migración

Cinco archivos consistentes entre sí, generados con \`scripts/generar-muestras-migracion.mjs\`
(semilla \`${SEMILLA}\`: correrlo de nuevo da exactamente estos archivos). Sirven para recorrer
el muro de migración de punta a punta con una inmobiliaria de tamaño real.

| Paso | Archivo | Qué trae |
|---|---|---|
| 1 · Terceros | \`01-propietarios.csv\` | ${resumen.propietarios} propietarios (${resumen.empresas} empresas con NIT, el resto personas con CC/CE), con banco, tipo y número de cuenta, titular y perfil tributario |
| 1 · Terceros | \`02-inquilinos.csv\` | ${resumen.inquilinos} inquilinos con documento, correo y teléfono (${resumen.contratos} tienen contrato; el resto no) |
| 2 · Propiedades | \`03-inmuebles.csv\` | ${resumen.inmuebles} inmuebles en ${resumen.ciudades} — ${resumen.contratos} arrendados, ${resumen.enVenta} en venta, el resto disponibles |
| 3 · Contratos | \`04-contratos.csv\` | ${resumen.contratos} contratos vigentes (${resumen.comerciales} comerciales), cada uno sobre una dirección del archivo 03 y un inquilino del 02 |
| 5 · Registros contables | \`05-asientos-historicos.csv\` | ${resumen.asientos} comprobantes / ${resumen.lineas} líneas del libro diario de ${resumen.meses}: recaudo, comisión con IVA, giro al propietario con 4×1000, pago de administración y gastos de la oficina |

Recaudado en los tres meses: ${cop(resumen.recaudado)} · comisiones: ${cop(resumen.comision)}.

## Cómo se enlazan

- **Inmueble → dueño**: la columna \`Propietario\` trae el nombre completo tal cual está en
  \`01-propietarios.csv\`, y \`Tel Propietario\` el mismo teléfono.
- **Contrato → inmueble**: \`Dirección del inmueble\` es idéntica a la \`Dirección\` del archivo 03.
  El migrador casa por dirección normalizada, así que tiene que ser la misma; lo es.
- **Contrato → inquilino**: nombre, cédula, correo y teléfono son los del archivo 02.
- **Asientos → PUC**: sólo códigos que existen en el plan base (Decreto 2650) que siembra el paso 4.
  Cargá el PUC base ANTES de subir este archivo; si no, cada línea va a decir que la cuenta no existe.
- **Asientos → contratos**: cada recaudo, comisión y giro menciona la dirección del contrato.

## Para tener en cuenta

- Los correos son \`@example.com\` a propósito: el correo del inquilino es la llave de su cuenta del
  portal, y no queremos invitar a una persona real por accidente.
- 🔴 **Los inquilinos no se crean hasta que el back deje de invitar por correo en la misma
  llamada.** Hoy \`aplicar\` crea cada inquilino con \`inviteUserByEmail\` de Supabase, y el
  proyecto de dev devuelve \`429 over_email_send_rate_limit\` a la segunda o tercera invitación
  (probado el 2026-09-01: las 110 filas pasan la revisión, «Listas para crear 110», y al crear cada
  una dice «No se pudo invitar a …: Error sending invite email» / «email rate limit exceeded»).
  No es un problema del archivo: el back tiene que crear el usuario sin mandar el correo y
  encolar las invitaciones aparte (o a un ritmo que el SMTP aguante). Los propietarios sí se
  crean —no se invitan—: 60 de 60.
- 🔴 **Los inmuebles entran sin consignación.** El asistente de inmuebles crea las 120
  propiedades (probado: 120 de 120, geocodificadas) pero ignora «Propietario», «Tel
  Propietario» y «Comisión %» para el mandato: la agencia queda con 0 consignaciones, y en el
  paso 3 los 90 contratos resuelven su inmueble (90 de 90 por dirección) pero cada uno pide
  «Registrar y consignar» a mano (nombre del propietario, documento, comisión). Hay un diálogo
  de mandatos en lote (\`CompletarMandatosLoteDialog\`) construido pero sin conectar, y asigna
  UN dueño a todo el lote — no sirve para muchos dueños. Falta: que la importación case el
  propietario por documento/nombre+teléfono y cree la consignación con la comisión de la fila.
- ✅ Lo que sí pasó de punta a punta en QA (\`portofinoqaprb\`, 2026-09-01): 60 propietarios
  creados; 120 inmuebles creados; 90 contratos revisados con inmueble resuelto; PUC base
  sembrado (99 cuentas); **1.043 asientos / 2.839 movimientos aplicados, débitos = créditos =
  $2.141.126.351**.
- Los contratos de **vivienda van sin depósito** (Ley 820 de 2003, art. 16 lo prohíbe); los
  comerciales llevan uno o dos cánones.
- Un 8 % de los contratos se atrasa un mes y paga al siguiente: en el libro diario aparece
  «(atrasado)». Los bimestrales cobran mes por medio.
- Los encabezados son los títulos que publica cada importador, así que el auto-mapeo los
  reconoce solo. Si remapeás algo a mano, el archivo sigue sirviendo.
- Son CSV UTF-8 con BOM, separados por coma: Excel, Numbers y Google Sheets los abren con
  las tildes bien.

## Otro tamaño u otro caso

\`\`\`bash
node scripts/generar-muestras-migracion.mjs --semilla=7 --propietarios=200 --inquilinos=400 --inmuebles=450 --contratos=380
\`\`\`
`);

console.log(JSON.stringify(resumen, null, 2));
console.log('→', SALIDA);
