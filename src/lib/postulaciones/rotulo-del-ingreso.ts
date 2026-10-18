/**
 * Cómo se llama lo que gana la persona según su situación laboral (QA-IA-A,
 * 04-10-2026): a un independiente o a un pensionado no se le pregunta «salario».
 * El paso 3 y la revisión usan este mismo rótulo (POST-5, QA 18-10-2026: la
 * revisión decía «Salario» a un independiente).
 */
export interface RotuloDelIngreso {
  label: string;
  hint: string;
  /** Para el resumen de la revisión. */
  corto: string;
}

export function rotuloDelIngreso(situacion: string | undefined): RotuloDelIngreso {
  if (situacion === 'self-employed') {
    return { label: 'Ingresos mensuales', hint: 'Lo que te entra en promedio cada mes por tu actividad', corto: 'Ingresos' };
  }
  if (situacion === 'retired') {
    return { label: 'Mesada pensional', hint: 'Lo que recibes cada mes de tu pensión', corto: 'Mesada' };
  }
  return { label: 'Salario mensual', hint: 'Tu salario base mensual antes de deducciones', corto: 'Salario' };
}
