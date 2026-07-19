import type { User } from '@/lib/auth';

/**
 * Editable profile fields. Every field here maps 1:1 to the backend
 * UpdateProfileDto (PATCH /users/me) — the DTO uses forbidNonWhitelisted,
 * so nothing outside this set may ever be sent.
 */
export interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
  rut: string;
  address: string;
  birthDate: string; // yyyy-MM-dd for <input type="date">
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export const PERSONAL_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'rut',
  'address',
  'birthDate',
] as const;

export const EMERGENCY_FIELDS = ['emergencyContactName', 'emergencyContactPhone'] as const;

/** The document number (rut/CC) is immutable once set — changes go through a
 *  Leasefy support request (the backend enforces this as well). First-time
 *  set (no rut yet) stays editable. */
export function isRutLocked(user: User | null): boolean {
  return !!user?.rut;
}

/** Personal fields the user may edit right now. Excludes `rut` when locked so
 *  it is never included in the PATCH payload — belt and suspenders on top of
 *  the disabled input and the backend rejection. */
export function editablePersonalFields(
  user: User | null,
): readonly (keyof ProfileFormData)[] {
  return isRutLocked(user) ? PERSONAL_FIELDS.filter((f) => f !== 'rut') : PERSONAL_FIELDS;
}

export type UpdateProfilePayload = Partial<Record<keyof ProfileFormData, string | null>>;

export function formDataFromUser(user: User | null): ProfileFormData {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    rut: user?.rut ?? '',
    address: user?.address ?? '',
    // Backend serializes birthDate as an ISO datetime — keep only the date part
    birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
    emergencyContactName: user?.emergencyContactName ?? '',
    emergencyContactPhone: user?.emergencyContactPhone ?? '',
  };
}

/** Build a PATCH payload with ONLY the fields that changed vs the current user.
 *  A field cleared to '' is sent as null: the backend's validators reject empty
 *  strings (@Matches/@IsDateString), while null passes @IsOptional and clears
 *  the column. */
export function buildChangedFields(
  fields: readonly (keyof ProfileFormData)[],
  formData: ProfileFormData,
  user: User | null,
): UpdateProfilePayload {
  const baseline = formDataFromUser(user);
  const payload: UpdateProfilePayload = {};
  for (const field of fields) {
    if (formData[field] !== baseline[field]) {
      payload[field] = formData[field] === '' ? null : formData[field];
    }
  }
  return payload;
}
