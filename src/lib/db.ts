/**
 * Prisma Client Singleton (Prisma 7 with adapter pattern)
 *
 * Usage:
 * import { db } from '@/lib/db'
 * const users = await db.user.findMany()
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.warn('[db] No DATABASE_URL — Prisma will fail on queries')
  }

  const adapter = new PrismaPg({ connectionString: connectionString ?? '' })

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export {
  UserRole,
  PropertyStatus,
  ApplicationStatus,
  RiskLevel,
} from '@prisma/client'

export type { Prisma } from '@prisma/client'
