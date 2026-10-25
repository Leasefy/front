import { redirect } from 'next/navigation'

/** Ver `../page.tsx`: las plantillas se retiraron; el editor vive en `EditorDeLaPlantilla.tsx`. */
export default function PlantillaDeCobranzaRetirada(): never {
  redirect('/panel/inmobiliaria/pagos/cobranza/configuracion')
}
