/**
 * Prisma Client Singleton
 *
 * This pattern prevents creating multiple PrismaClient instances during
 * hot module replacement (HMR) in development. In production, each instance
 * of the serverless function will have its own client.
 *
 * Usage:
 * import { db } from '@/lib/db'
 *
 * // In Server Components or API Routes:
 * const users = await db.user.findMany()
 */

// Use stub for frontend-only development (replace with @prisma/client when backend is ready)
import { PrismaClient } from '@/lib/prisma-stub'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Type exports for convenience (using stub for frontend-only development)
export type { Prisma } from '@/lib/prisma-stub'
export {
  UserRole,
  PropertyStatus,
  ApplicationStatus,
  RiskLevel,
} from '@/lib/prisma-stub'
