import { describe, it, expect } from 'vitest';
import {
  pasoDelRevelado,
  duracionDelRevelado,
  velocidadAcelerada,
  UMBRAL_DE_TECLEO,
  CARACTERES_POR_SEGUNDO,
} from './revelado';

const PARRAFO =
  'Tienes 29 contratos que vencen en octubre. De esos, 12 ya tienen propuesta de renovación enviada, ' +
  '9 están sin tocar y 8 tienen aviso de no renovación. ';

describe('el revelado de la respuesta (Nico, 23-09: «ve subiéndole la velocidad»)', () => {
  it('los primeros ~250 caracteres van letra por letra, al ritmo de siempre, con sus pausas', () => {
    expect(pasoDelRevelado(PARRAFO, 0)).toEqual({ hasta: 1, esperaMs: 1000 / CARACTERES_POR_SEGUNDO, acelerado: false });
    const punto = PARRAFO.indexOf('.');
    expect(pasoDelRevelado(PARRAFO, punto).esperaMs).toBe((1000 / CARACTERES_POR_SEGUNDO) * 6);
  });

  it('después acelera por palabras enteras, sin cortar ninguna', () => {
    const texto = PARRAFO.repeat(10);
    let i = UMBRAL_DE_TECLEO;
    for (let n = 0; n < 50 && i < texto.length; n++) {
      const p = pasoDelRevelado(texto, i);
      expect(p.acelerado).toBe(true);
      expect(p.hasta).toBeGreaterThan(i);
      // Nunca media palabra: lo que sigue al corte es un espacio o el fin.
      if (p.hasta < texto.length) expect(/\s/.test(texto[p.hasta - 1]) || /\s/.test(texto[p.hasta])).toBe(true);
      i = p.hasta;
    }
  });

  it('la velocidad crece como una ease-in: igual al tecleo al empezar, miles por segundo al final', () => {
    expect(velocidadAcelerada(0)).toBe(CARACTERES_POR_SEGUNDO);
    expect(velocidadAcelerada(300)).toBeGreaterThan(velocidadAcelerada(100));
    expect(velocidadAcelerada(600)).toBeGreaterThan(1000);
  });

  it('una respuesta larga termina muchísimo más rápido que antes (antes: >45 s para 1.500 caracteres)', () => {
    const largo = PARRAFO.repeat(12).slice(0, 1500);
    const duracion = duracionDelRevelado(largo);
    // Los 250 primeros tardan lo de siempre (~8 s con pausas); el resto, poco más de 2 s.
    const soloElTecleo = duracionDelRevelado(largo.slice(0, UMBRAL_DE_TECLEO));
    expect(duracion - soloElTecleo).toBeLessThan(3000);
    expect(duracion).toBeLessThan(12_000);
    // Y la fase acelerada tiene techo: una de 10.000 caracteres no tarda mucho más.
    const enorme = PARRAFO.repeat(80);
    expect(duracionDelRevelado(enorme) - duracionDelRevelado(enorme.slice(0, UMBRAL_DE_TECLEO))).toBeLessThan(3000);
  });

  it('con prefers-reduced-motion no hay animación: todo de una vez', () => {
    expect(pasoDelRevelado(PARRAFO, 0, { reducirMovimiento: true })).toEqual({
      hasta: PARRAFO.length,
      esperaMs: 0,
      acelerado: false,
    });
  });
});
