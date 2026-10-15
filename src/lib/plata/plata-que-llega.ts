/**
 * 🔴 QA de Portofino (14-10-2026). Los contadores de plata animados
 * (`AnimatedNumber`) se formateaban con `Math.round(n)`, también la cifra
 * FINAL: el portal decía «Próxima cuota $ 1.230.102» con la cuota en
 * $ 1.230.101,96 (canon con el incremento del IPC) y «Resta por pagar
 * $ 7.380.612» en vez de $ 7.380.611,76 — dos números para la misma plata en
 * la misma pantalla. Mientras cuenta, pesos enteros (los centavos no bailan);
 * al llegar, la cifra EXACTA.
 */
export function plataQueLlega(
  destino: number,
  formatear: (n: number) => string,
): (n: number) => string {
  return (n) => formatear(Math.abs(n - destino) < 0.005 ? destino : Math.round(n));
}
