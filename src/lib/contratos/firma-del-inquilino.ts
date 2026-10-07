import type { ContractStatus } from '@/lib/types/contract';

/**
 * 🔴 QA-CONT-95 (04-10-2026): al firmar el inquilino, el portal decía
 * «¡Contrato firmado exitosamente! Ambas partes han firmado. Tu contrato está
 * activo» aunque el contrato quedaba esperando la firma del propietario
 * (`pending_landlord`). Lo que se dice sale del estado que devolvió la firma.
 */
export interface MensajeDeLaFirma {
  titulo: string;
  texto: string;
}

export function mensajeDeLaFirmaDelInquilino(
  estado: ContractStatus | null | undefined,
  locale: string,
): MensajeDeLaFirma {
  const es = locale !== 'en';
  if (estado === 'active') {
    return es
      ? {
          titulo: '¡Contrato firmado y activo!',
          texto: 'Las dos partes firmaron y el contrato ya está activo. Puedes descargarlo cuando quieras.',
        }
      : {
          titulo: 'Contract signed and active!',
          texto: 'Both parties signed and the contract is active. You can download it anytime.',
        };
  }
  if (estado === 'signed') {
    return es
      ? {
          titulo: '¡Contrato firmado por las dos partes!',
          texto: 'Las dos partes firmaron. El contrato se activa en su fecha de inicio y puedes descargarlo cuando quieras.',
        }
      : {
          titulo: 'Contract signed by both parties!',
          texto: 'Both parties signed. The contract starts on its start date and you can download it anytime.',
        };
  }
  return es
    ? {
        titulo: '¡Firmaste el contrato!',
        texto: 'Ahora firma el propietario para cerrarlo. Te avisamos por correo cuando quede firmado por las dos partes.',
      }
    : {
        titulo: 'You signed the contract!',
        texto: 'Now the owner signs to close it. We will email you when both parties have signed.',
      };
}
