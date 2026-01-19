/**
 * Stub types for Prisma Client
 *
 * These stubs allow the codebase to compile without a generated Prisma client.
 * They will be replaced by actual @prisma/client exports when the backend
 * developer runs `npx prisma generate`.
 *
 * NOTE: This is a temporary solution for frontend-only development.
 * Remove this file once Prisma is properly set up.
 */

// Stub PrismaClient that does nothing
export class PrismaClient {
  constructor(_options?: unknown) {
    console.warn(
      'PrismaClient stub: Database operations are not available in frontend-only mode'
    );
  }
}

// Stub types for Prisma namespace
export namespace Prisma {
  export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
  export type JsonObject = { [Key in string]?: JsonValue };
  export type JsonArray = JsonValue[];
}

// Stub enums matching the Prisma schema (from prisma/schema.prisma)
export enum UserRole {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
  BOTH = 'BOTH',
}

export enum PropertyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  RENTED = 'RENTED',
  INACTIVE = 'INACTIVE',
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  NEEDS_INFO = 'NEEDS_INFO',
  PREAPPROVED = 'PREAPPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum RiskLevel {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}
