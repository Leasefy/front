/**
 * Los países del mundo con su indicativo (Nico, 28-10-2026: «¿por qué no dejamos crear cuenta a una persona del mundo,
 * y el listado los tiene todos?»). El nombre en español lo da el navegador (`Intl.DisplayNames`) y la bandera sale del
 * código ISO: aquí sólo va lo que no se puede calcular, el indicativo. Colombia valida su celular como siempre; los
 * demás, de 6 a 14 dígitos (E.164), que es lo que acepta el back.
 */

/** ISO 3166-1 alfa-2 → indicativo sin «+». */
const INDICATIVOS: Record<string, string> = {
  AF: '93', AL: '355', DZ: '213', AS: '1', AD: '376', AO: '244', AI: '1', AG: '1', AR: '54', AM: '374', AW: '297',
  AU: '61', AT: '43', AZ: '994', BS: '1', BH: '973', BD: '880', BB: '1', BY: '375', BE: '32', BZ: '501', BJ: '229',
  BM: '1', BT: '975', BO: '591', BA: '387', BW: '267', BR: '55', VG: '1', BN: '673', BG: '359', BF: '226', BI: '257',
  KH: '855', CM: '237', CA: '1', CV: '238', KY: '1', CF: '236', TD: '235', CL: '56', CN: '86', CO: '57', KM: '269',
  CG: '242', CD: '243', CK: '682', CR: '506', CI: '225', HR: '385', CU: '53', CW: '599', CY: '357', CZ: '420',
  DK: '45', DJ: '253', DM: '1', DO: '1', EC: '593', EG: '20', SV: '503', GQ: '240', ER: '291', EE: '372', SZ: '268',
  ET: '251', FK: '500', FO: '298', FJ: '679', FI: '358', FR: '33', GF: '594', PF: '689', GA: '241', GM: '220',
  GE: '995', DE: '49', GH: '233', GI: '350', GR: '30', GL: '299', GD: '1', GP: '590', GU: '1', GT: '502', GN: '224',
  GW: '245', GY: '592', HT: '509', HN: '504', HK: '852', HU: '36', IS: '354', IN: '91', ID: '62', IR: '98', IQ: '964',
  IE: '353', IL: '972', IT: '39', JM: '1', JP: '81', JO: '962', KZ: '7', KE: '254', KI: '686', KW: '965', KG: '996',
  LA: '856', LV: '371', LB: '961', LS: '266', LR: '231', LY: '218', LI: '423', LT: '370', LU: '352', MO: '853',
  MG: '261', MW: '265', MY: '60', MV: '960', ML: '223', MT: '356', MH: '692', MQ: '596', MR: '222', MU: '230',
  YT: '262', MX: '52', FM: '691', MD: '373', MC: '377', MN: '976', ME: '382', MS: '1', MA: '212', MZ: '258', MM: '95',
  NA: '264', NR: '674', NP: '977', NL: '31', NC: '687', NZ: '64', NI: '505', NE: '227', NG: '234', NU: '683',
  KP: '850', MK: '389', MP: '1', NO: '47', OM: '968', PK: '92', PW: '680', PS: '970', PA: '507', PG: '675', PY: '595',
  PE: '51', PH: '63', PL: '48', PT: '351', PR: '1', QA: '974', RE: '262', RO: '40', RU: '7', RW: '250', KN: '1',
  LC: '1', PM: '508', VC: '1', WS: '685', SM: '378', ST: '239', SA: '966', SN: '221', RS: '381', SC: '248', SL: '232',
  SG: '65', SX: '1', SK: '421', SI: '386', SB: '677', SO: '252', ZA: '27', KR: '82', SS: '211', ES: '34', LK: '94',
  SD: '249', SR: '597', SE: '46', CH: '41', SY: '963', TW: '886', TJ: '992', TZ: '255', TH: '66', TL: '670', TG: '228',
  TO: '676', TT: '1', TN: '216', TR: '90', TM: '993', TC: '1', TV: '688', UG: '256', UA: '380', AE: '971', GB: '44',
  US: '1', UY: '598', VI: '1', UZ: '998', VU: '678', VA: '39', VE: '58', VN: '84', WF: '681', YE: '967', ZM: '260',
  ZW: '263', XK: '383', BQ: '599', AX: '358', GG: '44', IM: '44', JE: '44', EH: '212', SH: '290', NF: '672',
};

