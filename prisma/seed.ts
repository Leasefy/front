/**
 * Prisma Seed Script
 *
 * Populates the database with realistic Colombian rental market data
 * for testing and demos.
 *
 * Usage:
 *   npm run db:seed      - Seed the database
 *   npm run db:reset     - Reset and reseed the database
 *
 * Requires:
 *   - DATABASE_URL environment variable configured
 *   - Prisma client generated (npx prisma generate)
 *   - Database schema pushed (npx prisma db push)
 */

import { db } from '../src/lib/db'
import {
  landlords,
  tenants,
  properties,
  applications,
  riskScores,
  seedStats,
} from '../src/lib/seed-data'

async function main() {
  console.log('🌱 Seeding database...')
  console.log('')

  // ---------------------------------------------------------------------------
  // Clear existing data (respecting FK constraints - delete in reverse order)
  // ---------------------------------------------------------------------------
  console.log('🗑️  Clearing existing data...')

  await db.candidateNote.deleteMany()
  await db.applicationEvent.deleteMany()
  await db.riskScoreResult.deleteMany()
  await db.application.deleteMany()
  await db.propertyImage.deleteMany()
  await db.property.deleteMany()
  await db.user.deleteMany()

  console.log('   ✓ Cleared existing data')
  console.log('')

  // ---------------------------------------------------------------------------
  // Create users (landlords and tenants)
  // ---------------------------------------------------------------------------
  console.log('👥 Creating users...')

  await db.user.createMany({
    data: [...landlords, ...tenants],
  })

  console.log(`   ✓ Created ${landlords.length} landlords`)
  console.log(`   ✓ Created ${tenants.length} tenants`)
  console.log('')

  // ---------------------------------------------------------------------------
  // Create properties with images
  // ---------------------------------------------------------------------------
  console.log('🏠 Creating properties...')

  for (const property of properties) {
    const { images, ...propertyData } = property

    await db.property.create({
      data: {
        ...propertyData,
        images: {
          create: images.map((img) => ({
            url: img.url,
            blurDataUrl: img.blurDataUrl,
            order: img.order,
          })),
        },
      },
    })
  }

  console.log(`   ✓ Created ${properties.length} properties across ${seedStats.cities.length} cities`)
  console.log(`   ✓ Cities: ${seedStats.cities.join(', ')}`)
  console.log('')

  // ---------------------------------------------------------------------------
  // Create applications
  // ---------------------------------------------------------------------------
  console.log('📋 Creating applications...')

  await db.application.createMany({
    data: applications,
  })

  console.log(`   ✓ Created ${applications.length} applications`)
  console.log(`   ✓ Status breakdown:`)
  for (const [status, count] of Object.entries(seedStats.applicationsByStatus)) {
    console.log(`     - ${status}: ${count}`)
  }
  console.log('')

  // ---------------------------------------------------------------------------
  // Create risk scores for completed applications
  // ---------------------------------------------------------------------------
  console.log('📊 Creating risk scores...')

  for (const score of riskScores) {
    await db.riskScoreResult.create({
      data: {
        id: score.id,
        applicationId: score.applicationId,
        totalScore: score.totalScore,
        level: score.level,
        recommendation: score.recommendation,
        subscoresJson: score.subscoresJson,
        driversJson: score.driversJson,
        flagsJson: score.flagsJson,
        conditionsJson: score.conditionsJson,
      },
    })
  }

  console.log(`   ✓ Created ${riskScores.length} risk score results`)
  console.log('')

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('='.repeat(50))
  console.log('🎉 Seeding complete!')
  console.log('='.repeat(50))
  console.log('')
  console.log('📊 Summary:')
  console.log(`   • Landlords: ${seedStats.landlords}`)
  console.log(`   • Tenants: ${seedStats.tenants} (A:${seedStats.tenantsByProfile.A}, B:${seedStats.tenantsByProfile.B}, C:${seedStats.tenantsByProfile.C}, D:${seedStats.tenantsByProfile.D})`)
  console.log(`   • Properties: ${seedStats.properties}`)
  console.log(`   • Applications: ${seedStats.applications}`)
  console.log(`   • Risk Scores: ${seedStats.riskScores}`)
  console.log('')
  console.log('🏙️  Properties by city:')
  for (const [city, count] of Object.entries(seedStats.propertiesByCity)) {
    console.log(`   • ${city}: ${count}`)
  }
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
