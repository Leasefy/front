/**
 * Recordatorios — sin rótulo de «datos de ejemplo» (QA-IA-B, 04-10-2026).
 *
 * Acá vivía un `AvisoDatosDeEjemplo` que decía «la secuencia no se guarda en
 * ningún lado: el estado es local y no hay endpoint detrás». Era verdad
 * cuando la pantalla era una maqueta (con «María» y «$1.850.000» escritos a
 * mano). Dejó de serlo: las condiciones se guardan y la vista previa sale de
 * `/inmobiliaria/cobranza/secuencia`, con los nombres y los montos de las
 * cuotas de la inmobiliaria. Un rótulo de honestidad que ya no es cierto
 * miente al revés —hace desconfiar de lo que sí es real— y además hablaba en
 * jerga de programador.
 *
 * Se deja el layout (sin nada) para que la carpeta no cambie de forma.
 */
export default function PagosRecordatoriosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
