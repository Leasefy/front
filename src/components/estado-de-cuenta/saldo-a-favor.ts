/**
 * 🔴 Ola E (03-10-2026, Juan Camilo): el saldo a favor del inquilino en el
 * estado de cuenta — en qué va su devolución al terminar el contrato (cuenta
 * por pagar + comprobante de egreso). Lo usan la pantalla y el PDF.
 */
/** 🔴 Ola E: en qué va la devolución del saldo a favor, en palabras. */
export function estadoDeLaDevolucion(
  devolucion: { estado: string; numero: number | null },
  t: (clave: string, valores?: Record<string, string | number>) => string,
): string {
  switch (devolucion.estado) {
    case 'PAGADO':
      return devolucion.numero !== null
        ? t('estadoDeCuenta.saldoAFavorPagado', { numero: devolucion.numero })
        : t('estadoDeCuenta.saldoAFavorPagadoSinNumero');
    case 'EN_LOTE':
      return t('estadoDeCuenta.saldoAFavorEnLote');
    case 'ANULADO':
      return t('estadoDeCuenta.saldoAFavorAnulado');
    default:
      return t('estadoDeCuenta.saldoAFavorPendiente');
  }
}