export interface PaisDelMundo {
  iso: string;
  nombre: string;
  indicativo: string;
  bandera: string;
}

/** 🇨🇴 a partir de «CO». */
export function banderaDe(iso: string): string {
  return String.fromCodePoint(...iso.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
}

function nombreDe(iso: string, nombres: Intl.DisplayNames | null): string {
  try {
    return nombres?.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

/** Primero los de la región, después todos en orden alfabético (sin tildes que estorben). */
const PRIMEROS = ['CO', 'US', 'MX', 'ES', 'VE', 'EC', 'PE', 'PA', 'CL', 'AR'];

let cache: PaisDelMundo[] | null = null;

export function paisesDelMundo(): PaisDelMundo[] {
  if (cache) return cache;
  let nombres: Intl.DisplayNames | null = null;
  try {
    nombres = new Intl.DisplayNames(['es'], { type: 'region' });
  } catch {
    nombres = null;
  }
  const todos = Object.entries(INDICATIVOS).map(([iso, indicativo]) => ({
    iso,
    nombre: nombreDe(iso, nombres),
    indicativo,
    bandera: banderaDe(iso),
  }));
  const primeros = PRIMEROS.map((iso) => todos.find((p) => p.iso === iso)).filter((p): p is PaisDelMundo => Boolean(p));
  const resto = todos.filter((p) => !PRIMEROS.includes(p.iso)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  cache = [...primeros, ...resto];
  return cache;
}

export function paisDelMundo(iso: string): PaisDelMundo {
  return paisesDelMundo().find((p) => p.iso === iso) ?? paisesDelMundo()[0];
}

/** Para buscar «espana» y encontrar «España», o «+52». */
export function plegarParaBuscar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function buscarPaises(texto: string): PaisDelMundo[] {
  const q = plegarParaBuscar(texto).replace(/^\+/, '');
  if (!q) return paisesDelMundo();
  return paisesDelMundo().filter((p) => plegarParaBuscar(p.nombre).includes(q) || p.indicativo.startsWith(q) || p.iso.toLowerCase() === q);
}

/**
 * El número completo en E.164 (`+573001234567`), o `null` si no sirve. Colombia: celular de 10 dígitos que empieza por
 * 3 (como siempre). Otro país: de 6 a 14 dígitos nacionales (sin el 0 de marcación nacional delante).
 */
export function celularEnE164(numero: string, iso: string): string | null {
  const pais = paisDelMundo(iso);
  let d = numero.replace(/\D/g, '');
  if (d.startsWith(pais.indicativo) && d.length > pais.indicativo.length + 6) d = d.slice(pais.indicativo.length);
  if (pais.iso === 'CO') return /^3\d{9}$/.test(d) ? `+57${d}` : null;
  d = d.replace(/^0+/, '');
  const total = pais.indicativo.length + d.length;
  return d.length >= 6 && total <= 15 ? `+${pais.indicativo}${d}` : null;
}

/** La frase concreta de por qué no sirve (o `null`). */
export function errorDelCelular(numero: string, iso: string): string | null {
  const d = numero.replace(/\D/g, '');
  if (!d) return 'Escribe tu WhatsApp.';
  if (celularEnE164(numero, iso)) return null;
  const pais = paisDelMundo(iso);
  if (pais.iso === 'CO') return d.length !== 10 ? 'El celular en Colombia tiene 10 dígitos.' : 'Un celular en Colombia empieza por 3.';
  return `Revisa el número: sin el +${pais.indicativo}, entre 6 y ${15 - pais.indicativo.length} dígitos.`;
}
