import fs from 'node:fs';
import path from 'node:path';

import { loadE2eEnv } from './env';

export type PersonaId = 'anonymous' | 'tenant' | 'landlord' | 'agencyAdmin' | 'agencyAgent';

export interface Persona {
  id: PersonaId;
  label: string;
  /** Prefix of the E2E_<PREFIX>_EMAIL / _PASSWORD variables. Absent for anonymous. */
  envPrefix?: string;
  /** First route of the persona: used for the mobile-navigation check. */
  home: string;
}

export const PERSONAS: Persona[] = [
  { id: 'anonymous', label: 'Anonymous (public pages)', home: '/' },
  { id: 'tenant', label: 'Tenant', envPrefix: 'E2E_TENANT', home: '/inquilino' },
  { id: 'landlord', label: 'Landlord', envPrefix: 'E2E_LANDLORD', home: '/panel' },
  {
    id: 'agencyAdmin',
    label: 'Agency admin (ADMIN, MFA)',
    envPrefix: 'E2E_AGENCY_ADMIN',
    home: '/panel/inmobiliaria',
  },
  {
    id: 'agencyAgent',
    label: 'Agency agent (AGENTE)',
    envPrefix: 'E2E_AGENCY_AGENT',
    home: '/panel/inmobiliaria',
  },
];

export const AUTH_DIR = path.resolve(__dirname, '..', '.auth');

export function authFile(id: PersonaId): string {
  return path.join(AUTH_DIR, `${id}.json`);
}

export function personaById(id: PersonaId): Persona {
  const p = PERSONAS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown persona ${id}`);
  return p;
}

export function credentialsFor(persona: Persona): { email: string; password: string } | null {
  loadE2eEnv();
  if (!persona.envPrefix) return null;
  const email = process.env[`${persona.envPrefix}_EMAIL`];
  const password = process.env[`${persona.envPrefix}_PASSWORD`];
  if (!email || !password) return null;
  return { email, password };
}

/** Why a persona cannot run, or null when it can. */
export function personaSkipReason(persona: Persona): string | null {
  if (!persona.envPrefix) return null;
  if (!credentialsFor(persona)) {
    return `${persona.envPrefix}_EMAIL / ${persona.envPrefix}_PASSWORD are empty (set them in the file pointed to by E2E_ENV_FILE)`;
  }
  return null;
}

export function resolvedPartFile(id: PersonaId, part: number): string {
  return path.join(AUTH_DIR, `resolved-${id}.part${part}.json`);
}

/** Merges every resolved-<persona>.part*.json written by the resolve shards. */
export function readResolved(id: PersonaId): Record<string, { path: string | null; reason?: string }> {
  const merged: Record<string, { path: string | null; reason?: string }> = {};
  if (!fs.existsSync(AUTH_DIR)) return merged;
  for (const name of fs.readdirSync(AUTH_DIR)) {
    if (!name.startsWith(`resolved-${id}.part`) || !name.endsWith('.json')) continue;
    try {
      Object.assign(merged, JSON.parse(fs.readFileSync(path.join(AUTH_DIR, name), 'utf8')));
    } catch {
      // A half-written part is treated as missing.
    }
  }
  return merged;
}

export function statusFile(id: PersonaId): string {
  return path.join(AUTH_DIR, `${id}.status.json`);
}
