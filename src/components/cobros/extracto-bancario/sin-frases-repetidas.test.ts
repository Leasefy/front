import { describe, expect, it } from 'vitest';
import { sinFrasesRepetidas } from './LoQueProponeElAgente';

// CONC-13 (QA de agentes 17-10): la tarjeta del agente repetía tres frases:
// el micro manda la misma en `frases`, en `porQue` y en `porQueNoSeAplicaSola`.
describe('sinFrasesRepetidas', () => {
  it('cada frase se dice una vez, donde aparece primero', () => {
    const r = sinFrasesRepetidas({
      frases: ['El valor es igual a lo pendiente.', 'Es exactamente $2.750.000, lo que trajo el banco.'],
      porQue: [
        { tipo: 'back', texto: 'El valor es igual a lo pendiente.' },
        { tipo: 'valor', texto: 'Es exactamente  $2.750.000, lo que trajo el banco.' },
        { tipo: 'regla', texto: 'No trae la referencia de recaudo: la confirma una persona.' },
      ],
      porQueNoSeAplicaSola: 'No trae la referencia de recaudo: la confirma una persona.',
    });
    expect(r.porQue).toEqual([{ tipo: 'regla', texto: 'No trae la referencia de recaudo: la confirma una persona.' }]);
    expect(r.porQueNoSeAplicaSola).toBeNull();
  });

  it('lo que no se repite se queda', () => {
    const r = sinFrasesRepetidas({
      frases: [],
      porQue: [{ tipo: 'alias', texto: 'Lo confirmaron 3 personas.' }],
      porQueNoSeAplicaSola: 'El valor no es exacto: la confirma una persona.',
    });
    expect(r.porQue).toHaveLength(1);
    expect(r.porQueNoSeAplicaSola).toBe('El valor no es exacto: la confirma una persona.');
  });
});
