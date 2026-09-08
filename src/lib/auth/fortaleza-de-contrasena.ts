/**
 * Qué tan segura es una contraseña, en cinco barras y un consejo.
 *
 * ── Por qué existe (Nico, 2026-09-07) ─────────────────────────────────────
 * «En el crear cuenta no tenemos nada de seguridad mínima de la contraseña,
 * algo que le diga "agrega una contraseña que sea segura" y algo visual,
 * unas 5 líneas que vayan dando color: rojo, naranja y verde.» Hasta hoy el
 * único requisito era el de Supabase, 6 caracteres: «123456» pasaba.
 *
 * Es una función pura y la usan las cuatro pantallas donde alguien inventa
 * una contraseña (registro, registro por invitación, cuenta desde la
 * aprobación y nueva contraseña). El login NO la usa: quien ya tiene una
 * contraseña de 6 caracteres tiene que poder entrar con ella.
 *
 * ── Cómo puntúa ───────────────────────────────────────────────────────────
 * Cinco puntos posibles: dos por largo (8 y 12 caracteres) y tres por
 * variedad (dos, tres y cuatro clases entre minúsculas, mayúsculas, números y
 * símbolos; 16 caracteres valen por la cuarta clase, para que una frase larga
 * sin símbolos también llegue a cinco). Después se descuenta lo que un
 * atacante prueba primero: las contraseñas más usadas del mundo quedan en un
 * punto, y una secuencia («1234», «abcd», «qwer»), una letra repetida cuatro
 * veces o el propio correo adentro restan uno. Con menos de 8 caracteres
 * nunca pasa de dos, por muy variada que sea.
 *
 * El mínimo para crear la cuenta es tres puntos con 8 caracteres: letras y
 * números con una mayúscula o un símbolo, o cualquier cosa de 12 con dos
 * clases. Es lo que pide hoy cualquier banco colombiano y no espanta a nadie.
 */

export const LARGO_MINIMO_DE_CONTRASENA = 8;

export type PuntajeDeContrasena = 0 | 1 | 2 | 3 | 4 | 5;

export type NivelDeContrasena = 'vacia' | 'muy-debil' | 'debil' | 'aceptable' | 'segura' | 'muy-segura';

export interface FortalezaDeContrasena {
  /** 0 = vacía. Con algo escrito, de 1 a 5: las barras que se pintan. */
  puntaje: PuntajeDeContrasena;
  nivel: NivelDeContrasena;
  /** «Muy débil» … «Muy segura»; vacío cuando no hay contraseña. */
  etiqueta: string;
  /** Si alcanza para crear la cuenta. */
  cumpleMinimo: boolean;
  /** Qué hacer para subirla. Null sólo cuando ya es muy segura. */
  consejo: string | null;
}

export const CONSEJO_INICIAL = 'Mínimo 8 caracteres. Mezcla mayúsculas, números y símbolos.';

const ETIQUETAS: Record<Exclude<NivelDeContrasena, 'vacia'>, string> = {
  'muy-debil': 'Muy débil',
  debil: 'Débil',
  aceptable: 'Aceptable',
  segura: 'Segura',
  'muy-segura': 'Muy segura',
};

const NIVEL_POR_PUNTAJE: Record<1 | 2 | 3 | 4 | 5, Exclude<NivelDeContrasena, 'vacia'>> = {
  1: 'muy-debil',
  2: 'debil',
  3: 'aceptable',
  4: 'segura',
  5: 'muy-segura',
};

/**
 * Las que cualquier lista de contraseñas filtradas trae arriba, más las que
 * se prueban en Colombia. Se comparan en minúsculas y sin símbolos, así
 * «Password!» y «p-a-s-s-w-o-r-d» caen igual.
 */
const MUY_USADAS = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '12345678910', '12341234', '123123', '123321',
  '111111', '000000', '654321', '666666', '121212', '112233', '11223344',
  'password', 'password1', 'password123', 'passw0rd', 'pssw0rd', 'contrasena', 'contrasena1', 'contrasena123',
  'clave', 'clave123', 'clave1234', 'secreto', 'secreta', 'secreta123', 'secreto123',
  'qwerty', 'qwerty123', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm', '1q2w3e4r', 'qazwsx', '1qaz2wsx',
  'abc123', 'iloveyou', 'teamo', 'admin', 'admin123', 'administrador', 'usuario', 'usuario123',
  'welcome', 'welcome1', 'letmein', 'monkey', 'dragon', 'sunshine', 'princess', 'football', 'shadow', 'master', 'superman',
  'hola123', 'hola1234', 'holahola', 'colombia', 'colombia1', 'medellin', 'bogota', 'cali', 'leasefy', 'leasefy123',
  'temporal', 'temporal1', 'temporal123', 'cambiame', 'cambiar123', 'prueba', 'prueba123', 'test', 'test123', 'test1234',
]);

