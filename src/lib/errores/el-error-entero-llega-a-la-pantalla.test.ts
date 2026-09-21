/**
 * 🔴 EL ERROR ENTERO LLEGA A LA PANTALLA, NO SU MENSAJE.
 *
 * ── Lo que pasó (21-09-2026) ───────────────────────────────────────────────
 *
 * Nico apretó «Registrar pago» y el selector de clientes del recibo de caja
 * dijo: «No pudimos cargar esto. Fue un problema nuestro, no tuyo… Referencia:
 * SER-0721», con un botón de reintentar.
 *
 * No era un problema nuestro. Era un **403 `SEGUNDO_FACTOR_REQUERIDO`**: su
 * sesión no había pasado el segundo factor, el back mandaba el motivo exacto
 * —«actívalo en Configuración → Seguridad y vuelve a entrar»— y el componente
 * guardaba sólo `e.message` en un `useState<string>`. Un string no tiene
 * `status` ni `code`, así que `clasificar.ts` lo mandaba al cajón «servidor»
 * (de ahí el `SER-` de la referencia) y la pantalla se echó la culpa de algo
 * que el usuario podía arreglar en dos minutos.
 *
 * `EstadoDeDatos` lo dice en su propia firma: «El error entero, no su
 * mensaje». Esto lo hace cumplir.
 *
 * ── Por qué un guardián y no un tipo ───────────────────────────────────────
 *
 * La prop está tipada `unknown`, así que pasarle un `string` compila perfecto.
 * No hay tipo que vea esto; hay que leer el archivo.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(process.cwd(), 'src');

function pantallas(dir: string, salida: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) pantallas(ruta, salida);
    else if (ruta.endsWith('.tsx') && !ruta.endsWith('.test.tsx')) salida.push(ruta);
  }
  return salida;
}

/** Los identificadores que el archivo le pasa como `error=` a la tarjeta de fallo. */
function loQuePasaComoError(codigo: string): string[] {
  const nombres = new Set<string>();
  for (const m of codigo.matchAll(
    /<(?:FalloDeCarga|EstadoDeDatos)\b[\s\S]{0,600}?error=\{([\s\S]{0,80}?)\}/g,
  )) {
    // `error={loQueSea || t('x')}` → se queda con el primer identificador.
    const ident = m[1].trim().match(/^[A-Za-z_$][\w$]*/);
    if (ident) nombres.add(ident[0]);
  }
  return [...nombres];
}

/** El `set<Nombre>` que corresponde a un estado llamado `nombre`. */
function setterDe(nombre: string): string {
  return `set${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`;
}

describe('la tarjeta de fallo recibe el error entero', () => {
  it('🔴 ningún componente le pasa sólo `e.message` a FalloDeCarga o EstadoDeDatos', () => {
    const culpables: string[] = [];

    for (const ruta of pantallas(RAIZ)) {
      const codigo = readFileSync(ruta, 'utf8');
      if (!/<(?:FalloDeCarga|EstadoDeDatos)\b/.test(codigo)) continue;

      for (const nombre of loQuePasaComoError(codigo)) {
        const setter = setterDe(nombre);
        if (!codigo.includes(`${setter}(`)) continue;
        /*
         * El defecto tiene una forma muy concreta: dentro de un `catch`, el
         * setter de ESE estado recibe el mensaje en vez del error. Se busca
         * esa forma y no «cualquier `.message`», para no acusar a quien además
         * muestra el mensaje en otro lado.
         */
        const patron = new RegExp(
          `${setter}\\(\\s*\\w+\\s+instanceof\\s+Error[^)]{0,160}?\\.message`,
          's',
        );
        if (patron.test(codigo)) {
          culpables.push(`${ruta.replace(`${process.cwd()}/`, '')} · ${setter}`);
        }
      }
    }

    expect(culpables).toEqual([]);
  });
});
