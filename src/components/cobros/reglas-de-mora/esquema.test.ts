import { describe, it, expect } from 'vitest';
import {
  esquemaDeRegla,
  PLANTILLAS,
  resolverDeZod,
  TASA_DIARIA_DEL_2_MENSUAL,
  type ValoresDeRegla,
} from './esquema';

function valores(sobre: Partial<ValoresDeRegla> = {}): ValoresDeRegla {
  return {
    nombre: 'Interés de mora',
    concepto: 'INTERES_DE_MORA',
    disparador: 'DIAS_DE_MORA',
    disparadorDia: 1,
    formula: 'INTERES_DIARIO',
    valor: 0.0667,
    base: 'CANON',
    topeCop: null,
    orden: 0,
    activa: true,
    ...sobre,
  };
}

function erroresDe(v: ValoresDeRegla): Record<string, string> {
  const r = esquemaDeRegla.safeParse(v);
  if (r.success) return {};
  const salida: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const ruta = issue.path.join('.');
    if (!salida[ruta]) salida[ruta] = issue.message;
  }
  return salida;
}

describe('esquemaDeRegla', () => {
  it('acepta una regla bien formada y recorta el nombre', () => {
    const r = esquemaDeRegla.safeParse(valores({ nombre: '  Interés  ' }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nombre).toBe('Interés');
  });

  it('el nombre necesita 3 letras', () => {
    expect(erroresDe(valores({ nombre: 'Ab' }))).toMatchObject({
      nombre: 'El nombre necesita al menos 3 letras.',
    });
  });

  it('un valor vacío (NaN) es un error con mensaje, no un crash', () => {
    expect(erroresDe(valores({ valor: Number.NaN }))).toMatchObject({ valor: 'Poné el valor.' });
    expect(erroresDe(valores({ disparadorDia: Number.NaN }))).toMatchObject({
      disparadorDia: 'Poné el día.',
    });
  });

  it('interés diario por día del mes: el mensaje del back, letra por letra', () => {
    expect(
      erroresDe(valores({ formula: 'INTERES_DIARIO', disparador: 'DIA_DEL_MES', disparadorDia: 15 })),
    ).toMatchObject({
      disparador:
        'Un interés diario se dispara por días de mora, no por día del mes: ' +
        'atado a una fecha del calendario cobraría lo mismo el día 16 que el 30.',
    });
  });

  it('interés diario mayor que 1 %: el mensaje del back con la cifra mensual', () => {
    expect(erroresDe(valores({ formula: 'INTERES_DIARIO', valor: 2 }))).toMatchObject({
      valor:
        'Una tasa DIARIA de 2% son 60.0% al mes. ' +
        'Si querés esa cifra mensual, la diaria es ese número dividido 30.',
    });
    expect(erroresDe(valores({ formula: 'INTERES_DIARIO', valor: 1 }))).toEqual({});
  });

  it('porcentaje mayor que 100', () => {
    expect(
      erroresDe(valores({ formula: 'PORCENTAJE_DE_LA_BASE', valor: 150, disparador: 'DIA_DEL_MES', disparadorDia: 15 })),
    ).toMatchObject({ valor: 'Un porcentaje mayor que 100 cobraría más que la deuda entera.' });
  });

  it('día del mes fuera de 1..31', () => {
    expect(
      erroresDe(
        valores({ formula: 'PORCENTAJE_DE_LA_BASE', valor: 10, disparador: 'DIA_DEL_MES', disparadorDia: 0 }),
      ),
    ).toMatchObject({ disparadorDia: 'Un disparador por día del mes tiene que estar entre 1 y 31.' });
    expect(
      erroresDe(
        valores({ formula: 'PORCENTAJE_DE_LA_BASE', valor: 10, disparador: 'DIA_DEL_MES', disparadorDia: 32 }),
      ),
    ).toMatchObject({ disparadorDia: 'Un disparador por día del mes tiene que estar entre 1 y 31.' });
  });

  it('el tope va en pesos enteros, o null', () => {
    expect(erroresDe(valores({ topeCop: 500000 }))).toEqual({});
    expect(erroresDe(valores({ topeCop: null }))).toEqual({});
    expect(erroresDe(valores({ topeCop: 1.5 }))).toMatchObject({ topeCop: 'El tope va en pesos enteros.' });
  });

  it('no acepta un concepto que una regla no puede emitir', () => {
    expect(erroresDe(valores({ concepto: 'CANON' as never }))).toHaveProperty('concepto');
  });
});

describe('resolverDeZod', () => {
  it('devuelve los valores parseados cuando pasa', async () => {
    const resolver = resolverDeZod(esquemaDeRegla);
    const r = await resolver(valores({ nombre: ' X-1 ' }), undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(r.errors).toEqual({});
    expect((r.values as ValoresDeRegla).nombre).toBe('X-1');
  });

  it('devuelve el primer error por campo, con el mensaje, cuando falla', async () => {
    const resolver = resolverDeZod(esquemaDeRegla);
    const r = await resolver(
      valores({ nombre: 'Ab', formula: 'INTERES_DIARIO', valor: 3 }),
      undefined,
      { fields: {}, shouldUseNativeValidation: false },
    );
    expect(r.values).toEqual({});
    const errores = r.errors as Record<string, { message?: string }>;
    expect(errores.nombre?.message).toBe('El nombre necesita al menos 3 letras.');
    expect(errores.valor?.message).toContain('Una tasa DIARIA de 3%');
  });
});

describe('PLANTILLAS', () => {
  it('la tasa diaria del 2 % mensual es 0,0667, a cuatro decimales', () => {
    expect(TASA_DIARIA_DEL_2_MENSUAL).toBe(0.0667);
  });

  it('las dos plantillas pasan el esquema y las validaciones del back', () => {
    for (const plantilla of PLANTILLAS) {
      const r = esquemaDeRegla.safeParse({
        ...plantilla.valores,
        topeCop: plantilla.valores.topeCop ?? null,
        activa: plantilla.valores.activa ?? true,
        orden: plantilla.valores.orden ?? 0,
      });
      expect(r.success, plantilla.id).toBe(true);
    }
  });

  it('interés diario: DIAS_DE_MORA día 1, INTERES_DIARIO 0,0667 sobre el canon', () => {
    const p = PLANTILLAS.find((x) => x.id === 'interes-diario')!;
    expect(p.valores).toMatchObject({
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 1,
      formula: 'INTERES_DIARIO',
      valor: 0.0667,
      base: 'CANON',
    });
  });

  it('gasto administrativo: DIA_DEL_MES 15, 10 % del canon', () => {
    const p = PLANTILLAS.find((x) => x.id === 'gasto-administrativo')!;
    expect(p.valores).toMatchObject({
      concepto: 'GASTO_ADMINISTRATIVO',
      disparador: 'DIA_DEL_MES',
      disparadorDia: 15,
      formula: 'PORCENTAJE_DE_LA_BASE',
      valor: 10,
      base: 'CANON',
    });
  });
});