const FILAS_DEL_TECLADO = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'abcdefghijklmnopqrstuvwxyz'];

/** «1234», «abcd», «qwer», «4321», «dcba»: cuatro seguidos en cualquier dirección. */
function tieneSecuencia(llano: string): boolean {
  for (let i = 0; i + 4 <= llano.length; i += 1) {
    const trozo = llano.slice(i, i + 4);
    const alReves = [...trozo].reverse().join('');
    if (FILAS_DEL_TECLADO.some((fila) => fila.includes(trozo) || fila.includes(alReves))) return true;
  }
  return false;
}

function acotar(n: number): PuntajeDeContrasena {
  return Math.max(0, Math.min(5, Math.round(n))) as PuntajeDeContrasena;
}

export function fortalezaDeContrasena(
  contrasena: string | null | undefined,
  contexto: { correo?: string | null } = {},
): FortalezaDeContrasena {
  const c = contrasena ?? '';
  if (!c) {
    return { puntaje: 0, nivel: 'vacia', etiqueta: '', cumpleMinimo: false, consejo: CONSEJO_INICIAL };
  }

  const largo = c.length;
  const tieneMinuscula = /[a-z]/.test(c);
  const tieneMayuscula = /[A-Z]/.test(c);
  const tieneNumero = /\d/.test(c);
  const tieneSimbolo = /[^A-Za-z0-9]/.test(c);
  const clases = [tieneMinuscula, tieneMayuscula, tieneNumero, tieneSimbolo].filter(Boolean).length;

  let puntos = 0;
  if (largo >= LARGO_MINIMO_DE_CONTRASENA) puntos += 1;
  if (largo >= 12) puntos += 1;
  if (clases >= 2) puntos += 1;
  if (clases >= 3) puntos += 1;
  if (clases >= 4 || largo >= 16) puntos += 1;

  // Sin tildes ni ñ antes de comparar: «Contraseña123» es «contrasena123».
  const llano = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sinSimbolos = llano.replace(/[^a-z0-9]/g, '');
  const muyUsada = MUY_USADAS.has(llano) || MUY_USADAS.has(sinSimbolos);
  const repetida = /(.)\1{3,}/.test(llano);
  const secuencia = tieneSecuencia(llano);
  const local = (contexto.correo ?? '').trim().toLowerCase().split('@')[0] ?? '';
  const usaElCorreo = local.length >= 4 && llano.includes(local);

  if (muyUsada) puntos = Math.min(puntos, 1);
  if (repetida || secuencia) puntos -= 1;
  if (usaElCorreo) puntos -= 1;
  if (largo < LARGO_MINIMO_DE_CONTRASENA) puntos = Math.min(puntos, 2);

  // Con algo escrito siempre se pinta al menos una barra: una barra roja
  // dice más que cinco vacías.
  const puntaje = acotar(Math.max(1, puntos)) as 1 | 2 | 3 | 4 | 5;
  const nivel = NIVEL_POR_PUNTAJE[puntaje];
  const cumpleMinimo = largo >= LARGO_MINIMO_DE_CONTRASENA && puntaje >= 3 && !muyUsada;

  let consejo: string | null;
  if (muyUsada) consejo = 'Está entre las contraseñas más usadas del mundo. Elige otra.';
  else if (largo < LARGO_MINIMO_DE_CONTRASENA) consejo = `Usa al menos ${LARGO_MINIMO_DE_CONTRASENA} caracteres.`;
  else if (usaElCorreo) consejo = 'No uses tu correo dentro de la contraseña.';
  else if (secuencia || repetida) consejo = 'Evita secuencias como 1234 o abcd y letras repetidas.';
  else if (puntaje === 5) consejo = null;
  else if (clases === 1) consejo = 'Combina letras con números o símbolos.';
  else if (!tieneMayuscula) consejo = 'Agrega una mayúscula.';
  else if (!tieneNumero) consejo = 'Agrega un número.';
  else if (!tieneSimbolo) consejo = 'Agrega un símbolo (#, !, $…).';
  else consejo = 'Más larga es más segura: 12 caracteres o más.';

  return { puntaje, nivel, etiqueta: ETIQUETAS[nivel], cumpleMinimo, consejo };
}
